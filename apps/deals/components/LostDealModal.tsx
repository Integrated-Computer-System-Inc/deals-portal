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
  const [error, setError] = useState<string | null>(null);

  const lostMutation = useLostDealMutation();

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      const res = await lostMutation.mutateAsync({
        dealID,
        competitorVendor: vVendor,
        competitorBrand: vBrand,
        icsOffer: vIcsOffer,
        competitorOffer: vCompOffer,
        reason: vReason,
        otherInformation: vOtherInfo,
      });

      if (res && res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res?.error || 'Failed to record lost deal information.');
      }
    } catch (err: any) {
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
    <AppModal open={isOpen} onClose={onClose} width={600}>
      <AppModalHeader>
        <div className="flex items-center gap-2 text-rose-600">
          <ShieldAlert className="w-5 h-5" />
          <AppModalTitle>Record Lost Deal Information</AppModalTitle>
        </div>
        <AppModalDescription>
          Document competitor intelligence and pricing details for lost deal: <span className="font-bold text-foreground">{dealRegID}</span>. All fields are required (type &quot;N/A&quot; if data is unknown).
        </AppModalDescription>
      </AppModalHeader>

      <form onSubmit={handleSubmit}>
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
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Save Lost Reason</span>
          </button>
        </AppModalFooter>
      </form>
    </AppModal>
  );
}
