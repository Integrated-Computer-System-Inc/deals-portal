'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  ArrowUpDown,
  SlidersHorizontal,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { useDealsQuery, useCurrentUserFilter } from '@/hooks/useDealsQuery';
import {
  DealHeaderRecord,
  UserRole,
  DEAL_STATUS_MAP,
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
import { normalizeBrandName, calculateBrandDistribution, categorizeDealStatus } from '@/lib/brandUtils';
import { OFFICIAL_REGISTERED_BUS, normalizeBU, isOfficialBU } from '@/lib/buUtils';
import dynamic from 'next/dynamic';
import DealsFilterPopover from '@/components/DealsFilterPopover';
import DealsSortPopover, { SortConfig } from '@/components/DealsSortPopover';
import { useModalDealFilters } from '@/components/useModalDealFilters';
import { formatDateLong } from '@/components/utils/time';

const DealLostListModal = dynamic(() => import('@/components/DealLostListModal'), { ssr: false });
const ModalDealTable = dynamic(
  () => import('@/components/ModalDealTable').then((mod) => mod.ModalDealTable),
  { ssr: false }
);

type ActiveReportType = 'EXPIRY_RISK' | 'BRAND_ANALYTICS' | 'BU_MATRIX' | null;

export default function ReportsPage() {
  const scopedFilter = useCurrentUserFilter();
  const { data: allDeals = [], isLoading: loading } = useDealsQuery(scopedFilter);

  // Global Page Date Range
  const [globalDateRange, setGlobalDateRange] = useState<DateRangeValue>({
    preset: 'ALL',
    label: 'All Time',
  });

  // Section 3: Brand Matrix Interactive Filter & Sort States
  const [brandSearch, setBrandSearch] = useState('');
  const [brandSort, setBrandSort] = useState<'count-desc' | 'count-asc' | 'value-desc' | 'value-asc' | 'name-asc' | 'name-desc'>('value-desc');
  const [brandStatusFilter, setBrandStatusFilter] = useState<'ALL' | 'ACTIVE' | 'APPROVED' | 'WAITING' | 'LOST'>('ALL');

  // Section 3: BU Matrix Interactive Filter & Sort States
  const [buSearch, setBuSearch] = useState('');
  const [buTypeFilter, setBuTypeFilter] = useState<'ALL' | 'OFFICIAL' | 'OTHER'>('ALL');
  const [buSort, setBuSort] = useState<'count-desc' | 'count-asc' | 'value-desc' | 'value-asc' | 'name-asc' | 'name-desc'>('count-desc');
  const [buStatusFilter, setBuStatusFilter] = useState<'ALL' | 'ACTIVE' | 'APPROVED' | 'WAITING' | 'LOST'>('ALL');

  // Modal States for KPI Drilldowns
  const [isRegisteredModalOpen, setIsRegisteredModalOpen] = useState(false);
  const [isExpiredModalOpen, setIsExpiredModalOpen] = useState(false);
  const [isRenewedModalOpen, setIsRenewedModalOpen] = useState(false);

  // Brand Directory Modal States
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [brandSearchInput, setBrandSearchInput] = useState('');
  const [debouncedBrandSearch, setDebouncedBrandSearch] = useState('');
  const [modalBrandSort, setModalBrandSort] = useState<'count-desc' | 'count-asc' | 'value-desc' | 'value-asc' | 'name-asc' | 'name-desc'>('value-desc');
  const [selectedBrandForDeals, setSelectedBrandForDeals] = useState<string | null>(null);
  const [isBrandDealsModalOpen, setIsBrandDealsModalOpen] = useState(false);

  // BU Directory Modal States (Displays ALL Official + Specialized BUs)
  const [isOtherBUModalOpen, setIsOtherBUModalOpen] = useState(false);
  const [modalBUSearch, setModalBUSearch] = useState('');
  const [modalBUTypeFilter, setModalBUTypeFilter] = useState<'ALL' | 'OFFICIAL' | 'OTHER'>('ALL');
  const [modalBUSort, setModalBUSort] = useState<'count-desc' | 'count-asc' | 'value-desc' | 'value-asc' | 'name-asc' | 'name-desc'>('count-desc');
  const [selectedBUForDeals, setSelectedBUForDeals] = useState<string | null>(null);
  const [isBUDealsModalOpen, setIsBUDealsModalOpen] = useState(false);

  const [isLostReportModalOpen, setIsLostReportModalOpen] = useState(false);

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

  // Read URL query parameter on mount / navigation and auto-open relevant modal
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (!view) return;

    if (view === 'registered') {
      setIsRegisteredModalOpen(true);
    } else if (view === 'expired') {
      setIsExpiredModalOpen(true);
    } else if (view === 'renewed') {
      setIsRenewedModalOpen(true);
    } else if (view === 'brands') {
      setIsBrandModalOpen(true);
    } else if (view === 'bus') {
      setIsOtherBUModalOpen(true);
    } else if (view === 'lost') {
      setIsLostReportModalOpen(true);
    } else if (view === 'expiry_risk') {
      setActiveReport('EXPIRY_RISK');
    } else if (view === 'brand_analytics') {
      setActiveReport('BRAND_ANALYTICS');
    } else if (view === 'bu_matrix') {
      setActiveReport('BU_MATRIX');
    }
  }, []);

  // Normalized Deals based on global date range & strictly Official BU with precomputed totals
  const deals = useMemo(() => {
    return allDeals
      .filter((d: DealHeaderRecord) => isOfficialBU(d.BU || d.bu))
      .filter((d: DealHeaderRecord) =>
        filterDealByDateRange(d.dtRegistered || d.dtCreated, globalDateRange)
      )
      .map((d: DealHeaderRecord) => {
        if ((d as any)._computedTotal === undefined) {
          const total = d.items?.reduce((sum: number, item: any) => sum + (Number(item.totalAmt) || 0), 0) || 0;
          (d as any)._computedTotal = total;
          (d as any)._cachedTotal = total;
        }
        return d;
      });
  }, [allDeals, globalDateRange]);

  const formatAmounts = (deal: DealHeaderRecord) => {
    if (deal.aggregatedTotals && Object.keys(deal.aggregatedTotals).length > 0) {
      return Object.entries(deal.aggregatedTotals)
        .map(([curr, amt]: [string, any]) => `${curr} ${Number(amt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
        .join(' | ');
    }
    if (deal.items && deal.items.length > 0) {
      const total = (deal as any)._computedTotal !== undefined
        ? (deal as any)._computedTotal
        : deal.items.reduce((acc: number, item: any) => acc + (Number(item.totalAmt) || 0), 0);
      const curr = deal.items[0]?.currency || 'PHP';
      return `${curr} ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return 'PHP 0.00';
  };

  const getDaysRemaining = (expDt: Date | string | null | undefined): number | null => {
    if (!expDt) return null;
    const exp = new Date(expDt);
    if (isNaN(exp.getTime())) return null;
    return Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  // 1. KPI Computations
  const registeredDealsList = useMemo(() => {
    return deals.filter((d: DealHeaderRecord) => String(d.dealStatus) === '1' || d.dealStatus === 1);
  }, [deals]);

  const totalRegistered = registeredDealsList.length;

  const expiredDealsList = useMemo(() => {
    const nowMs = Date.now();
    return deals.filter((d: DealHeaderRecord) => {
      const rawExp = d.expDt || d.expiration;
      if (!rawExp) return false;
      const exp = new Date(rawExp);
      return !isNaN(exp.getTime()) && exp.getTime() < nowMs;
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

  const renewedFilters = useModalDealFilters(renewedDealsList, isRenewedModalOpen);

  const expiredThisMonth = useMemo(() => {
    const now = new Date();
    const cMonth = now.getMonth();
    const cYear = now.getFullYear();
    const nowMs = now.getTime();
    return deals.filter((d: DealHeaderRecord) => {
      const rawExp = d.expDt || d.expiration;
      if (!rawExp) return false;
      const exp = new Date(rawExp);
      return exp.getMonth() === cMonth && exp.getFullYear() === cYear && exp.getTime() < nowMs;
    }).length;
  }, [deals]);

  const grandTotalPipelineValue = useMemo(() => {
    return deals.reduce((acc: number, deal: any) => {
      return acc + (deal._computedTotal || 0);
    }, 0);
  }, [deals]);

  // Calculate official BUs breakdown
  const officialBUsList = useMemo(() => {
    const officialCounts: Record<string, number> = {};
    OFFICIAL_REGISTERED_BUS.forEach((bu) => {
      officialCounts[bu] = 0;
    });

    deals.forEach((d: any) => {
      const rawBu = normalizeBU(d.BU || d.bu || '');
      if ((OFFICIAL_REGISTERED_BUS as readonly string[]).includes(rawBu)) {
        officialCounts[rawBu] = (officialCounts[rawBu] || 0) + 1;
      }
    });

    return OFFICIAL_REGISTERED_BUS.map((bu) => [bu, officialCounts[bu]] as [string, number]);
  }, [deals]);

  const lostDealsList = useMemo(() => {
    return deals.filter((d: DealHeaderRecord) => {
      const statusStr = String(d.dealStatus ?? '');
      return statusStr === '7' || d.dealStatus === 7 || Boolean(d.lostInfo && d.lostInfo.reason);
    });
  }, [deals]);

  // Brand Distribution List with Active, Approved, Waiting, Lost counts & Revenue (strictly official BUs, scoped for PM)
  const brandDistributionList = useMemo(() => {
    return calculateBrandDistribution(
      deals,
      scopedFilter.userRole === 'pm' && scopedFilter.assignedBrands && scopedFilter.assignedBrands.length > 0
        ? scopedFilter.assignedBrands
        : undefined
    );
  }, [deals, scopedFilter.userRole, scopedFilter.assignedBrands]);

  // Filtered and Sorted Brands List for Section 3
  const processedBrandList = useMemo(() => {
    let list = [...brandDistributionList];

    if (brandStatusFilter === 'ACTIVE') {
      list = list.filter((item) => item.activeCount > 0);
    } else if (brandStatusFilter === 'APPROVED') {
      list = list.filter((item) => item.approvedCount > 0);
    } else if (brandStatusFilter === 'WAITING') {
      list = list.filter((item) => item.waitingCount > 0);
    } else if (brandStatusFilter === 'LOST') {
      list = list.filter((item) => (item.lostCount || 0) > 0);
    }

    if (brandSearch.trim()) {
      const q = brandSearch.toLowerCase().trim();
      list = list.filter((item) => item.brand.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      if (brandSort === 'count-desc') return b.count - a.count || b.totalValue - a.totalValue;
      if (brandSort === 'count-asc') return a.count - b.count || a.totalValue - b.totalValue;
      if (brandSort === 'value-desc') return b.totalValue - a.totalValue || b.count - a.count;
      if (brandSort === 'value-asc') return a.totalValue - b.totalValue || a.count - b.count;
      if (brandSort === 'name-asc') return a.brand.localeCompare(b.brand);
      if (brandSort === 'name-desc') return b.brand.localeCompare(a.brand);
      return 0;
    });

    return list;
  }, [brandDistributionList, brandStatusFilter, brandSearch, brandSort]);

  // Complete BU Distribution List (Strictly 7 Official Registered BUs)
  const buDistributionList = useMemo(() => {
    const map: Record<
      string,
      {
        bu: string;
        isOfficial: boolean;
        count: number;
        totalValue: number;
        activeCount: number;
        approvedCount: number;
        waitingCount: number;
        lostCount: number;
      }
    > = {};

    // 1. Initialize Official Registered BUs
    OFFICIAL_REGISTERED_BUS.forEach((bu) => {
      map[bu] = {
        bu,
        isOfficial: true,
        count: 0,
        totalValue: 0,
        activeCount: 0,
        approvedCount: 0,
        waitingCount: 0,
        lostCount: 0,
      };
    });

    // 2. Tally deals into respective Official BUs
    deals.forEach((d: any) => {
      const rawBu = normalizeBU(d.BU || d.bu || '');
      if (!(OFFICIAL_REGISTERED_BUS as readonly string[]).includes(rawBu)) return;

      const amt = d._computedTotal || 0;
      const { isApproved, isWaiting, isLost, isActive } = categorizeDealStatus(d);

      map[rawBu].count += 1;
      map[rawBu].totalValue += amt;

      if (isActive) map[rawBu].activeCount += 1;
      if (isApproved) map[rawBu].approvedCount += 1;
      if (isWaiting) map[rawBu].waitingCount += 1;
      if (isLost) map[rawBu].lostCount += 1;
    });

    return Object.values(map);
  }, [deals]);

  // Filtered and Sorted BU List for Section 3
  const processedBuList = useMemo(() => {
    let list = [...buDistributionList];

    if (buTypeFilter === 'OFFICIAL') {
      list = list.filter((item) => item.isOfficial);
    } else if (buTypeFilter === 'OTHER') {
      list = list.filter((item) => !item.isOfficial);
    }

    if (buStatusFilter === 'ACTIVE') {
      list = list.filter((item) => item.activeCount > 0);
    } else if (buStatusFilter === 'APPROVED') {
      list = list.filter((item) => item.approvedCount > 0);
    } else if (buStatusFilter === 'WAITING') {
      list = list.filter((item) => item.waitingCount > 0);
    } else if (buStatusFilter === 'LOST') {
      list = list.filter((item) => item.lostCount > 0);
    }

    if (buSearch.trim()) {
      const q = buSearch.toLowerCase().trim();
      list = list.filter((item) => item.bu.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      if (buSort === 'count-desc') return b.count - a.count || b.totalValue - a.totalValue;
      if (buSort === 'count-asc') return a.count - b.count || a.totalValue - b.totalValue;
      if (buSort === 'value-desc') return b.totalValue - a.totalValue || b.count - a.count;
      if (buSort === 'value-asc') return a.totalValue - b.totalValue || a.count - b.count;
      if (buSort === 'name-asc') return a.bu.localeCompare(b.bu);
      if (buSort === 'name-desc') return b.bu.localeCompare(a.bu);
      return 0;
    });

    return list;
  }, [buDistributionList, buTypeFilter, buStatusFilter, buSearch, buSort]);

  // Recent Deals Pipeline computation (Top 6 most recent deals)
  const recentDeals = useMemo(() => {
    return [...deals]
      .sort((a, b) => {
        const timeB = new Date(b.dtRegistered || b.dtCreated || 0).getTime();
        const timeA = new Date(a.dtRegistered || a.dtCreated || 0).getTime();
        return timeB - timeA;
      })
      .slice(0, 6);
  }, [deals]);

  // Brand Deals modal list and filter hook (evaluated only when modal is open)
  const brandDealsList = useMemo(() => {
    if (!selectedBrandForDeals || !isBrandDealsModalOpen) return [];
    return deals.filter(
      (d) => normalizeBrandName(d.brand).toLowerCase() === selectedBrandForDeals.toLowerCase()
    );
  }, [deals, selectedBrandForDeals, isBrandDealsModalOpen]);
  const brandDealsFilters = useModalDealFilters(brandDealsList, isBrandDealsModalOpen);

  // BU Deals modal list and filter hook (evaluated only when modal is open)
  const buDealsList = useMemo(() => {
    if (!selectedBUForDeals || !isBUDealsModalOpen) return [];
    return deals.filter(
      (d) => normalizeBU(d.BU || d.bu || '').toLowerCase() === selectedBUForDeals.toLowerCase()
    );
  }, [deals, selectedBUForDeals, isBUDealsModalOpen]);
  const buDealsFilters = useModalDealFilters(buDealsList, isBUDealsModalOpen);

  // Hook-based Filter & Sort for Modal Deal Tables (evaluated only when modal is open)
  const registeredFilters = useModalDealFilters(registeredDealsList, isRegisteredModalOpen);
  const expiredFilters = useModalDealFilters(expiredDealsList, isExpiredModalOpen);

  // 2. Expiry Risk Analytics
  const expiryAnalytics = useMemo(() => {
    let criticalCount = 0; // <= 3 days
    let urgentCount = 0;   // <= 7 days
    let warningCount = 0;  // <= 15 days
    let noticeCount = 0;   // <= 30 days

    deals.forEach((d) => {
      const days = getDaysRemaining(d.expDt || d.expiration);
      if (days === null || days < 0) return;
      if (days <= 3) criticalCount++;
      else if (days <= 7) urgentCount++;
      else if (days <= 15) warningCount++;
      else if (days <= 30) noticeCount++;
    });

    return {
      criticalCount,
      urgentCount,
      warningCount,
      noticeCount,
      totalAtRisk: criticalCount + urgentCount + warningCount + noticeCount,
    };
  }, [deals]);

  // 3. Brand Analytics
  const brandAnalytics = useMemo(() => {
    const map: Record<string, { count: number; totalValue: number; deals: DealHeaderRecord[] }> = {};
    deals.forEach((d: any) => {
      const b = normalizeBrandName(d.brand);
      if (!map[b]) {
        map[b] = { count: 0, totalValue: 0, deals: [] };
      }
      map[b].count++;
      map[b].totalValue += d._computedTotal || 0;
      map[b].deals.push(d);
    });

    const list = Object.entries(map).sort((a, b) => b[1].totalValue - a[1].totalValue);
    const grandTotal = list.reduce((sum, [, data]) => sum + data.totalValue, 0);

    return {
      brandsList: list,
      topBrand: list[0]?.[0] || 'DELL',
      topBrandValue: list[0]?.[1].totalValue || 0,
      grandTotal,
      totalBrandsCount: list.length,
    };
  }, [deals]);

  // 4. BU Performance Analytics
  const buAnalytics = useMemo(() => {
    const map: Record<string, { count: number; totalValue: number; deals: DealHeaderRecord[] }> = {};
    deals.forEach((d: any) => {
      const rawBu = normalizeBU(d.BU || d.bu || '') || 'Unassigned';
      if (!map[rawBu]) {
        map[rawBu] = { count: 0, totalValue: 0, deals: [] };
      }
      map[rawBu].count++;
      map[rawBu].totalValue += d._computedTotal || 0;
      map[rawBu].deals.push(d);
    });

    const list = Object.entries(map).sort((a, b) => b[1].totalValue - a[1].totalValue);

    return {
      buList: list,
      topBU: list[0]?.[0] || 'BU1',
      topBUValue: list[0]?.[1].totalValue || 0,
      totalBUsCount: list.length,
    };
  }, [deals]);

  // Filtered Brands inside Brand Modal with Search and Sort
  const filteredBrandsInModal = useMemo(() => {
    let list = [...brandDistributionList];

    if (debouncedBrandSearch.trim()) {
      const q = debouncedBrandSearch.toLowerCase().trim();
      list = list.filter((item) => item.brand.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      if (modalBrandSort === 'count-desc') return b.count - a.count || b.totalValue - a.totalValue;
      if (modalBrandSort === 'count-asc') return a.count - b.count || a.totalValue - b.totalValue;
      if (modalBrandSort === 'value-desc') return b.totalValue - a.totalValue || b.count - a.count;
      if (modalBrandSort === 'value-asc') return a.totalValue - b.totalValue || a.count - b.count;
      if (modalBrandSort === 'name-asc') return a.brand.localeCompare(b.brand);
      if (modalBrandSort === 'name-desc') return b.brand.localeCompare(a.brand);
      return 0;
    });

    return list;
  }, [brandDistributionList, debouncedBrandSearch, modalBrandSort]);

  // Filtered Business Units inside Directory Modal with Search, Type Filter, and Sort
  const filteredBUsInModal = useMemo(() => {
    let list = [...buDistributionList];

    if (modalBUTypeFilter === 'OFFICIAL') {
      list = list.filter((item) => item.isOfficial);
    } else if (modalBUTypeFilter === 'OTHER') {
      list = list.filter((item) => !item.isOfficial);
    }

    if (modalBUSearch.trim()) {
      const q = modalBUSearch.toLowerCase().trim();
      list = list.filter((item) => item.bu.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      if (modalBUSort === 'count-desc') return b.count - a.count || b.totalValue - a.totalValue;
      if (modalBUSort === 'count-asc') return a.count - b.count || a.totalValue - b.totalValue;
      if (modalBUSort === 'value-desc') return b.totalValue - a.totalValue || b.count - a.count;
      if (modalBUSort === 'value-asc') return a.totalValue - b.totalValue || a.count - b.count;
      if (modalBUSort === 'name-asc') return a.bu.localeCompare(b.bu);
      if (modalBUSort === 'name-desc') return b.bu.localeCompare(a.bu);
      return 0;
    });

    return list;
  }, [buDistributionList, modalBUTypeFilter, modalBUSearch, modalBUSort]);

  // Filtered Deals inside the active Report Studio Modal
  const modalFilteredDeals = useMemo(() => {
    if (!activeReport) return [];

    return deals.filter((d) => {
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
        const remarks = (d.remarks || '').toLowerCase();
        if (
          !proj.includes(q) &&
          !cust.includes(q) &&
          !reg.includes(q) &&
          !brand.includes(q) &&
          !ao.includes(q) &&
          !remarks.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [deals, activeReport, modalDateRange, modalStatusFilter, modalBuFilter, modalSearchQuery]);

  // Studio Dynamic Brand Analytics computed from modalFilteredDeals
  const studioBrandAnalytics = useMemo(() => {
    const map: Record<string, { count: number; totalValue: number; deals: DealHeaderRecord[] }> = {};
    modalFilteredDeals.forEach((d: any) => {
      const b = normalizeBrandName(d.brand);
      if (!map[b]) {
        map[b] = { count: 0, totalValue: 0, deals: [] };
      }
      map[b].count++;
      map[b].totalValue += d._computedTotal || 0;
      map[b].deals.push(d);
    });

    const list = Object.entries(map).sort((a, b) => b[1].totalValue - a[1].totalValue);
    const grandTotal = list.reduce((sum, [, data]) => sum + data.totalValue, 0);

    return {
      brandsList: list,
      topBrand: list[0]?.[0] || 'None',
      topBrandValue: list[0]?.[1].totalValue || 0,
      grandTotal,
      totalBrandsCount: list.length,
    };
  }, [modalFilteredDeals]);

  // Studio Dynamic Expiry Analytics computed from modalFilteredDeals
  const studioExpiryAnalytics = useMemo(() => {
    let criticalCount = 0;
    let urgentCount = 0;
    let warningCount = 0;
    let noticeCount = 0;
    let totalAtRisk = 0;

    modalFilteredDeals.forEach((d: any) => {
      const days = getDaysRemaining(d.expDt || d.expiration);
      if (days !== null && days >= 0 && days <= 30) {
        totalAtRisk++;
        if (days <= 3) criticalCount++;
        else if (days <= 7) urgentCount++;
        else if (days <= 15) warningCount++;
        else noticeCount++;
      }
    });

    return {
      criticalCount,
      urgentCount,
      warningCount,
      noticeCount,
      totalAtRisk,
    };
  }, [modalFilteredDeals]);

  // Studio Dynamic BU Analytics computed from modalFilteredDeals
  const studioBuAnalytics = useMemo(() => {
    const map: Record<string, { count: number; totalValue: number; deals: DealHeaderRecord[] }> = {};
    modalFilteredDeals.forEach((d: any) => {
      const rawBu = normalizeBU(d.BU || d.bu || '') || 'Unassigned';
      if (!map[rawBu]) {
        map[rawBu] = { count: 0, totalValue: 0, deals: [] };
      }
      map[rawBu].count++;
      map[rawBu].totalValue += d._computedTotal || 0;
      map[rawBu].deals.push(d);
    });

    const list = Object.entries(map).sort((a, b) => b[1].totalValue - a[1].totalValue);
    const grandTotal = list.reduce((sum, [, data]) => sum + data.totalValue, 0);

    return {
      buList: list,
      topBU: list[0]?.[0] || 'None',
      topBUValue: list[0]?.[1].totalValue || 0,
      grandTotal,
      coveredBUsCount: list.length,
    };
  }, [modalFilteredDeals]);

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
      {/* Clean Executive Toolbar (No bulky gradient banner) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Reports & Analytics Studio
            </h1>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              Live Database
            </span>
          </div>
          <p className="text-xs text-muted">
            Portfolio performance, SLA velocity, OEM partner analytics, and division quota matrix.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <DateRangeFilterPopover value={globalDateRange} onChange={setGlobalDateRange} />
          <Link
            href="/deals"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card-bg hover:bg-neutral text-foreground font-semibold text-xs border border-border/70 shadow-xs transition"
          >
            <span>Deals Registry</span>
            <ExternalLink className="w-3.5 h-3.5 text-muted" />
          </Link>
        </div>
      </div>

      {/* SECTION 1: 5 EXECUTIVE PERFORMANCE METRICS */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-muted uppercase tracking-wider">
            Executive Summary KPI Matrix
          </span>
          <span className="text-[11px] text-muted font-medium">Timeframe: {globalDateRange.label}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {/* KPI 1: Total Registered Deals */}
          <AppCard
            onClick={() => setIsRegisteredModalOpen(true)}
            className="p-4 bg-card-bg border border-border/60 hover:border-emerald-500/50 hover:shadow-md rounded-2xl transition cursor-pointer flex flex-col justify-between group space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted truncate">Total Registered Deals</span>
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            {loading ? (
              <div className="space-y-1.5 py-1">
                <div className="shimmer-skeleton h-7 w-20 rounded-md" />
                <div className="shimmer-skeleton h-3.5 w-28 rounded" />
              </div>
            ) : (
              <div className="space-y-0.5">
                <div className="text-2xl font-bold font-mono text-emerald-600">{totalRegistered}</div>
                <div className="text-[11px] text-muted truncate font-mono">
                  PHP {grandTotalPipelineValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-600 dark:text-emerald-400 pt-2 border-t border-border/40">
              <span>View registry</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </AppCard>

          {/* KPI 2: Expired Deals & SLA Risk */}
          <AppCard
            onClick={() => setIsExpiredModalOpen(true)}
            className="p-4 bg-card-bg border border-border/60 hover:border-rose-500/50 hover:shadow-md rounded-2xl transition cursor-pointer flex flex-col justify-between group space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted truncate">Expired this Month</span>
              <div className="h-7 w-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            {loading ? (
              <div className="space-y-1.5 py-1">
                <div className="shimmer-skeleton h-7 w-16 rounded-md" />
                <div className="shimmer-skeleton h-3.5 w-32 rounded" />
              </div>
            ) : (
              <div className="space-y-0.5">
                <div className="text-2xl font-bold font-mono text-rose-600">{expiredThisMonth}</div>
                <div className="text-[11px] text-muted truncate">
                  {expiryAnalytics.totalAtRisk} nearing expiry (≤30d)
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] font-bold text-rose-600 dark:text-rose-400 pt-2 border-t border-border/40">
              <span>View overdue</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </AppCard>

          {/* KPI 3: Total Renewed Deals */}
          <AppCard
            onClick={() => setIsRenewedModalOpen(true)}
            className="p-4 bg-card-bg border border-border/60 hover:border-emerald-500/50 hover:shadow-md rounded-2xl transition cursor-pointer flex flex-col justify-between group space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted truncate">Renewed Deals</span>
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <RefreshCw className="w-4 h-4" />
              </div>
            </div>

            {loading ? (
              <div className="space-y-1.5 py-1">
                <div className="shimmer-skeleton h-7 w-16 rounded-md" />
                <div className="shimmer-skeleton h-3.5 w-28 rounded" />
              </div>
            ) : (
              <div className="space-y-0.5">
                <div className="text-2xl font-bold font-mono text-emerald-600">{renewedDealsList.length}</div>
                <div className="text-[11px] text-muted truncate">
                  Active renewals logged
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-600 dark:text-emerald-400 pt-2 border-t border-border/40">
              <span>View renewals</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </AppCard>

          {/* KPI 3: Active Partner Brands */}
          <AppCard
            onClick={() => setIsBrandModalOpen(true)}
            className="p-4 bg-card-bg border border-border/60 hover:border-sky-500/50 hover:shadow-md rounded-2xl transition cursor-pointer flex flex-col justify-between group space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted truncate">Active Brands</span>
              <div className="h-7 w-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <Layers className="w-4 h-4" />
              </div>
            </div>

            {loading ? (
              <div className="space-y-1.5 py-1">
                <div className="shimmer-skeleton h-7 w-16 rounded-md" />
                <div className="shimmer-skeleton h-3.5 w-24 rounded" />
              </div>
            ) : (
              <div className="space-y-0.5">
                <div className="text-2xl font-bold font-mono text-sky-600">{brandAnalytics.totalBrandsCount}</div>
                <div className="text-[11px] text-muted truncate">
                  Top: <span className="font-semibold text-foreground">{brandAnalytics.topBrand}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] font-bold text-sky-600 dark:text-sky-400 pt-2 border-t border-border/40">
              <span>Brand breakdown</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </AppCard>

          {/* KPI 4: Expiring Deals (Clickable) */}
          <AppCard
            onClick={() => setActiveReport('EXPIRY_RISK')}
            className="p-4 bg-card-bg border border-border/60 hover:border-amber-500/50 hover:shadow-md rounded-2xl transition cursor-pointer flex flex-col justify-between group space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted truncate">Expiring Deals (≤30d)</span>
              <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            {loading ? (
              <div className="space-y-1.5 py-1">
                <div className="shimmer-skeleton h-7 w-20 rounded-md" />
                <div className="shimmer-skeleton h-3.5 w-24 rounded" />
              </div>
            ) : (
              <div className="space-y-0.5">
                <div className="text-2xl font-bold font-mono text-amber-600">
                  {expiryAnalytics.totalAtRisk}
                </div>
                <div className="text-[11px] text-muted truncate">
                  {expiryAnalytics.criticalCount > 0
                    ? `${expiryAnalytics.criticalCount} Critical (≤3d)`
                    : expiryAnalytics.urgentCount > 0
                    ? `${expiryAnalytics.urgentCount} Urgent (≤7d)`
                    : 'Active pipeline'}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] font-bold text-amber-600 dark:text-amber-400 pt-2 border-t border-border/40">
              <span>Inspect Urgency</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </AppCard>

          {/* KPI 5: Lost Deals & Competitor Intel */}
          <AppCard
            onClick={() => setIsLostReportModalOpen(true)}
            className="p-4 bg-card-bg border border-border/60 hover:border-amber-500/50 hover:shadow-md rounded-2xl transition cursor-pointer flex flex-col justify-between group space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted truncate">Lost Deal Review</span>
              <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>

            {loading ? (
              <div className="space-y-1.5 py-1">
                <div className="shimmer-skeleton h-7 w-16 rounded-md" />
                <div className="shimmer-skeleton h-3.5 w-28 rounded" />
              </div>
            ) : (
              <div className="space-y-0.5">
                <div className="text-2xl font-bold font-mono text-amber-600">{lostDealsList.length}</div>
                <div className="text-[11px] text-muted truncate">
                  Competitor intelligence
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] font-bold text-amber-600 dark:text-amber-400 pt-2 border-t border-border/40">
              <span>Review intel</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </AppCard>
        </div>
      </div>

      {/* SECTION 2: RECENT DEALS INTELLIGENCE STREAM (ZERO HORIZONTAL SCROLL) */}
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
          <div className="max-h-[360px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse table-auto">
              <thead className="sticky top-0 z-10 bg-neutral/95 backdrop-blur-xs border-b border-border/60 text-[11px] font-semibold text-muted uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-2.5 w-[110px]">Deal Ref ID</th>
                  <th className="py-2.5 px-2.5 min-w-[140px]">Customer & Project</th>
                  <th className="py-2.5 px-2 w-[85px]">Brand</th>
                  <th className="py-2.5 px-1.5 text-center w-[55px]">BU</th>
                  <th className="py-2.5 px-2 w-[95px]">Assigned AO</th>
                  <th className="py-2.5 px-2 w-[85px]">Expiry Date</th>
                  <th className="py-2.5 px-1.5 text-center w-[85px]">Status</th>
                  <th className="py-2.5 px-2.5 text-right w-[110px]">Amount</th>
                  <th className="py-2.5 px-1.5 text-center w-[36px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {loading ? (
                  [1, 2, 3, 4].map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="p-2.5"><div className="shimmer-skeleton h-4 w-20 rounded" /></td>
                      <td className="p-2.5"><div className="shimmer-skeleton h-4 w-36 rounded" /></td>
                      <td className="p-2"><div className="shimmer-skeleton h-4 w-16 rounded" /></td>
                      <td className="p-1.5 text-center"><div className="shimmer-skeleton h-4 w-10 mx-auto rounded" /></td>
                      <td className="p-2"><div className="shimmer-skeleton h-4 w-20 rounded" /></td>
                      <td className="p-2"><div className="shimmer-skeleton h-4 w-16 rounded" /></td>
                      <td className="p-1.5 text-center"><div className="shimmer-skeleton h-4 w-14 mx-auto rounded" /></td>
                      <td className="p-2.5 text-right"><div className="shimmer-skeleton h-4 w-20 ml-auto rounded" /></td>
                      <td className="p-1.5"></td>
                    </tr>
                  ))
                ) : recentDeals.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-xs text-muted">
                      No recent deal records found for the selected time range.
                    </td>
                  </tr>
                ) : (
                  recentDeals.map((deal) => {
                    const statusNum = typeof deal.dealStatus === 'number' ? deal.dealStatus : parseInt(deal.dealStatus || '1') || 1;
                    const statusMeta = (DEAL_STATUS_MAP as any)[statusNum] || { label: `Status ${deal.dealStatus}`, variant: 'default' };

                    return (
                      <tr key={deal.dealID} className="hover:bg-neutral/40 transition">
                        <td className="py-2.5 px-2.5 font-mono font-bold text-sky-600 dark:text-sky-400 truncate">
                          {deal.dealRegID || `#${deal.dealID}`}
                        </td>
                        <td className="py-2.5 px-2.5">
                          <div className="font-bold text-foreground truncate max-w-[220px]">{deal.custName || 'Unknown Customer'}</div>
                          <div className="text-[11px] text-muted truncate max-w-[220px]">{deal.ProjectName || deal.projectName || 'Project'}</div>
                        </td>
                        <td className="py-2.5 px-2 font-medium text-foreground truncate">
                          <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-[10px] font-bold">
                            {deal.brand || 'General'}
                          </span>
                        </td>
                        <td className="py-2.5 px-1.5 text-center">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral border border-border/60">
                            {deal.BU || deal.bu || 'BU5'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-muted truncate">
                          {deal.AssignedAO || deal.assignedAO || '-'}
                        </td>
                        <td className="py-2.5 px-2 font-mono text-[11px] text-foreground truncate">
                          {formatDateLong(deal.expDt || deal.expiration)}
                        </td>
                        <td className="py-2.5 px-1.5 text-center">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral border border-border/50 truncate inline-block">
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono font-bold text-foreground truncate">
                          {formatAmounts(deal)}
                        </td>
                        <td className="py-2.5 px-1.5 text-center">
                          <Link
                            href={`/deals/${deal.dealID}`}
                            className="p-1 text-muted hover:text-sky-600 rounded hover:bg-neutral transition inline-flex"
                            title="View Deal Record"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
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

      {/* SECTION 3: DETAILED EXECUTIVE DISTRIBUTION MATRICES (BRANDS & BUSINESS UNITS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Brand Analytics Ledger */}
        <AppCard className="p-5 bg-card-bg border border-border/60 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-foreground">Partner Brand Ecosystem Matrix</h2>
                  <p className="text-[11px] text-muted">OEM volume share, status mix, and gross value breakdown</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-neutral border border-border/60 text-muted">
                {brandDistributionList.length} Brands
              </span>
            </div>

            {/* Interactive Search, Filter & Sort Toolbar */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <div className="flex-1 min-w-[130px]">
                <AppInput
                  prefix={<Search className="w-3.5 h-3.5 text-muted" />}
                  placeholder="Filter brands (e.g. Dell, Cisco)..."
                  value={brandSearch}
                  onChange={(e: any) => setBrandSearch(e.target.value)}
                  allowClear
                  size="sm"
                />
              </div>

              {/* Status Mix Filter */}
              <select
                value={brandStatusFilter}
                onChange={(e: any) => setBrandStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-neutral/60 border border-border/60 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-sky-500/50"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Has Active Deals</option>
                <option value="APPROVED">Has Approved</option>
                <option value="WAITING">Has Waiting</option>
                <option value="LOST">Has Lost Deals</option>
              </select>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-muted" />
                <select
                  value={brandSort}
                  onChange={(e: any) => setBrandSort(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-neutral/60 border border-border/60 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                >
                  <option value="count-desc">Deals (High → Low)</option>
                  <option value="count-asc">Deals (Low → High)</option>
                  <option value="value-desc">Gross Value (High → Low)</option>
                  <option value="value-asc">Gross Value (Low → High)</option>
                  <option value="name-asc">Brand Name (A → Z)</option>
                  <option value="name-desc">Brand Name (Z → A)</option>
                </select>
              </div>

              {(brandSearch || brandStatusFilter !== 'ALL' || brandSort !== 'value-desc') && (
                <button
                  type="button"
                  onClick={() => {
                    setBrandSearch('');
                    setBrandStatusFilter('ALL');
                    setBrandSort('value-desc');
                  }}
                  className="text-[11px] font-bold text-rose-500 hover:underline px-1"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="border border-border/70 rounded-xl overflow-hidden shadow-xs bg-background">
              <div className="max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse table-fixed">
                  <colgroup>
                    <col className="w-[28%]" />
                    <col className="w-[22%]" />
                    <col className="w-[22%]" />
                    <col className="w-[24%]" />
                    <col className="w-[4%]" />
                  </colgroup>
                  <thead className="sticky top-0 z-10 bg-neutral/95 backdrop-blur-xs border-b border-border/60 text-[11px] font-semibold text-muted uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-2.5">Brand</th>
                      <th className="py-2.5 px-2">Market Share</th>
                      <th className="py-2.5 px-2">Status Mix</th>
                      <th className="py-2.5 px-2.5 text-right">Gross Value</th>
                      <th className="py-2.5 px-1.5 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {loading ? (
                      [1, 2, 3, 4].map((i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="p-2.5"><div className="shimmer-skeleton h-4 w-20 rounded" /></td>
                          <td className="p-2"><div className="shimmer-skeleton h-4 w-16 rounded" /></td>
                          <td className="p-2"><div className="shimmer-skeleton h-4 w-28 rounded" /></td>
                          <td className="p-2.5 text-right"><div className="shimmer-skeleton h-4 w-20 ml-auto rounded" /></td>
                          <td className="p-1.5"></td>
                        </tr>
                      ))
                    ) : processedBrandList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-xs text-muted">
                          No matching brand records found.
                        </td>
                      </tr>
                    ) : (
                      processedBrandList.map((item, idx) => {
                        const percentage = deals.length > 0 ? Math.round((item.count / deals.length) * 100) : 0;
                        return (
                          <tr
                            key={item.brand}
                            onClick={() => {
                              setSelectedBrandForDeals(item.brand);
                              setIsBrandDealsModalOpen(true);
                            }}
                            className="hover:bg-neutral/40 transition cursor-pointer group"
                          >
                            <td className="py-2.5 px-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-mono font-bold text-muted w-4 shrink-0">#{idx + 1}</span>
                                <span className="font-bold text-foreground group-hover:text-sky-600 transition truncate">
                                  {item.brand}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-2">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[10px] font-mono">
                                  <span className="font-semibold text-foreground">{item.count} deals</span>
                                  <span className="text-muted">{percentage}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-neutral rounded-full overflow-hidden border border-border/40">
                                  <div
                                    className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full"
                                    style={{ width: `${Math.max(percentage, 4)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-2">
                              <div className="flex items-center gap-1 text-[10px] font-semibold">
                                <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20" title="Active">
                                  {item.activeCount}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" title="Approved">
                                  {item.approvedCount}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" title="Waiting">
                                  {item.waitingCount}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-mono font-bold text-foreground truncate">
                              PHP {item.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </td>
                            <td className="py-2.5 px-1.5 text-center">
                              <ArrowRight className="w-3.5 h-3.5 text-muted group-hover:text-sky-600 group-hover:translate-x-0.5 transition" />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {!loading && brandDistributionList.length > 0 && (
            <div className="pt-3 border-t border-border/40 flex items-center justify-between">
              <span className="text-[11px] text-muted font-medium">
                Showing {processedBrandList.length} of {brandDistributionList.length} partner brands
              </span>
              <button
                type="button"
                onClick={() => setIsBrandModalOpen(true)}
                className="text-xs font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 flex items-center gap-1 hover:underline transition"
              >
                <span>View Full Brand Directory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </AppCard>

        {/* Business Unit Divisional Ledger */}
        <AppCard className="p-5 bg-card-bg border border-border/60 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-foreground">Divisional Quota & BU Matrix</h2>
                  <p className="text-[11px] text-muted">Cross-division pipeline velocity, approval mix, and revenue</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-neutral border border-border/60 text-muted">
                {buDistributionList.length} Total BUs
              </span>
            </div>

            {/* Interactive Search, Filter & Sort Toolbar for BUs */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <div className="flex-1 min-w-[130px]">
                <AppInput
                  prefix={<Search className="w-3.5 h-3.5 text-muted" />}
                  placeholder="Filter BU (e.g. BU5, CE01, CAC)..."
                  value={buSearch}
                  onChange={(e: any) => setBuSearch(e.target.value)}
                  allowClear
                  size="sm"
                />
              </div>

              {/* BU Type Badge */}
              <div className="px-2.5 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                Official BUs ({OFFICIAL_REGISTERED_BUS.length})
              </div>

              {/* Status Mix Filter */}
              <select
                value={buStatusFilter}
                onChange={(e: any) => setBuStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-neutral/60 border border-border/60 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Has Active Deals</option>
                <option value="APPROVED">Has Approved</option>
                <option value="WAITING">Has Waiting</option>
                <option value="LOST">Has Lost Deals</option>
              </select>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-muted" />
                <select
                  value={buSort}
                  onChange={(e: any) => setBuSort(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-neutral/60 border border-border/60 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                >
                  <option value="count-desc">Deals (High → Low)</option>
                  <option value="count-asc">Deals (Low → High)</option>
                  <option value="value-desc">Gross Value (High → Low)</option>
                  <option value="value-asc">Gross Value (Low → High)</option>
                  <option value="name-asc">BU Name (A → Z)</option>
                  <option value="name-desc">BU Name (Z → A)</option>
                </select>
              </div>

              {(buSearch || buTypeFilter !== 'ALL' || buStatusFilter !== 'ALL' || buSort !== 'count-desc') && (
                <button
                  type="button"
                  onClick={() => {
                    setBuSearch('');
                    setBuTypeFilter('ALL');
                    setBuStatusFilter('ALL');
                    setBuSort('count-desc');
                  }}
                  className="text-[11px] font-bold text-rose-500 hover:underline px-1"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="border border-border/70 rounded-xl overflow-hidden shadow-xs bg-background">
              <div className="max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse table-fixed">
                  <colgroup>
                    <col className="w-[28%]" />
                    <col className="w-[22%]" />
                    <col className="w-[22%]" />
                    <col className="w-[24%]" />
                    <col className="w-[4%]" />
                  </colgroup>
                  <thead className="sticky top-0 z-10 bg-neutral/95 backdrop-blur-xs border-b border-border/60 text-[11px] font-semibold text-muted uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-2.5">Division</th>
                      <th className="py-2.5 px-2">Quota Share</th>
                      <th className="py-2.5 px-2">Status Mix</th>
                      <th className="py-2.5 px-2.5 text-right">Gross Value</th>
                      <th className="py-2.5 px-1.5 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {loading ? (
                      [1, 2, 3, 4].map((i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="p-2.5"><div className="shimmer-skeleton h-4 w-16 rounded" /></td>
                          <td className="p-2"><div className="shimmer-skeleton h-4 w-16 rounded" /></td>
                          <td className="p-2"><div className="shimmer-skeleton h-4 w-28 rounded" /></td>
                          <td className="p-2.5 text-right"><div className="shimmer-skeleton h-4 w-20 ml-auto rounded" /></td>
                          <td className="p-1.5"></td>
                        </tr>
                      ))
                    ) : processedBuList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-xs text-muted">
                          No matching business units found.
                        </td>
                      </tr>
                    ) : (
                      processedBuList.map((item, idx) => {
                        const percentage = deals.length > 0 ? Math.round((item.count / deals.length) * 100) : 0;
                        return (
                          <tr
                            key={item.bu}
                            onClick={() => {
                              setSelectedBUForDeals(item.bu);
                              setIsBUDealsModalOpen(true);
                            }}
                            className="hover:bg-neutral/40 transition cursor-pointer group"
                          >
                            <td className="py-2.5 px-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-mono font-bold text-muted w-4 shrink-0">#{idx + 1}</span>
                                <span
                                  className={`text-xs font-bold px-2 py-0.5 rounded-md border ${
                                    item.isOfficial
                                      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                  }`}
                                >
                                  {item.bu}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-2">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[10px] font-mono">
                                  <span className="font-semibold text-foreground">{item.count} deals</span>
                                  <span className="text-muted">{percentage}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-neutral rounded-full overflow-hidden border border-border/40">
                                  <div
                                    className={`h-full rounded-full ${
                                      item.isOfficial
                                        ? 'bg-gradient-to-r from-indigo-500 to-violet-600'
                                        : 'bg-gradient-to-r from-amber-500 to-orange-600'
                                    }`}
                                    style={{ width: `${Math.max(percentage, 4)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-2">
                              <div className="flex items-center gap-1 text-[10px] font-semibold">
                                <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20" title="Active">
                                  {item.activeCount}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" title="Approved">
                                  {item.approvedCount}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" title="Waiting">
                                  {item.waitingCount}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-mono font-bold text-foreground truncate">
                              PHP {item.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </td>
                            <td className="py-2.5 px-1.5 text-center">
                              <ArrowRight className="w-3.5 h-3.5 text-muted group-hover:text-indigo-600 group-hover:translate-x-0.5 transition" />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border/40 flex items-center justify-between">
            <span className="text-[11px] text-muted font-medium">
              Showing {processedBuList.length} of {buDistributionList.length} total business units
            </span>
            <button
              type="button"
              onClick={() => setIsOtherBUModalOpen(true)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 hover:underline transition"
            >
              <span>Inspect All Business Units</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </AppCard>
      </div>

      {/* SECTION 4: 3 CORE INTERACTIVE REPORT STUDIO TILES */}
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
                  Real-time SLA monitoring and renewal risk tracking for opportunities nearing expiry.
                </p>
              </div>              {/* Micro KPI Strip inside Tile */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
                <div className="p-2.5 rounded-xl bg-neutral/40 border border-border/40 min-h-[64px] flex flex-col justify-between">
                  <span className="text-[10px] text-muted font-medium block">At Risk (≤30d)</span>
                  {loading ? (
                    <div className="shimmer-skeleton h-6 w-16 rounded mt-1" />
                  ) : (
                    <span className="text-lg font-bold font-mono text-amber-600">{expiryAnalytics.totalAtRisk} deals</span>
                  )}
                </div>
                <div className="p-2.5 rounded-xl bg-neutral/40 border border-border/40 min-h-[64px] flex flex-col justify-between">
                  <span className="text-[10px] text-muted font-medium block">Critical (≤3d)</span>
                  {loading ? (
                    <div className="shimmer-skeleton h-6 w-16 rounded mt-1" />
                  ) : (
                    <span className="text-lg font-bold font-mono text-rose-600">{expiryAnalytics.criticalCount} deals</span>
                  )}
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
                  Revenue pipeline, volume distribution, and market share metrics across OEM partners.
                </p>
              </div>

              {/* Micro KPI Strip inside Tile */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
                <div className="p-2.5 rounded-xl bg-neutral/40 border border-border/40 min-h-[64px] flex flex-col justify-between">
                  <span className="text-[10px] text-muted font-medium block">Active Brands</span>
                  {loading ? (
                    <div className="shimmer-skeleton h-6 w-12 rounded mt-1" />
                  ) : (
                    <span className="text-lg font-bold font-mono text-sky-600">{brandAnalytics.totalBrandsCount}</span>
                  )}
                </div>
                <div className="p-2.5 rounded-xl bg-neutral/40 border border-border/40 min-h-[64px] flex flex-col justify-between">
                  <span className="text-[10px] text-muted font-medium block">Top Brand</span>
                  {loading ? (
                    <div className="shimmer-skeleton h-6 w-20 rounded mt-1" />
                  ) : (
                    <span className="text-lg font-bold text-foreground truncate block">{brandAnalytics.topBrand}</span>
                  )}
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
                  <Building2 className="w-4 h-4" />
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
                  Cross-divisional pipeline volume, conversion rates, and revenue leadership across BUs and AOs.
                </p>
              </div>

              {/* Micro KPI Strip inside Tile */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
                <div className="p-2.5 rounded-xl bg-neutral/40 border border-border/40 min-h-[64px] flex flex-col justify-between">
                  <span className="text-[10px] text-muted font-medium block">Covered BUs</span>
                  {loading ? (
                    <div className="shimmer-skeleton h-6 w-20 rounded mt-1" />
                  ) : (
                    <span className="text-lg font-bold font-mono text-indigo-600">
                      {OFFICIAL_REGISTERED_BUS.length} Official BUs
                    </span>
                  )}
                </div>
                <div className="p-2.5 rounded-xl bg-neutral/40 border border-border/40 min-h-[64px] flex flex-col justify-between">
                  <span className="text-[10px] text-muted font-medium block">Top Revenue BU</span>
                  {loading ? (
                    <div className="shimmer-skeleton h-6 w-16 rounded mt-1" />
                  ) : (
                    <span className="text-lg font-bold text-foreground truncate block">{buAnalytics.topBU}</span>
                  )}
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
      {/* 5 KPI DRILLDOWN MODALS (LANDSCAPE UNIFORM FORMAT WITH FILTER & SORT) */}
      {/* ========================================================================= */}

      {/* KPI Modal 1: Registered Deals Drilldown */}
      <AppModal
        open={isRegisteredModalOpen}
        onClose={() => {
          setIsRegisteredModalOpen(false);
          registeredFilters.resetFilters();
        }}
        width={1160}
      >
        <AppModal.Header>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <div>
              <AppModal.Title>Active Registered Deals</AppModal.Title>
              <AppModal.Description>
                Detailed overview of approved opportunities across business units and account officers.
              </AppModal.Description>
            </div>
          </div>
        </AppModal.Header>

        <AppModal.Body className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <AppInput
                prefix={<Search className="w-4 h-4 text-muted" />}
                placeholder="Search registered deals by Project, Customer, Reg ID, Brand, BU, AO, Remarks..."
                value={registeredFilters.searchQuery}
                onChange={(e: any) => registeredFilters.setSearchQuery(e.target.value)}
                allowClear
                size="md"
              />
            </div>
            <DealsFilterPopover
              buFilters={registeredFilters.buFilters}
              onBuFiltersChange={registeredFilters.setBuFilters}
              expiryFilters={registeredFilters.expiryFilters}
              onExpiryFiltersChange={registeredFilters.setExpiryFilters}
              statusFilters={registeredFilters.statusFilters}
              onStatusFiltersChange={registeredFilters.setStatusFilters}
              officialBUs={OFFICIAL_REGISTERED_BUS}
            />
            <DealsSortPopover
              value={registeredFilters.sortConfig}
              onChange={registeredFilters.setSortConfig}
            />
          </div>

          <ModalDealTable
            deals={registeredFilters.filteredAndSortedDeals}
            onCloseModal={() => setIsRegisteredModalOpen(false)}
          />
        </AppModal.Body>

        <AppModal.Footer className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-muted">
            Showing {registeredFilters.filteredAndSortedDeals.length} of {registeredDealsList.length} registered deals
          </span>
          <AppButton
            variant="neutral"
            size="sm"
            onClick={() => {
              setIsRegisteredModalOpen(false);
              registeredFilters.resetFilters();
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
          expiredFilters.resetFilters();
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
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <AppInput
                prefix={<Search className="w-4 h-4 text-muted" />}
                placeholder="Search expired deals by Project, Customer, Reg ID, Brand, BU, AO, Remarks..."
                value={expiredFilters.searchQuery}
                onChange={(e: any) => expiredFilters.setSearchQuery(e.target.value)}
                allowClear
                size="md"
              />
            </div>
            <DealsFilterPopover
              buFilters={expiredFilters.buFilters}
              onBuFiltersChange={expiredFilters.setBuFilters}
              expiryFilters={expiredFilters.expiryFilters}
              onExpiryFiltersChange={expiredFilters.setExpiryFilters}
              statusFilters={expiredFilters.statusFilters}
              onStatusFiltersChange={expiredFilters.setStatusFilters}
              officialBUs={OFFICIAL_REGISTERED_BUS}
            />
            <DealsSortPopover
              value={expiredFilters.sortConfig}
              onChange={expiredFilters.setSortConfig}
            />
          </div>

          <ModalDealTable
            deals={expiredFilters.filteredAndSortedDeals}
            onCloseModal={() => setIsExpiredModalOpen(false)}
          />
        </AppModal.Body>

        <AppModal.Footer className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-muted">
            Showing {expiredFilters.filteredAndSortedDeals.length} of {expiredDealsList.length} expired deals
          </span>
          <AppButton
            variant="neutral"
            size="sm"
            onClick={() => {
              setIsExpiredModalOpen(false);
              expiredFilters.resetFilters();
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
          setDebouncedBrandSearch('');
          setModalBrandSort('count-desc');
        }}
        width={1160}
      >
        <AppModal.Header>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-600" />
            <div>
              <AppModal.Title>Active Brand Breakdown Directory</AppModal.Title>
              <AppModal.Description>
                Distribution of pipeline value and deal volume across represented brands. Click any brand to view deals.
              </AppModal.Description>
            </div>
          </div>
        </AppModal.Header>

        <AppModal.Body className="space-y-4">
          {/* Search and Sort Toolbar */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="flex-1 min-w-[200px]">
              <AppInput
                prefix={<Search className="w-4 h-4 text-muted" />}
                placeholder="Search brand (e.g. Dell, Cisco, HPE, Lenovo)..."
                value={brandSearchInput}
                onChange={(e: any) => setBrandSearchInput(e.target.value)}
                allowClear
                size="md"
              />
            </div>

            <div className="flex items-center gap-1">
              <ArrowUpDown className="w-4 h-4 text-muted" />
              <select
                value={modalBrandSort}
                onChange={(e: any) => setModalBrandSort(e.target.value)}
                className="px-3 py-2 rounded-xl bg-card-bg border border-border/60 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="count-desc">Deals (High → Low)</option>
                <option value="count-asc">Deals (Low → High)</option>
                <option value="value-desc">Gross Value (High → Low)</option>
                <option value="value-asc">Gross Value (Low → High)</option>
                <option value="name-asc">Brand Name (A → Z)</option>
                <option value="name-desc">Brand Name (Z → A)</option>
              </select>
            </div>

            {(brandSearchInput || modalBrandSort !== 'value-desc') && (
              <button
                type="button"
                onClick={() => {
                  setBrandSearchInput('');
                  setDebouncedBrandSearch('');
                  setModalBrandSort('value-desc');
                }}
                className="text-xs font-bold text-rose-500 hover:underline px-1"
              >
                Reset
              </button>
            )}
          </div>

          <div className="border border-border/70 rounded-xl overflow-hidden max-h-[420px] overflow-y-auto overflow-x-hidden divide-y divide-border/40">
            {filteredBrandsInModal.length === 0 ? (
              <div className="p-8 text-center text-muted text-xs space-y-1">
                <Layers className="w-7 h-7 mx-auto text-muted/50 mb-1.5" />
                <p className="font-semibold text-foreground">No matching brands found</p>
              </div>
            ) : (
              filteredBrandsInModal.map((item, idx) => {
                const percentage = deals.length > 0 ? Math.round((item.count / deals.length) * 100) : 0;
                return (
                  <div
                    key={item.brand}
                    onClick={() => {
                      setSelectedBrandForDeals(item.brand);
                      setIsBrandDealsModalOpen(true);
                    }}
                    className="p-3.5 flex items-center justify-between gap-4 hover:bg-neutral/40 transition cursor-pointer text-xs group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-[10px] font-mono font-bold text-muted w-5 shrink-0">#{idx + 1}</span>
                      <span className="font-bold text-foreground group-hover:text-sky-600 transition truncate text-sm">
                        {item.brand}
                      </span>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 border border-sky-500/20 shrink-0">
                        {item.count} {item.count === 1 ? 'deal' : 'deals'} ({percentage}%)
                      </span>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 text-right">
                      <div className="space-y-0.5">
                        <div className="font-mono font-bold text-foreground text-sm">
                          PHP {item.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-[10px] text-muted">
                          {item.activeCount} active • {item.approvedCount} approved • {item.waitingCount} waiting
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted group-hover:text-sky-600 group-hover:translate-x-1 transition" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </AppModal.Body>

        <AppModal.Footer className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-muted">
            Showing {filteredBrandsInModal.length} of {brandDistributionList.length} partner brands
          </span>
          <AppButton
            variant="neutral"
            size="sm"
            onClick={() => {
              setIsBrandModalOpen(false);
              setBrandSearchInput('');
              setDebouncedBrandSearch('');
              setModalBrandSort('count-desc');
            }}
          >
            Close
          </AppButton>
        </AppModal.Footer>
      </AppModal>

      {/* Brand Deals Drilldown Modal (Landscape Table with Filter & Sort) */}
      <AppModal
        open={isBrandDealsModalOpen}
        onClose={() => {
          setIsBrandDealsModalOpen(false);
          setSelectedBrandForDeals(null);
          brandDealsFilters.resetFilters();
        }}
        width={1160}
      >
        <AppModal.Header>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 shrink-0">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <AppModal.Title>
                {selectedBrandForDeals || 'Brand'} — Deals Breakdown
              </AppModal.Title>
              <AppModal.Description>
                Detailed pipeline and registered opportunities under {selectedBrandForDeals || 'this brand'}.
              </AppModal.Description>
            </div>
          </div>
        </AppModal.Header>

        <AppModal.Body className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <AppInput
                prefix={<Search className="w-4 h-4 text-muted" />}
                placeholder={`Search ${selectedBrandForDeals || ''} deals by Customer, Reg ID, BU, AO, Remarks...`}
                value={brandDealsFilters.searchQuery}
                onChange={(e: any) => brandDealsFilters.setSearchQuery(e.target.value)}
                allowClear
                size="md"
              />
            </div>
            <DealsFilterPopover
              buFilters={brandDealsFilters.buFilters}
              onBuFiltersChange={brandDealsFilters.setBuFilters}
              expiryFilters={brandDealsFilters.expiryFilters}
              onExpiryFiltersChange={brandDealsFilters.setExpiryFilters}
              statusFilters={brandDealsFilters.statusFilters}
              onStatusFiltersChange={brandDealsFilters.setStatusFilters}
              officialBUs={OFFICIAL_REGISTERED_BUS}
            />
            <DealsSortPopover
              value={brandDealsFilters.sortConfig}
              onChange={brandDealsFilters.setSortConfig}
            />
          </div>

          <ModalDealTable
            deals={brandDealsFilters.filteredAndSortedDeals}
            onCloseModal={() => setIsBrandDealsModalOpen(false)}
          />
        </AppModal.Body>

        <AppModal.Footer className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-muted">
            Showing {brandDealsFilters.filteredAndSortedDeals.length} of {brandDealsList.length} deals
          </span>
          <AppButton
            variant="neutral"
            size="sm"
            onClick={() => {
              setIsBrandDealsModalOpen(false);
              setSelectedBrandForDeals(null);
              brandDealsFilters.resetFilters();
            }}
          >
            Close
          </AppButton>
        </AppModal.Footer>
      </AppModal>

      {/* KPI Modal 4: Business Units Portfolio Directory Modal (ALL BUs + Filters) */}
      <AppModal
        open={isOtherBUModalOpen}
        onClose={() => {
          setIsOtherBUModalOpen(false);
          setModalBUSearch('');
          setModalBUTypeFilter('ALL');
          setModalBUSort('count-desc');
        }}
        width={1160}
      >
        <AppModal.Header>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <div>
              <AppModal.Title>Business Units Portfolio Directory</AppModal.Title>
              <AppModal.Description>
                Complete cross-divisional breakdown of all official and specialized business units. Click any unit to view deals.
              </AppModal.Description>
            </div>
          </div>
        </AppModal.Header>

        <AppModal.Body className="space-y-4">
          {/* Search, Filter Tabs & Sort Toolbar */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="flex-1 min-w-[200px]">
              <AppInput
                prefix={<Search className="w-4 h-4 text-muted" />}
                placeholder="Search business unit (e.g. BU5, CE01, CAC, CSD, ESD)..."
                value={modalBUSearch}
                onChange={(e: any) => setModalBUSearch(e.target.value)}
                allowClear
                size="md"
              />
            </div>

            {/* Type Filter Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              Official Registered BUs ({OFFICIAL_REGISTERED_BUS.length})
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1">
              <ArrowUpDown className="w-4 h-4 text-muted" />
              <select
                value={modalBUSort}
                onChange={(e: any) => setModalBUSort(e.target.value)}
                className="px-3 py-2 rounded-xl bg-card-bg border border-border/60 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="count-desc">Deals (High → Low)</option>
                <option value="count-asc">Deals (Low → High)</option>
                <option value="value-desc">Gross Value (High → Low)</option>
                <option value="value-asc">Gross Value (Low → High)</option>
                <option value="name-asc">BU Name (A → Z)</option>
                <option value="name-desc">BU Name (Z → A)</option>
              </select>
            </div>

            {(modalBUSearch || modalBUTypeFilter !== 'ALL' || modalBUSort !== 'count-desc') && (
              <button
                type="button"
                onClick={() => {
                  setModalBUSearch('');
                  setModalBUTypeFilter('ALL');
                  setModalBUSort('count-desc');
                }}
                className="text-xs font-bold text-rose-500 hover:underline px-1"
              >
                Reset
              </button>
            )}
          </div>

          <div className="border border-border/70 rounded-xl overflow-hidden max-h-[420px] overflow-y-auto overflow-x-hidden divide-y divide-border/40">
            {filteredBUsInModal.length === 0 ? (
              <div className="p-8 text-center text-muted text-xs space-y-1">
                <Building2 className="w-7 h-7 mx-auto text-muted/50 mb-1.5" />
                <p className="font-semibold text-foreground">No matching business units found</p>
              </div>
            ) : (
              filteredBUsInModal.map((item, idx) => {
                const percentage = deals.length > 0 ? Math.round((item.count / deals.length) * 100) : 0;
                return (
                  <div
                    key={item.bu}
                    onClick={() => {
                      setSelectedBUForDeals(item.bu);
                      setIsBUDealsModalOpen(true);
                    }}
                    className="p-3.5 flex items-center justify-between gap-4 hover:bg-neutral/40 transition cursor-pointer text-xs group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-[10px] font-mono font-bold text-muted w-5 shrink-0">#{idx + 1}</span>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
                          item.isOfficial
                            ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {item.bu}
                      </span>
                      <span className="text-[11px] text-muted font-medium">
                        {item.isOfficial ? 'Official BU' : 'Specialized Division'}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral border border-border/60 shrink-0">
                        {item.count} {item.count === 1 ? 'deal' : 'deals'} ({percentage}%)
                      </span>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 text-right">
                      <div className="space-y-0.5">
                        <div className="font-mono font-bold text-foreground text-sm">
                          PHP {item.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-[10px] text-muted">
                          {item.activeCount} active • {item.approvedCount} approved • {item.waitingCount} waiting
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted group-hover:text-indigo-600 group-hover:translate-x-1 transition" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </AppModal.Body>

        <AppModal.Footer className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-muted">
            Showing {filteredBUsInModal.length} of {buDistributionList.length} business units
          </span>
          <AppButton
            variant="neutral"
            size="sm"
            onClick={() => {
              setIsOtherBUModalOpen(false);
              setModalBUSearch('');
              setModalBUTypeFilter('ALL');
              setModalBUSort('count-desc');
            }}
          >
            Close
          </AppButton>
        </AppModal.Footer>
      </AppModal>

      {/* BU Deals Drilldown Modal (Landscape Table with Filter & Sort) */}
      <AppModal
        open={isBUDealsModalOpen}
        onClose={() => {
          setIsBUDealsModalOpen(false);
          setSelectedBUForDeals(null);
          buDealsFilters.resetFilters();
        }}
        width={1160}
      >
        <AppModal.Header>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <AppModal.Title>
                {selectedBUForDeals || 'Business Unit'} — Deals Breakdown
              </AppModal.Title>
              <AppModal.Description>
                Detailed overview of opportunities registered under {selectedBUForDeals || 'this business unit'}.
              </AppModal.Description>
            </div>
          </div>
        </AppModal.Header>

        <AppModal.Body className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <AppInput
                prefix={<Search className="w-4 h-4 text-muted" />}
                placeholder={`Search ${selectedBUForDeals || ''} deals by Customer, Reg ID, Brand, AO, Remarks...`}
                value={buDealsFilters.searchQuery}
                onChange={(e: any) => buDealsFilters.setSearchQuery(e.target.value)}
                allowClear
                size="md"
              />
            </div>
            <DealsFilterPopover
              buFilters={buDealsFilters.buFilters}
              onBuFiltersChange={buDealsFilters.setBuFilters}
              expiryFilters={buDealsFilters.expiryFilters}
              onExpiryFiltersChange={buDealsFilters.setExpiryFilters}
              statusFilters={buDealsFilters.statusFilters}
              onStatusFiltersChange={buDealsFilters.setStatusFilters}
              officialBUs={OFFICIAL_REGISTERED_BUS}
              hideBUFilter={true}
            />
            <DealsSortPopover
              value={buDealsFilters.sortConfig}
              onChange={buDealsFilters.setSortConfig}
            />
          </div>

          <ModalDealTable
            deals={buDealsFilters.filteredAndSortedDeals}
            onCloseModal={() => setIsBUDealsModalOpen(false)}
          />
        </AppModal.Body>

        <AppModal.Footer className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-muted">
            Showing {buDealsFilters.filteredAndSortedDeals.length} of {buDealsList.length} deals
          </span>
          <AppButton
            variant="neutral"
            size="sm"
            onClick={() => {
              setIsBUDealsModalOpen(false);
              setSelectedBUForDeals(null);
              buDealsFilters.resetFilters();
            }}
          >
            Close
          </AppButton>
        </AppModal.Footer>
      </AppModal>

      {/* KPI Modal: Renewed Deals Drilldown */}
      <AppModal
        open={isRenewedModalOpen}
        onClose={() => {
          setIsRenewedModalOpen(false);
          renewedFilters.resetFilters();
        }}
        width={1160}
      >
        <AppModal.Header>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shrink-0">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <AppModal.Title>
                Renewed Deals Directory ({renewedFilters.filteredAndSortedDeals.length})
              </AppModal.Title>
              <AppModal.Description>
                Overview of deal registrations with processed validity extensions and renewal records.
              </AppModal.Description>
            </div>
          </div>
        </AppModal.Header>

        <AppModal.Body className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <AppInput
                prefix={<Search className="w-4 h-4 text-muted" />}
                placeholder="Search renewed deals by Customer, Reg ID, Brand, BU, AO, Remarks..."
                value={renewedFilters.searchQuery}
                onChange={(e: any) => renewedFilters.setSearchQuery(e.target.value)}
                allowClear
                size="md"
              />
            </div>
            <DealsFilterPopover
              buFilters={renewedFilters.buFilters}
              onBuFiltersChange={renewedFilters.setBuFilters}
              expiryFilters={renewedFilters.expiryFilters}
              onExpiryFiltersChange={renewedFilters.setExpiryFilters}
              statusFilters={renewedFilters.statusFilters}
              onStatusFiltersChange={renewedFilters.setStatusFilters}
              officialBUs={OFFICIAL_REGISTERED_BUS}
            />
            <DealsSortPopover
              value={renewedFilters.sortConfig}
              onChange={renewedFilters.setSortConfig}
            />
          </div>

          <ModalDealTable
            deals={renewedFilters.filteredAndSortedDeals}
            onCloseModal={() => setIsRenewedModalOpen(false)}
          />
        </AppModal.Body>

        <AppModal.Footer className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-muted">
            Showing {renewedFilters.filteredAndSortedDeals.length} of {renewedDealsList.length} renewed deals
          </span>
          <AppButton
            variant="neutral"
            size="sm"
            onClick={() => {
              setIsRenewedModalOpen(false);
              renewedFilters.resetFilters();
            }}
          >
            Close
          </AppButton>
        </AppModal.Footer>
      </AppModal>

      {/* KPI Modal 5: Lost Deals & Competitor Intel Drilldown */}
      <DealLostListModal
        isOpen={isLostReportModalOpen}
        onClose={() => setIsLostReportModalOpen(false)}
        deals={deals}
        loading={loading}
      />

      {/* ========================================================================= */}
      {/* 3 CUSTOM-VIEW DEEP DIVE REPORT STUDIO MODALS */}
      {/* ========================================================================= */}
      <AppModal
        open={activeReport !== null}
        onClose={() => setActiveReport(null)}
        width={1160}
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
                    placeholder="Filter records by keyword, AO, BU, remarks..."
                    value={modalSearchQuery}
                    onChange={(e: any) => setModalSearchQuery(e.target.value)}
                    allowClear
                    size="sm"
                  />
                </div>

                {/* View Mode Switcher */}
                <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border shadow-xs shrink-0 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setModalViewMode('SUMMARY')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                      modalViewMode === 'SUMMARY'
                        ? 'bg-primary text-white shadow-xs font-bold'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    Summary
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalViewMode('CHARTS')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                      modalViewMode === 'CHARTS'
                        ? 'bg-primary text-white shadow-xs font-bold'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    Charts
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalViewMode('GRID')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                      modalViewMode === 'GRID'
                        ? 'bg-primary text-white shadow-xs font-bold'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    Data Grid ({modalFilteredDeals.length})
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
                    {OFFICIAL_REGISTERED_BUS.map((bu) => (
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
                        {studioExpiryAnalytics.criticalCount}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/25">
                      <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider block">Urgent (≤7d)</span>
                      <span className="text-xl font-bold font-mono text-orange-600 mt-1 block">
                        {studioExpiryAnalytics.urgentCount}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">Warning (≤15d)</span>
                      <span className="text-xl font-bold font-mono text-amber-600 mt-1 block">
                        {studioExpiryAnalytics.warningCount}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-yellow-500/10 border border-yellow-500/25">
                      <span className="text-[10px] font-bold text-yellow-600 uppercase tracking-wider block">Notice (≤30d)</span>
                      <span className="text-xl font-bold font-mono text-yellow-700 mt-1 block">
                        {studioExpiryAnalytics.noticeCount}
                      </span>
                    </div>
                  </div>
                )}

                {activeReport === 'BRAND_ANALYTICS' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/25">
                      <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider block">Active Brands</span>
                      <span className="text-xl font-bold font-mono text-sky-600 mt-1 block">
                        {studioBrandAnalytics.totalBrandsCount}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/25">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">Total Pipeline</span>
                      <span className="text-xl font-bold font-mono text-primary mt-1 block">
                        PHP {studioBrandAnalytics.grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Top Market Share</span>
                      <span className="text-xl font-bold text-foreground mt-1 block truncate">
                        {studioBrandAnalytics.topBrand}
                      </span>
                    </div>
                  </div>
                )}

                {activeReport === 'BU_MATRIX' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Business Units</span>
                      <span className="text-xl font-bold font-mono text-indigo-600 mt-1 block">
                        {studioBuAnalytics.coveredBUsCount} BUs Active
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Top Revenue Leader</span>
                      <span className="text-xl font-bold text-foreground mt-1 block truncate">
                        {studioBuAnalytics.topBU}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/25">
                      <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider block">Total Pipeline</span>
                      <span className="text-xl font-bold font-mono text-foreground mt-1 block">
                        PHP {studioBuAnalytics.grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
                      {studioBrandAnalytics.brandsList.slice(0, 10).map(([brand, data], idx) => {
                        const pct = studioBrandAnalytics.grandTotal > 0 ? (data.totalValue / studioBrandAnalytics.grandTotal) * 100 : 0;
                        return (
                          <div key={brand} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[10px] font-mono font-bold text-muted w-4">#{idx + 1}</span>
                                <span className="font-semibold text-foreground">{brand}</span>
                              </div>
                              <div className="flex items-center gap-2 font-mono text-muted text-xs">
                                <span className="text-foreground/90 font-bold">
                                  PHP {data.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                                <span className="text-[11px] text-muted">
                                  • {data.count.toLocaleString()} deals ({pct.toFixed(1)}%)
                                </span>
                              </div>
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
                        { label: 'Critical (≤3d left)', count: studioExpiryAnalytics.criticalCount, color: 'from-rose-500 to-red-600' },
                        { label: 'Urgent (≤7d left)', count: studioExpiryAnalytics.urgentCount, color: 'from-orange-500 to-amber-600' },
                        { label: 'Warning (≤15d left)', count: studioExpiryAnalytics.warningCount, color: 'from-amber-500 to-yellow-600' },
                        { label: 'Notice (≤30d left)', count: studioExpiryAnalytics.noticeCount, color: 'from-yellow-400 to-emerald-500' },
                      ].map((item) => {
                        const total = studioExpiryAnalytics.totalAtRisk || 1;
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
                      {studioBuAnalytics.buList.slice(0, 8).map(([bu, data]) => {
                        const maxVal = studioBuAnalytics.buList[0]?.[1].totalValue || 1;
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

            {/* VIEW MODE 3: IN-APP DATA GRID WITH REMARKS */}
            {modalViewMode === 'GRID' && (
              <ModalDealTable
                deals={modalFilteredDeals}
                onCloseModal={() => setActiveReport(null)}
              />
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
