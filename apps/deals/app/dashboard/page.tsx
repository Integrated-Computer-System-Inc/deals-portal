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

import { useCurrentUserFilter } from '@/hooks/useDealsQuery';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useReportDrilldownQuery } from '@/hooks/useReportsQuery';
import {
  DateRangeFilterPopover,
  DateRangeValue,
} from '@/components/DateRangeFilterPopover';
import {
  normalizeBrandName,
} from '@/lib/brandUtils';
import dynamic from 'next/dynamic';
import { OFFICIAL_REGISTERED_BUS, normalizeBU, isOfficialBU } from '@/lib/buUtils';
import { formatDateLong } from '@/components/utils/time';

const DealLostListModal = dynamic(() => import('@/components/DealLostListModal'), { ssr: false });
const ModalDealTable = dynamic(
  () => import('@/components/ModalDealTable').then((mod) => mod.ModalDealTable),
  { ssr: false }
);
import DealsSortPopover, { SortConfig } from '@/components/DealsSortPopover';

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // If opened inside Google OAuth popup, notify opener across channels and close
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isPop = window.name === 'google_oauth_popup' || Boolean(window.opener && window.opener !== window);
      if (isPop) {
        const msg = { type: 'OAUTH_SUCCESS' };
        try {
          const bc = new BroadcastChannel('deals_google_auth');
          bc.postMessage(msg);
          bc.close();
        } catch {}
        try {
          localStorage.setItem('deals_oauth_result', JSON.stringify({ msg, t: Date.now() }));
        } catch {}
        try {
          if (window.opener && window.opener !== window) {
            window.opener.postMessage(msg, window.location.origin);
          }
        } catch {}
        window.close();
        setTimeout(() => {
          window.close();
        }, 50);
      }
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
  const [isExpiringModalOpen, setIsExpiringModalOpen] = useState(false);
  const [expiringUrgencyFilter, setExpiringUrgencyFilter] = useState<'ALL' | 'CRITICAL' | 'URGENT' | 'WARNING' | 'NOTICE'>('ALL');
  const [expiringSortConfig, setExpiringSortConfig] = useState<SortConfig>({
    field: 'expDt',
    order: 'asc',
  });
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
  const assignedBrands = ((session?.user as any)?.assignedBrands as string[]) || [];

  const scopedFilter = useCurrentUserFilter();

  const dateParams = useMemo(() => ({
    preset: dateRange.preset,
    startDate: dateRange.startDate ? new Date(dateRange.startDate).toISOString().slice(0, 10) : undefined,
    endDate: dateRange.endDate ? new Date(dateRange.endDate).toISOString().slice(0, 10) : undefined,
  }), [dateRange]);

  const { metrics, loading } = useDashboardMetrics(dateParams);

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

  // Brand Distribution Sorting State for Dashboard KPI card (default: Total Amount)
  const [dashboardBrandSort, setDashboardBrandSort] = useState<'value-desc' | 'value-asc' | 'count-desc' | 'count-asc' | 'name-asc' | 'name-desc'>('value-desc');

  // Pre-aggregated Brand Distribution List from View
  const brandDistributionList = useMemo(() => {
    if (metrics?.brandMetrics && metrics.brandMetrics.length > 0) {
      let list = metrics.brandMetrics.map((b) => ({
        brand: b.brand,
        count: b.dealCount,
        totalValue: b.totalValue,
        activeCount: b.activeCount,
        approvedCount: b.approvedCount,
        waitingCount: b.waitingCount,
        lostCount: b.lostCount,
      }));
      if (role === 'pm' && assignedBrands.length > 0) {
        list = list.filter((b) => assignedBrands.includes(b.brand));
      }
      return list;
    }
    if (metrics?.dealsByBrand && metrics.dealsByBrand.length > 0) {
      return metrics.dealsByBrand.map((b) => ({
        brand: b.brand,
        count: b.count,
        totalValue: b.totalValue || 0,
        activeCount: b.count,
        approvedCount: b.count,
        waitingCount: 0,
        lostCount: 0,
      }));
    }
    return [];
  }, [metrics?.brandMetrics, metrics?.dealsByBrand, role, assignedBrands]);

  // Totals & maximums for accurate bar graphing and percentage share calculations
  const totalBrandValue = useMemo(() => {
    return brandDistributionList.reduce((acc, b) => acc + b.totalValue, 0);
  }, [brandDistributionList]);

  const totalBrandDealsCount = useMemo(() => {
    return brandDistributionList.reduce((acc, b) => acc + b.count, 0);
  }, [brandDistributionList]);

  const maxBrandValue = useMemo(() => {
    return Math.max(...brandDistributionList.map((b) => b.totalValue), 1);
  }, [brandDistributionList]);

  const maxBrandCount = useMemo(() => {
    return Math.max(...brandDistributionList.map((b) => b.count), 1);
  }, [brandDistributionList]);

  // Sorted list for Dashboard Brand card
  const sortedDashboardBrandList = useMemo(() => {
    let list = [...brandDistributionList];
    list.sort((a, b) => {
      if (dashboardBrandSort === 'value-desc') return b.totalValue - a.totalValue || b.count - a.count;
      if (dashboardBrandSort === 'value-asc') return a.totalValue - b.totalValue || a.count - b.count;
      if (dashboardBrandSort === 'count-desc') return b.count - a.count || b.totalValue - a.totalValue;
      if (dashboardBrandSort === 'count-asc') return a.count - b.count || a.totalValue - b.totalValue;
      if (dashboardBrandSort === 'name-asc') return a.brand.localeCompare(b.brand);
      if (dashboardBrandSort === 'name-desc') return b.brand.localeCompare(a.brand);
      return 0;
    });
    return list;
  }, [brandDistributionList, dashboardBrandSort]);

  // Pre-aggregated BU distribution list from View
  const buDistributionList = useMemo(() => {
    if (metrics?.buMetrics && metrics.buMetrics.length > 0) {
      return metrics.buMetrics.map((bu) => ({
        bu: bu.bu,
        count: bu.dealCount,
        totalValue: bu.totalValue,
        activeCount: bu.activeCount,
        approvedCount: bu.approvedCount,
        waitingCount: bu.waitingCount,
        lostCount: bu.lostCount,
      }));
    }
    if (metrics?.dealsByBU && metrics.dealsByBU.length > 0) {
      return metrics.dealsByBU.map((bu) => ({
        bu: bu.bu,
        count: bu.count,
        totalValue: bu.totalValue || 0,
        activeCount: bu.count,
        approvedCount: bu.count,
        waitingCount: 0,
        lostCount: 0,
      }));
    }
    return [];
  }, [metrics?.buMetrics, metrics?.dealsByBU]);

  const officialBUsList = useMemo(() => {
    return buDistributionList.map((bu) => [bu.bu, bu.count] as [string, number]);
  }, [buDistributionList]);

  const totalBUDealsCount = useMemo(() => {
    return officialBUsList.reduce((sum, [, c]) => sum + c, 0) || 1;
  }, [officialBUsList]);

  const totalOverallDealsCount = useMemo(() => {
    return metrics?.totalCount || totalBUDealsCount || 1;
  }, [metrics?.totalCount, totalBUDealsCount]);

  const visibleOfficialBUs = useMemo(() => {
    if (role === 'bu' || role === 'bu_admin') {
      if (assignedBUs.length > 0) {
        const normalizedAssigned = assignedBUs.map((b) => normalizeBU(b));
        const filtered = OFFICIAL_REGISTERED_BUS.filter((bu) => normalizedAssigned.includes(bu));
        if (filtered.length > 0) return filtered;
      }
      return [...OFFICIAL_REGISTERED_BUS];
    }
    return [...OFFICIAL_REGISTERED_BUS];
  }, [role, assignedBUs]);

  const isViewOnly = status === 'authenticated' && (role === 'bu' || role === 'bu_admin' || role === 'ao' || role === 'pm');

  const getRoleHeaderLabel = () => {
    if (role === 'ITadmin') return 'IT Administration (All BUs)';
    if (role === 'admin') return 'Sales Administration (All BUs)';
    if (role === 'pm') return 'Product Manager (Brand Scoped)';
    if (role === 'aa') return 'Sales AA (All BUs)';
    if (role === 'bu' || role === 'bu_admin') return `BU Supervisor (${accountGroup})`;
    return `Account Officer (${accountGroup})`;
  };

  const totalRegistered = metrics?.totalRegistered ?? 0;
  const expiredThisMonth = metrics?.expiredThisMonth ?? 0;
  const totalExpired = metrics?.totalExpired ?? 0;
  const totalRenewedCount = metrics?.totalRenewed ?? 0;
  const totalLostCount = metrics?.lostCount ?? 0;
  const grandTotalPipelineValue = metrics?.grandTotalPipelineValue ?? 0;

  const filteredBrandsInModal = useMemo(() => {
    if (!debouncedBrandSearch.trim()) return brandDistributionList;
    const q = debouncedBrandSearch.toLowerCase().trim();
    return brandDistributionList.filter((item) => item.brand.toLowerCase().includes(q));
  }, [brandDistributionList, debouncedBrandSearch]);

  // Expiring Deals Analytics & Urgency Breakdown
  const expiringDealsAnalytics = useMemo(() => {
    const c = metrics?.expiryRiskCounts;
    const crit = c?.criticalCount ?? 0;
    const urg = c?.urgentCount ?? 0;
    const warn = c?.warningCount ?? 0;
    const noti = c?.noticeCount ?? 0;
    return {
      totalCount: c?.totalAtRisk ?? 0,
      criticalCount: crit,
      urgentCount: urg,
      warningCount: warn,
      noticeCount: noti,
    };
  }, [metrics?.expiryRiskCounts]);

  const recentDeals = useMemo(() => {
    return metrics?.recentDeals || [];
  }, [metrics?.recentDeals]);

  const formatAmounts = (deal: any) => {
    if (deal.aggregatedTotals && Object.keys(deal.aggregatedTotals).length > 0) {
      return Object.entries(deal.aggregatedTotals)
        .map(([curr, amt]: [string, any]) => `${curr} ${Number(amt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
        .join(' | ');
    }
    if (deal.TotalAmount !== undefined && deal.TotalAmount !== null) {
      return `PHP ${Number(deal.TotalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return 'PHP 0.00';
  };

  // Search & Pagination States for Server-Paginated Modals
  const [registeredSearch, setRegisteredSearch] = useState('');
  const [regPage, setRegPage] = useState(1);

  const [expiredSearch, setExpiredSearch] = useState('');
  const [expPage, setExpPage] = useState(1);

  const [renewedSearch, setRenewedSearch] = useState('');
  const [renPage, setRenPage] = useState(1);

  const [expiringSearch, setExpiringSearch] = useState('');
  const [expiringPage, setExpiringPage] = useState(1);

  const [brandDealSearch, setBrandDealSearch] = useState('');
  const [brandDealsPage, setBrandDealsPage] = useState(1);

  // Server-side Drilldown Queries (Active on-demand only when modal is open)
  const { data: regDrilldown, isLoading: regLoading } = useReportDrilldownQuery({
    type: 'registered',
    page: regPage,
    pageSize: 50,
    searchQuery: registeredSearch,
    preset: dateRange.preset,
    startDate: dateParams.startDate,
    endDate: dateParams.endDate,
    filter: scopedFilter,
    enabled: isRegisteredModalOpen,
  });

  const { data: expDrilldown, isLoading: expLoading } = useReportDrilldownQuery({
    type: 'expired',
    page: expPage,
    pageSize: 50,
    searchQuery: expiredSearch,
    preset: dateRange.preset,
    startDate: dateParams.startDate,
    endDate: dateParams.endDate,
    filter: scopedFilter,
    enabled: isExpiredModalOpen,
  });

  const { data: renDrilldown, isLoading: renLoading } = useReportDrilldownQuery({
    type: 'renewed',
    page: renPage,
    pageSize: 50,
    searchQuery: renewedSearch,
    preset: dateRange.preset,
    startDate: dateParams.startDate,
    endDate: dateParams.endDate,
    filter: scopedFilter,
    enabled: isRenewedModalOpen,
  });

  const { data: expiringDrilldown, isLoading: expiringLoading } = useReportDrilldownQuery({
    type: 'expiring',
    urgency: expiringUrgencyFilter,
    page: expiringPage,
    pageSize: 50,
    searchQuery: expiringSearch,
    filter: scopedFilter,
    enabled: isExpiringModalOpen,
  });

  const { data: brandDrilldown, isLoading: brandLoading } = useReportDrilldownQuery({
    type: 'brand',
    value: selectedBrandForDeals || undefined,
    page: brandDealsPage,
    pageSize: 50,
    searchQuery: brandDealSearch,
    preset: dateRange.preset,
    startDate: dateParams.startDate,
    endDate: dateParams.endDate,
    filter: scopedFilter,
    enabled: isBrandDealsModalOpen && Boolean(selectedBrandForDeals),
  });

  const { data: lostDrilldown, isLoading: lostLoading } = useReportDrilldownQuery({
    type: 'lost',
    page: 1,
    pageSize: 100,
    preset: dateRange.preset,
    startDate: dateParams.startDate,
    endDate: dateParams.endDate,
    filter: scopedFilter,
    enabled: isLostModalOpen,
  });

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
                  <span className="truncate">Welcome back, {accountName || getRoleHeaderLabel()}</span>
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
          <div id="tour-date-filter">
            <DateRangeFilterPopover value={dateRange} onChange={setDateRange} />
          </div>
          {!isViewOnly && (
            <Link
              id="tour-register-deal-btn"
              href="/deals/new"
              className="flex items-center justify-center gap-2 bg-white text-primary font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:bg-white/90 transition text-center whitespace-nowrap"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Register New Deal</span>
            </Link>
          )}
          <Link
            id="tour-nav-deals-btn"
            href="/deals"
            className="flex items-center justify-center gap-1.5 bg-white/15 text-white font-semibold text-xs px-4 py-2.5 rounded-xl hover:bg-white/25 transition border border-white/20 text-center whitespace-nowrap"
          >
            <span>View Deals Registry</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </Link>
        </div>
      </div>

      {/* 6 Core Clickable KPI Metric Cards */}
      <div id="tour-dashboard-metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 sm:gap-4">
        {/* KPI 1: Total Registered Deals (Clickable) */}
        <AppCard
          id="tour-tile-registered"
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
          id="tour-tile-expired"
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
          id="tour-tile-renewed"
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
          id="tour-tile-brands"
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

        {/* KPI 4: Expiring Deals (Clickable) */}
        <AppCard
          id="tour-tile-expiring"
          onClick={() => setIsExpiringModalOpen(true)}
          className="p-4 sm:p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs min-w-0 overflow-hidden cursor-pointer hover:border-amber-500/50 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between text-muted text-xs font-semibold gap-2">
            <span className="truncate group-hover:text-amber-500 transition">Expiring Deals (≤30d)</span>
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
          </div>
          {loading ? (
            <div className="space-y-2 mt-2">
              <div className="shimmer-skeleton h-8 w-16 rounded-md" />
              <div className="shimmer-skeleton h-3.5 w-44 rounded" />
            </div>
          ) : (
            <>
              <div className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400 mt-2 font-mono truncate">
                {expiringDealsAnalytics.totalCount}
              </div>
              <div className="text-[11px] text-amber-600 font-semibold mt-1 flex items-center justify-between truncate">
                <span className="truncate">
                  {expiringDealsAnalytics.criticalCount > 0
                    ? `${expiringDealsAnalytics.criticalCount} Critical (≤3d)`
                    : expiringDealsAnalytics.urgentCount > 0
                    ? `${expiringDealsAnalytics.urgentCount} Urgent (≤7d)`
                    : 'Active pipeline'}
                </span>
                <span className="text-[10px] text-muted group-hover:text-amber-600 transition font-medium">Click &rarr;</span>
              </div>
            </>
          )}
        </AppCard>

        {/* KPI 5: Lost Deal Review Studio (Clickable) */}
        <AppCard
          id="tour-tile-lost"
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
                {totalLostCount}
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
        <AppCard id="tour-distribution-brand" className="p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-sky-600" />
                <div>
                  <h2 className="font-bold text-sm text-foreground">Deals Distribution by Brand</h2>
                  <p className="text-[10px] text-muted font-normal">
                    Bar &amp; % indicate {dashboardBrandSort.startsWith('count') ? 'share of total deal registrations' : 'share of total brand pipeline value (PHP)'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={dashboardBrandSort}
                  onChange={(e) => setDashboardBrandSort(e.target.value as any)}
                  className="px-2 py-1 bg-neutral/60 border border-border/60 rounded-lg text-[11px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                  title="Sort Brands"
                >
                  <option value="value-desc">Highest Value (PHP)</option>
                  <option value="value-asc">Lowest Value (PHP)</option>
                  <option value="count-desc">Most Deals</option>
                  <option value="count-asc">Least Deals</option>
                  <option value="name-asc">Brand Name (A–Z)</option>
                  <option value="name-desc">Brand Name (Z–A)</option>
                </select>
                <span className="text-xs text-muted font-medium hidden sm:inline">
                  {brandDistributionList.length} Brands
                </span>
              </div>
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
                sortedDashboardBrandList.slice(0, 10).map((item, idx) => {
                  const isCountSort = dashboardBrandSort.startsWith('count');
                  const valuePct = totalBrandValue > 0 ? ((item.totalValue / totalBrandValue) * 100).toFixed(1) : '0';
                  const countPct = totalBrandDealsCount > 0 ? ((item.count / totalBrandDealsCount) * 100).toFixed(1) : '0';
                  const activePct = isCountSort ? countPct : valuePct;

                  const barWidth = isCountSort
                    ? Math.max(Math.round((item.count / maxBrandCount) * 100), 4)
                    : Math.max(Math.round((item.totalValue / maxBrandValue) * 100), 4);

                  return (
                    <div
                      key={item.brand}
                      onClick={() => {
                        setSelectedBrandForDeals(item.brand);
                        setIsBrandDealsModalOpen(true);
                      }}
                      className="space-y-1.5 p-2 sm:p-2.5 rounded-xl border border-transparent hover:border-sky-500/30 hover:bg-sky-500/5 cursor-pointer transition-all duration-200 group"
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
                          <span
                            className="text-[11px] text-muted whitespace-nowrap bg-neutral/60 px-1.5 py-0.5 rounded border border-border/40"
                            title={`${item.count} deal${item.count === 1 ? '' : 's'} (${countPct}% of deals) • PHP ${item.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${valuePct}% of pipeline value)`}
                          >
                            {item.count} {item.count === 1 ? 'deal' : 'deals'} • <strong className="text-foreground font-semibold">{activePct}%</strong>
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

                      <div className="w-full h-1.5 bg-neutral rounded-full overflow-hidden border border-border/40">
                        <div
                          className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                          title={`${item.brand}: ${isCountSort ? `${item.count} deals (${countPct}%)` : `PHP ${item.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${valuePct}% of pipeline value)`}`}
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
        <AppCard id="tour-distribution-bu" className="p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs space-y-4 flex flex-col justify-between">
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
                  const percentage = Math.round((count / totalOverallDealsCount) * 100);
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
                  const percentage = Math.round((item.count / totalOverallDealsCount) * 100);
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
      <AppCard id="tour-recent-deals" className="p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs space-y-3">
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
                            <span className="px-2.5 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-xs font-bold uppercase shrink-0">
                              {normalizeBrandName(deal.brand)}
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
                      const valuePct = totalBrandValue > 0 ? ((item.totalValue / totalBrandValue) * 100).toFixed(1) : '0';
                      const countPct = totalBrandDealsCount > 0 ? ((item.count / totalBrandDealsCount) * 100).toFixed(1) : '0';

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
                            <span className="text-[10px] text-muted ml-1" title={`${countPct}% of registered deals`}>({countPct}%)</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground truncate">
                            <span>PHP {item.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            <span className="text-[10px] font-normal text-muted ml-1" title={`${valuePct}% of pipeline value`}>({valuePct}%)</span>
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
              onChange={(e: any) => {
                setBrandDealSearch(e.target.value);
                setBrandDealsPage(1);
              }}
              allowClear
              size="md"
            />
          </div>

          <ModalDealTable
            deals={brandDrilldown?.data || []}
            totalRecordsCount={brandDrilldown?.totalCount ?? 0}
            serverCurrentPage={brandDealsPage}
            serverTotalPages={brandDrilldown?.totalPages ?? 1}
            onServerPageChange={setBrandDealsPage}
            isLoading={brandLoading}
            onCloseModal={() => {
              setIsBrandDealsModalOpen(false);
              setSelectedBrandForDeals(null);
            }}
          />
        </AppModal.Body>

        <AppModal.Footer className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-muted">
            Showing {brandDrilldown?.data?.length || 0} of {brandDrilldown?.totalCount ?? 0} deals for {selectedBrandForDeals}
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
              onChange={(e: any) => {
                setRegisteredSearch(e.target.value);
                setRegPage(1);
              }}
              allowClear
              size="md"
            />
          </div>

          <ModalDealTable
            deals={regDrilldown?.data || []}
            totalRecordsCount={regDrilldown?.totalCount ?? totalRegistered}
            serverCurrentPage={regPage}
            serverTotalPages={regDrilldown?.totalPages ?? 1}
            onServerPageChange={setRegPage}
            isLoading={regLoading}
            onCloseModal={() => setIsRegisteredModalOpen(false)}
          />
        </AppModal.Body>

        <AppModal.Footer className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-muted">
            Showing {regDrilldown?.data?.length || 0} of {regDrilldown?.totalCount ?? totalRegistered} registered deals
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
              onChange={(e: any) => {
                setExpiredSearch(e.target.value);
                setExpPage(1);
              }}
              allowClear
              size="md"
            />
          </div>

          <ModalDealTable
            deals={expDrilldown?.data || []}
            totalRecordsCount={expDrilldown?.totalCount ?? totalExpired}
            serverCurrentPage={expPage}
            serverTotalPages={expDrilldown?.totalPages ?? 1}
            onServerPageChange={setExpPage}
            isLoading={expLoading}
            onCloseModal={() => setIsExpiredModalOpen(false)}
          />
        </AppModal.Body>

        <AppModal.Footer className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-muted">
            Showing {expDrilldown?.data?.length || 0} of {expDrilldown?.totalCount ?? totalExpired} expired deals
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
              <AppModal.Title>Renewed Deals Directory ({renDrilldown?.totalCount ?? totalRenewedCount})</AppModal.Title>
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
              onChange={(e: any) => {
                setRenewedSearch(e.target.value);
                setRenPage(1);
              }}
              allowClear
              size="md"
            />
          </div>

          <ModalDealTable
            deals={renDrilldown?.data || []}
            totalRecordsCount={renDrilldown?.totalCount ?? totalRenewedCount}
            serverCurrentPage={renPage}
            serverTotalPages={renDrilldown?.totalPages ?? 1}
            onServerPageChange={setRenPage}
            isLoading={renLoading}
            onCloseModal={() => setIsRenewedModalOpen(false)}
          />
        </AppModal.Body>

        <AppModal.Footer className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-muted">
            Showing {renDrilldown?.data?.length || 0} of {renDrilldown?.totalCount ?? totalRenewedCount} renewed deals
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

      {/* Expiring Deals Modal Drilldown */}
      <AppModal
        open={isExpiringModalOpen}
        onClose={() => {
          setIsExpiringModalOpen(false);
          setExpiringSearch('');
          setExpiringUrgencyFilter('ALL');
        }}
        width={1160}
      >
        <AppModal.Header>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <AppModal.Title>Expiring Deals & Urgency Review</AppModal.Title>
              <AppModal.Description>
                Deals approaching expiration threshold within the next 30 days requiring attention, WTN notifications, or renewals.
              </AppModal.Description>
            </div>
          </div>
        </AppModal.Header>

        <AppModal.Body className="space-y-4 pt-3">
          {/* Urgency Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pb-1 border-b border-border/40">
            <button
              type="button"
              onClick={() => {
                setExpiringUrgencyFilter('ALL');
                setExpiringPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border cursor-pointer flex items-center gap-1.5 ${
                expiringUrgencyFilter === 'ALL'
                  ? 'bg-primary text-white border-primary shadow-xs font-bold'
                  : 'bg-neutral/80 text-muted hover:text-foreground border-border/60'
              }`}
            >
              <span>All Expiring (≤30d)</span>
              <span className="text-[10px] opacity-80 font-mono">({expiringDealsAnalytics.totalCount})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setExpiringUrgencyFilter('CRITICAL');
                setExpiringPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border cursor-pointer flex items-center gap-1.5 ${
                expiringUrgencyFilter === 'CRITICAL'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs font-bold'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
              }`}
            >
              <span>Critical (≤3d)</span>
              <span className="text-[10px] font-mono font-bold">({expiringDealsAnalytics.criticalCount})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setExpiringUrgencyFilter('URGENT');
                setExpiringPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border cursor-pointer flex items-center gap-1.5 ${
                expiringUrgencyFilter === 'URGENT'
                  ? 'bg-orange-600 text-white border-orange-600 shadow-xs font-bold'
                  : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 hover:bg-orange-500/20'
              }`}
            >
              <span>Urgent (4-7d)</span>
              <span className="text-[10px] font-mono font-bold">({expiringDealsAnalytics.urgentCount})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setExpiringUrgencyFilter('WARNING');
                setExpiringPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border cursor-pointer flex items-center gap-1.5 ${
                expiringUrgencyFilter === 'WARNING'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs font-bold'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
              }`}
            >
              <span>Warning (8-15d)</span>
              <span className="text-[10px] font-mono font-bold">({expiringDealsAnalytics.warningCount})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setExpiringUrgencyFilter('NOTICE');
                setExpiringPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border cursor-pointer flex items-center gap-1.5 ${
                expiringUrgencyFilter === 'NOTICE'
                  ? 'bg-yellow-600 text-white border-yellow-600 shadow-xs font-bold'
                  : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20'
              }`}
            >
              <span>Notice (16-30d)</span>
              <span className="text-[10px] font-mono font-bold">({expiringDealsAnalytics.noticeCount})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <AppInput
                prefix={<Search className="w-4 h-4 text-muted" />}
                placeholder="Search expiring deals by Customer, Project, Ref ID, BU, AO, Brand, Remarks..."
                value={expiringSearch}
                onChange={(e: any) => {
                  setExpiringSearch(e.target.value);
                  setExpiringPage(1);
                }}
                allowClear
                size="md"
              />
            </div>
            <DealsSortPopover
              value={expiringSortConfig}
              onChange={setExpiringSortConfig}
            />
          </div>

          <ModalDealTable
            deals={expiringDrilldown?.data || []}
            totalRecordsCount={expiringDrilldown?.totalCount ?? expiringDealsAnalytics.totalCount}
            serverCurrentPage={expiringPage}
            serverTotalPages={expiringDrilldown?.totalPages ?? 1}
            onServerPageChange={setExpiringPage}
            isLoading={expiringLoading}
            onCloseModal={() => setIsExpiringModalOpen(false)}
          />
        </AppModal.Body>

        <AppModal.Footer className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-muted">
            Showing {expiringDrilldown?.data?.length || 0} of {expiringDrilldown?.totalCount ?? expiringDealsAnalytics.totalCount} expiring deals
          </span>
          <div className="flex items-center gap-2">
            <Link
              href="/reports?view=expiry_risk"
              onClick={() => setIsExpiringModalOpen(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 text-xs font-semibold rounded-lg border border-amber-500/30 transition shadow-xs"
            >
              <span>Open in Reports Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <AppButton
              variant="neutral"
              size="sm"
              onClick={() => {
                setIsExpiringModalOpen(false);
                setExpiringSearch('');
                setExpiringUrgencyFilter('ALL');
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
        deals={lostDrilldown?.data || []}
        loading={lostLoading}
      />
    </div>
  );
}
