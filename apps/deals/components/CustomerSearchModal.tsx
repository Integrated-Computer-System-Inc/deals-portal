'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AppModal,
  AppModalHeader,
  AppModalTitle,
  AppModalDescription,
  AppModalBody,
  AppModalFooter,
  AppInput,
  AppChip,
  HighlightText,
} from './ui';
import { Search, Building2, User, Plus, Check, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { CustomerLookupResult, ALL_BUSINESS_UNITS } from '@my-app/types';
import { searchCustomers } from '../app/actions/deals';
import { formatDateLong } from './utils/time';

interface CustomerSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: CustomerLookupResult) => void;
  initialSearchTerm?: string;
}

export default function CustomerSearchModal({
  isOpen,
  onClose,
  onSelectCustomer,
  initialSearchTerm,
}: CustomerSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CustomerLookupResult[]>([]);
  const [isManualEntry, setIsManualEntry] = useState(false);
  
  // Step 2 State
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerLookupResult | null>(null);
  const [attachCustomerID, setAttachCustomerID] = useState(true);

  // Manual Entry Form State
  const [manualName, setManualName] = useState('');
  const [manualBU, setManualBU] = useState('BU5');
  const [manualAO, setManualAO] = useState('');

  // Race condition counter: guarantees only the latest query updates state
  const queryIdRef = useRef(0);

  // Initialize / reset state when modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSelectedCustomer(null);
      setAttachCustomerID(true);
      setIsManualEntry(false);
      setResults([]);
      setLoading(false);
      queryIdRef.current++;
      return;
    }

    if (initialSearchTerm) {
      setSearchTerm(initialSearchTerm);
    }
  }, [isOpen, initialSearchTerm]);

  // Dedicated execute search function
  const executeSearch = async (term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const currentId = ++queryIdRef.current;
    setLoading(true);

    try {
      let resultsList: CustomerLookupResult[] = [];

      // 1. Primary API fetch with multi-token search
      try {
        const apiRes = await fetch(`/api/customers/search?q=${encodeURIComponent(trimmed)}`);
        if (apiRes.ok) {
          const json = await apiRes.json();
          if (json.success && Array.isArray(json.data)) {
            resultsList = json.data;
          }
        }
      } catch (e) {
        console.warn('Direct search endpoint failed, falling back to server action:', e);
      }

      // 2. Fallback to Server Action if endpoint returned empty or failed
      if (resultsList.length === 0) {
        const res = await searchCustomers(trimmed);
        if (res && res.success && Array.isArray(res.data)) {
          resultsList = res.data;
        }
      }

      // Only update state if this is still the active search query
      if (currentId === queryIdRef.current) {
        const activeOnly = resultsList.filter((r) => r.isActive !== false);
        setResults(activeOnly);
      }
    } catch (err) {
      console.error('Error executing customer live search:', err);
      if (currentId === queryIdRef.current) {
        setResults([]);
      }
    } finally {
      if (currentId === queryIdRef.current) {
        setLoading(false);
      }
    }
  };

  // Debounced auto-search when typing
  useEffect(() => {
    if (!isOpen) return;

    const trimmed = searchTerm.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      executeSearch(trimmed);
    }, 280);

    return () => clearTimeout(timer);
  }, [searchTerm, isOpen]);

  const handleSelectCustomerForVerification = (customer: CustomerLookupResult) => {
    setSelectedCustomer(customer);
    setAttachCustomerID(true);
  };

  const handleConfirmSelection = () => {
    if (selectedCustomer) {
      onSelectCustomer({
        ...selectedCustomer,
        customerID: attachCustomerID ? selectedCustomer.customerID : '',
        isManual: false,
      });
      onClose();
    }
  };

  const [hasAttemptedManualSave, setHasAttemptedManualSave] = useState(false);

  const handleSaveManual = () => {
    setHasAttemptedManualSave(true);
    if (!manualName.trim()) return;
    const newCustomer: CustomerLookupResult = {
      customerID: '',
      custName: manualName.trim(),
      bu: manualBU || 'BU5',
      assignedAO: manualAO.trim() || '',
      isActive: true,
      isManual: true,
    };
    onSelectCustomer(newCustomer);
    setIsManualEntry(false);
    setManualName('');
    setHasAttemptedManualSave(false);
    onClose();
  };

  return (
    <AppModal open={isOpen} onClose={onClose} width={700}>
      <AppModalHeader>
        <div className="flex items-center gap-2 text-primary">
          {selectedCustomer ? (
            <button type="button" onClick={() => setSelectedCustomer(null)} className="p-1 hover:bg-neutral rounded-full transition mr-1">
              <ArrowLeft className="w-5 h-5 text-muted" />
            </button>
          ) : isManualEntry ? (
            <button type="button" onClick={() => setIsManualEntry(false)} className="p-1 hover:bg-neutral rounded-full transition mr-1">
              <ArrowLeft className="w-5 h-5 text-muted" />
            </button>
          ) : (
            <Building2 className="w-5 h-5 text-sky-600" />
          )}
          <AppModalTitle>
            {selectedCustomer ? 'Verify Customer Information' : isManualEntry ? 'New Prospect Entry' : 'Customer Search'}
          </AppModalTitle>
        </div>
        <AppModalDescription>
          {selectedCustomer 
            ? 'Please verify the account details before attaching to this deal.' 
            : isManualEntry 
              ? 'Fill out the details below to attach a new client not yet registered in CRM.'
              : 'Search company accounts via ICE CREAM liveSearch API by Company Name.'}
        </AppModalDescription>
      </AppModalHeader>

      <AppModalBody className="space-y-4 py-2">
        {selectedCustomer ? (
          /* Step 2: Customer Detail Verification */
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-neutral/30 rounded-xl border border-border/50">
              <div className="col-span-2 pb-2 border-b border-border/50">
                <p className="text-xs text-muted mb-1">Company / Customer Name</p>
                <p className="font-semibold text-lg text-foreground">{selectedCustomer.custName}</p>
              </div>
              
              <div>
                <p className="text-xs text-muted mb-1">Customer ID Reference</p>
                {attachCustomerID && selectedCustomer.customerID ? (
                  <p className="font-mono text-sm text-foreground bg-background px-2 py-1 rounded inline-block border border-border/50 font-semibold">
                    {selectedCustomer.customerID}
                  </p>
                ) : (
                  <span className="text-xs italic text-muted px-2 py-1 rounded bg-neutral/60 border border-border/40 inline-block">
                    (Will not attach ID - left blank)
                  </span>
                )}
              </div>

              <div>
                <p className="text-xs text-muted mb-1">Account Status</p>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                  Active
                </span>
              </div>

              <div>
                <p className="text-xs text-muted mb-1">Business Unit (BU)</p>
                <span className="text-sm font-semibold px-2 py-1 rounded-md bg-sky-500/10 text-sky-700 border border-sky-500/20 inline-block">
                  {selectedCustomer.bu}
                </span>
              </div>

              <div>
                <p className="text-xs text-muted mb-1">Assigned Account Officer</p>
                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <User className="w-4 h-4 text-sky-500" />
                  {selectedCustomer.assignedAO || 'Unassigned'}
                </div>
              </div>
              
              {selectedCustomer.createdDate && (
                <div>
                  <p className="text-xs text-muted mb-1">Created Date</p>
                  <p className="text-sm text-foreground">
                    {formatDateLong(selectedCustomer.createdDate)}
                  </p>
                </div>
              )}
              
              {selectedCustomer.createdBy && (
                <div>
                  <p className="text-xs text-muted mb-1">Created By</p>
                  <p className="text-sm text-foreground">{selectedCustomer.createdBy}</p>
                </div>
              )}
            </div>

            {/* Clickable Option to Attach / Detach Customer ID */}
            {selectedCustomer.customerID && (
              <div 
                onClick={() => setAttachCustomerID(!attachCustomerID)}
                className="p-3 bg-neutral/40 hover:bg-neutral/60 rounded-xl border border-border/70 flex items-center justify-between cursor-pointer transition select-none"
              >
                <div className="flex flex-col pr-4">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    Attach Customer ID Reference ({selectedCustomer.customerID})
                  </span>
                  <span className="text-[11px] text-muted">
                    {attachCustomerID
                      ? 'Customer ID will be saved and linked to this deal.'
                      : 'Customer ID will be excluded (deal will be registered with company name only).'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAttachCustomerID(!attachCustomerID);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                    attachCustomerID
                      ? 'bg-sky-500 text-white shadow-xs'
                      : 'bg-neutral text-muted hover:text-foreground border border-border'
                  }`}
                >
                  {attachCustomerID ? <Check className="w-3.5 h-3.5" /> : null}
                  <span>{attachCustomerID ? 'Attached' : 'Do Not Attach'}</span>
                </button>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-neutral transition"
              >
                Back to Search
              </button>
              <button
                type="button"
                onClick={handleConfirmSelection}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition flex items-center gap-2 shadow-sm"
              >
                <Check className="w-4 h-4" /> Confirm & Attach to Deal
              </button>
            </div>
          </div>
        ) : !isManualEntry ? (
          /* Step 1: Search View */
          <>
            {/* Search Input Bar */}
            <div className="relative">
              <AppInput
                prefix={<Search className="w-4 h-4 text-muted" />}
                placeholder="Type company name to search active accounts (e.g. APPSDEV, BANK)..."
                value={searchTerm}
                onChange={(e: any) => {
                  const val = e.target.value ?? '';
                  setSearchTerm(val);
                }}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    executeSearch(searchTerm);
                  }
                }}
                allowClear
                autoFocus
                size="lg"
              />
              {loading && (
                <div className="absolute right-3 top-3">
                  <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                </div>
              )}
            </div>

            {/* Results Indicator Summary Bar */}
            {!loading && results.length > 0 && (
              <div className="flex items-center justify-between px-3 py-2 bg-neutral/40 rounded-xl text-xs border border-border/50">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-sky-600" />
                  Found <span className="text-sky-600 font-bold">{results.length}</span> active company match{results.length === 1 ? '' : 'es'}
                </span>
                <div className="flex items-center gap-2 text-[11px] font-medium">
                  <span className="bg-emerald-500/15 text-emerald-600 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                    {results.length} Active Accounts
                  </span>
                </div>
              </div>
            )}

            {/* Results List / Skeleton State */}
            <div className="border border-border/70 rounded-xl overflow-hidden max-h-[360px] overflow-y-auto divide-y divide-border/50 bg-neutral/20">
              {loading ? (
                /* Premium Skeleton Loading Cards */
                <div className="divide-y divide-border/50 animate-pulse">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="p-3.5 flex items-center justify-between gap-4">
                      <div className="flex flex-col gap-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-20 bg-sky-500/20 rounded" />
                          <div
                            className="h-4.5 bg-neutral-300 dark:bg-zinc-700 rounded"
                            style={{ width: `${50 + (i * 12)}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-2.5">
                          <div className="h-3.5 w-20 bg-neutral-200 dark:bg-zinc-800 rounded" />
                          <div className="h-3 w-1 bg-border/60 rounded-full" />
                          <div className="h-3.5 w-32 bg-neutral-200 dark:bg-zinc-800 rounded" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="h-5 w-14 bg-emerald-500/20 rounded-full" />
                        <div className="h-5 w-12 bg-sky-500/20 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : results.length > 0 ? (
                results.slice(0, 60).map((c) => (
                  <div
                    key={`${c.customerID}-${c.bu}-${c.assignedAO}-${c.custName}`}
                    onClick={() => handleSelectCustomerForVerification(c)}
                    className="p-3.5 hover:bg-neutral flex items-center justify-between cursor-pointer transition group"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 border border-sky-500/20">
                          CustomerName
                        </span>
                        <span className="font-semibold text-sm text-foreground group-hover:text-sky-600 transition">
                          <HighlightText text={c.custName} terms={searchTerm} />
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted">
                        <span className="font-mono bg-neutral px-1.5 py-0.5 rounded border border-border/60">
                          <HighlightText text={c.customerID} terms={searchTerm} />
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-sky-500" /> <HighlightText text={c.assignedAO} terms={searchTerm} />
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                        Active
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-sky-500/15 text-sky-600 border border-sky-500/30">
                        {c.bu}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                /* Empty state — only shown after a completed search with no results */
                <div className="py-8 px-4 text-center space-y-3">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                  <div>
                    {searchTerm.trim().length < 2 ? (
                      <>
                        <p className="text-sm font-medium text-foreground">Type company name to search</p>
                        <p className="text-xs text-muted">Enter company name to query live accounts from ICE CREAM API.</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-foreground">No customer records matched &quot;{searchTerm}&quot;</p>
                        <p className="text-xs text-muted">You can create a new prospect record below.</p>
                      </>
                    )}
                  </div>
                  {searchTerm.trim().length >= 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        setManualName(searchTerm);
                        setIsManualEntry(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:opacity-90 transition shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create &quot;{searchTerm}&quot; as New Prospect
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Option */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted">
                Showing {Math.min(results.length, 60)} of {results.length} account{results.length === 1 ? '' : 's'}
              </span>
              <button
                type="button"
                onClick={() => setIsManualEntry(true)}
                className="text-xs text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Or Enter Custom Prospect Account
              </button>
            </div>
          </>
        ) : (
          /* Manual Prospect Entry */
          <div className="space-y-4 py-2">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Company / Customer Name *</label>
                <AppInput
                  required
                  placeholder="e.g. Acme Philippines Corporation"
                  value={manualName}
                  onChange={(e: any) => {
                    setManualName(e.target.value);
                    if (hasAttemptedManualSave) setHasAttemptedManualSave(false);
                  }}
                  error={hasAttemptedManualSave && !manualName.trim() ? 'Company / Customer Name is required' : undefined}
                  size="md"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Business Unit (BU) *</label>
                  <select
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={manualBU}
                    onChange={(e) => setManualBU(e.target.value)}
                  >
                    {ALL_BUSINESS_UNITS.map((bu) => (
                      <option key={bu} value={bu}>
                        {bu}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Assigned AO Name</label>
                  <AppInput
                    placeholder="e.g. Abegail Cebujano"
                    value={manualAO}
                    onChange={(e: any) => setManualAO(e.target.value)}
                    size="md"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsManualEntry(false)}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-neutral"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveManual}
                disabled={!manualName.trim()}
                className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Use Prospect
              </button>
            </div>
          </div>
        )}
      </AppModalBody>
    </AppModal>
  );
}
