'use client';

import React, { useState, useEffect, useId } from 'react';
import { Tag, ChevronDown, PenLine } from 'lucide-react';
import { CANONICAL_PRESET_BRANDS, normalizeBrandName } from '@/lib/brandUtils';

export { CANONICAL_PRESET_BRANDS };

export interface BrandSelectProps {
  value?: string;
  onChange: (brand: string) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
}

export default function BrandSelect({
  value = '',
  onChange,
  error,
  placeholder = 'Select a brand...',
  disabled = false,
}: BrandSelectProps) {
  const inputId = useId();

  // Helper to resolve preset matching with normalization
  const findMatchingPreset = (val?: string): string | null => {
    if (!val || !val.trim()) return null;
    const normalized = normalizeBrandName(val);
    const match = CANONICAL_PRESET_BRANDS.find(
      (p) => p === normalized || p.toUpperCase() === val.trim().toUpperCase()
    );
    return match || null;
  };

  const matchingPreset = findMatchingPreset(value);
  const isPreset = !!matchingPreset;

  // Internal state for selection: either preset name, 'Others', or ''
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    if (matchingPreset) return matchingPreset;
    if (value && value.trim()) return 'Others';
    return '';
  });

  const [customBrand, setCustomBrand] = useState<string>(() => {
    return matchingPreset ? '' : (value || '').toUpperCase();
  });

  // Sync state if external value changes (e.g. form reset or deal loaded)
  useEffect(() => {
    const match = findMatchingPreset(value);
    if (match) {
      setSelectedCategory(match);
      setCustomBrand('');
    } else if (value && value.trim()) {
      setSelectedCategory('Others');
      setCustomBrand(value.trim().toUpperCase());
    } else {
      setSelectedCategory('');
      setCustomBrand('');
    }
  }, [value]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setSelectedCategory(selected);

    if (selected === 'Others') {
      const sanitizedCustom = customBrand.trim().toUpperCase();
      onChange(sanitizedCustom);
    } else if (selected) {
      setCustomBrand('');
      onChange(selected);
    } else {
      setCustomBrand('');
      onChange('');
    }
  };

  const handleCustomBrandChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const upperText = e.target.value.toUpperCase();
    setCustomBrand(upperText);
    onChange(upperText);
  };

  const isOthersSelected = selectedCategory === 'Others';

  return (
    <div className="space-y-2 w-full">
      <div className="relative">
        <select
          value={selectedCategory}
          onChange={handleCategoryChange}
          disabled={disabled}
          className={`w-full px-3.5 py-2.5 bg-background border rounded-xl text-sm font-medium text-foreground appearance-none transition focus:outline-none focus:ring-2 disabled:opacity-60 disabled:bg-neutral/40 ${
            error ? '!border-rose-500 !ring-2 !ring-rose-500/30 !bg-rose-500/5' : 'border-border focus:ring-primary/20'
          }`}
        >
          <option value="">{placeholder}</option>
          <optgroup label="Brands">
            {CANONICAL_PRESET_BRANDS.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </optgroup>
          <optgroup label="Custom / Non-Standard">
            <option value="Others">Others (Enter custom brand...)</option>
          </optgroup>
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {/* Expandable Custom Brand Field when 'Others' is chosen */}
      {isOthersSelected && (
        <div className="relative animate-in fade-in slide-from-top-2 duration-150">
          <div className="relative flex items-center">
            <div className="absolute left-3 text-muted pointer-events-none">
              <PenLine className="w-3.5 h-3.5" />
            </div>
            <input
              id={inputId}
              type="text"
              value={customBrand}
              onChange={handleCustomBrandChange}
              disabled={disabled}
              placeholder="e.g. ARISTA, ACER, SPLUNK..."
              className={`w-full pl-9 pr-3.5 py-2 bg-background border rounded-lg text-sm font-medium uppercase tracking-wide text-foreground placeholder:text-muted placeholder:normal-case focus:outline-none focus:ring-2 ${
                error && !customBrand.trim() ? '!border-rose-500 !ring-2 !ring-rose-500/30 !bg-rose-500/5' : 'border-border focus:ring-primary/20'
              }`}
              autoFocus
            />
          </div>
          <p className="text-[11px] text-muted mt-1 ml-1 flex items-center gap-1">
            <Tag className="w-3 h-3 text-primary/70 inline" />
            <span>Enter unlisted brand (will be formatted to uppercase)</span>
          </p>
        </div>
      )}
    </div>
  );
}
