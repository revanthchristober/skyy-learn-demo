import React from 'react';
import { LockSimpleIcon } from '@phosphor-icons/react';
import { TabKey } from '../types';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  isApproved: boolean;
  flagCount: number;
  isConnected?: boolean;
  onOpenArchitecture: () => void;
}

const STEPS: Array<{ key: TabKey; label: string }> = [
  { key: 'tutor', label: 'Session notes' },
  { key: 'review', label: 'Review' },
  { key: 'learner', label: 'Practice' },
  { key: 'agenda', label: 'Next session' }
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isApproved,
  flagCount,
  isConnected = false,
  onOpenArchitecture
}) => {
  const { user, activeRole, openAuthModal } = useAuth();
  const displayName = user ? user.fullName : 'Dakota Munro';
  return (
    <aside className="border-b border-line bg-surface md:w-60 md:shrink-0 md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r md:flex md:flex-col">
      <div className="flex items-center justify-between px-4 py-3 md:px-5 md:py-5">
        <div className="flex items-center gap-2">
          <span className="text-[17px] font-semibold tracking-tight text-ink">Skyy Learn</span>
          <span
            title={isConnected ? 'Real-time WebSocket connected' : 'Connecting to real-time sync...'}
            className="inline-flex items-center gap-1 font-mono text-[11px] text-muted"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-ok-ink' : 'bg-[#dedbd3]'}`} />
            {isConnected && <span className="text-[11px] text-muted font-normal">live</span>}
          </span>
        </div>
        <button
          onClick={openAuthModal}
          className="md:hidden text-sm text-muted hover:text-ink"
        >
          {displayName}
        </button>
      </div>

      <nav
        aria-label="Workflow"
        className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible md:pb-0"
      >
        {STEPS.map(step => {
          const locked = step.key === 'learner' && !isApproved;
          const active = activeTab === step.key;
          return (
            <button
              key={step.key}
              onClick={() => !locked && setActiveTab(step.key)}
              disabled={locked}
              aria-current={active ? 'page' : undefined}
              title={locked ? 'Opens after the tutor approves the questions' : undefined}
              className={`flex shrink-0 items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                active
                  ? 'bg-canvas font-medium text-ink'
                  : locked
                    ? 'cursor-not-allowed text-[#a7a59e]'
                    : 'text-muted hover:bg-canvas hover:text-ink'
              }`}
            >
              <span>{step.label}</span>
              {locked && <LockSimpleIcon size={14} className="ml-2 shrink-0" />}
              {step.key === 'agenda' && flagCount > 0 && (
                <span className="ml-2 font-mono text-xs text-warn-ink shrink-0">{flagCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="hidden border-t border-line p-3 md:block">
        <button
          onClick={openAuthModal}
          className="w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-canvas"
          title="Switch account"
        >
          <div className="text-sm font-medium text-ink">{displayName}</div>
          <div className="text-[13px] capitalize text-muted">{activeRole}</div>
        </button>
        <button
          onClick={onOpenArchitecture}
          className="mt-1 w-full rounded-md px-3 py-2 text-left text-[13px] text-muted transition-colors hover:bg-canvas hover:text-ink"
        >
          How it works
        </button>
      </div>
    </aside>
  );
};
