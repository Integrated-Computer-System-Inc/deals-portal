'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Layers, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { DealHeaderRecord, DEAL_STATUS_MAP } from '@my-app/types';
import { formatDate, formatDateLong } from '@/components/utils/time';

interface ModalDealTableProps {
  deals: DealHeaderRecord[] | any[];
  onSelectDeal?: (deal: DealHeaderRecord | any) => void;
  onCloseModal?: () => void;
  emptyMessage?: string;
  showRemarks?: boolean;
  defaultPageSize?: number;
  totalRecordsCount?: number;
  serverCurrentPage?: number;
  serverTotalPages?: number;
  onServerPageChange?: (page: number) => void;
  isLoading?: boolean;
}

export function ModalDealTable({
  deals,
  onSelectDeal,
  onCloseModal,
  emptyMessage = 'No deals match the selected criteria',
  showRemarks = true,
  defaultPageSize = 50,
  totalRecordsCount,
  serverCurrentPage,
  serverTotalPages,
  onServerPageChange,
  isLoading = false,
}: ModalDealTableProps) {
  const router = useRouter();
  const [clientPage, setClientPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const isServer = Boolean(onServerPageChange);

  // Reset to page 1 if deals list changes or pageSize changes (client mode only)
  useEffect(() => {
    if (!isServer) {
      setClientPage(1);
    }
  }, [deals.length, pageSize, isServer]);

  const totalRecords = isServer ? (totalRecordsCount ?? deals.length) : deals.length;
  const totalPages = isServer
    ? Math.max(1, serverTotalPages ?? Math.ceil(totalRecords / pageSize))
    : Math.max(1, Math.ceil(totalRecords / pageSize));

  // Current page based on server or client mode
  const currentPage = isServer ? (serverCurrentPage ?? 1) : clientPage;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const handlePageChange = (newPage: number) => {
    const target = Math.min(Math.max(1, newPage), totalPages);
    if (isServer && onServerPageChange) {
      onServerPageChange(target);
    } else {
      setClientPage(target);
    }
  };

  const paginatedDeals = useMemo(() => {
    if (isServer) return deals;
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return deals.slice(startIndex, startIndex + pageSize);
  }, [deals, safeCurrentPage, pageSize, isServer]);

  const startRecord = totalRecords === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endRecord = Math.min(safeCurrentPage * pageSize, totalRecords);

  const formatAmounts = (deal: DealHeaderRecord | any) => {
    if (deal.TotalAmount !== undefined && deal.TotalAmount !== null) {
      return `PHP ${Number(deal.TotalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
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

  // Generate page numbers for pagination bar (e.g. 1, 2, 3, 4, 5)
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

  return (
    <div className="border border-border/70 rounded-xl overflow-hidden shadow-xs bg-background flex flex-col">
      <div className="max-h-[440px] overflow-auto">
        <table className="w-full text-left text-xs border-collapse table-fixed min-w-[1020px]">
          <colgroup>
            <col className="w-[110px]" />
            <col className="min-w-[160px]" />
            <col className="w-[90px]" />
            <col className="w-[85px]" />
            <col className="w-[95px]" />
            <col className="w-[140px]" />
            <col className="w-[95px]" />
            {showRemarks && <col className="w-[130px]" />}
            <col className="w-[120px]" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-neutral/95 backdrop-blur-xs border-b border-border/60 text-[11px] font-semibold text-muted uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-2.5">Deal Ref ID</th>
              <th className="py-2.5 px-2.5">Customer & Project</th>
              <th className="py-2.5 px-1.5 text-center">BU</th>
              <th className="py-2.5 px-2">Brand</th>
              <th className="py-2.5 px-2">Assigned AO</th>
              <th className="py-2.5 px-2">Expiry Date</th>
              <th className="py-2.5 px-1.5 text-center">Status</th>
              {showRemarks && <th className="py-2.5 px-2">Remarks</th>}
              <th className="py-2.5 px-2.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {isLoading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-2.5 px-3"><div className="shimmer-skeleton h-4 w-20 rounded" /></td>
                  <td className="py-2.5 px-3"><div className="shimmer-skeleton h-4 w-40 rounded" /></td>
                  <td className="py-2.5 px-1.5 text-center"><div className="shimmer-skeleton h-4 w-12 mx-auto rounded" /></td>
                  <td className="py-2.5 px-2"><div className="shimmer-skeleton h-4 w-16 rounded" /></td>
                  <td className="py-2.5 px-2"><div className="shimmer-skeleton h-4 w-20 rounded" /></td>
                  <td className="py-2.5 px-2"><div className="shimmer-skeleton h-4 w-24 rounded" /></td>
                  <td className="py-2.5 px-1.5 text-center"><div className="shimmer-skeleton h-4 w-16 mx-auto rounded" /></td>
                  {showRemarks && <td className="py-2.5 px-2"><div className="shimmer-skeleton h-4 w-20 rounded" /></td>}
                  <td className="py-2.5 px-2.5 text-right"><div className="shimmer-skeleton h-4 w-20 ml-auto rounded" /></td>
                </tr>
              ))
            ) : totalRecords === 0 ? (
              <tr>
                <td colSpan={showRemarks ? 9 : 8} className="p-8 text-center text-muted text-xs">
                  <Layers className="w-6 h-6 mx-auto text-muted/50 mb-1.5" />
                  <p className="font-semibold text-foreground">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              paginatedDeals.map((deal) => {
                const statusNum = typeof deal.dealStatus === 'number' ? deal.dealStatus : parseInt(deal.dealStatus || '1') || 1;
                const statusMeta = (DEAL_STATUS_MAP as any)[statusNum] || { label: `Status ${deal.dealStatus}`, variant: 'default' };

                return (
                  <tr
                    key={deal.dealID}
                    onClick={() => {
                      if (onCloseModal) onCloseModal();
                      if (onSelectDeal) {
                        onSelectDeal(deal);
                      } else {
                        router.push(`/deals/${deal.dealID}`);
                      }
                    }}
                    className="hover:bg-neutral/60 transition cursor-pointer group [content-visibility:auto] [contain-intrinsic-size:44px]"
                    title="Click to view deal record"
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-sky-600 dark:text-sky-400 group-hover:underline truncate">
                      {deal.dealRegID || `#${deal.dealID}`}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-foreground group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors truncate max-w-[240px]">
                        {deal.custName || 'Unknown Customer'}
                      </div>
                      <div className="text-[11px] text-muted truncate max-w-[240px]">
                        {deal.ProjectName || 'No Project Name'}
                      </div>
                    </td>
                    <td className="py-2.5 px-1.5 text-center">
                      <span className="font-mono text-[10px] bg-neutral/80 px-1.5 py-0.5 rounded border border-border/40">
                        {deal.BU || deal.bu || 'N/A'}
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="font-semibold text-foreground truncate max-w-[100px] block">
                        {deal.brand || 'Unbranded'}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-muted truncate max-w-[120px]">
                      {deal.AssignedAO || 'Unassigned'}
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="font-medium text-foreground">
                        {deal.expDt ? formatDate(deal.expDt) : 'No SLA'}
                      </div>
                      {deal.expDt && (
                        <div className="text-[10px] text-muted">
                          {formatDateLong(deal.expDt)}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-1.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        statusMeta.variant === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                        statusMeta.variant === 'warning' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                        statusMeta.variant === 'danger' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                        'bg-neutral/80 text-muted'
                      }`}>
                        {statusMeta.label}
                      </span>
                    </td>
                    {showRemarks && (
                      <td className="py-2.5 px-2 text-muted text-[11px] truncate max-w-[140px]" title={deal.remarks || ''}>
                        {deal.remarks || '—'}
                      </td>
                    )}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                      {formatAmounts(deal)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 py-2 border-t border-border/60 bg-neutral/30 text-xs">
        <div className="text-muted text-[11px]">
          Showing <span className="font-semibold text-foreground">{startRecord}</span> to{' '}
          <span className="font-semibold text-foreground">{endRecord}</span> of{' '}
          <span className="font-semibold text-foreground">{totalRecords}</span> deals
        </div>

        <div className="flex items-center gap-3">
          {/* Per-Page Picker (Client Mode Only) */}
          {!isServer && (
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
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handlePageChange(1)}
              disabled={safeCurrentPage <= 1 || isLoading}
              className="p-1.5 rounded-lg border border-border/50 text-muted hover:text-foreground hover:bg-neutral disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="First Page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handlePageChange(safeCurrentPage - 1)}
              disabled={safeCurrentPage <= 1 || isLoading}
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
                onClick={() => handlePageChange(page)}
                disabled={isLoading}
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
              onClick={() => handlePageChange(safeCurrentPage + 1)}
              disabled={safeCurrentPage >= totalPages || isLoading}
              className="p-1.5 rounded-lg border border-border/50 text-muted hover:text-foreground hover:bg-neutral disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handlePageChange(totalPages)}
              disabled={safeCurrentPage >= totalPages || isLoading}
              className="p-1.5 rounded-lg border border-border/50 text-muted hover:text-foreground hover:bg-neutral disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Last Page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
