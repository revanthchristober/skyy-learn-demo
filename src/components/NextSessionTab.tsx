import React from 'react';
import { 
  CalendarCheck, 
  CheckCircle2, 
  Flag, 
  ArrowLeft, 
  Repeat, 
  MessageSquare,
  Sparkles
} from 'lucide-react';
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
      {/* Header */}
      <div className="bg-[#131b2e] border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-white">Next 1:1 Tutoring Agenda</h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              Prep Ready
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Student friction points automatically queued for tutor review in the next live call.
          </p>
        </div>
        <div className="text-xs text-slate-300 font-medium bg-[#0d1322] border border-slate-800 px-3 py-1.5 rounded-xl">
          Student: <span className="text-white">{studentName}</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-slate-800/80 bg-[#131b2e] shadow-sm space-y-1">
          <span className="text-xs text-slate-400">Lesson Topic</span>
          <div className="text-sm font-semibold text-white truncate">{subject}</div>
        </div>
        <div className="p-4 rounded-2xl border border-slate-800/80 bg-[#131b2e] shadow-sm space-y-1">
          <span className="text-xs text-slate-400">Practice Drills</span>
          <div className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>{totalDrills} Completed</span>
          </div>
        </div>
        <div className="p-4 rounded-2xl border border-slate-800/80 bg-[#131b2e] shadow-sm space-y-1">
          <span className="text-xs text-slate-400">Items Flagged for Live Call</span>
          <div className={`text-sm font-semibold flex items-center gap-1.5 ${
            flaggedTopics.length > 0 ? 'text-amber-400' : 'text-slate-300'
          }`}>
            <Flag className="w-4 h-4" />
            <span>{flaggedTopics.length} Focus Points</span>
          </div>
        </div>
      </div>

      {/* Queued Items List */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
          <span>Friction Points for Next 1:1 Discussion</span>
        </h3>

        {flaggedTopics.length === 0 ? (
          <div className="p-6 border border-slate-800/80 rounded-2xl bg-[#131b2e] text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="text-xs font-semibold text-white">No Flagged Confusion Points</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {studentName} completed the practice drills without requesting clarification. Ready for new curriculum!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {flaggedTopics.map((item, i) => (
              <div 
                key={i} 
                className="p-4 border border-slate-800/80 rounded-2xl bg-[#131b2e] flex flex-col sm:flex-row sm:items-start justify-between gap-3 shadow-sm"
              >
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-slate-200">
                    <span className="text-indigo-400 mr-1.5">Problem:</span>
                    {item.question}
                  </div>
                  <div className="text-xs bg-[#0d1322] border border-slate-800/80 rounded-xl p-3 text-slate-300">
                    <span className="text-amber-400 font-semibold">{studentName}'s note: </span>
                    "{item.studentNote}"
                  </div>
                </div>
                <span className="text-[11px] text-slate-500 font-mono shrink-0">
                  {item.timestamp}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800/80">
        <button
          onClick={onReturnToPractice}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Practice</span>
        </button>

        <button
          onClick={() => onPresetChange(selectedPreset === 'fractions' ? 'finance' : 'fractions')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#131b2e] hover:bg-[#1a243d] border border-slate-800 hover:border-slate-700 text-xs text-slate-300 font-medium transition shadow-sm"
        >
          <Repeat className="w-3.5 h-3.5 text-indigo-400" />
          <span>Switch to {selectedPreset === 'fractions' ? 'Financial Literacy' : 'Trade Math'}</span>
        </button>
      </div>
    </div>
  );
};
