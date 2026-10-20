import React from 'react';
import { Sparkles, Database, Cpu, Wand2, History, Layers } from 'lucide-react';

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
  const navItems = [
    { id: 'datasets', label: '1. Data Studio', icon: Database, count: datasetCount },
    { id: 'train', label: '2. Auto-Train Model', icon: Cpu, count: modelCount },
    { id: 'batch_predict', label: '3. CSV Predictions', icon: Wand2, count: null },
    { id: 'single_predict', label: '4. What-If Simulator', icon: Sparkles, count: null },
    { id: 'history', label: 'Inference History', icon: History, count: predictionCount },
  ] as const;

  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('datasets')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                  Predictr<span className="text-indigo-400">.ai</span>
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  AutoML SaaS
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Upload CSV → Automated ML → High-precision predictions</p>
            </div>
          </div>

          <nav className="flex space-x-1 sm:space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm shadow-indigo-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.count !== null && item.count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
