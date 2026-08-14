'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react';

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

interface MultiSelectBrandProps {
  value: string[];
  onChange: (brands: string[]) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
}

export default function MultiSelectBrand({
  value = [],
  onChange,
  error,
  placeholder = 'Select brand(s)...',
  disabled = false,
}: MultiSelectBrandProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opening
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Combine presets with any custom brands already selected
  const allKnownBrands = Array.from(new Set([...PRESET_BRANDS, ...value]));

  const filteredBrands = allKnownBrands.filter((brand) =>
    brand.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const canAddCustom =
    searchTerm.trim().length > 0 &&
    !allKnownBrands.some((b) => b.toLowerCase() === searchTerm.trim().toLowerCase());

  const handleToggleBrand = (brand: string) => {
    if (value.includes(brand)) {
      onChange(value.filter((b) => b !== brand));
    } else {
      onChange([...value, brand]);
    }
  };

  const handleRemoveBrand = (brand: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((b) => b !== brand));
  };

  const handleAddCustomBrand = () => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;
    if (!value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setSearchTerm('');
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Box */}
      <div
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`min-h-[42px] w-full px-3 py-1.5 bg-background border rounded-xl flex items-center justify-between gap-2 cursor-pointer transition focus-within:ring-2 focus-within:ring-primary/20 ${
          error ? 'border-rose-500' : 'border-border'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-neutral/50' : 'hover:border-border/80'}`}
      >
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
          {value.length === 0 ? (
            <span className="text-sm text-muted select-none">{placeholder}</span>
          ) : (
            value.map((brand) => (
              <span
                key={brand}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-sky-500/15 text-sky-600 border border-sky-500/30"
              >
                <span>{brand}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveBrand(brand, e)}
                    className="hover:text-rose-500 transition-colors p-0.5 rounded"
                    aria-label={`Remove ${brand}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))
          )}
        </div>

        <div className="flex items-center gap-1 text-muted shrink-0">
          {value.length > 0 && !disabled && (
            <button
              type="button"
              onClick={handleClearAll}
              className="p-1 hover:text-foreground rounded transition text-xs"
              title="Clear all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-background border border-border/80 rounded-xl shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Box */}
          <div className="p-2 border-b border-border/60 bg-neutral/20">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (canAddCustom) {
                      handleAddCustomBrand();
                    } else if (filteredBrands.length > 0) {
                      handleToggleBrand(filteredBrands[0]);
                    }
                  }
                }}
                placeholder="Search or add brand..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
          </div>

          {/* Brands List */}
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
            {filteredBrands.map((brand) => {
              const isSelected = value.includes(brand);
              return (
                <div
                  key={brand}
                  onClick={() => handleToggleBrand(brand)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition select-none ${
                    isSelected
                      ? 'bg-sky-500/10 text-sky-600 font-semibold'
                      : 'text-foreground hover:bg-neutral'
                  }`}
                >
                  <span className="truncate">{brand}</span>
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-sky-600 border-sky-600 text-white'
                        : 'border-border bg-background'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              );
            })}

            {canAddCustom && (
              <div
                onClick={handleAddCustomBrand}
                className="flex items-center gap-2 px-2.5 py-2 mt-1 rounded-lg text-xs text-sky-600 hover:bg-sky-500/10 cursor-pointer border border-dashed border-sky-500/30 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>
                  Add custom brand: <strong className="font-semibold">{searchTerm.trim()}</strong>
                </span>
              </div>
            )}

            {filteredBrands.length === 0 && !canAddCustom && (
              <div className="p-3 text-center text-xs text-muted">No brands found.</div>
            )}
          </div>

          {/* Footer Selection Counter */}
          <div className="px-3 py-2 bg-neutral/30 border-t border-border/60 flex items-center justify-between text-[11px] text-muted">
            <span>
              {value.length} brand{value.length === 1 ? '' : 's'} selected
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-sky-600 font-semibold hover:underline"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
