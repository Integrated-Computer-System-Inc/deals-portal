'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  BarChart3,
  Building2,
  Clock,
  Layers,
  ShieldAlert,
  TrendingUp,
  ArrowRight,
  User,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Search,
  Check,
  Calendar,
  DollarSign,
  Tag,
  Briefcase,
  PieChart,
  X,
  FileText,
  Sparkles,
} from 'lucide-react';
import { useDealsQuery } from '@/hooks/useDealsQuery';
import {
  DealHeaderRecord,
  UserRole,
  DEAL_STATUS_MAP,
  ACTIVE_BUSINESS_UNITS,
  ALL_BUSINESS_UNITS,
} from '@my-app/types';
import {
  AppCard,
  AppModal,
  AppButton,
  AppInput,
  AppChip,
} from '@/components/ui';
import {
  DateRangeFilterPopover,
  DateRangeValue,
  filterDealByDateRange,
} from '@/components/DateRangeFilterPopover';
import { normalizeBrandName } from '@/lib/brandUtils';
import { OFFICIAL_REGISTERED_BUS, normalizeBU } from '@/lib/buUtils';
import { formatDateLong } from '@/components/utils/time';

type ActiveReportType = 'EXPIRY_RISK' | 'BRAND_ANALYTICS' | 'BU_MATRIX' | null;

export default function ReportsPage() {
  const { data: session } = useSession();
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

  // Global Page Date Range
  const [globalDateRange, setGlobalDateRange] = useState<DateRangeValue>({
    preset: 'ALL',
    label: 'All Time',
  });

  // Modal States for 4 KPI Drilldowns
  const [isRegisteredModalOpen, setIsRegisteredModalOpen] = useState(false);
  const [registeredSearchInput, setRegisteredSearchInput] = useState('');

  const [isExpiredModalOpen, setIsExpiredModalOpen] = useState(false);
  const [expiredSearchInput, setExpiredSearchInput] = useState('');

  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [brandSearchInput, setBrandSearchInput] = useState('');
  const [debouncedBrandSearch, setDebouncedBrandSearch] = useState('');

  const [isOtherBUModalOpen, setIsOtherBUModalOpen] = useState(false);
  const [otherBUSearchInput, setOtherBUSearchInput] = useState('');
  const [debouncedOtherBUSearch, setDebouncedOtherBUSearch] = useState('');

  // Modal State for 3 Deep-Dive Report Studios
  const [activeReport, setActiveReport] = useState<ActiveReportType>(null);
  const [modalViewMode, setModalViewMode] = useState<'SUMMARY' | 'CHARTS' | 'GRID'>('SUMMARY');
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [modalBuFilter, setModalBuFilter] = useState<string>('ALL');
  const [modalStatusFilter, setModalStatusFilter] = useState<string>('ALL');
  const [modalDateRange, setModalDateRange] = useState<DateRangeValue>({
    preset: 'ALL',
    label: 'All Time',
  });

  // Debounce brand search in modal
  useEffect(() => {
    if (!brandSearchInput.trim()) {
      setDebouncedBrandSearch('');
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedBrandSearch(brandSearchInput.trim());
    }, 250);
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

  // Normalized Deals based on global date range
  const deals = useMemo(() => {
    return allDeals.filter((d: DealHeaderRecord) =>
      filterDealByDateRange(d.dtRegistered || d.dtCreated, globalDateRange)
    );
  }, [allDeals, globalDateRange]);



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

  const getDealTotalNumeric = (deal: DealHeaderRecord): number => {
    return deal.items?.reduce((sum: number, i: any) => sum + (Number(i.totalAmt) || 0), 0) || 0;
  };

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const getDaysRemaining = (expDt: Date | string | null | undefined): number | null => {
    if (!expDt) return null;
    const exp = new Date(expDt);
    if (isNaN(exp.getTime())) return null;
    return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  // 1. KPI Computations
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
  }, [deals, now]);

  const expiredThisMonth = useMemo(() => {
    return deals.filter((d: DealHeaderRecord) => {
      const rawExp = d.expDt || d.expiration;
      if (!rawExp) return false;
      const exp = new Date(rawExp);
      return exp.getMonth() === currentMonth && exp.getFullYear() === currentYear && exp < now;
    }).length;
  }, [deals, currentMonth, currentYear, now]);

  const grandTotalPipelineValue = useMemo(() => {
    return deals.reduce((acc: number, deal: DealHeaderRecord) => {
      const dealSum = deal.items?.reduce((sum: number, item: any) => sum + (Number(item.totalAmt) || 0), 0) || 0;
      return acc + dealSum;
    }, 0);
  }, [deals]);

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

  const filteredRegisteredDealsInModal = useMemo(() => {
    if (!registeredSearchInput.trim()) return registeredDealsList;
    const q = registeredSearchInput.toLowerCase().trim();
    return registeredDealsList.filter((d: DealHeaderRecord) => {
      const proj = (d.ProjectName || d.projectName || '').toLowerCase();
      const cust = (d.custName || '').toLowerCase();
      const reg = (d.dealRegID || '').toLowerCase();
      const brand = (d.brand || '').toLowerCase();
      const bu = (d.BU || d.bu || '').toLowerCase();
      return proj.includes(q) || cust.includes(q) || reg.includes(q) || brand.includes(q) || bu.includes(q);
    });
  }, [registeredDealsList, registeredSearchInput]);

  const filteredExpiredDealsInModal = useMemo(() => {
    if (!expiredSearchInput.trim()) return expiredDealsList;
    const q = expiredSearchInput.toLowerCase().trim();
    return expiredDealsList.filter((d: DealHeaderRecord) => {
      const proj = (d.ProjectName || d.projectName || '').toLowerCase();
      const cust = (d.custName || '').toLowerCase();
      const reg = (d.dealRegID || '').toLowerCase();
      const brand = (d.brand || '').toLowerCase();
      const bu = (d.BU || d.bu || '').toLowerCase();
      return proj.includes(q) || cust.includes(q) || reg.includes(q) || brand.includes(q) || bu.includes(q);
    });
  }, [expiredDealsList, expiredSearchInput]);

  // Expiration Risk Analytics Computations
  const expiryAnalytics = useMemo(() => {
    let criticalCount = 0;
    let urgentCount = 0;
    let warningCount = 0;
    let noticeCount = 0;
    let expiredCount = 0;
    let totalRiskAmount = 0;

    deals.forEach((d) => {
      const days = getDaysRemaining(d.expDt || d.expiration);
      const amt = getDealTotalNumeric(d);
      if (days === null) return;

      if (days <= 0) {
        expiredCount++;
      } else if (days <= 3) {
        criticalCount++;
        totalRiskAmount += amt;
      } else if (days <= 7) {
        urgentCount++;
        totalRiskAmount += amt;
      } else if (days <= 15) {
        warningCount++;
        totalRiskAmount += amt;
      } else if (days <= 30) {
        noticeCount++;
        totalRiskAmount += amt;
      }
    });

    const totalAtRisk = criticalCount + urgentCount + warningCount + noticeCount;

    return {
      criticalCount,
      urgentCount,
      warningCount,
      noticeCount,
      expiredCount,
      totalAtRisk,
      totalRiskAmount,
    };
  }, [deals]);

  // Brand Performance Analytics Computations
  const brandAnalytics = useMemo(() => {
    const map: Record<string, { count: number; totalValue: number }> = {};
    let grandTotal = 0;

    deals.forEach((d) => {
      const brand = normalizeBrandName(d.brand || '');
      const amt = getDealTotalNumeric(d);
      grandTotal += amt;

      if (!map[brand]) {
        map[brand] = { count: 0, totalValue: 0 };
      }
      map[brand].count++;
      map[brand].totalValue += amt;
    });

    const sorted = Object.entries(map).sort((a, b) => b[1].totalValue - a[1].totalValue);
    return {
      brandsList: sorted,
      totalBrandsCount: sorted.length,
      grandTotal,
      topBrand: sorted[0] ? sorted[0][0] : 'None',
    };
  }, [deals]);

  const filteredBrandsInModal = useMemo(() => {
    if (!debouncedBrandSearch.trim()) return brandAnalytics.brandsList;
    const q = debouncedBrandSearch.toLowerCase().trim();
    return brandAnalytics.brandsList.filter(([brand]) => brand.toLowerCase().includes(q));
  }, [brandAnalytics.brandsList, debouncedBrandSearch]);

  // BU Matrix Analytics Computations
  const buAnalytics = useMemo(() => {
    const buMap: Record<string, { count: number; totalValue: number; wonCount: number }> = {};
    let othersCount = 0;
    let othersValue = 0;

    deals.forEach((d) => {
      const rawBu = normalizeBU(d.BU || d.bu || '') || 'Unassigned';
      const amt = getDealTotalNumeric(d);
      const isWon = String(d.dealStatus) === '1' || d.dealStatus === 1;

      if (!buMap[rawBu]) {
        buMap[rawBu] = { count: 0, totalValue: 0, wonCount: 0 };
      }
      buMap[rawBu].count++;
      buMap[rawBu].totalValue += amt;
      if (isWon) buMap[rawBu].wonCount++;

      if (!(OFFICIAL_REGISTERED_BUS as readonly string[]).includes(rawBu)) {
        othersCount++;
        othersValue += amt;
      }
    });

    const sortedBUs = Object.entries(buMap).sort((a, b) => b[1].count - a[1].count);

    return {
      buList: sortedBUs,
      totalBUsCount: sortedBUs.length,
      othersCount,
      othersValue,
      topBU: sortedBUs[0] ? sortedBUs[0][0] : 'BU1',
    };
  }, [deals]);

  // Filtered Deals inside the active Report Studio Modal
  const modalFilteredDeals = useMemo(() => {
    if (!activeReport) return [];

    return allDeals.filter((d) => {
      if (!filterDealByDateRange(d.dtRegistered || d.dtCreated, modalDateRange)) {
        return false;
      }

      if (activeReport === 'EXPIRY_RISK') {
        const days = getDaysRemaining(d.expDt || d.expiration);
        if (days === null || days > 30) return false;
      } else if (activeReport === 'BU_MATRIX') {
        if (modalStatusFilter === 'ALL') {
          const statusStr = String(d.dealStatus);
          if (!['1', '2', '3', '4'].includes(statusStr)) return false;
        }
      }

      if (modalStatusFilter !== 'ALL' && String(d.dealStatus) !== modalStatusFilter) {
        return false;
      }

      const rawBu = normalizeBU(d.BU || d.bu || '');
      if (modalBuFilter !== 'ALL' && rawBu !== modalBuFilter) {
        return false;
      }

      if (modalSearchQuery.trim()) {
        const q = modalSearchQuery.toLowerCase().trim();
        const proj = (d.ProjectName || d.projectName || '').toLowerCase();
        const cust = (d.custName || '').toLowerCase();
        const reg = (d.dealRegID || '').toLowerCase();
        const brand = (d.brand || '').toLowerCase();
        const ao = (d.AssignedAO || d.assignedAO || '').toLowerCase();
        if (!proj.includes(q) && !cust.includes(q) && !reg.includes(q) && !brand.includes(q) && !ao.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [allDeals, activeReport, modalDateRange, modalStatusFilter, modalBuFilter, modalSearchQuery]);

  const openReportModal = (type: ActiveReportType) => {
    setActiveReport(type);
    setModalViewMode('SUMMARY');
    setModalSearchQuery('');
    setModalBuFilter('ALL');
    setModalStatusFilter('ALL');
    setModalDateRange({ preset: 'ALL', label: 'All Time' });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-7 rounded-2xl bg-gradient-to-tr from-primary to-slate-800 text-white shadow-md overflow-hidden">
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 text-white backdrop-blur-sm flex items-center gap-1 border border-white/25">
              <PieChart className="w-3.5 h-3.5 shrink-0" />
              <span>Intelligence & SLA Reporting Studio</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-snug break-words">
            Executive Deals Reports
          </h1>
          <p className="text-xs text-white/80 max-w-xl">
            Real-time analytics across deal velocity, partner brand market share, and business unit quota distribution.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <DateRangeFilterPopover value={globalDateRange} onChange={setGlobalDateRange} />
          <Link
            href="/deals"
            className="flex items-center justify-center gap-1.5 bg-white/15 text-white font-semibold text-xs px-4 py-2.5 rounded-xl hover:bg-white/25 transition border border-white/20 text-center whitespace-nowrap"
          >
            <span>Deals Registry</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* SECTION 1: 4 CORE CLICKABLE KPI TILES */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-muted uppercase tracking-wider">
            Key Performance Metrics (Click to inspect)
          </span>
          <span className="text-[11px] text-muted">Filter: {globalDateRange.label}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Total Registered Deals */}
          <AppCard
            onClick={() => setIsRegisteredModalOpen(true)}
            className="p-5 bg-card-bg border border-border/60 hover:border-emerald-500/50 hover:shadow-md rounded-2xl transition cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">Total Registered Deals</span>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            <div className="my-2">
              <div className="text-2xl font-bold font-mono text-emerald-600">{totalRegistered}</div>
              <div className="text-[11px] text-muted mt-0.5">
                PHP {grandTotalPipelineValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} pipeline
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-600 dark:text-emerald-400 pt-2 border-t border-border/40">
              <span>View details</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </AppCard>

          {/* KPI 2: Expired Deals this Month */}
          <AppCard
            onClick={() => setIsExpiredModalOpen(true)}
            className="p-5 bg-card-bg border border-border/60 hover:border-rose-500/50 hover:shadow-md rounded-2xl transition cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">Expired this Month</span>
              <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            <div className="my-2">
              <div className="text-2xl font-bold font-mono text-rose-600">{expiredThisMonth}</div>
              <div className="text-[11px] text-muted mt-0.5">
                {expiredDealsList.length} total expired all-time
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold text-rose-600 dark:text-rose-400 pt-2 border-t border-border/40">
              <span>View overdue</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </AppCard>

          {/* KPI 3: Active Brands Represented */}
          <AppCard
            onClick={() => setIsBrandModalOpen(true)}
            className="p-5 bg-card-bg border border-border/60 hover:border-sky-500/50 hover:shadow-md rounded-2xl transition cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">Active Brands</span>
              <div className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Layers className="w-4 h-4" />
              </div>
            </div>

            <div className="my-2">
              <div className="text-2xl font-bold font-mono text-sky-600">{brandAnalytics.totalBrandsCount}</div>
              <div className="text-[11px] text-muted mt-0.5 truncate">
                Top Brand: <span className="font-semibold text-foreground">{brandAnalytics.topBrand}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold text-sky-600 dark:text-sky-400 pt-2 border-t border-border/40">
              <span>Brand breakdown</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </AppCard>

          {/* KPI 4: Business Units Covered */}
          <AppCard
            onClick={() => setIsOtherBUModalOpen(true)}
            className="p-5 bg-card-bg border border-border/60 hover:border-indigo-500/50 hover:shadow-md rounded-2xl transition cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">Business Units Covered</span>
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Building2 className="w-4 h-4" />
              </div>
            </div>

            <div className="my-2">
              <div className="flex items-center gap-1 flex-wrap">
                {officialBUsList.slice(0, 4).map(([bu, count]) => (
                  <span
                    key={bu}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral/80 text-foreground border border-border/60"
                  >
                    {bu}
                  </span>
                ))}
                <span className="text-[10px] text-indigo-600 font-bold">+{totalOthersCount} others</span>
              </div>
              <div className="text-[11px] text-muted mt-1.5 truncate">
                Top Unit: <span className="font-semibold text-foreground">{buAnalytics.topBU}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold text-indigo-600 dark:text-indigo-400 pt-2 border-t border-border/40">
              <span>Inspect all BUs</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </AppCard>
        </div>
      </div>

      {/* SECTION 2: 3 CORE INTERACTIVE REPORT STUDIO TILES */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-muted uppercase tracking-wider">
            Custom Report Studios (Deep Analysis)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Report Tile 1: Deal Velocity & Expiration Risk */}
          <AppCard
            onClick={() => openReportModal('EXPIRY_RISK')}
            className="p-6 bg-card-bg border border-border/60 hover:border-amber-500/50 hover:shadow-lg rounded-2xl transition-all cursor-pointer flex flex-col justify-between space-y-5 group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                  Deal Protection
                </span>
              </div>

              <div>
                <h2 className="text-base font-bold text-foreground group-hover:text-amber-600 transition">
                  Deal Velocity & Expiration Risk Studio
                </h2>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  Tracks opportunities approaching 90-day expiry to prevent vendor discount forfeiture and lost protections.
                </p>
              </div>

              {/* Micro KPI Strip inside Tile */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
                <div className="p-2.5 rounded-xl bg-neutral/40 border border-border/40">
                  <span className="text-[10px] text-muted font-medium block">At Risk (≤30d)</span>
                  <span className="text-lg font-bold font-mono text-amber-600">{expiryAnalytics.totalAtRisk} deals</span>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral/40 border border-border/40">
                  <span className="text-[10px] text-muted font-medium block">Critical (≤3d)</span>
                  <span className="text-lg font-bold font-mono text-rose-600">{expiryAnalytics.criticalCount} deals</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:underline pt-2 border-t border-border/40">
              <span>Open Custom Studio</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </AppCard>

          {/* Report Tile 2: Brand Performance & Market Share */}
          <AppCard
            onClick={() => openReportModal('BRAND_ANALYTICS')}
            className="p-6 bg-card-bg border border-border/60 hover:border-sky-500/50 hover:shadow-lg rounded-2xl transition-all cursor-pointer flex flex-col justify-between space-y-5 group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 uppercase tracking-wider">
                  Vendor Strategy
                </span>
              </div>

              <div>
                <h2 className="text-base font-bold text-foreground group-hover:text-sky-600 transition">
                  Brand Performance & Market Share Studio
                </h2>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  Evaluates tier-1 partner vendor performance (Dell, Cisco, HPE, Lenovo, etc.) with normalized brand consolidation.
                </p>
              </div>

              {/* Micro KPI Strip inside Tile */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
                <div className="p-2.5 rounded-xl bg-neutral/40 border border-border/40">
                  <span className="text-[10px] text-muted font-medium block">Active Brands</span>
                  <span className="text-lg font-bold font-mono text-sky-600">{brandAnalytics.totalBrandsCount}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral/40 border border-border/40">
                  <span className="text-[10px] text-muted font-medium block">Top Brand</span>
                  <span className="text-lg font-bold text-foreground truncate block">{brandAnalytics.topBrand}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-sky-600 dark:text-sky-400 group-hover:underline pt-2 border-t border-border/40">
              <span>Open Custom Studio</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </AppCard>

          {/* Report Tile 3: BU & AO Pipeline Health Matrix */}
          <AppCard
            onClick={() => openReportModal('BU_MATRIX')}
            className="p-6 bg-card-bg border border-border/60 hover:border-indigo-500/50 hover:shadow-lg rounded-2xl transition-all cursor-pointer flex flex-col justify-between space-y-5 group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 uppercase tracking-wider">
                  Executive Matrix
                </span>
              </div>

              <div>
                <h2 className="text-base font-bold text-foreground group-hover:text-indigo-600 transition">
                  BU & AO Pipeline Health Studio
                </h2>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  Compares revenue pipeline and deal volumes across the 6 official business units (BU1-BU12) and Account Officers.
                </p>
              </div>

              {/* Micro KPI Strip inside Tile */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
                <div className="p-2.5 rounded-xl bg-neutral/40 border border-border/40">
                  <span className="text-[10px] text-muted font-medium block">Covered BUs</span>
                  <span className="text-lg font-bold font-mono text-indigo-600">6 + Others</span>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral/40 border border-border/40">
                  <span className="text-[10px] text-muted font-medium block">Top Revenue BU</span>
                  <span className="text-lg font-bold text-foreground truncate block">{buAnalytics.topBU}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline pt-2 border-t border-border/40">
              <span>Open Custom Studio</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </AppCard>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4 KPI DRILLDOWN MODALS */}
      {/* ========================================================================= */}

      {/* KPI Modal 1: Registered Deals Drilldown */}
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

      {/* KPI Modal 2: Expired Deals Drilldown */}
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
              placeholder="Search expired deals by Project, Customer, Reg ID, Brand..."
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
                        <span className="font-mono font-bold text-rose-600">
                          {deal.dealRegID || `#${deal.dealID}`}
                        </span>
                        <span className="font-bold text-foreground truncate">{deal.custName}</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 border border-rose-500/20">
                          Expired
                        </span>
                      </div>
                      <div className="text-xs text-muted truncate">{deal.ProjectName || deal.projectName}</div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <div>
                        <div className="font-mono font-bold text-foreground text-xs">
                          {formatAmounts(deal)}
                        </div>
                        <div className="text-[10px] text-rose-500">
                          Expired {formatDateLong(deal.expDt)}
                        </div>
                      </div>
                      <Link
                        href={`/deals/${deal.dealID}`}
                        onClick={() => setIsExpiredModalOpen(false)}
                        className="p-1 text-muted hover:text-rose-600 rounded hover:bg-neutral transition"
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

      {/* KPI Modal 3: Brand Performance Drilldown */}
      <AppModal
        open={isBrandModalOpen}
        onClose={() => {
          setIsBrandModalOpen(false);
          setBrandSearchInput('');
        }}
        width={680}
      >
        <AppModal.Header>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-600" />
            <div>
              <AppModal.Title>Active Brand Breakdown</AppModal.Title>
              <AppModal.Description>
                Distribution of pipeline value and deal volume across represented brands.
              </AppModal.Description>
            </div>
          </div>
        </AppModal.Header>

        <AppModal.Body>
          <div className="space-y-4">
            <AppInput
              prefix={<Search className="w-4 h-4 text-muted" />}
              placeholder="Search brand (e.g. Dell, Cisco, HPE, Lenovo)..."
              value={brandSearchInput}
              onChange={(e: any) => setBrandSearchInput(e.target.value)}
              allowClear
              size="md"
            />

            <div className="border border-border/60 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto divide-y divide-border/40">
              {filteredBrandsInModal.length === 0 ? (
                <div className="p-6 text-center text-muted text-xs space-y-1">
                  <Layers className="w-6 h-6 mx-auto text-muted/50 mb-1.5" />
                  <p className="font-semibold text-foreground">No matching brands found</p>
                </div>
              ) : (
                filteredBrandsInModal.map(([brand, data], idx) => (
                  <div
                    key={brand}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-neutral/40 transition text-xs"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <span className="text-[10px] font-mono font-bold text-muted w-5">#{idx + 1}</span>
                      <span className="font-bold text-foreground truncate">{brand}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 border border-sky-500/20">
                        {data.count} {data.count === 1 ? 'deal' : 'deals'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 text-right">
                      <div className="font-mono font-bold text-foreground text-xs">
                        PHP {data.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                      <Link
                        href={`/deals?brand=${encodeURIComponent(brand)}`}
                        onClick={() => setIsBrandModalOpen(false)}
                        className="p-1 text-muted hover:text-sky-600 rounded hover:bg-neutral transition"
                        title={`View ${brand} deals in registry`}
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
            Showing {filteredBrandsInModal.length} of {brandAnalytics.brandsList.length} brands
          </span>
          <AppButton
            variant="neutral"
            size="sm"
            onClick={() => {
              setIsBrandModalOpen(false);
              setBrandSearchInput('');
            }}
          >
            Close
          </AppButton>
        </AppModal.Footer>
      </AppModal>

      {/* KPI Modal 4: Business Units Drilldown */}
      <AppModal
        open={isOtherBUModalOpen}
        onClose={() => {
          setIsOtherBUModalOpen(false);
          setOtherBUSearchInput('');
        }}
        width={620}
      >
        <AppModal.Header>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <div>
              <AppModal.Title>Business Units Breakdown</AppModal.Title>
              <AppModal.Description>
                Breakdown of deals categorized under official and specialized business units.
              </AppModal.Description>
            </div>
          </div>
        </AppModal.Header>

        <AppModal.Body>
          <div className="space-y-4">
            <AppInput
              prefix={<Search className="w-4 h-4 text-muted" />}
              placeholder="Search other business units (e.g. CAC, CSD, ESD)..."
              value={otherBUSearchInput}
              onChange={(e: any) => setOtherBUSearchInput(e.target.value)}
              allowClear
              size="md"
            />

            <div className="border border-border/60 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto divide-y divide-border/40">
              {filteredOtherBUsInModal.length === 0 ? (
                <div className="p-6 text-center text-muted text-xs space-y-1">
                  <Building2 className="w-6 h-6 mx-auto text-muted/50 mb-1.5" />
                  <p className="font-semibold text-foreground">No matching business units found</p>
                </div>
              ) : (
                filteredOtherBUsInModal.map(([bu, data], idx) => (
                  <div
                    key={bu}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-neutral/40 transition text-xs"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-[10px] font-mono font-bold text-muted w-5">#{idx + 1}</span>
                      <span className="font-bold px-2 py-0.5 rounded border text-indigo-400 bg-indigo-500/15 border-indigo-500/30">
                        {bu}
                      </span>
                      <span className="text-[10px] font-semibold text-muted">
                        {data.count} {data.count === 1 ? 'deal' : 'deals'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 text-right">
                      <div className="font-mono font-bold text-foreground text-xs">
                        PHP {data.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                      <Link
                        href={`/deals?search=${encodeURIComponent(bu)}`}
                        onClick={() => setIsOtherBUModalOpen(false)}
                        className="p-1 text-muted hover:text-indigo-600 rounded hover:bg-neutral transition"
                        title={`View ${bu} deals in registry`}
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
            Showing {filteredOtherBUsInModal.length} of {Object.keys(otherBUsMap).length} business units
          </span>
          <AppButton
            variant="neutral"
            size="sm"
            onClick={() => {
              setIsOtherBUModalOpen(false);
              setOtherBUSearchInput('');
            }}
          >
            Close
          </AppButton>
        </AppModal.Footer>
      </AppModal>

      {/* ========================================================================= */}
      {/* 3 CUSTOM-VIEW DEEP DIVE REPORT STUDIO MODALS */}
      {/* ========================================================================= */}
      <AppModal
        open={activeReport !== null}
        onClose={() => setActiveReport(null)}
        width={840}
      >
        <AppModal.Header>
          <div className="flex items-center justify-between gap-4 w-full pr-6">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                {activeReport === 'EXPIRY_RISK' && <Clock className="w-4 h-4 text-amber-500" />}
                {activeReport === 'BRAND_ANALYTICS' && <Layers className="w-4 h-4 text-sky-500" />}
                {activeReport === 'BU_MATRIX' && <Building2 className="w-4 h-4 text-indigo-500" />}
              </div>
              <div>
                <AppModal.Title>
                  {activeReport === 'EXPIRY_RISK' && 'Deal Velocity & Expiration Risk Studio'}
                  {activeReport === 'BRAND_ANALYTICS' && 'Brand Performance & Market Share Studio'}
                  {activeReport === 'BU_MATRIX' && 'Business Unit Pipeline Health Studio'}
                </AppModal.Title>
                <AppModal.Description>
                  Interactive customized view and deep-dive analysis.
                </AppModal.Description>
              </div>
            </div>
          </div>
        </AppModal.Header>

        <AppModal.Body>
          <div className="space-y-4">
            {/* Modal Controls Bar: Filters & View Mode */}
            <div className="p-3 rounded-xl bg-neutral/40 border border-border/50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Search in modal */}
                <div className="flex-1 max-w-sm">
                  <AppInput
                    prefix={<Search className="w-3.5 h-3.5 text-muted" />}
                    placeholder="Filter records by keyword..."
                    value={modalSearchQuery}
                    onChange={(e: any) => setModalSearchQuery(e.target.value)}
                    allowClear
                    size="sm"
                  />
                </div>

                {/* View Mode Switcher */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral/80 border border-border/60 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setModalViewMode('SUMMARY')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      modalViewMode === 'SUMMARY'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    Summary
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalViewMode('CHARTS')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      modalViewMode === 'CHARTS'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    Charts
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalViewMode('GRID')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      modalViewMode === 'GRID'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    Data Grid
                  </button>
                </div>
              </div>

              {/* Secondary Filters Bar */}
              <div className="flex items-center gap-2 flex-wrap text-xs pt-2 border-t border-border/40">
                <DateRangeFilterPopover value={modalDateRange} onChange={setModalDateRange} />

                {/* BU Filter in Modal */}
                <div className="flex items-center gap-1">
                  <span className="text-muted text-[11px] font-semibold">BU:</span>
                  <select
                    value={modalBuFilter}
                    onChange={(e) => setModalBuFilter(e.target.value)}
                    className="px-2 py-1 rounded-lg bg-card-bg border border-border/60 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  >
                    <option value="ALL">All Business Units</option>
                    {OFFICIAL_BUS.map((bu) => (
                      <option key={bu} value={bu}>
                        {bu}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter in Modal */}
                <div className="flex items-center gap-1">
                  <span className="text-muted text-[11px] font-semibold">Status:</span>
                  <select
                    value={modalStatusFilter}
                    onChange={(e) => setModalStatusFilter(e.target.value)}
                    className="px-2 py-1 rounded-lg bg-card-bg border border-border/60 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  >
                    <option value="ALL">All Statuses</option>
                    {Object.entries(DEAL_STATUS_MAP).map(([id, meta]: [string, any]) => (
                      <option key={id} value={id}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                </div>

                {(modalSearchQuery || modalBuFilter !== 'ALL' || modalStatusFilter !== 'ALL' || modalDateRange.preset !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setModalSearchQuery('');
                      setModalBuFilter('ALL');
                      setModalStatusFilter('ALL');
                      setModalDateRange({ preset: 'ALL', label: 'All Time' });
                    }}
                    className="text-[11px] font-bold text-rose-500 hover:underline ml-auto"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {/* VIEW MODE 1: SUMMARY */}
            {modalViewMode === 'SUMMARY' && (
              <div className="space-y-4">
                {activeReport === 'EXPIRY_RISK' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25">
                      <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Critical (≤3d)</span>
                      <span className="text-xl font-bold font-mono text-rose-600 mt-1 block">
                        {expiryAnalytics.criticalCount}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/25">
                      <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider block">Urgent (≤7d)</span>
                      <span className="text-xl font-bold font-mono text-orange-600 mt-1 block">
                        {expiryAnalytics.urgentCount}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">Warning (≤15d)</span>
                      <span className="text-xl font-bold font-mono text-amber-600 mt-1 block">
                        {expiryAnalytics.warningCount}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-yellow-500/10 border border-yellow-500/25">
                      <span className="text-[10px] font-bold text-yellow-600 uppercase tracking-wider block">Notice (≤30d)</span>
                      <span className="text-xl font-bold font-mono text-yellow-700 mt-1 block">
                        {expiryAnalytics.noticeCount}
                      </span>
                    </div>
                  </div>
                )}

                {activeReport === 'BRAND_ANALYTICS' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/25">
                      <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider block">Active Brands</span>
                      <span className="text-xl font-bold font-mono text-sky-600 mt-1 block">
                        {brandAnalytics.totalBrandsCount}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/25">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">Total Pipeline</span>
                      <span className="text-xl font-bold font-mono text-primary mt-1 block">
                        PHP {brandAnalytics.grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Top Market Share</span>
                      <span className="text-xl font-bold text-foreground mt-1 block truncate">
                        {brandAnalytics.topBrand}
                      </span>
                    </div>
                  </div>
                )}

                {activeReport === 'BU_MATRIX' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Business Units</span>
                      <span className="text-xl font-bold font-mono text-indigo-600 mt-1 block">
                        6 Official + {buAnalytics.othersCount} Others
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Top Revenue Leader</span>
                      <span className="text-xl font-bold text-foreground mt-1 block truncate">
                        {buAnalytics.topBU}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/25">
                      <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider block">Total Pipeline</span>
                      <span className="text-xl font-bold font-mono text-foreground mt-1 block">
                        PHP {grandTotalPipelineValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VIEW MODE 2: CHARTS */}
            {modalViewMode === 'CHARTS' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-neutral/30 border border-border/50 space-y-3">
                  <span className="text-xs font-bold text-foreground block">
                    Visual Distribution ({modalFilteredDeals.length} Deals)
                  </span>

                  {activeReport === 'BRAND_ANALYTICS' && (
                    <div className="space-y-2">
                      {brandAnalytics.brandsList.slice(0, 8).map(([brand, data]) => {
                        const pct = brandAnalytics.grandTotal > 0 ? (data.totalValue / brandAnalytics.grandTotal) * 100 : 0;
                        return (
                          <div key={brand} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-foreground">{brand}</span>
                              <span className="font-mono text-muted font-bold">
                                PHP {data.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({pct.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="w-full h-2 bg-neutral rounded-full overflow-hidden border border-border/40">
                              <div
                                className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full"
                                style={{ width: `${Math.max(pct, 2)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {activeReport === 'EXPIRY_RISK' && (
                    <div className="space-y-2.5">
                      {[
                        { label: 'Critical (≤3d left)', count: expiryAnalytics.criticalCount, color: 'from-rose-500 to-red-600' },
                        { label: 'Urgent (≤7d left)', count: expiryAnalytics.urgentCount, color: 'from-orange-500 to-amber-600' },
                        { label: 'Warning (≤15d left)', count: expiryAnalytics.warningCount, color: 'from-amber-500 to-yellow-600' },
                        { label: 'Notice (≤30d left)', count: expiryAnalytics.noticeCount, color: 'from-yellow-400 to-emerald-500' },
                      ].map((item) => {
                        const total = expiryAnalytics.totalAtRisk || 1;
                        const pct = (item.count / total) * 100;
                        return (
                          <div key={item.label} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-foreground">{item.label}</span>
                              <span className="font-mono text-muted font-bold">
                                {item.count} deals ({pct.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="w-full h-2 bg-neutral rounded-full overflow-hidden border border-border/40">
                              <div
                                className={`h-full bg-gradient-to-r ${item.color} rounded-full`}
                                style={{ width: `${Math.max(pct, 2)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {activeReport === 'BU_MATRIX' && (
                    <div className="space-y-2">
                      {buAnalytics.buList.slice(0, 8).map(([bu, data]) => {
                        const maxVal = buAnalytics.buList[0]?.[1].totalValue || 1;
                        const pct = (data.totalValue / maxVal) * 100;
                        return (
                          <div key={bu} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-foreground">{bu}</span>
                              <span className="font-mono text-muted font-bold">
                                PHP {data.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({data.count} deals)
                              </span>
                            </div>
                            <div className="w-full h-2 bg-neutral rounded-full overflow-hidden border border-border/40">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full"
                                style={{ width: `${Math.max(pct, 2)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW MODE 3: IN-APP DATA GRID */}
            {modalViewMode === 'GRID' && (
              <div className="border border-border/60 rounded-xl overflow-hidden max-h-[360px] overflow-y-auto divide-y divide-border/40">
                {modalFilteredDeals.length === 0 ? (
                  <div className="p-8 text-center text-muted text-xs space-y-1">
                    <FileText className="w-6 h-6 mx-auto text-muted/50 mb-1" />
                    <p className="font-semibold text-foreground">No matching deals found</p>
                    <p>Try clearing or adjusting the custom filters.</p>
                  </div>
                ) : (
                  modalFilteredDeals.map((deal) => (
                    <div
                      key={deal.dealID}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-neutral/40 transition text-xs"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-primary">
                            {deal.dealRegID || `#${deal.dealID}`}
                          </span>
                          <span className="font-bold text-foreground truncate">{deal.custName}</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-neutral text-muted border border-border/50">
                            {deal.BU || deal.bu}
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 border border-sky-500/20">
                            {deal.brand}
                          </span>
                        </div>
                        <div className="text-xs text-muted truncate">{deal.ProjectName || deal.projectName}</div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-right">
                        <div>
                          <div className="font-mono font-bold text-foreground text-xs">
                            {formatAmounts(deal)}
                          </div>
                          <div className="text-[10px] text-muted">
                            Exp: {formatDateLong(deal.expDt)}
                          </div>
                        </div>

                        <Link
                          href={`/deals/${deal.dealID}`}
                          onClick={() => setActiveReport(null)}
                          className="p-1 text-muted hover:text-primary rounded hover:bg-neutral transition"
                          title="View Deal"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </AppModal.Body>

        <AppModal.Footer className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-muted">
            Displaying {modalFilteredDeals.length} filtered deals • Zero-export mode active
          </span>
          <AppButton
            variant="neutral"
            size="sm"
            onClick={() => setActiveReport(null)}
          >
            Close Studio
          </AppButton>
        </AppModal.Footer>
      </AppModal>
    </div>
  );
}
