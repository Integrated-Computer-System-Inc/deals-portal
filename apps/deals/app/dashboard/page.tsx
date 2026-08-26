'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
import { OFFICIAL_REGISTERED_BUS, normalizeBU, isOfficialBU } from '@/lib/buUtils';
import { formatDateLong } from '@/components/utils/time';

const DealLostListModal = dynamic(() => import('@/components/DealLostListModal'), { ssr: false });
const ModalDealTable = dynamic(
  () => import('@/components/ModalDealTable').then((mod) => mod.ModalDealTable),
  { ssr: false }
);

export default function DashboardPage() {
  const router = useRouter();
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

  // Clickable Brand Overview Modal States
  const [selectedBrandForDeals, setSelectedBrandForDeals] = useState<string | null>(null);
  const [isBrandDealsModalOpen, setIsBrandDealsModalOpen] = useState(false);
  const role: UserRole = (session?.user as any)?.role || 'admin';
  const accountName = (session?.user as any)?.AccountName || (session?.user as any)?.name || '';
  const accountGroup = (session?.user as any)?.AccountGroup || 'HQ';
  const assignedBUs = ((session?.user as any)?.assignedBUs as string[]) || [];

  const scopedFilter = useCurrentUserFilter();
  const { data: allDeals = [], isLoading: loading } = useDealsQuery(scopedFilter);
  const { data: metrics } = useDashboardQuery();

  // Apply Date Range Filter & strictly Official BU Filter to deals
  const deals = useMemo(() => {
    return allDeals
      .filter((d: DealHeaderRecord) => isOfficialBU(d.BU || d.bu))
      .filter((d: DealHeaderRecord) =>
        filterDealByDateRange(d.dtRegistered || d.dtCreated, dateRange)
      );
  }, [allDeals, dateRange]);

  // Filter official BUs for BU Heads and AOs so unassigned BUs are never shown
  const visibleOfficialBUs = useMemo(() => {
    if (role === 'bu' || role === 'bu_admin') {
      if (assignedBUs.length > 0) {
        const normalizedAssigned = assignedBUs.map((b) => normalizeBU(b));
        const filtered = OFFICIAL_REGISTERED_BUS.filter((bu) => normalizedAssigned.includes(bu));
        if (filtered.length > 0) return filtered;
      }
      // Fallback to BUs present in deals
      const activeBUs = Array.from(new Set(deals.map((d) => normalizeBU(d.BU || d.bu || '')).filter(Boolean)));
      const filtered = OFFICIAL_REGISTERED_BUS.filter((bu) => activeBUs.includes(bu));
      return filtered.length > 0 ? filtered : [...OFFICIAL_REGISTERED_BUS];
    }

    if (role === 'ao') {
      const activeBUs = Array.from(new Set(deals.map((d) => normalizeBU(d.BU || d.bu || '')).filter(Boolean)));
      const filtered = OFFICIAL_REGISTERED_BUS.filter((bu) => activeBUs.includes(bu));
      return filtered.length > 0 ? filtered : [...OFFICIAL_REGISTERED_BUS];
    }

    return [...OFFICIAL_REGISTERED_BUS];
  }, [role, assignedBUs, deals]);

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

  // Deals per Brand breakdown (strictly official BUs)
  const brandDistributionList = useMemo(() => {
    return calculateBrandDistribution(deals);
  }, [deals]);

  // Detailed BU distribution list with status breakdown & revenue metrics (strictly scoped official BUs)
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

    visibleOfficialBUs.forEach((bu) => {
      map[bu] = {
        bu,
        count: 0,
        totalValue: 0,
        activeCount: 0,
        approvedCount: 0,
        waitingCount: 0,
        lostCount: 0,
      };
    });

    deals.forEach((d: DealHeaderRecord) => {
      const rawBu = normalizeBU(d.BU || d.bu || '');
      if (!visibleOfficialBUs.includes(rawBu as any)) return;

      const amt = d.items?.reduce((sum: number, item: any) => sum + (Number(item.totalAmt) || 0), 0) || 0;
      const statusNum = Number(d.dealStatus);

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
  }, [deals, visibleOfficialBUs]);

  // Calculate official BUs breakdown
  const officialBUsList = useMemo(() => {
    const officialCounts: Record<string, number> = {};
    visibleOfficialBUs.forEach((bu) => {
      officialCounts[bu] = 0;
    });

    deals.forEach((d: DealHeaderRecord) => {
      const rawBu = normalizeBU(d.BU || d.bu || '');
      if (visibleOfficialBUs.includes(rawBu as any)) {
        officialCounts[rawBu] = (officialCounts[rawBu] || 0) + 1;
      }
    });

    return visibleOfficialBUs.map((bu) => [bu, officialCounts[bu]] as [string, number]);
  }, [deals, visibleOfficialBUs]);

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

        {/* KPI 4: Business Units Covered */}
        <AppCard
          className="p-4 sm:p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs min-w-0 overflow-hidden"
        >
          <div className="flex items-center justify-between text-muted text-xs font-semibold gap-2">
            <span className="truncate">
              {role === 'bu' || role === 'bu_admin'
                ? 'Supervised Business Units'
                : role === 'ao'
                ? 'Assigned Business Units'
                : 'Official Business Units'}
            </span>
            <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
          </div>
          {loading ? (
            <div className="space-y-2 mt-2">
              <div className="shimmer-skeleton h-8 w-16 rounded-md" />
              <div className="shimmer-skeleton h-3.5 w-44 rounded" />
            </div>
          ) : (
            <>
              <div className="text-2xl sm:text-3xl font-bold text-foreground mt-2 font-mono truncate">
                {visibleOfficialBUs.length}
              </div>
              <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1 truncate">
                <span>{visibleOfficialBUs.join(', ')}</span>
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

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
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
                      className="space-y-1 p-2 sm:p-2.5 rounded-xl border border-transparent hover:border-sky-500/30 hover:bg-sky-500/5 cursor-pointer transition-all duration-200 group"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0 shrink-0">
                          <span className="text-[10px] font-mono font-bold text-muted w-4 shrink-0">#{idx + 1}</span>
                          <span className="font-bold text-foreground group-hover:text-sky-600 transition truncate">{item.brand}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-xs text-muted ml-auto text-right">
                          <span className="text-foreground/90 font-bold whitespace-nowrap">
                            PHP {item.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                          <span className="text-[11px] text-muted whitespace-nowrap">
                            ({item.count} • {percentage}%)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] font-medium flex-wrap">
                        <span className="px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                          Active: <strong className="font-bold">{item.activeCount}</strong>
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Approved: <strong className="font-bold">{item.approvedCount}</strong>
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          Waiting: <strong className="font-bold">{item.waitingCount}</strong>
                        </span>
                      </div>

                      <div className="w-full h-1 bg-neutral rounded-full overflow-hidden border border-border/40">
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
              <span className="text-xs text-muted font-medium">
                {role === 'bu' || role === 'bu_admin'
                  ? `${visibleOfficialBUs.length} Supervised BU${visibleOfficialBUs.length > 1 ? 's' : ''}`
                  : role === 'ao'
                  ? `${visibleOfficialBUs.length} Assigned BU${visibleOfficialBUs.length > 1 ? 's' : ''}`
                  : '7 Official Registered BUs'}
              </span>
            </div>

            {/* Quick BU KPI Matrix: 4-column responsive grid with ample breathing space */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {loading ? (
                [1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-neutral/50 border border-border/40 flex flex-col justify-between space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="shimmer-skeleton h-5 w-10 rounded" />
                      <div className="shimmer-skeleton h-5 w-12 rounded" />
                    </div>
                    <div className="shimmer-skeleton h-3 w-20 rounded" />
                  </div>
                ))
              ) : (
                officialBUsList.map(([bu, count]) => {
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
                      className="p-2 sm:p-2.5 rounded-xl bg-card-bg border border-border/70 hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between space-y-1.5 group min-w-0"
                    >
                      <div className="flex items-center justify-between gap-1 min-w-0">
                        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 ${theme.bg} ${theme.text} ${theme.border}`}>
                          {bu}
                        </span>
                        <span className="text-xs font-mono font-bold text-foreground group-hover:text-primary transition shrink-0 ml-auto">
                          {count.toLocaleString()}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1 text-[10px] text-muted">
                          <span className="whitespace-nowrap">{percentage}% share</span>
                          <span className="group-hover:text-primary transition font-medium text-[10px] shrink-0">View &rarr;</span>
                        </div>
                        <div className="w-full h-1.5 bg-neutral rounded-full overflow-hidden">
                          <div className={`h-full bg-gradient-to-r ${theme.bar} rounded-full`} style={{ width: `${Math.max(percentage, 6)}%` }} />
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>

            {/* BU Deep-Dive Performance List */}
            <div className="pt-2 border-t border-border/50 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted font-semibold px-1">
                <span>Top Business Units Pipeline Breakdown</span>
                <span>Revenue & Status Distribution</span>
              </div>

              <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                {buDistributionList.map((item, idx) => {
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
                      className="block space-y-1 p-2 sm:p-2.5 rounded-xl border border-border/40 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all group"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0 shrink-0">
                          <span className="text-[10px] font-mono font-bold text-muted w-4 shrink-0">#{idx + 1}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border shrink-0 ${theme.bg} ${theme.text} ${theme.border}`}>
                            {item.bu}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-xs text-muted ml-auto text-right">
                          <span className="text-foreground/90 font-bold whitespace-nowrap">
                            PHP {item.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                          <span className="text-[11px] text-muted whitespace-nowrap">
                            ({item.count} • {percentage}%)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] font-medium flex-wrap">
                        <span className="px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                          Active: <strong className="font-bold">{item.activeCount}</strong>
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Approved: <strong className="font-bold">{item.approvedCount}</strong>
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          Waiting: <strong className="font-bold">{item.waitingCount}</strong>
                        </span>
                      </div>

                      <div className="w-full h-1 bg-neutral rounded-full overflow-hidden">
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

      {/* SECTION: RECENT DEALS ACTIVITY STREAM (TABLE DESIGN) */}
      <AppCard className="p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <h2 className="font-bold text-sm text-foreground">Recent Deals Activity Stream</h2>
          </div>
          <Link
            href="/deals"
            className="text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 hover:underline flex items-center gap-1"
          >
            <span>View All Registry Deals</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="border border-border/70 rounded-xl overflow-hidden shadow-xs bg-background">
          <div className="max-h-[380px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse table-fixed">
              <colgroup>
                <col className="w-[30%]" />
                <col className="w-[46%]" />
                <col className="w-[24%]" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-neutral/95 backdrop-blur-xs border-b border-border/60 text-[11px] font-semibold text-muted uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Brand Deal</th>
                  <th className="py-3 px-3">Project Name</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {loading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-3.5 px-4"><div className="shimmer-skeleton h-5 w-28 rounded-md" /></td>
                      <td className="py-3.5 px-3"><div className="shimmer-skeleton h-5 w-64 rounded-md" /></td>
                      <td className="py-3.5 px-4 text-right"><div className="shimmer-skeleton h-5 w-28 ml-auto rounded-md" /></td>
                    </tr>
                  ))
                ) : recentDeals.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-xs text-muted">
                      No recent deal records found for the selected time range.
                    </td>
                  </tr>
                ) : (
                  recentDeals.map((deal) => {
                    const formattedAmt =
                      (deal as any)._computedTotal !== undefined
                        ? `PHP ${Number((deal as any)._computedTotal).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                        : formatAmounts(deal);

                    return (
                      <tr
                        key={deal.dealID}
                        onClick={() => router.push(`/deals/${deal.dealID}`)}
                        className="hover:bg-neutral/60 active:bg-neutral/80 transition-colors cursor-pointer group select-none"
                        title={`Click to open deal #${deal.dealRegID || deal.dealID}`}
                      >
                        {/* 1. Brand Deal */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="px-2.5 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-xs font-bold shrink-0">
                              {deal.brand || 'General'}
                            </span>
                            <span className="font-mono text-xs font-semibold text-muted group-hover:text-primary transition-colors truncate">
                              {deal.dealRegID || `#${deal.dealID}`}
                            </span>
                          </div>
                        </td>

                        {/* 2. Project Name */}
                        <td className="py-3.5 px-3">
                          <div className="space-y-0.5 min-w-0">
                            <div
                              className="font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors truncate"
                              title={deal.ProjectName || deal.projectName || 'Project'}
                            >
                              {deal.ProjectName || deal.projectName || 'Standard Project'}
                            </div>
                            {deal.custName && (
                              <div className="text-[11px] text-muted truncate" title={deal.custName}>
                                {deal.custName}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 3. Amount & Smooth Hover Chevron */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            <span className="font-mono font-bold text-xs sm:text-sm text-foreground truncate block">
                              {formattedAmt}
                            </span>
                            <ArrowRight className="w-4 h-4 text-muted/40 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </AppCard>

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
