import React from 'react';
import { ArrowRightIcon, WarningCircleIcon } from '@phosphor-icons/react';

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

const EXAMPLES: Array<{ key: 'fractions' | 'finance'; label: string }> = [
  { key: 'fractions', label: 'Conduit fractions' },
  { key: 'finance', label: 'APR and interest' }
];

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
    <div>
      <h1 className="text-2xl font-semibold">Session notes</h1>
      <p className="mt-1 text-muted">
        Write down where {studentName.trim() || 'the learner'} got stuck. You review the practice questions before they see them.
      </p>

      <div className="mt-4 flex items-center gap-1 text-sm">
        <span className="mr-1 text-muted">Load example</span>
        {EXAMPLES.map(ex => (
          <button
            key={ex.key}
            onClick={() => onPresetChange(ex.key)}
            aria-pressed={selectedPreset === ex.key}
            className={`rounded-md px-2 py-1 transition-colors ${
              selectedPreset === ex.key
                ? 'bg-surface font-medium text-ink ring-1 ring-line'
                : 'text-muted hover:text-ink'
            }`}
          >
            {ex.label}
          </button>
        ))}
      </div>

      {generationError && (
        <div role="alert" className="notice notice-bad mt-6 flex items-start gap-2">
          <WarningCircleIcon size={18} className="mt-0.5 shrink-0" />
          <span>{generationError}</span>
        </div>
      )}

      <form
        className="mt-8 space-y-6"
        onSubmit={e => {
          e.preventDefault();
          onGenerate();
        }}
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="learner" className="field-label">Learner</label>
            <input
              id="learner"
              type="text"
              value={studentName}
              onChange={e => setStudentName(e.target.value)}
              className="input"
              placeholder="Marcus Vance"
            />
          </div>
          <div>
            <label htmlFor="topic" className="field-label">Topic</label>
            <input
              id="topic"
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="input"
              placeholder="Fractions and proportions"
            />
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="field-label">What happened in the session</label>
          <textarea
            id="notes"
            rows={5}
            value={tutorNotes}
            onChange={e => setTutorNotes(e.target.value)}
            className="input leading-relaxed"
            placeholder="What they practiced, where they hesitated, the specific mistakes."
          />
        </div>

        <div>
          <label htmlFor="tone" className="field-label">How to word the questions</label>
          <textarea
            id="tone"
            rows={2}
            value={tutorToneNote}
            onChange={e => setTutorToneNote(e.target.value)}
            className="input leading-relaxed"
            placeholder="Use real shop situations. No kid metaphors."
          />
          <p className="field-hint">Keeps the practice relevant for an adult learner.</p>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-line pt-6">
          <p className="text-sm text-muted">Makes 4 questions. Nothing is shared until you approve.</p>
          <button
            type="submit"
            disabled={isGenerating || !studentName.trim() || !tutorNotes.trim()}
            className="btn btn-primary shrink-0"
          >
            {isGenerating ? (
              'Writing questions...'
            ) : (
              <>
                Make practice questions
                <ArrowRightIcon size={14} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
