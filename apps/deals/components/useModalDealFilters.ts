'use client';

import { useState, useMemo } from 'react';
import { DealHeaderRecord } from '@my-app/types';
import { SortConfig } from './DealsSortPopover';
import { DateRangeValue, filterDealByDateRange } from './DateRangeFilterPopover';
import { normalizeBU } from '@/lib/buUtils';

const getDealTotal = (d: DealHeaderRecord): number => {
  if ((d as any)._cachedTotal !== undefined) return (d as any)._cachedTotal;
  const sum = d.items?.reduce((s, i) => s + (Number(i.totalAmt) || 0), 0) || 0;
  (d as any)._cachedTotal = sum;
  return sum;
};

export interface UseModalDealFiltersOptions {
  dateField?: 'dtRegistered' | 'expDt';
  defaultSort?: SortConfig;
}

export function useModalDealFilters(
  initialDeals: DealHeaderRecord[],
  enabled: boolean = true,
  options?: UseModalDealFiltersOptions
) {
  const initialSort = useMemo<SortConfig>(() => {
    if (options?.defaultSort) return options.defaultSort;
    if (options?.dateField === 'expDt') {
      return { field: 'expDt', order: 'asc' };
    }
    return { field: 'dtRegistered', order: 'desc' };
  }, [options?.defaultSort, options?.dateField]);

  const [searchQuery, setSearchQuery] = useState('');
  const [buFilters, setBuFilters] = useState<string[]>([]);
  const [brandFilters, setBrandFilters] = useState<string[]>([]);
  const [expiryFilters, setExpiryFilters] = useState<string[]>([]);
  const [expiryDaysFilter, setExpiryDaysFilter] = useState<string | null>(null);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    preset: 'ALL',
    label: 'All Time',
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>(initialSort);

  const availableBrands = useMemo(() => {
    const map: Record<string, number> = {};
    initialDeals.forEach((d) => {
      const b = (d.brand || '').trim();
      if (b) map[b] = (map[b] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [initialDeals]);

  const filteredAndSortedDeals = useMemo(() => {
    if (!enabled) return initialDeals;
    let result = initialDeals;

    // 1. Search Query (supports comma-separated multi-keywords like "Shiela, Dell, Waiting")
    if (searchQuery.trim()) {
      const terms = searchQuery.split(',').map((t) => t.toLowerCase().trim()).filter(Boolean);
      result = result.filter((d) => {
        const id = String(d.dealID);
        const regId = (d.dealRegID || '').toLowerCase();
        const cust = (d.custName || '').toLowerCase();
        const proj = (d.ProjectName || d.projectName || '').toLowerCase();
        const brand = (d.brand || '').toLowerCase();
        const bu = (d.BU || d.bu || '').toLowerCase();
        const ao = (d.AssignedAO || d.assignedAO || '').toLowerCase();
        const remarks = (d.remarks || '').toLowerCase();
        const compVendor = (d.lostInfo?.competitorVendor || '').toLowerCase();
        const compBrand = (d.lostInfo?.competitorBrand || '').toLowerCase();
        const reason = (d.lostInfo?.reason || '').toLowerCase();
        const statusNum = String(d.dealStatus || '1');

        return terms.every((q) => {
          let statusMatch = false;
          if (q === 'waiting' || q === 'wait' || q === 'pending') {
            statusMatch = statusNum === '4' || statusNum === '3';
          } else if (q === 'registered' || q === 'approved' || q === 'reg') {
            statusMatch = statusNum === '1';
          } else if (q === 'declined' || q === 'dec') {
            statusMatch = statusNum === '2';
          } else if (q === 'expired' || q === 'exp') {
            statusMatch = statusNum === '5';
          } else if (q === 'won') {
            statusMatch = statusNum === '6';
          } else if (q === 'lost') {
            statusMatch = statusNum === '7';
          }

          return (
            id.includes(q) ||
            regId.includes(q) ||
            cust.includes(q) ||
            proj.includes(q) ||
            brand.includes(q) ||
            bu.includes(q) ||
            ao.includes(q) ||
            remarks.includes(q) ||
            compVendor.includes(q) ||
            compBrand.includes(q) ||
            reason.includes(q) ||
            statusMatch
          );
        });
      });
    }

    // 2. Status Filter
    if (statusFilters.length > 0) {
      result = result.filter((d) => statusFilters.includes(String(d.dealStatus)));
    }

    // 3. BU Filter
    if (buFilters.length > 0) {
      result = result.filter((d) => {
        const bu = normalizeBU(d.BU || d.bu || '');
        return buFilters.includes(bu);
      });
    }

    // 4. Brand Filter
    if (brandFilters.length > 0) {
      const lowerBrands = brandFilters.map((b) => b.toLowerCase().trim());
      result = result.filter((d) => {
        const dealBrand = (d.brand || '').toLowerCase().trim();
        return lowerBrands.some((b) => dealBrand.includes(b) || b.includes(dealBrand));
      });
    }

    // 5. Date Range Filter
    if (dateRange.preset !== 'ALL') {
      result = result.filter((d) => {
        const targetDate = options?.dateField === 'expDt'
          ? (d.expDt || d.expiration)
          : (d.dtRegistered || d.dtCreated);
        return filterDealByDateRange(targetDate, dateRange);
      });
    }

    // 6. Expiry Bucket Filter
    if (expiryFilters.length > 0) {
      const nowMs = Date.now();
      result = result.filter((d) => {
        const expDate = d.expDt || d.expiration;
        if (!expDate) return false;
        const days = Math.ceil((new Date(expDate).getTime() - nowMs) / (1000 * 60 * 60 * 24));
        return expiryFilters.some((filterKey) => {
          if (filterKey === 'EXPIRED') return days < 0;
          if (filterKey === 'CRITICAL_3') return days >= 0 && days <= 3;
          if (filterKey === 'URGENT_7') return days > 3 && days <= 7;
          if (filterKey === 'WARNING_15') return days > 7 && days <= 15;
          if (filterKey === 'NOTICE_30') return days > 15 && days <= 30;
          if (filterKey === 'ACTIVE') return days > 30;
          return false;
        });
      });
    }

    // 7. Expiry Days Threshold Filter (30, 15, 7, 3, 2, 1 Day, Expired)
    if (expiryDaysFilter && expiryDaysFilter !== 'ALL') {
      const nowMs = Date.now();
      result = result.filter((d) => {
        const expDate = d.expDt || d.expiration;
        if (!expDate) return false;
        const days = Math.ceil((new Date(expDate).getTime() - nowMs) / (1000 * 60 * 60 * 24));
        if (expiryDaysFilter === 'EXPIRED') return days < 0;
        const numThreshold = Number(expiryDaysFilter);
        if (!isNaN(numThreshold) && numThreshold > 0) {
          return days >= 0 && days <= numThreshold;
        }
        return true;
      });
    }

    // 8. Sorting
    return [...result].sort((a, b) => {
      let comparison = 0;
      switch (sortConfig.field) {
        case 'dtRegistered': {
          const dateA = new Date(a.dtRegistered || a.dtCreated || 0).getTime();
          const dateB = new Date(b.dtRegistered || b.dtCreated || 0).getTime();
          comparison = dateA - dateB;
          break;
        }
        case 'expDt': {
          const dateA = new Date(a.expDt || a.expiration || 0).getTime();
          const dateB = new Date(b.expDt || b.expiration || 0).getTime();
          comparison = dateA - dateB;
          break;
        }
        case 'dealRegID':
          comparison = (a.dealRegID || String(a.dealID)).localeCompare(b.dealRegID || String(b.dealID));
          break;
        case 'custName':
          comparison = (a.custName || '').localeCompare(b.custName || '');
          break;
        case 'projectName':
          comparison = (a.ProjectName || a.projectName || '').localeCompare(b.ProjectName || b.projectName || '');
          break;
        case 'brand':
          comparison = (a.brand || '').localeCompare(b.brand || '');
          break;
        case 'totalAmt': {
          comparison = getDealTotal(a) - getDealTotal(b);
          break;
        }
        default:
          comparison = 0;
      }
      return sortConfig.order === 'asc' ? comparison : -comparison;
    });
  }, [
    enabled,
    initialDeals,
    searchQuery,
    statusFilters,
    buFilters,
    brandFilters,
    dateRange,
    expiryFilters,
    expiryDaysFilter,
    sortConfig,
  ]);

  const resetFilters = () => {
    setSearchQuery('');
    setBuFilters([]);
    setBrandFilters([]);
    setExpiryFilters([]);
    setExpiryDaysFilter(null);
    setStatusFilters([]);
    setDateRange({ preset: 'ALL', label: 'All Time' });
    setSortConfig(initialSort);
  };

  return {
    searchQuery,
    setSearchQuery,
    buFilters,
    setBuFilters,
    brandFilters,
    setBrandFilters,
    availableBrands,
    dateRange,
    setDateRange,
    expiryFilters,
    setExpiryFilters,
    expiryDaysFilter,
    setExpiryDaysFilter,
    statusFilters,
    setStatusFilters,
    sortConfig,
    setSortConfig,
    filteredAndSortedDeals,
    resetFilters,
  };
}
