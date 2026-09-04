'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Calendar,
  Building2,
  Tag,
  Clock,
  Layers,
  FileCheck2,
} from 'lucide-react';
import {
  AppModal,
  AppModalHeader,
  AppModalTitle,
  AppModalDescription,
  AppModalBody,
  AppModalFooter,
  AppButton,
} from './ui';
import { formatDateLong } from './utils/time';

interface RenewalCapModalProps {
  dealID: number;
  dealRegID: string;
  custName?: string;
  brand?: string;
  bu?: string;
  assignedAO?: string;
  currentExpDate?: string | Date | null;
  renewalsCount?: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function RenewalCapModal({
  dealID,
  dealRegID,
  custName,
  brand,
  bu,
  assignedAO,
  currentExpDate,
  renewalsCount = 3,
  isOpen,
  onClose,
}: RenewalCapModalProps) {
  const router = useRouter();

  const handleCreateNewDeal = () => {
    onClose();
    router.push(`/deals/new?copyFrom=${dealID}`);
  };

  return (
    <AppModal open={isOpen} onClose={onClose} width={580}>
      <AppModalHeader>
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <AppModalTitle>Maximum Renewals Cap Reached</AppModalTitle>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-mono font-bold">
                {renewalsCount}/3 Extensions
              </span>
            </div>
            <AppModalDescription>
              Deal #{dealRegID || dealID} has reached the maximum 3-renewal limit.
            </AppModalDescription>
          </div>
        </div>
      </AppModalHeader>

      <AppModalBody className="space-y-4 py-3 text-xs">
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-200 leading-relaxed space-y-1.5">
          <p className="font-semibold text-xs flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            Standard Renewal Actions Are Blocked
          </p>
          <p className="text-[11px] text-muted-foreground opacity-90">
            Deals are capped at a maximum of 3 extensions. To continue pursuing this customer opportunity with the vendor, please create a new deal registration.
          </p>
        </div>

        {/* Existing Deal Snapshot */}
        <div className="p-3.5 rounded-xl bg-neutral/40 border border-border/70 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
            Current Deal Parameters to be Copied
          </span>
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            {custName && (
              <div>
                <span className="text-[10px] text-muted block">Customer</span>
                <span className="font-semibold text-foreground truncate block">{custName}</span>
              </div>
            )}
            {brand && (
              <div>
                <span className="text-[10px] text-muted block">Brand</span>
                <span className="font-semibold text-foreground truncate block">{brand}</span>
              </div>
            )}
            {bu && (
              <div>
                <span className="text-[10px] text-muted block">Business Unit</span>
                <span className="font-semibold text-foreground truncate block">{bu}</span>
              </div>
            )}
            {assignedAO && (
              <div>
                <span className="text-[10px] text-muted block">Assigned AE / AO</span>
                <span className="font-semibold text-foreground truncate block">{assignedAO}</span>
              </div>
            )}
            {currentExpDate && (
              <div className="col-span-2 pt-1 border-t border-border/40 flex items-center justify-between text-[11px]">
                <span className="text-muted flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-rose-500" />
                  Final Expiry Date:
                </span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  {formatDateLong(currentExpDate)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-300 text-xs flex items-start gap-2">
          <FileCheck2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Clicking <strong>Create New Deal</strong> will pre-fill all customer details, business unit, assigned AE, and product line items. You will only need to supply the new <strong>Deal Registration ID</strong>.
          </span>
        </div>
      </AppModalBody>

      <AppModalFooter className="flex items-center justify-between">
        <AppButton variant="secondary" onClick={onClose} size="sm">
          Dismiss
        </AppButton>
        <AppButton
          variant="primary"
          onClick={handleCreateNewDeal}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Create New Linked Deal
        </AppButton>
      </AppModalFooter>
    </AppModal>
  );
}
