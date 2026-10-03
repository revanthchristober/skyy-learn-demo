import React, { useState } from 'react';
import { Flag, X } from 'lucide-react';

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

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await onSubmit(note || 'Requested clarification during practice');
    setIsSubmitting(false);
    setNote('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#0b0e14] border border-slate-800 rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Flag className="w-4 h-4 text-amber-400" />
            Flag for Next 1:1 Session
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Add a brief note about what felt unclear so your tutor can address it directly in your next live session.
        </p>
        <div>
          <label className="text-xs text-slate-300 block mb-1">Your question or note</label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. I got confused when simplifying 3/8 against 16ths."
            className="w-full bg-[#07090e] border border-slate-800 rounded p-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save to agenda'}
          </button>
        </div>
      </div>
    </div>
  );
};
