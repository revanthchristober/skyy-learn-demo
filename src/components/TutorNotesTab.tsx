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
  const name = studentName.trim();
  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-14">
      <div>
        <h1 className="text-2xl font-semibold">Session notes</h1>
        <p className="mt-1 text-muted">
          Write down where {name || 'the learner'} got stuck. You review the practice questions before they see them.
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
              <input id="learner" type="text" value={studentName} onChange={e => setStudentName(e.target.value)} className="input" placeholder="Marcus Vance" />
            </div>
            <div>
              <label htmlFor="topic" className="field-label">Topic</label>
              <input id="topic" type="text" value={subject} onChange={e => setSubject(e.target.value)} className="input" placeholder="Fractions and proportions" />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="field-label">What happened in the session</label>
            <textarea id="notes" rows={5} value={tutorNotes} onChange={e => setTutorNotes(e.target.value)} className="input leading-relaxed" placeholder="What they practiced, where they hesitated, the specific mistakes." />
          </div>

          <div>
            <label htmlFor="tone" className="field-label">How to word the questions</label>
            <textarea id="tone" rows={2} value={tutorToneNote} onChange={e => setTutorToneNote(e.target.value)} className="input leading-relaxed" placeholder="Use real shop situations. No kid metaphors." />
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-line pt-6">
            <p className="text-sm text-muted">Nothing is shared until you approve.</p>
            <button type="submit" disabled={isGenerating || !studentName.trim() || !tutorNotes.trim()} className="btn btn-primary shrink-0">
              {isGenerating ? 'Writing questions...' : (<>Make practice questions<ArrowRightIcon size={14} /></>)}
            </button>
          </div>
        </form>
      </div>

      <div className="desk hidden p-8 lg:block lg:sticky lg:top-12" aria-hidden="true">
        <div className="sheet px-9 py-10">
          <div className="flex items-baseline justify-between gap-4">
            <div className="text-xl font-semibold text-ink">{name || 'Learner name'}</div>
            <div className="font-mono text-[13px] text-muted">Session sheet</div>
          </div>
          <div className="mt-1 text-[15px] text-muted">{subject.trim() || 'Topic'}</div>

          <div className="sheet-rule mt-6 pt-5">
            <div className="text-[13px] font-medium text-muted">Where they got stuck</div>
            {tutorNotes.trim() ? (
              <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-body">{tutorNotes}</p>
            ) : (
              <div className="mt-3 space-y-2"><div className="ink-line w-full" /><div className="ink-line w-2/3" /></div>
            )}
          </div>

          <div className="sheet-rule mt-6 pt-5">
            <div className="text-[13px] font-medium text-muted">Wording</div>
            {tutorToneNote.trim() ? (
              <p className="mt-2 text-[15px] leading-relaxed text-body">{tutorToneNote}</p>
            ) : (
              <div className="mt-3"><div className="ink-line w-1/2" /></div>
            )}
          </div>

          <div className="sheet-rule mt-6 pt-5">
            <div className="text-[13px] font-medium text-muted">Questions to be written</div>
            <ol className="mt-3 space-y-3">
              {[0, 1, 2, 3].map(i => (
                <li key={i} className="flex items-center gap-3">
                  <span className="w-5 font-mono text-[13px] text-[#b4b1a8]">{String(i + 1).padStart(2, '0')}</span>
                  <div className={`ink-line ${['w-5/6', 'w-3/4', 'w-4/5', 'w-2/3'][i]}`} />
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
