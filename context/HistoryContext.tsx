import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TermData } from '../types';

export interface HistoryItem {
  data: TermData;
  timestamp: string; // ISO String
}

interface HistoryContextType {
  history: HistoryItem[];
  addToHistory: (term: TermData) => void;
  clearHistory: () => void;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export const HistoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('app-history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('app-history', JSON.stringify(history));
  }, [history]);

  const addToHistory = (term: TermData) => {
    setHistory((prev) => {
      // Remove if exists to push to top
      const filtered = prev.filter((item) => item.data.id !== term.id);
      const newItem: HistoryItem = {
        data: term,
        timestamp: new Date().toISOString()
      };
      // Add to beginning
      return [newItem, ...filtered];
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('app-history');
  };

  return (
    <HistoryContext.Provider value={{ history, addToHistory, clearHistory }}>
      {children}
    </HistoryContext.Provider>
  );
};

export const useHistory = () => {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
};