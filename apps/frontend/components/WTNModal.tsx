'use client';

import React, { useState } from 'react';
import { Calendar, BellRing, X, Loader2 } from 'lucide-react';
import { updateWTN } from '../app/actions/deals';

interface WTNModalProps {
  dealID: number;
  dealRegID: string;
  currentWTN?: string | Date | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function WTNModal({ dealID, dealRegID, currentWTN, isOpen, onClose, onSuccess }: WTNModalProps) {
  const defaultDateStr = currentWTN
    ? new Date(currentWTN).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const [wtnDate, setWtnDate] = useState(defaultDateStr);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await updateWTN({
      dealID,
      whenToNotify: new Date(wtnDate),
    });

    setLoading(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setError(res.error || 'Failed to update When to Notify date.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2 text-sky-600">
            <BellRing className="w-5 h-5" />
            <h3 className="font-bold text-slate-900 text-lg">Update WTN Date</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-xs text-slate-500">
            Adjust when automated email alerts should be triggered for Deal: <span className="font-semibold text-slate-700">{dealRegID}</span>
          </p>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">When To Notify (WTN)</label>
            <div className="relative">
              <input
                type="date"
                value={wtnDate}
                onChange={(e) => setWtnDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <Calendar className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-md transition disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Date</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
