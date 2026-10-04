import React from 'react';
import { 
  GraduationCap, 
  FileText, 
  CheckCircle2, 
  Target, 
  CalendarCheck, 
  Lock, 
  Cpu 
} from 'lucide-react';
import { TabKey } from '../types';
import { useAuth } from '../context/AuthContext';

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
  const { user, activeRole, openAuthModal } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#0f172a]/95 backdrop-blur-md px-4 sm:px-6 py-3 transition-colors">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
        {/* Brand identity */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-sm tracking-tight">
                  Skyy<span className="text-indigo-400 font-semibold">Learn</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Tutor Practice
                </span>
              </div>
            </div>
          </div>

          {/* Mobile view quick user button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={openAuthModal}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 text-xs text-slate-200 border border-slate-700/60"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activeRole === 'tutor' ? 'bg-indigo-400' : 'bg-emerald-400'}`}></span>
              <span className="font-medium text-[11px]">{user ? user.fullName.split(' ')[0] : 'User'}</span>
            </button>
            <button
              onClick={onOpenArchitecture}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
              title="System Specs"
            >
              <Cpu className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center: Modern Segmented Navigation Tabs */}
        <nav 
          className="flex items-center gap-1 bg-[#131b2e] p-1 rounded-xl border border-slate-800/90 w-full md:w-auto overflow-x-auto no-scrollbar" 
          aria-label="Workflow Steps"
        >
          <button
            onClick={() => setActiveTab('tutor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
              activeTab === 'tutor' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>1. Session Notes</span>
          </button>

          <button
            onClick={() => setActiveTab('review')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
              activeTab === 'review' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>2. Tutor Review</span>
            {isApproved && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5"></span>
            )}
          </button>

          <button
            onClick={() => {
              if (isApproved) {
                setActiveTab('learner');
              }
            }}
            disabled={!isApproved}
            title={!isApproved ? "Locked: Awaiting tutor verification & approval" : "Go to Practice Drills"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
              activeTab === 'learner' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : isApproved
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  : 'text-slate-600 cursor-not-allowed opacity-50'
            }`}
          >
            {!isApproved ? (
              <Lock className="w-3 h-3 text-slate-500" />
            ) : (
              <Target className="w-3.5 h-3.5" />
            )}
            <span>3. Practice Drills</span>
            {isApproved && flagCount > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded text-[10px] font-mono">
                {flagCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('agenda')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
              activeTab === 'agenda' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>4. Next Session</span>
          </button>
        </nav>

        {/* Right side controls (Desktop) */}
        <div className="hidden md:flex items-center gap-2.5">
          <button
            onClick={openAuthModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#131b2e] hover:bg-[#1a243d] text-slate-200 border border-slate-800 hover:border-slate-700 transition text-xs shadow-sm"
            title="Switch User Persona or Sign In"
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              activeRole === 'tutor' 
                ? 'bg-indigo-500/20 text-indigo-300' 
                : 'bg-emerald-500/20 text-emerald-300'
            }`}>
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <span className="font-medium text-slate-200">
              {user ? user.fullName : 'Dakota Munro'}
            </span>
            <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-md ${
              activeRole === 'tutor' 
                ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-800/40' 
                : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
            }`}>
              {activeRole}
            </span>
          </button>

          <button 
            onClick={onOpenArchitecture}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-[#131b2e] hover:bg-[#1a243d] border border-slate-800 hover:border-slate-700 transition"
            title="System Architecture & Specs"
          >
            <Cpu className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
