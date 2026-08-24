'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  DollarSign,
  Building2,
  Tag,
  FileText,
  User,
  Layers,
  Calendar,
  Briefcase,
  AlertOctagon,
  ArrowRight,
} from 'lucide-react';
import { DealHeaderRecord } from '@my-app/types';
import {
  AppModal,
  AppModalHeader,
  AppModalTitle,
  AppModalDescription,
  AppModalBody,
  AppModalFooter,
  AppInput,
  AppButton,
  AppChip,
} from './ui';
import { formatDateLong } from './utils/time';

import DealsFilterPopover from './DealsFilterPopover';
import DealsSortPopover, { SortConfig } from './DealsSortPopover';
import { OFFICIAL_REGISTERED_BUS, normalizeBU } from '@/lib/buUtils';

interface DealLostListModalProps {
  isOpen: boolean;
  onClose: () => void;
  deals: DealHeaderRecord[];
  loading?: boolean;
}

export default function DealLostListModal({
  isOpen,
  onClose,
  deals,
  loading = false,
}: DealLostListModalProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [buFilters, setBuFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'dtRegistered',
    order: 'desc',
  });
  const [expandedDealID, setExpandedDealID] = useState<number | null>(null);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Helper to resolve lost reason: DealLost.reason -> DealHeader.remarks -> fallback
  const getResolvedLostReason = (deal: DealHeaderRecord): string => {
    const lostReason = deal.lostInfo?.reason?.trim();
    if (lostReason) return lostReason;
    const remarks = deal.remarks?.trim();
    if (remarks) return remarks;
    return 'Unspecified Reason';
  };

  // Filter deals that have a DealLost record or status 7 (Lost)
  const lostDeals = useMemo(() => {
    return deals.filter((d: DealHeaderRecord) => {
      const statusStr = String(d.dealStatus ?? '');
      return (
        statusStr === '7' ||
        d.dealStatus === 7 ||
        Boolean(d.lostInfo && d.lostInfo.reason)
      );
    });
  }, [deals]);

  // Aggregate Metrics
  const { totalLostValue, topReason } = useMemo(() => {
    let value = 0;
    const reasonCounts: Record<string, number> = {};

    lostDeals.forEach((deal) => {
      const dealAmt =
        deal.items?.reduce((sum: number, i: any) => sum + (Number(i.totalAmt) || 0), 0) || 0;
      value += dealAmt;

      const r = getResolvedLostReason(deal);
      reasonCounts[r] = (reasonCounts[r] || 0) + 1;
    });

    let top = 'Price Difference';
    let max = 0;
    Object.entries(reasonCounts).forEach(([r, count]) => {
      if (count > max) {
        max = count;
        top = r;
      }
    });

    return {
      totalLostValue: value,
      topReason: top,
    };
  }, [lostDeals]);

  // Filter and sort lost deals
  const filteredDeals = useMemo(() => {
    let result = lostDeals;

    if (searchInput.trim()) {
      const q = searchInput.toLowerCase().trim();
      result = result.filter((d) => {
        const company = (d.custName || '').toLowerCase();
        const project = (d.ProjectName || d.projectName || '').toLowerCase();
        const regID = (d.dealRegID || '').toLowerCase();
        const brand = (d.brand || '').toLowerCase();
        const resolvedReason = getResolvedLostReason(d).toLowerCase();
        const remarks = (d.remarks || '').toLowerCase();
        const vendor = (d.lostInfo?.competitorVendor || '').toLowerCase();
        const competitorBrand = (d.lostInfo?.competitorBrand || '').toLowerCase();

        return (
          company.includes(q) ||
          project.includes(q) ||
          regID.includes(q) ||
          brand.includes(q) ||
          resolvedReason.includes(q) ||
          remarks.includes(q) ||
          vendor.includes(q) ||
          competitorBrand.includes(q)
        );
      });
    }

    if (statusFilters.length > 0) {
      result = result.filter((d) => statusFilters.includes(String(d.dealStatus)));
    }

    if (buFilters.length > 0) {
      result = result.filter((d) => {
        const bu = normalizeBU(d.BU || d.bu || '');
        return buFilters.includes(bu);
      });
    }

    return [...result].sort((a, b) => {
      let comp = 0;
      switch (sortConfig.field) {
        case 'dtRegistered':
          comp = new Date(a.dtRegistered || a.dtCreated || 0).getTime() - new Date(b.dtRegistered || b.dtCreated || 0).getTime();
          break;
        case 'expDt':
          comp = new Date(a.expDt || a.expiration || 0).getTime() - new Date(b.expDt || b.expiration || 0).getTime();
          break;
        case 'dealRegID':
          comp = (a.dealRegID || String(a.dealID)).localeCompare(b.dealRegID || String(b.dealID));
          break;
        case 'custName':
          comp = (a.custName || '').localeCompare(b.custName || '');
          break;
        case 'projectName':
          comp = (a.ProjectName || a.projectName || '').localeCompare(b.ProjectName || b.projectName || '');
          break;
        case 'brand':
          comp = (a.brand || '').localeCompare(b.brand || '');
          break;
        case 'totalAmt': {
          const vA = a.items?.reduce((s, i) => s + (Number(i.totalAmt) || 0), 0) || 0;
          const vB = b.items?.reduce((s, i) => s + (Number(i.totalAmt) || 0), 0) || 0;
          comp = vA - vB;
          break;
        }
      }
      return sortConfig.order === 'asc' ? comp : -comp;
    });
  }, [lostDeals, searchInput, statusFilters, buFilters, sortConfig]);

  // Reset pagination on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchInput, statusFilters, buFilters, sortConfig, pageSize]);

  const totalRecords = filteredDeals.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedDeals = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredDeals.slice(startIndex, startIndex + pageSize);
  }, [filteredDeals, safeCurrentPage, pageSize]);

  const startRecord = totalRecords === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endRecord = Math.min(safeCurrentPage * pageSize, totalRecords);

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

  const toggleExpand = (dealID: number) => {
    setExpandedDealID((prev) => (prev === dealID ? null : dealID));
  };

  const formatAmounts = (deal: DealHeaderRecord) => {
    if (deal.aggregatedTotals && Object.keys(deal.aggregatedTotals).length > 0) {
      return Object.entries(deal.aggregatedTotals)
        .map(
          ([curr, amt]: [string, any]) =>
            `${curr} ${Number(amt).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
        )
        .join(' | ');
    }
    if (deal.items && deal.items.length > 0) {
      const total = deal.items.reduce(
        (acc: number, item: any) => acc + (Number(item.totalAmt) || 0),
        0
      );
      const curr = deal.items[0]?.currency || 'PHP';
      return `${curr} ${total.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
    return 'PHP 0.00';
  };

  return (
    <AppModal
      open={isOpen}
      onClose={() => {
        onClose();
        setSearchInput('');
        setExpandedDealID(null);
      }}
      width={1160}
    >
      <AppModal.Header>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <AppModal.Title>Lost Deals Competitor Intelligence</AppModal.Title>
            <AppModal.Description>
              Records from Deal Lost registry with competitor offers, reasons, and opportunity history.
            </AppModal.Description>
          </div>
        </div>
      </AppModal.Header>

      <AppModal.Body className="space-y-4 pt-3">
        {/* KPI Summary Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="p-3 rounded-xl bg-neutral/50 border border-border/70 text-center">
            <div className="text-[10px] text-muted font-semibold uppercase tracking-wider">
              Total Lost Deals
            </div>
            <div className="text-xl font-bold font-mono text-rose-600 mt-0.5">
              {lostDeals.length}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-neutral/50 border border-border/70 text-center">
            <div className="text-[10px] text-muted font-semibold uppercase tracking-wider">
              Total Pipeline Value Lost
            </div>
            <div className="text-sm font-bold font-mono text-foreground mt-1 truncate">
              PHP {totalLostValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-neutral/50 border border-border/70 text-center">
            <div className="text-[10px] text-muted font-semibold uppercase tracking-wider">
              Primary Reason
            </div>
            <div className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1 truncate" title={topReason}>
              {topReason}
            </div>
          </div>
        </div>

        {/* Search & Filter & Sort Bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <AppInput
              prefix={<Search className="w-4 h-4 text-muted" />}
              placeholder="Search by company, project, reason, or competitor..."
              value={searchInput}
              onChange={(e: any) => setSearchInput(e.target.value)}
              allowClear
              size="md"
            />
          </div>
          <DealsFilterPopover
            buFilters={buFilters}
            onBuFiltersChange={setBuFilters}
            expiryFilters={[]}
            onExpiryFiltersChange={() => {}}
            statusFilters={statusFilters}
            onStatusFiltersChange={setStatusFilters}
            officialBUs={OFFICIAL_REGISTERED_BUS}
          />
          <DealsSortPopover
            value={sortConfig}
            onChange={setSortConfig}
          />
        </div>

        {/* Minimalist Interactive Master-Detail Table - Zero Horizontal Scroll */}
        <div className="border border-border/70 rounded-xl overflow-hidden shadow-xs bg-background flex flex-col">
          <div className="max-h-[420px] overflow-y-auto overflow-x-hidden">
            <table className="w-full table-fixed text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-neutral/90 backdrop-blur-xs border-b border-border/60 text-[11px] font-semibold text-muted uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-[6%]"></th>
                  <th className="py-2.5 px-3 w-[30%]">Company Name</th>
                  <th className="py-2.5 px-3 w-[34%]">Project Name</th>
                  <th className="py-2.5 px-3 w-[30%]">Lost Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {loading ? (
                  [0, 1, 2, 3].map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="p-3"></td>
                      <td className="p-3">
                        <div className="shimmer-skeleton h-4 w-36 rounded" />
                      </td>
                      <td className="p-3">
                        <div className="shimmer-skeleton h-4 w-48 rounded" />
                      </td>
                      <td className="p-3">
                        <div className="shimmer-skeleton h-4 w-28 rounded" />
                      </td>
                    </tr>
                  ))
                ) : totalRecords === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted text-xs">
                      <AlertOctagon className="w-7 h-7 mx-auto text-muted/50 mb-1.5" />
                      <p className="font-semibold text-foreground">No lost deals found</p>
                      <p className="text-[11px] text-muted">
                        No deals match the selected search query or filter range.
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedDeals.map((deal) => {
                    const isExpanded = expandedDealID === deal.dealID;
                    const reasonText = getResolvedLostReason(deal);

                    return (
                      <React.Fragment key={deal.dealID}>
                        {/* Minimalist Summary Row */}
                        <tr
                          onClick={() => toggleExpand(deal.dealID)}
                          className={`cursor-pointer transition select-none group ${
                            isExpanded
                              ? 'bg-rose-500/5 hover:bg-rose-500/10'
                              : 'hover:bg-neutral/40'
                          }`}
                        >
                          <td className="py-3 px-3 text-center text-muted group-hover:text-foreground">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-rose-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted/70 group-hover:text-foreground" />
                            )}
                          </td>
                          <td className="py-3 px-3 font-semibold text-foreground">
                            <div className="space-y-0.5">
                              <div className="truncate group-hover:text-rose-600 transition" title={deal.custName}>
                                {deal.custName || 'Unknown Customer'}
                              </div>
                              <div className="font-mono text-[10px] text-muted font-normal">
                                {deal.dealRegID || `#${deal.dealID}`}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-foreground">
                            <div className="truncate max-w-[280px]" title={deal.ProjectName || deal.projectName}>
                              {deal.ProjectName || deal.projectName || 'Standard Project'}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 max-w-[280px] truncate"
                              title={reasonText}
                            >
                              {reasonText}
                            </span>
                          </td>
                        </tr>

                        {/* Expanded Full Details Panel */}
                        {isExpanded && (
                          <tr className="bg-rose-500/[0.03] border-b border-rose-500/20 animate-in fade-in duration-200">
                            <td colSpan={4} className="p-4 sm:p-5">
                              <div className="space-y-4 rounded-xl bg-background border border-border/80 p-4 shadow-xs">
                                {/* Top info banner */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                                  <div className="space-y-0.5">
                                    <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                                      <span>{deal.custName}</span>
                                      {deal.dealRegID && (
                                        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-neutral border border-border/60 text-muted">
                                          {deal.dealRegID}
                                        </span>
                                      )}
                                    </h4>
                                    <p className="text-xs text-muted">
                                      {deal.ProjectName || deal.projectName}
                                    </p>
                                  </div>

                                  <div className="text-right">
                                    <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                      {formatAmounts(deal)}
                                    </div>
                                    <div className="text-[10px] text-muted">
                                      Registered: {formatDateLong(deal.dtRegistered)}
                                    </div>
                                  </div>
                                </div>

                                {/* Detailed Intel Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                                  {/* Competitor Vendor */}
                                  <div className="p-2.5 rounded-lg bg-neutral/40 border border-border/60 space-y-1">
                                    <div className="text-[10px] text-muted font-semibold uppercase tracking-wider flex items-center gap-1">
                                      <Building2 className="w-3 h-3 text-rose-500" />
                                      <span>Competitor Vendor</span>
                                    </div>
                                    <div className="font-semibold text-foreground truncate" title={deal.lostInfo?.competitorVendor || 'N/A'}>
                                      {deal.lostInfo?.competitorVendor?.trim() || 'N/A'}
                                    </div>
                                  </div>

                                  {/* Competitor Brand */}
                                  <div className="p-2.5 rounded-lg bg-neutral/40 border border-border/60 space-y-1">
                                    <div className="text-[10px] text-muted font-semibold uppercase tracking-wider flex items-center gap-1">
                                      <Tag className="w-3 h-3 text-amber-500" />
                                      <span>Competitor Brand</span>
                                    </div>
                                    <div className="font-semibold text-foreground truncate" title={deal.lostInfo?.competitorBrand || 'N/A'}>
                                      {deal.lostInfo?.competitorBrand?.trim() || 'N/A'}
                                    </div>
                                  </div>

                                  {/* ICS Offer */}
                                  <div className="p-2.5 rounded-lg bg-neutral/40 border border-border/60 space-y-1">
                                    <div className="text-[10px] text-muted font-semibold uppercase tracking-wider flex items-center gap-1">
                                      <DollarSign className="w-3 h-3 text-sky-500" />
                                      <span>ICS Offer</span>
                                    </div>
                                    <div className="font-mono font-bold text-foreground truncate" title={deal.lostInfo?.icsOffer ? String(deal.lostInfo.icsOffer) : 'N/A'}>
                                      {(() => {
                                        const raw = deal.lostInfo?.icsOffer;
                                        if (!raw || String(raw).trim() === '' || String(raw).toUpperCase() === 'N/A') return 'N/A';
                                        const num = Number(String(raw).replace(/,/g, ''));
                                        if (!isNaN(num) && isFinite(num)) {
                                          return `PHP ${num.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
                                        }
                                        return String(raw);
                                      })()}
                                    </div>
                                  </div>

                                  {/* Competitor Offer */}
                                  <div className="p-2.5 rounded-lg bg-neutral/40 border border-border/60 space-y-1">
                                    <div className="text-[10px] text-muted font-semibold uppercase tracking-wider flex items-center gap-1">
                                      <DollarSign className="w-3 h-3 text-rose-500" />
                                      <span>Competitor Offer</span>
                                    </div>
                                    <div className="font-mono font-bold text-rose-600 dark:text-rose-400 truncate" title={deal.lostInfo?.competitorOffer ? String(deal.lostInfo.competitorOffer) : 'N/A'}>
                                      {(() => {
                                        const raw = deal.lostInfo?.competitorOffer;
                                        if (!raw || String(raw).trim() === '' || String(raw).toUpperCase() === 'N/A') return 'N/A';
                                        const num = Number(String(raw).replace(/,/g, ''));
                                        if (!isNaN(num) && isFinite(num)) {
                                          return `PHP ${num.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
                                        }
                                        return String(raw);
                                      })()}
                                    </div>
                                  </div>
                                </div>

                                {/* Additional Lost Information & Notes */}
                                <div className="p-3 rounded-lg bg-neutral/30 border border-border/60 space-y-1">
                                  <div className="text-[10px] text-muted font-semibold uppercase tracking-wider flex items-center gap-1">
                                    <FileText className="w-3 h-3 text-muted" />
                                    <span>Additional Details & Analysis</span>
                                  </div>
                                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                                    {deal.lostInfo?.otherInformation?.trim() ||
                                      deal.remarks?.trim() ||
                                      'No additional competitor notes recorded for this lost opportunity.'}
                                  </p>
                                </div>

                                {/* Metadata & Action footer */}
                                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                  <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted">
                                    <span className="flex items-center gap-1">
                                      <Layers className="w-3.5 h-3.5" />
                                      <span>Brand: <strong>{deal.brand || 'N/A'}</strong></span>
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <Briefcase className="w-3.5 h-3.5" />
                                      <span>BU: <strong>{deal.BU || 'N/A'}</strong></span>
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <User className="w-3.5 h-3.5" />
                                      <span>AO: <strong>{deal.AssignedAO || 'N/A'}</strong></span>
                                    </span>
                                  </div>

                                  <Link
                                    href={`/deals/${deal.dealID}`}
                                    onClick={onClose}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 transition shadow-xs"
                                  >
                                    <span>View Complete Deal Record</span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </Link>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
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
                        ? 'bg-rose-600 text-white shadow-xs'
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
      </AppModal.Body>

      <AppModal.Footer className="flex items-center justify-between pt-2">
        <span className="text-[11px] text-muted">
          Showing {filteredDeals.length} of {lostDeals.length} lost deal records
        </span>
        <div className="flex items-center gap-2">
          <Link
            href="/reports?view=lost"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 text-xs font-semibold rounded-lg border border-amber-500/30 transition shadow-xs"
          >
            <span>Open in Reports Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <AppButton
            variant="neutral"
            size="sm"
            onClick={() => {
              onClose();
              setSearchInput('');
              setExpandedDealID(null);
            }}
          >
            Close
          </AppButton>
        </div>
      </AppModal.Footer>
    </AppModal>
  );
}
