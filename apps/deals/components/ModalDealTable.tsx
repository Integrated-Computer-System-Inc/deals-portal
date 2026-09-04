'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Layers, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { DealHeaderRecord, DEAL_STATUS_MAP } from '@my-app/types';
import { formatDate, formatDateLong } from '@/components/utils/time';

interface ModalDealTableProps {
  deals: DealHeaderRecord[];
  onSelectDeal?: (deal: DealHeaderRecord) => void;
  onCloseModal?: () => void;
  emptyMessage?: string;
  showRemarks?: boolean;
  defaultPageSize?: number;
}

export function ModalDealTable({
  deals,
  onSelectDeal,
  onCloseModal,
  emptyMessage = 'No deals match the selected criteria',
  showRemarks = true,
  defaultPageSize = 50,
}: ModalDealTableProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Reset to page 1 if deals list changes or pageSize changes
  useEffect(() => {
    setCurrentPage(1);
  }, [deals.length, pageSize]);

  const totalRecords = deals.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  // Ensure currentPage is within valid bounds
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedDeals = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return deals.slice(startIndex, startIndex + pageSize);
  }, [deals, safeCurrentPage, pageSize]);

  const startRecord = totalRecords === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endRecord = Math.min(safeCurrentPage * pageSize, totalRecords);

  const formatAmounts = (deal: DealHeaderRecord) => {
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
            {totalRecords === 0 ? (
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
                        {deal.ProjectName || deal.projectName || 'Standard Project'}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center overflow-hidden">
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-neutral border border-border/60 whitespace-nowrap shadow-2xs">
                        {deal.BU || deal.bu || 'BU5'}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 font-semibold uppercase text-foreground truncate">
                      {deal.brand}
                    </td>
                    <td className="py-2.5 px-2 text-muted truncate">
                      {deal.AssignedAO || deal.assignedAO || '-'}
                    </td>
                    <td className="py-2.5 px-2 overflow-hidden" title={formatDateLong(deal.expDt || deal.expiration)}>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 whitespace-nowrap shadow-2xs max-w-full">
                        <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                        <span className="truncate">{formatDate(deal.expDt || deal.expiration)}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral border border-border/50 truncate inline-block">
                        {statusMeta.label}
                      </span>
                    </td>
                    {showRemarks && (
                      <td className="py-2.5 px-3 text-muted text-[11px] italic truncate max-w-[180px]" title={deal.remarks || ''}>
                        {deal.remarks || '-'}
                      </td>
                    )}
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-foreground text-[11px] truncate">
                      {formatAmounts(deal)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls Bar */}
      <div className="py-2.5 px-3.5 bg-neutral/40 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        {/* Record count info */}
        <div className="text-muted text-[11px] font-medium">
          {totalRecords === 0 ? (
            '0 deals'
          ) : (
            <>
              Showing <span className="font-semibold text-foreground">{startRecord}</span>–
              <span className="font-semibold text-foreground">{endRecord}</span> of{' '}
              <span className="font-semibold text-foreground">{totalRecords}</span> deals
            </>
          )}
        </div>

        {/* Page navigation and page size picker */}
        <div className="flex items-center gap-3">
          {/* Per-Page Picker */}
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

          {/* Navigation Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage <= 1}
              className="p-1.5 rounded-lg border border-border/50 text-muted hover:text-foreground hover:bg-neutral disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="First Page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage <= 1}
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
                onClick={() => setCurrentPage(page)}
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
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage >= totalPages}
              className="p-1.5 rounded-lg border border-border/50 text-muted hover:text-foreground hover:bg-neutral disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage >= totalPages}
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
