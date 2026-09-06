'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserRole, ActivityLogRecord } from '@my-app/types';
import { getActivityLogs, getActivitySummaryStats, ActivityStatsResponse } from '@/app/actions/activity-logs';
import { AppAvatar } from '@/components/ui/avatar';
import { AppButton } from '@/components/ui/buttons';
import { AppCard } from '@/components/ui/cards';
import { Tooltip } from 'antd';
import {
  ScrollText,
  Search,
  RefreshCw,
  Filter,
  Calendar,
  Layers,
  Clock,
  User,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  AlertCircle,
  X,
  FileSpreadsheet,
  UserCheck,
  Mail,
  Zap,
} from 'lucide-react';

const ACTION_FILTER_OPTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'CREATE', label: 'Deal Created (CREATE)' },
  { value: 'UPDATE', label: 'Deal Updated (UPDATE)' },
  { value: 'RENEW', label: 'Deal Renewed (RENEW)' },
  { value: 'LOST', label: 'Deal Lost (LOST)' },
  { value: 'WTN_UPDATE', label: 'WTN Alert Updated (WTN)' },
  { value: 'USER_MANAGEMENT', label: 'User Management' },
  { value: 'EMAIL_CONFIG_UPDATE', label: 'Email Configuration' },
];

const DATE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
];

function getActionBadge(action: string) {
  const normalized = (action || '').toUpperCase();
  switch (normalized) {
    case 'CREATE':
      return {
        label: 'CREATED',
        color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        dot: 'bg-emerald-500',
      };
    case 'UPDATE':
      return {
        label: 'UPDATED',
        color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
        dot: 'bg-sky-500',
      };
    case 'RENEW':
      return {
        label: 'RENEWED',
        color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
        dot: 'bg-purple-500',
      };
    case 'LOST':
      return {
        label: 'LOST',
        color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        dot: 'bg-rose-500',
      };
    case 'WTN_UPDATE':
      return {
        label: 'WTN ALERT',
        color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        dot: 'bg-amber-500',
      };
    case 'USER_MANAGEMENT':
      return {
        label: 'USER ADMIN',
        color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
        dot: 'bg-teal-500',
      };
    case 'EMAIL_CONFIG_UPDATE':
      return {
        label: 'EMAIL CONFIG',
        color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        dot: 'bg-indigo-500',
      };
    default:
      return {
        label: action || 'EVENT',
        color: 'bg-neutral text-muted border-border',
        dot: 'bg-muted',
      };
  }
}

function formatRelativeTime(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffInSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSec < 60) return 'Just now';
  if (diffInSec < 3600) return `${Math.floor(diffInSec / 60)}m ago`;
  if (diffInSec < 86400) return `${Math.floor(diffInSec / 3600)}h ago`;
  if (diffInSec < 604800) return `${Math.floor(diffInSec / 86400)}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function formatExactDateTime(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function AdminActivityLogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const currentUserRole = (session?.user as any)?.role as UserRole | undefined;

  // Logs & Pagination State
  const [logs, setLogs] = useState<ActivityLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');

  // Stats State
  const [stats, setStats] = useState<ActivityStatsResponse>({
    success: true,
    totalLogs: 0,
    todayCount: 0,
    topAction: 'None',
    uniqueActorsCount: 0,
  });


  const [isPending, startTransition] = useTransition();

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load KPI Stats
  const loadStats = useCallback(async () => {
    try {
      const res = await getActivitySummaryStats();
      if (res.success) {
        setStats(res);
      }
    } catch (err) {
      console.warn('Failed to load activity stats:', err);
    }
  }, []);

  // Fetch Logs from Server Action
  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await getActivityLogs({
        page,
        pageSize,
        searchQuery: debouncedSearch,
        actionFilter: selectedAction,
        dateFilter: selectedDateFilter,
      });

      if (res.success && res.data) {
        setLogs(res.data);
        setTotalCount(res.totalCount || 0);
        setTotalPages(res.totalPages || 1);
      } else {
        setErrorMessage(res.error || 'Failed to retrieve activity logs.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while fetching activity logs.');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, debouncedSearch, selectedAction, selectedDateFilter]);

  // Initial and reactive data fetching
  useEffect(() => {
    if (status === 'authenticated' && currentUserRole === 'ITadmin') {
      loadLogs();
      loadStats();
    } else if (status === 'authenticated' && currentUserRole !== 'ITadmin') {
      setIsLoading(false);
    }
  }, [status, currentUserRole, loadLogs, loadStats]);

  const hasActiveFilters = searchQuery !== '' || selectedAction !== 'all' || selectedDateFilter !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedAction('all');
    setSelectedDateFilter('all');
    setPage(1);
  };

  // Access Denied Screen for non-ITadmin users
  if (status === 'authenticated' && currentUserRole !== 'ITadmin') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
        <div className="h-16 w-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-4 shadow-sm">
          <ShieldAlert size={32} />
        </div>
        <h1 className="text-xl font-bold text-foreground">Access Restricted</h1>
        <p className="text-sm text-muted mt-2 max-w-md">
          Activity Logs and portal audit records are restricted exclusively to IT Administrators.
        </p>
        <AppButton
          variant="primary"
          className="mt-6"
          onClick={() => router.push('/dashboard')}
        >
          Return to Dashboard
        </AppButton>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background text-foreground pb-12">
      {/* Page Header */}
      <div className="border-b border-border/60 bg-card/40 backdrop-blur-sm sticky top-0 z-10 px-4 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-xs">
              <ScrollText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg lg:text-xl font-bold tracking-tight text-foreground">
                  Activity Logs
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                  Audit Trail
                </span>
              </div>
              <p className="text-xs text-muted">
                Immutable audit trail tracking all deal mutations, status updates, and administrative modifications.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AppButton
              variant="neutral"
              size="sm"
              leftIcon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
              onClick={() => {
                loadLogs();
                loadStats();
              }}
              disabled={isLoading}
            >
              Refresh
            </AppButton>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-4 lg:px-8 pt-6 space-y-6">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-between text-sm animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="p-1 rounded-md hover:bg-rose-500/10 text-inherit transition"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Top Summary Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
          <AppCard className="p-4 bg-card/60 border-border/60 hover:border-primary/30 transition shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">Total Events</span>
              <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <ScrollText size={14} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-foreground tracking-tight">
                {stats.totalLogs?.toLocaleString() || 0}
              </span>
              <p className="text-[10px] text-muted mt-0.5">Recorded operations</p>
            </div>
          </AppCard>

          <AppCard className="p-4 bg-card/60 border-border/60 hover:border-emerald-500/30 transition shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">Today&apos;s Changes</span>
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Clock size={14} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                {stats.todayCount?.toLocaleString() || 0}
              </span>
              <p className="text-[10px] text-muted mt-0.5">Modifications today</p>
            </div>
          </AppCard>

          <AppCard className="p-4 bg-card/60 border-border/60 hover:border-sky-500/30 transition shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">Top Action</span>
              <div className="h-7 w-7 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center">
                <TrendingUp size={14} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-xl font-bold text-sky-600 dark:text-sky-400 tracking-tight truncate block" title={stats.topAction}>
                {stats.topAction || 'None'}
              </span>
              <p className="text-[10px] text-muted mt-0.5">Most active operation</p>
            </div>
          </AppCard>

          <AppCard className="p-4 bg-card/60 border-border/60 hover:border-indigo-500/30 transition shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">Active Actors</span>
              <div className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <UserCheck size={14} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                {stats.uniqueActorsCount?.toLocaleString() || 0}
              </span>
              <p className="text-[10px] text-muted mt-0.5">Unique user accounts</p>
            </div>
          </AppCard>
        </div>

        {/* Filter & Search Toolbar */}
        <AppCard className="p-3.5 bg-card/80 border-border/80 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search Deal Reg ID, customer, project, field, user, values..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-neutral/40 border border-border/80 rounded-xl text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-foreground transition rounded-md"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Action Type Filter Dropdown */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-1.5 min-w-[170px] flex-1 sm:flex-initial">
                <Filter size={13} className="text-muted shrink-0" />
                <select
                  value={selectedAction}
                  onChange={(e) => {
                    setSelectedAction(e.target.value);
                    setPage(1);
                  }}
                  className="w-full py-2 px-2.5 bg-neutral/40 border border-border/80 rounded-xl text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition"
                >
                  {ACTION_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filter Dropdown */}
              <div className="flex items-center gap-1.5 min-w-[140px] flex-1 sm:flex-initial">
                <Calendar size={13} className="text-muted shrink-0" />
                <select
                  value={selectedDateFilter}
                  onChange={(e) => {
                    setSelectedDateFilter(e.target.value as any);
                    setPage(1);
                  }}
                  className="w-full py-2 px-2.5 bg-neutral/40 border border-border/80 rounded-xl text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition"
                >
                  {DATE_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset Filters */}
              {hasActiveFilters && (
                <AppButton
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="text-xs text-muted hover:text-foreground shrink-0"
                  leftIcon={<X size={12} />}
                >
                  Reset
                </AppButton>
              )}
            </div>
          </div>
        </AppCard>

        {/* Activity Logs Table */}
        <AppCard className="overflow-hidden border-border/80 bg-card/80 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/70 bg-neutral/40 text-muted font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 w-[160px]">Timestamp</th>
                  <th className="py-3 px-4 w-[130px]">Action</th>
                  <th className="py-3 px-4 min-w-[220px]">Target / Deal</th>
                  <th className="py-3 px-4 min-w-[300px]">Change Details</th>
                  <th className="py-3 px-4 min-w-[200px]">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {isLoading ? (
                  // Loading Skeletons
                  Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={`skeleton-${idx}`} className="animate-pulse">
                      <td className="py-3.5 px-4">
                        <div className="h-3.5 bg-neutral/80 rounded w-24 mb-1.5" />
                        <div className="h-2.5 bg-neutral/50 rounded w-16" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-5 bg-neutral/80 rounded-full w-20" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-3.5 bg-neutral/80 rounded w-36 mb-1.5" />
                        <div className="h-2.5 bg-neutral/50 rounded w-48" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-3.5 bg-neutral/80 rounded w-48 mb-1.5" />
                        <div className="h-2.5 bg-neutral/50 rounded w-32" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-neutral/80" />
                          <div>
                            <div className="h-3 bg-neutral/80 rounded w-24 mb-1" />
                            <div className="h-2 bg-neutral/50 rounded w-16" />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  // Empty State
                  <tr>
                    <td colSpan={5} className="py-12 px-4 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <div className="h-12 w-12 rounded-2xl bg-neutral/80 text-muted flex items-center justify-center mb-3">
                          <ScrollText size={22} />
                        </div>
                        <h3 className="font-bold text-sm text-foreground">No Activity Logs Found</h3>
                        <p className="text-xs text-muted mt-1">
                          {hasActiveFilters
                            ? 'No activity records match your filter criteria. Try clearing search or adjusting filters.'
                            : 'There are no activity audit entries recorded in the database yet.'}
                        </p>
                        {hasActiveFilters && (
                          <AppButton
                            variant="neutral"
                            size="sm"
                            onClick={handleResetFilters}
                            className="mt-4"
                          >
                            Clear Filters
                          </AppButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  // Log Rows
                  logs.map((log) => {
                    const badge = getActionBadge(log.action);
                    return (
                      <tr
                        key={log.logID}
                        className="hover:bg-neutral/30 transition duration-150 group"
                      >
                        {/* 1. Timestamp */}
                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <Tooltip title={formatExactDateTime(log.dtCreated)}>
                            <span className="font-semibold text-foreground text-xs block cursor-default">
                              {formatRelativeTime(log.dtCreated)}
                            </span>
                          </Tooltip>
                          <span className="text-[10px] text-muted block mt-0.5 font-mono">
                            {formatExactDateTime(log.dtCreated).split(',')[0]}
                          </span>
                        </td>

                        {/* 2. Action Badge */}
                        <td className="py-3.5 px-4 align-top">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.color}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            {badge.label}
                          </span>
                        </td>

                        {/* 3. Target / Deal Information */}
                        <td className="py-3.5 px-4 align-top">
                          {log.dealID ? (
                            <div>
                              <div className="flex items-center gap-1.5">
                                <Link
                                  href={`/deals/${log.dealID}`}
                                  className="font-bold text-primary hover:underline inline-flex items-center gap-1"
                                >
                                  {log.dealRegID || `Deal #${log.dealID}`}
                                  <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition" />
                                </Link>
                              </div>
                              {log.custName && (
                                <span className="text-xs font-medium text-foreground block truncate max-w-[280px]" title={log.custName}>
                                  {log.custName}
                                </span>
                              )}
                              {log.projectName && (
                                <span className="text-[10px] text-muted block truncate max-w-[280px]" title={log.projectName}>
                                  {log.projectName}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span className="font-semibold text-foreground text-xs">
                                {log.action === 'USER_MANAGEMENT'
                                  ? 'User Directory'
                                  : log.action === 'EMAIL_CONFIG_UPDATE'
                                  ? 'Email Routing Config'
                                  : 'System'}
                              </span>
                              <span className="text-[10px] text-muted block">System Administration</span>
                            </div>
                          )}
                        </td>

                        {/* 4. Changed Field & Before/After Values */}
                        <td className="py-3.5 px-4 align-top">
                          {log.fieldName && (
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-neutral/80 text-foreground/80 border border-border/60">
                                {log.fieldName}
                              </span>
                            </div>
                          )}

                          {log.oldValue != null && log.newValue != null ? (
                            <div className="flex items-center gap-1.5 text-xs flex-wrap">
                              <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-mono text-[11px] max-w-[220px] truncate" title={log.oldValue}>
                                {log.oldValue || '<Empty>'}
                              </span>
                              <ArrowRight size={12} className="text-muted shrink-0" />
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono text-[11px] max-w-[220px] truncate font-semibold" title={log.newValue}>
                                {log.newValue || '<Empty>'}
                              </span>
                            </div>
                          ) : log.newValue != null ? (
                            <span className="text-xs text-foreground font-medium block leading-relaxed max-w-[400px]">
                              {log.newValue}
                            </span>
                          ) : null}

                          {log.remarks && (
                            <span className="text-[10px] text-muted/90 italic block mt-1 leading-snug">
                              Note: {log.remarks}
                            </span>
                          )}
                        </td>

                        {/* 5. Performed By (Actor) */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex items-center gap-2.5">
                            <AppAvatar
                              name={log.performedByName || log.performedBy}
                              src={log.performedByAvatar || undefined}
                              size={28}
                              className="shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="font-semibold text-foreground text-xs block truncate max-w-[160px]" title={log.performedByName || log.performedBy}>
                                {log.performedByName || log.performedBy}
                              </span>
                              <span className="text-[10px] text-muted block truncate max-w-[160px]" title={log.performedBy}>
                                {log.performedBy}
                              </span>
                              {log.performedByRole && (
                                <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                                  {log.performedByRole}
                                </span>
                              )}
                              {log.impersonatedBy && (
                                <span className="block text-[9px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5" title={`Impersonated by ${log.impersonatedBy}`}>
                                  (via {log.impersonatedBy.split('@')[0]})
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {!isLoading && logs.length > 0 && (
            <div className="border-t border-border/70 bg-neutral/20 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
              <div className="flex items-center gap-2">
                <span>
                  Showing <strong className="text-foreground">{(page - 1) * pageSize + 1}</strong> to{' '}
                  <strong className="text-foreground">{Math.min(page * pageSize, totalCount)}</strong> of{' '}
                  <strong className="text-foreground">{totalCount.toLocaleString()}</strong> events
                </span>
                <span className="text-border">|</span>
                <div className="flex items-center gap-1.5">
                  <span>Page size:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="bg-neutral/60 border border-border/80 rounded-md px-1.5 py-0.5 text-xs text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <AppButton
                  variant="neutral"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoading}
                  className="h-8 px-2.5"
                  leftIcon={<ChevronLeft size={14} />}
                >
                  Previous
                </AppButton>
                <div className="px-2 font-medium text-foreground">
                  Page {page} of {totalPages}
                </div>
                <AppButton
                  variant="neutral"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isLoading}
                  className="h-8 px-2.5"
                  rightIcon={<ChevronRight size={14} />}
                >
                  Next
                </AppButton>
              </div>
            </div>
          )}
        </AppCard>
      </div>
    </div>
  );
}
