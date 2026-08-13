'use client';

import React, { useState } from 'react';
import { Calendar, BellRing, Loader2, Clock } from 'lucide-react';
import { updateWTN } from '../app/actions/deals';
import {
  AppModal,
  AppModalHeader,
  AppModalTitle,
  AppModalDescription,
  AppModalBody,
  AppModalFooter,
  AppInput,
} from './ui';

interface WTNModalProps {
  dealID: number;
  dealRegID: string;
  currentWTN?: string | Date | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function WTNModal({
  dealID,
  dealRegID,
  currentWTN,
  isOpen,
  onClose,
  onSuccess,
}: WTNModalProps) {
  const defaultDateStr = currentWTN
    ? new Date(currentWTN).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const [wtnDate, setWtnDate] = useState(defaultDateStr);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await updateWTN({
      dealID,
      wtn_dealID: dealID,
      whenToNotify: new Date(wtnDate),
      dtwtn: new Date(wtnDate),
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
    <AppModal open={isOpen} onClose={onClose} width={480}>
      <AppModalHeader>
        <div className="flex items-center gap-2 text-primary">
          <BellRing className="w-5 h-5 text-amber-500" />
          <AppModalTitle>Update When To Notify (WTN)</AppModalTitle>
        </div>
        <AppModalDescription>
          Adjust the scheduled email alert threshold for Deal: <span className="font-bold text-foreground">{dealRegID}</span>
        </AppModalDescription>
      </AppModalHeader>

      <form onSubmit={handleSubmit}>
        <AppModalBody className="space-y-4 py-3">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-foreground">
              Notification Trigger Date *
            </label>
            <input
              type="date"
              value={wtnDate}
              onChange={(e) => setWtnDate(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-[11px] text-muted flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-muted" />
              Automated SMTP dispatcher checks this date to notify Assigned AO & BU Head.
            </p>
          </div>
        </AppModalBody>

        <AppModalFooter className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-foreground hover:bg-neutral rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-primary hover:opacity-90 rounded-xl shadow-sm transition disabled:opacity-50"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Save Notification Date</span>
          </button>
        </AppModalFooter>
      </form>
    </AppModal>
  );
}
