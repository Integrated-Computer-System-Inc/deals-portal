'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { AdminUserRecord, updateUserBUs } from '@/app/actions/users';
import { AppModal, AppModalHeader, AppModalTitle, AppModalBody } from '@/components/ui/modal';
import { AppButton } from '@/components/ui/buttons';
import { AppAvatar } from '@/components/ui/avatar';
import { OFFICIAL_REGISTERED_BUS } from '@/lib/buUtils';
import {
  Building,
  Check,
  X,
  AlertCircle,
  ShieldCheck,
  CheckSquare,
} from 'lucide-react';

interface BuTaggingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: AdminUserRecord | null;
}

export default function BuTaggingModal({
  isOpen,
  onClose,
  onSuccess,
  user,
}: BuTaggingModalProps) {
  const [selectedBUs, setSelectedBUs] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen && user) {
      setSelectedBUs(
        user.AssignedBUs && user.AssignedBUs.length > 0
          ? user.AssignedBUs
          : ['BU1']
      );
      setErrorMessage(null);
    }
  }, [isOpen, user]);

  if (!user) return null;

  const toggleBU = (bu: string) => {
    if (selectedBUs.includes(bu)) {
      if (selectedBUs.length > 1) {
        setSelectedBUs(selectedBUs.filter((b) => b !== bu));
      }
    } else {
      setSelectedBUs([...selectedBUs, bu]);
    }
  };

  const handleSelectAll = () => {
    if (selectedBUs.length === OFFICIAL_REGISTERED_BUS.length) {
      setSelectedBUs(['BU1']);
    } else {
      setSelectedBUs([...OFFICIAL_REGISTERED_BUS]);
    }
  };

  const handleSave = () => {
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const res = await updateUserBUs(user.AccountID, selectedBUs, user.UserRole);
        if (res.success) {
          onSuccess();
          onClose();
        } else {
          setErrorMessage(res.error || 'Failed to save assigned Business Units.');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'An unexpected error occurred while saving.');
      }
    });
  };

  return (
    <AppModal open={isOpen} onClose={onClose} width={560}>
      <AppModalHeader>
        <AppModalTitle>
          <div className="flex items-center gap-2.5 text-foreground">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Building size={18} />
            </div>
            <div>
              <div className="font-bold text-base">Tag Business Units (BUs)</div>
              <div className="text-xs text-muted font-normal">
                Configure which Business Units this user is permitted to supervise or view.
              </div>
            </div>
          </div>
        </AppModalTitle>
      </AppModalHeader>

      <AppModalBody>
        <div className="space-y-5">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-danger/10 border border-danger/30 rounded-xl flex items-start gap-2 text-danger text-xs animate-in fade-in">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-danger/60 hover:text-danger p-0.5"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* User Target Header */}
          <div className="p-3.5 bg-neutral/40 border border-border/80 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <AppAvatar src={user.GAvatar || undefined} name={user.AccountName} size={40} className="shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-foreground truncate">{user.AccountName}</span>
                  <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
                    {user.UserRole === 'bu'
                      ? 'BU Head'
                      : user.UserRole === 'ao'
                      ? 'Account Officer'
                      : user.UserRole === 'pm'
                      ? 'Product Manager'
                      : user.UserRole}
                  </span>
                </div>
                <div className="text-xs text-muted truncate mt-0.5">
                  <span>{user.Email}</span>
                  {user.DomainAccount && <span> • CORP\{user.DomainAccount}</span>}
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-xs font-bold text-foreground">
                {selectedBUs.length} {selectedBUs.length === 1 ? 'Unit' : 'Units'}
              </div>
              <div className="text-[11px] text-muted">Selected</div>
            </div>
          </div>

          {/* Business Unit Multi-select Chips */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">
                Official Business Units <span className="text-danger">*</span>
              </label>

              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
              >
                <CheckSquare size={13} />
                <span>{selectedBUs.length === OFFICIAL_REGISTERED_BUS.length ? 'Clear to BU1' : 'Select All Units'}</span>
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {OFFICIAL_REGISTERED_BUS.map((bu) => {
                const isSelected = selectedBUs.includes(bu);
                return (
                  <button
                    key={bu}
                    type="button"
                    onClick={() => toggleBU(bu)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border-2 transition-all flex items-center justify-between cursor-pointer select-none active:scale-95 ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-sm ring-2 ring-primary/30'
                        : 'bg-white dark:bg-neutral/30 hover:bg-neutral/60 dark:hover:bg-neutral/60 text-foreground border-border hover:border-primary/50 hover:text-primary'
                    }`}
                  >
                    <span>{bu}</span>
                    {isSelected && <Check size={13} strokeWidth={3} />}
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-muted leading-relaxed">
              Users with multiple assigned Business Units will be able to filter and access deal records across all selected units simultaneously.
            </p>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
            <AppButton type="button" variant="neutral" onClick={onClose} disabled={isPending}>
              Cancel
            </AppButton>
            <AppButton
              type="button"
              variant="primary"
              onClick={handleSave}
              loading={isPending}
            >
              Save Business Units
            </AppButton>
          </div>
        </div>
      </AppModalBody>
    </AppModal>
  );
}
