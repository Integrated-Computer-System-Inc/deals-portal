'use client';

import React from 'react';
import Link from 'next/link';
import { ExternalLink, Layers } from 'lucide-react';
import { DealHeaderRecord, DEAL_STATUS_MAP } from '@my-app/types';
import { formatDateLong } from '@/components/utils/time';

interface ModalDealTableProps {
  deals: DealHeaderRecord[];
  onSelectDeal?: (deal: DealHeaderRecord) => void;
  onCloseModal?: () => void;
  emptyMessage?: string;
  showRemarks?: boolean;
}

export function ModalDealTable({
  deals,
  onSelectDeal,
  onCloseModal,
  emptyMessage = 'No deals match the selected criteria',
  showRemarks = true,
}: ModalDealTableProps) {
  const [visibleCount, setVisibleCount] = React.useState(60);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 200 && visibleCount < deals.length) {
      setVisibleCount((prev) => Math.min(prev + 50, deals.length));
    }
  };

  React.useEffect(() => {
    setVisibleCount(60);
  }, [deals]);

  const displayedDeals = React.useMemo(() => {
    return deals.slice(0, visibleCount);
  }, [deals, visibleCount]);

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

  return (
    <div className="border border-border/70 rounded-xl overflow-hidden shadow-xs bg-background">
      <div className="max-h-[440px] overflow-y-auto" onScroll={handleScroll}>
        <table className="w-full text-left text-xs border-collapse table-auto">
          <thead className="sticky top-0 z-10 bg-neutral/95 backdrop-blur-xs border-b border-border/60 text-[11px] font-semibold text-muted uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-2.5 w-[110px]">Deal Ref ID</th>
              <th className="py-2.5 px-2.5 min-w-[140px]">Customer & Project</th>
              <th className="py-2.5 px-1.5 text-center w-[55px]">BU</th>
              <th className="py-2.5 px-2 w-[85px]">Brand</th>
              <th className="py-2.5 px-2 w-[95px]">Assigned AO</th>
              <th className="py-2.5 px-2 w-[85px]">Expiry Date</th>
              <th className="py-2.5 px-1.5 text-center w-[85px]">Status</th>
              {showRemarks && <th className="py-2.5 px-2 min-w-[110px]">Remarks</th>}
              <th className="py-2.5 px-2.5 text-right w-[110px]">Amount</th>
              <th className="py-2.5 px-1.5 text-center w-[36px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {deals.length === 0 ? (
              <tr>
                <td colSpan={showRemarks ? 10 : 9} className="p-8 text-center text-muted text-xs">
                  <Layers className="w-6 h-6 mx-auto text-muted/50 mb-1.5" />
                  <p className="font-semibold text-foreground">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              displayedDeals.map((deal) => {
                const statusNum = typeof deal.dealStatus === 'number' ? deal.dealStatus : parseInt(deal.dealStatus || '1') || 1;
                const statusMeta = (DEAL_STATUS_MAP as any)[statusNum] || { label: `Status ${deal.dealStatus}`, variant: 'default' };

                return (
                  <tr
                    key={deal.dealID}
                    className="hover:bg-neutral/40 transition [content-visibility:auto] [contain-intrinsic-size:44px]"
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-sky-600 dark:text-sky-400 truncate">
                      {deal.dealRegID || `#${deal.dealID}`}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-foreground truncate max-w-[240px]">{deal.custName || 'Unknown Customer'}</div>
                      <div className="text-[11px] text-muted truncate max-w-[240px]">{deal.ProjectName || deal.projectName || 'Standard Project'}</div>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral border border-border/60">
                        {deal.BU || deal.bu || 'BU5'}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 font-medium text-foreground truncate">
                      {deal.brand}
                    </td>
                    <td className="py-2.5 px-2 text-muted truncate">
                      {deal.AssignedAO || deal.assignedAO || '-'}
                    </td>
                    <td className="py-2.5 px-2 font-mono text-[11px] text-foreground truncate">
                      {formatDateLong(deal.expDt || deal.expiration)}
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
                    <td className="py-2.5 px-1.5 text-center">
                      {onSelectDeal ? (
                        <button
                          onClick={() => {
                            if (onCloseModal) onCloseModal();
                            onSelectDeal(deal);
                          }}
                          className="p-1.5 hover:bg-neutral rounded text-muted hover:text-sky-600 transition"
                          title="View Details"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <Link
                          href={`/deals/${deal.dealID}`}
                          onClick={() => {
                            if (onCloseModal) onCloseModal();
                          }}
                          className="p-1.5 hover:bg-neutral rounded text-muted hover:text-sky-600 transition inline-block"
                          title="View Deal"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {deals.length > visibleCount && (
        <div className="py-1.5 px-3 bg-neutral/60 border-t border-border/60 text-center text-[10px] text-muted">
          Showing {visibleCount} of {deals.length} deals • Scroll to load more
        </div>
      )}
    </div>
  );
}
