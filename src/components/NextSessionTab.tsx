import React from 'react';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import { FlaggedTopic } from '../types';

interface NextSessionTabProps {
  studentName: string;
  subject: string;
  totalDrills: number;
  flaggedTopics: FlaggedTopic[];
  selectedPreset: string;
  onPresetChange: (key: 'fractions' | 'finance') => void;
  onReturnToPractice: () => void;
}

export const NextSessionTab: React.FC<NextSessionTabProps> = ({
  studentName,
  subject,
  totalDrills,
  flaggedTopics,
  selectedPreset,
  onPresetChange,
  onReturnToPractice
}) => {
  return (
    <div className="desk p-3 sm:p-8">
      <div className="sheet px-5 py-6 sm:px-10 sm:py-10">
        <div className="flex items-start justify-between gap-4 border-b border-line pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-ink">Next session agenda</h1>
              <span className="tag tag-ok">Ready</span>
            </div>
            <p className="mt-1 text-sm text-muted">
              What {studentName} wants to work through live in your next session.
            </p>
          </div>
          <div className="font-mono text-xs text-muted">
            {studentName}
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-3 gap-6 border-b border-line pb-6">
          <div>
            <dt className="text-sm text-muted">Topic</dt>
            <dd className="mt-1 font-medium text-ink">{subject}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Questions</dt>
            <dd className="mt-1 font-mono text-ink">{totalDrills}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Flagged</dt>
            <dd className="mt-1 font-mono text-ink">{flaggedTopics.length}</dd>
          </div>
        </dl>

        <h2 className="mt-6 text-base font-semibold text-ink">To go over in person</h2>

        {flaggedTopics.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Nothing flagged. {studentName} finished without asking for help.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {flaggedTopics.map((item, i) => (
              <li key={i} className="py-4">
                <p className="font-medium text-ink">{item.question}</p>
                <div className="mt-2 rounded-md bg-[#faf9f5] border border-line p-3 text-sm">
                  <span className="font-medium text-ink">{studentName}: </span>
                  <span className="text-body">&ldquo;{item.studentNote}&rdquo;</span>
                </div>
                <p className="mt-2 font-mono text-[12px] text-muted">{item.timestamp}</p>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-line pt-6">
          <button onClick={onReturnToPractice} className="btn btn-quiet">
            <ArrowLeftIcon size={14} />
            Back to practice
          </button>
          <button
            onClick={() => onPresetChange(selectedPreset === 'fractions' ? 'finance' : 'fractions')}
            className="btn"
          >
            Load {selectedPreset === 'fractions' ? 'APR and interest' : 'conduit fractions'} example
          </button>
        </div>
      </div>
    </div>
  );
};
