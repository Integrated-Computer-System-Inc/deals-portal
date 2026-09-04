'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown, Check, X, AlertTriangle, AlertCircle, Calendar } from 'lucide-react';

export interface ExpiryThresholdOption {
  id: string; // '30', '15', '7', '3', '2', '1', 'EXPIRED', 'ALL'
  label: string;
  description?: string;
  badgeClass?: string;
}

export const EXPIRY_THRESHOLDS: ExpiryThresholdOption[] = [
  { id: '30', label: '30 Days', description: 'Expiring within 30 days', badgeClass: 'text-amber-500 bg-amber-500/10 border-amber-500/30' },
  { id: '15', label: '15 Days', description: 'Expiring within 15 days', badgeClass: 'text-amber-600 bg-amber-600/10 border-amber-600/30' },
  { id: '7', label: '7 Days', description: 'Expiring within 7 days', badgeClass: 'text-orange-500 bg-orange-500/10 border-orange-500/30' },
  { id: '3', label: '3 Days', description: 'Critical alert (≤ 3 days)', badgeClass: 'text-rose-500 bg-rose-500/10 border-rose-500/30' },
  { id: '2', label: '2 Days', description: 'Urgent alert (≤ 2 days)', badgeClass: 'text-rose-600 bg-rose-600/10 border-rose-600/30' },
  { id: '1', label: '1 Day', description: 'Final day warning (≤ 1 day)', badgeClass: 'text-red-600 bg-red-600/15 border-red-600/40' },
  { id: 'EXPIRED', label: 'Expired', description: 'Past validity date', badgeClass: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30' },
];

export interface ExpiryDaysFilterDropdownProps {
  value: string | null;
  onChange: (val: string | null) => void;
  className?: string;
}

export function ExpiryDaysFilterDropdown({
  value,
  onChange,
  className = '',
}: ExpiryDaysFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const activeOption = EXPIRY_THRESHOLDS.find((t) => t.id === value);
  const isActive = Boolean(value && value !== 'ALL');

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`h-9 px-3 text-xs rounded-xl font-medium border transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs ${
          isActive
            ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 font-semibold'
            : 'bg-card-bg border-border/70 text-foreground hover:bg-neutral'
        }`}
        title="Quick-filter by Expiration Threshold"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Clock className={`w-3.5 h-3.5 ${isActive ? 'text-amber-500' : 'text-muted'}`} />
        <span>{isActive && activeOption ? `Expiry: ${activeOption.label}` : 'Expiry Days'}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''} text-muted`} />
      </button>

      {open && (
        <div className="absolute left-0 mt-1.5 w-60 bg-card-bg border border-border/70 rounded-xl shadow-lg z-50 p-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1.5 border-b border-border/50 flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
              Expiry Threshold
            </span>
            {isActive && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="text-[10px] text-muted hover:text-foreground font-semibold flex items-center gap-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>

          <div className="py-1 space-y-0.5">
            {/* All / Clear Option */}
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className={`w-full px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition ${
                !isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-foreground hover:bg-neutral'
              }`}
            >
              <span>All Expirations</span>
              {!isActive && <Check className="w-3.5 h-3.5 text-primary" />}
            </button>

            {/* Threshold Options */}
            {EXPIRY_THRESHOLDS.map((option) => {
              const isSelected = value === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onChange(isSelected ? null : option.id);
                    setOpen(false);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition ${
                    isSelected
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold'
                      : 'text-foreground hover:bg-neutral'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border font-mono ${
                        option.badgeClass || 'bg-neutral text-muted border-border/50'
                      }`}
                    >
                      {option.label}
                    </span>
                    <span className="text-[11px] text-muted truncate max-w-[120px]">
                      {option.description}
                    </span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpiryDaysFilterDropdown;
