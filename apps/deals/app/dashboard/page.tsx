'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import {
  DealHeaderRecord,
  UserRole,
  DEAL_STATUS_MAP,
  ACTIVE_BUSINESS_UNITS,
  MOCK_DEALS,
} from '@my-app/types';
import {
  AppCard,
  AppChip,
  AppModal,
  AppButton,
  AppInput,
} from '../../components/ui';
import {
  CheckCircle2,
  Clock,
  Layers,
  Building2,
  Plus,
  TrendingUp,
  ArrowRight,
  User,
  Sparkles,
  BarChart3,
  Search,
  ExternalLink,
  DollarSign,
  Tag,
  Eye,
  Edit,
  MoreVertical,
} from 'lucide-react';

import { useDealsQuery } from '@/hooks/useDealsQuery';
import {
  DateRangeFilterPopover,
  DateRangeValue,
  filterDealByDateRange,
} from '@/components/DateRangeFilterPopover';

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();

  // Date Range Popover State
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    preset: 'ALL',
    label: 'All Time',
  });

  // Modal States
  const [isRegisteredModalOpen, setIsRegisteredModalOpen] = useState(false);
  const [registeredSearchInput, setRegisteredSearchInput] = useState('');

  const [isExpiredModalOpen, setIsExpiredModalOpen] = useState(false);
  const [expiredSearchInput, setExpiredSearchInput] = useState('');

  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [brandSearchInput, setBrandSearchInput] = useState('');
  const [debouncedBrandSearch, setDebouncedBrandSearch] = useState('');
  const [isSearchingBrand, setIsSearchingBrand] = useState(false);

  const [isOtherBUModalOpen, setIsOtherBUModalOpen] = useState(false);
  const [otherBUSearchInput, setOtherBUSearchInput] = useState('');
  const [debouncedOtherBUSearch, setDebouncedOtherBUSearch] = useState('');

  const role: UserRole = (session?.user as any)?.role || 'admin';
  const accountName = (session?.user as any)?.AccountName || (session?.user as any)?.name || 'Demo User';
  const accountGroup = (session?.user as any)?.AccountGroup || 'HQ';

  const scopedFilter = useMemo(
    () => ({
      userRole: role,
      accountName,
      accountGroup,
    }),
    [role, accountName, accountGroup]
  );

  const { data: allDeals = [], isLoading: loading } = useDealsQuery(scopedFilter);

  // Apply Date Range Filter to deals
  const deals = useMemo(() => {
    return allDeals.filter((d: DealHeaderRecord) =>
      filterDealByDateRange(d.dtRegistered || d.dtCreated, dateRange)
    );
  }, [allDeals, dateRange]);

  // Debounce brand search in modal
  useEffect(() => {
    if (!brandSearchInput.trim()) {
      setDebouncedBrandSearch('');
      setIsSearchingBrand(false);
      return;
    }
    setIsSearchingBrand(true);
    const timer = setTimeout(() => {
      setDebouncedBrandSearch(brandSearchInput.trim());
      setIsSearchingBrand(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [brandSearchInput]);

  // Debounce other BU search in modal
  useEffect(() => {
    if (!otherBUSearchInput.trim()) {
      setDebouncedOtherBUSearch('');
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedOtherBUSearch(otherBUSearchInput.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [otherBUSearchInput]);

  // Brand Name Normalization (merging capital / non-capital brands)
  const normalizeBrandName = (rawBrand: string) => {
    const trimmed = (rawBrand || '').trim();
    if (!trimmed) return 'Unspecified';
    const upper = trimmed.toUpperCase();
    if (upper === 'HPE' || upper === 'HEWLETT PACKARD ENTERPRISE') return 'HPE';
    if (upper === 'DELL' || upper === 'DELL TECHNOLOGIES' || upper === 'DELL EMC') return 'Dell';
    if (upper === 'CISCO') return 'Cisco';
    if (upper === 'LENOVO') return 'Lenovo';
    if (upper === 'MICROSOFT' || upper === 'MS') return 'Microsoft';
    if (upper === 'VMWARE') return 'VMware';
    if (upper === 'FORTINET') return 'Fortinet';
    if (upper === 'PALO ALTO') return 'Palo Alto';
    if (upper === 'SOPHOS') return 'Sophos';
    if (upper === 'NUTANIX') return 'Nutanix';
    if (upper === 'ARUBA') return 'Aruba';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  };

  // Metric Computations
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const registeredDealsList = useMemo(() => {
    return deals.filter((d: DealHeaderRecord) => String(d.dealStatus) === '1' || d.dealStatus === 1);
  }, [deals]);

  const totalRegistered = registeredDealsList.length;

  const expiredDealsList = useMemo(() => {
    return deals.filter((d: DealHeaderRecord) => {
      const rawExp = d.expDt || d.expiration;
      if (!rawExp) return false;
      const exp = new Date(rawExp);
      return !isNaN(exp.getTime()) && exp < now;
    });
  }, [deals]);

  const expiredThisMonth = useMemo(() => {
    return deals.filter((d: DealHeaderRecord) => {
      const rawExp = d.expDt || d.expiration;
      if (!rawExp) return false;
      const exp = new Date(rawExp);
      return exp.getMonth() === currentMonth && exp.getFullYear() === currentYear && exp < now;
    }).length;
  }, [deals, currentMonth, currentYear]);

  // Deals per Brand breakdown (normalized)
  const dealsPerBrandMap = useMemo(() => {
    const map: Record<string, { count: number; totalValue: number; currencies: Set<string> }> = {};
    deals.forEach((d: DealHeaderRecord) => {
      const brand = normalizeBrandName(d.brand || '');
      if (!map[brand]) {
        map[brand] = { count: 0, totalValue: 0, currencies: new Set<string>() };
      }
      map[brand].count += 1;
      const amt = d.items?.reduce((sum: number, i: any) => sum + (Number(i.totalAmt) || 0), 0) || 0;
      map[brand].totalValue += amt;
      d.items?.forEach((i: any) => {
        if (i.currency) map[brand].currencies.add(i.currency);
      });
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [deals]);

  const grandTotalPipelineValue = useMemo(() => {
    return deals.reduce((acc: number, deal: DealHeaderRecord) => {
      const dealSum = deal.items?.reduce((sum: number, item: any) => sum + (Number(item.totalAmt) || 0), 0) || 0;
      return acc + dealSum;
    }, 0);
  }, [deals]);

  const filteredBrandsInModal = useMemo(() => {
    if (!debouncedBrandSearch.trim()) return dealsPerBrandMap;
    const q = debouncedBrandSearch.toLowerCase().trim();
    return dealsPerBrandMap.filter(([brand]) => brand.toLowerCase().includes(q));
  }, [dealsPerBrandMap, debouncedBrandSearch]);

  const OFFICIAL_BUS = ['BU1', 'BU2', 'BU5', 'BU8', 'BU10', 'BU12'] as const;

  // Calculate official BUs & others breakdown
  const { officialBUsList, otherBUsMap, totalOthersCount, totalOthersValue } = useMemo(() => {
    const officialCounts: Record<string, number> = {};
    OFFICIAL_BUS.forEach((bu) => {
      officialCounts[bu] = 0;
    });

    const others: Record<string, { count: number; totalValue: number }> = {};
    let othersCount = 0;
    let othersValue = 0;

    deals.forEach((d: DealHeaderRecord) => {
      const rawBu = (d.BU || d.bu || '').toString().trim();
      const amt = d.items?.reduce((sum: number, item: any) => sum + (Number(item.totalAmt) || 0), 0) || 0;

      if ((OFFICIAL_BUS as readonly string[]).includes(rawBu)) {
        officialCounts[rawBu] = (officialCounts[rawBu] || 0) + 1;
      } else {
        const buKey = rawBu || 'Unassigned';
        if (!others[buKey]) {
          others[buKey] = { count: 0, totalValue: 0 };
        }
        others[buKey].count += 1;
        others[buKey].totalValue += amt;
        othersCount += 1;
        othersValue += amt;
      }
    });

    const officialList = OFFICIAL_BUS.map((bu) => [bu, officialCounts[bu]] as [string, number]);

    return {
      officialBUsList: officialList,
      otherBUsMap: others,
      totalOthersCount: othersCount,
      totalOthersValue: othersValue,
    };
  }, [deals]);

  const filteredOtherBUsInModal = useMemo(() => {
    const entries = Object.entries(otherBUsMap).sort((a, b) => b[1].count - a[1].count);
    if (!debouncedOtherBUSearch.trim()) return entries;
    const q = debouncedOtherBUSearch.toLowerCase().trim();
    return entries.filter(([bu]) => bu.toLowerCase().includes(q));
  }, [otherBUsMap, debouncedOtherBUSearch]);

  const isViewOnly = role === 'bu' || role === 'bu_admin' || role === 'ao';

  const getRoleHeaderLabel = () => {
    if (role === 'admin') return 'Sales Administration (All BUs)';
    if (role === 'aa') return 'Sales AA (All BUs)';
    if (role === 'bu' || role === 'bu_admin') return `BU Supervisor (${accountGroup})`;
    return `Account Officer (${accountGroup})`;
  };

  const formatAmounts = (deal: DealHeaderRecord) => {
    if (deal.aggregatedTotals && Object.keys(deal.aggregatedTotals).length > 0) {
      return Object.entries(deal.aggregatedTotals)
        .map(([curr, amt]: [string, any]) => `${curr} ${Number(amt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
        .join(' | ');
    }
    if (deal.items && deal.items.length > 0) {
      const total = deal.items.reduce((acc: number, item: any) => acc + (Number(item.totalAmt) || 0), 0);
      const curr = deal.items[0]?.currency || 'PHP';
      return `${curr} ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return 'PHP 0.00';
  };

  const filteredRegisteredDealsInModal = useMemo(() => {
    if (!registeredSearchInput.trim()) return registeredDealsList;
    const q = registeredSearchInput.toLowerCase().trim();
    return registeredDealsList.filter(
      (d) =>
        (d.ProjectName || d.projectName || '').toLowerCase().includes(q) ||
        (d.custName || '').toLowerCase().includes(q) ||
        (d.dealRegID || '').toLowerCase().includes(q) ||
        (d.brand || '').toLowerCase().includes(q) ||
        (d.AssignedAO || d.assignedAO || '').toLowerCase().includes(q)
    );
  }, [registeredDealsList, registeredSearchInput]);

  const filteredExpiredDealsInModal = useMemo(() => {
    if (!expiredSearchInput.trim()) return expiredDealsList;
    const q = expiredSearchInput.toLowerCase().trim();
    return expiredDealsList.filter(
      (d) =>
        (d.ProjectName || d.projectName || '').toLowerCase().includes(q) ||
        (d.custName || '').toLowerCase().includes(q) ||
        (d.dealRegID || '').toLowerCase().includes(q) ||
        (d.brand || '').toLowerCase().includes(q) ||
        (d.AssignedAO || d.assignedAO || '').toLowerCase().includes(q)
    );
  }, [expiredDealsList, expiredSearchInput]);

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-7 rounded-2xl bg-gradient-to-tr from-primary to-slate-800 text-white shadow-md overflow-hidden">
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 text-white backdrop-blur-sm flex items-center gap-1 border border-white/25 max-w-full">
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Welcome back, {accountName}</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-white border border-white/20 max-w-full truncate">
              {getRoleHeaderLabel()}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-snug break-words">
            Deals Management Home
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <DateRangeFilterPopover value={dateRange} onChange={setDateRange} />
          {!isViewOnly && (
            <Link
              href="/deals/new"
              className="flex items-center justify-center gap-2 bg-white text-primary font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:bg-white/90 transition text-center whitespace-nowrap"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Register New Deal</span>
            </Link>
          )}
          <Link
            href="/deals"
            className="flex items-center justify-center gap-1.5 bg-white/15 text-white font-semibold text-xs px-4 py-2.5 rounded-xl hover:bg-white/25 transition border border-white/20 text-center whitespace-nowrap"
          >
            <span>View Deals Registry</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </Link>
        </div>
      </div>

      {/* 4 Core Clickable KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* KPI 1: Total Registered Deals (Clickable) */}
        <AppCard
          onClick={() => setIsRegisteredModalOpen(true)}
          className="p-4 sm:p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs min-w-0 overflow-hidden cursor-pointer hover:border-emerald-500/50 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between text-muted text-xs font-semibold gap-2">
            <span className="truncate group-hover:text-emerald-500 transition">Total Registered Deals</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          </div>
          {loading ? (
            <div className="space-y-2 mt-2">
              <div className="shimmer-skeleton h-8 w-24 rounded-md" />
              <div className="shimmer-skeleton h-3.5 w-36 rounded" />
            </div>
          ) : (
            <>
              <div className="text-2xl sm:text-3xl font-bold text-foreground mt-2 font-mono truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                {totalRegistered}
              </div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center justify-between truncate">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 shrink-0" />
                  <span className="truncate">Active registered pipelines</span>
                </div>
                <span className="text-[10px] text-muted group-hover:text-emerald-600 transition font-medium">Click to view &rarr;</span>
              </div>
            </>
          )}
        </AppCard>

        {/* KPI 2: Expired Deals this Month (Clickable) */}
        <AppCard
          onClick={() => setIsExpiredModalOpen(true)}
          className="p-4 sm:p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs min-w-0 overflow-hidden cursor-pointer hover:border-rose-500/50 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between text-muted text-xs font-semibold gap-2">
            <span className="truncate group-hover:text-rose-500 transition">Expired Deals this Month</span>
            <Clock className="w-4 h-4 text-rose-500 shrink-0" />
          </div>
          {loading ? (
            <div className="space-y-2 mt-2">
              <div className="shimmer-skeleton h-8 w-24 rounded-md" />
              <div className="shimmer-skeleton h-3.5 w-40 rounded" />
            </div>
          ) : (
            <>
              <div className="text-2xl sm:text-3xl font-bold text-rose-600 mt-2 font-mono truncate">
                {expiredThisMonth}
              </div>
              <div className="text-[11px] text-muted mt-1 truncate flex items-center justify-between">
                <span>Requires re-registration / WTN</span>
                <span className="text-[10px] text-rose-500 font-bold group-hover:underline transition">Click to view &rarr;</span>
              </div>
            </>
          )}
        </AppCard>

        {/* KPI 3: Active Brands Represented (Clickable) */}
        <AppCard
          onClick={() => setIsBrandModalOpen(true)}
          className="p-4 sm:p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs min-w-0 overflow-hidden cursor-pointer hover:border-sky-500/50 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between text-muted text-xs font-semibold gap-2">
            <span className="truncate group-hover:text-sky-500 transition">Active Brands Represented</span>
            <Layers className="w-4 h-4 text-sky-500 shrink-0" />
          </div>
          {loading ? (
            <div className="space-y-2 mt-2">
              <div className="shimmer-skeleton h-8 w-20 rounded-md" />
              <div className="shimmer-skeleton h-3.5 w-28 rounded" />
            </div>
          ) : (
            <>
              <div className="text-2xl sm:text-3xl font-bold text-foreground mt-2 font-mono truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition">
                {dealsPerBrandMap.length}
              </div>
              <div className="text-[11px] text-sky-600 font-semibold mt-1 truncate flex items-center justify-between">
                <span>Top: {dealsPerBrandMap[0]?.[0] || 'Dell'}</span>
                <span className="text-[10px] text-muted group-hover:text-sky-600 transition font-medium">Click to view &rarr;</span>
              </div>
            </>
          )}
        </AppCard>

        {/* KPI 4: Business Units Covered (Clickable) */}
        <AppCard
          onClick={() => setIsOtherBUModalOpen(true)}
          className="p-4 sm:p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs min-w-0 overflow-hidden cursor-pointer hover:border-indigo-500/50 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between text-muted text-xs font-semibold gap-2">
            <span className="truncate group-hover:text-indigo-500 transition">Business Units Covered</span>
            <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
          </div>
          {loading ? (
            <div className="space-y-2 mt-2">
              <div className="shimmer-skeleton h-8 w-16 rounded-md" />
              <div className="shimmer-skeleton h-3.5 w-44 rounded" />
            </div>
          ) : (
            <>
              <div className="text-2xl sm:text-3xl font-bold text-foreground mt-2 font-mono truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                6 <span className="text-xs text-muted font-sans font-normal">Official BUs</span>
              </div>
              <div className="text-[11px] text-indigo-600 font-semibold mt-1 truncate flex items-center justify-between">
                <span>BU1, BU2, BU5, BU8, BU10, BU12</span>
                <span className="text-[10px] text-indigo-500 font-bold group-hover:underline transition">
                  +{totalOthersCount} Others &rarr;
                </span>
              </div>
            </>
          )}
        </AppCard>
      </div>

      {/* Breakdown Charts & Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deals per Brand */}
        <AppCard className="p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-sky-600" />
                <h2 className="font-bold text-sm text-foreground">Deals Distribution by Brand</h2>
              </div>
              {loading ? (
                <div className="shimmer-skeleton h-4 w-24 rounded" />
              ) : (
                <span className="text-xs text-muted font-medium">{dealsPerBrandMap.length} Brands • {deals.length} deals</span>
              )}
            </div>

            <div className="space-y-3">
              {loading ? (
                [85, 65, 45, 30, 25, 15].map((w, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="shimmer-skeleton h-3.5 w-20 rounded" />
                      <div className="shimmer-skeleton h-3.5 w-24 rounded" />
                    </div>
                    <div className="w-full h-2 bg-neutral rounded-full overflow-hidden border border-border/40">
                      <div className="shimmer-skeleton h-full rounded-full" style={{ width: `${w}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                dealsPerBrandMap.slice(0, 10).map(([brand, data], idx) => {
                  const percentage = deals.length > 0 ? Math.round((data.count / deals.length) * 100) : 0;
                  return (
                    <div key={brand} className="space-y-1.5 group">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold text-muted w-4">#{idx + 1}</span>
                          <span className="font-semibold text-foreground group-hover:text-sky-600 transition">{brand}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-muted">
                          <span className="text-foreground/90 font-medium">
                            PHP {data.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                          <span className="text-[11px] text-muted">
                            ({data.count} • {percentage}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-neutral rounded-full overflow-hidden border border-border/40">
                        <div
                          className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(percentage, 3)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* See All Brands Button */}
          {!loading && dealsPerBrandMap.length > 0 && (
            <div className="pt-3 border-t border-border/40 flex items-center justify-between">
              <span className="text-[11px] text-muted font-medium">
                Showing top 10 of {dealsPerBrandMap.length} brands
              </span>
              <button
                type="button"
                onClick={() => setIsBrandModalOpen(true)}
                className="text-xs font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 flex items-center gap-1 hover:underline transition"
              >
                <span>See All in Modal ({dealsPerBrandMap.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </AppCard>

        {/* Deals per BU */}
        <AppCard className="p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <h2 className="font-bold text-sm text-foreground">Deals Distribution by Business Unit (BU)</h2>
              </div>
              <span className="text-xs text-muted font-medium">6 Official BUs + Others</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {loading ? (
                [1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-neutral/50 border border-border/40 flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="shimmer-skeleton h-5 w-12 rounded" />
                      <div className="shimmer-skeleton h-5 w-14 rounded" />
                    </div>
                    <div className="shimmer-skeleton h-3 w-24 rounded" />
                  </div>
                ))
              ) : (
                <>
                  {officialBUsList.map(([bu, count]) => (
                    <div
                      key={bu}
                      className="p-3 rounded-xl bg-neutral/50 border border-border/40 flex flex-col justify-between hover:border-sky-500/40 transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold px-2 py-0.5 rounded border text-sky-400 bg-sky-500/15 border-sky-500/30">
                          {bu}
                        </span>
                        <span className="text-xs font-mono font-bold text-foreground">{count}</span>
                      </div>
                      <span className="text-[10px] text-muted mt-2">Active opportunities</span>
                    </div>
                  ))}

                  {/* Others / Legacy Clickable Tile */}
                  <div
                    onClick={() => setIsOtherBUModalOpen(true)}
                    className="p-3 rounded-xl bg-neutral/50 border border-border/40 hover:border-indigo-500/50 hover:bg-indigo-500/5 cursor-pointer flex flex-col justify-between transition group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2 py-0.5 rounded border text-neutral-400 bg-neutral-500/15 border-border/50 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition">
                        Others / Legacy
                      </span>
                      <span className="text-xs font-mono font-bold text-foreground group-hover:text-indigo-400 transition">
                        {totalOthersCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[10px] text-indigo-500 font-semibold">
                      <span>Click to view breakdown</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* See Others Breakdown Footer Link */}
          {!loading && totalOthersCount > 0 && (
            <div className="pt-3 border-t border-border/40 flex items-center justify-between">
              <span className="text-[11px] text-muted font-medium">
                {Object.keys(otherBUsMap).length} non-standard BUs ({totalOthersCount} deals)
              </span>
              <button
                type="button"
                onClick={() => setIsOtherBUModalOpen(true)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 hover:underline transition"
              >
                <span>View Others Modal ({Object.keys(otherBUsMap).length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </AppCard>
      </div>

      {/* Recent Deals Quick View */}
      <AppCard className="p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h2 className="font-bold text-sm text-foreground">Recent Deals Pipeline</h2>
          </div>
          <Link
            href="/deals"
            className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 transition"
          >
            <span>View all in Registry</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-border/50">
          {loading ? (
            [1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2">
                <div className="space-y-2 w-full max-w-md">
                  <div className="flex items-center gap-2">
                    <div className="shimmer-skeleton h-4 rounded" style={{ width: `${140 + (i % 3) * 50}px` }} />
                    <div className="shimmer-skeleton h-4 w-12 rounded" />
                  </div>
                  <div className="shimmer-skeleton h-3 w-64 rounded" />
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="shimmer-skeleton h-4 w-16 rounded" />
                  <div className="shimmer-skeleton h-6 w-20 rounded-full" />
                  <div className="shimmer-skeleton h-4 w-8 rounded" />
                </div>
              </div>
            ))
          ) : (
            deals.slice(0, 5).map((deal) => {
              const statusNum = typeof deal.dealStatus === 'number' ? deal.dealStatus : parseInt(deal.dealStatus) || 1;
              const statusMeta = DEAL_STATUS_MAP[statusNum] || {
                label: `Status ${deal.dealStatus}`,
                variant: 'default' as const,
              };

              return (
                <div
                  key={deal.dealID}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (
                      target.closest('button') ||
                      target.closest('a') ||
                      target.closest('.ant-dropdown') ||
                      target.closest('[role="menuitem"]')
                    ) {
                      return;
                    }
                    router.push(`/deals/${deal.dealID}`);
                  }}
                  onMouseEnter={() => router.prefetch(`/deals/${deal.dealID}`)}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral/50 px-3 rounded-xl transition cursor-pointer border border-transparent hover:border-border/50 group"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold border border-sky-500/20 text-xs font-mono shrink-0">
                        {deal.brand || 'Unspecified'}
                      </span>
                      <span
                        className="font-bold text-xs text-foreground group-hover:text-sky-600 transition truncate max-w-[200px]"
                        title={deal.custName || ''}
                      >
                        {deal.custName}
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-neutral text-muted border border-border/50 shrink-0">
                        {deal.BU || deal.bu}
                      </span>
                    </div>
                    <div className="text-xs text-muted dark:text-zinc-300 truncate max-w-md">
                      {deal.ProjectName || deal.projectName}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-foreground">
                        {formatAmounts(deal)}
                      </div>
                      <div className="text-[10px] text-muted">
                        {deal.dtRegistered ? new Date(deal.dtRegistered).toLocaleDateString() : ''}
                      </div>
                    </div>

                    <AppChip variant={statusMeta.variant as any}>
                      {statusMeta.label}
                    </AppChip>

                    {!isViewOnly && (
                      <Dropdown
                        menu={{
                          items: [
                            {
                              key: 'edit',
                              icon: <Edit className="w-4 h-4 text-zinc-400" />,
                              label: 'Edit Deal',
                              onClick: () => router.push(`/deals/${deal.dealID}/edit`),
                            },
                          ],
                        }}
                        trigger={['click']}
                        placement="bottomRight"
                      >
                        <button
                          type="button"
                          className="h-8 w-8 rounded-lg bg-neutral/80 hover:bg-neutral text-foreground dark:text-zinc-200 hover:text-foreground border border-border/70 hover:border-border transition-all flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
                          title="Deal Actions"
                          aria-label="Deal Actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </Dropdown>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </AppCard>

      {/* Complete Brands Distribution Modal - Compact width & height */}
      <AppModal
        open={isBrandModalOpen}
        onClose={() => {
          setIsBrandModalOpen(false);
          setBrandSearchInput('');
          setDebouncedBrandSearch('');
        }}
        width={620}
      >
        <AppModal.Header>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <AppModal.Title>Partner Brands Distribution</AppModal.Title>
              <AppModal.Description>
                Breakdown of all partner brands registered across active deals.
              </AppModal.Description>
            </div>
          </div>
        </AppModal.Header>

        <AppModal.Body className="space-y-3 pt-3">
          {/* Summary Stat Tiles */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-2.5 rounded-xl bg-neutral/50 border border-border/70 text-center">
              <div className="text-[10px] text-muted font-semibold uppercase tracking-wider">Total Brands</div>
              <div className="text-lg font-bold font-mono text-foreground mt-0.5">{dealsPerBrandMap.length}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral/50 border border-border/70 text-center">
              <div className="text-[10px] text-muted font-semibold uppercase tracking-wider">Total Deals</div>
              <div className="text-lg font-bold font-mono text-sky-600 mt-0.5">{deals.length}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral/50 border border-border/70 text-center">
              <div className="text-[10px] text-muted font-semibold uppercase tracking-wider">Grand Value</div>
              <div className="text-xs font-bold font-mono text-emerald-600 truncate mt-1">
                PHP {grandTotalPipelineValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          {/* Search Brand Input with Debounce */}
          <div className="relative">
            <AppInput
              prefix={<Search className="w-4 h-4 text-muted" />}
              placeholder="Search brands (e.g. Dell, Cisco, HPE)..."
              value={brandSearchInput}
              onChange={(e: any) => setBrandSearchInput(e.target.value)}
              allowClear
              size="md"
            />
          </div>

          {/* Scrollable Brands Table/List */}
          <div className="border border-border/70 rounded-xl overflow-hidden shadow-xs bg-background">
            <div className="max-h-[320px] overflow-y-auto divide-y divide-border/50">
              {isSearchingBrand ? (
                /* Shimmer Skeleton rows during search debounce */
                <div className="divide-y divide-border/50">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="p-3 flex items-center justify-between">
                      <div className="space-y-2 w-48">
                        <div className="shimmer-skeleton h-3.5 w-28 rounded" />
                        <div className="shimmer-skeleton h-2 w-36 rounded-full" />
                      </div>
                      <div className="space-y-1.5 text-right w-24">
                        <div className="shimmer-skeleton h-3.5 w-20 rounded ml-auto" />
                        <div className="shimmer-skeleton h-2.5 w-12 rounded ml-auto" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredBrandsInModal.length === 0 ? (
                <div className="p-6 text-center text-muted text-xs space-y-1">
                  <Tag className="w-6 h-6 mx-auto text-muted/50 mb-1.5" />
                  <p className="font-semibold text-foreground">No matching brands found</p>
                  <p className="text-[11px]">Try searching for a different partner brand.</p>
                </div>
              ) : (
                filteredBrandsInModal.map(([brand, data], idx) => {
                  const percentage = deals.length > 0 ? ((data.count / deals.length) * 100).toFixed(1) : '0';
                  const percentNum = parseFloat(percentage);

                  return (
                    <div
                      key={brand}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-neutral/40 transition text-xs"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold text-muted w-4">#{idx + 1}</span>
                          <span className="font-bold text-foreground truncate">{brand}</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 border border-sky-500/20 shrink-0">
                            {data.count} {data.count === 1 ? 'deal' : 'deals'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-28 h-1.5 bg-neutral rounded-full overflow-hidden border border-border/40 shrink-0">
                            <div
                              className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full"
                              style={{ width: `${Math.max(percentNum, 4)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-muted">{percentage}%</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 text-right">
                        <div>
                          <div className="font-mono font-bold text-foreground text-xs">
                            PHP {data.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </div>
                        </div>

                        <Link
                          href={`/deals?brand=${encodeURIComponent(brand)}`}
                          onClick={() => setIsBrandModalOpen(false)}
                          className="p-1 text-muted hover:text-sky-600 rounded hover:bg-neutral transition"
                          title={`View ${brand} deals in Registry`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </AppModal.Body>

        <AppModal.Footer className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-muted">
            Showing {filteredBrandsInModal.length} of {dealsPerBrandMap.length} brands
          </span>
          <AppButton
            variant="neutral"
            size="sm"
            onClick={() => {
              setIsBrandModalOpen(false);
              setBrandSearchInput('');
              setDebouncedBrandSearch('');
            }}
          >
            Close
          </AppButton>
        </AppModal.Footer>
      </AppModal>

      {/* Other Business Units & Legacy Modal */}
      <AppModal
        open={isOtherBUModalOpen}
        onClose={() => {
          setIsOtherBUModalOpen(false);
          setOtherBUSearchInput('');
          setDebouncedOtherBUSearch('');
        }}
        width={620}
      >
        <AppModal.Header>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <div>
              <AppModal.Title>Other Business Units & Legacy Accounts</AppModal.Title>
              <AppModal.Description>
                Breakdown of deals categorized under non-standard or legacy business units across the organization.
              </AppModal.Description>
            </div>
          </div>
        </AppModal.Header>

        <AppModal.Body>
          <div className="space-y-4">
            {/* Search Input in Modal */}
            <div className="relative">
              <AppInput
                prefix={<Search className="w-4 h-4 text-muted" />}
                placeholder="Search other business units (e.g. CAC, CSD, ESD)..."
                value={otherBUSearchInput}
                onChange={(e: any) => setOtherBUSearchInput(e.target.value)}
                allowClear
                size="md"
              />
            </div>

            {/* Summary KPI Strip inside Modal */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-neutral/40 border border-border/50 text-xs">
              <div>
                <span className="text-muted block text-[11px]">Total Other Deals</span>
                <span className="font-mono font-bold text-foreground text-sm">{totalOthersCount} deals</span>
              </div>
              <div>
                <span className="text-muted block text-[11px]">Total Pipeline Value</span>
                <span className="font-mono font-bold text-foreground text-sm">
                  PHP {totalOthersValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-muted block text-[11px]">Unique Non-Standard BUs</span>
                <span className="font-mono font-bold text-indigo-600 text-sm">
                  {Object.keys(otherBUsMap).length} Units
                </span>
              </div>
            </div>

            {/* Other BUs List */}
            <div className="border border-border/60 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto divide-y divide-border/40">
              {filteredOtherBUsInModal.length === 0 ? (
                <div className="p-6 text-center text-muted text-xs space-y-1">
                  <Building2 className="w-6 h-6 mx-auto text-muted/50 mb-1.5" />
                  <p className="font-semibold text-foreground">No matching business units found</p>
                  <p className="text-[11px]">Try searching for a different business unit code.</p>
                </div>
              ) : (
                filteredOtherBUsInModal.map(([bu, data], idx) => {
                  const percentage =
                    totalOthersCount > 0 ? ((data.count / totalOthersCount) * 100).toFixed(1) : '0';
                  const percentNum = parseFloat(percentage);

                  return (
                    <div
                      key={bu}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-neutral/40 transition text-xs"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold text-muted w-4">#{idx + 1}</span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded border text-indigo-400 bg-indigo-500/15 border-indigo-500/30 shrink-0">
                            {bu}
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-neutral text-muted border border-border/60 shrink-0">
                            {data.count} {data.count === 1 ? 'deal' : 'deals'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-28 h-1.5 bg-neutral rounded-full overflow-hidden border border-border/40 shrink-0">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
                              style={{ width: `${Math.max(percentNum, 4)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-muted">{percentage}% of others</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 text-right">
                        <div>
                          <div className="font-mono font-bold text-foreground text-xs">
                            PHP {data.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </div>
                        </div>

                        <Link
                          href={`/deals?search=${encodeURIComponent(bu)}`}
                          onClick={() => setIsOtherBUModalOpen(false)}
                          className="p-1 text-muted hover:text-indigo-600 rounded hover:bg-neutral transition"
                          title={`View ${bu} deals in Registry`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </AppModal.Body>

        <AppModal.Footer className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-muted">
            Showing {filteredOtherBUsInModal.length} of {Object.keys(otherBUsMap).length} other business units
          </span>
          <AppButton
            variant="neutral"
            size="sm"
            onClick={() => {
              setIsOtherBUModalOpen(false);
              setOtherBUSearchInput('');
              setDebouncedOtherBUSearch('');
            }}
          >
            Close
          </AppButton>
        </AppModal.Footer>
      </AppModal>

      {/* Registered Deals Modal Drilldown */}
      <AppModal
        open={isRegisteredModalOpen}
        onClose={() => {
          setIsRegisteredModalOpen(false);
          setRegisteredSearchInput('');
        }}
        width={720}
      >
        <AppModal.Header>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <div>
              <AppModal.Title>Active Registered Deals</AppModal.Title>
              <AppModal.Description>
                Detailed drill-down of all approved and registered deals across business units.
              </AppModal.Description>
            </div>
          </div>
        </AppModal.Header>

        <AppModal.Body>
          <div className="space-y-4">
            <AppInput
              prefix={<Search className="w-4 h-4 text-muted" />}
              placeholder="Search registered deals by Project, Customer, Reg ID, Brand..."
              value={registeredSearchInput}
              onChange={(e: any) => setRegisteredSearchInput(e.target.value)}
              allowClear
              size="md"
            />

            <div className="border border-border/60 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto divide-y divide-border/40">
              {filteredRegisteredDealsInModal.length === 0 ? (
                <div className="p-6 text-center text-muted text-xs space-y-1">
                  <CheckCircle2 className="w-6 h-6 mx-auto text-muted/50 mb-1.5" />
                  <p className="font-semibold text-foreground">No registered deals found</p>
                </div>
              ) : (
                filteredRegisteredDealsInModal.map((deal, idx) => (
                  <div
                    key={deal.dealID || idx}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-neutral/40 transition text-xs"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                          {deal.dealRegID || `#${deal.dealID}`}
                        </span>
                        <span className="font-bold text-foreground truncate">{deal.custName}</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-neutral text-muted border border-border/50">
                          {deal.BU || deal.bu}
                        </span>
                      </div>
                      <div className="text-xs text-muted truncate">{deal.ProjectName || deal.projectName}</div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <div>
                        <div className="font-mono font-bold text-foreground text-xs">
                          {formatAmounts(deal)}
                        </div>
                        <div className="text-[10px] text-muted">{deal.brand}</div>
                      </div>
                      <Link
                        href={`/deals/${deal.dealID}`}
                        onClick={() => setIsRegisteredModalOpen(false)}
                        className="p-1 text-muted hover:text-emerald-600 rounded hover:bg-neutral transition"
                        title="View Deal"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </AppModal.Body>

        <AppModal.Footer className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-muted">
            Showing {filteredRegisteredDealsInModal.length} of {registeredDealsList.length} registered deals
          </span>
          <AppButton
            variant="neutral"
            size="sm"
            onClick={() => {
              setIsRegisteredModalOpen(false);
              setRegisteredSearchInput('');
            }}
          >
            Close
          </AppButton>
        </AppModal.Footer>
      </AppModal>

      {/* Expired Deals Modal Drilldown */}
      <AppModal
        open={isExpiredModalOpen}
        onClose={() => {
          setIsExpiredModalOpen(false);
          setExpiredSearchInput('');
        }}
        width={720}
      >
        <AppModal.Header>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-rose-500" />
            <div>
              <AppModal.Title>Expired & SLA Overdue Deals</AppModal.Title>
              <AppModal.Description>
                Deals past validity that require immediate renewal, WTN re-notification, or closure.
              </AppModal.Description>
            </div>
          </div>
        </AppModal.Header>

        <AppModal.Body>
          <div className="space-y-4">
            <AppInput
              prefix={<Search className="w-4 h-4 text-muted" />}
              placeholder="Search expired deals by Project, Customer, Reg ID..."
              value={expiredSearchInput}
              onChange={(e: any) => setExpiredSearchInput(e.target.value)}
              allowClear
              size="md"
            />

            <div className="border border-border/60 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto divide-y divide-border/40">
              {filteredExpiredDealsInModal.length === 0 ? (
                <div className="p-6 text-center text-muted text-xs space-y-1">
                  <Clock className="w-6 h-6 mx-auto text-muted/50 mb-1.5" />
                  <p className="font-semibold text-foreground">No expired deals found</p>
                </div>
              ) : (
                filteredExpiredDealsInModal.map((deal, idx) => (
                  <div
                    key={deal.dealID || idx}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-neutral/40 transition text-xs"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                          {deal.dealRegID || `#${deal.dealID}`}
                        </span>
                        <span className="font-bold text-foreground truncate">{deal.custName}</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 border border-rose-500/20">
                          Expired: {deal.expDt ? new Date(deal.expDt).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="text-xs text-muted truncate">{deal.ProjectName || deal.projectName}</div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <div>
                        <div className="font-mono font-bold text-foreground text-xs">
                          {formatAmounts(deal)}
                        </div>
                        <div className="text-[10px] text-muted">{deal.BU || deal.bu}</div>
                      </div>
                      <Link
                        href={`/deals/${deal.dealID}`}
                        onClick={() => setIsExpiredModalOpen(false)}
                        className="p-1 text-muted hover:text-rose-600 rounded hover:bg-neutral transition"
                        title="View Deal Details"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </AppModal.Body>

        <AppModal.Footer className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-muted">
            Showing {filteredExpiredDealsInModal.length} of {expiredDealsList.length} expired deals
          </span>
          <AppButton
            variant="neutral"
            size="sm"
            onClick={() => {
              setIsExpiredModalOpen(false);
              setExpiredSearchInput('');
            }}
          >
            Close
          </AppButton>
        </AppModal.Footer>
      </AppModal>
    </div>
  );
}
