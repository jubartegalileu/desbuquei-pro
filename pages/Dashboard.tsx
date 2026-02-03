
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TermCard } from '../components/Card';
import { useVoice } from '../context/VoiceContext';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { openVoice } = useVoice();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
        navigate(`/term/${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <div className="w-full max-w-[1100px] mx-auto flex flex-col gap-16 p-6 lg:p-12">
      {/* Hero Section */}
      <section className="flex flex-col items-center text-center gap-10 mt-8 lg:mt-12">
        <div className="flex flex-col gap-4">
          <h2 className="text-slate-100 text-4xl lg:text-6xl font-extrabold font-display tracking-tight leading-tight">
            Não entre em pânico.<br />
            <span className="text-primary">Qual é sua dúvida?</span>
          </h2>
          <p className="text-slate-400 text-lg lg:text-xl max-w-2xl mx-auto">
            Respostas imediatas para qualquer termo técnico ou jargão complexo.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="w-full max-w-3xl flex flex-col lg:block relative group transition-all">
          
          {/* Input Wrapper */}
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-4 lg:left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary text-xl lg:text-2xl z-10">search</span>
            <input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-night-panel/80 border border-night-border text-slate-100 pl-12 lg:pl-16 pr-4 lg:pr-48 py-4 rounded-2xl lg:rounded-full text-base lg:text-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary shadow-2xl transition-all placeholder:text-slate-600 font-display" 
                placeholder="Pesquise um termo (ex: Kubernetes)..." 
                type="text" 
            />
            
            {/* DESKTOP BUTTONS (Inside Input) */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-2">
                <button type="submit" className="bg-primary hover:bg-primary-dark text-night-bg font-bold px-6 py-2.5 rounded-full text-base transition-all shadow-lg hover:shadow-primary/25 active:scale-95 flex items-center h-[46px]">
                DESBUGAR
                </button>
                <button 
                type="button" 
                onClick={openVoice}
                className="bg-night-panel hover:bg-night-border text-primary border border-night-border font-bold w-[46px] h-[46px] rounded-full transition-all flex items-center justify-center"
                >
                <span className="material-symbols-outlined text-lg icon-filled">mic</span>
                </button>
            </div>
          </div>

          {/* MOBILE BUTTONS (Below Input) */}
          <div className="flex lg:hidden items-center gap-3 mt-3 w-full animate-in fade-in slide-in-from-top-2">
            <button type="submit" className="flex-1 bg-primary hover:bg-primary-dark text-night-bg font-bold h-10 rounded-full text-sm transition-all shadow-lg hover:shadow-primary/25 active:scale-95 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-lg">auto_awesome</span>
                DESBUGAR
            </button>
            <button 
                type="button" 
                onClick={openVoice}
                // CHANGED: Fixed dimensions size-10 (w-10 h-10) to ensure perfect circle
                className="bg-night-panel hover:bg-night-border text-primary border border-night-border font-bold size-10 rounded-full transition-all flex items-center justify-center shadow-lg active:scale-95 flex-shrink-0"
            >
                <span className="material-symbols-outlined text-lg icon-filled">mic</span>
            </button>
          </div>

        </form>
      </section>

      {/* Explorer Grid */}
      <section className="flex flex-col gap-8 pb-12 border-t border-night-border pt-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-slate-100 text-2xl font-bold font-display flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">grid_view</span>
              Explorador de Termos
            </h3>
            <p className="text-slate-500 text-sm mt-1">Navegue pelos jargões mais recentes e populares.</p>
          </div>
          
          <div className="flex items-center gap-3">
             <select className="bg-night-panel border border-night-border rounded-xl px-4 py-2 text-xs font-bold text-slate-400 focus:outline-none focus:border-primary">
                <option>Recentes</option>
                <option>Populares</option>
                <option>A-Z</option>
             </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <TermCard 
            id="docker"
            title="Docker" 
            category="DevOps" 
            categoryColor="emerald"
            icon="layers" 
            description="Containers isolados para rodar aplicações de forma consistente em qualquer ambiente, eliminando o 'na minha máquina funciona'."
          />
          <TermCard 
            id="graphql"
            title="GraphQL" 
            category="Backend" 
            categoryColor="purple"
            icon="hub" 
            description="Linguagem de consulta para APIs que permite ao cliente pedir exatamente os dados que precisa, nada a mais, nada a menos."
          />
          <TermCard 
            id="serverless"
            title="Serverless" 
            category="Cloud" 
            categoryColor="blue"
            icon="cloud_off" 
            description="Execução de código sem gerenciar infraestrutura, pagando apenas pelo tempo de uso real dos recursos."
          />
           <TermCard 
            id="oauth"
            title="OAuth 2.0" 
            category="Security" 
            categoryColor="orange"
            icon="vpn_key" 
            description="Protocolo de autorização que permite acesso seguro a dados sem compartilhar senhas (ex: Logar com Google)."
          />
           <TermCard 
            id="kubernetes"
            title="Kubernetes" 
            category="Orquestração" 
            categoryColor="primary"
            icon="anchor" 
            description="Sistema open-source para automatizar a implantação, o dimensionamento e a gestão de containers."
          />
           <TermCard 
            id="redis"
            title="Redis" 
            category="Database" 
            categoryColor="rose"
            icon="bolt" 
            description="Armazenamento de estrutura de dados em memória, usado como banco de dados, cache e message broker."
          />
        </div>
      </section>
    </div>
  );
};
