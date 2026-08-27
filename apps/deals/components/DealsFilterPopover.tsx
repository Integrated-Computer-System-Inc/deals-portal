'use client';

import React, { useState, useMemo } from 'react';
import {
  Filter,
  Building2,
  Clock,
  CheckCircle2,
  Check,
  X,
  Layers,
  User,
  Search,
} from 'lucide-react';
import { AppFilterPopover, FilterGroup } from './ui/popover';
import { DEAL_STATUS_MAP } from '@my-app/types';

export interface DealsFilterPopoverProps {
  buFilters: string[];
  onBuFiltersChange: (bus: string[]) => void;
  aoFilters?: string[];
  onAoFiltersChange?: (aos: string[]) => void;
  availableAOs?: { name: string; count: number }[];
  hideAOFilter?: boolean;
  expiryFilters: string[];
  onExpiryFiltersChange: (exps: string[]) => void;
  statusFilters: string[];
  onStatusFiltersChange: (statuses: string[]) => void;
  officialBUs: readonly string[] | string[];
  otherBUsMap?: Record<string, { count: number; totalValue: number }>;
  dealsCountByBU?: Record<string, number>;
  dealsCountByStatus?: Record<string, number>;
  totalDealsCount?: number;
  hideBUFilter?: boolean;
  className?: string;
}

const EXPIRY_OPTIONS = [
  { id: 'CRITICAL_3', label: 'Critical (≤3d)', color: 'text-rose-500 bg-rose-500/10 border-rose-500/30' },
  { id: 'URGENT_7', label: 'Urgent (≤7d)', color: 'text-orange-500 bg-orange-500/10 border-orange-500/30' },
  { id: 'WARNING_15', label: 'Warning (≤15d)', color: 'text-amber-500 bg-amber-500/10 border-amber-500/30' },
  { id: 'NOTICE_30', label: 'Notice (≤30d)', color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30' },
  { id: 'ACTIVE', label: 'Active (>30d)', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' },
  { id: 'EXPIRED', label: 'Expired', color: 'text-rose-600 bg-rose-600/10 border-rose-600/30' },
];

export function DealsFilterPopover({
  buFilters,
  onBuFiltersChange,
  aoFilters = [],
  onAoFiltersChange,
  availableAOs = [],
  hideAOFilter = false,
  expiryFilters,
  onExpiryFiltersChange,
  statusFilters,
  onStatusFiltersChange,
  officialBUs,
  otherBUsMap = {},
  dealsCountByBU = {},
  dealsCountByStatus = {},
  totalDealsCount = 0,
  hideBUFilter = false,
  className,
}: DealsFilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [isOthersExpanded, setIsOthersExpanded] = useState(false);
  const [aoSearchQuery, setAoSearchQuery] = useState('');

  // Compute total active filters count
  const activeCount =
    (hideBUFilter ? 0 : buFilters.length) +
    (!hideAOFilter && onAoFiltersChange ? aoFilters.length : 0) +
    statusFilters.length +
    expiryFilters.length;

  const handleToggleBU = (bu: string) => {
    if (buFilters.includes(bu)) {
      onBuFiltersChange(buFilters.filter((b) => b !== bu));
    } else {
      onBuFiltersChange([...buFilters, bu]);
    }
  };

  const handleToggleAO = (aoName: string) => {
    if (!onAoFiltersChange) return;
    if (aoFilters.includes(aoName)) {
      onAoFiltersChange(aoFilters.filter((a) => a !== aoName));
    } else {
      onAoFiltersChange([...aoFilters, aoName]);
    }
  };

  const handleToggleExpiry = (exp: string) => {
    if (expiryFilters.includes(exp)) {
      onExpiryFiltersChange(expiryFilters.filter((e) => e !== exp));
    } else {
      onExpiryFiltersChange([...expiryFilters, exp]);
    }
  };

  const handleToggleStatus = (st: string) => {
    if (statusFilters.includes(st)) {
      onStatusFiltersChange(statusFilters.filter((s) => s !== st));
    } else {
      onStatusFiltersChange([...statusFilters, st]);
    }
  };

  const handleResetAll = () => {
    onBuFiltersChange([]);
    if (onAoFiltersChange) onAoFiltersChange([]);
    onExpiryFiltersChange([]);
    onStatusFiltersChange([]);
    setIsOthersExpanded(false);
    setAoSearchQuery('');
  };

  const otherBUsList = useMemo(() => {
    return Object.entries(otherBUsMap)
      .map(([bu, data]) => ({ bu, count: data.count, totalValue: data.totalValue }))
      .sort((a, b) => b.count - a.count);
  }, [otherBUsMap]);

  // Non-official BUs that are currently selected while panel is collapsed
  const selectedOtherBUsWhenCollapsed = useMemo(() => {
    if (isOthersExpanded) return [];
    return buFilters.filter((bu) => !officialBUs.includes(bu));
  }, [buFilters, officialBUs, isOthersExpanded]);

  const filteredAOsList = useMemo(() => {
    if (!availableAOs || availableAOs.length === 0) return [];
    if (!aoSearchQuery.trim()) return availableAOs;
    const q = aoSearchQuery.toLowerCase().trim();
    return availableAOs.filter((ao) => ao.name.toLowerCase().includes(q));
  }, [availableAOs, aoSearchQuery]);

  return (
    <AppFilterPopover
      open={open}
      onOpenChange={setOpen}
      title="Filter Deals (Multi-Select)"
      onResetAll={activeCount > 0 ? handleResetAll : undefined}
      placement="bottomRight"
      className="w-[380px]"
      trigger={
        <button
          type="button"
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border transition shadow-xs cursor-pointer select-none shrink-0 ${
            activeCount > 0
              ? 'bg-primary/15 text-primary border-primary/40 font-bold shadow-xs'
              : 'bg-card-bg text-foreground hover:bg-neutral/80 border-border/70'
          } ${className || ''}`}
          title="Filter Deals (Select multiple BUs, AOs, statuses, or expiry urgencies)"
        >
          <Filter className={`w-4 h-4 ${activeCount > 0 ? 'text-primary' : 'text-muted'}`} />
          <span>Filters</span>
          {activeCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-primary text-white">
              {activeCount}
            </span>
          )}
        </button>
      }
    >
      {/* 1. Business Unit Filter Group (Multi-Select) */}
      {!hideBUFilter && (
        <FilterGroup
          title={`Business Unit (BU)${buFilters.length > 0 ? ` • ${buFilters.length} selected` : ''}`}
          showReset={buFilters.length > 0}
          onReset={() => onBuFiltersChange([])}
        >
          <div className="flex flex-wrap items-center gap-1 py-1.5">
            <button
              type="button"
              onClick={() => onBuFiltersChange([])}
              className={`px-2 py-1 rounded-md text-xs font-semibold transition border cursor-pointer ${
                buFilters.length === 0
                  ? 'bg-primary text-white border-primary shadow-xs'
                  : 'bg-neutral/80 text-muted hover:text-foreground border-border/60'
              }`}
            >
              All
            </button>
            {officialBUs.map((bu) => {
              const count = dealsCountByBU[bu] || 0;
              const isSelected = buFilters.includes(bu);
              return (
                <button
                  key={bu}
                  type="button"
                  onClick={() => handleToggleBU(bu)}
                  className={`px-2 py-1 rounded-md text-xs font-semibold transition border cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? 'bg-sky-600 text-white border-sky-600 shadow-xs font-bold'
                      : 'bg-neutral/80 text-muted hover:text-foreground border-border/60'
                  }`}
                >
                  <span>{bu}</span>
                  {count > 0 && <span className="text-[10px] opacity-75">({count})</span>}
                </button>
              );
            })}

            {/* Active Non-Official BU Pills when others panel is collapsed */}
            {selectedOtherBUsWhenCollapsed.map((bu) => (
              <div
                key={bu}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold bg-indigo-600 text-white border border-indigo-600 shadow-xs"
              >
                <span>{bu}</span>
                <button
                  type="button"
                  onClick={() => handleToggleBU(bu)}
                  className="hover:opacity-80 p-0.5 rounded-full hover:bg-white/20 transition cursor-pointer"
                  title={`Remove ${bu}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Render all other BUs with the exact same box styling when expanded */}
            {isOthersExpanded &&
              otherBUsList.map((item) => {
                const count = item.count;
                const isSelected = buFilters.includes(item.bu);
                return (
                  <button
                    key={item.bu}
                    type="button"
                    onClick={() => handleToggleBU(item.bu)}
                    className={`px-2 py-1 rounded-md text-xs font-semibold transition border cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs font-bold'
                        : 'bg-neutral/80 text-muted hover:text-foreground border-border/60'
                    }`}
                  >
                    <span>{item.bu}</span>
                    {count > 0 && <span className="text-[10px] opacity-75">({count})</span>}
                  </button>
                );
              })}

            {/* Expand/Collapse Others Button */}
            {otherBUsList.length > 0 && (
              <button
                type="button"
                onClick={() => setIsOthersExpanded(!isOthersExpanded)}
                className={`px-2 py-1 rounded-md text-xs font-semibold transition border cursor-pointer flex items-center gap-1 ${
                  isOthersExpanded
                    ? 'bg-neutral/90 text-foreground border-border/80 hover:bg-neutral'
                    : 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/25'
                }`}
                title={isOthersExpanded ? 'Collapse other business units' : 'Show all other business units'}
              >
                <Building2 className="w-3 h-3" />
                <span>{isOthersExpanded ? 'Less BUs ▲' : `+${otherBUsList.length} Others... ▾`}</span>
              </button>
            )}
          </div>
        </FilterGroup>
      )}

      {/* 2. Expiry Urgency Filter Group (Multi-Select) */}
      <FilterGroup
        title={`Expiration Urgency${expiryFilters.length > 0 ? ` • ${expiryFilters.length} selected` : ''}`}
        showReset={expiryFilters.length > 0}
        onReset={() => onExpiryFiltersChange([])}
      >
        <div className="flex flex-wrap items-center gap-1 py-1.5">
          <button
            type="button"
            onClick={() => onExpiryFiltersChange([])}
            className={`px-2 py-1 rounded-md text-xs font-semibold transition border cursor-pointer ${
              expiryFilters.length === 0
                ? 'bg-primary text-white border-primary shadow-xs'
                : 'bg-neutral/80 text-muted hover:text-foreground border-border/60'
            }`}
          >
            All
          </button>
          {EXPIRY_OPTIONS.map((item) => {
            const isSelected = expiryFilters.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleToggleExpiry(item.id)}
                className={`px-2 py-1 rounded-md text-xs font-semibold transition border cursor-pointer ${
                  isSelected
                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs font-bold'
                    : item.color || 'bg-neutral/80 text-muted hover:text-foreground border-border/60'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </FilterGroup>

      {/* 3. AO Name Filter Group (Multi-Select) */}
      {!hideAOFilter && onAoFiltersChange && availableAOs.length > 0 && (
        <FilterGroup
          title={`AO Name${aoFilters.length > 0 ? ` • ${aoFilters.length} selected` : ''}`}
          showReset={aoFilters.length > 0}
          onReset={() => onAoFiltersChange([])}
        >
          <div className="py-1.5 space-y-2">
            {availableAOs.length > 6 && (
              <div className="relative">
                <input
                  type="text"
                  value={aoSearchQuery}
                  onChange={(e) => setAoSearchQuery(e.target.value)}
                  placeholder="Search AO name..."
                  className="w-full px-2.5 py-1 text-xs rounded-lg bg-card-bg border border-border/70 text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {aoSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setAoSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-1 max-h-36 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => onAoFiltersChange([])}
                className={`px-2 py-1 rounded-md text-xs font-semibold transition border cursor-pointer ${
                  aoFilters.length === 0
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-neutral/80 text-muted hover:text-foreground border-border/60'
                }`}
              >
                All
              </button>
              {filteredAOsList.map((ao) => {
                const isSelected = aoFilters.includes(ao.name);
                return (
                  <button
                    key={ao.name}
                    type="button"
                    onClick={() => handleToggleAO(ao.name)}
                    className={`px-2 py-1 rounded-md text-xs font-semibold transition border cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs font-bold'
                        : 'bg-neutral/80 text-muted hover:text-foreground border-border/60 hover:bg-neutral'
                    }`}
                  >
                    <span className="truncate max-w-[150px]">{ao.name}</span>
                    {ao.count > 0 && <span className="text-[10px] opacity-75 font-mono">({ao.count})</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </FilterGroup>
      )}

      {/* 4. Deal Status Filter Group (Multi-Select) */}
      <FilterGroup
        title={`Deal Status${statusFilters.length > 0 ? ` • ${statusFilters.length} selected` : ''}`}
        showReset={statusFilters.length > 0}
        onReset={() => onStatusFiltersChange([])}
      >
        <div className="flex flex-wrap items-center gap-1.5 py-1.5">
          <button
            type="button"
            onClick={() => onStatusFiltersChange([])}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition border cursor-pointer ${
              statusFilters.length === 0
                ? 'bg-primary text-white border-primary shadow-xs'
                : 'bg-neutral/80 text-muted hover:text-foreground border-border/60'
            }`}
          >
            All {totalDealsCount > 0 ? `(${totalDealsCount})` : ''}
          </button>
          {Object.entries(DEAL_STATUS_MAP).map(([id, meta]: [string, any]) => {
            const count = dealsCountByStatus[id] || 0;
            const isSelected = statusFilters.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleToggleStatus(id)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition border cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-primary text-white border-primary shadow-xs font-bold'
                    : 'bg-neutral/80 text-muted hover:text-foreground border-border/60 hover:bg-neutral'
                }`}
              >
                <span>{meta.label}</span>
                {count > 0 && <span className="text-[10px] opacity-75">({count})</span>}
              </button>
            );
          })}
        </div>
      </FilterGroup>
    </AppFilterPopover>
  );
}
export default DealsFilterPopover;
