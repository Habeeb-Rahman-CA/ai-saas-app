import React from 'react';
import { Database, Cpu, Wand2, Sparkles, History, Bot } from 'lucide-react';

interface NavbarProps {
  activeTab: 'datasets' | 'train' | 'batch_predict' | 'single_predict' | 'history';
  setActiveTab: (tab: 'datasets' | 'train' | 'batch_predict' | 'single_predict' | 'history') => void;
  datasetCount: number;
  modelCount: number;
  predictionCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  datasetCount,
  modelCount,
  predictionCount,
}) => {
  const tabs = [
    { id: 'datasets', title: 'Data Studio (Upload CSV)', icon: Database, badge: datasetCount },
    { id: 'train', title: 'AutoML Engine (Train Model)', icon: Cpu, badge: modelCount },
    { id: 'batch_predict', title: 'Batch Prediction (CSV)', icon: Wand2, badge: null },
    { id: 'single_predict', title: 'Simulator (What-If)', icon: Sparkles, badge: null },
    { id: 'history', title: 'Prediction History', icon: History, badge: predictionCount },
  ] as const;

  return (
    <header className="border-b border-zinc-200/80 bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-18 flex items-center justify-between">
        {/* Brand */}
        <div 
          onClick={() => setActiveTab('datasets')} 
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-lg bg-black text-white flex items-center justify-center transition-transform group-hover:scale-95">
            <Bot className="w-5 h-5 stroke-[1.75]" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-lg text-black block leading-none">
              PREDICTR<span className="text-zinc-400 font-light">.AI</span>
            </span>
            <span className="text-[10px] tracking-widest uppercase font-mono text-zinc-400">
              AutoML Tabular System
            </span>
          </div>
        </div>

        {/* Minimalist Navigation (Icon-centric with Tooltips) */}
        <nav className="flex items-center gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={tab.title}
                className={`relative p-2.5 rounded-xl transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-black text-white shadow-sm'
                    : 'text-zinc-500 hover:text-black hover:bg-zinc-100'
                }`}
              >
                <Icon className="w-5 h-5 stroke-[1.75]" />
                {tab.badge !== null && tab.badge > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 text-[9px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? 'bg-zinc-800 text-white border border-black'
                        : 'bg-black text-white'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Minimal status indicator */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-black"></span>
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
            ONLINE
          </span>
        </div>
      </div>
    </header>
  );
};
