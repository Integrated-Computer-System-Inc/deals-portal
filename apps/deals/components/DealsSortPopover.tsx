'use client';

import React, { useState } from 'react';
import {
  ArrowUpDown,
  ArrowDownAZ,
  ArrowUpAZ,
  Calendar,
  Clock,
  Building2,
  DollarSign,
  Tag,
  Hash,
  Check,
} from 'lucide-react';
import { AppFilterPopover, FilterGroup } from './ui/popover';
import { AppButton } from './ui/buttons';

export type SortField =
  | 'dtCreated'
  | 'dtRegistered'
  | 'expDt'
  | 'dealRegID'
  | 'custName'
  | 'projectName'
  | 'brand'
  | 'totalAmt';

export type SortOrder = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  order: SortOrder;
}

export interface DealsSortPopoverProps {
  value: SortConfig;
  onChange: (val: SortConfig) => void;
  className?: string;
}

const SORT_FIELDS: { id: SortField; label: string; icon: React.ReactNode }[] = [
  { id: 'dtCreated', label: 'Date Created (Newest First)', icon: <Clock className="w-3.5 h-3.5" /> },
  { id: 'dtRegistered', label: 'Date Registered', icon: <Calendar className="w-3.5 h-3.5" /> },
  { id: 'expDt', label: 'Expiration Date', icon: <Clock className="w-3.5 h-3.5" /> },
  { id: 'dealRegID', label: 'Deal Reg ID', icon: <Hash className="w-3.5 h-3.5" /> },
  { id: 'custName', label: 'Customer Name', icon: <Building2 className="w-3.5 h-3.5" /> },
  { id: 'projectName', label: 'Project Name', icon: <Tag className="w-3.5 h-3.5" /> },
  { id: 'brand', label: 'Brand', icon: <Tag className="w-3.5 h-3.5" /> },
  { id: 'totalAmt', label: 'Pipeline Amount', icon: <DollarSign className="w-3.5 h-3.5" /> },
];

export function DealsSortPopover({ value, onChange, className }: DealsSortPopoverProps) {
  const [open, setOpen] = useState(false);

  const currentFieldMeta = SORT_FIELDS.find((f) => f.id === value.field) || SORT_FIELDS[0];
  const isDefaultSort = (value.field === 'dtCreated' || value.field === 'dtRegistered') && value.order === 'desc';

  const handleSelectField = (field: SortField) => {
    onChange({ ...value, field });
  };

  const handleSelectOrder = (order: SortOrder) => {
    onChange({ ...value, order });
  };

  const handleReset = () => {
    onChange({ field: 'dtCreated', order: 'desc' });
  };

  return (
    <AppFilterPopover
      open={open}
      onOpenChange={setOpen}
      title="Sort Registry"
      onResetAll={!isDefaultSort ? handleReset : undefined}
      placement="bottomRight"
      className="w-[300px]"
      trigger={
        <button
          type="button"
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border transition shadow-xs cursor-pointer select-none shrink-0 ${
            !isDefaultSort
              ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30'
              : 'bg-card-bg text-foreground hover:bg-neutral/80 border-border/70'
          } ${className || ''}`}
          title="Sort Deals"
        >
          <ArrowUpDown className={`w-4 h-4 ${!isDefaultSort ? 'text-sky-600 dark:text-sky-400' : 'text-muted'}`} />
          <span className="truncate">
            {!isDefaultSort ? `${currentFieldMeta.label} (${value.order.toUpperCase()})` : 'Sort'}
          </span>
        </button>
      }
    >
      {/* Sort Field Group */}
      <FilterGroup title="Sort By Field">
        <div className="flex flex-col gap-0.5 py-1">
          {SORT_FIELDS.map((f) => {
            const isSelected = value.field === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => handleSelectField(f.id)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer text-left ${
                  isSelected
                    ? 'bg-primary/10 text-primary font-bold dark:bg-primary/20'
                    : 'text-foreground hover:bg-neutral/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={isSelected ? 'text-primary' : 'text-muted'}>{f.icon}</span>
                  <span>{f.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      </FilterGroup>

      {/* Sort Direction Group */}
      <FilterGroup title="Sort Direction">
        <div className="grid grid-cols-2 gap-1.5 p-1">
          <button
            type="button"
            onClick={() => handleSelectOrder('desc')}
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-semibold transition border cursor-pointer ${
              value.order === 'desc'
                ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                : 'bg-neutral/60 text-muted hover:text-foreground border-border/50'
            }`}
          >
            <ArrowDownAZ className="w-3.5 h-3.5" />
            <span>Descending</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectOrder('asc')}
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-semibold transition border cursor-pointer ${
              value.order === 'asc'
                ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                : 'bg-neutral/60 text-muted hover:text-foreground border-border/50'
            }`}
          >
            <ArrowUpAZ className="w-3.5 h-3.5" />
            <span>Ascending</span>
          </button>
        </div>
      </FilterGroup>
    </AppFilterPopover>
  );
}
export default DealsSortPopover;
