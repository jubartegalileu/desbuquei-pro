import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Glossary } from './pages/Glossary';
import { TermDetail } from './pages/TermDetail';
import { History } from './pages/History';
import { Favorites } from './pages/Favorites';
import { Settings } from './pages/Settings';
import { VoiceProvider } from './context/VoiceContext';
import { ThemeProvider } from './context/ThemeContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { HistoryProvider } from './context/HistoryContext';

function App() {
  return (
    <ThemeProvider>
      <VoiceProvider>
        <FavoritesProvider>
          <HistoryProvider>
            <HashRouter>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="glossary" element={<Glossary />} />
                  {/* Dynamic Route for Terms */}
                  <Route path="term/:termId" element={<TermDetail />} />
                  <Route path="history" element={<History />} />
                  <Route path="favorites" element={<Favorites />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </HashRouter>
          </HistoryProvider>
        </FavoritesProvider>
      </VoiceProvider>
    </ThemeProvider>
  );
}

export default App;