'use client';

import { useState, useMemo } from 'react';
import { DealHeaderRecord } from '@my-app/types';
import { SortConfig } from './DealsSortPopover';
import { normalizeBU } from '@/lib/buUtils';

const getDealTotal = (d: DealHeaderRecord): number => {
  if ((d as any)._cachedTotal !== undefined) return (d as any)._cachedTotal;
  const sum = d.items?.reduce((s, i) => s + (Number(i.totalAmt) || 0), 0) || 0;
  (d as any)._cachedTotal = sum;
  return sum;
};

export function useModalDealFilters(initialDeals: DealHeaderRecord[], enabled: boolean = true) {
  const [searchQuery, setSearchQuery] = useState('');
  const [buFilters, setBuFilters] = useState<string[]>([]);
  const [expiryFilters, setExpiryFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'dtRegistered',
    order: 'desc',
  });

  const filteredAndSortedDeals = useMemo(() => {
    if (!enabled) return initialDeals;
    let result = initialDeals;

    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
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
          reason.includes(q)
        );
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

    // 4. Expiry Filter
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

    // 5. Sorting
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
  }, [enabled, initialDeals, searchQuery, statusFilters, buFilters, expiryFilters, sortConfig]);

  const resetFilters = () => {
    setSearchQuery('');
    setBuFilters([]);
    setExpiryFilters([]);
    setStatusFilters([]);
    setSortConfig({ field: 'dtRegistered', order: 'desc' });
  };

  return {
    searchQuery,
    setSearchQuery,
    buFilters,
    setBuFilters,
    expiryFilters,
    setExpiryFilters,
    statusFilters,
    setStatusFilters,
    sortConfig,
    setSortConfig,
    filteredAndSortedDeals,
    resetFilters,
  };
}
