import React from 'react';
import { X, CheckCircle, ShieldCheck, Database, Server, Cpu } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#0b0e14] border border-slate-800 rounded-lg max-w-xl w-full p-6 space-y-5 max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Full-Stack Technical Architecture</h3>
            <p className="text-xs text-slate-400 mt-0.5">Implemented 0-to-1 prototype aligned with Skyy Tech standards</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs text-slate-300">
          <div className="border border-slate-800 rounded p-3.5 bg-[#07090e] space-y-2">
            <div className="font-semibold text-slate-200 flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-400" />
              1. Node.js + TypeScript Backend (Hono)
            </div>
            <p className="text-slate-400 leading-relaxed">
              Real REST API architecture running on port 3001. All Groq credentials remain isolated on the server. The browser communicates exclusively via validated REST endpoints (<code>/api/sessions/generate</code>, <code>/api/drills/approve-all</code>, <code>/api/learner/drills</code>).
            </p>
          </div>

          <div className="border border-slate-800 rounded p-3.5 bg-[#07090e] space-y-2">
            <div className="font-semibold text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              2. Zod Schema Validation &amp; Server-Enforced Guardrails
            </div>
            <p className="text-slate-400 leading-relaxed">
              Every Groq LLM completion is parsed against strict Zod schemas ensuring integer bounds on <code>correctIndex</code>, minimum option counts, and non-empty explanations. The learner API endpoint strictly rejects requests with HTTP 403 until the tutor explicitly signs off.
            </p>
          </div>

          <div className="border border-slate-800 rounded p-3.5 bg-[#07090e] space-y-2">
            <div className="font-semibold text-slate-200 flex items-center gap-2">
              <Database className="w-4 h-4 text-sky-400" />
              3. Relational Data Models &amp; Persistence
            </div>
            <p className="text-slate-400 leading-relaxed font-mono text-[11px]">
              DBSession (tutor notes, approval status) · DBDrill (id, correctIndex, approvedAt) · DBFlaggedTopic (student note, queued agenda items). State persists to disk and survives server restarts and page refreshes.
            </p>
          </div>

          <div className="border border-slate-800 rounded p-3.5 bg-[#07090e] space-y-2">
            <div className="font-semibold text-slate-200 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-400" />
              4. Production Scaling Roadmap
            </div>
            <ul className="list-disc pl-4 space-y-1 text-slate-400">
              <li><strong>Live Video / Whiteboard:</strong> LiveKit WebRTC SFU for &lt;100ms latency video + WebSocket synchronized notes.</li>
              <li><strong>Marketplace Payments:</strong> Stripe Connect for escrow hold during 1:1 session booking and automated payout upon completion.</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs transition"
          >
            Close Blueprint
          </button>
        </div>
      </div>
    </div>
  );
};
