'use client';

import { useState, useEffect } from 'react';
import { DateRangeValue } from '@/components/DateRangeFilterPopover';
import { SortConfig } from '@/components/DealsSortPopover';

export interface DealsFilterState {
  searchQuery: string;
  statusFilters: string[];
  buFilters: string[];
  expiryFilters: string[];
  dateRange: DateRangeValue;
  sortConfig: SortConfig;
}

const initialFilterState: DealsFilterState = {
  searchQuery: '',
  statusFilters: [],
  buFilters: [],
  expiryFilters: [],
  dateRange: {
    preset: 'ALL',
    label: 'All Time',
  },
  sortConfig: {
    field: 'dtRegistered',
    order: 'desc',
  },
};

// Global in-memory singleton to persist filter and search states across client route changes
let globalFilterState: DealsFilterState = { ...initialFilterState };
const listeners = new Set<(state: DealsFilterState) => void>();

function notify() {
  listeners.forEach((listener) => listener(globalFilterState));
}

export function useDealsFilterStore() {
  const [state, setState] = useState<DealsFilterState>(globalFilterState);

  useEffect(() => {
    const handleChange = (newState: DealsFilterState) => {
      setState(newState);
    };
    listeners.add(handleChange);
    return () => {
      listeners.delete(handleChange);
    };
  }, []);

  const setSearchQuery = (query: string) => {
    globalFilterState = { ...globalFilterState, searchQuery: query };
    notify();
  };

  const setStatusFilters = (filters: string[] | ((prev: string[]) => string[])) => {
    const next = typeof filters === 'function' ? filters(globalFilterState.statusFilters) : filters;
    globalFilterState = { ...globalFilterState, statusFilters: next };
    notify();
  };

  const setBuFilters = (filters: string[] | ((prev: string[]) => string[])) => {
    const next = typeof filters === 'function' ? filters(globalFilterState.buFilters) : filters;
    globalFilterState = { ...globalFilterState, buFilters: next };
    notify();
  };

  const setExpiryFilters = (filters: string[] | ((prev: string[]) => string[])) => {
    const next = typeof filters === 'function' ? filters(globalFilterState.expiryFilters) : filters;
    globalFilterState = { ...globalFilterState, expiryFilters: next };
    notify();
  };

  const setDateRange = (range: DateRangeValue) => {
    globalFilterState = { ...globalFilterState, dateRange: range };
    notify();
  };

  const setSortConfig = (config: SortConfig) => {
    globalFilterState = { ...globalFilterState, sortConfig: config };
    notify();
  };

  const resetFilters = () => {
    globalFilterState = { ...initialFilterState };
    notify();
  };

  return {
    ...state,
    setSearchQuery,
    setStatusFilters,
    setBuFilters,
    setExpiryFilters,
    setDateRange,
    setSortConfig,
    resetFilters,
  };
}
