import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { useVoice } from '../context/VoiceContext';
import { getEnvVar } from '../services/supabase';

// --- Audio Helper Functions (Encoding/Decoding) ---

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Convert Float32 (-1.0 to 1.0) to Int16 (-32768 to 32767)
    int16[i] = Math.max(-1, Math.min(1, data[i])) * 0x7FFF;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// --- Tool Definition ---

const searchTermTool: FunctionDeclaration = {
  name: 'search_term',
  description: 'Navigate to the definition of a technical term.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      term: {
        type: Type.STRING,
        description: 'The technical term to search for (e.g., Kubernetes, API, React).',
      },
    },
    required: ['term'],
  },
};

export const VoiceAssistant = () => {
  const { isOpen, closeVoice, activeCharacter } = useVoice();
  const navigate = useNavigate();
  
  // State
  const [transcription, setTranscription] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [currentOutput, setCurrentOutput] = useState('');
  const [status, setStatus] = useState<'connecting' | 'listening' | 'speaking' | 'processing'>('connecting');

  // Refs for Audio & Session
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null); // To hold the active session
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Initialize Session
  useEffect(() => {
    if (!isOpen) {
      cleanup();
      return;
    }

    // Small delay to ensure clean state before starting
    const timer = setTimeout(() => {
      startSession();
    }, 100);

    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, [isOpen]);

  const cleanup = () => {
    // Stop Tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    // Disconnect Nodes
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    // Close Audio Contexts
    if (inputContextRef.current) {
      if (inputContextRef.current.state !== 'closed') inputContextRef.current.close();
      inputContextRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') audioContextRef.current.close();
      audioContextRef.current = null;
    }
    // Stop Audio Sources
    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
    
    // Close GenAI Session
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {
        console.log("Error closing session", e);
      }
      sessionRef.current = null;
    }
    
    setTranscription([]);
    setCurrentInput('');
    setCurrentOutput('');
    setStatus('connecting');
  };

  const startSession = async () => {
    try {
      setStatus('connecting');
      // Create new client for every session to avoid stale state
      const apiKey = getEnvVar('VITE_API_KEY') || getEnvVar('API_KEY');
      if (!apiKey) {
         setTranscription(prev => [...prev, "ERRO: API Key não encontrada."]);
         return;
      }

      const ai = new GoogleGenAI({ apiKey });
      
      // Initialize Audio Contexts
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      nextStartTimeRef.current = 0;

      // Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // STRICT CONVERSATIONAL FLOW PROTOCOL
      const baseInstruction = `
      VOCÊ É O ASSISTENTE DE NAVEGAÇÃO DO APP 'DESBUGUEI'.
      SEU NOME É: ${activeCharacter.name}.
      SUA PERSONALIDADE BASE: ${activeCharacter.systemInstruction}

      ATENÇÃO: VOCÊ DEVE SEGUIR RIGOROSAMENTE O FLUXO DE ESTADOS ABAIXO. NÃO SAIA DO ROTEIRO.

      --- FLUXO DE ESTADOS ---

      ESTADO 1: INÍCIO (Ao conectar)
      - Ação: Assim que conectar, diga IMEDIATAMENTE e EXATAMENTE: "Oi, o que quer saber?"
      - Aguarde a fala do usuário.

      ESTADO 2: ANÁLISE DA PERGUNTA DO USUÁRIO
      - O usuário vai falar algo. Analise o conteúdo:

      CASO A (Geração de Código/Prompts): O usuário pede para criar códigos, scripts, prompts ou comandos.
         -> Resposta OBRIGATÓRIA: "Me desculpe, mas sou especialista em programação e algumas coisa de tecnologia. Essa duvida pode perguntar ao ChatGPT."
         -> Fim da interação (aguarde nova pergunta).

      CASO B (Assunto Aleatório): O usuário fala sobre esportes, receitas, política, ou qualquer coisa que NÃO seja tecnologia/programação.
         -> Resposta OBRIGATÓRIA: "Me desculpe, mas sou especialista em programação e algumas coisa de tecnologia. Essa duvida pode perguntar ao Google."
         -> Fim da interação (aguarde nova pergunta).

      CASO C (Dúvida Técnica Válida): O usuário pergunta "O que é React?", "Defina API", ou apenas diz um termo técnico.
         -> Ação: Identifique o termo.
         -> Resposta OBRIGATÓRIA: "É isso que quer saber? Posso responder?"
         -> Vá para o ESTADO 3.

      ESTADO 3: CONFIRMAÇÃO
      - Aguarde a resposta do usuário sobre a pergunta "Posso responder?".

      CASO CONFIRMAÇÃO (Sim, claro, pode, isso mesmo, aham, vai):
         -> Ação: CHAME A TOOL/FUNÇÃO 'search_term' com o termo identificado no ESTADO 2.
         -> Não fale mais nada após chamar a função.

      CASO NEGAÇÃO OU DÚVIDA (Não, espera, não é isso, errou):
         -> Resposta OBRIGATÓRIA: "Ok, refaça a pergunta ou explique melhor?"
         -> Volte para o ESTADO 2 (Análise).

      --- REGRAS GERAIS ---
      1. NÃO explique o termo antes da confirmação.
      2. Mantenha as frases de controle ("Oi, o que quer saber?", "É isso que quer saber? Posso responder?") EXATAS, independente da sua personalidade, mas use o tom de voz do personagem.
      `;

      // Connect to Gemini Live
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
             voiceConfig: { prebuiltVoiceConfig: { voiceName: activeCharacter.voiceName } }
          },
          inputAudioTranscription: {}, 
          outputAudioTranscription: {},
          tools: [{ functionDeclarations: [searchTermTool] }],
          systemInstruction: baseInstruction,
        },
        callbacks: {
          onopen: () => {
            setStatus('listening');
            
            // Store session ref immediately
            sessionPromise.then(session => {
                sessionRef.current = session;
                // O modelo vai iniciar a fala conforme instrução do ESTADO 1
            });

            // Setup Input Processing
            if (!inputContextRef.current) return;
            const source = inputContextRef.current.createMediaStreamSource(stream);
            const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              
              // Only send if session is established
              sessionPromise.then(session => {
                 try {
                    session.sendRealtimeInput({ media: pcmBlob });
                 } catch (err) {
                    // Ignore send errors if session is closed/closing
                 }
              });
            };

            source.connect(processor);
            processor.connect(inputContextRef.current.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            // 1. Handle Tool Calls (Navigation)
            if (msg.toolCall) {
              for (const fc of msg.toolCall.functionCalls) {
                if (fc.name === 'search_term') {
                   const term = (fc.args as any).term;
                   setStatus('processing');
                   
                   // Execute Navigation
                   // Close voice first to prevent leaks
                   closeVoice(); // This triggers cleanup() via useEffect
                   navigate(`/term/${encodeURIComponent(term)}`);
                   return;
                }
              }
            }

            // 2. Handle Input Transcription (User)
            if (msg.serverContent?.inputTranscription) {
               const text = msg.serverContent.inputTranscription.text;
               setCurrentInput(prev => prev + text);
            }

            // 3. Handle Output Transcription (AI)
            if (msg.serverContent?.outputTranscription) {
               const text = msg.serverContent.outputTranscription.text;
               setCurrentOutput(prev => prev + text);
            }
            
            // 4. Handle Turn Complete
            if (msg.serverContent?.turnComplete) {
                // If we have accumulated text, flush it to history
                if (currentInput) {
                    setTranscription(prev => [...prev, `Você: ${currentInput}`]); 
                    setCurrentInput('');
                }
                if (currentOutput) {
                    setTranscription(prev => [...prev, `${activeCharacter.name}: ${currentOutput}`]);
                    setCurrentOutput('');
                }
            }

            // 5. Handle Audio Output
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && audioContextRef.current) {
                setStatus('speaking');
                const ctx = audioContextRef.current;
                
                // Ensure context is running (browser auto-play policy)
                if (ctx.state === 'suspended') {
                    await ctx.resume();
                }

                const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
                
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(ctx.destination);
                
                // Scheduling
                const now = ctx.currentTime;
                // If nextStartTime is in the past, reset it to now
                const startTime = Math.max(nextStartTimeRef.current, now);
                source.start(startTime);
                nextStartTimeRef.current = startTime + buffer.duration;
                
                sourcesRef.current.add(source);
                source.onended = () => {
                    sourcesRef.current.delete(source);
                    if (sourcesRef.current.size === 0) {
                        setStatus('listening');
                    }
                };
            }
          },
          onclose: () => {
            console.log('Session closed');
          },
          onerror: (err) => {
            console.error('Session error:', err);
            setTranscription(prev => [...prev, "Serviço indisponível no momento."]);
            setStatus('connecting'); 
          }
        }
      });

    } catch (e) {
      console.error(e);
      setTranscription(prev => [...prev, "Erro ao iniciar microfone ou IA."]);
    }
  };

  const handleManualStop = () => {
    closeVoice(); // This triggers cleanup
    // If we have input, try to search
    const textToSearch = currentInput || (transcription.find(t => t.startsWith('Você:'))?.replace('Você:', '').trim());
    if (textToSearch) {
       navigate(`/term/${encodeURIComponent(textToSearch)}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Blurred Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
        onClick={closeVoice}
      ></div>

      {/* Main Panel */}
      <aside className={`w-full max-w-[480px] bg-night-panel/95 backdrop-blur-xl border-2 rounded-[2.5rem] ai-panel-float relative z-30 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300 shadow-2xl ${activeCharacter.color.replace('text-', 'border-').split(' ')[0]}`}>
        
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_top_right,rgba(var(--color-primary),1)_0%,transparent_50%),radial-gradient(circle_at_bottom_left,#020617_0%,transparent_50%)]"></div>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 md:p-8 relative z-10">
          <div className="flex items-center gap-3">
            <div className={`bg-night-panel/50 p-1 rounded-full border w-12 h-12 overflow-hidden ${activeCharacter.color.replace('text-', 'border-').split(' ')[0]} ${activeCharacter.color.split(' ').find(c => c.startsWith('text-'))}`}>
              <img src={activeCharacter.avatarUrl} alt={activeCharacter.name} className="w-full h-full object-cover rounded-full bg-slate-200" />
            </div>
            <div>
                 <h2 className="text-slate-100 font-bold text-xl font-display">{activeCharacter.name}</h2>
                 <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">{activeCharacter.archetype}</span>
            </div>
          </div>
          <button 
            onClick={closeVoice}
            className="text-slate-500 hover:text-slate-200 hover:bg-white/10 rounded-full p-2 transition-all"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content - Animation & Status */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 pb-4 relative z-10">
          <div className="relative w-56 h-56 flex items-center justify-center mb-6">
            {/* Status Visuals */}
            {status === 'listening' && (
                <div className={`absolute inset-0 rounded-full border border-current scale-125 opacity-30 animate-ping-slow ${activeCharacter.color.split(' ').find(c => c.startsWith('text-'))}`}></div>
            )}
            <div className={`absolute inset-4 rounded-full border-2 transition-all duration-500 ${status === 'speaking' ? `border-current shadow-[0_0_30px_currentColor] opacity-100` : 'border-slate-700 opacity-60'} ${activeCharacter.color.split(' ').find(c => c.startsWith('text-'))}`}></div>
            
            {/* Center Orb with Avatar */}
            <div className={`relative w-32 h-32 rounded-full border-4 border-night-panel shadow-2xl flex items-center justify-center overflow-hidden transition-transform duration-300 ${status === 'speaking' ? 'scale-110' : 'scale-100'} ${activeCharacter.color}`}>
              {/* Always show Avatar image */}
              <img src={activeCharacter.avatarUrl} alt="Avatar" className="w-full h-full object-cover bg-slate-200" />
              
              {/* Overlay for audio visualizer when active */}
              {(status === 'speaking' || status === 'listening') && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center gap-1.5">
                    <div className="w-1.5 bg-white rounded-full animate-[bounce_1.2s_infinite] h-4"></div>
                    <div className="w-1.5 bg-white rounded-full animate-[bounce_0.8s_infinite] h-8"></div>
                    <div className="w-1.5 bg-white rounded-full animate-[bounce_1.1s_infinite] h-10"></div>
                    <div className="w-1.5 bg-white rounded-full animate-[bounce_0.9s_infinite] h-6"></div>
                    <div className="w-1.5 bg-white rounded-full animate-[bounce_1s_infinite] h-4"></div>
                  </div>
              )}
            </div>
          </div>

          <div className="text-center space-y-3 w-full">
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-night-bg/50 border mb-2 transition-colors ${status === 'listening' ? `${activeCharacter.color.replace('bg-', 'border-').split(' ')[0]} ${activeCharacter.color.split(' ').find(c => c.startsWith('text-'))}` : 'border-slate-700 text-slate-500'}`}>
              <span className={`w-2 h-2 rounded-full ${status === 'listening' ? 'bg-current animate-pulse' : 'bg-slate-500'}`}></span>
              <span className="text-xs font-bold tracking-widest uppercase">
                {status === 'connecting' ? 'Conectando...' : 
                 status === 'listening' ? `Ouvindo` : 
                 status === 'speaking' ? `${activeCharacter.name} falando` : 'Processando'}
              </span>
            </div>
            
            {/* Transcription Box */}
            <div className="w-full h-32 rounded-2xl bg-night-bg/50 border border-night-border shadow-inner p-4 text-left overflow-y-auto transition-colors flex flex-col-reverse gap-2">
               {/* Visual fallback when transcription is empty */}
               {transcription.length === 0 && !currentInput && !currentOutput && status !== 'connecting' && (
                   <div className="flex flex-col items-center justify-center h-full text-slate-600 italic text-sm">
                      <p>Diga "Olá" para começar...</p>
                   </div>
               )}
               
               {/* Current Input (User) */}
               {currentInput && <p className="text-slate-200 font-medium animate-pulse">Você: {currentInput}...</p>}
               
               {/* Current Output (AI) */}
               {currentOutput && <p className={`${activeCharacter.color.split(' ').find(c => c.startsWith('text-'))} font-medium animate-pulse`}>{activeCharacter.name}: {currentOutput}</p>}
               
               {/* History */}
               {transcription.slice().reverse().map((line, i) => (
                   <p key={i} className={`text-sm ${line.startsWith(activeCharacter.name) ? 'text-slate-300' : 'text-slate-400'}`}>
                      {line}
                   </p>
               ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 pt-4 bg-transparent flex flex-col gap-4 relative z-10">
          <button 
             onClick={handleManualStop}
             className={`w-full h-14 text-night-bg rounded-2xl flex items-center justify-center gap-3 font-bold text-lg shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0 ${activeCharacter.color.replace('text-', 'bg-').replace('/10', '')}`}
          >
            <div className="p-1.5 bg-white/20 rounded-full">
              <span className="material-symbols-outlined icon-filled text-sm">stop_circle</span>
            </div>
            <span>{currentInput || transcription.length > 0 ? 'Pesquisar Agora' : 'Parar de ouvir'}</span>
          </button>
        </div>
      </aside>
    </div>
  );
};