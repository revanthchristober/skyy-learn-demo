import React from 'react';
import { Code, Zap } from 'lucide-react';
import { TabKey } from '../types';

interface HeaderProps {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  isApproved: boolean;
  flagCount: number;
  onOpenArchitecture: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isApproved,
  flagCount,
  onOpenArchitecture
}) => {
  return (
    <>
      {/* Top Utility Bar */}
      <div className="border-b border-slate-800 bg-[#0b0e14] px-6 py-2.5 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300">Skyy Learn</span>
          <span className="text-slate-600">/</span>
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <Zap className="w-3.5 h-3.5 fill-emerald-400" />
            Backend REST API + Live Groq LPU (Node.js &amp; TypeScript)
          </span>
        </div>
        <button 
          onClick={onOpenArchitecture}
          className="text-slate-300 hover:text-white underline underline-offset-4 flex items-center gap-1.5 transition"
        >
          <Code className="w-3.5 h-3.5" />
          Technical Architecture Blueprint
        </button>
      </div>

      {/* Main Header */}
      <header className="border-b border-slate-800/80 bg-[#07090e] px-6 py-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-semibold text-white tracking-normal">
              Skyy Tech — Practice Engine
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Human guidance at the center. AI-assisted drills between sessions.
            </p>
          </div>

          {/* Stepper Navigation: Clean semantic tabs */}
          <nav className="flex items-center gap-1 border border-slate-800 rounded-lg p-1 bg-[#0b0e14]" aria-label="Workflow Steps">
            <button
              onClick={() => setActiveTab('tutor')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                activeTab === 'tutor' 
                  ? 'bg-slate-800 text-white' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1. Session Notes
            </button>
            <button
              onClick={() => setActiveTab('review')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition flex items-center gap-1 ${
                activeTab === 'review' 
                  ? 'bg-slate-800 text-white' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2. Tutor Review
              {isApproved && <span className="text-emerald-400 font-bold">✓</span>}
            </button>
            <button
              onClick={() => {
                if (isApproved) {
                  setActiveTab('learner');
                }
              }}
              disabled={!isApproved}
              title={!isApproved ? "Locked: Awaiting tutor verification and approval" : "Go to Learner Practice"}
              className={`px-3 py-1.5 rounded text-xs font-medium transition flex items-center gap-1.5 ${
                activeTab === 'learner' 
                  ? 'bg-slate-800 text-white' 
                  : isApproved
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 cursor-not-allowed opacity-60'
              }`}
            >
              <span>3. Learner Practice</span>
              {!isApproved ? (
                <span className="text-[10px] text-slate-500 font-mono">Locked</span>
              ) : (
                flagCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded text-[11px] font-mono">
                    {flagCount}
                  </span>
                )
              )}
            </button>
            <button
              onClick={() => setActiveTab('agenda')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                activeTab === 'agenda' 
                  ? 'bg-slate-800 text-white' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              4. Next Session
            </button>
          </nav>
        </div>
      </header>
    </>
  );
};
