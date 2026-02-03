
import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useFavorites } from '../context/FavoritesContext';
import { useHistory } from '../context/HistoryContext';
import { useVoice } from '../context/VoiceContext';
import { getTermData } from '../services/termService';
import { TermData } from '../types';

export const TermDetail = () => {
  const navigate = useNavigate();
  const { termId } = useParams<{ termId: string }>();
  const { themeMode } = useTheme();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addToHistory } = useHistory();
  const { activeCharacter } = useVoice();
  const isLight = themeMode === 'light';

  const [data, setData] = useState<TermData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showRetry, setShowRetry] = useState(false);

  // Fetch Data
  useEffect(() => {
    // Reiniciar estados ao mudar o termo
    setLoading(true);
    setError(false);
    setShowRetry(false);

    // Timer de segurança: Se demorar mais de 20s, mostra o botão de emergência
    const timeoutId = setTimeout(() => {
        setShowRetry(true);
    }, 20000);

    const fetchData = async () => {
      if (!termId) return;
      
      try {
        const result = await getTermData(termId);
        setData(result);
        addToHistory(result); 
        setError(false);
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        // Se finalizou (sucesso ou erro), limpa o loading e o timer
        setLoading(false);
        clearTimeout(timeoutId);
      }
    };
    fetchData();

    return () => clearTimeout(timeoutId);
  }, [termId]);

  // Text to Speech
  const handleSpeak = () => {
    if (!data) return;
    const utterance = new SpeechSynthesisUtterance(data.term);
    utterance.lang = 'en-US'; 
    utterance.rate = activeCharacter.speed;
    window.speechSynthesis.speak(utterance);
  };

  // Dynamic Styles
  const mainCardClass = isLight 
    ? "bg-white border border-slate-200 shadow-xl shadow-slate-200/50" 
    : "glass-card border-primary/20 shadow-2xl shadow-primary/5";

  const listItemClass = isLight
    ? "bg-white border border-slate-200 shadow-sm hover:border-primary hover:shadow-md"
    : "bg-night-panel/30 border border-transparent hover:border-night-border";

  const footerClass = isLight
    ? "bg-white border border-slate-200 shadow-lg"
    : "glass-card";

  // Loading State with Retry Button
  if (loading) {
    return (
        <div className="flex items-center justify-center h-full min-h-[60vh]">
            <div className="flex flex-col items-center gap-4 animate-pulse">
                <div className="size-16 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                <p className="text-slate-400 font-display">Desbugando o termo...</p>
                
                {/* Botão de Emergência - Aparece após 20s */}
                {showRetry && (
                     <button 
                        onClick={() => navigate('/')}
                        className="mt-6 px-6 py-2 rounded-full bg-rose-500/10 border border-rose-500/50 text-rose-400 hover:bg-rose-500/20 transition-all font-bold text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2 cursor-pointer pointer-events-auto"
                     >
                        <span className="material-symbols-outlined text-lg">home</span>
                        Voltar e tentar novamente
                     </button>
                )}
            </div>
        </div>
    );
  }

  // Error State
  if (error || !data) {
    return (
        <div className="max-w-5xl mx-auto p-12 text-center">
            <h2 className="text-2xl text-slate-100 font-bold mb-4">Termo não encontrado</h2>
            <Link to="/glossary" className="text-primary hover:underline">Voltar para o Glossário</Link>
        </div>
    );
  }

  const favorited = isFavorite(data.id);

  return (
    <div className="max-w-[1400px] mx-auto p-6 lg:p-12 pb-24">
      {/* Header Navigation */}
      <header className="flex flex-col gap-6 mb-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-primary hover:underline text-sm font-medium">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Voltar para o Painel
          </Link>
          
          {/* Favorite Toggle */}
          <button 
            onClick={() => toggleFavorite(data)}
            className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-colors group cursor-pointer ${
                favorited 
                ? 'bg-primary/20 border-primary text-primary' 
                : 'bg-transparent border-slate-600 text-slate-500 hover:border-primary/50 hover:text-primary'
            }`}
          >
            <span className="text-xs font-mono font-bold tracking-wide uppercase">FAVORITO</span>
            <span className={`material-symbols-outlined text-base transition-transform group-active:scale-90 ${favorited ? 'icon-filled' : ''}`}>
              favorite
            </span>
          </button>
        </div>
        
        <div className="flex flex-col">
          <h2 className="text-primary text-4xl md:text-5xl font-bold font-mono tracking-tight leading-tight uppercase break-words">
            {data.term}: {data.category}
          </h2>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between mt-4 gap-4">
            {/* Pronunciation */}
            <div className="flex items-center gap-3">
              <span className="text-slate-400 font-mono text-sm tracking-wide">Pronúncia: <span className="text-slate-200">{data.phonetic}</span></span>
              <button 
                onClick={handleSpeak}
                // CHANGED: Fixed size w-10 h-10 with flex center to force circle
                className="w-10 h-10 rounded-full bg-night-panel border border-night-border hover:text-primary hover:border-primary/50 transition-colors flex items-center justify-center active:scale-95 flex-shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]">volume_up</span>
              </button>
            </div>

            {/* Slang / Expressions */}
            <div className="font-mono text-sm tracking-wide">
               <span className="text-slate-400">Gírias / Expressões: </span>
               <span className="text-slate-200">
                 {data.slang ? data.slang : "Nenhum termo encontrado."}
               </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Essence Card */}
      <section className="flex flex-col gap-6 mb-10">
        <div className={`${mainCardClass} rounded-3xl p-5 md:p-10 relative overflow-hidden transition-all duration-300 min-h-[200px] md:min-h-[280px]`}>
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <span className="material-symbols-outlined text-[150px]">lightbulb</span>
          </div>
          <div className="relative z-10 flex flex-col max-w-4xl h-full justify-center">
            {/* Full English Term (Cyan) */}
            <span className="text-primary font-mono font-bold text-sm tracking-widest uppercase mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">translate</span>
              {data.fullTerm || data.term}
            </span>
            {/* Translation (Gray) */}
            <h3 className="text-slate-400 font-bold text-sm md:text-lg mb-4 md:mb-6 uppercase tracking-wide opacity-80">
                {data.translation}
            </h3>
            {/* Definition (White) */}
            <p className="text-slate-100 text-lg md:text-3xl font-display font-semibold leading-snug md:leading-tight">
              {data.definition}
            </p>
          </div>
        </div>
      </section>

      {/* 3-Column Grid: Context, Practical Usage (Dialogue), Analogies */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
        
        {/* Col 1: Contexts */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center gap-2 text-slate-100 font-mono font-bold text-sm uppercase tracking-wider border-b border-night-border pb-4">
            <span className="material-symbols-outlined text-primary">settings_applications</span>
            Contextos de Uso
          </div>
          <ul className="flex flex-col gap-4">
            {(data.examples || []).map((item, idx) => (
                <li key={idx} className={`flex items-start gap-4 p-4 rounded-xl transition-all duration-300 ${listItemClass}`}>
                  <span className="material-symbols-outlined text-primary text-xl mt-0.5">check_circle</span>
                  <div>
                    <span className="block text-slate-100 font-bold text-sm uppercase mb-1">{item.title}</span>
                    <p className="text-sm text-slate-400">{item.description}</p>
                  </div>
                </li>
            ))}
            {(!data.examples || data.examples.length === 0) && (
               <li className="text-slate-500 italic text-sm">Nenhum exemplo disponível.</li>
            )}
          </ul>
        </section>

        {/* Col 2: Practical Real Usage (Conversational/Dialogue) */}
        <section className="flex flex-col gap-6 order-last lg:order-none">
          <div className="flex items-center gap-2 text-slate-100 font-mono font-bold text-sm uppercase tracking-wider border-b border-night-border pb-4">
            <span className="material-symbols-outlined text-emerald-400">record_voice_over</span>
            Exemplo Real de Uso
          </div>
          
          <div className={`rounded-2xl h-full flex flex-col relative overflow-hidden transition-all duration-300 ${isLight ? 'bg-slate-50 border border-slate-200' : 'bg-gradient-to-b from-night-panel/80 to-night-panel/30 border border-night-border'}`}>
             {/* Decorative Background Element */}
             <div className={`absolute top-0 right-0 p-4 opacity-10 pointer-events-none`}>
                 <span className="material-symbols-outlined text-8xl">format_quote</span>
             </div>

             {data.practicalUsage ? (
                <div className="p-5 md:p-8 flex flex-col h-full justify-center relative z-10">
                    {/* Header Context Tag */}
                    <div className="mb-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                            {data.practicalUsage.title || 'Contexto da Conversa'}
                        </span>
                    </div>
                    
                    {/* The Quote */}
                    <div className="flex gap-3 md:gap-4">
                         <div className={`w-1 rounded-full flex-shrink-0 ${isLight ? 'bg-emerald-300' : 'bg-emerald-500/50'}`}></div>
                         <p className={`font-display text-base md:text-xl italic leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>
                            "{data.practicalUsage.content}"
                         </p>
                    </div>

                    {/* Footer / Caption */}
                    <div className="mt-6 flex items-center gap-2 opacity-60">
                         <div className="size-6 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-xs">person</span>
                         </div>
                         <span className="text-xs text-slate-500 font-mono">Dev / Tech Lead</span>
                    </div>
                </div>
             ) : (
                <div className="p-8 flex items-center justify-center h-full">
                    <span className="text-slate-500 italic">Sem exemplo prático disponível.</span>
                </div>
             )}
          </div>
        </section>

        {/* Col 3: Analogies */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center gap-2 text-slate-100 font-mono font-bold text-sm uppercase tracking-wider border-b border-night-border pb-4">
            <span className="material-symbols-outlined text-primary">psychology</span>
            Analogias
          </div>
          <ul className="flex flex-col gap-4">
             {(data.analogies || []).map((item, idx) => (
                <li key={idx} className={`flex items-start gap-4 p-4 rounded-xl transition-all duration-300 ${listItemClass}`}>
                  <span className="material-symbols-outlined text-primary text-xl mt-0.5">compare_arrows</span>
                  <div>
                    <span className="block text-slate-100 font-bold text-sm uppercase mb-1">{item.title}</span>
                    <p className="text-sm text-slate-400">{item.description}</p>
                  </div>
                </li>
             ))}
             {(!data.analogies || data.analogies.length === 0) && (
               <li className="text-slate-500 italic text-sm">Nenhuma analogia disponível.</li>
            )}
          </ul>
        </section>

      </div>

      {/* Footer Actions */}
      <div className={`${footerClass} rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 transition-all duration-300`}>
         <div className="flex flex-col gap-3 w-full md:w-auto">
             <div className="flex items-center gap-2 text-slate-100 font-mono font-bold text-xs uppercase tracking-wider">
                <span className="material-symbols-outlined text-primary text-sm">hub</span>
                Termos Relacionados
             </div>
             <div className="flex gap-2 flex-wrap">
                {(data.relatedTerms || []).map(term => (
                    <Link 
                        key={term} 
                        to={`/term/${term}`}
                        className="px-3 py-1.5 rounded-lg bg-night-panel border border-night-border text-slate-300 text-xs hover:border-primary/50 hover:text-primary cursor-pointer transition-colors"
                    >
                        {term}
                    </Link>
                ))}
                {(!data.relatedTerms || data.relatedTerms.length === 0) && (
                    <span className="text-slate-500 text-xs italic">Nenhum termo relacionado.</span>
                )}
             </div>
         </div>
         
         <div className="flex items-center gap-4">
             <button className="flex items-center gap-2 px-6 py-3 rounded-full border border-night-border hover:bg-primary/10 hover:border-primary transition-all text-slate-400 hover:text-primary group">
                <span className="material-symbols-outlined group-hover:icon-filled">share</span>
                <span className="text-sm font-semibold">Compartilhar</span>
             </button>
         </div>
      </div>
    </div>
  );
};
