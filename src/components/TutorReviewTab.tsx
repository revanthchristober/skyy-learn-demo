import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Drill } from '../types';

interface TutorReviewTabProps {
  drills: Drill[];
  studentName: string;
  generationMeta: {
    durationMs: number;
    model: string;
    attempts?: number;
    retryLogs?: Array<{
      attempt: number;
      reason: string;
      errors: string[];
    }>;
  } | null;
  onUpdateDrill: (id: string, updates: { question?: string; explanation?: string }) => Promise<void>;
  onApproveAll: () => Promise<void>;
  onBackToNotes: () => void;
  isApproving: boolean;
}

export const TutorReviewTab: React.FC<TutorReviewTabProps> = ({
  drills,
  studentName,
  generationMeta,
  onUpdateDrill,
  onApproveAll,
  onBackToNotes,
  isApproving
}) => {
  const [editingDrillId, setEditingDrillId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ question: string; explanation: string }>({
    question: '',
    explanation: ''
  });

  const handleStartEdit = (drill: Drill) => {
    setEditingDrillId(drill.id);
    setEditForm({
      question: drill.question,
      explanation: drill.explanation
    });
  };

  const handleSaveEdit = async (id: string) => {
    await onUpdateDrill(id, editForm);
    setEditingDrillId(null);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-white">Tutor Review &amp; Verification Gate</h2>
            {generationMeta && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/60 font-mono">
                  Validated via {generationMeta.model} ({generationMeta.durationMs}ms)
                </span>
                {generationMeta.attempts && generationMeta.attempts > 1 && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-amber-950/40 text-amber-400 border border-amber-800/60 font-mono">
                    Self-Corrected on Attempt {generationMeta.attempts}
                  </span>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Verify accuracy and tone before drills are made accessible to {studentName}.
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

      <div className="space-y-4">
        {drills.map((drill, index) => (
          <div key={drill.id || index} className="border border-slate-800 rounded-lg p-5 bg-[#0b0e14] space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <span className="text-slate-500 font-mono">0{index + 1}.</span>
                <span>{drill.title}</span>
                {drill.approvedAt && (
                  <span className="text-emerald-400 text-[11px] font-mono ml-2">✓ Verified</span>
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
                  Edit Question
                </button>
              )}
            </div>

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
                    <span className="text-[11px] text-emerald-400 font-mono">Verified Correct</span>
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
        ))}
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
