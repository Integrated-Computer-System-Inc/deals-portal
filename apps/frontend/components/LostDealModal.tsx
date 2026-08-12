'use client';

import React, { useState } from 'react';
import { ShieldAlert, X, Loader2 } from 'lucide-react';
import { saveLostDeal } from '../app/actions/deals';

interface LostDealModalProps {
  dealID: number;
  dealRegID: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LostDealModal({ dealID, dealRegID, isOpen, onClose, onSuccess }: LostDealModalProps) {
  const [competitorVendor, setCompetitorVendor] = useState('');
  const [competitorBrand, setCompetitorBrand] = useState('');
  const [icsOffer, setIcsOffer] = useState<number | ''>('');
  const [competitorOffer, setCompetitorOffer] = useState<number | ''>('');
  const [reason, setReason] = useState('Price Difference');
  const [otherInformation, setOtherInformation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2 text-rose-600">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="font-bold text-slate-900 text-lg">Record Lost Deal Information</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-xs text-slate-500">
            Document competitor details for lost deal: <span className="font-semibold text-slate-700">{dealRegID}</span>
          </p>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Competitor Vendor *</label>
              <input
                type="text"
                required
                value={competitorVendor}
                onChange={(e) => setCompetitorVendor(e.target.value)}
                placeholder="e.g. Acme Systems"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Competitor Brand *</label>
              <input
                type="text"
                required
                value={competitorBrand}
                onChange={(e) => setCompetitorBrand(e.target.value)}
                placeholder="e.g. Brand X"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Our Offer Amount *</label>
              <input
                type="number"
                step="0.01"
                required
                value={icsOffer}
                onChange={(e) => setIcsOffer(e.target.value ? Number(e.target.value) : '')}
                placeholder="10000.00"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Competitor Offer *</label>
              <input
                type="number"
                step="0.01"
                required
                value={competitorOffer}
                onChange={(e) => setCompetitorOffer(e.target.value ? Number(e.target.value) : '')}
                placeholder="8500.00"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Primary Reason *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            >
              <option value="Price Difference">Price Difference</option>
              <option value="Product Features / Specs">Product Features / Specs</option>
              <option value="Delivery Lead Time">Delivery Lead Time</option>
              <option value="Customer Preference">Customer Preference</option>
              <option value="Existing Relationship">Existing Relationship</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Additional Notes</label>
            <textarea
              rows={3}
              value={otherInformation}
              onChange={(e) => setOtherInformation(e.target.value)}
              placeholder="Provide context regarding customer decision or post-mortem notes..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
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
              className="flex items-center space-x-2 px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md transition disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Lost Record</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
