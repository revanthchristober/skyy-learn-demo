import React, { useState } from 'react';
import { XIcon } from '@phosphor-icons/react';

interface FlagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (note: string) => Promise<void>;
}

export const FlagModal: React.FC<FlagModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSubmit(note || 'Requested clarification during practice');
    setIsSubmitting(false);
    setNote('');
    onClose();
  };

  return (
    <div className="scrim" role="dialog" aria-modal="true" aria-labelledby="flag-title">
      <div className="dialog max-w-md">
        <button onClick={onClose} aria-label="Close" className="btn btn-quiet absolute right-3 top-3 !px-2">
          <XIcon size={14} />
        </button>

        <h2 id="flag-title" className="text-lg font-semibold">Ask your tutor</h2>
        <p className="mt-1 text-muted">This goes on the list for your next session.</p>

        <form onSubmit={handleSubmit} className="mt-5">
          <label htmlFor="flag-note" className="field-label">What was confusing?</label>
          <textarea
            id="flag-note"
            rows={3}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="I could not tell how 3/8 compares to 16ths."
            className="input leading-relaxed"
            autoFocus
          />
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn btn-quiet">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
