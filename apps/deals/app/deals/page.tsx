'use client';

import React, { Suspense, useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useDealsQuery, usePaginatedDealsQuery, useCurrentUserFilter, DEAL_QUERY_KEYS } from '@/hooks/useDealsQuery';
import { getDealById } from '@/app/actions/deals';
import {
  DealHeaderRecord,
  ScopedDealsFilter,
  UserRole,
  DEAL_STATUS_MAP,
  ACTIVE_BUSINESS_UNITS,
  ALL_BUSINESS_UNITS,
} from '@my-app/types';
import { formatDateLong } from '@/components/utils/time';
import {
  AppTable,
  AppChip,
  AppInput,
  AppCard,
  AppModal,
  AppButton,
} from '../../components/ui';
import dynamic from 'next/dynamic';

const WTNModal = dynamic(() => import('../../components/WTNModal'), { ssr: false });
const LostDealModal = dynamic(() => import('../../components/LostDealModal'), { ssr: false });
const DealDetailsModal = dynamic(() => import('../../components/DealDetailsModal'), { ssr: false });
import {
  Search,
  Edit,
  BellRing,
  ShieldAlert,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  Calendar,
  Layers,
  User,
  Eye,
  MoreVertical,
  Building2,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

import {
  DateRangeFilterPopover,
  DateRangeValue,
  filterDealByDateRange,
} from '@/components/DateRangeFilterPopover';
import DealsFilterPopover from '@/components/DealsFilterPopover';
import DealsSortPopover, { SortConfig } from '@/components/DealsSortPopover';
import { OFFICIAL_REGISTERED_BUS, normalizeBU, isOfficialBU, filterOfficialDeals } from '@/lib/buUtils';

function DealsContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const role: UserRole = (session?.user as any)?.role || 'admin';
  const canCreate = role === 'admin' || role === 'aa';
  const canEdit = role === 'admin' || role === 'aa';

  const prefetchDealDetail = (dealID: number) => {
    if (!dealID || isNaN(dealID)) return;
    queryClient.prefetchQuery({
      queryKey: DEAL_QUERY_KEYS.detail(dealID),
      queryFn: async () => {
        const res = await getDealById(dealID);
        return res.data || null;
      },
      staleTime: 1000 * 60 * 15,
    });
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [buFilters, setBuFilters] = useState<string[]>([]);
  const [aoFilters, setAoFilters] = useState<string[]>([]);
  const [expiryFilters, setExpiryFilters] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    preset: 'ALL',
    label: 'All Time',
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'dtRegistered',
    order: 'desc',
  });

  // Debounce search input to avoid spamming server queries
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Modals
  const [viewTarget, setViewTarget] = useState<number | null>(null);
  const [wtnTarget, setWtnTarget] = useState<{ id: number; regID: string; date?: string | Date | null } | null>(null);
  const [lostTarget, setLostTarget] = useState<{ id: number; regID: string } | null>(null);

  const scopedFilter = useCurrentUserFilter();

  const queryFilter: ScopedDealsFilter = useMemo(() => {
    return {
      ...scopedFilter,
      searchQuery: debouncedSearch,
      statusFilter: statusFilters.length > 0 ? statusFilters : undefined,
      buFilter: buFilters.length > 0 ? buFilters : undefined,
      aoFilter: aoFilters.length > 0 ? aoFilters : undefined,
      expiryFilter: expiryFilters.length > 0 ? expiryFilters : undefined,
      startDate: dateRange.preset !== 'ALL' && dateRange.startDate ? dateRange.startDate : undefined,
      endDate: dateRange.preset !== 'ALL' && dateRange.endDate ? dateRange.endDate : undefined,
      sortBy: sortConfig.field,
      sortOrder: sortConfig.order,
      page: currentPage,
      pageSize: pageSize,
    };
  }, [
    scopedFilter,
    debouncedSearch,
    statusFilters,
    buFilters,
    aoFilters,
    expiryFilters,
    dateRange,
    sortConfig,
    currentPage,
    pageSize,
  ]);

  const { data: queryResult, isLoading: loading, refetch: fetchDeals } = usePaginatedDealsQuery(queryFilter);

  const rawDeals: DealHeaderRecord[] = queryResult?.data || [];
  const totalRecords = queryResult?.totalCount || 0;
  const totalPages = queryResult?.totalPages || 1;

  // Filter deals registry strictly to the 7 official BUs
  const deals: DealHeaderRecord[] = useMemo(() => {
    return filterOfficialDeals<DealHeaderRecord>(rawDeals);
  }, [rawDeals]);

  // Ref to track initial mount restoration
  const isInitializedRef = React.useRef(false);

  // Save current view state before navigating to detail
  const saveViewState = () => {
    try {
      const state = {
        searchQuery,
        statusFilters,
        buFilters,
        aoFilters,
        expiryFilters,
        dateRange,
        sortConfig,
        currentPage,
        pageSize,
        scrollY: typeof window !== 'undefined' ? window.scrollY : 0,
      };
      sessionStorage.setItem('DEALS_REGISTRY_VIEW_STATE', JSON.stringify(state));
    } catch {}
  };

  // Handle URL navigation parameters and restore view state
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const hasSearchParams = Boolean(searchParams && Array.from(searchParams.keys()).length > 0);

    if (hasSearchParams && searchParams) {
      const viewParam = searchParams.get('view') || searchParams.get('dealID');
      if (viewParam) {
        const idNum = parseInt(viewParam, 10);
        if (!isNaN(idNum) && idNum > 0) {
          setViewTarget(idNum);
        }
      }

      const statusParam = searchParams.get('status');
      if (statusParam) {
        const statuses = statusParam.split(',').map((s) => s.trim()).filter(Boolean);
        if (statuses.length > 0) {
          setStatusFilters(statuses);
        }
      }

      const brandParam = searchParams.get('brand');
      if (brandParam) {
        setSearchQuery(brandParam);
      }

      const buParam = searchParams.get('bu');
      if (buParam) {
        setBuFilters([buParam]);
      }

      const aoParam = searchParams.get('ao');
      if (aoParam) {
        setAoFilters([aoParam]);
      }

      const qParam = searchParams.get('search') || searchParams.get('q');
      if (qParam) {
        setSearchQuery(qParam);
      }

      const pageParam = searchParams.get('page');
      if (pageParam) {
        const p = parseInt(pageParam, 10);
        if (!isNaN(p) && p > 0) {
          setCurrentPage(p);
        }
      }
    } else {
      // Restore from sessionStorage if user navigated back without search params
      try {
        const saved = sessionStorage.getItem('DEALS_REGISTRY_VIEW_STATE');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.searchQuery !== undefined) setSearchQuery(parsed.searchQuery);
          if (parsed.statusFilters) setStatusFilters(parsed.statusFilters);
          if (parsed.buFilters) setBuFilters(parsed.buFilters);
          if (parsed.aoFilters) setAoFilters(parsed.aoFilters);
          if (parsed.expiryFilters) setExpiryFilters(parsed.expiryFilters);
          if (parsed.dateRange) setDateRange(parsed.dateRange);
          if (parsed.sortConfig) setSortConfig(parsed.sortConfig);
          if (parsed.currentPage) setCurrentPage(parsed.currentPage);
          if (parsed.pageSize) setPageSize(parsed.pageSize);
          if (parsed.scrollY && typeof window !== 'undefined') {
            setTimeout(() => {
              window.scrollTo({ top: parsed.scrollY, behavior: 'instant' });
            }, 100);
          }
        }
      } catch {}
    }
  }, [searchParams]);

  // Keep status dynamic when changed via URL searchParams (e.g. sidebar navigation)
  useEffect(() => {
    if (!searchParams) return;
    const statusParam = searchParams.get('status');
    if (statusParam !== null) {
      const statuses = statusParam.split(',').map((s) => s.trim()).filter(Boolean);
      setStatusFilters(statuses);
    }
  }, [searchParams]);

  const dealsCountByBU = useMemo(() => {
    const map: Record<string, number> = {};
    deals.forEach((d) => {
      const bu = normalizeBU(d.BU || d.bu || '');
      if (bu) map[bu] = (map[bu] || 0) + 1;
    });
    return map;
  }, [deals]);

  // Official Registered Business Units
  const OFFICIAL_BUS = useMemo(() => {
    return [...OFFICIAL_REGISTERED_BUS];
  }, []);

  const otherBUsMap = useMemo(() => {
    return {};
  }, []);

  const dealsCountByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    deals.forEach((d) => {
      const st = String(d.dealStatus);
      map[st] = (map[st] || 0) + 1;
    });
    return map;
  }, [deals]);

  const availableAOs = useMemo(() => {
    const countsMap: Record<string, number> = {};
    deals.forEach((d) => {
      const ao = (d.AssignedAO || d.assignedAO || '').trim();
      if (ao) {
        countsMap[ao] = (countsMap[ao] || 0) + 1;
      }
    });
    return Object.entries(countsMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [deals]);

  const getDaysUntilExp = (expDt: Date | string | null | undefined) => {
    if (!expDt) return null;
    const now = new Date().getTime();
    const exp = new Date(expDt).getTime();
    if (isNaN(exp)) return null;
    return Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
  };

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilters, buFilters, aoFilters, dateRange, expiryFilters, sortConfig, pageSize]);

  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedDeals = deals;

  const startRecord = totalRecords === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endRecord = Math.min(safeCurrentPage * pageSize, totalRecords);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxButtons = 5;
    let startPage = Math.max(1, safeCurrentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }, [safeCurrentPage, totalPages]);

  // Metrics summary
  const metrics = useMemo(() => {
    const totalCount = deals.length;
    const registeredCount = deals.filter((d) => String(d.dealStatus) === '1' || d.dealStatus === 1).length;
    const pendingCount = deals.filter((d) => String(d.dealStatus) === '4' || String(d.dealStatus) === '3' || d.dealStatus === 4).length;
    const lostCount = deals.filter((d) => String(d.dealStatus) === '7' || d.dealStatus === 7).length;

    const now = new Date().getTime();
    const expiringSoon = deals.filter((d) => {
      const expDate = d.expDt || d.expiration;
      if (!expDate) return false;
      const exp = new Date(expDate).getTime();
      const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 90;
    }).length;

    return { totalCount, registeredCount, pendingCount, lostCount, expiringSoon };
  }, [deals]);

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

  const renderExpiryBadge = (expDate: Date | string | null | undefined) => {
    const days = getDaysUntilExp(expDate);
    if (days === null) return null;

    if (days <= 0) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
          Expired ({Math.abs(days)}d ago)
        </span>
      );
    }
    if (days <= 3) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse">
          Critical: {days}d left
        </span>
      );
    }
    if (days <= 7) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">
          Urgent: {days}d left
        </span>
      );
    }
    if (days <= 15) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
          Warning: {days}d left
        </span>
      );
    }
    if (days <= 30) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30">
          Notice: {days}d left
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
        {days}d left
      </span>
    );
  };

  const columns = [
    {
      title: 'Registration & Validity',
      key: 'dates',
      width: 150,
      render: (_: any, record: DealHeaderRecord) => {
        const expDate = record.expDt || record.expiration;
        const wtnDateStr = record.wtn?.whenToNotify
          ? formatDateLong(record.wtn.whenToNotify)
          : null;

        const hasRenewals = Boolean(record.renewals && record.renewals.length > 0);
        const latestRenewal = record.latestRenewal || (hasRenewals ? record.renewals![0] : null);

        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span>{formatDateLong(latestRenewal ? latestRenewal.dtRenewal : record.dtRegistered)}</span>
            </div>
            <div className="text-[11px] text-muted dark:text-zinc-300 flex items-center gap-1 whitespace-nowrap">
              <span>Exp: {formatDateLong(latestRenewal ? latestRenewal.rexpDt : expDate)}</span>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {renderExpiryBadge(latestRenewal ? latestRenewal.rexpDt : expDate)}
              {hasRenewals && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>Renewed</span>
                </span>
              )}
            </div>
            {wtnDateStr && (
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-700 dark:text-sky-300 text-[10px] font-semibold border border-sky-500/20 whitespace-nowrap">
                <BellRing className="w-2.5 h-2.5 shrink-0" />
                <span>Notify: {wtnDateStr}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Customer & Project',
      key: 'customer',
      width: 220,
      render: (_: any, record: DealHeaderRecord) => {
        const projName = record.ProjectName || record.projectName || '';
        return (
          <div className="space-y-0.5 max-w-[210px]">
            <Link
              href={`/deals/${record.dealID}`}
              onMouseEnter={() => prefetchDealDetail(record.dealID)}
              className="font-bold text-xs text-foreground hover:text-sky-600 transition truncate block hover:underline"
              title={record.custName}
            >
              {record.custName}
            </Link>
            <div className="text-xs text-muted dark:text-zinc-300 truncate" title={projName}>
              {projName}
            </div>
            <div className="font-mono text-[10px] text-muted dark:text-zinc-400">
              ID: <span className="text-foreground dark:text-zinc-200 font-medium">{record.dealRegID}</span>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Brand & BU',
      key: 'brand',
      width: 100,
      render: (_: any, record: DealHeaderRecord) => (
        <div className="space-y-1">
          <div className="inline-block px-2 py-0.5 rounded-md text-xs font-bold bg-neutral text-foreground border border-border">
            {record.brand}
          </div>
          <div>
            <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-300 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
              {record.BU || record.bu}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: 'Assigned AO',
      key: 'ao',
      width: 130,
      render: (_: any, record: DealHeaderRecord) => (
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <div className="h-6 w-6 rounded-full bg-neutral flex items-center justify-center text-muted dark:text-zinc-300 border border-border text-[10px] shrink-0">
            <User className="w-3 h-3" />
          </div>
          <span className="truncate text-foreground dark:text-zinc-100" title={record.AssignedAO || record.assignedAO}>
            {record.AssignedAO || record.assignedAO}
          </span>
        </div>
      ),
    },
    {
      title: 'Total Deal Value',
      key: 'amount',
      width: 120,
      render: (_: any, record: DealHeaderRecord) => (
        <div className="font-mono font-bold text-xs text-foreground dark:text-zinc-100">
          {formatAmounts(record)}
        </div>
      ),
    },
    {
      title: 'SLA & Status',
      key: 'status',
      width: 120,
      render: (_: any, record: DealHeaderRecord) => {
        const statusNum = typeof record.dealStatus === 'number' ? record.dealStatus : parseInt(record.dealStatus) || 1;
        const statusMeta = DEAL_STATUS_MAP[statusNum] || {
          label: `Status ${record.dealStatus}`,
          variant: 'default' as const,
        };

        return (
          <div className="space-y-1">
            <AppChip variant={statusMeta.variant as any}>
              {statusMeta.label}
            </AppChip>
            {record.response && record.response.responseDays !== undefined && (
              <div className="text-[10px] text-muted dark:text-zinc-400 font-medium whitespace-nowrap">
                Response Days: <span className="font-bold text-foreground dark:text-zinc-100">{record.response.responseDays}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: <span className="sr-only">Actions</span>,
      key: 'actions',
      width: 48,
      fixed: 'right' as const,
      align: 'center' as const,
      render: (_: any, record: DealHeaderRecord) => {
        if (!canEdit) return null;
        const statusNum = typeof record.dealStatus === 'number' ? record.dealStatus : parseInt(record.dealStatus) || 1;
        const expDate = record.expDt || record.expiration;
        const daysRemaining = expDate
          ? Math.ceil((new Date(expDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        const canRenew = (daysRemaining <= 90 || daysRemaining < 0) && statusNum !== 2 && statusNum !== 7 && statusNum !== 8;

        const items: MenuProps['items'] = [
          ...(canRenew
            ? [
                {
                  key: 'renew',
                  icon: <RefreshCw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
                  label: <span className="font-semibold text-emerald-700 dark:text-emerald-300">Renew Deal</span>,
                  onClick: () => router.push(`/deals/${record.dealID}?action=renew`),
                },
                {
                  type: 'divider' as const,
                },
              ]
            : []),
          {
            key: 'edit',
            icon: <Edit className="w-4 h-4 text-zinc-400" />,
            label: 'Edit Deal',
            onClick: () => router.push(`/deals/${record.dealID}/edit`),
          },
          ...(statusNum !== 7 && statusNum !== 8
            ? [
                {
                  type: 'divider' as const,
                },
                {
                  key: 'lost',
                  icon: <ShieldAlert className="w-4 h-4 text-rose-500" />,
                  label: 'Mark as Lost',
                  danger: true,
                  onClick: () =>
                    setLostTarget({
                      id: record.dealID,
                      regID: record.dealRegID,
                    }),
                },
              ]
            : []),
        ];

        return (
          <div className="flex items-center justify-center w-full">
            <Dropdown
              menu={{ items }}
              trigger={['click']}
              placement="bottomRight"
            >
              <button
                type="button"
                onMouseEnter={() => prefetchDealDetail(record.dealID)}
                className="h-8 w-8 rounded-lg bg-neutral/80 hover:bg-neutral text-foreground dark:text-zinc-200 hover:text-foreground border border-border/70 hover:border-border transition-all flex items-center justify-center cursor-pointer shadow-xs active:scale-95 mx-auto"
                title="More Actions"
                aria-label="More Actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </Dropdown>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            Deals Registry & SLA Tracker
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DateRangeFilterPopover value={dateRange} onChange={setDateRange} />

          <button
            type="button"
            onClick={() => fetchDeals()}
            className="p-2 text-muted hover:text-foreground bg-neutral/80 border border-border/70 rounded-xl hover:bg-neutral transition"
            title="Refresh Deals Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {canCreate && (
            <Link
              href="/deals/new"
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:opacity-90 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Register Deal</span>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <AppCard className="p-4 bg-card-bg border border-border/50 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-muted text-xs font-semibold">
            <span>Total Deals</span>
            <Layers className="w-4 h-4 text-sky-500" />
          </div>
          {loading ? (
            <div className="space-y-2 mt-2">
              <div className="shimmer-skeleton h-7 w-20 rounded-md" />
              <div className="shimmer-skeleton h-3 w-32 rounded" />
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold text-foreground mt-2 font-mono">
                {metrics.totalCount}
              </div>
              <div className="text-[11px] text-muted mt-1">Across all registered BUs</div>
            </>
          )}
        </AppCard>

        <AppCard className="p-4 bg-card-bg border border-border/50 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-muted text-xs font-semibold">
            <span>Registered</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          {loading ? (
            <div className="space-y-2 mt-2">
              <div className="shimmer-skeleton h-7 w-20 rounded-md" />
              <div className="shimmer-skeleton h-3 w-32 rounded" />
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold text-emerald-600 mt-2 font-mono">
                {metrics.registeredCount}
              </div>
              <div className="text-[11px] text-muted mt-1">Active partner approvals</div>
            </>
          )}
        </AppCard>

        <AppCard className="p-4 bg-card-bg border border-border/50 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-muted text-xs font-semibold">
            <span>Expiring &lt; 90 Days</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          {loading ? (
            <div className="space-y-2 mt-2">
              <div className="shimmer-skeleton h-7 w-20 rounded-md" />
              <div className="shimmer-skeleton h-3 w-32 rounded" />
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold text-amber-600 mt-2 font-mono">
                {metrics.expiringSoon}
              </div>
              <div className="text-[11px] text-muted mt-1">WTN alert queue active</div>
            </>
          )}
        </AppCard>

        <AppCard className="p-4 bg-card-bg border border-border/50 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-muted text-xs font-semibold">
            <span>Closed as Lost</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          {loading ? (
            <div className="space-y-2 mt-2">
              <div className="shimmer-skeleton h-7 w-20 rounded-md" />
              <div className="shimmer-skeleton h-3 w-32 rounded" />
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold text-rose-600 mt-2 font-mono">
                {metrics.lostCount}
              </div>
              <div className="text-[11px] text-muted mt-1">Archived competitor losses</div>
            </>
          )}
        </AppCard>
      </div>

      {/* Search, Filter Popover and Sort Popover Bar */}
      <AppCard className="p-3.5 bg-card-bg border border-border/50 rounded-xl shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search Input */}
          <div className="flex-1 min-w-0">
            <AppInput
              prefix={<Search className="w-4 h-4 text-muted" />}
              placeholder="Search Project, Customer, Deal Reg ID, AO, Brand..."
              value={searchQuery}
              onChange={(e: any) => setSearchQuery(e.target.value)}
              allowClear
              size="md"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Filter Popover (Multi-select BU, AO, Status, Expiry) */}
            <DealsFilterPopover
              buFilters={buFilters}
              onBuFiltersChange={setBuFilters}
              aoFilters={aoFilters}
              onAoFiltersChange={setAoFilters}
              availableAOs={availableAOs}
              hideAOFilter={role === 'ao'}
              expiryFilters={expiryFilters}
              onExpiryFiltersChange={setExpiryFilters}
              statusFilters={statusFilters}
              onStatusFiltersChange={setStatusFilters}
              officialBUs={OFFICIAL_BUS}
              otherBUsMap={otherBUsMap}
              dealsCountByBU={dealsCountByBU}
              dealsCountByStatus={dealsCountByStatus}
              totalDealsCount={deals.length}
            />

            {/* Sort Popover beside search bar */}
            <DealsSortPopover
              value={sortConfig}
              onChange={setSortConfig}
            />
          </div>
        </div>

        {/* Active Filter Indicator Chips (Visible only when filters are active) */}
        {(buFilters.length > 0 || aoFilters.length > 0 || expiryFilters.length > 0 || statusFilters.length > 0 || searchQuery.trim()) && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-border/40 text-xs">
            <span className="text-[11px] font-semibold text-muted mr-1">Active Filters:</span>

            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral text-foreground border border-border/60 text-[11px] font-medium">
                Search: &quot;{searchQuery}&quot;
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="hover:text-rose-500 transition cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* BU Active Chips */}
            {buFilters.map((bu) => (
              <span
                key={bu}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 text-[11px] font-semibold"
              >
                BU: {bu}
                <button
                  type="button"
                  onClick={() => setBuFilters(buFilters.filter((b) => b !== bu))}
                  className="hover:text-rose-500 transition cursor-pointer"
                  title={`Remove ${bu} filter`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* AO Active Chips */}
            {aoFilters.map((ao) => (
              <span
                key={ao}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-[11px] font-semibold"
              >
                AO: {ao}
                <button
                  type="button"
                  onClick={() => setAoFilters(aoFilters.filter((a) => a !== ao))}
                  className="hover:text-rose-500 transition cursor-pointer"
                  title={`Remove ${ao} filter`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* Status Active Chips */}
            {statusFilters.map((st) => (
              <span
                key={st}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold"
              >
                Status: {DEAL_STATUS_MAP[Number(st)]?.label || st}
                <button
                  type="button"
                  onClick={() => setStatusFilters(statusFilters.filter((s) => s !== st))}
                  className="hover:text-rose-500 transition cursor-pointer"
                  title={`Remove ${st} filter`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* Expiry Active Chips */}
            {expiryFilters.map((exp) => (
              <span
                key={exp}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[11px] font-semibold"
              >
                Expiry: {exp.replace('_', ' ')}
                <button
                  type="button"
                  onClick={() => setExpiryFilters(expiryFilters.filter((e) => e !== exp))}
                  className="hover:text-rose-500 transition cursor-pointer"
                  title={`Remove ${exp} filter`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setBuFilters([]);
                setAoFilters([]);
                setExpiryFilters([]);
                setStatusFilters([]);
                try {
                  sessionStorage.removeItem('DEALS_REGISTRY_VIEW_STATE');
                } catch {}
              }}
              className="text-[11px] font-semibold text-rose-500 hover:underline ml-1 cursor-pointer"
            >
              Clear all filters
            </button>
          </div>
        )}
      </AppCard>

      {/* Upgraded Data Table with Shimmer Skeleton */}
      <AppCard className="border border-border/50 rounded-xl overflow-hidden shadow-xs bg-card-bg">
        {loading && deals.length === 0 ? (
          <div className="p-4 space-y-4">
            {/* Header skeleton */}
            <div className="flex items-center justify-between pb-3 border-b border-border/50">
              <div className="shimmer-skeleton h-4 w-32 rounded" />
              <div className="shimmer-skeleton h-4 w-24 rounded" />
            </div>

            {/* Rows skeleton */}
            <div className="divide-y divide-border/50">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="py-4 flex items-center justify-between gap-4">
                  {/* Validity Column */}
                  <div className="space-y-2 w-32 shrink-0">
                    <div className="shimmer-skeleton h-3.5 w-24 rounded" />
                    <div className="shimmer-skeleton h-3 w-20 rounded" />
                  </div>

                  {/* Customer & Project Column */}
                  <div className="space-y-2 flex-1 max-w-sm">
                    <div className="shimmer-skeleton h-4 rounded" style={{ width: `${160 + (i % 4) * 40}px` }} />
                    <div className="shimmer-skeleton h-3 w-full rounded" />
                    <div className="shimmer-skeleton h-2.5 w-28 rounded" />
                  </div>

                  {/* Brand & BU Column */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="shimmer-skeleton h-5 w-14 rounded" />
                    <div className="shimmer-skeleton h-5 w-10 rounded" />
                  </div>

                  {/* Assigned AO Column */}
                  <div className="flex items-center gap-2 w-36 shrink-0">
                    <div className="shimmer-skeleton h-6 w-6 rounded-full shrink-0" />
                    <div className="shimmer-skeleton h-3.5 w-24 rounded" />
                  </div>

                  {/* Amount Column */}
                  <div className="w-28 shrink-0 text-right space-y-1">
                    <div className="shimmer-skeleton h-4 w-24 rounded ml-auto" />
                  </div>

                  {/* Status Column */}
                  <div className="w-24 shrink-0">
                    <div className="shimmer-skeleton h-6 w-20 rounded-full" />
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="shimmer-skeleton h-7 w-12 rounded-lg" />
                    <div className="shimmer-skeleton h-7 w-12 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-0">
            <AppTable
              columns={columns}
              dataSource={paginatedDeals}
              rowKey={(record: any) => record.dealID}
              tableLayout="fixed"
              scroll={{ x: 1000 }}
              onRow={(record: any) => ({
                onClick: (e: React.MouseEvent) => {
                  const target = e.target as HTMLElement;
                  if (
                    target.closest('button') ||
                    target.closest('a') ||
                    target.closest('.ant-dropdown') ||
                    target.closest('[role="menuitem"]')
                  ) {
                    return;
                  }
                  saveViewState();
                  router.push(`/deals/${record.dealID}`);
                },
                onMouseEnter: () => {
                  router.prefetch(`/deals/${record.dealID}`);
                },
                className: 'cursor-pointer hover:bg-neutral/40 transition-colors',
              })}
              pagination={false}
            />

            {/* Unified Clean Pagination Bar matching Reports page */}
            <div className="py-2.5 px-3.5 bg-neutral/40 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs rounded-b-xl">
              {/* Record count info */}
              <div className="text-muted text-[11px] font-medium">
                {totalRecords === 0 ? (
                  '0 deals'
                ) : (
                  <>
                    Showing <span className="font-semibold text-foreground">{startRecord}</span>–
                    <span className="font-semibold text-foreground">{endRecord}</span> of{' '}
                    <span className="font-semibold text-foreground">{totalRecords}</span> deals
                  </>
                )}
              </div>

              {/* Page navigation and page size picker */}
              <div className="flex items-center gap-3">
                {/* Per-Page Picker */}
                <div className="flex items-center gap-1.5">
                  <span className="text-muted text-[11px]">Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="px-2 py-1 bg-card-bg border border-border/60 rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={safeCurrentPage <= 1}
                    className="p-1.5 rounded-lg border border-border/50 text-muted hover:text-foreground hover:bg-neutral disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="First Page"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safeCurrentPage <= 1}
                    className="p-1.5 rounded-lg border border-border/50 text-muted hover:text-foreground hover:bg-neutral disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  {/* Numeric Page Buttons */}
                  {pageNumbers.map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-semibold transition ${
                        safeCurrentPage === page
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-muted hover:text-foreground hover:bg-neutral border border-border/40'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safeCurrentPage >= totalPages}
                    className="p-1.5 rounded-lg border border-border/50 text-muted hover:text-foreground hover:bg-neutral disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Next Page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={safeCurrentPage >= totalPages}
                    className="p-1.5 rounded-lg border border-border/50 text-muted hover:text-foreground hover:bg-neutral disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Last Page"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AppCard>

      {/* Deal Details Modal */}
      <DealDetailsModal
        dealID={viewTarget}
        isOpen={viewTarget !== null}
        onClose={() => setViewTarget(null)}
      />

      {/* WTN Modal */}
      {wtnTarget && (
        <WTNModal
          dealID={wtnTarget.id}
          dealRegID={wtnTarget.regID}
          currentWTN={wtnTarget.date}
          isOpen={true}
          onClose={() => setWtnTarget(null)}
          onSuccess={fetchDeals}
        />
      )}

      {/* Lost Deal Modal */}
      {lostTarget && (
        <LostDealModal
          dealID={lostTarget.id}
          dealRegID={lostTarget.regID}
          isOpen={true}
          onClose={() => setLostTarget(null)}
          onSuccess={fetchDeals}
        />
      )}

    </div>
  );
}

export default function DealsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-muted">
          <div className="shimmer-skeleton h-8 w-48 rounded mx-auto mb-4" />
          <div className="shimmer-skeleton h-64 w-full rounded-xl" />
        </div>
      }
    >
      <DealsContent />
    </Suspense>
  );
}
