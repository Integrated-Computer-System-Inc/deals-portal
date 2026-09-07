'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@my-app/database';
import { ScopedDealsFilter, UserRole } from '@my-app/types';
import { serverCache } from '@/lib/serverCache';
import { buildAOScopingConditions, buildBUScopingConditions, buildPMScopingConditions } from '@/lib/roles';
import { OFFICIAL_REGISTERED_BUS, normalizeBU, isOfficialBU } from '@/lib/buUtils';

export interface ExpiryRiskCounts {
  criticalCount: number; // <= 3 days
  urgentCount: number;   // <= 7 days
  warningCount: number;  // <= 15 days
  noticeCount: number;   // <= 30 days
  totalAtRisk: number;
}

export interface ReportBrandMetric {
  brand: string;
  assignedPM: string | null;
  dealCount: number;
  totalValue: number;
  activeCount: number;
  approvedCount: number;
  waitingCount: number;
  lostCount: number;
}

export interface ReportBUMetric {
  bu: string;
  normalizedBU: string;
  isOfficial: boolean;
  dealCount: number;
  totalValue: number;
  activeCount: number;
  approvedCount: number;
  waitingCount: number;
  lostCount: number;
}

export interface ReportDealSummary {
  dealID: number;
  dealRegID: string | null;
  custName: string | null;
  ProjectName: string | null;
  brand: string | null;
  BU: string | null;
  AssignedAO: string | null;
  dealStatus: string | null;
  dtRegistered: Date | null;
  expDt: Date | null;
  dtCreated: Date | null;
  remarks: string | null;
  TotalAmount: any;
  IsExpired: number | null;
  IsRenewed: number | null;
  IsLost: number | null;
  DaysRemaining: number | null;
}

export interface ReportsSummaryMetrics {
  totalRegistered: number;
  totalExpired: number;
  totalRenewed: number;
  expiredThisMonth: number;
  grandTotalPipelineValue: number;
  lostCount: number;
  expiryRiskCounts: ExpiryRiskCounts;
  recentDeals: ReportDealSummary[];
  brandMetrics: ReportBrandMetric[];
  buMetrics: ReportBUMetric[];
}

export interface DateRangeFilterParams {
  preset?: string;
  startDate?: string;
  endDate?: string;
}

function getDateBounds(preset?: string, startDate?: string, endDate?: string): { start?: Date; end?: Date } {
  if (!preset || preset === 'ALL') return {};
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  switch (preset) {
    case 'TODAY': {
      const start = new Date(currentYear, currentMonth, now.getDate(), 0, 0, 0, 0);
      const end = new Date(currentYear, currentMonth, now.getDate(), 23, 59, 59, 999);
      return { start, end };
    }
    case 'THIS_MONTH': {
      const start = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
      const end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
    case 'LAST_MONTH': {
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const start = new Date(prevYear, prevMonth, 1, 0, 0, 0, 0);
      const end = new Date(prevYear, prevMonth + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
    case 'Q1': {
      return {
        start: new Date(currentYear, 0, 1, 0, 0, 0, 0),
        end: new Date(currentYear, 3, 0, 23, 59, 59, 999),
      };
    }
    case 'Q2': {
      return {
        start: new Date(currentYear, 3, 1, 0, 0, 0, 0),
        end: new Date(currentYear, 6, 0, 23, 59, 59, 999),
      };
    }
    case 'Q3': {
      return {
        start: new Date(currentYear, 6, 1, 0, 0, 0, 0),
        end: new Date(currentYear, 9, 0, 23, 59, 59, 999),
      };
    }
    case 'Q4': {
      return {
        start: new Date(currentYear, 9, 1, 0, 0, 0, 0),
        end: new Date(currentYear, 12, 0, 23, 59, 59, 999),
      };
    }
    case 'CUSTOM': {
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;
      if (end) end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    default:
      return {};
  }
}

/**
 * Retrieves pre-aggregated reporting metrics from dbo.DealReportView
 * with sub-second execution time and minimal JSON payload (<35KB).
 */
export async function getReportsMetrics(
  filter: ScopedDealsFilter = {},
  dateRange?: DateRangeFilterParams
): Promise<{
  success: boolean;
  data?: ReportsSummaryMetrics;
  error?: string;
}> {
  try {
    let session: any = null;
    try {
      session = await getServerSession(authOptions);
    } catch {
      // In standalone scripts or background jobs outside request context
    }

    const sessionRole = (session?.user as any)?.role as string | undefined;
    const sessionAccountName = ((session?.user as any)?.AccountName || session?.user?.name || '').trim();
    const sessionDomainAccount = ((session?.user as any)?.DomainAccount || '').trim();
    const sessionEmail = ((session?.user as any)?.Email || session?.user?.email || '').trim();
    const sessionAccountGroup = ((session?.user as any)?.AccountGroup || '').trim();
    const sessionAssignedBUs = (session?.user as any)?.assignedBUs as string[] | undefined;
    const sessionAssignedBrands = (session?.user as any)?.assignedBrands as string[] | undefined;

    const isSuperRole = sessionRole === 'ITadmin' || sessionRole === 'admin' || sessionRole === 'aa';
    const userRole = isSuperRole ? (filter.userRole || sessionRole || 'admin') : (sessionRole || 'ao');
    const accountName = isSuperRole ? (filter.accountName || sessionAccountName) : sessionAccountName;
    const domainAccount = isSuperRole ? (filter.domainAccount || sessionDomainAccount) : sessionDomainAccount;
    const accountGroup = isSuperRole ? (filter.accountGroup || sessionAccountGroup) : sessionAccountGroup;
    const assignedBUs = isSuperRole ? (filter.assignedBUs || sessionAssignedBUs) : sessionAssignedBUs;
    const assignedBrands = isSuperRole ? (filter.assignedBrands || sessionAssignedBrands) : sessionAssignedBrands;

    // Cache key for reporting metrics
    const cacheKey = serverCache.generateKey('reports_metrics_v2', {
      userRole,
      accountName,
      domainAccount,
      accountGroup,
      assignedBUs,
      assignedBrands,
      preset: dateRange?.preset,
      startDate: dateRange?.startDate,
      endDate: dateRange?.endDate,
    });

    const cached = serverCache.get<ReportsSummaryMetrics>(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    // Role-based scoping conditions for Prisma / SQL
    const andConditions: any[] = [];
    if (userRole === 'ao') {
      const aoConditions = buildAOScopingConditions(accountName, domainAccount, sessionEmail);
      andConditions.push({ OR: aoConditions });
    } else if (userRole === 'bu' || userRole === 'bu_admin') {
      const buConditions = buildBUScopingConditions(assignedBUs && assignedBUs.length > 0 ? assignedBUs : accountGroup);
      andConditions.push({ OR: buConditions });
    } else if (userRole === 'pm') {
      const pmConditions = buildPMScopingConditions(assignedBrands && assignedBrands.length > 0 ? assignedBrands : []);
      if (pmConditions.length > 0) {
        andConditions.push({ OR: pmConditions });
      }
    }

    // Date range bounds (falls back to dtCreated if dtRegistered is null)
    const { start: dateStart, end: dateEnd } = getDateBounds(dateRange?.preset, dateRange?.startDate, dateRange?.endDate);
    if (dateStart || dateEnd) {
      andConditions.push({
        OR: [
          {
            dtRegistered: {
              not: null,
              ...(dateStart ? { gte: dateStart } : {}),
              ...(dateEnd ? { lte: dateEnd } : {}),
            },
          },
          {
            dtRegistered: null,
            dtCreated: {
              ...(dateStart ? { gte: dateStart } : {}),
              ...(dateEnd ? { lte: dateEnd } : {}),
            },
          },
        ],
      });
    }

    // Strictly scope all report metrics to the 7 official BUs
    andConditions.push({ BU: { in: [...OFFICIAL_REGISTERED_BUS] } });

    const whereClause = andConditions.length > 0 ? { AND: andConditions } : {};

    // 1. Overall KPIs from DealReportView
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Fast parallel aggregation
    const [
      totalRegistered,
      totalExpired,
      totalRenewed,
      expiredThisMonth,
      lostCount,
      pipelineValueAgg,
      recentDeals,
      riskDeals,
      brandGroupRaw,
      buGroupRaw,
    ] = await Promise.all([
      // Total Registered (dealStatus = '1')
      prisma.dealReportView.count({
        where: {
          ...whereClause,
          dealStatus: '1',
        },
      }),
      // Total Expired
      prisma.dealReportView.count({
        where: {
          ...whereClause,
          IsExpired: 1,
        },
      }),
      // Total Renewed
      prisma.dealReportView.count({
        where: {
          ...whereClause,
          IsRenewed: 1,
        },
      }),
      // Expired This Month
      prisma.dealReportView.count({
        where: {
          ...whereClause,
          expDt: {
            gte: startOfMonth,
            lte: endOfMonth,
            lt: now,
          },
        },
      }),
      // Lost Deals Count
      prisma.dealReportView.count({
        where: {
          ...whereClause,
          OR: [{ IsLost: 1 }, { dealStatus: '7' }],
        },
      }),
      // Grand Total Pipeline Value
      prisma.dealReportView.aggregate({
        where: whereClause,
        _sum: {
          TotalAmount: true,
        },
      }),
      // Recent Deals (Top 6 latest)
      prisma.dealReportView.findMany({
        where: whereClause,
        take: 6,
        orderBy: { dtCreated: 'desc' },
      }),
      // Risk deals within 30 days
      prisma.dealReportView.findMany({
        where: {
          ...whereClause,
          DaysRemaining: { gte: 0, lte: 30 },
          IsExpired: 0,
          dealStatus: { notIn: ['2', '7', '8'] },
        },
        select: { DaysRemaining: true },
      }),
      // Brand Grouping with Status
      prisma.dealReportView.groupBy({
        by: ['brand', 'assignedPM', 'dealStatus', 'IsExpired', 'IsLost'],
        where: whereClause,
        _count: {
          dealID: true,
        },
        _sum: {
          TotalAmount: true,
        },
      }),
      // BU Grouping with Status
      prisma.dealReportView.groupBy({
        by: ['BU', 'dealStatus', 'IsExpired', 'IsLost'],
        where: whereClause,
        _count: {
          dealID: true,
        },
        _sum: {
          TotalAmount: true,
        },
      }),
    ]);

    // Calculate Expiry Risk Breakdown
    let criticalCount = 0; // <= 3 days
    let urgentCount = 0;   // <= 7 days
    let warningCount = 0;  // <= 15 days
    let noticeCount = 0;   // <= 30 days
    riskDeals.forEach((d) => {
      const days = d.DaysRemaining ?? -1;
      if (days >= 0 && days <= 3) criticalCount++;
      else if (days > 3 && days <= 7) urgentCount++;
      else if (days > 7 && days <= 15) warningCount++;
      else if (days > 15 && days <= 30) noticeCount++;
    });

    const expiryRiskCounts: ExpiryRiskCounts = {
      criticalCount,
      urgentCount,
      warningCount,
      noticeCount,
      totalAtRisk: criticalCount + urgentCount + warningCount + noticeCount,
    };

    // Roll up Brand Metrics
    const brandMap: Record<string, ReportBrandMetric> = {};
    for (const b of brandGroupRaw) {
      const rawBrand = (b.brand || '').trim();
      if (!rawBrand) continue;

      if (!brandMap[rawBrand]) {
        brandMap[rawBrand] = {
          brand: rawBrand,
          assignedPM: b.assignedPM ? b.assignedPM.trim() : null,
          dealCount: 0,
          totalValue: 0,
          activeCount: 0,
          approvedCount: 0,
          waitingCount: 0,
          lostCount: 0,
        };
      }

      const count = b._count?.dealID || 0;
      const value = Number(b._sum?.TotalAmount || 0);
      const status = String(b.dealStatus ?? '');
      const isLost = b.IsLost === 1 || status === '2' || status === '7' || status === '8';
      const isApproved = status === '1' || status === '6';
      const isWaiting = status === '3' || status === '4';
      const isExpired = b.IsExpired === 1;
      const isActive = (isApproved || isWaiting) && !isExpired && !isLost;

      brandMap[rawBrand].dealCount += count;
      brandMap[rawBrand].totalValue += value;
      if (isActive) brandMap[rawBrand].activeCount += count;
      if (isApproved) brandMap[rawBrand].approvedCount += count;
      if (isWaiting) brandMap[rawBrand].waitingCount += count;
      if (isLost) brandMap[rawBrand].lostCount += count;
    }

    const brandMetrics = Object.values(brandMap).sort((a, b) => b.totalValue - a.totalValue || b.dealCount - a.dealCount);

    // Roll up BU Metrics
    const buMap: Record<string, ReportBUMetric> = {};
    // Ensure all official BUs are initialized
    OFFICIAL_REGISTERED_BUS.forEach((bu) => {
      buMap[bu] = {
        bu,
        normalizedBU: normalizeBU(bu),
        isOfficial: true,
        dealCount: 0,
        totalValue: 0,
        activeCount: 0,
        approvedCount: 0,
        waitingCount: 0,
        lostCount: 0,
      };
    });

    for (const b of buGroupRaw) {
      const rawBU = (b.BU || '').trim();
      if (!rawBU) continue;

      const normBU = normalizeBU(rawBU);
      if (!buMap[normBU]) {
        buMap[normBU] = {
          bu: rawBU,
          normalizedBU: normBU,
          isOfficial: isOfficialBU(rawBU),
          dealCount: 0,
          totalValue: 0,
          activeCount: 0,
          approvedCount: 0,
          waitingCount: 0,
          lostCount: 0,
        };
      }

      const count = b._count?.dealID || 0;
      const value = Number(b._sum?.TotalAmount || 0);
      const status = String(b.dealStatus ?? '');
      const isLost = b.IsLost === 1 || status === '2' || status === '7' || status === '8';
      const isApproved = status === '1' || status === '6';
      const isWaiting = status === '3' || status === '4';
      const isExpired = b.IsExpired === 1;
      const isActive = (isApproved || isWaiting) && !isExpired && !isLost;

      buMap[normBU].dealCount += count;
      buMap[normBU].totalValue += value;
      if (isActive) buMap[normBU].activeCount += count;
      if (isApproved) buMap[normBU].approvedCount += count;
      if (isWaiting) buMap[normBU].waitingCount += count;
      if (isLost) buMap[normBU].lostCount += count;
    }

    const buMetrics = Object.values(buMap).sort((a, b) => b.dealCount - a.dealCount || b.totalValue - a.totalValue);

    const summary: ReportsSummaryMetrics = {
      totalRegistered,
      totalExpired,
      totalRenewed,
      expiredThisMonth,
      grandTotalPipelineValue: Number(pipelineValueAgg._sum?.TotalAmount || 0),
      lostCount,
      expiryRiskCounts,
      recentDeals: recentDeals.map((d) => ({
        ...d,
        TotalAmount: Number(d.TotalAmount || 0),
      })),
      brandMetrics,
      buMetrics,
    };

    // Cache result for 5 minutes
    serverCache.set(cacheKey, summary, 1000 * 60 * 5);

    return {
      success: true,
      data: summary,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Action: getReportsMetrics] Error:', msg);
    return {
      success: false,
      error: msg,
    };
  }
}

/**
 * On-demand paginated drilldown deals query from DealReportView
 */
export async function getReportDrilldownDeals(params: {
  type: 'registered' | 'expired' | 'expiredThisMonth' | 'renewed' | 'lost' | 'expiring' | 'brand' | 'bu' | 'all';
  value?: string;
  urgency?: 'ALL' | 'CRITICAL' | 'URGENT' | 'WARNING' | 'NOTICE';
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  preset?: string;
  startDate?: string;
  endDate?: string;
  filter?: ScopedDealsFilter;
}): Promise<{
  success: boolean;
  data?: any[];
  totalCount?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  error?: string;
}> {
  try {
    let session: any = null;
    try {
      session = await getServerSession(authOptions);
    } catch {
      // In standalone scripts
    }

    const sessionRole = (session?.user as any)?.role as string | undefined;
    const sessionAccountName = ((session?.user as any)?.AccountName || session?.user?.name || '').trim();
    const sessionDomainAccount = ((session?.user as any)?.DomainAccount || '').trim();
    const sessionEmail = ((session?.user as any)?.Email || session?.user?.email || '').trim();
    const sessionAccountGroup = ((session?.user as any)?.AccountGroup || '').trim();
    const sessionAssignedBUs = (session?.user as any)?.assignedBUs as string[] | undefined;
    const sessionAssignedBrands = (session?.user as any)?.assignedBrands as string[] | undefined;

    const isSuperRole = sessionRole === 'ITadmin' || sessionRole === 'admin' || sessionRole === 'aa';
    const userRole = isSuperRole ? (params.filter?.userRole || sessionRole || 'admin') : (sessionRole || 'ao');
    const accountName = isSuperRole ? (params.filter?.accountName || sessionAccountName) : sessionAccountName;
    const domainAccount = isSuperRole ? (params.filter?.domainAccount || sessionDomainAccount) : sessionDomainAccount;
    const accountGroup = isSuperRole ? (params.filter?.accountGroup || sessionAccountGroup) : sessionAccountGroup;
    const assignedBUs = isSuperRole ? (params.filter?.assignedBUs || sessionAssignedBUs) : sessionAssignedBUs;
    const assignedBrands = isSuperRole ? (params.filter?.assignedBrands || sessionAssignedBrands) : sessionAssignedBrands;

    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 50));
    const andConditions: any[] = [];

    // Role-based scoping conditions
    if (userRole === 'ao') {
      const aoConditions = buildAOScopingConditions(accountName, domainAccount, sessionEmail);
      andConditions.push({ OR: aoConditions });
    } else if (userRole === 'bu' || userRole === 'bu_admin') {
      const buConditions = buildBUScopingConditions(assignedBUs && assignedBUs.length > 0 ? assignedBUs : accountGroup);
      andConditions.push({ OR: buConditions });
    } else if (userRole === 'pm') {
      const pmConditions = buildPMScopingConditions(assignedBrands && assignedBrands.length > 0 ? assignedBrands : []);
      if (pmConditions.length > 0) {
        andConditions.push({ OR: pmConditions });
      }
    }

    if (params.type === 'registered') {
      andConditions.push({ dealStatus: '1' });
    } else if (params.type === 'expired') {
      andConditions.push({ IsExpired: 1 });
    } else if (params.type === 'expiredThisMonth') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      andConditions.push({
        IsExpired: 1,
        expDt: { gte: startOfMonth, lte: endOfMonth },
      });
    } else if (params.type === 'renewed') {
      andConditions.push({ IsRenewed: 1 });
    } else if (params.type === 'lost') {
      andConditions.push({ OR: [{ IsLost: 1 }, { dealStatus: '7' }] });
    } else if (params.type === 'expiring') {
      andConditions.push({
        dealStatus: { notIn: ['2', '7', '8'] },
        DaysRemaining: { gte: 0, lte: 30 },
      });
      if (params.urgency === 'CRITICAL') {
        andConditions.push({ DaysRemaining: { lte: 3 } });
      } else if (params.urgency === 'URGENT') {
        andConditions.push({ DaysRemaining: { lte: 7 } });
      } else if (params.urgency === 'WARNING') {
        andConditions.push({ DaysRemaining: { lte: 15 } });
      }
    } else if (params.type === 'brand' && params.value) {
      andConditions.push({ brand: params.value });
      andConditions.push({ BU: { in: [...OFFICIAL_REGISTERED_BUS] } });
    } else if (params.type === 'bu' && params.value) {
      andConditions.push({ BU: params.value });
    } else {
      andConditions.push({ BU: { in: [...OFFICIAL_REGISTERED_BUS] } });
    }

    // Date range bounds
    const { start: dateStart, end: dateEnd } = getDateBounds(params.preset, params.startDate, params.endDate);
    if (dateStart || dateEnd) {
      andConditions.push({
        OR: [
          {
            dtRegistered: {
              not: null,
              ...(dateStart ? { gte: dateStart } : {}),
              ...(dateEnd ? { lte: dateEnd } : {}),
            },
          },
          {
            dtRegistered: null,
            dtCreated: {
              ...(dateStart ? { gte: dateStart } : {}),
              ...(dateEnd ? { lte: dateEnd } : {}),
            },
          },
        ],
      });
    }

    if (params.searchQuery) {
      const q = params.searchQuery.trim();
      andConditions.push({
        OR: [
          { dealRegID: { contains: q } },
          { ProjectName: { contains: q } },
          { custName: { contains: q } },
          { AssignedAO: { contains: q } },
          { brand: { contains: q } },
        ],
      });
    }

    const whereClause = andConditions.length > 0 ? { AND: andConditions } : {};

    const [totalCount, deals] = await Promise.all([
      prisma.dealReportView.count({ where: whereClause }),
      prisma.dealReportView.findMany({
        where: whereClause,
        take: pageSize,
        skip: (page - 1) * pageSize,
        orderBy: { dtCreated: 'desc' },
      }),
    ]);

    return {
      success: true,
      data: deals.map((d) => ({
        ...d,
        TotalAmount: Number(d.TotalAmount || 0),
      })),
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Action: getReportDrilldownDeals] Error:', msg);
    return {
      success: false,
      error: msg,
    };
  }
}


