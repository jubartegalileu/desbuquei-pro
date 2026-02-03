import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { TermCard } from '../components/Card';
import { useFavorites } from '../context/FavoritesContext';

// Reusing helper logic for consistency (in a real app, this would be in utils)
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

export const Favorites = () => {
  const { favorites } = useFavorites();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFavorites = favorites.filter(term => 
    term.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
    term.definition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-12 pb-12">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
                <h2 className="text-slate-100 text-3xl font-bold font-display tracking-tight">Termos Favoritos</h2>
                <p className="text-slate-400 text-sm mt-1">Sua biblioteca personalizada de conceitos salvos.</p>
            </div>
             <div className="relative w-full md:w-80 group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 group-focus-within:text-primary transition-colors">search</span>
                <input 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-night-panel/50 backdrop-blur-md border border-night-border rounded-xl py-2.5 pl-12 pr-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all text-sm" 
                  placeholder="Buscar nos favoritos..." 
                  type="text"
                />
            </div>
        </header>

        {favorites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                <span className="material-symbols-outlined text-6xl text-slate-600 mb-4">bookmark_border</span>
                <p className="text-slate-400 text-lg">Você ainda não salvou nenhum termo.</p>
                <Link to="/glossary" className="mt-4 text-primary hover:underline">Explorar Glossário</Link>
            </div>
        ) : filteredFavorites.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                <p className="text-slate-400 text-lg font-bold">NENHUM FAVORITO ENCONTRADO</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                {filteredFavorites.map((term) => (
                    <TermCard 
                        key={term.id}
                        id={term.id}
                        title={term.term} 
                        category={term.category} 
                        categoryColor={getCategoryColor(term.category)} 
                        icon="bookmark" 
                        description={term.definition}
                        isFavorite={true} // Force favorite state visual
                    />
                ))}
            </div>
        )}
    </div>
  );
};