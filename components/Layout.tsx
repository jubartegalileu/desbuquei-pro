
import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { VoiceAssistant } from './VoiceAssistant';

const SidebarItem = ({ to, icon, label, filled = false }: { to: string; icon: string; label: string; filled?: boolean }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center justify-center lg:justify-start lg:gap-4 
         w-10 h-10 lg:w-auto lg:h-auto lg:px-4 lg:py-3 
         rounded-full transition-all duration-200 group mx-auto lg:mx-0
         ${
          isActive
            ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_-5px_rgba(var(--color-primary),0.3)]'
            : 'text-slate-500 hover:bg-night-panel hover:text-primary hover:border-primary/20 hover:shadow-sm'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`material-symbols-outlined text-[22px] lg:text-[24px] ${isActive || filled ? 'icon-filled' : ''}`}>{icon}</span>
          <span className={`hidden lg:block text-sm font-medium ${isActive ? 'font-semibold' : ''}`}>{label}</span>
        </>
      )}
    </NavLink>
  );
};

export const Layout = () => {
  return (
    <div className="flex h-screen w-full overflow-hidden relative">
      <VoiceAssistant />
      
      {/* Sidebar Component */}
      <aside className="w-20 lg:w-64 flex-shrink-0 flex flex-col justify-between border-r border-night-border bg-night-sidebar/95 backdrop-blur-md z-30">
        <div className="flex flex-col gap-6 p-4">
          {/* Logo Section */}
          <div className="flex items-center justify-center lg:justify-start gap-3 pb-6 border-b border-night-border">
            <div className="bg-gradient-to-br from-cyan-500/20 to-blue-600/20 aspect-square rounded-full size-12 ring-1 ring-night-border shadow-sm flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-2xl">code</span>
            </div>
            <div className="hidden lg:flex items-baseline">
              <h1 className="text-slate-100 text-3xl font-bold font-brand tracking-wide leading-none">DESBUGUEI</h1>
              <span className="text-primary text-xs font-light font-display tracking-tight ml-1">PRO</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-3 lg:gap-2">
            <SidebarItem to="/" icon="dashboard" label="Painel Principal" />
            <SidebarItem to="/history" icon="history" label="Histórico" />
            <SidebarItem to="/glossary" icon="menu_book" label="Glossário Técnico" />
            <SidebarItem to="/favorites" icon="favorite" label="Favoritos" />
            <SidebarItem to="/settings" icon="settings" label="Configurações" />
          </nav>
        </div>

        {/* Footer Info */}
        <div className="p-6 border-t border-night-border flex flex-col gap-4">
           <div className="hidden lg:flex flex-col px-2">
            <span className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">App Info</span>
            <span className="text-xs text-slate-500 mt-1 font-mono">v2.1</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col h-full overflow-hidden bg-night-bg">
        <div className="flex-1 overflow-y-auto scroll-smooth">
          <Outlet />
        </div>
        
        {/* Persistent Bottom Bar */}
        <div className="w-full bg-night-panel/80 backdrop-blur-md border-t border-night-border py-2 px-6 flex justify-center items-center z-10 flex-shrink-0">
            <div className="flex items-center gap-2 text-[10px] tracking-widest text-slate-500/80">
                <span className="material-symbols-outlined text-xs text-primary animate-pulse">terminal</span>
                <span className="uppercase font-bold whitespace-nowrap">Compilando conhecimento... <span className="text-primary">Enjoy.</span></span>
            </div>
        </div>
      </main>
    </div>
  );
};
