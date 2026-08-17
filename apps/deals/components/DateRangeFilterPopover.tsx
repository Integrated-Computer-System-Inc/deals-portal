'use client';

import React, { useState, useMemo } from 'react';
import { Calendar, Filter, ChevronDown, Check } from 'lucide-react';
import { AppFilterPopover, FilterGroup } from './ui/popover';
import { AppButton } from './ui/buttons';

export type DateRangePreset =
  | 'ALL'
  | 'TODAY'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'Q1'
  | 'Q2'
  | 'Q3'
  | 'Q4'
  | 'CUSTOM';

export interface DateRangeValue {
  preset: DateRangePreset;
  startDate?: string;
  endDate?: string;
  label: string;
}

export interface DateRangeFilterPopoverProps {
  value: DateRangeValue;
  onChange: (val: DateRangeValue) => void;
  className?: string;
}

export function DateRangeFilterPopover({
  value,
  onChange,
  className,
}: DateRangeFilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [tempPreset, setTempPreset] = useState<DateRangePreset>(value.preset);
  const [tempStart, setTempStart] = useState<string>(value.startDate || '');
  const [tempEnd, setTempEnd] = useState<string>(value.endDate || '');

  const presets: { id: DateRangePreset; label: string; desc?: string }[] = [
    { id: 'ALL', label: 'All Time' },
    { id: 'TODAY', label: 'Today' },
    { id: 'THIS_MONTH', label: 'This Month' },
    { id: 'LAST_MONTH', label: 'Last Month' },
    { id: 'Q1', label: 'Q1 (Jan - Mar)' },
    { id: 'Q2', label: 'Q2 (Apr - Jun)' },
    { id: 'Q3', label: 'Q3 (Jul - Sep)' },
    { id: 'Q4', label: 'Q4 (Oct - Dec)' },
    { id: 'CUSTOM', label: 'Custom Range...' },
  ];

  const handleApply = () => {
    let label = 'All Time';
    const found = presets.find((p) => p.id === tempPreset);
    if (found) label = found.label;

    if (tempPreset === 'CUSTOM' && tempStart && tempEnd) {
      label = `${tempStart} to ${tempEnd}`;
    }

    onChange({
      preset: tempPreset,
      startDate: tempStart,
      endDate: tempEnd,
      label,
    });
    setOpen(false);
  };

  const handleReset = () => {
    setTempPreset('ALL');
    setTempStart('');
    setTempEnd('');
    onChange({
      preset: 'ALL',
      label: 'All Time',
    });
    setOpen(false);
  };

  return (
    <AppFilterPopover
      open={open}
      onOpenChange={setOpen}
      title="Date Range Filter"
      onResetAll={handleReset}
      onApply={handleApply}
      onClose={() => setOpen(false)}
      className="w-[300px]"
      trigger={
        <button
          type="button"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card-bg border border-border/70 text-xs font-semibold text-foreground hover:border-primary/50 transition shadow-xs"
        >
          <Calendar className="w-3.5 h-3.5 text-sky-500 shrink-0" />
          <span className="truncate max-w-[150px]">{value.label}</span>
          <ChevronDown className="w-3 h-3 text-muted shrink-0" />
        </button>
      }
    >
      <FilterGroup title="Select Period">
        <div className="flex flex-col gap-1 py-1">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setTempPreset(p.id)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition ${
                tempPreset === p.id
                  ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 font-bold'
                  : 'hover:bg-neutral/60 text-foreground'
              }`}
            >
              <span>{p.label}</span>
              {tempPreset === p.id && <Check className="w-3.5 h-3.5 shrink-0" />}
            </button>
          ))}
        </div>
      </FilterGroup>

      {tempPreset === 'CUSTOM' && (
        <FilterGroup title="Custom Date Range">
          <div className="space-y-2 py-1.5">
            <div>
              <label className="block text-[10px] text-muted font-semibold mb-1">Start Date</label>
              <input
                type="date"
                value={tempStart}
                onChange={(e) => setTempStart(e.target.value)}
                className="w-full px-2.5 py-1 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted font-semibold mb-1">End Date</label>
              <input
                type="date"
                value={tempEnd}
                onChange={(e) => setTempEnd(e.target.value)}
                className="w-full px-2.5 py-1 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none"
              />
            </div>
          </div>
        </FilterGroup>
      )}
    </AppFilterPopover>
  );
}

/**
 * Helper utility to filter deal records by a DateRangeValue
 */
export function filterDealByDateRange(
  dealDateStr: string | Date | null | undefined,
  range: DateRangeValue
): boolean {
  if (range.preset === 'ALL' || !dealDateStr) return true;

  const date = new Date(dealDateStr);
  if (isNaN(date.getTime())) return true;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  switch (range.preset) {
    case 'TODAY': {
      return (
        date.getDate() === now.getDate() &&
        date.getMonth() === currentMonth &&
        date.getFullYear() === currentYear
      );
    }
    case 'THIS_MONTH': {
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }
    case 'LAST_MONTH': {
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return date.getMonth() === prevMonth && date.getFullYear() === prevYear;
    }
    case 'Q1': {
      return date.getFullYear() === currentYear && [0, 1, 2].includes(date.getMonth());
    }
    case 'Q2': {
      return date.getFullYear() === currentYear && [3, 4, 5].includes(date.getMonth());
    }
    case 'Q3': {
      return date.getFullYear() === currentYear && [6, 7, 8].includes(date.getMonth());
    }
    case 'Q4': {
      return date.getFullYear() === currentYear && [9, 10, 11].includes(date.getMonth());
    }
    case 'CUSTOM': {
      if (range.startDate) {
        const start = new Date(range.startDate);
        if (date < start) return false;
      }
      if (range.endDate) {
        const end = new Date(range.endDate);
        end.setHours(23, 59, 59, 999);
        if (date > end) return false;
      }
      return true;
    }
    default:
      return true;
  }
}
