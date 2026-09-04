'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  FileText,
  Calendar,
  Building2,
  Tag,
  User,
  BellRing,
  Edit,
  ShieldAlert,
  Loader2,
  Layers,
  ArrowLeft,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw,
  History,
  DollarSign,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { useDealQuery } from '@/hooks/useDealsQuery';
import { DealHeaderRecord, DealRenewalRecord, DEAL_STATUS_MAP, UserRole } from '@my-app/types';
import {
  AppCard,
  AppChip,
  AppButton,
  AppTable,
} from '../../../components/ui';
import { formatDateLong } from '@/components/utils/time';
import WTNModal from '../../../components/WTNModal';
import LostDealModal from '../../../components/LostDealModal';
import RenewalModal from '../../../components/RenewalModal';
import RenewalCapModal from '../../../components/RenewalCapModal';
import LinkedDealSection from '../../../components/LinkedDealSection';
import DealLoadingScreen from '@/components/DealLoadingScreen';

export default function DealDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const role: UserRole = (session?.user as any)?.role || 'admin';
  const canEdit = role === 'ITadmin' || role === 'admin' || role === 'aa';

  const dealID = params?.id ? Number(params.id) : null;
  const { data: deal = null, isLoading: loading } = useDealQuery(dealID, true);

  const [isWtnModalOpen, setIsWtnModalOpen] = useState(false);
  const [isLostModalOpen, setIsLostModalOpen] = useState(false);
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [isRenewalCapModalOpen, setIsRenewalCapModalOpen] = useState(false);
  const [selectedRenewalForEdit, setSelectedRenewalForEdit] = useState<DealRenewalRecord | null>(null);
  const [showAllRenewals, setShowAllRenewals] = useState(false);

  const handleGoBack = () => {
    try {
      sessionStorage.setItem('DEALS_NAVIGATED_TO_DETAIL', 'true');
    } catch {}
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/deals');
    }
  };

  // Auto-open Renewal Modal only if user has edit privileges and navigated with ?action=renew or ?renew=true
  useEffect(() => {
    if (!deal || !canEdit) return;
    const action = searchParams?.get('action');
    const renew = searchParams?.get('renew');
    if (action === 'renew' || renew === 'true') {
      setIsRenewalModalOpen(true);
    }
  }, [deal, searchParams, canEdit]);

  const sortedRenewals = useMemo(() => {
    if (!deal?.renewals) return [];
    return [...deal.renewals].sort((a, b) => {
      const timeB = new Date(b.dtRenewal || b.dtCreated || 0).getTime();
      const timeA = new Date(a.dtRenewal || a.dtCreated || 0).getTime();
      return timeB - timeA;
    });
  }, [deal?.renewals]);

  if (loading) {
    return (
      <DealLoadingScreen
        title={`Loading Deal Details ${dealID ? `#${dealID}` : ''}`}
        status="Fetching complete registration parameters, SLA scheduling & item breakdown..."
      />
    );
  }

  if (!deal) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Deal Not Found</h2>
        <p className="text-xs text-muted max-w-md mx-auto">
          The requested deal #{dealID} could not be found or you do not have permission to view it.
        </p>
        <button
          type="button"
          onClick={handleGoBack}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:opacity-90 transition shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Deals Registry</span>
        </button>
      </div>
    );
  }

  const statusNum = typeof deal.dealStatus === 'number' ? deal.dealStatus : parseInt(deal.dealStatus || '1') || 1;
  const statusMeta = DEAL_STATUS_MAP[statusNum] || {
    label: `Status ${deal.dealStatus}`,
    variant: 'default' as const,
  };

  const expDate = deal.expDt || deal.expiration;
  const daysRemaining = expDate
    ? Math.ceil((new Date(expDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const hasRenewals = Boolean(sortedRenewals.length > 0);
  const renewalCount = sortedRenewals.length;
  const isCapReached = renewalCount >= 3;
  const latestRenewal = sortedRenewals.length > 0 ? sortedRenewals[0] : null;
  const canRenew = canEdit && (daysRemaining <= 90 || daysRemaining < 0) && statusNum !== 2 && statusNum !== 7 && statusNum !== 8;

  const visibleRenewals = showAllRenewals ? sortedRenewals : sortedRenewals.slice(0, 3);
  const hasMoreThanThree = sortedRenewals.length > 3;

  const currentWtnDate = deal.wtn?.whenToNotify || deal.expDt || deal.expiration || '';

  const currencyTotals: Record<string, number> = {};
  deal.items?.forEach((item: any) => {
    const curr = item.currency || 'PHP';
    const amt = Number(item.totalAmt) || 0;
    currencyTotals[curr] = (currencyTotals[curr] || 0) + amt;
  });

  const itemColumns = [
    {
      title: 'Item Description',
      dataIndex: 'itemDesc',
      key: 'itemDesc',
      render: (text: string) => (
        <span className="font-semibold text-xs text-foreground">{text || 'N/A'}</span>
      ),
    },
    {
      title: 'Qty',
      dataIndex: 'qty',
      key: 'qty',
      width: 80,
      align: 'center' as const,
      render: (qty: number) => (
        <span className="font-mono text-xs font-bold text-foreground">{qty || 1}</span>
      ),
    },
    {
      title: 'Currency',
      dataIndex: 'currency',
      key: 'currency',
      width: 100,
      align: 'center' as const,
      render: (curr: string) => (
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-neutral text-foreground border border-border">
          {curr || 'PHP'}
        </span>
      ),
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmt',
      key: 'totalAmt',
      align: 'right' as const,
      width: 160,
      render: (amt: number, record: any) => (
        <span className="font-mono font-bold text-xs text-foreground">
          {record.currency || 'PHP'} {Number(amt || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleGoBack}
            className="p-2 rounded-xl bg-neutral hover:bg-neutral/80 border border-border text-muted hover:text-foreground transition shadow-xs shrink-0 cursor-pointer"
            title="Back to Deals Registry"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight truncate">
                Deal Details #{deal.dealRegID || deal.dealID}
              </h1>
              <AppChip variant={statusMeta.variant as any}>{statusMeta.label}</AppChip>
              {hasRenewals && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-500/30">
                  <RefreshCw className="w-3 h-3 animate-spin-reverse" />
                  <span>Renewed {deal.renewals!.length > 1 ? `(${deal.renewals!.length}x)` : ''}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-muted truncate">
              Registered record parameters, timeline milestones, and products.
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canEdit && (
            <>
              {canRenew && (
                isCapReached ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsRenewalCapModalOpen(true)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 text-xs font-semibold rounded-xl border border-amber-500/30 transition shadow-xs cursor-pointer"
                      title="Renewal cap reached (3/3 extensions)"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Max Renewals (3/3)</span>
                    </button>
                    {deal.nextDeal ? (
                      <Link
                        href={`/deals/${deal.nextDeal.dealID}`}
                        className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition shadow-xs active:scale-95 cursor-pointer"
                        title={`View new deal registration #${deal.nextDeal.dealRegID || deal.nextDeal.dealID}`}
                      >
                        <span>View New Deal (#{deal.nextDeal.dealRegID || deal.nextDeal.dealID})</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <Link
                        href={`/deals/new?copyFrom=${deal.dealID}`}
                        className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition shadow-xs active:scale-95 cursor-pointer"
                        title="Create a new linked deal pre-populated with customer and product information"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create New Deal</span>
                      </Link>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRenewalForEdit(null);
                      setIsRenewalModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs font-semibold rounded-xl border border-emerald-500/30 transition shadow-xs active:scale-95 cursor-pointer"
                    title="Renew this deal registration (<= 90 days remaining)"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Renewal</span>
                  </button>
                )
              )}

              {statusNum !== 7 && statusNum !== 8 && (
                <button
                  type="button"
                  onClick={() => setIsLostModalOpen(true)}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 text-xs font-semibold rounded-xl border border-rose-500/30 transition shadow-xs"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Mark Lost</span>
                </button>
              )}

              <Link
                href={`/deals/${deal.dealID}/edit`}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:opacity-90 transition shadow-xs"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Deal</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Section 1: Core Deal Registration Info */}
      <AppCard className="p-4 sm:p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-border/50 pb-3">
          <Building2 className="w-4 h-4 text-sky-600" />
          <h2 className="font-bold text-sm text-foreground">1. Registration Overview</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Customer Name</span>
            <p className="font-bold text-xs text-foreground pt-1 truncate" title={deal.custName}>
              {deal.custName || 'N/A'}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Brand & Business Unit</span>
            <div className="flex items-center gap-2 pt-1">
              <span className="font-bold text-xs uppercase px-2.5 py-0.5 rounded-md bg-neutral text-foreground border border-border">
                {deal.brand || 'N/A'}
              </span>
              <span className="font-bold text-xs px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                {deal.BU || deal.bu || 'N/A'}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Assigned Account Officer</span>
            <div className="flex items-center gap-2 pt-0.5">
              {deal.aoAvatar ? (
                <img
                  src={deal.aoAvatar}
                  alt={deal.AssignedAO || 'AO'}
                  referrerPolicy="no-referrer"
                  className="h-7 w-7 rounded-full object-cover border border-border shrink-0 shadow-2xs"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling;
                    if (fallback) (fallback as HTMLElement).classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`h-7 w-7 rounded-full bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30 flex items-center justify-center text-xs font-bold shrink-0 ${deal.aoAvatar ? 'hidden' : 'flex'}`}>
                {deal.AssignedAO ? deal.AssignedAO.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
              </div>
              <span className="font-semibold text-xs text-foreground truncate" title={deal.AssignedAO || deal.assignedAO}>
                {deal.AssignedAO || deal.assignedAO || 'Unassigned'}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Deal Registration ID</span>
            <p className="font-mono font-bold text-xs text-foreground pt-1">
              {deal.dealRegID || `DR-${deal.dealID}`}
            </p>
          </div>
        </div>
      </AppCard>

      {/* Section 2: Timeline, Validity & Renewal History */}
      <AppCard className="p-4 sm:p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <h2 className="font-bold text-sm text-foreground">2. Timeline & Validity Period</h2>
          </div>
          {canRenew && (
            isCapReached ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRenewalCapModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 text-xs font-semibold rounded-lg border border-amber-500/30 transition shadow-xs cursor-pointer"
                >
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  <span>Max Renewals (3/3)</span>
                </button>
                {deal.nextDeal ? (
                  <Link
                    href={`/deals/${deal.nextDeal.dealID}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
                    title={`View new deal registration #${deal.nextDeal.dealRegID || deal.nextDeal.dealID}`}
                  >
                    <span>View New Deal (#{deal.nextDeal.dealRegID || deal.nextDeal.dealID})</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                ) : (
                  <Link
                    href={`/deals/new?copyFrom=${deal.dealID}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Create New Deal</span>
                  </Link>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSelectedRenewalForEdit(null);
                  setIsRenewalModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs font-semibold rounded-lg border border-emerald-500/30 transition shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{hasRenewals ? 'Renew Again' : '+ Extend Validity'}</span>
              </button>
            )
          )}
        </div>

        {/* Core Timeline Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl bg-neutral/40 border border-border/60 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
              <Calendar className="w-3 h-3 text-sky-500" /> {hasRenewals ? 'Effective Renewal Date' : 'Date Registered'}
            </span>
            <p className="font-mono font-bold text-sm text-foreground">
              {formatDateLong(latestRenewal ? latestRenewal.dtRenewal : deal.dtRegistered)}
            </p>
            {hasRenewals && (
              <p className="text-[10px] text-muted">
                Orig: {formatDateLong(deal.dtRegistered)}
              </p>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-neutral/40 border border-border/60 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-500" /> {hasRenewals ? 'Renewal Expiration' : 'Expiration Date'}
            </span>
            <div className="flex items-center gap-2">
              <p className="font-mono font-bold text-sm text-foreground">
                {formatDateLong(latestRenewal ? latestRenewal.rexpDt : expDate)}
              </p>
              {daysRemaining > 0 ? (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {daysRemaining}d left
                </span>
              ) : (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  Expired
                </span>
              )}
            </div>
            {hasRenewals && deal.expiration && (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                {String(deal.expiration).includes('-') ? `Extended to ${formatDateLong(deal.expiration)}` : `+${deal.expiration} days validity`}
              </p>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-neutral/40 border border-border/60 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
              <BellRing className="w-3 h-3 text-sky-500" /> When-To-Notify (WTN)
            </span>
            <p className="font-mono font-bold text-sm text-sky-600 dark:text-sky-400">
              {formatDateLong(currentWtnDate, 'Not Scheduled')}
            </p>
          </div>
        </div>

        {/* Integrated Renewal History Section within the same container */}
        {hasRenewals && (
          <div className="pt-2 border-t border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-foreground">
                  Renewal History & Extension Log ({deal.renewals!.length})
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {visibleRenewals.map((renewal: DealRenewalRecord, idx: number) => {
                const isLatest = idx === 0;
                const validityDays = renewal.dtRenewal && renewal.rexpDt
                  ? Math.max(1, Math.ceil((new Date(renewal.rexpDt).getTime() - new Date(renewal.dtRenewal).getTime()) / (1000 * 60 * 60 * 24)))
                  : null;

                return (
                  <div
                    key={renewal.renewalID || idx}
                    className={`p-4 rounded-xl border transition space-y-3 ${
                      isLatest
                        ? 'bg-emerald-500/5 border-emerald-500/30 shadow-xs'
                        : 'bg-neutral/20 border-border/60'
                    }`}
                  >
                    {/* Renewal Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-border/40 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-foreground">
                          Renewal #{sortedRenewals.length - idx}
                        </span>
                        {isLatest && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            Active Extension
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-[11px] text-muted">
                          Logged: {renewal.dtCreated ? formatDateLong(renewal.dtCreated) : 'N/A'}
                        </span>
                        {renewal.dtUpdated && (
                          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            Edited: {formatDateLong(renewal.dtUpdated)}
                          </span>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRenewalForEdit(renewal);
                              setIsRenewalModalOpen(true);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 transition cursor-pointer"
                            title="Edit this renewal record"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 3 Same-Style Cards as Top Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      {/* Card 1: Renewal Date */}
                      <div className="p-3.5 rounded-xl bg-neutral/40 border border-border/60 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-sky-500" /> Renewal Date
                        </span>
                        <p className="font-mono font-bold text-sm text-foreground">
                          {formatDateLong(renewal.dtRenewal)}
                        </p>
                        {renewal.dtCreated && (
                          <p className="text-[10px] text-muted">
                            Recorded: {formatDateLong(renewal.dtCreated)}
                          </p>
                        )}
                      </div>

                      {/* Card 2: Extended Expiry */}
                      <div className="p-3.5 rounded-xl bg-neutral/40 border border-border/60 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-500" /> Extended Expiration
                        </span>
                        <div className="flex items-center gap-2">
                          <p className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                            {formatDateLong(renewal.rexpDt)}
                          </p>
                          {validityDays && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                              +{validityDays}d
                            </span>
                          )}
                        </div>
                        {validityDays && (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            +{validityDays} days validity
                          </p>
                        )}
                      </div>

                      {/* Card 3: Remarks */}
                      <div className="p-3.5 rounded-xl bg-neutral/40 border border-border/60 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                          <FileText className="w-3 h-3 text-sky-500" /> Remarks & Justification
                        </span>
                        <p className="text-xs text-foreground font-medium italic leading-snug break-words">
                          {renewal.remarks || 'Standard validity renewal'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Collapsible See All Toggle if > 3 */}
              {hasMoreThanThree && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setShowAllRenewals(!showAllRenewals)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral hover:bg-neutral/80 text-foreground font-semibold text-xs rounded-xl border border-border transition shadow-xs cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      {showAllRenewals
                        ? 'Show Recent 3 Only \u2191'
                        : `See All (${sortedRenewals.length} Renewals) \u2193`}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Linked Previous Deal & Historical Extensions */}
        <LinkedDealSection deal={deal} />

        {deal.remarks && (
          <div className="pt-2 border-t border-border/50">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
              Remarks & Partner Notes
            </span>
            <div className="p-3.5 rounded-xl bg-neutral/30 border border-border/60 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
              {deal.remarks}
            </div>
          </div>
        )}

        {/* Closed as Lost — Competitor Intelligence & Loss Analysis (dbo.DealLost) */}
        {(deal.lostInfo || statusNum === 7) && (
          <div className="pt-2 border-t border-border/50">
            <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-rose-500/20 pb-2.5">
                <div className="flex items-center gap-2 font-bold text-rose-600 dark:text-rose-400">
                  <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600" />
                  <span className="text-sm sm:text-base">Closed as Lost — DealLost Analysis</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                  Status 7 (Lost)
                </span>
              </div>

              {/* 6 Structured Fields from dbo.DealLost */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* 1. Competitor Vendor */}
                <div className="p-3 rounded-xl bg-background/80 border border-rose-500/20 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-rose-500" /> Competitor Vendor
                  </span>
                  <p className="font-semibold text-xs sm:text-sm text-foreground break-words">
                    {deal.lostInfo?.competitorVendor?.trim() || 'N/A'}
                  </p>
                </div>

                {/* 2. Competitor Brand */}
                <div className="p-3 rounded-xl bg-background/80 border border-rose-500/20 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                    <Tag className="w-3 h-3 text-amber-500" /> Competitor Brand
                  </span>
                  <p className="font-semibold text-xs sm:text-sm text-foreground break-words">
                    {deal.lostInfo?.competitorBrand?.trim() || 'N/A'}
                  </p>
                </div>

                {/* 3. ICS Offer */}
                <div className="p-3 rounded-xl bg-background/80 border border-rose-500/20 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-sky-500" /> ICS Offer
                  </span>
                  <p className="font-semibold text-xs sm:text-sm text-foreground break-words">
                    {deal.lostInfo?.icsOffer != null ? String(deal.lostInfo.icsOffer).trim() || 'N/A' : 'N/A'}
                  </p>
                </div>

                {/* 4. Competitor Offer */}
                <div className="p-3 rounded-xl bg-background/80 border border-rose-500/20 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-rose-500" /> Competitor Offer
                  </span>
                  <p className="font-semibold text-xs sm:text-sm text-rose-600 dark:text-rose-400 break-words">
                    {deal.lostInfo?.competitorOffer != null ? String(deal.lostInfo.competitorOffer).trim() || 'N/A' : 'N/A'}
                  </p>
                </div>

                {/* 5. Reason for Loss */}
                <div className="p-3.5 rounded-xl bg-background/80 border border-rose-500/20 space-y-1 sm:col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> Reason for Loss
                  </span>
                  <p className="font-semibold text-xs sm:text-sm text-foreground leading-relaxed break-words">
                    {deal.lostInfo?.reason?.trim() || deal.remarks?.trim() || 'No specific reason specified'}
                  </p>
                </div>

                {/* 6. Other Information */}
                <div className="p-3.5 rounded-xl bg-background/80 border border-rose-500/20 space-y-1 sm:col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-indigo-500" /> Other Information / Notes
                  </span>
                  <p className="text-xs text-foreground italic leading-relaxed whitespace-pre-wrap break-words">
                    {deal.lostInfo?.otherInformation?.trim() || 'None provided'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </AppCard>

      {/* Section 3: Products & Line Items */}
      <AppCard className="p-4 sm:p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h2 className="font-bold text-sm text-foreground">3. Deal Products & Line Items</h2>
          </div>
          <span className="text-xs text-muted font-medium">
            {deal.items?.length || 0} {deal.items?.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block">
          <AppTable
            columns={itemColumns as any}
            dataSource={deal.items || []}
            rowKey={(_: any, idx?: number) => String(idx)}
            pagination={false}
          />
        </div>

        {/* Mobile Stacked Card View */}
        <div className="sm:hidden space-y-3">
          {deal.items && deal.items.length > 0 ? (
            deal.items.map((item: any, idx: number) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-neutral/40 border border-border/60 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-muted text-[11px]">Item #{idx + 1}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-neutral text-foreground border border-border">
                    {item.currency || 'PHP'}
                  </span>
                </div>
                <p className="font-semibold text-xs text-foreground leading-snug">
                  {item.itemDesc || 'N/A'}
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                  <span className="text-muted text-[11px]">Qty: <strong className="text-foreground">{item.qty || 1}</strong></span>
                  <span className="font-mono font-bold text-foreground">
                    {item.currency || 'PHP'} {Number(item.totalAmt || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-xs text-muted">No line items registered.</div>
          )}
        </div>

        {/* Currency Totals Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 sm:p-4 rounded-xl bg-neutral/80 border border-border/80">
          <span className="text-xs font-bold text-foreground">Estimated Total Amount:</span>
          <div className="flex flex-wrap items-center gap-2 font-mono font-bold text-sm text-sky-600 dark:text-sky-400">
            {Object.entries(currencyTotals).map(([curr, amt]) => (
              <span key={curr} className="bg-background px-3 py-1 rounded-lg border border-border shadow-xs">
                {curr} {amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            ))}
          </div>
        </div>
      </AppCard>

      {/* Renewal Modal */}
      <RenewalModal
        dealID={deal.dealID}
        dealRegID={deal.dealRegID || String(deal.dealID)}
        custName={deal.custName}
        brand={deal.brand}
        currentExpDate={expDate}
        isOpen={isRenewalModalOpen}
        editingRenewal={selectedRenewalForEdit}
        onClose={() => {
          setIsRenewalModalOpen(false);
          setSelectedRenewalForEdit(null);
        }}
        onSuccess={() => {
          setIsRenewalModalOpen(false);
          setSelectedRenewalForEdit(null);
        }}
      />

      {/* 3-Renewal Limit Cap Modal */}
      <RenewalCapModal
        dealID={deal.dealID}
        dealRegID={deal.dealRegID || String(deal.dealID)}
        custName={deal.custName}
        brand={deal.brand}
        bu={deal.bu || deal.BU}
        assignedAO={deal.assignedAO || deal.AssignedAO}
        currentExpDate={expDate}
        renewalsCount={renewalCount}
        isOpen={isRenewalCapModalOpen}
        onClose={() => setIsRenewalCapModalOpen(false)}
      />

      {/* WTN Modal */}
      <WTNModal
        dealID={deal.dealID}
        dealRegID={deal.dealRegID || String(deal.dealID)}
        currentWTN={currentWtnDate}
        isOpen={isWtnModalOpen}
        onClose={() => setIsWtnModalOpen(false)}
        onSuccess={() => setIsWtnModalOpen(false)}
      />

      {/* Lost Deal Modal */}
      <LostDealModal
        dealID={deal.dealID}
        dealRegID={deal.dealRegID || String(deal.dealID)}
        isOpen={isLostModalOpen}
        onClose={() => setIsLostModalOpen(false)}
        onSuccess={() => setIsLostModalOpen(false)}
      />
    </div>
  );
}
