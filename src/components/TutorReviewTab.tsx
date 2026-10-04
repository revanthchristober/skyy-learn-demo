import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Edit3, 
  Check, 
  X, 
  ArrowLeft,
  Sparkles,
  HelpCircle,
  Loader2
} from 'lucide-react';
import { Drill } from '../types';

interface TutorReviewTabProps {
  drills: Drill[];
  studentName: string;
  generationMeta: {
    durationMs: number;
    model: string;
    auditorModel?: string;
    auditDurationMs?: number;
    attempts?: number;
    flaggedCount?: number;
    retryLogs?: Array<{
      attempt: number;
      reason: string;
      errors: string[];
    }>;
  } | null;
  onUpdateDrill: (id: string, updates: { question?: string; explanation?: string; correctIndex?: number }) => Promise<void>;
  onApproveAll: () => Promise<void>;
  onBackToNotes: () => void;
  onAcceptSuggestion?: (drillId: string) => Promise<void>;
  onDismissFlag?: (drillId: string) => Promise<void>;
  isApproving: boolean;
}

export const TutorReviewTab: React.FC<TutorReviewTabProps> = ({
  drills,
  studentName,
  generationMeta,
  onUpdateDrill,
  onApproveAll,
  onBackToNotes,
  onAcceptSuggestion,
  onDismissFlag,
  isApproving
}) => {
  const [editingDrillId, setEditingDrillId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ question: string; explanation: string; correctIndex: number }>({
    question: '',
    explanation: '',
    correctIndex: 0
  });

  const handleStartEdit = (drill: Drill) => {
    setEditingDrillId(drill.id);
    setEditForm({
      question: drill.question,
      explanation: drill.explanation,
      correctIndex: drill.correctIndex
    });
  };

  const handleSaveEdit = async (id: string) => {
    await onUpdateDrill(id, editForm);
    setEditingDrillId(null);
  };

  const flaggedCount = drills.filter(d => d.audit?.status === 'flagged').length;

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      {/* Top action header */}
      <div className="bg-[#131b2e] border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-semibold text-white">Curriculum Review &amp; Approval</h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              {drills.length} Drills Ready
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Review practice questions and verify answer keys before unlocking for <span className="text-slate-200 font-medium">{studentName}</span>.
          </p>
        </div>

        <button
          onClick={onApproveAll}
          disabled={isApproving}
          className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 shrink-0 shadow-md shadow-emerald-900/20 disabled:opacity-50"
        >
          {isApproving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Approving &amp; Unlocking...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve &amp; Send to Learner</span>
            </>
          )}
        </button>
      </div>

      {/* Flagged Alert Banner */}
      {flaggedCount > 0 && (
        <div className="p-4 rounded-2xl border border-amber-600/40 bg-amber-950/20 text-xs text-amber-200 flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-amber-300">Auditor Quality Check: </span>
            <span>
              {flaggedCount} question has a suggested correction from the secondary auditor pass. Please review the highlighted card below.
            </span>
          </div>
        </div>
      )}

      {/* Drills List */}
      <div className="space-y-4">
        {drills.map((drill, index) => {
          const isFlagged = drill.audit?.status === 'flagged';
          const isVerified = drill.audit?.status === 'verified';
          const isEditing = editingDrillId === drill.id;

          return (
            <div
              key={drill.id || index}
              className={`bg-[#131b2e] border rounded-2xl p-5 sm:p-6 space-y-4 transition ${
                isFlagged
                  ? 'border-amber-600/60 ring-1 ring-amber-500/20 shadow-md shadow-amber-950/20'
                  : 'border-slate-800/80 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-xs font-bold font-mono">
                    {index + 1}
                  </span>
                  <span className="text-xs font-semibold text-slate-200">
                    {drill.title}
                  </span>
                  {isVerified && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3" />
                      Auditor Verified
                    </span>
                  )}
                  {isFlagged && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-950/50 border border-amber-700/50 px-2 py-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3" />
                      Review Recommended
                    </span>
                  )}
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingDrillId(null)}
                      className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit(drill.id)}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleStartEdit(drill)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-400 transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              {/* Auditor Flag Warning Box */}
              {isFlagged && drill.audit && (
                <div className="border border-amber-600/40 bg-amber-950/30 rounded-xl p-3.5 text-xs space-y-2.5">
                  <div className="flex items-center justify-between text-amber-300">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>Suggested Answer Key Revision</span>
                    </div>
                  </div>
                  <p className="text-amber-200/90 leading-relaxed">
                    {drill.audit.reason}
                  </p>
                  {drill.audit.suggestedCorrectIndex !== null && drill.audit.suggestedCorrectIndex !== undefined && (
                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-amber-800/40">
                      <div className="text-amber-200">
                        <span className="font-semibold text-amber-300">Auditor recommendation: </span>
                        Option {drill.audit.suggestedCorrectIndex + 1} (
                        <span className="font-semibold text-white">
                          {drill.options[drill.audit.suggestedCorrectIndex]}
                        </span>
                        )
                      </div>
                      <div className="flex items-center gap-2">
                        {onDismissFlag && (
                          <button
                            onClick={() => onDismissFlag(drill.id)}
                            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                          >
                            Keep Current
                          </button>
                        )}
                        {onAcceptSuggestion && (
                          <button
                            onClick={() => onAcceptSuggestion(drill.id)}
                            className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition shadow-sm"
                          >
                            Accept Suggestion
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Question Statement & Edit Mode */}
              {isEditing ? (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">Question Prompt</label>
                    <input
                      type="text"
                      value={editForm.question}
                      onChange={(e) => setEditForm(prev => ({ ...prev, question: e.target.value }))}
                      className="w-full bg-[#0d1322] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">Pedagogical Explanation</label>
                    <input
                      type="text"
                      value={editForm.explanation}
                      onChange={(e) => setEditForm(prev => ({ ...prev, explanation: e.target.value }))}
                      className="w-full bg-[#0d1322] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">Marked Correct Option</label>
                    <select
                      value={editForm.correctIndex}
                      onChange={(e) => setEditForm(prev => ({ ...prev, correctIndex: Number(e.target.value) }))}
                      className="w-full bg-[#0d1322] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      {drill.options?.map((opt, optIdx) => (
                        <option key={optIdx} value={optIdx}>
                          Option {optIdx + 1}: {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <h3 className="text-sm sm:text-base font-semibold text-white leading-snug">
                  {drill.question}
                </h3>
              )}

              {/* Multiple Choice Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {drill.options?.map((opt, optIndex) => {
                  const isCorrect = optIndex === drill.correctIndex;
                  return (
                    <div
                      key={optIndex}
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between transition ${
                        isCorrect
                          ? 'border-emerald-500/80 bg-emerald-950/20 text-emerald-200 font-medium'
                          : 'border-slate-800 bg-[#0d1322] text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                          isCorrect 
                            ? 'bg-emerald-500/20 text-emerald-300' 
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {String.fromCharCode(65 + optIndex)}
                        </span>
                        <span>{opt}</span>
                      </div>
                      {isCorrect && (
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          Answer Key
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Explanation Note */}
              <div className="text-xs text-slate-400 border-t border-slate-800/60 pt-3 flex items-start gap-2">
                <span className="text-indigo-400 font-medium shrink-0">Explanation:</span>
                <span className="text-slate-300 leading-relaxed">{drill.explanation}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBackToNotes}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Notes</span>
        </button>

        <button
          onClick={onApproveAll}
          disabled={isApproving}
          className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-md shadow-emerald-900/20 disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{isApproving ? 'Approving...' : 'Approve & Unlock Practice'}</span>
        </button>
      </div>
    </div>
  );
};
