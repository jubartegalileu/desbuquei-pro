
import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useVoice } from '../context/VoiceContext';
import { characters, Character } from '../data/characters';
import { GoogleGenAI, Modality } from "@google/genai";
import { seedDatabase } from '../services/termService';
import { isSupabaseConfigured } from '../services/supabase';

// --- Helpers for Audio Decoding (Duplicated from VoiceAssistant to keep files self-contained) ---
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
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

export const Settings = () => {
  const { themeMode, setThemeMode } = useTheme();
  const { activeCharacter, setActiveCharacter } = useVoice();
  
  // Audio Preview State
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  // Database Seeding State
  const [seeding, setSeeding] = useState(false);
  const [seedLogs, setSeedLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
        logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [seedLogs]);

  const stopAudio = () => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch (e) {}
      sourceRef.current = null;
    }
    setPlayingId(null);
    setLoadingId(null);
  };

  const handlePreview = async (e: React.MouseEvent, char: Character) => {
    e.stopPropagation(); 
    if (playingId === char.id) {
        stopAudio();
        return;
    }
    stopAudio();
    setLoadingId(char.id);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: char.previewText }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: char.voiceName } }
                }
            }
        });
        const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!audioData) throw new Error("No audio returned");

        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') await ctx.resume();

        const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        sourceRef.current = source;
        source.onended = () => { setPlayingId(null); };
        source.start();
        setPlayingId(char.id);
    } catch (err) {
        console.error("Preview failed", err);
    } finally {
        setLoadingId(null);
    }
  };

  const handleSeedDatabase = async () => {
    if (seeding) return;
    setSeeding(true);
    setSeedLogs(["Iniciando processo..."]);
    
    await seedDatabase((log) => {
        setSeedLogs(prev => [...prev, log]);
    });
    
    setSeeding(false);
  };

  const hasSupabase = isSupabaseConfigured();

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-12 pb-32">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
            <h2 className="text-3xl md:text-4xl font-bold font-display text-slate-100">Configurações</h2>
            <p className="text-slate-400 mt-2">Personalize sua experiência e gerencie o sistema.</p>
        </div>

        {/* Theme Toggle Buttons */}
        <div className="flex gap-3">
            <button 
                onClick={() => setThemeMode('light')}
                className={`size-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                    themeMode === 'light'
                    ? 'border-primary bg-primary/20 text-primary shadow-[0_0_15px_-5px_rgba(var(--color-primary),0.3)] scale-105'
                    : 'border-night-border bg-night-panel/50 text-slate-500 hover:border-slate-500 hover:text-slate-300'
                }`}
                title="Modo Claro"
            >
                <span className={`material-symbols-outlined text-xl ${themeMode === 'light' ? 'icon-filled' : ''}`}>light_mode</span>
            </button>
            
            <button 
                onClick={() => setThemeMode('dark')}
                className={`size-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                    themeMode === 'dark'
                    ? 'border-primary bg-primary/20 text-primary shadow-[0_0_15px_-5px_rgba(var(--color-primary),0.3)] scale-105'
                    : 'border-night-border bg-night-panel/50 text-slate-500 hover:border-slate-500 hover:text-slate-300'
                }`}
                title="Modo Escuro"
            >
                <span className={`material-symbols-outlined text-xl ${themeMode === 'dark' ? 'icon-filled' : ''}`}>dark_mode</span>
            </button>
        </div>
      </header>

      <div className="flex flex-col gap-12">
        {/* Character Selection Section */}
        <section className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 pb-4 border-b border-night-border/50">
            <span className="material-symbols-outlined text-primary text-2xl">group</span>
            <h3 className="text-2xl font-bold font-display text-slate-100">Escolha seu Mentor</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {characters.map((char) => {
                 const isActive = activeCharacter.id === char.id;
                 const isPlaying = playingId === char.id;
                 const isLoading = loadingId === char.id;

                 return (
                     <div 
                        key={char.id}
                        onClick={() => setActiveCharacter(char.id)}
                        className={`relative cursor-pointer rounded-3xl border-2 p-6 flex flex-col gap-4 transition-all duration-300 group ${
                            isActive 
                            ? `${char.color} shadow-xl scale-[1.02]` 
                            : 'border-night-border bg-night-panel/50 hover:bg-night-panel hover:border-slate-600'
                        }`}
                     >
                        <div className="flex items-center justify-between">
                            <div className={`size-16 rounded-full overflow-hidden flex items-center justify-center p-0.5 ${isActive ? 'bg-night-bg/30 ring-2 ring-offset-2 ring-offset-night-panel ring-current' : 'bg-night-bg border border-night-border'}`}>
                                <img src={char.avatarUrl} alt={char.name} className="w-full h-full object-cover rounded-full bg-slate-200" />
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => handlePreview(e, char)}
                                    className={`size-8 rounded-full flex items-center justify-center border transition-all ${isPlaying ? 'bg-primary text-night-bg border-primary animate-pulse' : isLoading ? 'border-slate-500 text-slate-500 cursor-wait' : 'border-slate-600 text-slate-500 hover:text-primary hover:border-primary bg-night-bg'}`}
                                >
                                    {isLoading ? <div className="size-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : <span className="material-symbols-outlined text-lg icon-filled">{isPlaying ? 'stop' : 'play_arrow'}</span>}
                                </button>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${isActive ? 'border-current opacity-80' : 'border-night-border bg-night-bg text-slate-500'}`}>{char.archetype}</span>
                            </div>
                        </div>
                        <div>
                            <h4 className={`text-xl font-bold font-display mb-1 ${isActive ? 'text-current' : 'text-slate-200'}`}>{char.name}</h4>
                            <p className={`text-sm leading-relaxed ${isActive ? 'opacity-90' : 'text-slate-500'}`}>{char.description}</p>
                        </div>
                     </div>
                 );
             })}
          </div>
        </section>

        {/* Admin / Database Hydration Section */}
        <section className="hidden md:flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            <div className="flex items-center gap-3 pb-4 border-b border-night-border/50">
                <span className="material-symbols-outlined text-emerald-400 text-2xl">database</span>
                <h3 className="text-2xl font-bold font-display text-slate-100">Banco de Conhecimento</h3>
            </div>
            
            <div className="glass-card rounded-2xl p-8 border-night-border bg-night-panel/30">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="flex-1">
                        <h4 className="text-lg font-bold text-slate-200 mb-2">Hidratação Automática (Seed)</h4>
                        <p className="text-slate-400 text-sm leading-relaxed mb-4">
                            Esta ferramenta usa a IA para gerar definições de 20 termos essenciais (Kubernetes, Docker, CI/CD...) 
                            e salvá-los no seu banco Supabase. Isso evita que a IA seja consultada repetidamente para termos comuns.
                        </p>
                        
                        {!hasSupabase && (
                            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs font-mono mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-base">warning</span>
                                Supabase não configurado. Verifique SUPABASE_URL e KEY.
                            </div>
                        )}

                        <button 
                            onClick={handleSeedDatabase}
                            disabled={seeding || !hasSupabase}
                            className={`px-6 py-3 rounded-xl font-bold flex items-center gap-3 transition-all ${
                                seeding 
                                ? 'bg-night-border text-slate-500 cursor-not-allowed' 
                                : hasSupabase
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50'
                                    : 'bg-night-border text-slate-600 cursor-not-allowed'
                            }`}
                        >
                            {seeding ? (
                                <>
                                    <div className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                    <span>Processando Carga...</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">cloud_download</span>
                                    <span>Popular Banco de Dados</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Terminal Logs */}
                    <div className="w-full md:w-1/2 h-48 bg-black/40 rounded-lg border border-night-border p-4 font-mono text-xs overflow-y-auto">
                        <div className="flex flex-col gap-1">
                            {seedLogs.length === 0 && <span className="text-slate-600 italic">// Logs de processamento aparecerão aqui...</span>}
                            {seedLogs.map((log, i) => (
                                <span key={i} className={`${log.includes('✅') ? 'text-emerald-400' : log.includes('❌') || log.includes('ERRO') ? 'text-rose-400' : 'text-slate-400'}`}>
                                    {log}
                                </span>
                            ))}
                            <div ref={logsEndRef}></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
      </div>
    </div>
  );
};
