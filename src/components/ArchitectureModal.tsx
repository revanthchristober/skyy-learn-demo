import React from 'react';
import { X, ShieldCheck, Database, Server, Cpu, KeyRound, Sparkles } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#131b2e] border border-slate-800/80 rounded-2xl max-w-xl w-full p-6 space-y-5 max-h-[85vh] overflow-y-auto shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-800/80 pb-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">System Architecture &amp; Stack</h3>
            <p className="text-xs text-slate-400">Production-grade foundation for human-in-the-loop tutoring</p>
          </div>
        </div>

        <div className="space-y-3.5 text-xs text-slate-300">
          <div className="border border-slate-800/80 rounded-xl p-4 bg-[#0d1322] space-y-1.5">
            <div className="font-semibold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-400" />
              <span>1. Node.js + Hono TypeScript REST Backend</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Port 3001 service isolating all LLM and database credentials server-side. The client accesses data exclusively via authenticated REST endpoints with strict request verification.
            </p>
          </div>

          <div className="border border-slate-800/80 rounded-xl p-4 bg-[#0d1322] space-y-1.5">
            <div className="font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>2. Zod Schema Verification &amp; Self-Correction Loop</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Every model completion is parsed against strict Zod schemas ensuring index bounds, unique options, and clear explanations. Incomplete outputs feed structured error diagnostics back into the model for automatic self-correction.
            </p>
          </div>

          <div className="border border-slate-800/80 rounded-xl p-4 bg-[#0d1322] space-y-1.5">
            <div className="font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>3. Dual-Pass Quality Engine: Independent Auditor</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              To eliminate answer-key errors before student practice, an independent auditor model re-solves each drill from scratch. Mathematical ambiguities or misaligned keys are flagged directly to the tutor before approval.
            </p>
          </div>

          <div className="border border-slate-800/80 rounded-xl p-4 bg-[#0d1322] space-y-1.5">
            <div className="font-semibold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-sky-400" />
              <span>4. PostgreSQL 17 Relational Storage &amp; GoTrue Auth</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Live Supabase connection pool hosting 6 tables (<span className="text-slate-300">profiles, sessions, session_notes, drills, drill_attempts, flagged_topics</span>) with active JWT validation and Row-Level Security.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800/80">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium transition"
          >
            Close Blueprint
          </button>
        </div>
      </div>
    </div>
  );
};
