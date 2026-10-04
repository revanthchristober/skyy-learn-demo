import React from 'react';
import { 
  Sparkles, 
  User, 
  BookOpen, 
  ShieldCheck, 
  ArrowRight, 
  Loader2, 
  AlertCircle,
  HelpCircle,
  Layers
} from 'lucide-react';

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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Student Profile & Lesson Context */}
      <div className="lg:col-span-4 space-y-4">
        {/* Student Active Card */}
        <div className="bg-[#131b2e] border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-sky-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-lg">
              {studentName.charAt(0)}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">{studentName}</h2>
              <p className="text-xs text-slate-400">
                {selectedPreset === 'fractions' ? 'Apprentice Electrician' : 'Financial Literacy Student'}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/60 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span>Focus Area</span>
              <span className="text-slate-200 font-medium">{subject}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Session Status</span>
              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Notes Pending
              </span>
            </div>
          </div>
        </div>

        {/* Lesson Presets */}
        <div className="bg-[#131b2e] border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Demo Curriculum Scenarios
            </span>
            <span className="text-[10px] text-slate-500">1-Click Load</span>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => onPresetChange('fractions')}
              className={`w-full text-left p-3 rounded-xl border text-xs transition ${
                selectedPreset === 'fractions'
                  ? 'border-indigo-500/80 bg-indigo-950/30 text-white'
                  : 'border-slate-800 bg-[#0d1322] text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="font-semibold text-slate-200">Trade Math: Conduit Fractions</div>
              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                Marcus Vance · 3/8" vs 6/16" bracket clearance
              </p>
            </button>

            <button
              onClick={() => onPresetChange('finance')}
              className={`w-full text-left p-3 rounded-xl border text-xs transition ${
                selectedPreset === 'finance'
                  ? 'border-indigo-500/80 bg-indigo-950/30 text-white'
                  : 'border-slate-800 bg-[#0d1322] text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="font-semibold text-slate-200">Financial Literacy: APR vs Interest</div>
              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                Elena Rostova · Compounded monthly vs flat fees
              </p>
            </button>
          </div>
        </div>

        {/* Safety & Protocol Card */}
        <div className="bg-[#131b2e]/60 border border-slate-800/60 rounded-2xl p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 text-indigo-300 font-medium">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            Tutor Quality Gate
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Questions remain locked until you review the answer keys and approve the set for {studentName}.
          </p>
        </div>
      </div>

      {/* Right Column: Intake & Debrief Form */}
      <div className="lg:col-span-8 bg-[#131b2e] border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-5">
        <div>
          <h2 className="text-base font-semibold text-white">1:1 Session Intake &amp; Debrief</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Record what was covered and where the student experienced friction to generate targeted practice.
          </p>
        </div>

        {generationError && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{generationError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Learner Name</label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="w-full bg-[#0d1322] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
              placeholder="e.g. Marcus Vance"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Subject / Concept</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-[#0d1322] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
              placeholder="e.g. Fractions & Proportions"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-300">
              Tutor Takeaways &amp; Friction Points
            </label>
            <span className="text-[11px] text-slate-500">Be specific about confusion points</span>
          </div>
          <textarea
            rows={4}
            value={tutorNotes}
            onChange={(e) => setTutorNotes(e.target.value)}
            className="w-full bg-[#0d1322] border border-slate-800 rounded-xl p-3.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 leading-relaxed transition"
            placeholder="Describe what the student practiced, where they hesitated, and specific errors observed..."
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-300">
              Pedagogical Tone &amp; Real-World Context
            </label>
            <span className="text-[11px] text-slate-500">Constraints for adult relevance</span>
          </div>
          <textarea
            rows={2}
            value={tutorToneNote}
            onChange={(e) => setTutorToneNote(e.target.value)}
            className="w-full bg-[#0d1322] border border-slate-800 rounded-xl p-3.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 leading-relaxed transition"
            placeholder="e.g. Practical trade electrician framing, no condescending metaphors..."
          />
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800/60">
          <p className="text-[11px] text-slate-500">
            Prepares 4 targeted practice questions for review.
          </p>

          <button
            onClick={onGenerate}
            disabled={isGenerating || !studentName.trim() || !tutorNotes.trim()}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition shadow-md shadow-indigo-600/20"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Practice Questions...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Practice Questions</span>
                <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
