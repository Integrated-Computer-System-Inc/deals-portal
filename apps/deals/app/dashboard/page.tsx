'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import {
  DealHeaderRecord,
  UserRole,
  DEAL_STATUS_MAP,
  ACTIVE_BUSINESS_UNITS,
  MOCK_DEALS,
} from '@my-app/types';
import {
  AppCard,
  AppChip,
  AppModal,
  AppButton,
  AppInput,
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
  Search,
  ExternalLink,
  DollarSign,
  Tag,
  Eye,
  Edit,
  MoreVertical,
} from 'lucide-react';

import { useDealsQuery } from '@/hooks/useDealsQuery';

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [brandSearchInput, setBrandSearchInput] = useState('');
  const [debouncedBrandSearch, setDebouncedBrandSearch] = useState('');
  const [isSearchingBrand, setIsSearchingBrand] = useState(false);

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

  const { data: deals = [], isLoading: loading } = useDealsQuery(scopedFilter);

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

  // Metric Computations
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const totalRegistered = deals.filter((d: DealHeaderRecord) => String(d.dealStatus) === '1' || d.dealStatus === 1).length;

  const expiredThisMonth = deals.filter((d: DealHeaderRecord) => {
    const rawExp = d.expDt || d.expiration;
    if (!rawExp) return false;
    const exp = new Date(rawExp);
    return exp.getMonth() === currentMonth && exp.getFullYear() === currentYear && exp < now;
  }).length;

  // Deals per Brand breakdown
  const dealsPerBrandMap = useMemo(() => {
    const map: Record<string, { count: number; totalValue: number; currencies: Set<string> }> = {};
    deals.forEach((d: DealHeaderRecord) => {
      const brand = d.brand?.trim() || 'Unspecified';
      if (!map[brand]) {
        map[brand] = { count: 0, totalValue: 0, currencies: new Set<string>() };
      }
      map[brand].count += 1;
      const amt = d.items?.reduce((sum: number, i: any) => sum + (Number(i.totalAmt) || 0), 0) || 0;
      map[brand].totalValue += amt;
      d.items?.forEach((i: any) => {
        if (i.currency) map[brand].currencies.add(i.currency);
      });
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [deals]);

  const grandTotalPipelineValue = useMemo(() => {
    return deals.reduce((acc: number, deal: DealHeaderRecord) => {
      const dealSum = deal.items?.reduce((sum: number, item: any) => sum + (Number(item.totalAmt) || 0), 0) || 0;
      return acc + dealSum;
    }, 0);
  }, [deals]);

  const filteredBrandsInModal = useMemo(() => {
    if (!debouncedBrandSearch.trim()) return dealsPerBrandMap;
    const q = debouncedBrandSearch.toLowerCase().trim();
    return dealsPerBrandMap.filter(([brand]) => brand.toLowerCase().includes(q));
  }, [dealsPerBrandMap, debouncedBrandSearch]);

  // Deals per BU breakdown
  const dealsPerBUMap = useMemo(() => {
    const map: Record<string, number> = {};
    ACTIVE_BUSINESS_UNITS.forEach((bu: string) => {
      map[bu] = 0;
    });
    let othersCount = 0;

    deals.forEach((d: DealHeaderRecord) => {
      const rawBu = (d.BU || d.bu || '').toString().trim().toUpperCase();
      if ((ACTIVE_BUSINESS_UNITS as readonly string[]).includes(rawBu)) {
        map[rawBu] = (map[rawBu] || 0) + 1;
      } else {
        othersCount += 1;
      }
    });

    const activeList = Object.entries(map).sort((a, b) => b[1] - a[1]);
    if (othersCount > 0) {
      activeList.push(['Others / Legacy', othersCount]);
    }
    return activeList;
  }, [deals]);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-7 rounded-2xl bg-gradient-to-tr from-primary to-slate-800 text-white shadow-md overflow-hidden">
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 text-white backdrop-blur-sm flex items-center gap-1 border border-white/25 max-w-full">
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Welcome back, {accountName}</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-white border border-white/20 max-w-full truncate">
              {getRoleHeaderLabel()}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-snug break-words">
            Deals Management Home
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
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
            <span>View All Deals</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </Link>
        </div>
      </div>

      {/* 4 Core KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <AppCard className="p-4 sm:p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-muted text-xs font-semibold gap-2">
            <span className="truncate">Total Registered Deals</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          </div>
          {loading ? (
            <div className="space-y-2 mt-2">
              <div className="shimmer-skeleton h-8 w-24 rounded-md" />
              <div className="shimmer-skeleton h-3.5 w-36 rounded" />
            </div>
          ) : (
            <>
              <div className="text-2xl sm:text-3xl font-bold text-foreground mt-2 font-mono truncate">
                {totalRegistered}
              </div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1 truncate">
                <TrendingUp className="w-3 h-3 shrink-0" />
                <span className="truncate">Active registered pipelines</span>
              </div>
            </>
          )}
        </AppCard>

        <AppCard className="p-4 sm:p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-muted text-xs font-semibold gap-2">
            <span className="truncate">Expired Deals this Month</span>
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
              <div className="text-[11px] text-muted mt-1 truncate">Requires re-registration / WTN</div>
            </>
          )}
        </AppCard>

        <AppCard className="p-4 sm:p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-muted text-xs font-semibold gap-2">
            <span className="truncate">Active Brands Represented</span>
            <Layers className="w-4 h-4 text-sky-500 shrink-0" />
          </div>
          {loading ? (
            <div className="space-y-2 mt-2">
              <div className="shimmer-skeleton h-8 w-20 rounded-md" />
              <div className="shimmer-skeleton h-3.5 w-28 rounded" />
            </div>
          ) : (
            <>
              <div className="text-2xl sm:text-3xl font-bold text-foreground mt-2 font-mono truncate">
                {dealsPerBrandMap.length}
              </div>
              <div className="text-[11px] text-sky-600 font-semibold mt-1 truncate">
                Top: {dealsPerBrandMap[0]?.[0] || 'Dell'}
              </div>
            </>
          )}
        </AppCard>

        <AppCard className="p-4 sm:p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs min-w-0 overflow-hidden">
          <div className="flex items-center justify-between text-muted text-xs font-semibold gap-2">
            <span className="truncate">Business Units Covered</span>
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
                {ACTIVE_BUSINESS_UNITS.length}
              </div>
              <div className="text-[11px] text-indigo-600 font-semibold mt-1 truncate">
                BU1, BU2, BU5, BU8, BU10, BU12
              </div>
            </>
          )}
        </AppCard>
      </div>

      {/* Breakdown Charts & Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deals per Brand */}
        <AppCard className="p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-sky-600" />
                <h2 className="font-bold text-sm text-foreground">Deals Distribution by Brand</h2>
              </div>
              {loading ? (
                <div className="shimmer-skeleton h-4 w-24 rounded" />
              ) : (
                <span className="text-xs text-muted font-medium">{dealsPerBrandMap.length} Brands • {deals.length} deals</span>
              )}
            </div>

            <div className="space-y-3">
              {loading ? (
                [85, 65, 45, 30, 25, 15].map((w, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="shimmer-skeleton h-3.5 w-20 rounded" />
                      <div className="shimmer-skeleton h-3.5 w-24 rounded" />
                    </div>
                    <div className="w-full h-2 bg-neutral rounded-full overflow-hidden border border-border/40">
                      <div className="shimmer-skeleton h-full rounded-full" style={{ width: `${w}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                dealsPerBrandMap.slice(0, 10).map(([brand, data], idx) => {
                  const percentage = deals.length > 0 ? Math.round((data.count / deals.length) * 100) : 0;
                  return (
                    <div key={brand} className="space-y-1.5 group">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold text-muted w-4">#{idx + 1}</span>
                          <span className="font-semibold text-foreground group-hover:text-sky-600 transition">{brand}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-muted">
                          <span className="text-foreground/90 font-medium">
                            PHP {data.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                          <span className="text-[11px] text-muted">
                            ({data.count} • {percentage}%)
                          </span>
                        </div>
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

          {/* See All Brands Button */}
          {!loading && dealsPerBrandMap.length > 0 && (
            <div className="pt-3 border-t border-border/40 flex items-center justify-between">
              <span className="text-[11px] text-muted font-medium">
                Showing top 10 of {dealsPerBrandMap.length} brands
              </span>
              <button
                type="button"
                onClick={() => setIsBrandModalOpen(true)}
                className="text-xs font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 flex items-center gap-1 hover:underline transition"
              >
                <span>See All in Modal ({dealsPerBrandMap.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </AppCard>

        {/* Deals per BU */}
        <AppCard className="p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <h2 className="font-bold text-sm text-foreground">Deals Distribution by Business Unit (BU)</h2>
            </div>
            <span className="text-xs text-muted font-medium">6 Active BUs</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {loading ? (
              [1, 2, 3, 4, 5, 6].map((i) => (
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
              dealsPerBUMap.map(([bu, count]) => (
                <div
                  key={bu}
                  className="p-3 rounded-xl bg-neutral/50 border border-border/40 flex flex-col justify-between hover:border-sky-500/40 transition"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded border ${bu.startsWith('Other')
                        ? 'text-neutral-400 bg-neutral-500/15 border-border/50'
                        : 'text-sky-400 bg-sky-500/15 border-sky-500/30'
                        }`}
                    >
                      {bu}
                    </span>
                    <span className="text-xs font-mono font-bold text-foreground">{count}</span>
                  </div>
                  <span className="text-[10px] text-muted mt-2">Active opportunities</span>
                </div>
              ))
            )}
          </div>
        </AppCard>
      </div>

      {/* Recent Deals Quick View */}
      <AppCard className="p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs space-y-4">
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
          {loading ? (
            [1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2">
                <div className="space-y-2 w-full max-w-md">
                  <div className="flex items-center gap-2">
                    <div className="shimmer-skeleton h-4 rounded" style={{ width: `${140 + (i % 3) * 50}px` }} />
                    <div className="shimmer-skeleton h-4 w-12 rounded" />
                  </div>
                  <div className="shimmer-skeleton h-3 w-64 rounded" />
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="shimmer-skeleton h-4 w-16 rounded" />
                  <div className="shimmer-skeleton h-6 w-20 rounded-full" />
                  <div className="shimmer-skeleton h-4 w-8 rounded" />
                </div>
              </div>
            ))
          ) : (
            deals.slice(0, 5).map((deal) => {
              const statusNum = typeof deal.dealStatus === 'number' ? deal.dealStatus : parseInt(deal.dealStatus) || 1;
              const statusMeta = DEAL_STATUS_MAP[statusNum] || {
                label: `Status ${deal.dealStatus}`,
                variant: 'default' as const,
              };

              return (
                <div
                  key={deal.dealID}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (
                      target.closest('button') ||
                      target.closest('a') ||
                      target.closest('.ant-dropdown') ||
                      target.closest('[role="menuitem"]')
                    ) {
                      return;
                    }
                    router.push(`/deals/${deal.dealID}`);
                  }}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral/50 px-3 rounded-xl transition cursor-pointer border border-transparent hover:border-border/50"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-bold text-xs text-foreground group-hover:text-sky-600 transition"
                        title="View Deal Details"
                      >
                        {deal.custName}
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-500/20">
                        {deal.BU || deal.bu}
                      </span>
                    </div>
                    <div className="text-xs text-muted dark:text-zinc-300 truncate max-w-md">{deal.ProjectName || deal.projectName}</div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-foreground font-mono">
                      {deal.brand}
                    </span>
                    <AppChip variant={statusMeta.variant as any}>
                      {statusMeta.label}
                    </AppChip>
                    {!isViewOnly && (
                      <Dropdown
                        menu={{
                          items: [
                            {
                              key: 'edit',
                              icon: <Edit className="w-4 h-4 text-zinc-400" />,
                              label: 'Edit Deal',
                              onClick: () => router.push(`/deals/${deal.dealID}/edit`),
                            },
                          ],
                        }}
                        trigger={['click']}
                        placement="bottomRight"
                      >
                        <button
                          type="button"
                          className="h-8 w-8 rounded-lg bg-neutral/80 hover:bg-neutral text-foreground dark:text-zinc-200 hover:text-foreground border border-border/70 hover:border-border transition-all flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
                          title="Deal Actions"
                          aria-label="Deal Actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </Dropdown>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </AppCard>

      {/* Complete Brands Distribution Modal - Compact width & height */}
      <AppModal
        open={isBrandModalOpen}
        onClose={() => {
          setIsBrandModalOpen(false);
          setBrandSearchInput('');
          setDebouncedBrandSearch('');
        }}
        width={620}
      >
        <AppModal.Header>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <AppModal.Title>Partner Brands Distribution</AppModal.Title>
              <AppModal.Description>
                Breakdown of all partner brands registered across active deals.
              </AppModal.Description>
            </div>
          </div>
        </AppModal.Header>

        <AppModal.Body className="space-y-3 pt-3">
          {/* Summary Stat Tiles */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-2.5 rounded-xl bg-neutral/50 border border-border/70 text-center">
              <div className="text-[10px] text-muted font-semibold uppercase tracking-wider">Total Brands</div>
              <div className="text-lg font-bold font-mono text-foreground mt-0.5">{dealsPerBrandMap.length}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral/50 border border-border/70 text-center">
              <div className="text-[10px] text-muted font-semibold uppercase tracking-wider">Total Deals</div>
              <div className="text-lg font-bold font-mono text-sky-600 mt-0.5">{deals.length}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral/50 border border-border/70 text-center">
              <div className="text-[10px] text-muted font-semibold uppercase tracking-wider">Grand Value</div>
              <div className="text-xs font-bold font-mono text-emerald-600 truncate mt-1">
                PHP {grandTotalPipelineValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          {/* Search Brand Input with Debounce */}
          <div className="relative">
            <AppInput
              prefix={<Search className="w-4 h-4 text-muted" />}
              placeholder="Search brands (e.g. Dell, Cisco, HPE)..."
              value={brandSearchInput}
              onChange={(e: any) => setBrandSearchInput(e.target.value)}
              allowClear
              size="md"
            />
          </div>

          {/* Scrollable Brands Table/List */}
          <div className="border border-border/70 rounded-xl overflow-hidden shadow-xs bg-background">
            <div className="max-h-[320px] overflow-y-auto divide-y divide-border/50">
              {isSearchingBrand ? (
                /* Shimmer Skeleton rows during search debounce */
                <div className="divide-y divide-border/50">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="p-3 flex items-center justify-between">
                      <div className="space-y-2 w-48">
                        <div className="shimmer-skeleton h-3.5 w-28 rounded" />
                        <div className="shimmer-skeleton h-2 w-36 rounded-full" />
                      </div>
                      <div className="space-y-1.5 text-right w-24">
                        <div className="shimmer-skeleton h-3.5 w-20 rounded ml-auto" />
                        <div className="shimmer-skeleton h-2.5 w-12 rounded ml-auto" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredBrandsInModal.length === 0 ? (
                <div className="p-6 text-center text-muted text-xs space-y-1">
                  <Tag className="w-6 h-6 mx-auto text-muted/50 mb-1.5" />
                  <p className="font-semibold text-foreground">No matching brands found</p>
                  <p className="text-[11px]">Try searching for a different partner brand.</p>
                </div>
              ) : (
                filteredBrandsInModal.map(([brand, data], idx) => {
                  const percentage = deals.length > 0 ? ((data.count / deals.length) * 100).toFixed(1) : '0';
                  const percentNum = parseFloat(percentage);

                  return (
                    <div
                      key={brand}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-neutral/40 transition text-xs"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold text-muted w-4">#{idx + 1}</span>
                          <span className="font-bold text-foreground truncate">{brand}</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 border border-sky-500/20 shrink-0">
                            {data.count} {data.count === 1 ? 'deal' : 'deals'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-28 h-1.5 bg-neutral rounded-full overflow-hidden border border-border/40 shrink-0">
                            <div
                              className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full"
                              style={{ width: `${Math.max(percentNum, 4)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-muted">{percentage}%</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 text-right">
                        <div>
                          <div className="font-mono font-bold text-foreground text-xs">
                            PHP {data.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </div>
                        </div>

                        <Link
                          href={`/deals?brand=${encodeURIComponent(brand)}`}
                          onClick={() => setIsBrandModalOpen(false)}
                          className="p-1 text-muted hover:text-sky-600 rounded hover:bg-neutral transition"
                          title={`View ${brand} deals in Registry`}
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
            Showing {filteredBrandsInModal.length} of {dealsPerBrandMap.length} brands
          </span>
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
        </AppModal.Footer>
      </AppModal>
    </div>
  );
}
