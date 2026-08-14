'use client';

import React, { useState, useEffect, useId } from 'react';
import { Tag, ChevronDown, PenLine } from 'lucide-react';

export const PRESET_BRANDS = [
  'Dell',
  'HPi',
  'HPe',
  'HP Poly',
  'Cisco',
  'Microsoft',
  'Lenovo',
  'Fortinet',
  'VMware',
  'Palo Alto',
] as const;

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
  const isPreset = PRESET_BRANDS.includes(value as any);
  const inputId = useId();

  // Internal state for selection: either preset name, 'Others', or ''
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    if (isPreset) return value;
    if (value && value.trim()) return 'Others';
    return '';
  });

  const [customBrand, setCustomBrand] = useState<string>(() => {
    return isPreset ? '' : value || '';
  });

  // Sync state if external value changes (e.g. form reset or deal loaded)
  useEffect(() => {
    if (PRESET_BRANDS.includes(value as any)) {
      setSelectedCategory(value);
      setCustomBrand('');
    } else if (value && value.trim()) {
      setSelectedCategory('Others');
      setCustomBrand(value);
    } else {
      setSelectedCategory('');
      setCustomBrand('');
    }
  }, [value]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setSelectedCategory(selected);

    if (selected === 'Others') {
      onChange(customBrand.trim());
    } else if (selected) {
      setCustomBrand('');
      onChange(selected);
    } else {
      setCustomBrand('');
      onChange('');
    }
  };

  const handleCustomBrandChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setCustomBrand(text);
    onChange(text);
  };

  const isOthersSelected = selectedCategory === 'Others';

  return (
    <div className="space-y-2 w-full">
      <div className="relative">
        <select
          value={selectedCategory}
          onChange={handleCategoryChange}
          disabled={disabled}
          className={`w-full px-3.5 py-2.5 bg-background border rounded-xl text-sm font-medium text-foreground appearance-none transition focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60 disabled:bg-neutral/40 ${
            error ? 'border-rose-500' : 'border-border'
          }`}
        >
          <option value="">{placeholder}</option>
          <optgroup label="Standard Brands">
            {PRESET_BRANDS.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </optgroup>
          <optgroup label="Custom / Non-Standard">
            <option value="Others">Others (Enter brand name...)</option>
          </optgroup>
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {/* Expandable Custom Brand Field when 'Others' is chosen */}
      {isOthersSelected && (
        <div className="relative animate-in fade-in slide-in-from-top-2 duration-150">
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
              placeholder="Type custom brand name here..."
              className={`w-full pl-9 pr-3.5 py-2 bg-background border rounded-lg text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                error && !customBrand.trim() ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-border'
              }`}
              autoFocus
            />
          </div>
          <p className="text-[11px] text-muted mt-1 ml-1 flex items-center gap-1">
            <Tag className="w-3 h-3 text-primary/70 inline" />
            <span>Specify custom vendor / brand partner</span>
          </p>
        </div>
      )}
    </div>
  );
}
