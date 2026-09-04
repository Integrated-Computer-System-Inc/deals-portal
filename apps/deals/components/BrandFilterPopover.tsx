'use client';

import React, { useState, useMemo } from 'react';
import { Tag, Search, X } from 'lucide-react';
import { AppFilterPopover, FilterGroup } from './ui/popover';

export interface BrandOption {
  name: string;
  count: number;
}

export interface BrandFilterPopoverProps {
  selectedBrands: string[];
  onChange: (brands: string[]) => void;
  availableBrands?: BrandOption[];
  className?: string;
}

export function BrandFilterPopover({
  selectedBrands = [],
  onChange,
  availableBrands = [],
  className,
}: BrandFilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const activeCount = selectedBrands.length;

  const handleToggleBrand = (brandName: string) => {
    if (selectedBrands.includes(brandName)) {
      onChange(selectedBrands.filter((b) => b !== brandName));
    } else {
      onChange([...selectedBrands, brandName]);
    }
  };

  const filteredBrands = useMemo(() => {
    if (!searchQuery.trim()) return availableBrands;
    const q = searchQuery.toLowerCase().trim();
    return availableBrands.filter((b) => b.name.toLowerCase().includes(q));
  }, [availableBrands, searchQuery]);

  return (
    <AppFilterPopover
      open={open}
      onOpenChange={setOpen}
      title="Filter by Brand"
      onResetAll={activeCount > 0 ? () => { onChange([]); setSearchQuery(''); } : undefined}
      placement="bottomLeft"
      className="w-[320px]"
      trigger={
        <button
          type="button"
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition shadow-xs cursor-pointer select-none shrink-0 ${
            activeCount > 0
              ? 'bg-primary/15 text-primary border-primary/40 font-bold shadow-xs'
              : 'bg-card-bg text-foreground hover:bg-neutral/80 border-border/70'
          } ${className || ''}`}
          title="Filter deals by brand"
        >
          <Tag className={`w-3.5 h-3.5 ${activeCount > 0 ? 'text-primary' : 'text-muted'}`} />
          <span>Brand</span>
          {activeCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-primary text-white">
              {activeCount}
            </span>
          )}
        </button>
      }
    >
      <FilterGroup
        title={`Brand${selectedBrands.length > 0 ? ` • ${selectedBrands.length} selected` : ''}`}
        showReset={selectedBrands.length > 0}
        onReset={() => onChange([])}
      >
        <div className="py-1.5 space-y-2">
          {availableBrands.length > 5 && (
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search brand..."
                className="w-full px-2.5 py-1 text-xs rounded-lg bg-card-bg border border-border/70 text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1 max-h-48 overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => onChange([])}
              className={`px-2 py-1 rounded-md text-xs font-semibold transition border cursor-pointer ${
                selectedBrands.length === 0
                  ? 'bg-primary text-white border-primary shadow-xs'
                  : 'bg-neutral/80 text-muted hover:text-foreground border-border/60 hover:bg-neutral'
              }`}
            >
              All
            </button>
            {filteredBrands.map((brand) => {
              const isSelected = selectedBrands.includes(brand.name);
              return (
                <button
                  key={brand.name}
                  type="button"
                  onClick={() => handleToggleBrand(brand.name)}
                  className={`px-2 py-1 rounded-md text-xs font-semibold transition border cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? 'bg-sky-600 text-white border-sky-600 shadow-xs font-bold'
                      : 'bg-neutral/80 text-muted hover:text-foreground border-border/60 hover:bg-neutral'
                  }`}
                >
                  <span className="truncate max-w-[150px]">{brand.name}</span>
                  {brand.count > 0 && (
                    <span className="text-[10px] opacity-75 font-mono">({brand.count})</span>
                  )}
                </button>
              );
            })}
            {filteredBrands.length === 0 && (
              <span className="text-xs text-muted py-2 px-1">No brands matching &quot;{searchQuery}&quot;</span>
            )}
          </div>
        </div>
      </FilterGroup>
    </AppFilterPopover>
  );
}

export default BrandFilterPopover;
