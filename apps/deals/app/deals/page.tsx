'use client';

import React, { Suspense, useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { useDealsQuery } from '@/hooks/useDealsQuery';
import {
  DealHeaderRecord,
  UserRole,
  DEAL_STATUS_MAP,
  ACTIVE_BUSINESS_UNITS,
  MOCK_DEALS,
} from '@my-app/types';
import {
  AppTable,
  AppChip,
  AppInput,
  AppCard,
} from '../../components/ui';
import WTNModal from '../../components/WTNModal';
import LostDealModal from '../../components/LostDealModal';
import DealDetailsModal from '../../components/DealDetailsModal';
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
  Download,
  Eye,
  MoreVertical,
} from 'lucide-react';

function DealsContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const role: UserRole = (session?.user as any)?.role || 'admin';
  const canExport = role === 'admin';
  const canCreate = role === 'admin' || role === 'aa';
  const canEdit = role === 'admin' || role === 'aa';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [buFilter, setBuFilter] = useState<string>('ALL');

  const handleExportCSV = () => {
    if (!filteredDeals || filteredDeals.length === 0) return;

    const headers = [
      'Deal Reg ID',
      'Date Registered',
      'Expiration Date',
      'Customer Name',
      'Project Name',
      'Brand',
      'BU',
      'Assigned AO',
      'Status',
      'Total Amount',
    ];

    const rows = filteredDeals.map((deal) => {
      const projName = deal.ProjectName || deal.projectName || '';
      const ao = deal.AssignedAO || deal.assignedAO || '';
      const bu = deal.BU || deal.bu || '';
      const statusNum = typeof deal.dealStatus === 'number' ? deal.dealStatus : parseInt(deal.dealStatus) || 1;
      const statusMeta = DEAL_STATUS_MAP[statusNum] || { label: `Status ${deal.dealStatus}` };
      const expDate = deal.expDt || deal.expiration;

      return [
        `"${deal.dealRegID || ''}"`,
        `"${deal.dtRegistered ? new Date(deal.dtRegistered).toLocaleDateString() : ''}"`,
        `"${expDate ? new Date(expDate).toLocaleDateString() : ''}"`,
        `"${(deal.custName || '').replace(/"/g, '""')}"`,
        `"${projName.replace(/"/g, '""')}"`,
        `"${deal.brand || ''}"`,
        `"${bu}"`,
        `"${ao.replace(/"/g, '""')}"`,
        `"${statusMeta.label}"`,
        `"${formatAmounts(deal)}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Deals_Registry_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Modals
  const [viewTarget, setViewTarget] = useState<number | null>(null);
  const [wtnTarget, setWtnTarget] = useState<{ id: number; regID: string; date?: string | Date | null } | null>(null);
  const [lostTarget, setLostTarget] = useState<{ id: number; regID: string } | null>(null);

  const accountName = (session?.user as any)?.AccountName || (session?.user as any)?.name;
  const accountGroup = (session?.user as any)?.AccountGroup;

  const scopedFilter = useMemo(
    () => ({
      userRole: role,
      accountName,
      accountGroup,
    }),
    [role, accountName, accountGroup]
  );

  const { data: deals = [], isLoading: loading, refetch: fetchDeals } = useDealsQuery(scopedFilter);

  // Handle URL navigation parameters (e.g. /deals?view=123 or /deals?brand=Dell)
  useEffect(() => {
    if (!searchParams) return;

    const viewParam = searchParams.get('view') || searchParams.get('dealID');
    if (viewParam) {
      const idNum = parseInt(viewParam, 10);
      if (!isNaN(idNum) && idNum > 0) {
        setViewTarget(idNum);
      }
    }

    const brandParam = searchParams.get('brand');
    if (brandParam) {
      setSearchQuery(brandParam);
    }

    const qParam = searchParams.get('search') || searchParams.get('q');
    if (qParam) {
      setSearchQuery(qParam);
    }
  }, [searchParams]);

  // Filter deals
  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      const projName = deal.ProjectName || deal.projectName || '';
      const custName = deal.custName || '';
      const regID = deal.dealRegID || '';
      const ao = deal.AssignedAO || deal.assignedAO || '';
      const brand = deal.brand || '';
      const bu = deal.BU || deal.bu || '';

      const matchesSearch =
        projName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        custName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        regID.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ao.toLowerCase().includes(searchQuery.toLowerCase()) ||
        brand.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' || String(deal.dealStatus) === statusFilter;

      const matchesBU =
        buFilter === 'ALL' || bu === buFilter;

      return matchesSearch && matchesStatus && matchesBU;
    });
  }, [deals, searchQuery, statusFilter, buFilter]);

  // Metrics summary
  const metrics = useMemo(() => {
    const totalCount = deals.length;
    const registeredCount = deals.filter((d) => String(d.dealStatus) === '1' || d.dealStatus === 1).length;
    const pendingCount = deals.filter((d) => String(d.dealStatus) === '4' || String(d.dealStatus) === '3' || d.dealStatus === 4).length;
    const lostCount = deals.filter((d) => String(d.dealStatus) === '7' || String(d.dealStatus) === '8' || d.dealStatus === 7 || d.dealStatus === 8).length;

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
      const total = deal.items.reduce((acc: number, item: any) => acc + (item.totalAmt || 0), 0);
      const curr = deal.items[0]?.currency || 'PHP';
      return `${curr} ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return 'PHP 0.00';
  };

  const getDaysUntilExp = (expDt: Date | string | null | undefined) => {
    if (!expDt) return 0;
    const now = new Date().getTime();
    const exp = new Date(expDt).getTime();
    return Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
  };

  const columns = [
    {
      title: 'Registration & Validity',
      key: 'dates',
      width: 140,
      render: (_: any, record: DealHeaderRecord) => {
        const expDate = record.expDt || record.expiration;
        const daysRemaining = getDaysUntilExp(expDate);
        const wtnDateStr = record.wtn?.whenToNotify
          ? new Date(record.wtn.whenToNotify).toLocaleDateString()
          : null;

        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span>{record.dtRegistered ? new Date(record.dtRegistered).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div className="text-[11px] text-muted dark:text-zinc-300 flex items-center gap-1 whitespace-nowrap">
              <span>Exp: {expDate ? new Date(expDate).toLocaleDateString() : 'N/A'}</span>
              {daysRemaining > 0 && (
                <span className="text-amber-600 dark:text-amber-400 font-semibold font-mono text-[10px]">
                  ({daysRemaining}d)
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
        const items: MenuProps['items'] = [
          {
            key: 'edit',
            icon: <Edit className="w-4 h-4 text-zinc-400" />,
            label: 'Edit Deal',
            onClick: () => router.push(`/deals/${record.dealID}/edit`),
          },
          {
            key: 'wtn',
            icon: <BellRing className="w-4 h-4 text-amber-500" />,
            label: 'Update WTN',
            onClick: () =>
              setWtnTarget({
                id: record.dealID,
                regID: record.dealRegID,
                date: record.wtn?.whenToNotify || record.expDt || record.expiration,
              }),
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
          <button
            type="button"
            onClick={() => fetchDeals()}
            className="p-2 text-muted hover:text-foreground bg-neutral/80 border border-border/70 rounded-xl hover:bg-neutral transition"
            title="Refresh Deals Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {canExport && (
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-neutral bg-neutral/80 border border-border/70 rounded-xl transition shadow-xs"
              title="Export Filtered Deals to CSV"
            >
              <Download className="w-4 h-4 text-sky-600" />
              <span>Export CSV</span>
            </button>
          )}

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

      {/* Filter and Search Bar */}
      <AppCard className="p-4 bg-card-bg border border-border/50 rounded-xl shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex-1 max-w-md">
            <AppInput
              prefix={<Search className="w-4 h-4 text-muted" />}
              placeholder="Search Project, Customer, Deal Reg ID, AO, Brand..."
              value={searchQuery}
              onChange={(e: any) => setSearchQuery(e.target.value)}
              allowClear
              size="md"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-muted mr-1">BU:</span>
            <button
              type="button"
              onClick={() => setBuFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border ${
                buFilter === 'ALL'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-neutral/80 text-muted hover:text-foreground border-border/60'
              }`}
            >
              All
            </button>
            {ACTIVE_BUSINESS_UNITS.map((bu: string) => (
              <button
                key={bu}
                type="button"
                onClick={() => setBuFilter(bu)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border ${
                  buFilter === bu
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-neutral/80 text-muted hover:text-foreground border-border/60'
                }`}
              >
                {bu}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-border/50 text-xs">
          <span className="font-semibold text-muted mr-1">Status:</span>
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition ${
              statusFilter === 'ALL'
                ? 'bg-primary/15 text-primary font-bold border border-primary/30'
                : 'text-muted hover:text-foreground'
            }`}
          >
            All ({deals.length})
          </button>
          {Object.entries(DEAL_STATUS_MAP).map(([id, meta]: [string, any]) => {
            const count = deals.filter((d) => String(d.dealStatus) === id).length;
            const isSelected = statusFilter === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setStatusFilter(id)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
                  isSelected
                    ? 'bg-neutral text-foreground font-bold border border-border shadow-xs'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                <span>{meta.label}</span>
                <span className="text-[10px] px-1 rounded-full bg-neutral font-mono">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </AppCard>

      {/* Upgraded Data Table with Shimmer Skeleton */}
      <AppCard className="border border-border/50 rounded-xl overflow-hidden shadow-xs bg-card-bg">
        {loading ? (
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
          <AppTable
            columns={columns}
            dataSource={filteredDeals}
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
                router.push(`/deals/${record.dealID}`);
              },
              className: 'cursor-pointer hover:bg-neutral/40 transition-colors',
            })}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50'],
            }}
          />
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
