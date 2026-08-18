'use client';

import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { useDealQuery } from '@/hooks/useDealsQuery';
import { DealHeaderRecord, DEAL_STATUS_MAP } from '@my-app/types';
import {
  AppModal,
  AppModalHeader,
  AppModalTitle,
  AppModalDescription,
  AppModalBody,
  AppModalFooter,
  AppChip,
  AppButton,
  AppTable,
} from './ui';
import { formatDateLong } from './utils/time';

interface DealDetailsModalProps {
  dealID: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DealDetailsModal({
  dealID,
  isOpen,
  onClose,
}: DealDetailsModalProps) {
  const { data: deal = null, isLoading: loading } = useDealQuery(dealID, isOpen);

  if (!isOpen) return null;

  const statusNum = typeof deal?.dealStatus === 'number' ? deal.dealStatus : parseInt(deal?.dealStatus || '1') || 1;
  const statusMeta = DEAL_STATUS_MAP[statusNum] || {
    label: `Status ${deal?.dealStatus}`,
    variant: 'default' as const,
  };

  const expDate = deal?.expDt || deal?.expiration;
  const daysRemaining = expDate
    ? Math.ceil((new Date(expDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const totalCalculated = deal?.items?.reduce((acc: number, item: any) => acc + (Number(item.totalAmt) || 0), 0) || 0;
  const mainCurrency = deal?.items?.[0]?.currency || 'PHP';

  const itemColumns = [
    {
      title: 'Item Description',
      dataIndex: 'itemDesc',
      key: 'itemDesc',
      render: (text: string) => (
        <span className="font-medium text-xs text-foreground">{text || 'N/A'}</span>
      ),
    },
    {
      title: 'Qty',
      dataIndex: 'qty',
      key: 'qty',
      width: 70,
      align: 'center' as const,
      render: (qty: number) => (
        <span className="font-mono text-xs">{qty || 1}</span>
      ),
    },
    {
      title: 'Currency',
      dataIndex: 'currency',
      key: 'currency',
      width: 90,
      align: 'center' as const,
      render: (curr: string) => (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-neutral/80 border border-border/60">
          {curr || 'PHP'}
        </span>
      ),
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmt',
      key: 'totalAmt',
      align: 'right' as const,
      width: 140,
      render: (amt: number, record: any) => (
        <span className="font-mono font-bold text-xs text-foreground">
          {record.currency || 'PHP'} {Number(amt || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
  ];

  return (
    <AppModal open={isOpen} onClose={onClose} width={780}>
      <AppModalHeader>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 border border-sky-500/20">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <AppModalTitle>Deal Overview</AppModalTitle>
              {deal?.dealRegID && (
                <span className="px-2 py-0.5 rounded-md bg-neutral text-xs font-mono font-bold text-foreground border border-border">
                  {deal.dealRegID}
                </span>
              )}
              {deal && (
                <AppChip variant={statusMeta.variant as any}>
                  {statusMeta.label}
                </AppChip>
              )}
            </div>
            <AppModalDescription>
              Complete registration parameters, SLA scheduling, and line item breakdown.
            </AppModalDescription>
          </div>
        </div>
      </AppModalHeader>

      <AppModalBody className="max-h-[75vh] overflow-y-auto space-y-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
            <p className="text-xs font-medium">Fetching complete deal records...</p>
          </div>
        ) : !deal ? (
          <div className="py-12 text-center text-muted text-xs">
            Deal record not found or inaccessible.
          </div>
        ) : (
          <>
            {/* Core Deal Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 rounded-xl bg-neutral/40 border border-border/70 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-sky-500" /> Customer
                </span>
                <p className="font-bold text-foreground text-sm">{deal.custName || 'N/A'}</p>
                {deal.customerID && (
                  <p className="text-[10px] text-muted font-mono">ID: {deal.customerID}</p>
                )}
              </div>

              <div className="space-y-1 sm:col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                  <FileText className="w-3 h-3 text-indigo-500" /> Project Name
                </span>
                <p className="font-semibold text-foreground text-xs leading-relaxed">
                  {deal.ProjectName || deal.projectName || 'N/A'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                  <Tag className="w-3 h-3 text-emerald-500" /> Brand & BU
                </span>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="px-2 py-0.5 rounded font-bold bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-500/20 text-xs">
                    {deal.brand || 'Unassigned'}
                  </span>
                  <span className="px-2 py-0.5 rounded font-bold bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 text-xs">
                    {deal.BU || deal.bu || 'HQ'}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                  <User className="w-3 h-3 text-amber-500" /> Assigned AO
                </span>
                <p className="font-semibold text-foreground">{deal.AssignedAO || deal.assignedAO || 'Unassigned'}</p>
                {deal.createdBy && (
                  <p className="text-[10px] text-muted dark:text-zinc-400">Created by: {deal.createdBy}</p>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-rose-500" /> Validity & Expiration
                </span>
                <p className="font-medium text-foreground">
                  {formatDateLong(deal.dtRegistered)} →{' '}
                  <span className="font-bold">{formatDateLong(expDate)}</span>
                </p>
                {daysRemaining > 0 ? (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold font-mono">
                    {daysRemaining} days remaining
                  </p>
                ) : (
                  <p className="text-[10px] text-rose-500 dark:text-rose-400 font-semibold font-mono">Expired</p>
                )}
              </div>
            </div>

            {/* When To Notify & SLA Schedule */}
            {deal.wtn?.whenToNotify && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs">
                <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300">
                  <BellRing className="w-4 h-4 shrink-0" />
                  <div>
                    <span className="font-bold">When-To-Notify Alert Scheduled: </span>
                    <span>{formatDateLong(deal.wtn.whenToNotify)}</span>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-sky-600">Auto-Dispatcher Active</span>
              </div>
            )}

            {/* Remarks if present */}
            {deal.remarks && (
              <div className="p-3 rounded-xl bg-neutral/60 border border-border/70 text-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Remarks / Notes</span>
                <p className="text-foreground whitespace-pre-wrap">{deal.remarks}</p>
              </div>
            )}

            {/* Line Items Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-500" /> Registered Line Items ({deal.items?.length || 0})
                </h3>
                <div className="text-xs font-mono font-bold text-foreground">
                  Grand Total:{' '}
                  <span className="text-sky-600 dark:text-sky-400 font-black">
                    {mainCurrency} {totalCalculated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-border/70 overflow-hidden shadow-xs">
                <AppTable
                  columns={itemColumns}
                  dataSource={deal.items || []}
                  rowKey={(record, idx) => record.itemID || idx || 0}
                  pagination={false}
                />
              </div>
            </div>

            {/* Lost Deal Competitor Intel (if applicable) */}
            {deal.lostInfo && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-rose-600">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Closed as Lost — Competitor Intel</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-foreground">
                  <div>
                    <span className="text-muted text-[10px] block">Competitor Brand & Vendor:</span>
                    <span className="font-semibold">{deal.lostInfo.competitorBrand} ({deal.lostInfo.competitorVendor})</span>
                  </div>
                  <div>
                    <span className="text-muted text-[10px] block">Offer Comparison:</span>
                    <span>ICS: {deal.lostInfo.icsOffer} vs Comp: {deal.lostInfo.competitorOffer}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted text-[10px] block">Reason for Loss:</span>
                    <span className="italic">{deal.lostInfo.reason}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </AppModalBody>

      <AppModalFooter className="flex items-center justify-between">
        <AppButton variant="secondary" onClick={onClose} size="sm">
          Close
        </AppButton>

        {deal && (
          <Link href={`/deals/${deal.dealID}/edit`}>
            <AppButton variant="primary" size="sm" leftIcon={<Edit className="w-3.5 h-3.5" />}>
              Edit Deal
            </AppButton>
          </Link>
        )}
      </AppModalFooter>
    </AppModal>
  );
}
