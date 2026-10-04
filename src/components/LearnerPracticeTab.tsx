import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Flag, 
  HelpCircle, 
  Sparkles,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { Drill } from '../types';
import { recordAttemptAPI } from '../api/client';

interface LearnerPracticeTabProps {
  drills: Drill[];
  studentName: string;
  subject: string;
  onOpenFlagModal: () => void;
  onCompletePractice: () => void;
}

export const LearnerPracticeTab: React.FC<LearnerPracticeTabProps> = ({
  drills,
  studentName,
  subject,
  onOpenFlagModal,
  onCompletePractice
}) => {
  const [currentDrillIndex, setCurrentDrillIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showHint, setShowHint] = useState(false);

  if (!drills || drills.length === 0) {
    return (
      <div className="max-w-md mx-auto p-8 border border-slate-800/80 rounded-2xl bg-[#131b2e] text-center space-y-3 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center">
          <HelpCircle className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-white">No Drills Currently Available</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Your tutor has not yet approved practice drills for this session. Please check back once your 1:1 notes are reviewed.
        </p>
      </div>
    );
  }

  const currentDrill = drills[currentDrillIndex] || drills[0];

  // Visual comparison bar for fraction measurements
  const isFractionProblem = 
    currentDrill.question.includes('3/8') || 
    currentDrill.question.includes('6/16') ||
    currentDrill.question.toLowerCase().includes('fraction');

  const progressPercent = Math.round(((currentDrillIndex + 1) / drills.length) * 100);

  const handleNext = () => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    setShowHint(false);
    if (currentDrillIndex < drills.length - 1) {
      setCurrentDrillIndex(currentDrillIndex + 1);
    } else {
      onCompletePractice();
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full space-y-5">
      {/* Learner Session & Progress Header */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{studentName}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">{subject}</span>
          </div>
          <span className="text-slate-400 font-medium font-mono text-[11px]">
            {currentDrillIndex + 1} of {drills.length}
          </span>
        </div>

        {/* Smooth animated progress bar */}
        <div className="w-full h-2 bg-[#131b2e] rounded-full overflow-hidden border border-slate-800">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Practice Problem Card */}
      <div className="bg-[#131b2e] border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <span className="inline-block text-[11px] font-semibold text-indigo-400 uppercase tracking-wider mb-1.5">
            {currentDrill.title}
          </span>
          <h3 className="text-base sm:text-lg font-semibold text-white leading-snug">
            {currentDrill.question}
          </h3>
        </div>

        {/* Visual reference for fraction problems */}
        {isFractionProblem && (
          <div className="bg-[#0d1322] border border-slate-800 rounded-xl p-4 space-y-2.5">
            <div className="text-xs text-slate-400 font-medium">Clearance Comparison</div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-mono text-slate-300 w-12 text-right">3/8"</span>
                <div className="flex-1 h-3.5 bg-slate-900 rounded-md overflow-hidden flex border border-slate-800">
                  <div className="w-[37.5%] bg-indigo-500 h-full rounded-sm"></div>
                </div>
                <span className="text-[11px] font-mono text-slate-400 w-12">0.375"</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-slate-300 w-12 text-right">6/16"</span>
                <div className="flex-1 h-3.5 bg-slate-900 rounded-md overflow-hidden flex border border-slate-800">
                  <div className="w-[37.5%] bg-sky-400 h-full rounded-sm"></div>
                </div>
                <span className="text-[11px] font-mono text-slate-400 w-12">0.375"</span>
              </div>
            </div>
          </div>
        )}

        {/* Choices */}
        <div className="space-y-2.5">
          {currentDrill.options?.map((option, idx) => {
            const isSelected = selectedAnswer === idx;
            const isCorrect = idx === currentDrill.correctIndex;
            const showValidation = selectedAnswer !== null;

            let cardStyle = "border-slate-800 bg-[#0d1322] text-slate-200 hover:border-slate-700 hover:bg-[#11192d]";
            let letterStyle = "bg-slate-800 text-slate-400";

            if (showValidation) {
              if (isCorrect) {
                cardStyle = "border-emerald-500 bg-emerald-950/25 text-emerald-200 shadow-sm";
                letterStyle = "bg-emerald-500/20 text-emerald-300";
              } else if (isSelected && !isCorrect) {
                cardStyle = "border-rose-500 bg-rose-950/25 text-rose-200 shadow-sm";
                letterStyle = "bg-rose-500/20 text-rose-300";
              } else {
                cardStyle = "border-slate-800/40 bg-[#0d1322]/40 text-slate-500 opacity-60";
              }
            }

            return (
              <button
                key={idx}
                disabled={showValidation}
                onClick={() => {
                  setSelectedAnswer(idx);
                  setShowExplanation(true);
                  recordAttemptAPI({
                    drillId: currentDrill.id,
                    selectedIndex: idx,
                    isCorrect: idx === currentDrill.correctIndex
                  }).catch(err => console.warn('Could not record attempt to Postgres:', err));
                }}
                className={`w-full text-left p-4 rounded-xl border text-xs sm:text-sm transition flex items-center justify-between group active:scale-[0.99] ${cardStyle}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition ${letterStyle}`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="font-medium">{option}</span>
                </div>

                {showValidation && isCorrect && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                {showValidation && isSelected && !isCorrect && (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Hint Accordion */}
        {!showExplanation && (
          <div className="pt-1">
            <button
              onClick={() => setShowHint(!showHint)}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showHint ? 'Hide hint' : 'Need a hint?'}</span>
            </button>
            {showHint && (
              <p className="mt-2 text-xs text-slate-300 bg-[#0d1322] p-3.5 rounded-xl border border-slate-800 leading-relaxed">
                {currentDrill.hint}
              </p>
            )}
          </div>
        )}

        {/* Pedagogical Explanation Feedback */}
        {showExplanation && (
          <div className={`p-4 rounded-xl border text-xs space-y-1.5 transition ${
            selectedAnswer === currentDrill.correctIndex
              ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
              : 'bg-amber-950/20 border-amber-800/40 text-amber-200'
          }`}>
            <div className="font-semibold flex items-center gap-1.5">
              {selectedAnswer === currentDrill.correctIndex ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Great job! Correct calculation</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>Review the reasoning</span>
                </>
              )}
            </div>
            <p className="text-slate-300 leading-relaxed pt-0.5">
              {currentDrill.explanation}
            </p>
          </div>
        )}

        {/* Actions bar */}
        <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between gap-3">
          <button
            onClick={onOpenFlagModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-[#0d1322] text-xs text-slate-400 hover:text-amber-300 transition"
          >
            <Flag className="w-3.5 h-3.5 text-amber-400" />
            <span>Still confused? Flag for tutor</span>
          </button>

          {showExplanation && (
            <button
              onClick={handleNext}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-md shadow-indigo-600/20"
            >
              <span>{currentDrillIndex < drills.length - 1 ? 'Next Question' : 'Complete Session'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
