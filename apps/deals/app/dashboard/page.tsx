'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useDashboardMetrics } from '../../hooks/useDashboardMetrics';
import {
  UserRole,
  DEAL_STATUS_MAP,
  ACTIVE_BUSINESS_UNITS,
} from '@my-app/types';
import {
  AppCard,
  AppChip,
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
  RefreshCw,
} from 'lucide-react';

export default function DashboardPage() {
  const { data: session } = useSession();
  const { metrics, loading, validating, refresh } = useDashboardMetrics();

  const role: UserRole = (session?.user as any)?.role || 'admin';
  const accountName = (session?.user as any)?.AccountName || (session?.user as any)?.name || 'Demo User';
  const accountGroup = (session?.user as any)?.AccountGroup || 'HQ';

  const totalRegistered = metrics?.totalRegistered ?? 0;
  const expiredThisMonth = metrics?.expiredThisMonth ?? 0;
  const totalCount = metrics?.totalCount ?? 0;
  const dealsByBrand = metrics?.dealsByBrand ?? [];
  const dealsByBU = metrics?.dealsByBU ?? [];
  const recentDeals = metrics?.recentDeals ?? [];

  // Build BU breakdown map with defaults
  const dealsPerBUMap = ACTIVE_BUSINESS_UNITS.map((bu) => {
    const found = dealsByBU.find((b) => b.bu.toUpperCase() === bu.toUpperCase());
    return [bu, found ? found.count : 0] as [string, number];
  });

  const isViewOnly = role === 'bu' || role === 'bu_admin' || role === 'ao';

  const getRoleHeaderLabel = () => {
    if (role === 'admin') return 'Sales Administration (All BUs)';
    if (role === 'aa') return 'Sales AA (All BUs)';
    if (role === 'bu' || role === 'bu_admin') return `BU Supervisor (${accountGroup})`;
    return `Account Officer (${accountGroup})`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-2xl bg-gradient-to-tr from-primary to-slate-800 text-white shadow-md">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 text-white backdrop-blur-sm flex items-center gap-1 border border-white/25">
              <User className="w-3.5 h-3.5" /> Welcome back, {accountName}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-white border border-white/20">
              {getRoleHeaderLabel()}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Deals Management Dashboard
          </h1>
          <p className="text-white/80 text-xs sm:text-sm max-w-xl">
            Real-time pipeline monitoring, brand distribution analytics, and deal validity tracking from live MSSQL database.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refresh()}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl transition"
            title="Refresh Dashboard Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading || validating ? 'animate-spin' : ''}`} />
          </button>
          {!isViewOnly && (
            <Link
              href="/deals/new"
              className="flex items-center gap-2 bg-white text-primary font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:bg-white/90 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Deal</span>
            </Link>
          )}
          <Link
            href="/deals"
            className="flex items-center gap-1.5 bg-white/15 text-white font-semibold text-xs px-4 py-2.5 rounded-xl hover:bg-white/25 transition border border-white/20"
          >
            <span>View All Deals</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 4 Core KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AppCard className="p-5 bg-background border border-border/70 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-muted text-xs font-semibold">
            <span>Total Registered Deals</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold text-foreground mt-2 font-mono">
            {loading ? '...' : totalRegistered.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Active registered pipelines
          </div>
        </AppCard>

        <AppCard className="p-5 bg-background border border-border/70 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-muted text-xs font-semibold">
            <span>Expired Deals this Month</span>
            <Clock className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-3xl font-bold text-rose-600 mt-2 font-mono">
            {loading ? '...' : expiredThisMonth.toLocaleString()}
          </div>
          <div className="text-[11px] text-muted mt-1">Requires re-registration / WTN</div>
        </AppCard>

        <AppCard className="p-5 bg-background border border-border/70 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-muted text-xs font-semibold">
            <span>Active Brands Represented</span>
            <Layers className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-3xl font-bold text-foreground mt-2 font-mono">
            {loading ? '...' : dealsByBrand.length}
          </div>
          <div className="text-[11px] text-sky-600 font-semibold mt-1">
            Top: {dealsByBrand[0]?.brand || 'Dell'} ({dealsByBrand[0]?.count || 0})
          </div>
        </AppCard>

        <AppCard className="p-5 bg-background border border-border/70 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-muted text-xs font-semibold">
            <span>Total Pipeline Deals</span>
            <Building2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-3xl font-bold text-foreground mt-2 font-mono">
            {loading ? '...' : totalCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-indigo-600 font-semibold mt-1">
            Across 6 active BUs
          </div>
        </AppCard>
      </div>

      {/* Breakdown Charts & Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deals per Brand */}
        <AppCard className="p-5 bg-background border border-border/70 rounded-xl shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-sky-600" />
              <h2 className="font-bold text-sm text-foreground">Deals Distribution by Brand (Top 10)</h2>
            </div>
            <span className="text-xs text-muted font-medium">{totalCount.toLocaleString()} total deals</span>
          </div>

          <div className="space-y-3">
            {dealsByBrand.map((item) => {
              const percentage = totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0;
              return (
                <div key={item.brand} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{item.brand}</span>
                    <span className="font-mono text-muted">
                      {item.count.toLocaleString()} deal{item.count === 1 ? '' : 's'} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-neutral rounded-full overflow-hidden border border-border/40">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(percentage, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </AppCard>

        {/* Deals per BU */}
        <AppCard className="p-5 bg-background border border-border/70 rounded-xl shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <h2 className="font-bold text-sm text-foreground">Deals Distribution by Business Unit (BU)</h2>
            </div>
            <span className="text-xs text-muted font-medium">6 Active BUs</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {dealsPerBUMap.map(([bu, count]) => (
              <div
                key={bu}
                className="p-3 rounded-xl bg-neutral/40 border border-border/60 flex flex-col justify-between hover:border-sky-500/40 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-600 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                    {bu}
                  </span>
                  <span className="text-xs font-mono font-bold text-foreground">{count.toLocaleString()}</span>
                </div>
                <span className="text-[10px] text-muted mt-2">Active opportunities</span>
              </div>
            ))}
          </div>
        </AppCard>
      </div>

      {/* Recent Deals Quick View */}
      <AppCard className="p-5 bg-background border border-border/70 rounded-xl shadow-xs space-y-4">
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
          {recentDeals.map((deal) => {
            const statusNum = typeof deal.dealStatus === 'number' ? deal.dealStatus : parseInt(deal.dealStatus) || 1;
            const statusMeta = DEAL_STATUS_MAP[statusNum] || {
              label: `Status ${deal.dealStatus}`,
              variant: 'default' as const,
            };

            return (
              <div
                key={deal.dealID}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral/40 px-2 rounded-lg transition"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-foreground">{deal.custName}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 border border-sky-500/20">
                      {deal.BU || deal.bu}
                    </span>
                  </div>
                  <div className="text-xs text-muted truncate max-w-md">{deal.ProjectName || deal.projectName}</div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-foreground font-mono">
                    {deal.brand}
                  </span>
                  <AppChip variant={statusMeta.variant as any}>
                    {statusMeta.label}
                  </AppChip>
                  <Link
                    href={`/deals/${deal.dealID}/edit`}
                    className="text-xs font-semibold text-sky-600 hover:underline"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </AppCard>
    </div>
  );
}
