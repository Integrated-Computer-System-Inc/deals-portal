'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { getScopedDeals } from '../actions/deals';
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
} from 'lucide-react';

export default function DealsPage() {
  const { data: session } = useSession();
  const [deals, setDeals] = useState<DealHeaderRecord[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [wtnTarget, setWtnTarget] = useState<{ id: number; regID: string; date?: string | Date | null } | null>(null);
  const [lostTarget, setLostTarget] = useState<{ id: number; regID: string } | null>(null);

  const role: UserRole = (session?.user as any)?.role || 'admin';
  const accountName = (session?.user as any)?.AccountName || (session?.user as any)?.name;
  const accountGroup = (session?.user as any)?.AccountGroup;

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const res = await getScopedDeals({
        userRole: role,
        accountName,
        accountGroup,
      });

      if (res && res.success && Array.isArray(res.data)) {
        setDeals(res.data);
      } else {
        console.warn('[DealsPage] MSSQL fetch warning:', res?.error);
      }
    } catch (err) {
      console.error('[DealsPage] Failed to fetch deals from MSSQL:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, [role, accountName, accountGroup]);

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
      render: (_: any, record: DealHeaderRecord) => {
        const expDate = record.expDt || record.expiration;
        const daysRemaining = getDaysUntilExp(expDate);
        const wtnDateStr = record.wtn?.whenToNotify
          ? new Date(record.wtn.whenToNotify).toLocaleDateString()
          : null;

        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Calendar className="w-3.5 h-3.5 text-sky-500" />
              <span>{record.dtRegistered ? new Date(record.dtRegistered).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div className="text-[11px] text-muted flex items-center gap-1">
              <span>Exp: {expDate ? new Date(expDate).toLocaleDateString() : 'N/A'}</span>
              {daysRemaining > 0 && (
                <span className="text-amber-600 font-medium font-mono text-[10px]">
                  ({daysRemaining}d)
                </span>
              )}
            </div>
            {wtnDateStr && (
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-700 text-[10px] font-semibold border border-sky-500/20">
                <BellRing className="w-2.5 h-2.5" />
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
      render: (_: any, record: DealHeaderRecord) => {
        const projName = record.ProjectName || record.projectName || '';
        return (
          <div className="space-y-0.5 max-w-[280px]">
            <div className="font-bold text-xs text-foreground hover:text-sky-600 transition">
              {record.custName}
            </div>
            <div className="text-xs text-muted truncate" title={projName}>
              {projName}
            </div>
            <div className="font-mono text-[10px] text-muted/80">
              ID: <span className="text-foreground/80 font-medium">{record.dealRegID}</span>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Brand & BU',
      key: 'brand',
      render: (_: any, record: DealHeaderRecord) => (
        <div className="space-y-1">
          <div className="inline-block px-2 py-0.5 rounded-md text-xs font-bold bg-neutral text-foreground border border-border">
            {record.brand}
          </div>
          <div>
            <span className="text-[11px] font-semibold text-sky-600 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
              {record.BU || record.bu}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: 'Assigned AO',
      key: 'ao',
      render: (_: any, record: DealHeaderRecord) => (
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <div className="h-6 w-6 rounded-full bg-neutral flex items-center justify-center text-muted border border-border text-[10px]">
            <User className="w-3 h-3" />
          </div>
          <span>{record.AssignedAO || record.assignedAO}</span>
        </div>
      ),
    },
    {
      title: 'Total Deal Value',
      key: 'amount',
      render: (_: any, record: DealHeaderRecord) => (
        <div className="font-mono font-bold text-xs text-foreground">
          {formatAmounts(record)}
        </div>
      ),
    },
    {
      title: 'SLA & Status',
      key: 'status',
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
              <div className="text-[10px] text-muted font-medium">
                Response Days: <span className="font-bold text-foreground">{record.response.responseDays}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right' as const,
      render: (_: any, record: DealHeaderRecord) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            href={`/deals/${record.dealID}/edit`}
            className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 hover:bg-sky-500/20 border border-sky-500/20 transition flex items-center gap-1 text-xs font-semibold"
            title={canEdit ? 'Edit Deal' : 'View Deal Details'}
          >
            {canEdit ? <Edit className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{canEdit ? 'Edit' : 'View'}</span>
          </Link>

          {canEdit && (
            <button
              type="button"
              onClick={() =>
                setWtnTarget({
                  id: record.dealID,
                  regID: record.dealRegID,
                  date: record.wtn?.whenToNotify || record.expDt || record.expiration,
                })
              }
              className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border border-amber-500/20 transition"
              title="Adjust When-To-Notify Date"
            >
              <BellRing className="w-3.5 h-3.5" />
            </button>
          )}

          {canEdit && record.dealStatus !== 7 && record.dealStatus !== 8 && (
            <button
              type="button"
              onClick={() =>
                setLostTarget({
                  id: record.dealID,
                  regID: record.dealRegID,
                })
              }
              className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border border-rose-500/20 transition"
              title="Close as Lost"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const canExport = role === 'admin';
  const canCreate = role === 'admin' || role === 'aa';
  const canEdit = role === 'admin' || role === 'aa';

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            Deals Registry & SLA Tracker
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Monitor product deals, manage When-To-Notify (WTN) alerts, and track Account Officer registrations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchDeals}
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <AppCard className="p-4 bg-background border border-border/70 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-muted text-xs font-semibold">
            <span>Total Deals</span>
            <Layers className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-2 font-mono">
            {metrics.totalCount}
          </div>
          <div className="text-[11px] text-muted mt-1">Across all registered BUs</div>
        </AppCard>

        <AppCard className="p-4 bg-background border border-border/70 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-muted text-xs font-semibold">
            <span>Registered</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2 font-mono">
            {metrics.registeredCount}
          </div>
          <div className="text-[11px] text-muted mt-1">Active partner approvals</div>
        </AppCard>

        <AppCard className="p-4 bg-background border border-border/70 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-muted text-xs font-semibold">
            <span>Expiring &lt; 90 Days</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2 font-mono">
            {metrics.expiringSoon}
          </div>
          <div className="text-[11px] text-muted mt-1">WTN alert queue active</div>
        </AppCard>

        <AppCard className="p-4 bg-background border border-border/70 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-muted text-xs font-semibold">
            <span>Closed as Lost</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2 font-mono">
            {metrics.lostCount}
          </div>
          <div className="text-[11px] text-muted mt-1">Competitor Intel logged</div>
        </AppCard>
      </div>

      {/* Filter and Search Bar */}
      <AppCard className="p-4 bg-background border border-border/70 rounded-xl shadow-xs space-y-3">
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

      {/* Upgraded Data Table */}
      <AppCard className="border border-border/70 rounded-xl overflow-hidden shadow-xs bg-background">
        <AppTable
          columns={columns}
          dataSource={filteredDeals}
          rowKey={(record: any) => record.dealID}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
          }}
        />
      </AppCard>

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
