'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Link2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  History,
  Calendar,
  Clock,
  FileText,
  ArrowUpRight,
  Sparkles,
  Building2,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { DealHeaderRecord, DEAL_STATUS_MAP, LinkedDealSummary } from '@my-app/types';
import { AppCard, AppChip, AppButton } from './ui';
import { formatDateLong } from './utils/time';

interface LinkedDealSectionProps {
  deal: DealHeaderRecord;
}

export default function LinkedDealSection({ deal }: LinkedDealSectionProps) {
  const [showHistory, setShowHistory] = useState(false);
  const previousDeal = deal.previousDeal;
  const nextDeal = deal.nextDeal;

  if (!previousDeal && !nextDeal) {
    return null;
  }

  const prevStatusNum = typeof previousDeal?.dealStatus === 'number'
    ? previousDeal.dealStatus
    : parseInt(previousDeal?.dealStatus || '1') || 1;
  const prevStatusMeta = DEAL_STATUS_MAP[prevStatusNum] || {
    label: `Status ${previousDeal?.dealStatus}`,
    variant: 'default' as const,
  };

  const nextStatusNum = typeof nextDeal?.dealStatus === 'number'
    ? nextDeal.dealStatus
    : parseInt(nextDeal?.dealStatus || '1') || 1;
  const nextStatusMeta = DEAL_STATUS_MAP[nextStatusNum] || {
    label: `Status ${nextDeal?.dealStatus}`,
    variant: 'default' as const,
  };

  return (
    <div className="space-y-4">
      {/* 1. Predecessor Deal (Origin Deal) */}
      {previousDeal && (
        <AppCard className="p-4 sm:p-5 bg-card-bg border border-sky-500/30 dark:border-sky-500/20 rounded-xl shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                <Link2 className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-sm text-foreground">Linked Previous Deal</h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-700 dark:text-sky-300 font-bold border border-sky-500/20">
                    Origin Record
                  </span>
                </div>
                <p className="text-[11px] text-muted">
                  This registration succeeded a prior deal that reached its 3-renewal limit.
                </p>
              </div>
            </div>

            <Link
              href={`/deals/${previousDeal.dealID}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-semibold border border-primary/20 transition shadow-xs"
            >
              <span>View Deal #{previousDeal.dealRegID || previousDeal.dealID}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Previous Deal Metadata Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-neutral/40 border border-border/60 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                Deal Registration ID
              </span>
              <Link
                href={`/deals/${previousDeal.dealID}`}
                className="font-mono font-bold text-xs sm:text-sm text-primary hover:underline flex items-center gap-1"
              >
                <span>#{previousDeal.dealRegID || `DR-${previousDeal.dealID}`}</span>
                <ExternalLink className="w-3 h-3 text-muted shrink-0" />
              </Link>
              <p className="text-[10px] text-muted">Internal ID: {previousDeal.dealID}</p>
            </div>

            <div className="p-3 rounded-xl bg-neutral/40 border border-border/60 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                Deal Status
              </span>
              <div>
                <AppChip variant={prevStatusMeta.variant as any}>{prevStatusMeta.label}</AppChip>
              </div>
              <p className="text-[10px] text-muted">
                {previousDeal.renewalsCount || 0} renewals recorded
              </p>
            </div>

            <div className="p-3 rounded-xl bg-neutral/40 border border-border/60 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                Customer & Brand
              </span>
              <p className="font-semibold text-xs text-foreground truncate">
                {previousDeal.custName || 'N/A'}
              </p>
              <p className="text-[10px] text-muted truncate">
                Brand: {previousDeal.brand || 'N/A'} {previousDeal.bu ? `(${previousDeal.bu})` : ''}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-neutral/40 border border-border/60 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                Prior Expiry Date
              </span>
              <p className="font-mono font-bold text-xs sm:text-sm text-foreground">
                {formatDateLong(previousDeal.expDt)}
              </p>
              <p className="text-[10px] text-muted">
                Registered: {formatDateLong(previousDeal.dtRegistered)}
              </p>
            </div>
          </div>

          {/* Collapsible History Toggle */}
          {previousDeal.renewals && previousDeal.renewals.length > 0 && (
            <div className="pt-2 border-t border-border/40">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral hover:bg-neutral/80 text-foreground font-semibold text-xs rounded-xl border border-border transition shadow-xs cursor-pointer"
                >
                  <History className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    {showHistory
                      ? 'Hide Prior Renewal History'
                      : `See Prior Renewal History (${previousDeal.renewals.length} Extensions)`}
                  </span>
                  {showHistory ? (
                    <ChevronUp className="w-3.5 h-3.5 text-muted" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-muted" />
                  )}
                </button>
                <span className="text-[11px] text-muted">
                  Max 3 extensions reached on previous deal
                </span>
              </div>

              {/* Expanded History List */}
              {showHistory && (
                <div className="mt-3 overflow-hidden rounded-xl border border-border/70 bg-background shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-neutral/80 border-b border-border/60 text-[11px] font-semibold text-muted uppercase tracking-wider">
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Renewal Date</th>
                        <th className="py-2 px-3 text-center">Extended</th>
                        <th className="py-2 px-3">New Expiry Date</th>
                        <th className="py-2 px-3">Remarks / Partner Notes</th>
                        <th className="py-2 px-3 text-right">Logged At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {previousDeal.renewals.map((r, idx) => {
                        const validityDays = r.dtRenewal && r.rexpDt
                          ? Math.max(1, Math.ceil((new Date(r.rexpDt).getTime() - new Date(r.dtRenewal).getTime()) / (1000 * 60 * 60 * 24)))
                          : null;
                        return (
                          <tr key={r.renewalID || idx} className="hover:bg-neutral/40 transition">
                            <td className="py-2 px-3 font-mono text-[11px] text-muted">
                              #{previousDeal.renewals!.length - idx}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-foreground">
                              {formatDateLong(r.dtRenewal)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 text-[11px]">
                                +{validityDays || 90}d
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {formatDateLong(r.rexpDt)}
                            </td>
                            <td className="py-2 px-3 text-muted max-w-[220px] truncate" title={r.remarks || 'Standard validity renewal'}>
                              {r.remarks || 'Standard validity renewal'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-[10px] text-muted">
                              {formatDateLong(r.dtCreated)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </AppCard>
      )}

      {/* 2. Successor Deal (If viewing the old expired deal that was renewed into a new deal) */}
      {nextDeal && (
        <AppCard className="p-4 sm:p-5 bg-gradient-to-r from-emerald-500/10 via-card-bg to-card-bg border border-emerald-500/30 rounded-xl shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-sm text-foreground">
                    Succeeded by New Deal Registration
                  </h2>
                  <AppChip variant={nextStatusMeta.variant as any}>{nextStatusMeta.label}</AppChip>
                </div>
                <p className="text-[11px] text-muted">
                  This opportunity was renewed under a new deal registration after reaching the 3-renewal limit.
                </p>
              </div>
            </div>

            <Link
              href={`/deals/${nextDeal.dealID}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              <span>Go to New Deal #{nextDeal.dealRegID || nextDeal.dealID}</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1 border-t border-border/40">
            <div>
              <span className="text-[10px] text-muted uppercase font-bold block">New Deal ID</span>
              <Link
                href={`/deals/${nextDeal.dealID}`}
                className="font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                #{nextDeal.dealRegID || `DR-${nextDeal.dealID}`}
              </Link>
            </div>
            <div>
              <span className="text-[10px] text-muted uppercase font-bold block">Customer</span>
              <span className="font-semibold text-foreground truncate block">
                {nextDeal.custName || deal.custName || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted uppercase font-bold block">New Expiry Date</span>
              <span className="font-mono font-bold text-foreground">
                {formatDateLong(nextDeal.expDt)}
              </span>
            </div>
          </div>
        </AppCard>
      )}
    </div>
  );
}
