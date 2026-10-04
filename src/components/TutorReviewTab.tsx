import React, { useState } from 'react';
import { ArrowLeftIcon, CheckIcon } from '@phosphor-icons/react';
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

  if (drills.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Review</h1>
        <p className="mt-1 text-muted">No questions yet. Write the session notes first and make a set.</p>
        <button onClick={onBackToNotes} className="btn mt-6">
          <ArrowLeftIcon size={14} />
          Session notes
        </button>
      </div>
    );
  }

  return (
    <div className="desk p-3 sm:p-8">
      <div className="sheet px-5 py-6 sm:px-10 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-line pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-ink">Review</h1>
              <span className="tag tag-ok">{drills.length} questions</span>
            </div>
            <p className="mt-1 text-sm text-muted">
              Check each answer key. {studentName} sees nothing until you approve.
            </p>
            {generationMeta && (
              <p className="mt-2 font-mono text-[13px] text-muted">
                {drills.length} questions, written in {(generationMeta.durationMs / 1000).toFixed(1)}s
                {generationMeta.auditorModel ? ' · Answers re-solved by independent auditor' : ''}
              </p>
            )}
          </div>
          <button onClick={onApproveAll} disabled={isApproving} className="btn btn-primary shrink-0">
            {isApproving ? 'Approving...' : 'Approve all'}
          </button>
        </div>

      {flaggedCount > 0 && (
        <p className="notice notice-warn mt-6">
          {flaggedCount} {flaggedCount === 1 ? 'question has' : 'questions have'} a suggested correction. Look at {flaggedCount === 1 ? 'it' : 'them'} before approving.
        </p>
      )}

      <ol className="mt-8 divide-y divide-line border-y border-line">
        {drills.map((drill, index) => {
          const isFlagged = drill.audit?.status === 'flagged';
          const isVerified = drill.audit?.status === 'verified';
          const isEditing = editingDrillId === drill.id;
          const suggested = drill.audit?.suggestedCorrectIndex;

          return (
            <li key={drill.id || index} className="py-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-muted">{String(index + 1).padStart(2, '0')}</span>
                  <span className="text-sm font-medium text-ink">{drill.title}</span>
                  {isVerified && <span className="tag tag-ok">Checked</span>}
                  {isFlagged && <span className="tag tag-warn">Needs a look</span>}
                </div>
                {isEditing ? (
                  <div className="flex gap-1">
                    <button onClick={() => setEditingDrillId(null)} className="btn btn-quiet">Cancel</button>
                    <button onClick={() => handleSaveEdit(drill.id)} className="btn">Save</button>
                  </div>
                ) : (
                  <button onClick={() => handleStartEdit(drill)} className="btn btn-quiet">Edit</button>
                )}
              </div>

              {isFlagged && drill.audit && (
                <div className="notice notice-warn mt-4 space-y-3">
                  <p>{drill.audit.reason}</p>
                  {suggested !== null && suggested !== undefined && (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span>
                        Suggested answer: <strong className="font-semibold">{String.fromCharCode(65 + suggested)}. {drill.options[suggested]}</strong>
                      </span>
                      <span className="flex gap-2">
                        {onDismissFlag && (
                          <button onClick={() => onDismissFlag(drill.id)} className="btn">Keep mine</button>
                        )}
                        {onAcceptSuggestion && (
                          <button onClick={() => onAcceptSuggestion(drill.id)} className="btn">Use suggestion</button>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {isEditing ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="field-label" htmlFor={`q-${drill.id}`}>Question</label>
                    <input
                      id={`q-${drill.id}`}
                      type="text"
                      value={editForm.question}
                      onChange={e => setEditForm(prev => ({ ...prev, question: e.target.value }))}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor={`e-${drill.id}`}>Explanation</label>
                    <input
                      id={`e-${drill.id}`}
                      type="text"
                      value={editForm.explanation}
                      onChange={e => setEditForm(prev => ({ ...prev, explanation: e.target.value }))}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor={`c-${drill.id}`}>Correct answer</label>
                    <select
                      id={`c-${drill.id}`}
                      value={editForm.correctIndex}
                      onChange={e => setEditForm(prev => ({ ...prev, correctIndex: Number(e.target.value) }))}
                      className="input"
                    >
                      {drill.options?.map((opt, optIdx) => (
                        <option key={optIdx} value={optIdx}>
                          {String.fromCharCode(65 + optIdx)}. {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <h3 className="mt-4 text-lg font-medium leading-snug text-ink">{drill.question}</h3>
              )}

              <ul className="mt-4 space-y-1.5">
                {drill.options?.map((opt, optIndex) => {
                  const isCorrect = optIndex === drill.correctIndex;
                  return (
                    <li
                      key={optIndex}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-[15px] ${
                        isCorrect ? 'bg-ok-bg text-ok-ink' : 'text-body'
                      }`}
                    >
                      <span className="w-4 font-mono text-sm">{String.fromCharCode(65 + optIndex)}</span>
                      <span className="flex-1">{opt}</span>
                      {isCorrect && (
                        <span className="flex items-center gap-1 text-sm font-medium">
                          <CheckIcon size={14} />
                          Key
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>

              <p className="mt-4 text-sm text-muted">
                <span className="font-medium text-ink">Why: </span>
                {drill.explanation}
              </p>
            </li>
          );
        })}
      </ol>

        <div className="mt-8 flex items-center justify-between border-t border-line pt-6">
          <button onClick={onBackToNotes} className="btn btn-quiet">
            <ArrowLeftIcon size={14} />
            Session notes
          </button>
          <button onClick={onApproveAll} disabled={isApproving} className="btn btn-primary">
            {isApproving ? 'Approving...' : 'Approve all'}
          </button>
        </div>
      </div>
    </div>
  );
};
