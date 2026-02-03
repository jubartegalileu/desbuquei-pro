
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Character, characters } from '../data/characters';

interface VoiceContextType {
  isOpen: boolean;
  openVoice: () => void;
  closeVoice: () => void;
  activeCharacter: Character;
  setActiveCharacter: (characterId: string) => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export const VoiceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Initialize character from localStorage or default to 'jessica' (Female Nerd)
  const [activeCharacterId, setActiveCharacterId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('app-voice-character-id');
      // Validate if saved ID exists in our current list
      if (saved && characters.find(c => c.id === saved)) {
        return saved;
      }
      return 'jessica';
    } catch (e) {
      return 'jessica';
    }
  });

  // Persist settings whenever they change
  useEffect(() => {
    localStorage.setItem('app-voice-character-id', activeCharacterId);
  }, [activeCharacterId]);

  const activeCharacter = characters.find(c => c.id === activeCharacterId) || characters[0];

  const openVoice = () => setIsOpen(true);
  const closeVoice = () => setIsOpen(false);

  const setActiveCharacter = (id: string) => {
    if (characters.find(c => c.id === id)) {
        setActiveCharacterId(id);
    }
  };

  return (
    <VoiceContext.Provider value={{ isOpen, openVoice, closeVoice, activeCharacter, setActiveCharacter }}>
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
};
