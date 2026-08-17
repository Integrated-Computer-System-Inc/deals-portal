'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { useDealQuery } from '@/hooks/useDealsQuery';
import { DealHeaderRecord, DEAL_STATUS_MAP, UserRole } from '@my-app/types';
import {
  AppCard,
  AppChip,
  AppButton,
  AppTable,
} from '../../../components/ui';
import WTNModal from '../../../components/WTNModal';
import LostDealModal from '../../../components/LostDealModal';

export default function DealDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();

  const dealID = params?.id ? Number(params.id) : null;
  const { data: deal = null, isLoading: loading } = useDealQuery(dealID, true);

  const [isWtnModalOpen, setIsWtnModalOpen] = useState(false);
  const [isLostModalOpen, setIsLostModalOpen] = useState(false);

  const role: UserRole = (session?.user as any)?.role || 'admin';
  const canEdit = role === 'admin' || role === 'aa';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
        <p className="text-xs font-semibold text-muted">Loading deal details #{dealID}...</p>
      </div>
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
        <Link
          href="/deals"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:opacity-90 transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Deals Registry</span>
        </Link>
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
          <Link
            href="/deals"
            className="p-2 rounded-xl bg-neutral hover:bg-neutral/80 border border-border text-muted hover:text-foreground transition shadow-xs shrink-0"
            title="Back to Deals Registry"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight truncate">
                Deal Details #{deal.dealRegID || deal.dealID}
              </h1>
              <AppChip variant={statusMeta.variant as any}>{statusMeta.label}</AppChip>
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
              <button
                type="button"
                onClick={() => setIsWtnModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-semibold rounded-xl border border-amber-500/30 transition shadow-xs"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>Update WTN</span>
              </button>

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

      {/* Section 1: Customer Account & Assigned AO */}
      <AppCard className="p-4 sm:p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-border/50 pb-3">
          <Building2 className="w-4 h-4 text-sky-600" />
          <h2 className="font-bold text-sm text-foreground">1. Customer & Account Information</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Customer Name</span>
            <p className="font-bold text-foreground text-sm leading-snug">{deal.custName || 'N/A'}</p>
            {deal.customerID && (
              <span className="inline-block text-[10px] font-mono text-muted bg-neutral px-2 py-0.5 rounded border border-border">
                ID: {deal.customerID}
              </span>
            )}
          </div>

          <div className="space-y-1 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Project Name</span>
            <p className="font-semibold text-foreground text-sm leading-snug">
              {deal.ProjectName || deal.projectName || 'N/A'}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Brand & Business Unit</span>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="px-2.5 py-1 rounded-lg font-bold bg-neutral text-foreground border border-border text-xs">
                {deal.brand || 'Unassigned'}
              </span>
              <span className="px-2 py-0.5 rounded font-bold bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-500/20 text-xs">
                {deal.BU || deal.bu || 'HQ'}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Assigned Account Officer</span>
            <div className="flex items-center gap-2 pt-0.5">
              <div className="h-7 w-7 rounded-full bg-neutral flex items-center justify-center text-muted border border-border text-xs shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-xs text-foreground">
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

      {/* Section 2: Timeline, Validity & SLA Milestones */}
      <AppCard className="p-4 sm:p-5 bg-card-bg border border-border/50 rounded-xl shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-border/50 pb-3">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <h2 className="font-bold text-sm text-foreground">2. Timeline & Validity Period</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl bg-neutral/40 border border-border/60 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
              <Calendar className="w-3 h-3 text-sky-500" /> Date Registered
            </span>
            <p className="font-mono font-bold text-sm text-foreground">
              {deal.dtRegistered ? new Date(deal.dtRegistered).toLocaleDateString() : 'N/A'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral/40 border border-border/60 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-500" /> Expiration Date
            </span>
            <div className="flex items-center gap-2">
              <p className="font-mono font-bold text-sm text-foreground">
                {expDate ? new Date(expDate).toLocaleDateString() : 'N/A'}
              </p>
              {daysRemaining > 0 && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {daysRemaining}d left
                </span>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral/40 border border-border/60 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
              <BellRing className="w-3 h-3 text-sky-500" /> When-To-Notify (WTN)
            </span>
            <p className="font-mono font-bold text-sm text-sky-600 dark:text-sky-400">
              {currentWtnDate ? new Date(currentWtnDate).toLocaleDateString() : 'Not Scheduled'}
            </p>
          </div>
        </div>

        {deal.remarks && (
          <div className="pt-2">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
              Remarks & Partner Notes
            </span>
            <div className="p-3.5 rounded-xl bg-neutral/30 border border-border/60 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
              {deal.remarks}
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
