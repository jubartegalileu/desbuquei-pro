import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  activeColor: string;
  themeMode: ThemeMode;
  changeColor: (color: string) => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper to convert Hex to RGB string "R G B" for Tailwind
const hexToRgbString = (hex: string): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
};

// Helper to darken a hex color by a percentage (0-1) and return RGB string
const darkenColorToRgbString = (hex: string, amount: number): string => {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);

  r = Math.max(0, Math.floor(r * (1 - amount)));
  g = Math.max(0, Math.floor(g * (1 - amount)));
  b = Math.max(0, Math.floor(b * (1 - amount)));

  return `${r} ${g} ${b}`;
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Color State
  const [activeColor, setActiveColor] = useState<string>(() => {
    return localStorage.getItem('app-primary-color') || '#22D3EE';
  });

  // Mode State
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('app-theme-mode') as ThemeMode) || 'dark';
  });

  // Apply Primary Color Changes
  useEffect(() => {
    const rgbString = hexToRgbString(activeColor);
    document.documentElement.style.setProperty('--color-primary', rgbString);

    const darkRgbString = darkenColorToRgbString(activeColor, 0.25);
    document.documentElement.style.setProperty('--color-primary-dark', darkRgbString);

    localStorage.setItem('app-primary-color', activeColor);
  }, [activeColor]);

  // Apply Theme Mode Changes (Light/Dark)
  useEffect(() => {
    const root = document.documentElement;

    if (themeMode === 'light') {
        // LIGHT MODE - HIGH CONTRAST GRAYSCALE
        
        // Backgrounds: Clean White & Light Gray separation
        root.style.setProperty('--bg-body', '241 245 249');   // Slate 100 (Light Gray Background)
        root.style.setProperty('--bg-panel', '255 255 255');  // Pure White (High Contrast Panels)
        root.style.setProperty('--bg-sidebar', '255 255 255'); // Pure White (Clean Sidebar)
        root.style.setProperty('--border-color', '203 213 225'); // Slate 300 (Visible Borders)

        // Text: High Contrast (Near Black)
        // --text-slate-100: Main Titles & Hover States -> Almost Black
        root.style.setProperty('--text-slate-100', '15 23 42');   // Slate 900
        
        // --text-slate-200: Secondary Text -> Very Dark Gray
        root.style.setProperty('--text-slate-200', '30 41 59');   // Slate 800
        
        // --text-slate-300: Body Text -> Dark Gray (High Readability)
        root.style.setProperty('--text-slate-300', '51 65 85');   // Slate 700
        
        // --text-slate-400: Muted Text -> Medium Gray
        root.style.setProperty('--text-slate-400', '71 85 105');  // Slate 600

        // --text-slate-500: Icons/Inactive -> Cool Gray
        root.style.setProperty('--text-slate-500', '100 116 139'); // Slate 500
        
    } else {
        // DARK MODE PALETTE (Default)
        
        // Backgrounds
        root.style.setProperty('--bg-body', '8 16 25');       // #081019
        root.style.setProperty('--bg-panel', '14 22 37');     // #0E1625
        root.style.setProperty('--bg-sidebar', '14 22 37');   // #0E1625
        root.style.setProperty('--border-color', '30 41 59'); // #1E293B

        // Text Standard
        root.style.setProperty('--text-slate-100', '241 245 249'); // White
        root.style.setProperty('--text-slate-200', '226 232 240');
        root.style.setProperty('--text-slate-300', '203 213 225');
        root.style.setProperty('--text-slate-400', '148 163 184');
        root.style.setProperty('--text-slate-500', '100 116 139');
    }

    localStorage.setItem('app-theme-mode', themeMode);
  }, [themeMode]);

  const changeColor = (color: string) => {
    setActiveColor(color);
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  return (
    <ThemeContext.Provider value={{ activeColor, themeMode, changeColor, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};