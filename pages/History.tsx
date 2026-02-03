import React, { useState } from 'react';
import { TermCard } from '../components/Card';
import { useHistory } from '../context/HistoryContext';

// Helper to map API categories to Card colors
const getCategoryColor = (category: string) => {
  const normalized = category.toLowerCase();
  if (normalized.includes('desenvolvimento') || normalized.includes('api')) return 'primary';
  if (normalized.includes('dados') || normalized.includes('data')) return 'emerald';
  if (normalized.includes('infra') || normalized.includes('cloud')) return 'blue';
  if (normalized.includes('agile') || normalized.includes('produto')) return 'orange';
  if (normalized.includes('segurança') || normalized.includes('security')) return 'rose';
  if (normalized.includes('backend') || normalized.includes('web3')) return 'purple';
  return 'primary';
};

const formatHistoryDate = (isoString: string) => {
  const date = new Date(isoString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const timeString = `${hours}:${minutes}`;

  // Check if it's today
  if (date.toDateString() === now.toDateString()) {
    return `Hoje às ${timeString}`;
  }

  // Check if it's yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Ontem às ${timeString}`;
  }

  // Older
  const day = date.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const month = months[date.getMonth()];
  return `${day} ${month}, ${timeString}`;
};

export const History = () => {
  const { history } = useHistory();
  const [searchTerm, setSearchTerm] = useState('');

  // Filter Logic
  const filteredHistory = history.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      item.data.term.toLowerCase().includes(term) ||
      item.data.definition.toLowerCase().includes(term) ||
      item.data.category.toLowerCase().includes(term)
    );
  });

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-12 z-0 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mt-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary">history_edu</span>
            <span className="text-primary font-bold text-xs uppercase tracking-widest">Sua Jornada de Aprendizado</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold font-display text-slate-100 tracking-tight">Histórico de Consultas</h2>
          <p className="text-slate-400 mt-2 max-w-lg">Revisite as explicações que você já "desbugou".</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative group flex-1 md:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg group-focus-within:text-primary transition-colors">search</span>
            <input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-night-panel/50 border border-night-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-300 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 w-full placeholder:text-slate-600 transition-all shadow-sm" 
              placeholder="Buscar no histórico..." 
              type="text" 
            />
          </div>
        </div>
      </div>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-night-border to-transparent mb-8"></div>

      {filteredHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
          <span className="material-symbols-outlined text-6xl text-slate-600 mb-4">search_off</span>
          <p className="text-slate-400 text-lg font-bold">NENHUM TERMO OU PALAVRA FORAM ENCONTRADOS</p>
          {searchTerm && <p className="text-slate-500 text-sm mt-2">Tente buscar por outro termo.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHistory.map((item) => (
            <TermCard 
              key={`${item.data.id}-${item.timestamp}`}
              id={item.data.id}
              title={item.data.term} 
              category={item.data.category} 
              categoryColor={getCategoryColor(item.data.category)}
              icon="history" // Default icon for history
              description={item.data.definition}
              date={formatHistoryDate(item.timestamp)}
            />
          ))}
        </div>
      )}
    </div>
  );
};