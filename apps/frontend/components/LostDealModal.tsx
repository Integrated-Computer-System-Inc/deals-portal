'use client';

import React, { useState } from 'react';
import { ShieldAlert, Loader2, DollarSign, HelpCircle } from 'lucide-react';
import { saveLostDeal } from '../app/actions/deals';
import {
  AppModal,
  AppModalHeader,
  AppModalTitle,
  AppModalDescription,
  AppModalBody,
  AppModalFooter,
  AppInput,
  AppTextarea,
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
  const [icsOffer, setIcsOffer] = useState<number | ''>('');
  const [competitorOffer, setCompetitorOffer] = useState<number | ''>('');
  const [reason, setReason] = useState('Price Difference');
  const [otherInformation, setOtherInformation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await saveLostDeal({
      dealID,
      competitorVendor,
      competitorBrand,
      icsOffer: Number(icsOffer) || 0,
      competitorOffer: Number(competitorOffer) || 0,
      reason,
      otherInformation,
    });

    setLoading(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setError(res.error || 'Failed to record lost deal information.');
    }
  };

  return (
    <AppModal open={isOpen} onClose={onClose} width={580}>
      <AppModalHeader>
        <div className="flex items-center gap-2 text-rose-600">
          <ShieldAlert className="w-5 h-5" />
          <AppModalTitle>Record Lost Deal Information</AppModalTitle>
        </div>
        <AppModalDescription>
          Document competitor analytics and pricing details for lost deal: <span className="font-bold text-foreground">{dealRegID}</span>
        </AppModalDescription>
      </AppModalHeader>

      <form onSubmit={handleSubmit}>
        <AppModalBody className="space-y-4 py-3">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Competitor Vendor *
              </label>
              <AppInput
                required
                value={competitorVendor}
                onChange={(e) => setCompetitorVendor(e.target.value)}
                placeholder="e.g. Trend Micro / Dell Direct"
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
                onChange={(e) => setCompetitorBrand(e.target.value)}
                placeholder="e.g. Cisco / Lenovo"
                size="md"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                ICS Offered Price
              </label>
              <AppInput
                type="number"
                prefix={<DollarSign className="w-3.5 h-3.5 text-muted" />}
                value={icsOffer}
                onChange={(e) => setIcsOffer(e.target.value ? Number(e.target.value) : '')}
                placeholder="0.00"
                size="md"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Competitor Offered Price
              </label>
              <AppInput
                type="number"
                prefix={<DollarSign className="w-3.5 h-3.5 text-muted" />}
                value={competitorOffer}
                onChange={(e) => setCompetitorOffer(e.target.value ? Number(e.target.value) : '')}
                placeholder="0.00"
                size="md"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Primary Reason Lost *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <option value="Price Difference">Price Difference / Lower Competitor Bid</option>
              <option value="Lead Time / Stock Availability">Lead Time / Stock Availability</option>
              <option value="Client Preference">Client / Technical Requirement Preference</option>
              <option value="Budget Cancellation">Project / Budget Cancelled by Client</option>
              <option value="Non-Compliance">Specifications Non-Compliance</option>
              <option value="Other">Other Reasons</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Additional Intelligence & Notes
            </label>
            <AppTextarea
              value={otherInformation}
              onChange={(e) => setOtherInformation(e.target.value)}
              rows={3}
              placeholder="Provide context regarding partner discounts, competitor bundles, or follow-up opportunities..."
            />
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
            disabled={loading || !competitorVendor || !competitorBrand}
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
