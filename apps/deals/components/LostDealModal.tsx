'use client';

import React, { useState } from 'react';
import { ShieldAlert, Loader2, DollarSign } from 'lucide-react';
import { useLostDealMutation } from '@/hooks/useDealsQuery';
import {
  AppModal,
  AppModalHeader,
  AppModalTitle,
  AppModalDescription,
  AppModalBody,
  AppModalFooter,
  AppInput,
  AppButton,
} from './ui';

interface LostDealModalProps {
  dealID: number;
  dealRegID: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LostDealModal({
  dealID,
  dealRegID,
  isOpen,
  onClose,
  onSuccess,
}: LostDealModalProps) {
  const [competitorVendor, setCompetitorVendor] = useState('');
  const [competitorBrand, setCompetitorBrand] = useState('');
  const [icsOffer, setIcsOffer] = useState('');
  const [competitorOffer, setCompetitorOffer] = useState('');
  const [reason, setReason] = useState('');
  const [otherInformation, setOtherInformation] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lostMutation = useLostDealMutation();

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const vVendor = competitorVendor.trim();
    const vBrand = competitorBrand.trim();
    const vIcsOffer = icsOffer.trim();
    const vCompOffer = competitorOffer.trim();
    const vReason = reason.trim();
    const vOtherInfo = otherInformation.trim();

    if (!vVendor || !vBrand || !vIcsOffer || !vCompOffer || !vReason || !vOtherInfo) {
      setError('Please fill in all required fields (you may enter N/A if specific details are unavailable).');
      return;
    }

    setShowConfirm(true);
  };

  const handleExecuteSave = async () => {
    try {
      const res = await lostMutation.mutateAsync({
        dealID,
        competitorVendor: competitorVendor.trim(),
        competitorBrand: competitorBrand.trim(),
        icsOffer: icsOffer.trim(),
        competitorOffer: competitorOffer.trim(),
        reason: reason.trim(),
        otherInformation: otherInformation.trim(),
      });

      if (res && res.success) {
        setShowConfirm(false);
        onSuccess();
        onClose();
      } else {
        setShowConfirm(false);
        setError(res?.error || 'Failed to record lost deal information.');
      }
    } catch (err: any) {
      setShowConfirm(false);
      setError(err?.message || 'Failed to record lost deal information.');
    }
  };

  const loading = lostMutation.isPending;
  const isFormValid =
    competitorVendor.trim() !== '' &&
    competitorBrand.trim() !== '' &&
    icsOffer.trim() !== '' &&
    competitorOffer.trim() !== '' &&
    reason.trim() !== '' &&
    otherInformation.trim() !== '';

  return (
    <>
      <AppModal open={isOpen && !showConfirm} onClose={onClose} width={600}>
        <AppModalHeader>
          <div className="flex items-center gap-2 text-rose-600">
            <ShieldAlert className="w-5 h-5" />
            <AppModalTitle>Record Lost Deal Information</AppModalTitle>
          </div>
          <AppModalDescription>
            Document competitor intelligence and pricing details for lost deal: <span className="font-bold text-foreground">{dealRegID}</span>. All fields are required (type &quot;N/A&quot; if data is unknown).
          </AppModalDescription>
        </AppModalHeader>

        <form onSubmit={handleOpenConfirm}>
          <AppModalBody className="space-y-4 py-3">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl text-xs font-medium">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Competitor Vendor *
                </label>
                <AppInput
                  required
                  value={competitorVendor}
                  onChange={(e: any) => setCompetitorVendor(e.target.value)}
                  placeholder="e.g. Trend Micro, Dell Direct, or N/A"
                  size="md"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Competitor Brand *
                </label>
                <AppInput
                  required
                  value={competitorBrand}
                  onChange={(e: any) => setCompetitorBrand(e.target.value)}
                  placeholder="e.g. Cisco, Lenovo, or N/A"
                  size="md"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  ICS Offered Price *
                </label>
                <AppInput
                  required
                  type="text"
                  prefix={<DollarSign className="w-3.5 h-3.5 text-muted" />}
                  value={icsOffer}
                  onChange={(e: any) => setIcsOffer(e.target.value)}
                  placeholder="e.g. 150,000.00 or N/A"
                  size="md"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Competitor Offered Price *
                </label>
                <AppInput
                  required
                  type="text"
                  prefix={<DollarSign className="w-3.5 h-3.5 text-muted" />}
                  value={competitorOffer}
                  onChange={(e: any) => setCompetitorOffer(e.target.value)}
                  placeholder="e.g. 135,000.00 or N/A"
                  size="md"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Primary Reason Lost *
              </label>
              <AppInput
                required
                value={reason}
                onChange={(e: any) => setReason(e.target.value)}
                placeholder="e.g. Price difference, Lead time issue, Client budget cancelled, or N/A"
                size="md"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Additional Intelligence & Notes *
              </label>
              <textarea
                required
                value={otherInformation}
                onChange={(e: any) => setOtherInformation(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                placeholder="Provide context regarding competitor bundles, partner discounts, client feedback, or type N/A..."
              />
            </div>
          </AppModalBody>

          <AppModalFooter className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <AppButton
              type="button"
              variant="neutral"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </AppButton>
            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-sm transition disabled:opacity-50"
            >
              <span>Continue &rarr;</span>
            </button>
          </AppModalFooter>
        </form>
      </AppModal>

      {/* Confirmation Modal Safeguard */}
      <AppModal open={showConfirm} onClose={() => setShowConfirm(false)} width={460}>
        <AppModalHeader>
          <div className="flex items-center gap-2 text-rose-600">
            <ShieldAlert className="w-5 h-5" />
            <AppModalTitle>Confirm Mark Deal as Lost</AppModalTitle>
          </div>
          <AppModalDescription>
            Are you sure you want to close Deal <strong className="text-foreground">{dealRegID}</strong> as Lost? Status will be updated to Lost (7).
          </AppModalDescription>
        </AppModalHeader>

        <AppModalBody className="space-y-2 py-2 text-xs">
          <div className="p-3 rounded-xl bg-neutral/40 border border-border/70 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted">Competitor:</span>
              <span className="font-bold text-foreground">{competitorBrand} ({competitorVendor})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Offer Delta:</span>
              <span className="font-mono text-foreground">ICS {icsOffer} vs Comp {competitorOffer}</span>
            </div>
            <div className="pt-1 border-t border-border/40">
              <span className="text-muted block text-[10px]">Reason:</span>
              <p className="text-foreground italic">{reason}</p>
            </div>
          </div>
        </AppModalBody>

        <AppModalFooter className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            onClick={() => setShowConfirm(false)}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-foreground hover:bg-neutral rounded-xl transition"
          >
            Back / Edit
          </button>
          <button
            type="button"
            onClick={handleExecuteSave}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition disabled:opacity-50"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{loading ? 'Saving...' : 'Yes, Confirm & Close Deal'}</span>
          </button>
        </AppModalFooter>
      </AppModal>
    </>
  );
}
