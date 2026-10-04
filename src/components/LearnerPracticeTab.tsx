import React, { useState } from 'react';
import { ArrowRightIcon, FlagIcon } from '@phosphor-icons/react';
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
  const [showHint, setShowHint] = useState(false);

  if (!drills || drills.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Practice</h1>
        <p className="mt-1 text-muted">
          Nothing to practice yet. Your tutor is still checking the questions for this session.
        </p>
      </div>
    );
  }

  const currentDrill = drills[currentDrillIndex] || drills[0];
  const answered = selectedAnswer !== null;
  const isLast = currentDrillIndex === drills.length - 1;

  const handleNext = () => {
    setSelectedAnswer(null);
    setShowHint(false);
    if (!isLast) {
      setCurrentDrillIndex(currentDrillIndex + 1);
    } else {
      onCompletePractice();
    }
  };

  const choose = (idx: number) => {
    setSelectedAnswer(idx);
    recordAttemptAPI({
      drillId: currentDrill.id,
      selectedIndex: idx,
      isCorrect: idx === currentDrill.correctIndex
    }).catch(err => console.warn('Could not record attempt to Postgres:', err));
  };

  return (
    <div>
      <p className="text-sm text-muted">
        {studentName}, {subject}
        <span className="ml-3 font-mono text-ink">
          {currentDrillIndex + 1} / {drills.length}
        </span>
      </p>

      <h1 className="mt-6 text-2xl font-semibold leading-snug">{currentDrill.question}</h1>

      <div className="mt-8 space-y-2" role="group" aria-label="Answer choices">
        {currentDrill.options?.map((option, idx) => {
          const isSelected = selectedAnswer === idx;
          const isCorrect = idx === currentDrill.correctIndex;

          let style = 'border-line bg-surface hover:border-[#cfccc4]';
          if (answered) {
            if (isCorrect) style = 'border-ok-ink/40 bg-ok-bg text-ok-ink';
            else if (isSelected) style = 'border-bad-ink/40 bg-bad-bg text-bad-ink';
            else style = 'border-line bg-surface text-muted';
          }

          return (
            <button
              key={idx}
              disabled={answered}
              onClick={() => choose(idx)}
              className={`flex w-full items-center gap-4 rounded-md border px-4 py-3 text-left text-[16px] transition-colors active:translate-y-px ${style}`}
            >
              <span className="w-4 font-mono text-sm">{String.fromCharCode(65 + idx)}</span>
              <span className="flex-1">{option}</span>
              {answered && isCorrect && <span className="text-sm font-medium">Correct</span>}
              {answered && isSelected && !isCorrect && <span className="text-sm font-medium">Your answer</span>}
            </button>
          );
        })}
      </div>

      {!answered && (
        <div className="mt-5">
          <button onClick={() => setShowHint(!showHint)} className="btn btn-quiet -ml-2">
            {showHint ? 'Hide hint' : 'Show a hint'}
          </button>
          {showHint && <p className="mt-1 max-w-prose text-[15px]">{currentDrill.hint}</p>}
        </div>
      )}

      {answered && (
        <div className="mt-6 border-t border-line pt-5">
          <p className="text-sm font-medium text-ink">
            {selectedAnswer === currentDrill.correctIndex ? 'That is right.' : 'Not quite.'}
          </p>
          <p className="mt-1 max-w-prose">{currentDrill.explanation}</p>
        </div>
      )}

      <div className="mt-10 flex items-center justify-between border-t border-line pt-5">
        <button onClick={onOpenFlagModal} className="btn btn-quiet -ml-2">
          <FlagIcon size={14} />
          Ask my tutor about this
        </button>
        {answered && (
          <button onClick={handleNext} className="btn btn-primary">
            {isLast ? 'Finish' : 'Next question'}
            <ArrowRightIcon size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
