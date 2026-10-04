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
    <div>
      <h1 className="text-2xl font-semibold">Next session</h1>
      <p className="mt-1 text-muted">What {studentName} wants to go over live.</p>

      <dl className="mt-8 grid grid-cols-3 gap-6 border-y border-line py-5">
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

      <h2 className="mt-8 text-base font-semibold">To go over</h2>

      {flaggedTopics.length === 0 ? (
        <p className="mt-2 text-muted">
          Nothing flagged. {studentName} finished without asking for help.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {flaggedTopics.map((item, i) => (
            <li key={i} className="py-4">
              <p className="font-medium text-ink">{item.question}</p>
              <p className="mt-1 text-muted">&ldquo;{item.studentNote}&rdquo;</p>
              <p className="mt-1 font-mono text-[13px] text-muted">{item.timestamp}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 flex items-center justify-between border-t border-line pt-5">
        <button onClick={onReturnToPractice} className="btn btn-quiet -ml-2">
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
  );
};
