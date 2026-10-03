import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, ArrowRight, Flag } from 'lucide-react';
import { Drill } from '../types';

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
      <div className="max-w-xl mx-auto p-8 border border-slate-800 rounded-lg bg-[#0b0e14] text-center space-y-3">
        <h3 className="text-sm font-semibold text-white">No Drills Currently Available</h3>
        <p className="text-xs text-slate-400">
          Your tutor has not yet approved practice drills for this session. Please check back after your 1:1 session is reviewed.
        </p>
      </div>
    );
  }

  const currentDrill = drills[currentDrillIndex] || drills[0];

  // Only show the fraction comparison bar when the problem actually concerns fraction measurements
  const isFractionProblem = 
    currentDrill.question.includes('3/8') || 
    currentDrill.question.includes('6/16') ||
    currentDrill.question.toLowerCase().includes('fraction');

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
    <div className="max-w-2xl mx-auto w-full space-y-6">
      <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
        <div>
          <span className="font-semibold text-slate-200">{studentName}</span>
          <span className="mx-1.5">·</span>
          <span>{subject}</span>
        </div>
        <div className="font-mono">
          Question {currentDrillIndex + 1} of {drills.length}
        </div>
      </div>

      {/* Drill Card */}
      <div className="border border-slate-800 rounded-lg p-6 bg-[#0b0e14] space-y-6">
        <div>
          <div className="text-xs font-semibold text-blue-400 mb-1">
            {currentDrill.title}
          </div>
          <h3 className="text-lg font-semibold text-white leading-snug">
            {currentDrill.question}
          </h3>
        </div>

        {/* Visual reference: only rendered for relevant fraction questions */}
        {isFractionProblem && (
          <div className="bg-[#07090e] border border-slate-800 rounded p-3.5 space-y-2">
            <div className="text-xs text-slate-400 font-medium">Visual proportion comparison</div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-mono text-slate-300 w-10">3/8"</span>
                <div className="flex-1 h-4 bg-slate-900 rounded overflow-hidden flex border border-slate-800">
                  <div className="w-[37.5%] bg-blue-600 h-full"></div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-slate-300 w-10">6/16"</span>
                <div className="flex-1 h-4 bg-slate-900 rounded overflow-hidden flex border border-slate-800">
                  <div className="w-[37.5%] bg-sky-500 h-full"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Options */}
        <div className="space-y-2.5">
          {currentDrill.options?.map((option, idx) => {
            const isSelected = selectedAnswer === idx;
            const isCorrect = idx === currentDrill.correctIndex;
            const showValidation = selectedAnswer !== null;

            let style = "border-slate-800 bg-[#07090e] text-slate-300 hover:border-slate-700 hover:bg-slate-900/40";
            if (showValidation) {
              if (isCorrect) {
                style = "border-emerald-600 bg-emerald-950/20 text-emerald-200 font-medium";
              } else if (isSelected && !isCorrect) {
                style = "border-rose-600 bg-rose-950/20 text-rose-200";
              } else {
                style = "border-slate-800/50 bg-[#07090e]/50 text-slate-500";
              }
            }

            return (
              <button
                key={idx}
                disabled={showValidation}
                onClick={() => {
                  setSelectedAnswer(idx);
                  setShowExplanation(true);
                }}
                className={`w-full text-left p-3.5 rounded-lg border text-sm transition flex items-center justify-between ${style}`}
              >
                <span>{option}</span>
                {showValidation && isCorrect && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
                {showValidation && isSelected && !isCorrect && (
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Hint Accordion */}
        {!showExplanation && (
          <div>
            <button
              onClick={() => setShowHint(!showHint)}
              className="text-xs text-blue-400 hover:text-blue-300 underline"
            >
              {showHint ? 'Hide hint' : 'Show hint'}
            </button>
            {showHint && (
              <p className="mt-2 text-xs text-slate-300 bg-[#07090e] p-3 rounded border border-slate-800">
                {currentDrill.hint}
              </p>
            )}
          </div>
        )}

        {/* Explanation feedback */}
        {showExplanation && (
          <div className={`p-4 rounded-lg border text-xs space-y-1.5 ${
            selectedAnswer === currentDrill.correctIndex
              ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
              : 'bg-amber-950/20 border-amber-800/40 text-amber-200'
          }`}>
            <div className="font-semibold">
              {selectedAnswer === currentDrill.correctIndex ? 'Correct' : 'Explanation'}
            </div>
            <p className="text-slate-300 leading-relaxed">
              {currentDrill.explanation}
            </p>
          </div>
        )}

        {/* Actions: Flag for tutor & next question */}
        <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
          <button
            onClick={onOpenFlagModal}
            className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1.5 underline"
          >
            <Flag className="w-3.5 h-3.5" />
            Flag this question for my next 1:1 session
          </button>

          {selectedAnswer !== null && (
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1"
            >
              {currentDrillIndex < drills.length - 1 ? (
                <>Next question <ArrowRight className="w-3.5 h-3.5" /></>
              ) : (
                <>Review session summary <ArrowRight className="w-3.5 h-3.5" /></>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
