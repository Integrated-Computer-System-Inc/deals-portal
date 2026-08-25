'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  DealHeaderRecord,
  UserRole,
  DEAL_STATUS_MAP,
  ACTIVE_BUSINESS_UNITS,
} from '@my-app/types';
import {
  AppCard,
  AppModal,
  AppButton,
  AppInput,
} from '@/components/ui';
import {
  CheckCircle2,
  Clock,
  Layers,
  Building2,
  Plus,
  TrendingUp,
  ArrowRight,
  User,
  BarChart3,
  Search,
  ExternalLink,
  Tag,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';

import { useDealsQuery, useCurrentUserFilter, useDashboardQuery } from '@/hooks/useDealsQuery';
import {
  DateRangeFilterPopover,
  DateRangeValue,
  filterDealByDateRange,
} from '@/components/DateRangeFilterPopover';
import {
  normalizeBrandName,
  calculateBrandDistribution,
} from '@/lib/brandUtils';
import dynamic from 'next/dynamic';
import { OFFICIAL_REGISTERED_BUS, normalizeBU } from '@/lib/buUtils';
import { formatDateLong } from '@/components/utils/time';

const DealLostListModal = dynamic(() => import('@/components/DealLostListModal'), { ssr: false });
const ModalDealTable = dynamic(
  () => import('@/components/ModalDealTable').then((mod) => mod.ModalDealTable),
  { ssr: false }
);

export default function DashboardPage() {
  const { data: session, status } = useSession();

  // If opened inside Google OAuth popup, close popup and redirect parent window
  useEffect(() => {
    if (typeof window !== 'undefined' && window.opener && window.name === 'google_oauth_popup') {
      try {
        window.opener.location.href = '/dashboard';
      } catch {
        // Ignore cross-origin issues if any
      }
      window.close();
    }
  }, []);

  // Date Range Popover State
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    preset: 'ALL',
    label: 'All Time',
  });

  // Modal States
  const [isLostModalOpen, setIsLostModalOpen] = useState(false);
  const [isRegisteredModalOpen, setIsRegisteredModalOpen] = useState(false);
  const [isExpiredModalOpen, setIsExpiredModalOpen] = useState(false);
  const [isRenewedModalOpen, setIsRenewedModalOpen] = useState(false);
  const [renewedSearch, setRenewedSearch] = useState('');
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [brandSearchInput, setBrandSearchInput] = useState('');
  const [debouncedBrandSearch, setDebouncedBrandSearch] = useState('');
  const [isSearchingBrand, setIsSearchingBrand] = useState(false);

  const [isOtherBUModalOpen, setIsOtherBUModalOpen] = useState(false);
  const [otherBUSearchInput, setOtherBUSearchInput] = useState('');
  const [debouncedOtherBUSearch, setDebouncedOtherBUSearch] = useState('');

  // Clickable Brand Overview Modal States
  const [selectedBrandForDeals, setSelectedBrandForDeals] = useState<string | null>(null);
  const [isBrandDealsModalOpen, setIsBrandDealsModalOpen] = useState(false);
  const role: UserRole = (session?.user as any)?.role || 'admin';
  const accountName = (session?.user as any)?.AccountName || (session?.user as any)?.name || '';
  const accountGroup = (session?.user as any)?.AccountGroup || 'HQ';

  const scopedFilter = useCurrentUserFilter();
  const { data: allDeals = [], isLoading: loading } = useDealsQuery(scopedFilter);
  const { data: metrics } = useDashboardQuery();

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

  // Deals per Brand breakdown
  const brandDistributionList = useMemo(() => {
    return calculateBrandDistribution(deals);
  }, [deals]);

  // Detailed BU distribution list with status breakdown & revenue metrics
  const buDistributionList = useMemo(() => {
    const map: Record<
      string,
      {
        bu: string;
        count: number;
        totalValue: number;
        activeCount: number;
        approvedCount: number;
        waitingCount: number;
        lostCount: number;
      }
    > = {};

    deals.forEach((d: DealHeaderRecord) => {
      const rawBu = normalizeBU(d.BU || d.bu || '') || 'Unassigned';
      const amt = d.items?.reduce((sum: number, item: any) => sum + (Number(item.totalAmt) || 0), 0) || 0;
      const statusNum = Number(d.dealStatus);

      if (!map[rawBu]) {
        map[rawBu] = {
          bu: rawBu,
          count: 0,
          totalValue: 0,
          activeCount: 0,
          approvedCount: 0,
          waitingCount: 0,
          lostCount: 0,
        };
      }

      map[rawBu].count += 1;
      map[rawBu].totalValue += amt;

      if (statusNum === 1) {
        map[rawBu].activeCount += 1;
      } else if (statusNum === 2 || statusNum === 3) {
        map[rawBu].approvedCount += 1;
      } else if (statusNum === 0 || statusNum === 4 || isNaN(statusNum)) {
        map[rawBu].waitingCount += 1;
      } else if (statusNum === 7 || statusNum === 8) {
        map[rawBu].lostCount += 1;
      }
    });

    return Object.values(map).sort((a, b) => b.count - a.count || b.totalValue - a.totalValue);
  }, [deals]);

  // Calculate official BUs & others breakdown
  const { officialBUsList, otherBUsMap, totalOthersCount, totalOthersValue } = useMemo(() => {
    const officialCounts: Record<string, number> = {};
    OFFICIAL_REGISTERED_BUS.forEach((bu) => {
      officialCounts[bu] = 0;
    });

    const others: Record<string, { count: number; totalValue: number }> = {};
    let othersCount = 0;
    let othersValue = 0;

    deals.forEach((d: DealHeaderRecord) => {
      const rawBu = normalizeBU(d.BU || d.bu || '');
      const amt = d.items?.reduce((sum: number, item: any) => sum + (Number(item.totalAmt) || 0), 0) || 0;

      if ((OFFICIAL_REGISTERED_BUS as readonly string[]).includes(rawBu)) {
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

    const officialList = OFFICIAL_REGISTERED_BUS.map((bu) => [bu, officialCounts[bu]] as [string, number]);

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

  const isViewOnly = status === 'authenticated' && (role === 'bu' || role === 'bu_admin' || role === 'ao');

  const getRoleHeaderLabel = () => {
    if (role === 'admin') return 'Sales Administration (All BUs)';
    if (role === 'aa') return 'Sales AA (All BUs)';
    if (role === 'bu' || role === 'bu_admin') return `BU Supervisor (${accountGroup})`;
    return `Account Officer (${accountGroup})`;
  };

  const registeredDealsList = useMemo(() => {
    return deals.filter((d: DealHeaderRecord) => String(d.dealStatus) === '1' || d.dealStatus === 1);
  }, [deals]);

  const totalRegistered = registeredDealsList.length;

  const expiredThisMonth = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return deals.filter((d: DealHeaderRecord) => {
      const rawExp = d.expDt || d.expiration;
      if (!rawExp) return false;
      const exp = new Date(rawExp);
      if (isNaN(exp.getTime())) return false;
      return exp.getFullYear() === currentYear && exp.getMonth() === currentMonth && exp < now;
    }).length;
  }, [deals]);

  const filteredBrandsInModal = useMemo(() => {
    if (!debouncedBrandSearch.trim()) return brandDistributionList;
    const q = debouncedBrandSearch.toLowerCase().trim();
    return brandDistributionList.filter((item) => item.brand.toLowerCase().includes(q));
  }, [brandDistributionList, debouncedBrandSearch]);

  const grandTotalPipelineValue = useMemo(() => {
    return deals.reduce((totalSum: number, deal: DealHeaderRecord) => {
      if (deal.items && deal.items.length > 0) {
        return totalSum + deal.items.reduce((itemSum: number, item: any) => itemSum + (Number(item.totalAmt) || 0), 0);
      }
      return totalSum;
    }, 0);
  }, [deals]);

  const expiredDealsList = useMemo(() => {
    return deals.filter((d: DealHeaderRecord) => {
      const rawExp = d.expDt || d.expiration;
      if (!rawExp) return false;
      const exp = new Date(rawExp);
      return !isNaN(exp.getTime()) && exp < new Date();
    });
  }, [deals]);

  const lostDealsList = useMemo(() => {
    return deals.filter((d: DealHeaderRecord) => {
      const statusStr = String(d.dealStatus ?? '');
      return statusStr === '7' || d.dealStatus === 7 || Boolean(d.lostInfo && d.lostInfo.reason);
    });
  }, [deals]);

  const renewedDealsList = useMemo(() => {
    return deals
      .filter((d: DealHeaderRecord) => {
        return Boolean(d.renewals && d.renewals.length > 0) || Boolean(d.latestRenewal);
      })
      .sort((a: any, b: any) => {
        const latestA = a.latestRenewal || (a.renewals ? a.renewals[0] : null);
        const latestB = b.latestRenewal || (b.renewals ? b.renewals[0] : null);
        const timeB = latestB ? new Date(latestB.dtRenewal || latestB.dtCreated || 0).getTime() : 0;
        const timeA = latestA ? new Date(latestA.dtRenewal || latestA.dtCreated || 0).getTime() : 0;
        return timeB - timeA;
      });
  }, [deals]);

  const totalRenewedCount = metrics?.totalRenewed ?? renewedDealsList.length;

  const filteredRenewedDeals = useMemo(() => {
    if (!renewedSearch.trim()) return renewedDealsList;
    const q = renewedSearch.toLowerCase().trim();
    return renewedDealsList.filter((d) => {
      const reg = (d.dealRegID || '').toLowerCase();
      const cust = (d.custName || '').toLowerCase();
      const proj = (d.ProjectName || d.projectName || '').toLowerCase();
      const bu = (d.BU || d.bu || '').toLowerCase();
      const brand = (d.brand || '').toLowerCase();
      return reg.includes(q) || cust.includes(q) || proj.includes(q) || bu.includes(q) || brand.includes(q);
    });
  }, [renewedDealsList, renewedSearch]);

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

  const recentDeals = useMemo(() => {
    return [...deals]
      .sort((a, b) => {
        const timeB = new Date(b.dtRegistered || b.dtCreated || 0).getTime();
        const timeA = new Date(a.dtRegistered || a.dtCreated || 0).getTime();
        return timeB - timeA;
      })
      .slice(0, 6);
  }, [deals]);

  // Simple Search Filters for Dashboard Modals
  const [registeredSearch, setRegisteredSearch] = useState('');
  const [expiredSearch, setExpiredSearch] = useState('');
  const [brandDealSearch, setBrandDealSearch] = useState('');

  const filteredRegisteredDeals = useMemo(() => {
    if (!registeredSearch.trim()) return registeredDealsList;
    const q = registeredSearch.toLowerCase().trim();
    return registeredDealsList.filter((d) => {
      const reg = (d.dealRegID || '').toLowerCase();
      const cust = (d.custName || '').toLowerCase();
      const proj = (d.ProjectName || d.projectName || '').toLowerCase();
      const brand = (d.brand || '').toLowerCase();
      const bu = (d.BU || d.bu || '').toLowerCase();
      const ao = (d.AssignedAO || d.assignedAO || '').toLowerCase();
      const rem = (d.remarks || '').toLowerCase();
      return reg.includes(q) || cust.includes(q) || proj.includes(q) || brand.includes(q) || bu.includes(q) || ao.includes(q) || rem.includes(q);
    });
  }, [registeredDealsList, registeredSearch]);

  const filteredExpiredDeals = useMemo(() => {
    if (!expiredSearch.trim()) return expiredDealsList;
    const q = expiredSearch.toLowerCase().trim();
    return expiredDealsList.filter((d) => {
      const reg = (d.dealRegID || '').toLowerCase();
      const cust = (d.custName || '').toLowerCase();
      const proj = (d.ProjectName || d.projectName || '').toLowerCase();
      const brand = (d.brand || '').toLowerCase();
      const bu = (d.BU || d.bu || '').toLowerCase();
      const ao = (d.AssignedAO || d.assignedAO || '').toLowerCase();
      const rem = (d.remarks || '').toLowerCase();
      return reg.includes(q) || cust.includes(q) || proj.includes(q) || brand.includes(q) || bu.includes(q) || ao.includes(q) || rem.includes(q);
    });
  }, [expiredDealsList, expiredSearch]);

  const brandDealsList = useMemo(() => {
    if (!selectedBrandForDeals) return [];
    return deals.filter(
      (d) => normalizeBrandName(d.brand).toLowerCase() === selectedBrandForDeals.toLowerCase()
    );
  }, [deals, selectedBrandForDeals]);

  const filteredBrandDeals = useMemo(() => {
    if (!brandDealSearch.trim()) return brandDealsList;
    const q = brandDealSearch.toLowerCase().trim();
    return brandDealsList.filter((d) => {
      const reg = (d.dealRegID || '').toLowerCase();
      const cust = (d.custName || '').toLowerCase();
      const proj = (d.ProjectName || d.projectName || '').toLowerCase();
      const bu = (d.BU || d.bu || '').toLowerCase();
      const ao = (d.AssignedAO || d.assignedAO || '').toLowerCase();
      const rem = (d.remarks || '').toLowerCase();
      return reg.includes(q) || cust.includes(q) || proj.includes(q) || bu.includes(q) || ao.includes(q) || rem.includes(q);
    });
  }, [brandDealsList, brandDealSearch]);

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-7 rounded-2xl bg-gradient-to-tr from-primary to-slate-800 text-white shadow-md overflow-hidden">
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {status === 'loading' ? (
              <div className="flex items-center gap-2">
                <div className="shimmer-skeleton h-5 w-36 rounded-full bg-white/20" />
                <div className="shimmer-skeleton h-5 w-44 rounded-full bg-white/10" />
              </div>
            ) : (
              <>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 text-white backdrop-blur-sm flex items-center gap-1 border border-white/25 max-w-full">
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Welcome back, {accountName || 'Administrator'}</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-white border border-white/20 max-w-full truncate">
                  {getRoleHeaderLabel()}
                </span>
              </>
            )}
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

      {/* 6 Core Clickable KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 sm:gap-4">
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
                  <span className="truncate">Active registered</span>
                </div>
                <span className="text-[10px] text-muted group-hover:text-emerald-600 transition font-medium">Click &rarr;</span>
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
            <span className="truncate group-hover:text-rose-500 transition">Expired this Month</span>
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
                <span>Requires WTN</span>
                <span className="text-[10px] text-rose-500 font-bold group-hover:underline transition">Click &rarr;</span>
              </div>
            </>
          )}
        </AppCard>

        {/* KPI 3: Total Renewed Deals (Clickable) */}
        <AppCard
          onClick={() => setIsRenewedModalOpen(true)}
          className="p-4 sm:p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs min-w-0 overflow-hidden cursor-pointer hover:border-emerald-500/50 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between text-muted text-xs font-semibold gap-2">
            <span className="truncate group-hover:text-emerald-500 transition">Renewed Deals</span>
            <RefreshCw className="w-4 h-4 text-emerald-500 shrink-0" />
          </div>
          {loading ? (
            <div className="space-y-2 mt-2">
              <div className="shimmer-skeleton h-8 w-20 rounded-md" />
              <div className="shimmer-skeleton h-3.5 w-32 rounded" />
            </div>
          ) : (
            <>
              <div className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-2 font-mono truncate">
                {totalRenewedCount}
              </div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center justify-between truncate">
                <div className="flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 shrink-0" />
                  <span className="truncate">Active renewals</span>
                </div>
                <span className="text-[10px] text-muted group-hover:text-emerald-600 transition font-medium">Click &rarr;</span>
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
            <span className="truncate group-hover:text-sky-500 transition">Active Brands</span>
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
                {brandDistributionList.length}
              </div>
              <div className="text-[11px] text-sky-600 font-semibold mt-1 truncate flex items-center justify-between">
                <span>Top: {brandDistributionList[0]?.brand || 'DELL'}</span>
                <span className="text-[10px] text-muted group-hover:text-sky-600 transition font-medium">Click &rarr;</span>
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
            <span className="truncate group-hover:text-indigo-500 transition">Business Units</span>
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
                {OFFICIAL_REGISTERED_BUS.length}
              </div>
              <div className="text-[11px] text-indigo-600 font-semibold mt-1 truncate flex items-center justify-between">
                <span>+{totalOthersCount} in Other Units</span>
                <span className="text-[10px] text-muted group-hover:text-indigo-600 transition font-medium">Click &rarr;</span>
              </div>
            </>
          )}
        </AppCard>

        {/* KPI 5: Lost Deal Review Studio (Clickable) */}
        <AppCard
          onClick={() => setIsLostModalOpen(true)}
          className="p-4 sm:p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs min-w-0 overflow-hidden cursor-pointer hover:border-amber-500/50 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between text-muted text-xs font-semibold gap-2">
            <span className="truncate group-hover:text-amber-500 transition">Lost Deal Review</span>
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
          </div>
          {loading ? (
            <div className="space-y-2 mt-2">
              <div className="shimmer-skeleton h-8 w-16 rounded-md" />
              <div className="shimmer-skeleton h-3.5 w-40 rounded" />
            </div>
          ) : (
            <>
              <div className="text-2xl sm:text-3xl font-bold text-amber-600 mt-2 font-mono truncate">
                {lostDealsList.length}
              </div>
              <div className="text-[11px] text-amber-600 font-semibold mt-1 truncate flex items-center justify-between">
                <span>Competitor Intel</span>
                <span className="text-[10px] text-muted group-hover:text-amber-600 transition font-medium">Click &rarr;</span>
              </div>
            </>
          )}
        </AppCard>
      </div>

      {/* Recent Deals Pipeline */}
      <AppCard className="p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <h2 className="font-bold text-sm text-foreground">Recent Deals Pipeline</h2>
          </div>
          <Link
            href="/deals"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <span>View All Registry Deals</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {loading ? (
            [1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-3 rounded-xl bg-neutral/40 border border-border/40 space-y-2">
                <div className="shimmer-skeleton h-3.5 w-16 rounded" />
                <div className="shimmer-skeleton h-4 w-28 rounded" />
                <div className="shimmer-skeleton h-3.5 w-20 rounded" />
              </div>
            ))
          ) : recentDeals.length === 0 ? (
            <div className="col-span-full py-6 text-center text-xs text-muted">
              No recent deals found for this date range.
            </div>
          ) : (
            recentDeals.map((deal) => (
              <Link
                key={deal.dealID}
                href={`/deals/${deal.dealID}`}
                className="p-3 rounded-xl bg-background border border-border/70 hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between space-y-2 group"
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 truncate max-w-[90px]">
                    {deal.brand || 'General'}
                  </span>
                  <span className="text-[10px] font-mono text-muted truncate">
                    {deal.dealRegID || `#${deal.dealID}`}
                  </span>
                </div>

                <div className="space-y-0.5 min-w-0">
                  <div className="text-xs font-bold text-foreground group-hover:text-primary transition truncate" title={deal.ProjectName || deal.projectName || 'Project'}>
                    {deal.ProjectName || deal.projectName || 'Project'}
                  </div>
                  <div className="text-[11px] text-muted truncate" title={deal.custName || ''}>
                    {deal.custName || 'Customer'}
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                  <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 truncate">
                    {formatAmounts(deal)}
                  </span>
                  <ArrowRight className="w-3 h-3 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition" />
                </div>
              </Link>
            ))
          )}
        </div>
      </AppCard>

      {/* Distribution Section: Brand Breakdown and BU Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Deals per Brand */}
        <AppCard className="p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-sky-600" />
                <h2 className="font-bold text-sm text-foreground">Deals Distribution by Brand</h2>
              </div>
              <span className="text-xs text-muted font-medium">
                {brandDistributionList.length} Brands • {deals.length} deals
              </span>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {loading ? (
                [100, 75, 50, 25, 10].map((w, i) => (
                  <div key={i} className="space-y-1.5 p-2 rounded-xl bg-neutral/30">
                    <div className="flex items-center justify-between">
                      <div className="shimmer-skeleton h-3.5 w-16 rounded" />
                      <div className="shimmer-skeleton h-3.5 w-24 rounded" />
                    </div>
                    <div className="w-full h-2 bg-neutral rounded-full overflow-hidden border border-border/40">
                      <div className="shimmer-skeleton h-full rounded-full" style={{ width: `${w}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                brandDistributionList.slice(0, 10).map((item, idx) => {
                  const percentage = deals.length > 0 ? Math.round((item.count / deals.length) * 100) : 0;
                  return (
                    <div
                      key={item.brand}
                      onClick={() => {
                        setSelectedBrandForDeals(item.brand);
                        setIsBrandDealsModalOpen(true);
                      }}
                      className="space-y-1.5 p-2.5 rounded-xl border border-transparent hover:border-sky-500/30 hover:bg-sky-500/5 cursor-pointer transition-all duration-200 group"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[10px] font-mono font-bold text-muted w-4 shrink-0">#{idx + 1}</span>
                          <span className="font-bold text-foreground group-hover:text-sky-600 transition truncate">{item.brand}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-muted shrink-0">
                          <span className="text-foreground/90 font-medium">
                            PHP {item.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                          <span className="text-[11px] text-muted">
                            ({item.count} • {percentage}%)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] font-medium flex-wrap">
                        <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                          Active: <strong className="font-bold">{item.activeCount}</strong>
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Approved: <strong className="font-bold">{item.approvedCount}</strong>
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          Waiting: <strong className="font-bold">{item.waitingCount}</strong>
                        </span>
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

          {!loading && brandDistributionList.length > 0 && (
            <div className="pt-3 border-t border-border/40 flex items-center justify-between">
              <span className="text-[11px] text-muted font-medium">
                Showing top 10 of {brandDistributionList.length} brands
              </span>
              <button
                type="button"
                onClick={() => setIsBrandModalOpen(true)}
                className="text-xs font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 flex items-center gap-1 hover:underline transition"
              >
                <span>See all</span>
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
              <span className="text-xs text-muted font-medium">7 Registered BUs + Others</span>
            </div>

            {/* Quick BU KPI Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {loading ? (
                [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
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
                  {officialBUsList.slice(0, 7).map(([bu, count]) => {
                    const percentage = deals.length > 0 ? Math.round((count / deals.length) * 100) : 0;
                    const buThemeMap: Record<string, { bg: string; text: string; border: string; bar: string }> = {
                      BU1: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30', bar: 'from-emerald-500 to-teal-600' },
                      BU2: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30', bar: 'from-blue-500 to-indigo-600' },
                      BU3: { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-500/30', bar: 'from-violet-500 to-purple-600' },
                      BU4: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30', bar: 'from-amber-500 to-orange-600' },
                      BU5: { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-500/30', bar: 'from-sky-500 to-cyan-600' },
                      BU6: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/30', bar: 'from-rose-500 to-pink-600' },
                      BU8: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/30', bar: 'from-purple-500 to-indigo-600' },
                      BU10: { bg: 'bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-500/30', bar: 'from-cyan-500 to-blue-600' },
                      BU12: { bg: 'bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-500/30', bar: 'from-teal-500 to-emerald-600' },
                      CE01: { bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/30', bar: 'from-indigo-500 to-violet-600' },
                      HQ: { bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/30', bar: 'from-indigo-500 to-blue-600' },
                    };
                    const theme = buThemeMap[bu] || { bg: 'bg-zinc-500/10', text: 'text-zinc-600 dark:text-zinc-400', border: 'border-zinc-500/30', bar: 'from-zinc-500 to-slate-600' };

                    return (
                      <Link
                        href={`/deals?search=${encodeURIComponent(bu)}`}
                        key={bu}
                        className="p-2.5 rounded-xl bg-card-bg border border-border/70 hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between space-y-1.5 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${theme.bg} ${theme.text} ${theme.border}`}>
                            {bu}
                          </span>
                          <span className="text-xs font-mono font-bold text-foreground group-hover:text-primary transition">{count}</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-muted">
                            <span>{percentage}% share</span>
                            <span className="group-hover:text-primary transition font-medium">View &rarr;</span>
                          </div>
                          <div className="w-full h-1.5 bg-neutral rounded-full overflow-hidden">
                            <div className={`h-full bg-gradient-to-r ${theme.bar} rounded-full`} style={{ width: `${Math.max(percentage, 6)}%` }} />
                          </div>
                        </div>
                      </Link>
                    );
                  })}

                  {/* Others / Legacy Clickable Tile */}
                  <div
                    onClick={() => setIsOtherBUModalOpen(true)}
                    className="p-2.5 rounded-xl bg-card-bg border border-border/70 hover:border-indigo-500/50 hover:bg-indigo-500/5 cursor-pointer flex flex-col justify-between transition group shadow-xs hover:shadow-md space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-lg border text-indigo-600 dark:text-indigo-400 bg-indigo-500/15 border-indigo-500/30">
                        Others
                      </span>
                      <span className="text-xs font-mono font-bold text-foreground group-hover:text-indigo-600 transition">
                        {totalOthersCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold pt-1">
                      <span>View details</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* BU Deep-Dive Performance List */}
            <div className="pt-2 border-t border-border/50 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted font-semibold px-1">
                <span>Top Business Units Pipeline Breakdown</span>
                <span>Revenue & Status Distribution</span>
              </div>

              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {buDistributionList.slice(0, 8).map((item, idx) => {
                  const percentage = deals.length > 0 ? Math.round((item.count / deals.length) * 100) : 0;
                  const buThemeMap: Record<string, { bg: string; text: string; border: string; bar: string }> = {
                    BU1: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30', bar: 'from-emerald-500 to-teal-600' },
                    BU2: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30', bar: 'from-blue-500 to-indigo-600' },
                    BU3: { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-500/30', bar: 'from-violet-500 to-purple-600' },
                    BU4: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30', bar: 'from-amber-500 to-orange-600' },
                    BU5: { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-500/30', bar: 'from-sky-500 to-cyan-600' },
                    BU6: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/30', bar: 'from-rose-500 to-pink-600' },
                    BU8: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/30', bar: 'from-purple-500 to-indigo-600' },
                    BU10: { bg: 'bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-500/30', bar: 'from-cyan-500 to-blue-600' },
                    BU12: { bg: 'bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-500/30', bar: 'from-teal-500 to-emerald-600' },
                    CE01: { bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/30', bar: 'from-indigo-500 to-violet-600' },
                    HQ: { bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/30', bar: 'from-indigo-500 to-blue-600' },
                  };
                  const theme = buThemeMap[item.bu] || { bg: 'bg-zinc-500/10', text: 'text-zinc-600 dark:text-zinc-400', border: 'border-zinc-500/30', bar: 'from-zinc-500 to-slate-600' };

                  return (
                    <Link
                      key={item.bu}
                      href={`/deals?search=${encodeURIComponent(item.bu)}`}
                      className="block space-y-1.5 p-2.5 rounded-xl border border-border/40 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all group"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-mono font-bold text-muted w-4 shrink-0">#{idx + 1}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${theme.bg} ${theme.text} ${theme.border}`}>
                            {item.bu}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-muted shrink-0">
                          <span className="text-foreground/90 font-medium">
                            PHP {item.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                          <span className="text-[11px] text-muted">
                            ({item.count} • {percentage}%)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] font-medium flex-wrap">
                        <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                          Active: <strong className="font-bold">{item.activeCount}</strong>
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Approved: <strong className="font-bold">{item.approvedCount}</strong>
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          Waiting: <strong className="font-bold">{item.waitingCount}</strong>
                        </span>
                      </div>

                      <div className="w-full h-1.5 bg-neutral rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${theme.bar} rounded-full transition-all duration-500`}
                          style={{ width: `${Math.max(percentage, 4)}%` }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </AppCard>
      </div>

      {/* Complete Brands Distribution Modal */}
      <AppModal
        open={isBrandModalOpen}
        onClose={() => {
          setIsBrandModalOpen(false);
          setBrandSearchInput('');
          setDebouncedBrandSearch('');
        }}
        width={1160}
      >
        <AppModal.Header>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <AppModal.Title>Partner Brands Distribution & Status Breakdown</AppModal.Title>
              <AppModal.Description>
                Breakdown of active partner brands with Active, Approved, and Waiting pipeline metrics.
              </AppModal.Description>
            </div>
          </div>
        </AppModal.Header>

        <AppModal.Body className="space-y-3 pt-3">
          <div className="relative">
            <AppInput
              prefix={<Search className="w-4 h-4 text-muted" />}
              placeholder="Search brands (e.g. HPI, HPE, DELL, CISCO)..."
              value={brandSearchInput}
              onChange={(e: any) => setBrandSearchInput(e.target.value)}
              allowClear
              size="md"
            />
          </div>

          <div className="border border-border/70 rounded-xl overflow-hidden shadow-xs bg-background">
            <div className="max-h-[380px] overflow-y-auto overflow-x-hidden">
              <table className="w-full table-fixed text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-neutral/90 backdrop-blur-xs border-b border-border/60 text-[11px] font-semibold text-muted uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 w-[26%]">Brand</th>
                    <th className="py-2.5 px-2 text-center text-sky-600 dark:text-sky-400 w-[10%]">Active</th>
                    <th className="py-2.5 px-2 text-center text-emerald-600 dark:text-emerald-400 w-[10%]">Approved</th>
                    <th className="py-2.5 px-2 text-center text-amber-600 dark:text-amber-400 w-[10%]">Waiting</th>
                    <th className="py-2.5 px-3 text-center w-[16%]">Total Deals</th>
                    <th className="py-2.5 px-3 text-right w-[22%]">Pipeline Value</th>
                    <th className="py-2.5 px-2 text-center w-[6%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {isSearchingBrand ? (
                    [0, 1, 2, 3, 4].map((i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="p-3"><div className="shimmer-skeleton h-3.5 w-24 rounded" /></td>
                        <td className="p-3 text-center"><div className="shimmer-skeleton h-3.5 w-8 rounded mx-auto" /></td>
                        <td className="p-3 text-center"><div className="shimmer-skeleton h-3.5 w-8 rounded mx-auto" /></td>
                        <td className="p-3 text-center"><div className="shimmer-skeleton h-3.5 w-8 rounded mx-auto" /></td>
                        <td className="p-3 text-center"><div className="shimmer-skeleton h-3.5 w-12 rounded mx-auto" /></td>
                        <td className="p-3 text-right"><div className="shimmer-skeleton h-3.5 w-20 rounded ml-auto" /></td>
                        <td className="p-3"></td>
                      </tr>
                    ))
                  ) : filteredBrandsInModal.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted text-xs">
                        <Tag className="w-6 h-6 mx-auto text-muted/50 mb-1.5" />
                        <p className="font-semibold text-foreground">No matching brands found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredBrandsInModal.map((item, idx) => {
                      const percentage = deals.length > 0 ? ((item.count / deals.length) * 100).toFixed(1) : '0';

                      return (
                        <tr
                          key={item.brand}
                          onClick={() => {
                            setIsBrandModalOpen(false);
                            setSelectedBrandForDeals(item.brand);
                            setIsBrandDealsModalOpen(true);
                          }}
                          className="hover:bg-neutral/40 transition group cursor-pointer"
                        >
                          <td className="py-2.5 px-3 font-semibold text-foreground truncate">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono font-bold text-muted w-4 shrink-0">#{idx + 1}</span>
                              <span className="font-bold text-foreground group-hover:text-primary transition truncate">{item.brand}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold border border-sky-500/20 font-mono text-[11px]">
                              {item.activeCount}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 font-mono text-[11px]">
                              {item.approvedCount}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20 font-mono text-[11px]">
                              {item.waitingCount}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">
                            <span className="font-semibold text-foreground">{item.count}</span>
                            <span className="text-[10px] text-muted ml-1">({percentage}%)</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground truncate">
                            PHP {item.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className="p-1 text-muted hover:text-sky-600 rounded transition inline-flex items-center">
                              <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </AppModal.Body>

        <AppModal.Footer className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-muted">
            Showing {filteredBrandsInModal.length} of {brandDistributionList.length} brands
          </span>
          <div className="flex items-center gap-2">
            <Link
              href="/reports?view=brands"
              onClick={() => setIsBrandModalOpen(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 text-xs font-semibold rounded-lg border border-sky-500/30 transition shadow-xs"
            >
              <span>Open in Reports Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
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
          </div>
        </AppModal.Footer>
      </AppModal>

      {/* Clickable Brand Deals Overview Modal */}
      <AppModal
        open={isBrandDealsModalOpen}
        onClose={() => {
          setIsBrandDealsModalOpen(false);
          setSelectedBrandForDeals(null);
          setBrandDealSearch('');
        }}
        width={1160}
      >
        <AppModal.Header>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 shrink-0">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <AppModal.Title>{selectedBrandForDeals || 'Brand'} Deals Overview</AppModal.Title>
              <AppModal.Description>
                Register of all deals under {selectedBrandForDeals} across business units and account officers.
              </AppModal.Description>
            </div>
          </div>
        </AppModal.Header>

        <AppModal.Body className="space-y-3 pt-3">
          <div className="relative">
            <AppInput
              prefix={<Search className="w-4 h-4 text-muted" />}
              placeholder={`Search ${selectedBrandForDeals || ''} deals by Customer, Project, Ref ID, BU, AO, Remarks...`}
              value={brandDealSearch}
              onChange={(e: any) => setBrandDealSearch(e.target.value)}
              allowClear
              size="md"
            />
          </div>

          <ModalDealTable
            deals={filteredBrandDeals}
            onCloseModal={() => {
              setIsBrandDealsModalOpen(false);
              setSelectedBrandForDeals(null);
            }}
          />
        </AppModal.Body>

        <AppModal.Footer className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-muted">
            Showing {filteredBrandDeals.length} of {brandDealsList.length} deals for {selectedBrandForDeals}
          </span>
          <div className="flex items-center gap-2">
            <Link
              href={`/reports?view=brands&brand=${encodeURIComponent(selectedBrandForDeals || '')}`}
              onClick={() => setIsBrandDealsModalOpen(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 text-xs font-semibold rounded-lg border border-sky-500/30 transition shadow-xs"
            >
              <span>Open in Reports Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <AppButton
              variant="neutral"
              size="sm"
              onClick={() => {
                setIsBrandDealsModalOpen(false);
                setSelectedBrandForDeals(null);
                setBrandDealSearch('');
              }}
            >
              Close
            </AppButton>
          </div>
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
        width={1160}
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
            <div className="border border-border/60 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto overflow-x-hidden divide-y divide-border/40">
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
          <div className="flex items-center gap-2">
            <Link
              href="/reports?view=bus"
              onClick={() => setIsOtherBUModalOpen(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 text-xs font-semibold rounded-lg border border-indigo-500/30 transition shadow-xs"
            >
              <span>Open in Reports Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
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
          </div>
        </AppModal.Footer>
      </AppModal>

      {/* Registered Deals Modal Drilldown */}
      <AppModal
        open={isRegisteredModalOpen}
        onClose={() => {
          setIsRegisteredModalOpen(false);
          setRegisteredSearch('');
        }}
        width={1160}
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

        <AppModal.Body className="space-y-4">
          <div className="relative">
            <AppInput
              prefix={<Search className="w-4 h-4 text-muted" />}
              placeholder="Search registered deals by Project, Customer, Reg ID, Brand, BU, AO, Remarks..."
              value={registeredSearch}
              onChange={(e: any) => setRegisteredSearch(e.target.value)}
              allowClear
              size="md"
            />
          </div>

          <ModalDealTable
            deals={filteredRegisteredDeals}
            onCloseModal={() => setIsRegisteredModalOpen(false)}
          />
        </AppModal.Body>

        <AppModal.Footer className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-muted">
            Showing {filteredRegisteredDeals.length} of {registeredDealsList.length} registered deals
          </span>
          <div className="flex items-center gap-2">
            <Link
              href="/reports?view=registered"
              onClick={() => setIsRegisteredModalOpen(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs font-semibold rounded-lg border border-emerald-500/30 transition shadow-xs"
            >
              <span>Open in Reports Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <AppButton
              variant="neutral"
              size="sm"
              onClick={() => {
                setIsRegisteredModalOpen(false);
                setRegisteredSearch('');
              }}
            >
              Close
            </AppButton>
          </div>
        </AppModal.Footer>
      </AppModal>

      {/* Expired Deals Modal Drilldown */}
      <AppModal
        open={isExpiredModalOpen}
        onClose={() => {
          setIsExpiredModalOpen(false);
          setExpiredSearch('');
        }}
        width={1160}
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

        <AppModal.Body className="space-y-4">
          <div className="relative">
            <AppInput
              prefix={<Search className="w-4 h-4 text-muted" />}
              placeholder="Search expired deals by Project, Customer, Reg ID, BU, AO, Remarks..."
              value={expiredSearch}
              onChange={(e: any) => setExpiredSearch(e.target.value)}
              allowClear
              size="md"
            />
          </div>

          <ModalDealTable
            deals={filteredExpiredDeals}
            onCloseModal={() => setIsExpiredModalOpen(false)}
          />
        </AppModal.Body>

        <AppModal.Footer className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-muted">
            Showing {filteredExpiredDeals.length} of {expiredDealsList.length} expired deals
          </span>
          <div className="flex items-center gap-2">
            <Link
              href="/reports?view=expired"
              onClick={() => setIsExpiredModalOpen(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 text-xs font-semibold rounded-lg border border-rose-500/30 transition shadow-xs"
            >
              <span>Open in Reports Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <AppButton
              variant="neutral"
              size="sm"
              onClick={() => {
                setIsExpiredModalOpen(false);
                setExpiredSearch('');
              }}
            >
              Close
            </AppButton>
          </div>
        </AppModal.Footer>
      </AppModal>

      {/* Renewed Deals Overview Modal Drilldown */}
      <AppModal
        open={isRenewedModalOpen}
        onClose={() => {
          setIsRenewedModalOpen(false);
          setRenewedSearch('');
        }}
        width={1160}
      >
        <AppModal.Header>
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-emerald-500" />
            <div>
              <AppModal.Title>Renewed Deals Directory ({filteredRenewedDeals.length})</AppModal.Title>
              <AppModal.Description>
                Overview of all deal registrations with processed validity extensions and renewal records.
              </AppModal.Description>
            </div>
          </div>
        </AppModal.Header>

        <AppModal.Body className="space-y-4">
          <div className="relative">
            <AppInput
              prefix={<Search className="w-4 h-4 text-muted" />}
              placeholder="Search renewed deals by Project, Customer, Reg ID, BU, Brand..."
              value={renewedSearch}
              onChange={(e: any) => setRenewedSearch(e.target.value)}
              allowClear
              size="md"
            />
          </div>

          <ModalDealTable
            deals={filteredRenewedDeals}
            onCloseModal={() => setIsRenewedModalOpen(false)}
          />
        </AppModal.Body>

        <AppModal.Footer className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-muted">
            Showing {filteredRenewedDeals.length} of {renewedDealsList.length} renewed deals
          </span>
          <div className="flex items-center gap-2">
            <Link
              href="/reports?view=renewed"
              onClick={() => setIsRenewedModalOpen(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs font-semibold rounded-lg border border-emerald-500/30 transition shadow-xs"
            >
              <span>Open in Reports Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <AppButton
              variant="neutral"
              size="sm"
              onClick={() => {
                setIsRenewedModalOpen(false);
                setRenewedSearch('');
              }}
            >
              Close
            </AppButton>
          </div>
        </AppModal.Footer>
      </AppModal>

      {/* Lost Deals Competitor Intel Modal */}
      <DealLostListModal
        isOpen={isLostModalOpen}
        onClose={() => setIsLostModalOpen(false)}
        deals={deals}
        loading={loading}
      />
    </div>
  );
}
