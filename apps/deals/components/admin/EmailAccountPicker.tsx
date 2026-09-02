'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EmailRecipientItem, searchCdbAccountsForEmail } from '@/app/actions/email-config';
import { AppAvatar } from '@/components/ui/avatar';
import { Search, Plus, X, Mail, Loader2, Check } from 'lucide-react';

interface EmailAccountPickerProps {
  label: string;
  description?: string;
  recipients: EmailRecipientItem[];
  onChange: (recipients: EmailRecipientItem[]) => void;
  badgeVariant?: 'primary' | 'sky' | 'emerald' | 'amber' | 'indigo';
  placeholder?: string;
  disabled?: boolean;
}

export default function EmailAccountPicker({
  label,
  description,
  recipients,
  onChange,
  badgeVariant = 'sky',
  placeholder = 'Search by name, email, BU, or domain account...',
  disabled = false,
}: EmailAccountPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<EmailRecipientItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Race condition counter: guarantees only the latest query updates state
  const queryIdRef = useRef(0);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dedicated execute search function
  const executeSearch = useCallback(async (term: string) => {
    const currentId = ++queryIdRef.current;
    setIsSearching(true);

    try {
      const res = await searchCdbAccountsForEmail(term);
      if (currentId === queryIdRef.current && res.success && Array.isArray(res.data)) {
        setSearchResults(res.data);
      }
    } catch (err) {
      console.error('Directory search error:', err);
      if (currentId === queryIdRef.current) {
        setSearchResults([]);
      }
    } finally {
      if (currentId === queryIdRef.current) {
        setIsSearching(false);
      }
    }
  }, []);

  // Debounced search with 250ms delay matching deals registration
  useEffect(() => {
    if (!isDropdownOpen || disabled) return;

    const trimmed = searchQuery.trim();
    const timer = setTimeout(() => {
      executeSearch(trimmed);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, isDropdownOpen, disabled, executeSearch]);

  const handleAddRecipient = (item: EmailRecipientItem) => {
    if (disabled) return;
    const emailLower = item.email.toLowerCase().trim();
    if (!recipients.some((r) => r.email.toLowerCase() === emailLower)) {
      onChange([...recipients, { ...item, email: emailLower }]);
    }
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  // Support pasting / entering multiple emails (comma, semicolon, newline, or space separated)
  const handleAddMultipleOrCustomEmails = (text: string) => {
    if (disabled) return;
    const rawTokens = text.split(/[\s,;]+/);
    const validEmails: EmailRecipientItem[] = [];

    rawTokens.forEach((token) => {
      const clean = token.trim().toLowerCase();
      if (clean && clean.includes('@') && clean.includes('.')) {
        if (!recipients.some((r) => r.email.toLowerCase() === clean) &&
            !validEmails.some((r) => r.email.toLowerCase() === clean)) {
          validEmails.push({
            name: clean.split('@')[0],
            email: clean,
          });
        }
      }
    });

    if (validEmails.length > 0) {
      onChange([...recipients, ...validEmails]);
      setSearchQuery('');
      setIsDropdownOpen(false);
    }
  };

  const handleRemoveRecipient = (emailToRemove: string) => {
    if (disabled) return;
    const cleanTarget = emailToRemove.toLowerCase();
    onChange(recipients.filter((r) => r.email.toLowerCase() !== cleanTarget));
  };

  const isCustomEmailValid =
    searchQuery.trim().includes('@') &&
    searchQuery.trim().includes('.') &&
    !recipients.some((r) => r.email.toLowerCase() === searchQuery.trim().toLowerCase());

  return (
    <div className={`space-y-3 ${disabled ? 'opacity-70 pointer-events-none' : ''}`} ref={containerRef}>
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
        <div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-foreground">{label}</label>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-neutral border border-border text-muted font-bold">
              {recipients.length} {recipients.length === 1 ? 'recipient' : 'recipients'}
            </span>
          </div>
          {description && <p className="text-[11px] text-muted mt-0.5">{description}</p>}
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {recipients.length > 0 && !disabled && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[11px] text-rose-500 hover:text-rose-600 font-semibold hover:underline cursor-pointer"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Selected Recipient Chips Container */}
      <div className="flex flex-wrap gap-2 p-3 min-h-[58px] bg-background border border-border rounded-xl">
        {recipients.length === 0 ? (
          <div className="flex items-center gap-2 text-muted text-xs py-1">
            <Mail className="w-4 h-4 opacity-50 text-sky-500" />
            <span>No recipients configured. Use the live search below to add recipients from the directory.</span>
          </div>
        ) : (
          recipients.map((item) => {
            const displayName = item.name || item.email.split('@')[0];
            return (
              <div
                key={item.email}
                className="group flex items-center gap-2 pl-2 pr-1.5 py-1 bg-card-bg hover:bg-neutral/80 border border-border rounded-lg text-xs shadow-2xs transition animate-in fade-in zoom-in-95 duration-100"
              >
                <AppAvatar name={displayName} size={22} className="text-[10px] shrink-0" />
                <div className="flex flex-col min-w-0 pr-1">
                  <span className="font-semibold text-foreground text-[11px] leading-tight truncate max-w-[150px] sm:max-w-[220px]" title={displayName}>
                    {displayName}
                  </span>
                  <span className="text-[10px] text-muted font-mono leading-tight truncate max-w-[150px] sm:max-w-[220px]" title={item.email}>
                    {item.email}
                  </span>
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemoveRecipient(item.email)}
                    className="p-1 text-muted hover:text-rose-500 rounded-md hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                    title={`Remove ${displayName}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Search Input & Live Dropdown */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 text-muted pointer-events-none" />
          <input
            type="text"
            disabled={disabled}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!isDropdownOpen) setIsDropdownOpen(true);
            }}
            onPaste={(e) => {
              const pastedText = e.clipboardData.getData('text');
              if (pastedText && pastedText.includes('@')) {
                e.preventDefault();
                handleAddMultipleOrCustomEmails(pastedText);
              }
            }}
            onFocus={() => {
              setIsDropdownOpen(true);
              if (searchResults.length === 0) {
                executeSearch(searchQuery.trim());
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (searchQuery.includes('@')) {
                  handleAddMultipleOrCustomEmails(searchQuery);
                }
              }
            }}
            placeholder={placeholder}
            className="w-full pl-10 pr-28 py-2.5 bg-card-bg border border-border rounded-xl text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition disabled:opacity-50"
          />
          {isCustomEmailValid && !disabled && (
            <button
              type="button"
              onClick={() => handleAddMultipleOrCustomEmails(searchQuery)}
              className="absolute right-1.5 px-3 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/20 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom</span>
            </button>
          )}
        </div>

        {/* Directory Dropdown Results */}
        {isDropdownOpen && !disabled && (
          <div className="absolute z-50 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-card-bg border border-border rounded-xl shadow-xl divide-y divide-border/40 animate-in fade-in slide-in-from-top-1 duration-150">
            {isSearching ? (
              <div className="flex items-center justify-center gap-2.5 p-5 text-xs text-muted">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Searching company directory...</span>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="py-1">
                <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted bg-neutral/40">
                  Directory Results ({searchResults.length})
                </div>
                {searchResults.map((item) => {
                  const isSelected = recipients.some((r) => r.email.toLowerCase() === item.email.toLowerCase());
                  return (
                    <button
                      key={item.email}
                      type="button"
                      onClick={() => !isSelected && handleAddRecipient(item)}
                      disabled={isSelected}
                      className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left text-xs transition cursor-pointer ${
                        isSelected
                          ? 'opacity-40 bg-neutral/40 cursor-not-allowed'
                          : 'hover:bg-neutral/70'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <AppAvatar name={item.name} size={28} className="shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground truncate">{item.name}</span>
                            {item.accountGroup && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral border border-border text-muted font-medium shrink-0">
                                {item.accountGroup}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-muted font-mono truncate">{item.email}</span>
                        </div>
                      </div>

                      {isSelected ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 shrink-0">
                          <Check className="w-3.5 h-3.5" /> Added
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-sky-600 hover:text-sky-700 shrink-0 flex items-center gap-1">
                          <Plus className="w-3.5 h-3.5" /> Select
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-5 text-center text-xs text-muted space-y-1">
                {searchQuery ? (
                  <div>
                    <p className="font-semibold text-foreground">No directory user found for "{searchQuery}".</p>
                    {isCustomEmailValid ? (
                      <p className="mt-1 text-sky-600 font-semibold">Press Enter or click "Add Custom" to add this email directly.</p>
                    ) : (
                      <p className="text-[11px] text-muted">You can type or paste any valid email address (e.g. user@ics.com.ph) to add as custom recipient.</p>
                    )}
                  </div>
                ) : (
                  <p>Type above to search company directory by name, email, or domain account.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
