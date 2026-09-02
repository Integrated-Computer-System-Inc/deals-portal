'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { AdminUserRecord, updateUserBrands } from '@/app/actions/users';
import { AppModal, AppModalHeader, AppModalTitle, AppModalBody } from '@/components/ui/modal';
import { AppButton } from '@/components/ui/buttons';
import { AppAvatar } from '@/components/ui/avatar';
import { CANONICAL_PRESET_BRANDS } from '@/lib/brandUtils';
import {
  Tag,
  Search,
  Plus,
  X,
  Check,
  Sparkles,
  AlertCircle,
  GripVertical,
  ShieldCheck,
  Layers,
} from 'lucide-react';

interface BrandAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: AdminUserRecord | null;
}

export default function BrandAssignmentModal({
  isOpen,
  onClose,
  onSuccess,
  user,
}: BrandAssignmentModalProps) {
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [customBrandInput, setCustomBrandInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draggedBrand, setDraggedBrand] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen && user) {
      setSelectedBrands(user.AssignedBrands || []);
      setSearchFilter('');
      setCustomBrandInput('');
      setErrorMessage(null);
    }
  }, [isOpen, user]);

  if (!user) return null;

  const toggleBrand = (brandName: string) => {
    const canonical = brandName.trim().toUpperCase();
    if (!canonical) return;

    if (selectedBrands.includes(canonical)) {
      setSelectedBrands(selectedBrands.filter((b) => b !== canonical));
    } else {
      setSelectedBrands([...selectedBrands, canonical]);
    }
  };

  const handleAddCustomBrand = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customBrandInput.trim().toUpperCase();
    if (!trimmed) return;

    if (!selectedBrands.includes(trimmed)) {
      setSelectedBrands([...selectedBrands, trimmed]);
    }
    setCustomBrandInput('');
  };

  const handleSelectAllPresets = () => {
    if (selectedBrands.length === CANONICAL_PRESET_BRANDS.length) {
      setSelectedBrands([]);
    } else {
      setSelectedBrands([...CANONICAL_PRESET_BRANDS]);
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, brand: string) => {
    e.dataTransfer.setData('text/plain', brand);
    setDraggedBrand(brand);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropToSelected = (e: React.DragEvent) => {
    e.preventDefault();
    const brand = e.dataTransfer.getData('text/plain') || draggedBrand;
    if (brand && !selectedBrands.includes(brand.toUpperCase())) {
      setSelectedBrands([...selectedBrands, brand.toUpperCase()]);
    }
    setDraggedBrand(null);
  };

  const handleSave = () => {
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const res = await updateUserBrands(user.AccountID, selectedBrands);
        if (res.success) {
          onSuccess();
          onClose();
        } else {
          setErrorMessage(res.error || 'Failed to save assigned brands.');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'An unexpected error occurred while saving.');
      }
    });
  };

  const filteredPresetBrands = CANONICAL_PRESET_BRANDS.filter((brand) =>
    brand.toLowerCase().includes(searchFilter.toLowerCase().trim())
  );

  return (
    <AppModal open={isOpen} onClose={onClose} width={680}>
      <AppModalHeader>
        <AppModalTitle>
          <div className="flex items-center gap-2.5 text-foreground">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Tag size={18} />
            </div>
            <div>
              <div className="font-bold text-base">Assign Product Brands</div>
              <div className="text-xs text-muted font-normal">
                Tag and manage specific hardware & software brands for this Product Manager.
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
                  <span className="text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20">
                    PM Role
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
                {selectedBrands.length} {selectedBrands.length === 1 ? 'Brand' : 'Brands'}
              </div>
              <div className="text-[11px] text-muted">Assigned</div>
            </div>
          </div>

          {/* Assigned Brands Dropzone & Tags Container */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-500" />
                <span>Assigned Brands (Active Scope)</span>
              </label>

              {selectedBrands.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedBrands([])}
                  className="text-xs text-rose-500 hover:text-rose-600 font-semibold hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            <div
              onDragOver={handleDragOver}
              onDrop={handleDropToSelected}
              className={`min-h-[90px] p-3 rounded-2xl border-2 border-dashed transition-all flex flex-wrap gap-2 items-start content-start ${
                selectedBrands.length > 0
                  ? 'bg-amber-500/[0.03] border-amber-500/30'
                  : 'bg-neutral/20 border-border/80 justify-center items-center'
              }`}
            >
              {selectedBrands.length === 0 ? (
                <div className="text-center py-4 text-xs text-muted">
                  <div className="font-semibold text-foreground/80">No brands assigned yet</div>
                  <p className="text-[11px] text-muted/80 mt-0.5">
                    Click any brand chip below or drag it into this area to assign.
                  </p>
                </div>
              ) : (
                selectedBrands.map((brand) => (
                  <span
                    key={brand}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-2xs group animate-in zoom-in-95 duration-150"
                  >
                    <span>{brand}</span>
                    <button
                      type="button"
                      onClick={() => toggleBrand(brand)}
                      className="p-0.5 rounded-md hover:bg-amber-500/20 text-amber-700/60 dark:text-amber-300/60 hover:text-amber-900 dark:hover:text-amber-100 transition"
                      title={`Remove ${brand}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Preset Brands Catalog & Search Palette */}
          <div className="space-y-3 pt-1 border-t border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <Layers size={13} className="text-primary" />
                <span>Available Canonical Brands (Click or Drag to Tag)</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllPresets}
                  className="text-xs text-primary font-semibold hover:underline shrink-0"
                >
                  {selectedBrands.length === CANONICAL_PRESET_BRANDS.length ? 'Deselect All' : 'Select All Presets'}
                </button>
              </div>
            </div>

            {/* Search Input for Palette */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder=""
                className="w-full pl-8 pr-4 py-1.5 rounded-xl border border-border bg-white dark:bg-neutral/30 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
              />
            </div>

            {/* Brand Chips Palette */}
            <div className="max-h-44 overflow-y-auto p-1 flex flex-wrap gap-1.5">
              {filteredPresetBrands.map((brand) => {
                const isSelected = selectedBrands.includes(brand);
                return (
                  <button
                    key={brand}
                    type="button"
                    draggable
                    onDragStart={(e) => handleDragStart(e, brand)}
                    onClick={() => toggleBrand(brand)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer select-none active:scale-95 ${
                      isSelected
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-white dark:bg-neutral/30 hover:bg-neutral/60 dark:hover:bg-neutral/60 text-foreground border-border hover:border-amber-400 hover:text-amber-600'
                    }`}
                  >
                    {isSelected ? <Check size={11} strokeWidth={3} /> : <Plus size={11} className="text-muted" />}
                    <span>{brand}</span>
                  </button>
                );
              })}

              {filteredPresetBrands.length === 0 && (
                <div className="p-3 text-center text-xs text-muted w-full">
                  No preset brands matching &quot;{searchFilter}&quot;
                </div>
              )}
            </div>

            {/* Custom Brand Adder */}
            <form onSubmit={handleAddCustomBrand} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={customBrandInput}
                onChange={(e) => setCustomBrandInput(e.target.value)}
                placeholder=""
                className="flex-1 px-3 py-1.5 rounded-xl border border-border bg-white dark:bg-neutral/30 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 transition uppercase"
              />
              <AppButton
                type="submit"
                variant="neutral"
                size="sm"
                disabled={!customBrandInput.trim()}
                leftIcon={<Plus size={13} />}
                className="shrink-0 text-xs"
              >
                Add Brand
              </AppButton>
            </form>
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
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Save Assigned Brands
            </AppButton>
          </div>
        </div>
      </AppModalBody>
    </AppModal>
  );
}
