import React from 'react';
import { ArrowRight, RefreshCw, Zap, AlertCircle } from 'lucide-react';

interface TutorNotesTabProps {
  selectedPreset: string;
  onPresetChange: (key: 'fractions' | 'finance') => void;
  studentName: string;
  setStudentName: (val: string) => void;
  subject: string;
  setSubject: (val: string) => void;
  tutorNotes: string;
  setTutorNotes: (val: string) => void;
  tutorToneNote: string;
  setTutorToneNote: (val: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  generationError: string | null;
}

export const TutorNotesTab: React.FC<TutorNotesTabProps> = ({
  selectedPreset,
  onPresetChange,
  studentName,
  setStudentName,
  subject,
  setSubject,
  tutorNotes,
  setTutorNotes,
  tutorToneNote,
  setTutorToneNote,
  onGenerate,
  isGenerating,
  generationError
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Left Context: Presets & Live Model Details */}
      <div className="space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-slate-200 mb-2">Preset Scenarios</h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            Adult learners have concrete goals. Select a scenario or type custom notes:
          </p>
          <div className="space-y-2">
            <button
              onClick={() => onPresetChange('fractions')}
              className={`w-full text-left p-3 rounded-lg border text-xs transition ${
                selectedPreset === 'fractions'
                  ? 'border-blue-500 bg-blue-950/20 text-white font-medium'
                  : 'border-slate-800 bg-[#0b0e14] text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="text-slate-200 font-medium">Trade Math: Conduit Fractions</div>
              <div className="text-slate-400 mt-0.5">3/8" vs 6/16" bracket clearance measurements</div>
            </button>
            <button
              onClick={() => onPresetChange('finance')}
              className={`w-full text-left p-3 rounded-lg border text-xs transition ${
                selectedPreset === 'finance'
                  ? 'border-blue-500 bg-blue-950/20 text-white font-medium'
                  : 'border-slate-800 bg-[#0b0e14] text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="text-slate-200 font-medium">Financial Literacy: APR</div>
              <div className="text-slate-400 mt-0.5">Compounded interest vs simple interest</div>
            </button>
          </div>
        </div>

        <div className="border-t border-slate-800/80 pt-4 space-y-2">
          <h3 className="text-xs font-semibold text-slate-300">Backend Infrastructure</h3>
          <div className="p-3 rounded border border-slate-800 bg-[#0b0e14] text-xs space-y-1.5">
            <div className="text-slate-400 flex items-center justify-between">
              <span>Server Runtime:</span>
              <span className="text-slate-200 font-mono">Node.js + Hono (TS)</span>
            </div>
            <div className="text-slate-400 flex items-center justify-between">
              <span>Validation:</span>
              <span className="text-emerald-400 font-mono">Zod Strict Schemas</span>
            </div>
            <div className="text-slate-400 flex items-center justify-between">
              <span>Generator Engine:</span>
              <span className="text-slate-200 font-mono">Groq LPU (Qwen 3.8)</span>
            </div>
            <div className="text-slate-400 flex items-center justify-between">
              <span>Auditor Verifier:</span>
              <span className="text-purple-300 font-mono">GPT-OSS 20B (Pass 2)</span>
            </div>
            <div className="text-slate-400 flex items-center justify-between">
              <span>Key Storage:</span>
              <span className="text-emerald-400 font-mono">Server-Side Only</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form */}
      <div className="md:col-span-2 space-y-5">
        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Log 1:1 Session Takeaways</h2>
            <p className="text-xs text-slate-400 mt-1">
              Summarize what was covered and where the learner experienced friction.
            </p>
          </div>
        </div>

        {generationError && (
          <div className="p-3 rounded border border-rose-800 bg-rose-950/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{generationError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Learner Name</label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="w-full bg-[#0b0e14] border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Subject / Topic</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-[#0b0e14] border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Tutor Notes &amp; Specific Misunderstandings
          </label>
          <textarea
            rows={4}
            value={tutorNotes}
            onChange={(e) => setTutorNotes(e.target.value)}
            className="w-full bg-[#0b0e14] border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Pedagogical Tone &amp; Constraints
          </label>
          <input
            type="text"
            value={tutorToneNote}
            onChange={(e) => setTutorToneNote(e.target.value)}
            className="w-full bg-[#0b0e14] border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Validating &amp; Generating via Server...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-white" />
                Generate Drills (Server API)
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
