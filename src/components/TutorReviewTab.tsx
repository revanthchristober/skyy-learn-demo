import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';
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
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-white">Tutor Review &amp; Verification Gate</h2>
            {generationMeta && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/60 font-mono">
                  Generator: {generationMeta.model}
                </span>
                {generationMeta.auditorModel && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-purple-950/40 text-purple-300 border border-purple-800/60 font-mono">
                    Auditor: {generationMeta.auditorModel} ({generationMeta.auditDurationMs || 0}ms)
                  </span>
                )}
                {generationMeta.attempts && generationMeta.attempts > 1 && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-amber-950/40 text-amber-400 border border-amber-800/60 font-mono">
                    Self-Corrected ({generationMeta.attempts} attempts)
                  </span>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Human-in-the-loop gate: Verify pedagogical tone and answer keys before practice unlocks for {studentName}.
          </p>
        </div>
        <button
          onClick={onApproveAll}
          disabled={isApproving}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4" />
          {isApproving ? 'Approving on Server...' : 'Approve & Send to Learner'}
        </button>
      </div>

      {/* Flagged Alert Banner if any drills are doubtful */}
      {flaggedCount > 0 && (
        <div className="p-3.5 rounded-lg border border-amber-600/50 bg-amber-950/20 text-xs text-amber-300 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Independent Correctness Pass Notice: </span>
            {flaggedCount} drill(s) flagged by the 20B auditor model with answer key doubts. Review the flagged cards below and either accept the suggested answer or dismiss the flag.
          </div>
        </div>
      )}

      <div className="space-y-4">
        {drills.map((drill, index) => {
          const isFlagged = drill.audit?.status === 'flagged';
          const isVerified = drill.audit?.status === 'verified';

          return (
            <div
              key={drill.id || index}
              className={`border rounded-lg p-5 bg-[#0b0e14] space-y-3 transition ${
                isFlagged
                  ? 'border-amber-600/60 shadow-[0_0_15px_rgba(217,119,6,0.1)]'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-300">
                  <span className="text-slate-500 font-mono">0{index + 1}.</span>
                  <span>{drill.title}</span>
                  {isVerified && (
                    <span className="text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/50 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Auditor Verified ({drill.audit?.confidence}%)
                    </span>
                  )}
                  {isFlagged && (
                    <span className="text-amber-400 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/50 border border-amber-700/60 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Flagged by Auditor
                    </span>
                  )}
                </div>

                {editingDrillId === drill.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingDrillId(null)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit(drill.id)}
                      className="text-xs text-emerald-400 font-medium hover:underline"
                    >
                      Save Changes
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleStartEdit(drill)}
                    className="text-xs text-blue-400 hover:text-blue-300 underline"
                  >
                    Edit Question &amp; Key
                  </button>
                )}
              </div>

              {/* Auditor Flag Warning Box */}
              {isFlagged && drill.audit && (
                <div className="border border-amber-600/50 bg-amber-950/25 rounded-md p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between text-amber-300">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>Auditor Flagged Answer Key</span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-400/80">
                      Model: {drill.audit.auditorModel} · Confidence: {drill.audit.confidence}%
                    </span>
                  </div>
                  <p className="text-amber-200/90 leading-relaxed font-sans">
                    {drill.audit.reason}
                  </p>
                  {drill.audit.suggestedCorrectIndex !== null && drill.audit.suggestedCorrectIndex !== undefined && (
                    <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-amber-800/40">
                      <div className="text-amber-200">
                        <span className="font-medium text-amber-300">Auditor Suggestion: </span>
                        Option {drill.audit.suggestedCorrectIndex + 1} (
                        <span className="font-mono text-white font-semibold">
                          {drill.options[drill.audit.suggestedCorrectIndex]}
                        </span>
                        ) should be marked correct.
                      </div>
                      <div className="flex items-center gap-2">
                        {onDismissFlag && (
                          <button
                            onClick={() => onDismissFlag(drill.id)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition"
                          >
                            Dismiss Flag
                          </button>
                        )}
                        {onAcceptSuggestion && (
                          <button
                            onClick={() => onAcceptSuggestion(drill.id)}
                            className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-semibold transition"
                          >
                            Accept Suggestion
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {editingDrillId === drill.id ? (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Question Prompt</label>
                    <input
                      type="text"
                      value={editForm.question}
                      onChange={(e) => setEditForm(prev => ({ ...prev, question: e.target.value }))}
                      className="w-full bg-[#07090e] border border-slate-700 rounded p-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Explanation</label>
                    <input
                      type="text"
                      value={editForm.explanation}
                      onChange={(e) => setEditForm(prev => ({ ...prev, explanation: e.target.value }))}
                      className="w-full bg-[#07090e] border border-slate-700 rounded p-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Marked Correct Option (Answer Key)</label>
                    <select
                      value={editForm.correctIndex}
                      onChange={(e) => setEditForm(prev => ({ ...prev, correctIndex: Number(e.target.value) }))}
                      className="w-full bg-[#07090e] border border-slate-700 rounded p-2 text-xs text-white"
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
                <p className="text-sm text-slate-200 font-medium">{drill.question}</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {drill.options?.map((opt, optIndex) => (
                  <div
                    key={optIndex}
                    className={`p-2.5 rounded border text-xs flex items-center justify-between ${
                      optIndex === drill.correctIndex
                        ? 'border-emerald-700/60 bg-emerald-950/20 text-emerald-200 font-medium'
                        : 'border-slate-800 bg-[#07090e] text-slate-400'
                    }`}
                  >
                    <span>{opt}</span>
                    {optIndex === drill.correctIndex && (
                      <span className="text-[11px] text-emerald-400 font-mono">Marked Correct</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="text-xs text-slate-400 border-t border-slate-800/60 pt-2 flex flex-col sm:flex-row gap-4">
                <div>
                  <span className="text-slate-300 font-medium">Tutor explanation: </span>
                  {drill.explanation}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
        <button
          onClick={onBackToNotes}
          className="text-xs text-slate-400 hover:text-white"
        >
          ← Back to notes
        </button>
        <button
          onClick={onApproveAll}
          disabled={isApproving}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4" />
          {isApproving ? 'Approving...' : 'Approve all drills & open learner practice'}
        </button>
      </div>
    </div>
  );
};
