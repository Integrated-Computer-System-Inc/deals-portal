'use client';

import React, { useState, useEffect } from 'react';
import {
  AppModal,
  AppModalHeader,
  AppModalTitle,
  AppModalDescription,
  AppModalBody,
  AppModalFooter,
  AppInput,
  AppChip,
} from './ui';
import { Search, Building2, User, Plus, Check, Loader2, AlertCircle } from 'lucide-react';
import { MOCK_CUSTOMERS, CustomerLookupResult } from '@my-app/types';

interface CustomerSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: CustomerLookupResult) => void;
}

export default function CustomerSearchModal({
  isOpen,
  onClose,
  onSelectCustomer,
}: CustomerSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CustomerLookupResult[]>(MOCK_CUSTOMERS);
  const [isManualEntry, setIsManualEntry] = useState(false);

  // Manual Entry Form State
  const [manualName, setManualName] = useState('');
  const [manualBU, setManualBU] = useState('BU5');
  const [manualAO, setManualAO] = useState('');

  // LiveSearch API & Local Fallback
  useEffect(() => {
    if (!isOpen) return;

    if (!searchTerm.trim()) {
      setResults(MOCK_CUSTOMERS);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const encodedKey = btoa(searchTerm);
        const res = await fetch(`https://ice-cream.ics.com.ph/api/liveSearch?key=${encodedKey}`, {
          headers: { 'Accept': 'application/json' },
          cache: 'no-store',
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setResults(
              data.map((item: any) => ({
                customerID: item.customerID || item.id || `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
                custName: item.custName || item.customerName || item.name || searchTerm,
                bu: item.bu || 'BU5',
                assignedAO: item.assignedAO || item.ao || 'Assigned Officer',
              }))
            );
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        // Fallback gracefully on CORS/Network errors to mock search
      }

      // Local fuzzy filter fallback
      const filtered = MOCK_CUSTOMERS.filter((c: CustomerLookupResult) =>
        c.custName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.customerID.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.assignedAO.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.bu.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setResults(filtered);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, isOpen]);

  const handleSelect = (customer: CustomerLookupResult) => {
    onSelectCustomer(customer);
    onClose();
  };

  const handleSaveManual = () => {
    if (!manualName.trim()) return;
    const newCustomer: CustomerLookupResult = {
      customerID: `CUST-PROSPECT-${Math.floor(1000 + Math.random() * 9000)}`,
      custName: manualName.trim(),
      bu: manualBU,
      assignedAO: manualAO.trim() || 'Assigned AO',
    };
    onSelectCustomer(newCustomer);
    setIsManualEntry(false);
    setManualName('');
    onClose();
  };

  return (
    <AppModal open={isOpen} onClose={onClose} width={700}>
      <AppModalHeader>
        <div className="flex items-center gap-2 text-primary">
          <Building2 className="w-5 h-5 text-sky-600" />
          <AppModalTitle>Customer Search & Verification</AppModalTitle>
        </div>
        <AppModalDescription>
          Search customer accounts via ICS liveSearch API or create a new prospect entry.
        </AppModalDescription>
      </AppModalHeader>

      <AppModalBody className="space-y-4 py-2">
        {!isManualEntry ? (
          <>
            {/* Search Input Bar */}
            <div className="relative">
              <AppInput
                prefix={<Search className="w-4 h-4 text-muted" />}
                placeholder="Type customer name, Customer ID, or Assigned AO..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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

            {/* Results List */}
            <div className="border border-border/70 rounded-xl overflow-hidden max-h-[360px] overflow-y-auto divide-y divide-border/50 bg-neutral/20">
              {results.length > 0 ? (
                results.map((c) => (
                  <div
                    key={`${c.customerID}-${c.custName}`}
                    onClick={() => handleSelect(c)}
                    className="p-3.5 hover:bg-neutral flex items-center justify-between cursor-pointer transition group"
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm text-foreground group-hover:text-sky-600 transition">
                        {c.custName}
                      </span>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted">
                        <span className="font-mono bg-neutral px-1.5 py-0.5 rounded border border-border/60">
                          {c.customerID}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-sky-500" /> {c.assignedAO}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-sky-500/15 text-sky-600 border border-sky-500/30">
                        {c.bu}
                      </span>
                      <button
                        type="button"
                        className="p-1.5 rounded-lg bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 px-4 text-center space-y-3">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                  <div>
                    <p className="text-sm font-medium text-foreground">No customer records matched &quot;{searchTerm}&quot;</p>
                    <p className="text-xs text-muted">You can create a new prospect record below.</p>
                  </div>
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
                </div>
              )}
            </div>

            {/* Bottom Option */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted">
                Showing {results.length} account{results.length === 1 ? '' : 's'}
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
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-xs text-sky-800">
              <span className="font-semibold">New Prospect Entry:</span> Fill out the details below to attach a new client not yet registered in CRM.
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Company / Customer Name *</label>
                <AppInput
                  placeholder="e.g. Acme Philippines Corporation"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
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
                    <option value="BU1">BU1</option>
                    <option value="BU2">BU2</option>
                    <option value="BU5">BU5</option>
                    <option value="BU8">BU8</option>
                    <option value="BU10">BU10</option>
                    <option value="BU12">BU12</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Assigned AO Name</label>
                  <AppInput
                    placeholder="e.g. Abegail Cebujano"
                    value={manualAO}
                    onChange={(e) => setManualAO(e.target.value)}
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
                Back to Search
              </button>
              <button
                type="button"
                onClick={handleSaveManual}
                disabled={!manualName.trim()}
                className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 transition disabled:opacity-50"
              >
                Use Prospect
              </button>
            </div>
          </div>
        )}
      </AppModalBody>
    </AppModal>
  );
}
