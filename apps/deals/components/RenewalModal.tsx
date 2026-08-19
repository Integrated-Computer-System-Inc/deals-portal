'use client';

import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Calendar,
  Clock,
  Loader2,
  FileText,
  Building2,
  CheckCircle2,
  AlertCircle,
  Mail,
  Tag,
} from 'lucide-react';
import { useRenewDealMutation } from '@/hooks/useDealsQuery';
import {
  AppModal,
  AppModalHeader,
  AppModalTitle,
  AppModalDescription,
  AppModalBody,
  AppModalFooter,
  AppTextarea,
  AppChip,
} from './ui';
import { formatDateLong, addDaysToDateString } from './utils/time';

interface RenewalModalProps {
  dealID: number;
  dealRegID: string;
  custName?: string;
  brand?: string;
  currentExpDate?: string | Date | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function RenewalModal({
  dealID,
  dealRegID,
  custName,
  brand,
  currentExpDate,
  isOpen,
  onClose,
  onSuccess,
}: RenewalModalProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [dtRenewal, setDtRenewal] = useState(todayStr);
  const [validityDays, setValidityDays] = useState(90);
  const [rexpDt, setRexpDt] = useState('');
  const [remarks, setRemarks] = useState('');
  const [toEmail, setToEmail] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const renewMutation = useRenewDealMutation();

  // Recalculate rexpDt whenever dtRenewal or validityDays changes
  useEffect(() => {
    if (dtRenewal && validityDays && validityDays > 0) {
      const calculatedExp = addDaysToDateString(dtRenewal, validityDays);
      setRexpDt(calculatedExp);
    } else {
      setRexpDt('');
    }
  }, [dtRenewal, validityDays]);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      const initDate = todayStr;
      setDtRenewal(initDate);
      setValidityDays(90);
      setRexpDt(addDaysToDateString(initDate, 90));
      setRemarks('');
      setToEmail(true);
      setError(null);
    }
  }, [isOpen, todayStr]);

  const handleValidityPreset = (days: number) => {
    setValidityDays(days);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!dtRenewal) {
      setError('Please select a renewal date.');
      return;
    }
    if (!validityDays || validityDays <= 0) {
      setError('Validity period must be at least 1 day.');
      return;
    }
    if (!rexpDt) {
      setError('Calculated expiration date is missing.');
      return;
    }

    try {
      const res = await renewMutation.mutateAsync({
        dealID,
        dtRenewal,
        validityDays,
        rexpDt,
        remarks: remarks.trim() || undefined,
        toEmail,
      });

      if (res && res.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setError(res?.error || 'Failed to process deal renewal.');
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred while renewing the deal.');
    }
  };

  const loading = renewMutation.isPending;

  return (
    <AppModal open={isOpen} onClose={onClose} width={540}>
      <AppModalHeader>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <AppModalTitle>Renew Deal Registration</AppModalTitle>
              <span className="px-2 py-0.5 rounded-md bg-neutral text-xs font-mono font-bold text-foreground border border-border">
                {dealRegID || `DR-${dealID}`}
              </span>
            </div>
            <AppModalDescription>
              Extend deal validity period, log renewal history, and update notification schedule.
            </AppModalDescription>
          </div>
        </div>
      </AppModalHeader>

      <form onSubmit={handleSubmit}>
        <AppModalBody className="space-y-4 py-3">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Deal Metadata Snapshot */}
          <div className="p-3 rounded-xl bg-neutral/40 border border-border/70 grid grid-cols-2 gap-2 text-xs">
            {custName && (
              <div>
                <span className="text-[10px] font-bold uppercase text-muted block">Customer</span>
                <span className="font-semibold text-foreground truncate block">{custName}</span>
              </div>
            )}
            {brand && (
              <div>
                <span className="text-[10px] font-bold uppercase text-muted block">Brand</span>
                <span className="font-semibold text-foreground">{brand}</span>
              </div>
            )}
            {currentExpDate && (
              <div className="col-span-2 pt-1 border-t border-border/40 flex items-center justify-between text-[11px]">
                <span className="text-muted">Current Expiration:</span>
                <span className="font-mono font-semibold text-foreground">
                  {formatDateLong(currentExpDate)}
                </span>
              </div>
            )}
          </div>

          {/* Renewal Date Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground">
              Renewal Date (dtRenewal) *
            </label>
            <input
              type="date"
              value={dtRenewal}
              onChange={(e) => setDtRenewal(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            {dtRenewal && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                Effective Renewal: {formatDateLong(dtRenewal)}
              </p>
            )}
          </div>

          {/* Validity Period & Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-foreground">
                Extension Validity (Days) *
              </label>
              <span className="text-[11px] font-mono text-muted">e.g. 90 days</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={730}
                value={validityDays || ''}
                onChange={(e) => setValidityDays(parseInt(e.target.value, 10) || 0)}
                required
                placeholder="90"
                className="w-28 px-3.5 py-2 bg-background border border-border rounded-xl text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                {[30, 60, 90, 180, 365].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleValidityPreset(preset)}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition ${
                      validityDays === preset
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                        : 'bg-neutral hover:bg-neutral/80 text-muted hover:text-foreground border-border'
                    }`}
                  >
                    +{preset}d
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Calculated New Expiration Date Display */}
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> New Expiration Date (rexpDt)
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-600 px-1.5 py-0.5 rounded bg-emerald-500/15">
                +{validityDays || 0} days
              </span>
            </div>
            <p className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-200">
              {rexpDt ? formatDateLong(rexpDt) : 'Select renewal date & validity'}
            </p>
            <p className="text-[10px] text-emerald-600/80 dark:text-emerald-300/80">
              WTN alert will automatically be rescheduled to 2 days prior ({rexpDt ? formatDateLong(addDaysToDateString(rexpDt, -2)) : 'N/A'}).
            </p>
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground">
              Renewal Remarks / Partner Notes
            </label>
            <AppTextarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Principal approved 90-day extension due to delayed bidding schedule..."
              rows={3}
              className="text-xs"
            />
          </div>

          {/* Email Notification Checkbox */}
          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground">
              <input
                type="checkbox"
                checked={toEmail}
                onChange={(e) => setToEmail(e.target.checked)}
                className="rounded border-border text-emerald-600 focus:ring-emerald-500/20 h-4 w-4 cursor-pointer"
              />
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-muted" />
                <span>Send renewal notification email to assigned AO & BU stakeholders</span>
              </span>
            </label>
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
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span>{loading ? 'Processing Renewal...' : 'Confirm Deal Renewal'}</span>
          </button>
        </AppModalFooter>
      </form>
    </AppModal>
  );
}
