import React from 'react';
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
    <div className="max-w-3xl mx-auto w-full space-y-6">
      <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Next 1:1 Session Plan</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Synchronizing between-session practice directly into the tutor's next agenda.
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400">
          Learner: {studentName}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 border border-slate-800 rounded-lg bg-[#0b0e14]">
          <div className="text-xs text-slate-400 font-medium">Session topic</div>
          <div className="text-sm font-semibold text-white mt-1">{subject}</div>
        </div>
        <div className="p-4 border border-slate-800 rounded-lg bg-[#0b0e14]">
          <div className="text-xs text-slate-400 font-medium">Practice completed</div>
          <div className="text-sm font-semibold text-white mt-1">{totalDrills} drills verified</div>
        </div>
        <div className="p-4 border border-slate-800 rounded-lg bg-[#0b0e14]">
          <div className="text-xs text-slate-400 font-medium">Flagged items</div>
          <div className="text-sm font-semibold text-amber-400 mt-1">{flaggedTopics.length} questions</div>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-semibold text-slate-300">
          Queued items for tutor review in next live call
        </h3>

        {flaggedTopics.length === 0 ? (
          <div className="p-4 border border-slate-800 rounded-lg bg-[#0b0e14] text-xs text-slate-400">
            No items were flagged during this run. The learner completed the set without unresolved confusion.
          </div>
        ) : (
          <div className="space-y-2">
            {flaggedTopics.map((item, i) => (
              <div key={i} className="p-3.5 border border-slate-800 rounded-lg bg-[#0b0e14] flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-slate-200">
                    Question: {item.question}
                  </div>
                  <div className="text-xs text-slate-400">
                    <span className="text-amber-400 font-medium">{studentName}'s note:</span> "{item.studentNote}"
                  </div>
                </div>
                <span className="text-xs text-slate-500 font-mono shrink-0">{item.timestamp}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
        <button
          onClick={onReturnToPractice}
          className="text-xs text-slate-400 hover:text-white"
        >
          ← Back to practice
        </button>
        <button
          onClick={() => onPresetChange(selectedPreset === 'fractions' ? 'finance' : 'fractions')}
          className="px-3.5 py-1.5 border border-slate-800 hover:border-slate-700 bg-[#0b0e14] text-slate-300 rounded text-xs font-medium transition"
        >
          Switch to {selectedPreset === 'fractions' ? 'Finance' : 'Fractions'} scenario
        </button>
      </div>
    </div>
  );
};
