import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TermData } from '../types';

interface FavoritesContextType {
  favorites: TermData[];
  addFavorite: (term: TermData) => void;
  removeFavorite: (termId: string) => void;
  isFavorite: (termId: string) => boolean;
  toggleFavorite: (term: TermData) => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<TermData[]>(() => {
    const saved = localStorage.getItem('app-favorites');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('app-favorites', JSON.stringify(favorites));
  }, [favorites]);

  const addFavorite = (term: TermData) => {
    setFavorites((prev) => {
      if (prev.some((t) => t.id === term.id)) return prev;
      return [...prev, term];
    });
  };

  const removeFavorite = (termId: string) => {
    setFavorites((prev) => prev.filter((t) => t.id !== termId));
  };

  const isFavorite = (termId: string) => {
    return favorites.some((t) => t.id === termId);
  };

  const toggleFavorite = (term: TermData) => {
    if (isFavorite(term.id)) {
      removeFavorite(term.id);
    } else {
      addFavorite(term);
    }
  };

  return (
    <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite, isFavorite, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};