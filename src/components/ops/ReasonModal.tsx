import React, { useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';

interface ReasonModalProps {
  title: string;
  subtitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

export const ReasonModal: React.FC<ReasonModalProps> = ({
  title,
  subtitle,
  isOpen,
  onClose,
  onSubmit
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a specific reason for operational denial.');
      return;
    }
    onSubmit(reason.trim());
    setReason('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        <div className="bg-red-700 text-white p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-200" />
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wide">{title}</h3>
              <p className="text-[11px] text-red-100">{subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3 bg-white dark:bg-slate-900">
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-2 rounded border border-red-200 dark:border-red-900/60 font-semibold">
              {error}
            </p>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Denial Reason (Will be logged in permanent audit log) *
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Guard B lacks mandatory site clearance / Exceeds 40hr weekly limit / Minimum staffing rule."
              className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs uppercase hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs uppercase tracking-wider shadow-md cursor-pointer transition-colors"
            >
              Confirm Denial
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
