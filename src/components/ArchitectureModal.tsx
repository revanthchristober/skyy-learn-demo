import React from 'react';
import { XIcon } from '@phosphor-icons/react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PARTS: Array<{ name: string; body: string }> = [
  {
    name: 'Hono API server',
    body: 'All model and database keys stay on the server. The browser only talks to REST endpoints.'
  },
  {
    name: 'Zod checks with retry',
    body: 'Every model reply is parsed against a strict schema. If it fails, the errors go back to the model for another try.'
  },
  {
    name: 'Second model audits the answers',
    body: 'A separate model solves each question from scratch. If its answer differs from the key, the tutor sees a flag before approving.'
  },
  {
    name: 'Postgres and auth on Supabase',
    body: 'Six tables: profiles, sessions, session_notes, drills, drill_attempts, flagged_topics. Sign-in is Supabase GoTrue with row-level security.'
  }
];

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="scrim" role="dialog" aria-modal="true" aria-labelledby="arch-title">
      <div className="dialog max-w-xl">
        <button onClick={onClose} aria-label="Close" className="btn btn-quiet absolute right-3 top-3 !px-2">
          <XIcon size={14} />
        </button>

        <h2 id="arch-title" className="text-lg font-semibold">How it works</h2>
        <p className="mt-1 text-muted">The tutor stays in the loop. The AI only drafts.</p>

        <dl className="mt-5 divide-y divide-line border-y border-line">
          {PARTS.map(part => (
            <div key={part.name} className="py-4">
              <dt className="font-medium text-ink">{part.name}</dt>
              <dd className="mt-1 text-[15px] text-muted">{part.body}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="btn">Close</button>
        </div>
      </div>
    </div>
  );
};
