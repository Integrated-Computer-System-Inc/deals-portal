'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@my-app/database';
import {
  CreateDealPayload,
  UpdateDealPayload,
  SaveDealRenewalPayload,
  SaveLostDealPayload,
  UpdateWTNPayload,
  ScopedDealsFilter,
  DealHeaderRecord,
  DealRenewalRecord,
  CurrencyTotals,
} from '@my-app/types';
import { revalidatePath } from 'next/cache';
import { resolveDealEmailRecipients, processNotifications } from '@/lib/notifications';
import {
  generateCreateDealEmail,
  generateUpdateDealEmail,
  generateLostDealEmail,
  generateRenewDealEmail,
} from '@/lib/email-templates';
import { rankCustomersByRelevance, normalizeBusinessUnit } from '@/lib/searchUtils';
import { serverCache } from '@/lib/serverCache';
import { buildAOScopingConditions, buildBUScopingConditions, buildPMScopingConditions, isDealAccessibleByUser } from '@/lib/roles';
import { OFFICIAL_REGISTERED_BUS } from '@/lib/buUtils';
import { normalizeBrandName, getBrandVariations } from '@/lib/brandUtils';

function parseSafeNumber(val: any, fallback = 0): number {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  const cleaned = String(val).replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? fallback : num;
}

function parseSafeInt(val: any, fallback = 0): number {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : Math.floor(val);
  const cleaned = String(val).replace(/,/g, '').trim();
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? fallback : num;
}

export async function invalidateServerDealsCache() {
  serverCache.invalidateTags(['deals', 'dashboard']);
}

/**
 * Cached map of AO identifiers (AccountName, DomainAccount, Email, NickName) to their GAvatar URL.
 */
async function getAOAvatarMap(): Promise<Map<string, string>> {
  const cacheKey = 'cdb_ao_avatars_map';
  const cached = serverCache.get<Record<string, string>>(cacheKey);
  if (cached) {
    return new Map(Object.entries(cached));
  }

  try {
    const accounts = await prisma.cdbAccounts.findMany({
      where: {
        GAvatar: { not: null },
      },
      select: {
        AccountName: true,
        DomainAccount: true,
        Email: true,
        NickName: true,
        GAvatar: true,
      },
    });

    const mapObj: Record<string, string> = {};
    for (const acc of accounts) {
      if (!acc.GAvatar) continue;
      const avatar = acc.GAvatar.trim();
      if (!avatar) continue;

      if (acc.AccountName) {
        mapObj[acc.AccountName.trim().toLowerCase()] = avatar;
      }
      if (acc.DomainAccount) {
        mapObj[acc.DomainAccount.trim().toLowerCase()] = avatar;
      }
      if (acc.Email) {
        mapObj[acc.Email.trim().toLowerCase()] = avatar;
        const localPart = acc.Email.split('@')[0];
        if (localPart) mapObj[localPart.toLowerCase()] = avatar;
      }
      if (acc.NickName) {
        mapObj[acc.NickName.trim().toLowerCase()] = avatar;
      }
    }

    serverCache.set(cacheKey, mapObj, 1000 * 60 * 15); // 15 mins
    return new Map(Object.entries(mapObj));
  } catch (err) {
    console.warn('[getAOAvatarMap] Error querying AO avatars:', err);
    return new Map();
  }
}

function resolveAOAvatar(aoString: string | null | undefined, avatarMap: Map<string, string>): string | null {
  if (!aoString) return null;
  const cleaned = aoString.trim().toLowerCase();
  if (!cleaned) return null;

  const direct = avatarMap.get(cleaned);
  if (direct) return direct;

  for (const [key, avatar] of avatarMap.entries()) {
    if (key && (cleaned.includes(key) || key.includes(cleaned))) {
      return avatar;
    }
  }
  return null;
}

/**
 * 1. getScopedDeals / getDealsList (Server Action / Query)
 * Retrieves filtered active deals based on user role (AO, PM, BU Head, or Admin) with database pushdown.
 */
export async function getScopedDeals(
  filter: ScopedDealsFilter,
  _token?: string
): Promise<{
  success: boolean;
  data?: DealHeaderRecord[];
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
      // In standalone scripts or background jobs outside request context
    }
    const sessionRole = (session?.user as any)?.role as string | undefined;
    const sessionAccountName = ((session?.user as any)?.AccountName || session?.user?.name || '').trim();
    const sessionDomainAccount = ((session?.user as any)?.DomainAccount || '').trim();
    const sessionEmail = ((session?.user as any)?.Email || session?.user?.email || '').trim();
    const sessionAccountGroup = ((session?.user as any)?.AccountGroup || '').trim();
    const sessionAssignedBUs = (session?.user as any)?.assignedBUs as string[] | undefined;
    const sessionAssignedBrands = (session?.user as any)?.assignedBrands as string[] | undefined;

    // Security: Only allow client role override if session is ITadmin/admin/aa, otherwise enforce session claims strictly
    const isSuperRole = sessionRole === 'ITadmin' || sessionRole === 'admin' || sessionRole === 'aa';
    const userRole = isSuperRole ? (filter.userRole || sessionRole || 'admin') : (sessionRole || 'ao');
    const accountName = isSuperRole ? (filter.accountName || sessionAccountName) : sessionAccountName;
    const domainAccount = isSuperRole ? (filter.domainAccount || sessionDomainAccount) : sessionDomainAccount;
    const accountGroup = isSuperRole ? (filter.accountGroup || sessionAccountGroup) : sessionAccountGroup;
    const assignedBUs = isSuperRole ? (filter.assignedBUs || sessionAssignedBUs) : sessionAssignedBUs;
    const assignedBrands = isSuperRole ? (filter.assignedBrands || sessionAssignedBrands) : sessionAssignedBrands;

    const page = Math.max(1, filter.page || 1);
    const pageSize = filter.pageSize !== undefined ? filter.pageSize : 0;
    const searchQuery = (filter.searchQuery || '').trim();
    const statusFilter = filter.statusFilter;
    const buFilter = filter.buFilter;
    const aoFilter = filter.aoFilter;
    const brandFilter = filter.brandFilter;
    const currencyFilter = filter.currencyFilter;
    const expiryFilter = filter.expiryFilter;
    const startDate = filter.startDate;
    const endDate = filter.endDate;
    const sortBy = filter.sortBy;
    const sortOrder = filter.sortOrder || 'desc';

    const cacheKey = serverCache.generateKey('scoped_deals_v2', {
      userRole,
      accountName,
      domainAccount,
      accountGroup,
      assignedBUs,
      assignedBrands,
      page,
      pageSize,
      searchQuery,
      statusFilter,
      buFilter,
      aoFilter,
      brandFilter,
      currencyFilter,
      expiryFilter,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    });

    const cached = serverCache.get<{
      success: boolean;
      data: DealHeaderRecord[];
      totalCount: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(cacheKey);

    if (cached) {
      return cached;
    }

    const andConditions: any[] = [];

    // Role-based scoping (handles case insensitivity, whitespace, createdBy, BU and Brand formatting variations)
    if (userRole === 'ao') {
      const aoConditions = buildAOScopingConditions(accountName, domainAccount, sessionEmail);
      andConditions.push({ OR: aoConditions });
    } else if (userRole === 'bu' || userRole === 'bu_admin') {
      const buConditions = buildBUScopingConditions(assignedBUs && assignedBUs.length > 0 ? assignedBUs : accountGroup);
      andConditions.push({ OR: buConditions });
    } else if (userRole === 'pm') {
      const pmConditions = buildPMScopingConditions(assignedBrands);
      andConditions.push(...pmConditions);
    }

    // Status filter (single or multi-select array)
    if (statusFilter) {
      if (Array.isArray(statusFilter) && statusFilter.length > 0 && !statusFilter.includes('ALL')) {
        andConditions.push({ dealStatus: { in: statusFilter.map(String) } });
      } else if (typeof statusFilter === 'string' && statusFilter !== 'ALL' && statusFilter !== '') {
        andConditions.push({ dealStatus: String(statusFilter) });
      }
    }

    // BU filter (single or multi-select array)
    if (buFilter) {
      if (Array.isArray(buFilter) && buFilter.length > 0 && !buFilter.includes('ALL')) {
        andConditions.push({ BU: { in: buFilter.map(String) } });
      } else if (typeof buFilter === 'string' && buFilter !== 'ALL' && buFilter !== '') {
        andConditions.push({ BU: String(buFilter) });
      }
    }

    // AO filter (single or multi-select array)
    if (aoFilter) {
      if (Array.isArray(aoFilter) && aoFilter.length > 0) {
        andConditions.push({
          OR: aoFilter.map((ao) => ({ AssignedAO: { contains: ao.trim() } })),
        });
      } else if (typeof aoFilter === 'string' && aoFilter !== 'ALL' && aoFilter !== '') {
        andConditions.push({ AssignedAO: { contains: aoFilter.trim() } });
      }
    }

    // Brand filter (single or multi-select array, expanded to match all DB variants)
    if (brandFilter) {
      const brandsArray = Array.isArray(brandFilter) ? brandFilter : [brandFilter];
      const activeBrands = brandsArray.filter((b) => b && b !== 'ALL');
      if (activeBrands.length > 0) {
        const allVariations = Array.from(
          new Set(activeBrands.flatMap((b) => getBrandVariations(String(b))))
        );
        andConditions.push({
          OR: [
            { brand: { in: allVariations } },
            ...activeBrands.map((b) => ({ brand: { contains: String(b).trim() } })),
          ],
        });
      }
    }

    // Currency filter (e.g. PHP, USD, multi-select)
    if (currencyFilter) {
      const currArray = (Array.isArray(currencyFilter) ? currencyFilter : [currencyFilter])
        .map((c) => String(c).trim().toUpperCase())
        .filter((c) => c && c !== 'ALL');
      if (currArray.length > 0) {
        andConditions.push({
          DealItems: {
            some: {
              currency: { in: currArray },
            },
          },
        });
      }
    }

    // Date range filter
    if (startDate && endDate) {
      const sDate = new Date(startDate);
      const eDate = new Date(endDate);
      eDate.setHours(23, 59, 59, 999);
      andConditions.push({
        OR: [
          { dtRegistered: { gte: sDate, lte: eDate } },
          { AND: [{ dtRegistered: null }, { dtCreated: { gte: sDate, lte: eDate } }] },
        ],
      });
    }

    // Expiry bucket filters (multi-select)
    if (expiryFilter) {
      const expiryArray = Array.isArray(expiryFilter) ? expiryFilter : [expiryFilter];
      if (expiryArray.length > 0 && !expiryArray.includes('ALL')) {
        const now = new Date();
        const expConditions: any[] = [];

        expiryArray.forEach((f) => {
          if (f === 'EXPIRED') {
            expConditions.push({ expDt: { lt: now } });
          } else if (f === 'CRITICAL_3') {
            expConditions.push({
              expDt: { gte: now, lte: new Date(now.getTime() + 3 * 86400000) },
            });
          } else if (f === 'URGENT_7') {
            expConditions.push({
              expDt: { gte: now, lte: new Date(now.getTime() + 7 * 86400000) },
            });
          } else if (f === 'WARNING_15') {
            expConditions.push({
              expDt: { gte: now, lte: new Date(now.getTime() + 15 * 86400000) },
            });
          } else if (f === 'NOTICE_30') {
            expConditions.push({
              expDt: { gte: now, lte: new Date(now.getTime() + 30 * 86400000) },
            });
          } else if (f === 'ACTIVE') {
            expConditions.push({
              expDt: { gt: new Date(now.getTime() + 30 * 86400000) },
            });
          }
        });

        if (expConditions.length > 0) {
          andConditions.push({ OR: expConditions });
        }
      }
    }

    // Search query pushdown (checks dealRegID, ProjectName, custName, AssignedAO, brand)
    if (searchQuery) {
      andConditions.push({
        OR: [
          { dealRegID: { contains: searchQuery } },
          { ProjectName: { contains: searchQuery } },
          { custName: { contains: searchQuery } },
          { AssignedAO: { contains: searchQuery } },
          { brand: { contains: searchQuery } },
        ],
      });
    }

    const whereClause = andConditions.length > 0 ? { AND: andConditions } : {};

    // 1. Database-level count for exact pagination
    const totalCount = await prisma.dealHeader.count({
      where: whereClause,
    });

    // 2. Determine SQL Server sorting
    let orderByClause: any = { dtCreated: 'desc' };
    if (sortBy) {
      const order = sortOrder === 'asc' ? 'asc' : 'desc';
      switch (sortBy) {
        case 'dtRegistered':
          orderByClause = { dtRegistered: order };
          break;
        case 'expDt':
          orderByClause = { expDt: order };
          break;
        case 'dealRegID':
          orderByClause = { dealRegID: order };
          break;
        case 'custName':
          orderByClause = { custName: order };
          break;
        case 'projectName':
        case 'ProjectName':
          orderByClause = { ProjectName: order };
          break;
        case 'brand':
          orderByClause = { brand: order };
          break;
        case 'AssignedAO':
        case 'assignedAO':
          orderByClause = { AssignedAO: order };
          break;
        case 'BU':
        case 'bu':
          orderByClause = { BU: order };
          break;
        default:
          orderByClause = { dtCreated: order };
          break;
      }
    }

    // 3. Database-level limit & offset with lean relation loading
    const rawDeals = await prisma.dealHeader.findMany({
      where: whereClause,
      select: {
        dealID: true,
        dtRegistered: true,
        expiration: true,
        expDt: true,
        brand: true,
        customerID: true,
        dealRegID: true,
        ProjectName: true,
        AssignedAO: true,
        BU: true,
        dealStatus: true,
        createdBy: true,
        custName: true,
        remarks: true,
        dtCreated: true,
        dtValidTo: true,
        DealItems: {
          select: {
            dealItemID: true,
            dealID: true,
            itemDesc: true,
            qty: true,
            currency: true,
            totalAmt: true,
          },
        },
        DealWTN: {
          select: {
            id: true,
            dealID: true,
            whenToNotify: true,
          },
        },
        DealResponse: {
          select: {
            id: true,
            dealID: true,
            responseDays: true,
          },
        },
        DealLost: {
          select: {
            dealID: true,
            competitorVendor: true,
            competitorBrand: true,
            icsOffer: true,
            competitorOffer: true,
            reason: true,
            otherInformation: true,
          },
        },
        Renewals: {
          select: {
            renewalID: true,
            dealID: true,
            dtRenewal: true,
            rexpDt: true,
            remarks: true,
            dtCreated: true,
          },
          orderBy: { dtCreated: 'desc' },
          take: 1,
        },
      },
      orderBy: orderByClause,
      ...(pageSize > 0
        ? {
            take: pageSize,
            skip: (page - 1) * pageSize,
          }
        : {}),
    });

    const aoAvatarMap = await getAOAvatarMap();

    const formattedDeals: DealHeaderRecord[] = rawDeals.map((deal: any) => {
      const totalsByCurrency: CurrencyTotals = {};

      deal.DealItems.forEach((item: any) => {
        const curr = item.currency || 'USD';
        const amt = parseSafeNumber(item.totalAmt);
        totalsByCurrency[curr] = (totalsByCurrency[curr] || 0) + amt;
      });

      const sortedRenewals: DealRenewalRecord[] = (deal.Renewals || []).map((r: any) => ({
        renewalID: r.renewalID,
        dealID: r.dealID,
        dtRenewal: r.dtRenewal,
        rexpDt: r.rexpDt,
        remarks: r.remarks,
        dtCreated: r.dtCreated,
        dtUpdated: null,
      }));

      return {
        dealID: deal.dealID,
        dtRegistered: deal.dtRegistered || new Date(),
        expiration: deal.expiration || null,
        expDt: deal.expDt || new Date(),
        brand: normalizeBrandName(deal.brand),
        customerID: deal.customerID,
        dealRegID: deal.dealRegID || '',
        ProjectName: deal.ProjectName || '',
        AssignedAO: deal.AssignedAO || '',
        BU: deal.BU || '',
        dealStatus: deal.dealStatus || '1',
        createdBy: deal.createdBy || '',
        custName: deal.custName || '',
        remarks: deal.remarks || null,
        dtCreated: deal.dtCreated || new Date(),
        dtValidTo: deal.dtValidTo || null,
        items: deal.DealItems.map((i: any) => ({
          itemID: i.dealItemID,
          dealID: i.dealID || deal.dealID,
          itemDesc: i.itemDesc || '',
          qty: parseSafeInt(i.qty, 1),
          currency: i.currency || 'USD',
          totalAmt: parseSafeNumber(i.totalAmt),
        })),
        wtn: deal.DealWTN
          ? {
              wtnID: deal.DealWTN.id,
              dealID: deal.DealWTN.dealID || deal.dealID,
              whenToNotify: deal.DealWTN.whenToNotify || new Date(),
            }
          : null,
        response: deal.DealResponse
          ? {
              responseID: deal.DealResponse.id,
              dealID: deal.DealResponse.dealID || deal.dealID,
              responseDays: parseSafeInt(deal.DealResponse.responseDays, 0),
            }
          : null,
        lostInfo: deal.DealLost
          ? {
              lostID: deal.DealLost.dealID,
              dealID: deal.DealLost.dealID || deal.dealID,
              competitorVendor: deal.DealLost.competitorVendor || '',
              competitorBrand: deal.DealLost.competitorBrand || '',
              icsOffer: deal.DealLost.icsOffer || '',
              competitorOffer: deal.DealLost.competitorOffer || '',
              reason: deal.DealLost.reason || '',
              otherInformation: deal.DealLost.otherInformation || undefined,
            }
          : null,
        renewals: sortedRenewals,
        latestRenewal: sortedRenewals.length > 0 ? sortedRenewals[0] : null,
        aggregatedTotals: totalsByCurrency,
        aoAvatar: resolveAOAvatar(deal.AssignedAO, aoAvatarMap),
      };
    });

    const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1;

    const result = {
      success: true,
      data: formattedDeals,
      totalCount,
      page,
      pageSize,
      totalPages,
    };

    // Cache in server memory for 60s
    serverCache.set(cacheKey, result, 60_000, ['deals']);

    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Action: getScopedDeals] Error:', message);
    return { success: false, error: message };
  }
}

/**
 * 2. getDealById (Server Action / Query)
 * Fetches single DealHeader and matching DealItems array for the view/edit screen.
 */
export async function getDealById(
  dealID: number,
  _token?: string
): Promise<{ success: boolean; data?: DealHeaderRecord | null; error?: string }> {
  try {
    const id = Number(dealID);
    if (!id || isNaN(id)) return { success: true, data: null };

    const session = await getServerSession(authOptions);
    const sessionRole = (session?.user as any)?.role as string | undefined;
    const sessionAccountName = ((session?.user as any)?.AccountName || session?.user?.name || '').trim();
    const sessionDomainAccount = ((session?.user as any)?.DomainAccount || '').trim();
    const sessionEmail = ((session?.user as any)?.Email || session?.user?.email || '').trim();
    const sessionAssignedBUs = (session?.user as any)?.assignedBUs as string[] | undefined;
    const sessionAssignedBrands = (session?.user as any)?.assignedBrands as string[] | undefined;

    const rawDeal = await prisma.dealHeader.findUnique({
      where: { dealID: id },
      include: {
        DealItems: true,
        DealWTN: true,
        DealResponse: true,
        DealLost: true,
        Renewals: {
          orderBy: { dtCreated: 'desc' },
        },
      },
    });

    if (!rawDeal) {
      return { success: true, data: null };
    }

    // Role-based authorization check
    if (sessionRole) {
      const isAllowed = isDealAccessibleByUser(rawDeal, {
        role: sessionRole,
        accountName: sessionAccountName,
        domainAccount: sessionDomainAccount,
        email: sessionEmail,
        assignedBUs: sessionAssignedBUs,
        assignedBrands: sessionAssignedBrands,
      });

      if (!isAllowed) {
        return {
          success: false,
          error: 'Access Denied: You are not authorized to view this deal.',
        };
      }
    }

    const deal: any = rawDeal;
    const totalsByCurrency: CurrencyTotals = {};
    deal.DealItems.forEach((item: any) => {
      const curr = item.currency || 'USD';
      const amt = parseSafeNumber(item.totalAmt);
      totalsByCurrency[curr] = (totalsByCurrency[curr] || 0) + amt;
    });

    const sortedRenewals: DealRenewalRecord[] = (deal.Renewals || [])
      .map((r: any) => ({
        renewalID: r.renewalID,
        dealID: r.dealID,
        dtRenewal: r.dtRenewal,
        rexpDt: r.rexpDt,
        remarks: r.remarks,
        dtCreated: r.dtCreated,
        dtUpdated: r.dtUpdated || null,
      }))
      .sort((a: any, b: any) => {
        const timeB = new Date(b.dtRenewal || b.dtCreated || 0).getTime();
        const timeA = new Date(a.dtRenewal || a.dtCreated || 0).getTime();
        return timeB - timeA;
      });

    const formatted: DealHeaderRecord = {
      dealID: deal.dealID,
      dtRegistered: deal.dtRegistered || new Date(),
      expiration: deal.expiration || null,
      expDt: deal.expDt || new Date(),
      brand: normalizeBrandName(deal.brand),
      customerID: deal.customerID,
      dealRegID: deal.dealRegID || '',
      ProjectName: deal.ProjectName || '',
      AssignedAO: deal.AssignedAO || '',
      BU: deal.BU || '',
      dealStatus: deal.dealStatus || '1',
      createdBy: deal.createdBy || '',
      custName: deal.custName || '',
      remarks: deal.remarks || null,
      dtCreated: deal.dtCreated || new Date(),
      dtValidTo: deal.dtValidTo || null,
      items: deal.DealItems.map((i: any) => ({
        itemID: i.dealItemID,
        dealID: i.dealID || deal.dealID,
        itemDesc: i.itemDesc || '',
        qty: parseSafeInt(i.qty, 1),
        currency: i.currency || 'USD',
        totalAmt: parseSafeNumber(i.totalAmt),
      })),
      wtn: deal.DealWTN
        ? {
            wtnID: deal.DealWTN.id,
            dealID: deal.DealWTN.dealID || deal.dealID,
            whenToNotify: deal.DealWTN.whenToNotify || new Date(),
          }
        : null,
      response: deal.DealResponse
        ? {
            responseID: deal.DealResponse.id,
            dealID: deal.DealResponse.dealID || deal.dealID,
            responseDays: parseSafeInt(deal.DealResponse.responseDays, 0),
          }
        : null,
      lostInfo: deal.DealLost
        ? {
            lostID: deal.DealLost.dealID,
            dealID: deal.DealLost.dealID,
            competitorVendor: deal.DealLost.competitorVendor || '',
            competitorBrand: deal.DealLost.competitorBrand || '',
            icsOffer: deal.DealLost.icsOffer || '',
            competitorOffer: deal.DealLost.competitorOffer || '',
            reason: deal.DealLost.reason || '',
            otherInformation: deal.DealLost.otherInformation || undefined,
          }
        : null,
      renewals: sortedRenewals,
      latestRenewal: sortedRenewals.length > 0 ? sortedRenewals[0] : null,
      aggregatedTotals: totalsByCurrency,
      aoAvatar: resolveAOAvatar(deal.AssignedAO, await getAOAvatarMap()),
    };

    const cacheKey = `deal_detail:${id}`;
    serverCache.set(cacheKey, formatted, 300_000, ['deals']);

    return { success: true, data: formatted };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Action: getDealById] Error:', message);
    return { success: false, error: message };
  }
}

/**
 * 3. createDeal (Server Action)
 * Atomically creates new deal records across DealHeader, DealItems, dealWTN, and deals_reg_notification.
 */
export async function createDeal(
  payload: CreateDealPayload,
  createdByParam?: string,
  _token?: string
): Promise<{ success: boolean; dealID?: number; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role as string | undefined;
    if (userRole === 'ao' || userRole === 'bu' || userRole === 'bu_admin') {
      return {
        success: false,
        error: 'Access Denied: Account Officers and BU Heads have view-only access. Deal registrations are managed by Administrators.',
      };
    }
    const domainAccount = (session?.user as any)?.DomainAccount || createdByParam || 'CORP\\DEMOUSER';
    const userName = (session?.user as any)?.AccountName || 'Portal User';

    const expDate = new Date(payload.expDt);
    const regDate = new Date(payload.dtRegistered);
    const now = new Date();

    const dealRegID = payload.dealRegID;

    // dealWTN Calculation: Check if now() > (dtExpDt - 10 days). If true, set to now(); else set to (dtExpDt - 10 days)
    const tenDaysBeforeExp = new Date(expDate);
    tenDaysBeforeExp.setDate(tenDaysBeforeExp.getDate() - 10);
    const whenToNotify = now > tenDaysBeforeExp ? now : tenDaysBeforeExp;

    const customerIDVal = typeof payload.customerID === 'string'
      ? (parseInt(payload.customerID, 10) || null)
      : (payload.customerID ?? null);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Calculate next dealID safely
      const maxDealResult = await tx.$queryRawUnsafe<any[]>(
        `SELECT ISNULL(MAX(dealID), 0) AS maxId FROM [dbo].[DealHeader]`
      );
      const nextDealID = Number(maxDealResult?.[0]?.maxId || 0) + 1;

      const normalizedBrand = normalizeBrandName(payload.brand);

      // 1. Create DealHeader
      await tx.$executeRawUnsafe(
        `INSERT INTO [dbo].[DealHeader] (
          [dealID], [dtRegistered], [expiration], [expDt], [brand], [customerID], [dealRegID],
          [ProjectName], [AssignedAO], [BU], [dealStatus], [createdBy], [custName], [remarks],
          [dtCreated], [dtValidTo]
        ) VALUES (
          @P1, @P2, @P3, @P4, @P5, @P6, @P7, @P8, @P9, @P10, @P11, @P12, @P13, @P14, @P15, @P16
        )`,
        nextDealID,
        regDate,
        String(payload.expDt),
        expDate,
        normalizedBrand,
        customerIDVal,
        dealRegID,
        payload.ProjectName || payload.projectName,
        payload.AssignedAO || payload.assignedAO,
        payload.BU || payload.bu,
        String(payload.dealStatus),
        domainAccount,
        payload.custName,
        payload.remarks || null,
        now,
        expDate
      );

      // 2. Loop through each line item in the form array -> DealItems
      let totalAmount = 0;
      if (payload.items && payload.items.length > 0) {
        const maxItemResult = await tx.$queryRawUnsafe<any[]>(
          `SELECT ISNULL(MAX(dealItemID), 0) AS maxId FROM [dbo].[DealItems]`
        );
        let currentItemId = Number(maxItemResult?.[0]?.maxId || 0);

        for (const item of payload.items) {
          currentItemId++;
          totalAmount += Number(item.totalAmt || 0);
          await tx.$executeRawUnsafe(
            `INSERT INTO [dbo].[DealItems] ([dealItemID], [dealID], [itemDesc], [qty], [currency], [totalAmt])
             VALUES (@P1, @P2, @P3, @P4, @P5, @P6)`,
            currentItemId,
            nextDealID,
            item.itemDesc,
            String(item.qty),
            item.currency,
            String(item.totalAmt)
          );
        }
      }

      // 3. Create dealWTN
      const maxWtnResult = await tx.$queryRawUnsafe<any[]>(
        `SELECT ISNULL(MAX(id), 0) AS maxId FROM [dbo].[dealWTN]`
      );
      const nextWtnId = Number(maxWtnResult?.[0]?.maxId || 0) + 1;

      await tx.$executeRawUnsafe(
        `INSERT INTO [dbo].[dealWTN] ([id], [dealID], [whenToNotify])
         VALUES (@P1, @P2, @P3)`,
        nextWtnId,
        nextDealID,
        whenToNotify
      );

      // 4. Target Table: deals_reg_notification (Skip if BU == 'BU6')
      const buVal = payload.BU || payload.bu;
      const aoVal = payload.AssignedAO || payload.assignedAO;
      const brandVal = payload.brand || '';
      if (buVal !== 'BU6') {
        const recipients = await resolveDealEmailRecipients(aoVal, buVal, brandVal);
        const currencyVal = payload.items?.[0]?.currency || (payload as any).currency || 'PHP';
        const { subject, message } = generateCreateDealEmail({
          dealID: nextDealID,
          dealRegID: dealRegID,
          custName: payload.custName,
          projectName: payload.ProjectName || payload.projectName,
          brand: payload.brand,
          bu: buVal || '',
          assignedAO: aoVal || '',
          aoNickName: recipients.aoNickName,
          currency: currencyVal,
          regDate: regDate,
          expDate: expDate,
          totalAmount: totalAmount,
          creatorName: userName,
          creatorAccount: domainAccount,
        });

        const finalSubject = recipients.subjectPrefix ? `${recipients.subjectPrefix}${subject}` : subject;

        const maxNotifResult = await tx.$queryRawUnsafe<any[]>(
          `SELECT ISNULL(MAX(email_id), 0) AS maxId FROM [dbo].[deals_reg_notification]`
        );
        const nextNotifId = Number(maxNotifResult?.[0]?.maxId || 0) + 1;

        await tx.$executeRawUnsafe(
          `INSERT INTO [dbo].[deals_reg_notification] (
            [email_id], [creator], [subject], [message], [sendTo], [sendCC], [sendBCC], [dateCreated], [status]
          ) VALUES (@P1, @P2, @P3, @P4, @P5, @P6, @P7, @P8, @P9)`,
          nextNotifId,
          domainAccount,
          finalSubject,
          message,
          recipients.sendTo,
          recipients.sendCC,
          recipients.sendBCC,
          now,
          0
        );
      }

      return { dealID: nextDealID };
    });

    invalidateServerDealsCache();
    revalidatePath('/deals');
    revalidatePath('/dashboard');

    // Trigger immediate non-blocking email dispatch in background
    processNotifications().catch((err) =>
      console.error('[createDeal] Background notification dispatch error:', err)
    );

    return { success: true, dealID: result.dealID };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Action: createDeal] Error:', message);
    return { success: false, error: message };
  }
}

/**
 * 4. updateDeal (Server Action)
 * Updates deal header, replaces line items, recalculates notification date, updates SLA response days, and queues update email.
 */
export async function updateDeal(
  payload: UpdateDealPayload,
  _token?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role as string | undefined;
    if (userRole === 'ao' || userRole === 'bu' || userRole === 'bu_admin') {
      return {
        success: false,
        error: 'Access Denied: Account Officers and BU Heads have view-only access. Deal modifications are managed by Administrators.',
      };
    }
    const domainAccount = (session?.user as any)?.DomainAccount || 'CORP\\DEMOUSER';
    const userName = (session?.user as any)?.AccountName || 'Portal User';
    const dealID = Number(payload.dealID);

    const expDate = new Date(payload.expDt);
    const regDate = new Date(payload.dtRegistered);
    const now = new Date();

    // dealWTN: re-calculate and INSERT new whenToNotify date set to (dtExpDt - 2 days)
    const twoDaysBeforeExp = new Date(expDate);
    twoDaysBeforeExp.setDate(twoDaysBeforeExp.getDate() - 2);

    await prisma.$transaction(async (tx) => {
      const currentDeal = await tx.dealHeader.findUnique({
        where: { dealID: dealID },
      });

      if (!currentDeal) {
        throw new Error(`Deal ID ${dealID} not found.`);
      }

      // Query existing items to compute previous total amount for diff tracking
      const existingItems = await tx.dealItems.findMany({
        where: { dealID: dealID },
      });
      const previousTotalAmount = existingItems.reduce(
        (acc, it) => acc + Number(it.totalAmt || 0),
        0
      );

      const oldStatus = currentDeal.dealStatus;
      const newStatus = String(payload.dealStatus);

      const normalizedBrand = normalizeBrandName(payload.brand);

      // 1. Target Table: DealHeader
      await tx.dealHeader.update({
        where: { dealID: dealID },
        data: {
          dtRegistered: regDate,
          expiration: String(payload.expDt),
          expDt: expDate,
          brand: normalizedBrand,
          customerID: typeof payload.customerID === 'string'
            ? (parseInt(payload.customerID, 10) || null)
            : (payload.customerID ?? null),
          ProjectName: payload.ProjectName,
          AssignedAO: payload.AssignedAO,
          BU: payload.BU,
          dealStatus: newStatus,
          custName: payload.custName,
          remarks: payload.remarks || null,
          dtValidTo: expDate,
        },
      });

      // 2. Target Table: DealItems (DELETE where dealID == payload.dealID, then INSERT updated array)
      await tx.dealItems.deleteMany({
        where: { dealID: dealID },
      });

      let totalAmount = 0;
      if (payload.items && payload.items.length > 0) {
        const maxItemResult = await tx.$queryRawUnsafe<any[]>(
          `SELECT ISNULL(MAX(dealItemID), 0) AS maxId FROM [dbo].[DealItems]`
        );
        let currentItemId = Number(maxItemResult?.[0]?.maxId || 0);

        for (const item of payload.items) {
          currentItemId++;
          totalAmount += Number(item.totalAmt || 0);
          await tx.$executeRawUnsafe(
            `INSERT INTO [dbo].[DealItems] ([dealItemID], [dealID], [itemDesc], [qty], [currency], [totalAmt])
             VALUES (@P1, @P2, @P3, @P4, @P5, @P6)`,
            currentItemId,
            dealID,
            item.itemDesc,
            String(item.qty),
            item.currency,
            String(item.totalAmt)
          );
        }
      }

      // 3. Target Table: dealWTN (DELETE then INSERT new whenToNotify = dtExpDt - 2 days)
      await tx.dealWTN.deleteMany({ where: { dealID: dealID } });
      const maxWtnResult = await tx.$queryRawUnsafe<any[]>(
        `SELECT ISNULL(MAX(id), 0) AS maxId FROM [dbo].[dealWTN]`
      );
      const nextWtnId = Number(maxWtnResult?.[0]?.maxId || 0) + 1;

      await tx.$executeRawUnsafe(
        `INSERT INTO [dbo].[dealWTN] ([id], [dealID], [whenToNotify])
         VALUES (@P1, @P2, @P3)`,
        nextWtnId,
        dealID,
        twoDaysBeforeExp
      );

      // 4. Target Table: DealResponse (SLA Tracking)
      // If old status was 4 (Pending) and new status is 1 (Registered), calculate diffInDays(dtCreated, now()) and insert/update record
      if (oldStatus === '4' && newStatus === '1') {
        const dtCreated = currentDeal.dtCreated || new Date();
        const diffInMs = Math.abs(now.getTime() - dtCreated.getTime());
        const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

        const existingRes = await tx.dealResponse.findUnique({ where: { dealID: dealID } });
        if (existingRes) {
          await tx.dealResponse.update({
            where: { dealID: dealID },
            data: { responseDays: String(diffInDays) },
          });
        } else {
          const maxRes = await tx.$queryRawUnsafe<any[]>(
            `SELECT ISNULL(MAX(id), 0) AS maxId FROM [dbo].[DealResponse]`
          );
          const nextResId = Number(maxRes?.[0]?.maxId || 0) + 1;
          await tx.$executeRawUnsafe(
            `INSERT INTO [dbo].[DealResponse] ([id], [dealID], [responseDays]) VALUES (@P1, @P2, @P3)`,
            nextResId,
            dealID,
            String(diffInDays)
          );
        }
      }

      // If status changes away from 1, 6, or 7, delete matching DealResponse record
      const previousWasSlaTracked = ['1', '6', '7'].includes(oldStatus || '');
      const newIsSlaTracked = ['1', '6', '7'].includes(newStatus);
      if (previousWasSlaTracked && !newIsSlaTracked) {
        await tx.dealResponse.deleteMany({
          where: { dealID: dealID },
        });
      }

      // 5. Target Table: deals_reg_notification: If toEmail is checked and BU != 'BU6', insert an update notification row (status = 0)
      if (payload.toEmail && payload.BU !== 'BU6') {
        // Track field-level modifications for email diff
        const normalizeStr = (val?: string | null) => (val || '').trim();
        const formatDateStr = (d?: Date | string | null) => {
          if (!d) return '';
          const dateObj = typeof d === 'string' ? new Date(d) : d;
          return isNaN(dateObj.getTime())
            ? ''
            : dateObj.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        };
        const formatMoney = (amt?: number | null) =>
          amt != null
            ? `PHP ${Number(amt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : 'PHP 0.00';

        const changes: Array<{ label: string; from: string; to: string }> = [];

        // Customer Name
        if (normalizeStr(currentDeal.custName) !== normalizeStr(payload.custName)) {
          changes.push({
            label: 'Customer Name',
            from: currentDeal.custName || '',
            to: payload.custName || '',
          });
        }

        // Project Name
        if (normalizeStr(currentDeal.ProjectName) !== normalizeStr(payload.ProjectName)) {
          changes.push({
            label: 'Project Name',
            from: currentDeal.ProjectName || '',
            to: payload.ProjectName || '',
          });
        }

        // Brand
        if (normalizeStr(currentDeal.brand).toUpperCase() !== normalizeStr(normalizedBrand).toUpperCase()) {
          changes.push({
            label: 'Brand',
            from: currentDeal.brand || '',
            to: normalizedBrand || '',
          });
        }

        // BU
        if (normalizeStr(currentDeal.BU) !== normalizeStr(payload.BU)) {
          changes.push({
            label: 'Business Unit (BU)',
            from: currentDeal.BU || '',
            to: payload.BU || '',
          });
        }

        // Assigned AO
        if (normalizeStr(currentDeal.AssignedAO) !== normalizeStr(payload.AssignedAO)) {
          changes.push({
            label: 'Assigned AO',
            from: currentDeal.AssignedAO || '',
            to: payload.AssignedAO || '',
          });
        }

        // Registration Date
        const oldReg = formatDateStr(currentDeal.dtRegistered);
        const newReg = formatDateStr(regDate);
        if (oldReg && newReg && oldReg !== newReg) {
          changes.push({
            label: 'Registration Date',
            from: oldReg,
            to: newReg,
          });
        }

        // Expiration Date
        const oldExp = formatDateStr(currentDeal.expDt || currentDeal.expiration);
        const newExp = formatDateStr(expDate);
        if (oldExp && newExp && oldExp !== newExp) {
          changes.push({
            label: 'Expiration Date',
            from: oldExp,
            to: newExp,
          });
        }

        // Currency
        const prevCurrency = existingItems?.[0]?.currency || 'PHP';
        const newCurrency = payload.items?.[0]?.currency || (payload as any).currency || 'PHP';
        if (normalizeStr(prevCurrency).toUpperCase() !== normalizeStr(newCurrency).toUpperCase()) {
          changes.push({
            label: 'Currency',
            from: prevCurrency,
            to: newCurrency,
          });
        }

        // Deal Amount
        if (Math.abs(previousTotalAmount - totalAmount) > 0.01) {
          changes.push({
            label: 'Deal Amount',
            from: Number(previousTotalAmount).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
            to: Number(totalAmount).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          });
        }

        // Remarks
        if (normalizeStr(currentDeal.remarks) !== normalizeStr(payload.remarks)) {
          changes.push({
            label: 'Remarks',
            from: currentDeal.remarks || '',
            to: payload.remarks || '',
          });
        }

        const recipients = await resolveDealEmailRecipients(
          payload.AssignedAO,
          payload.BU,
          normalizedBrand || payload.brand || ''
        );
        const { subject, message } = generateUpdateDealEmail({
          dealID: dealID,
          dealRegID: currentDeal.dealRegID,
          custName: payload.custName,
          projectName: payload.ProjectName,
          brand: normalizedBrand,
          bu: payload.BU || '',
          assignedAO: payload.AssignedAO || '',
          aoNickName: recipients.aoNickName,
          currency: newCurrency,
          regDate: regDate,
          expDate: expDate,
          remarks: payload.remarks,
          totalAmount: totalAmount,
          creatorName: userName,
          creatorAccount: domainAccount,
          changes: changes,
        });

        const finalSubject = recipients.subjectPrefix ? `${recipients.subjectPrefix}${subject}` : subject;

        const maxNotifResult = await tx.$queryRawUnsafe<any[]>(
          `SELECT ISNULL(MAX(email_id), 0) AS maxId FROM [dbo].[deals_reg_notification]`
        );
        const nextNotifId = Number(maxNotifResult?.[0]?.maxId || 0) + 1;

        await tx.$executeRawUnsafe(
          `INSERT INTO [dbo].[deals_reg_notification] (
            [email_id], [creator], [subject], [message], [sendTo], [sendCC], [sendBCC], [dateCreated], [status]
          ) VALUES (@P1, @P2, @P3, @P4, @P5, @P6, @P7, @P8, @P9)`,
          nextNotifId,
          domainAccount,
          finalSubject,
          message,
          recipients.sendTo,
          recipients.sendCC,
          recipients.sendBCC,
          now,
          0
        );
      }
    });

    invalidateServerDealsCache();
    revalidatePath('/deals');
    revalidatePath('/dashboard');

    // Trigger immediate non-blocking email dispatch in background
    processNotifications().catch((err) =>
      console.error('[updateDeal] Background notification dispatch error:', err)
    );

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Action: updateDeal] Error:', message);
    return { success: false, error: message };
  }
}

/**
 * 5. updateWTN (Server Action)
 * Allows user to manually adjust the scheduled email alert date in dealWTN.
 * Target Table: dealWTN -> Update whenToNotify = payload.dtwtn where dealID == payload.wtn_dealID
 */
export async function updateWTN(
  payload: UpdateWTNPayload,
  _token?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role as string | undefined;
    if (userRole === 'ao' || userRole === 'bu' || userRole === 'bu_admin') {
      return {
        success: false,
        error: 'Access Denied: Account Officers and BU Heads have view-only access.',
      };
    }
    const dealID = Number(payload.wtn_dealID || (payload as any).dealID);
    const rawDate = payload.dtwtn || payload.whenToNotify;
    const wtnDate = rawDate ? new Date(rawDate) : new Date();

    const existingWTN = await prisma.dealWTN.findUnique({ where: { dealID: dealID } });
    if (existingWTN) {
      await prisma.dealWTN.update({
        where: { dealID: dealID },
        data: { whenToNotify: wtnDate },
      });
    } else {
      const maxWtnResult = await prisma.$queryRawUnsafe<any[]>(
        `SELECT ISNULL(MAX(id), 0) AS maxId FROM [dbo].[dealWTN]`
      );
      const nextWtnId = Number(maxWtnResult?.[0]?.maxId || 0) + 1;

      await prisma.$executeRawUnsafe(
        `INSERT INTO [dbo].[dealWTN] ([id], [dealID], [whenToNotify])
         VALUES (@P1, @P2, @P3)`,
        nextWtnId,
        dealID,
        wtnDate
      );
    }

    invalidateServerDealsCache();
    revalidatePath('/deals');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Action: updateWTN] Error:', message);
    return { success: false, error: message };
  }
}

/**
 * 6. saveLostDeal (Server Action)
 * Captures competitor and reason details in DealLost when a deal is closed as lost.
 */
export async function saveLostDeal(
  payload: SaveLostDealPayload,
  _token?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role as string | undefined;
    if (userRole === 'ao' || userRole === 'bu' || userRole === 'bu_admin') {
      return {
        success: false,
        error: 'Access Denied: Account Officers and BU Heads have view-only access.',
      };
    }
    const dealID = Number(payload.dealID);
    const domainAccount = (session?.user as any)?.DomainAccount || 'SYSTEM';
    const userName = session?.user?.name || (session?.user as any)?.AccountName || domainAccount;
    const now = new Date();

    const currentDeal = await prisma.dealHeader.findUnique({
      where: { dealID: dealID },
    });

    if (!currentDeal) {
      throw new Error(`Deal with ID ${dealID} not found.`);
    }

    await prisma.$transaction(async (tx) => {
      // Update DealHeader status to '7' (Lost)
      await tx.dealHeader.update({
        where: { dealID: dealID },
        data: { dealStatus: '7' },
      });

      // Target Table: DealLost
      await tx.dealLost.deleteMany({ where: { dealID: dealID } });
      await tx.dealLost.create({
        data: {
          dealID: dealID,
          competitorVendor: (payload.competitorVendor || '').trim(),
          competitorBrand: (payload.competitorBrand || '').trim(),
          icsOffer: String(payload.icsOffer || 'N/A').trim(),
          competitorOffer: String(payload.competitorOffer || 'N/A').trim(),
          reason: (payload.reason || '').trim(),
          otherInformation: payload.otherInformation ? payload.otherInformation.trim() : null,
        },
      });

      // Target Table: deals_reg_notification (Skip if BU == 'BU6')
      const buVal = currentDeal.BU || '';
      if (buVal !== 'BU6') {
        const aoVal = currentDeal.AssignedAO || '';
        const brandVal = currentDeal.brand || '';
        const recipients = await resolveDealEmailRecipients(aoVal, buVal, brandVal);
        const { subject, message } = generateLostDealEmail({
          dealID: dealID,
          dealRegID: currentDeal.dealRegID,
          custName: currentDeal.custName || '',
          projectName: currentDeal.ProjectName,
          brand: currentDeal.brand || '',
          bu: buVal,
          assignedAO: aoVal,
          aoNickName: recipients.aoNickName,
          competitorVendor: payload.competitorVendor,
          competitorBrand: payload.competitorBrand,
          icsOffer: payload.icsOffer != null ? String(payload.icsOffer) : 'N/A',
          competitorOffer: payload.competitorOffer != null ? String(payload.competitorOffer) : 'N/A',
          reason: payload.reason,
          otherInformation: payload.otherInformation,
          creatorName: userName,
          creatorAccount: domainAccount,
        });

        const finalSubject = recipients.subjectPrefix ? `${recipients.subjectPrefix}${subject}` : subject;

        const maxNotifResult = await tx.$queryRawUnsafe<any[]>(
          `SELECT ISNULL(MAX(email_id), 0) AS maxId FROM [dbo].[deals_reg_notification]`
        );
        const nextNotifId = Number(maxNotifResult?.[0]?.maxId || 0) + 1;

        await tx.$executeRawUnsafe(
          `INSERT INTO [dbo].[deals_reg_notification] (
            [email_id], [creator], [subject], [message], [sendTo], [sendCC], [sendBCC], [dateCreated], [status]
          ) VALUES (@P1, @P2, @P3, @P4, @P5, @P6, @P7, @P8, @P9)`,
          nextNotifId,
          domainAccount,
          finalSubject,
          message,
          recipients.sendTo,
          recipients.sendCC,
          recipients.sendBCC,
          now,
          0
        );
      }
    });

    invalidateServerDealsCache();
    revalidatePath('/deals');
    revalidatePath(`/deals/${dealID}`);
    revalidatePath('/dashboard');

    // Trigger immediate non-blocking email dispatch in background
    processNotifications().catch((err) =>
      console.error('[saveLostDeal] Background notification dispatch error:', err)
    );

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Action: saveLostDeal] Error:', message);
    return { success: false, error: message };
  }
}

/**
 * 7. saveDealRenewal (Server Action)
 * Records a renewal in DealRenewal table, updates DealHeader expiration and validity,
 * recalculates dealWTN, and queues an email notification.
 */
export async function saveDealRenewal(
  payload: SaveDealRenewalPayload,
  _token?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role as string | undefined;
    if (userRole === 'ao' || userRole === 'bu' || userRole === 'bu_admin') {
      return {
        success: false,
        error: 'Access Denied: Account Officers and BU Heads have view-only access.',
      };
    }
    const domainAccount = (session?.user as any)?.DomainAccount || 'CORP\\DEMOUSER';
    const userName = (session?.user as any)?.AccountName || 'Portal User';
    const dealID = Number(payload.dealID);

    const renewalDate = new Date(payload.dtRenewal);
    const rexpDate = new Date(payload.rexpDt);
    const validityDays = parseSafeInt(payload.validityDays, 90);
    const now = new Date();

    // dealWTN Calculation: Set to (rexpDt - 2 days)
    const twoDaysBeforeRexp = new Date(rexpDate);
    twoDaysBeforeRexp.setDate(twoDaysBeforeRexp.getDate() - 2);
    const whenToNotify = now > twoDaysBeforeRexp ? now : twoDaysBeforeRexp;

    await prisma.$transaction(async (tx) => {
      const currentDeal = await tx.dealHeader.findUnique({
        where: { dealID: dealID },
      });

      if (!currentDeal) {
        throw new Error(`Deal ID ${dealID} not found.`);
      }

      // 1. Insert or Update DealRenewal
      if (payload.renewalID && Number(payload.renewalID) > 0) {
        await tx.dealRenewal.update({
          where: { renewalID: Number(payload.renewalID) },
          data: {
            dtRenewal: renewalDate,
            rexpDt: rexpDate,
            remarks: payload.remarks || null,
          },
        });
      } else {
        const maxRenewalResult = await tx.$queryRawUnsafe<any[]>(
          `SELECT ISNULL(MAX(renewalID), 0) AS maxId FROM [dbo].[DealRenewal]`
        );
        const nextRenewalID = Number(maxRenewalResult?.[0]?.maxId || 0) + 1;

        await tx.dealRenewal.create({
          data: {
            renewalID: nextRenewalID,
            dealID: dealID,
            dtRenewal: renewalDate,
            rexpDt: rexpDate,
            remarks: payload.remarks || null,
            dtCreated: now,
          },
        });
      }

      // 2. Update DealHeader (expDt, expiration, dtValidTo, dealStatus = '1' (Registered))
      const updateData: any = {
        dealStatus: '1',
        expiration: String(validityDays),
        expDt: rexpDate,
        dtValidTo: rexpDate,
      };

      await tx.dealHeader.update({
        where: { dealID: dealID },
        data: updateData,
      });

      // 3. Upsert dealWTN
      const existingWtn = await tx.dealWTN.findUnique({ where: { dealID } });
      if (existingWtn) {
        await tx.dealWTN.update({
          where: { dealID },
          data: { whenToNotify },
        });
      } else {
        const maxWtnResult = await tx.$queryRawUnsafe<any[]>(
          `SELECT ISNULL(MAX(id), 0) AS maxId FROM [dbo].[dealWTN]`
        );
        const nextWtnId = Number(maxWtnResult?.[0]?.maxId || 0) + 1;
        await tx.dealWTN.create({
          data: {
            id: nextWtnId,
            dealID,
            whenToNotify,
          },
        });
      }

      // 4. Send Email Notification if requested and BU != 'BU6'
      const buVal = currentDeal.BU || 'BU5';
      const aoVal = currentDeal.AssignedAO || 'Unassigned';
      const brandVal = currentDeal.brand || '';
      if (payload.toEmail !== false && buVal !== 'BU6') {
        const recipients = await resolveDealEmailRecipients(aoVal, buVal, brandVal);
        const { subject, message } = generateRenewDealEmail({
          dealID: dealID,
          dealRegID: currentDeal.dealRegID,
          custName: currentDeal.custName || '',
          projectName: currentDeal.ProjectName,
          brand: currentDeal.brand || '',
          bu: buVal,
          assignedAO: aoVal,
          aoNickName: recipients.aoNickName,
          renewalDate: renewalDate,
          newExpirationDate: rexpDate,
          validityDays: validityDays,
          remarks: payload.remarks,
          creatorName: userName,
          creatorAccount: domainAccount,
        });

        const finalSubject = recipients.subjectPrefix ? `${recipients.subjectPrefix}${subject}` : subject;

        const maxNotifResult = await tx.$queryRawUnsafe<any[]>(
          `SELECT ISNULL(MAX(email_id), 0) AS maxId FROM [dbo].[deals_reg_notification]`
        );
        const nextNotifId = Number(maxNotifResult?.[0]?.maxId || 0) + 1;

        await tx.$executeRawUnsafe(
          `INSERT INTO [dbo].[deals_reg_notification] (
            [email_id], [creator], [subject], [message], [sendTo], [sendCC], [sendBCC], [dateCreated], [status]
          ) VALUES (@P1, @P2, @P3, @P4, @P5, @P6, @P7, @P8, @P9)`,
          nextNotifId,
          domainAccount,
          finalSubject,
          message,
          recipients.sendTo,
          recipients.sendCC,
          recipients.sendBCC,
          now,
          0
        );
      }
    });

    invalidateServerDealsCache();
    revalidatePath('/deals');
    revalidatePath(`/deals/${dealID}`);
    revalidatePath('/dashboard');

    // Trigger immediate non-blocking email dispatch in background
    processNotifications().catch((err) =>
      console.error('[saveDealRenewal] Background notification dispatch error:', err)
    );

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Action: saveDealRenewal] Error:', message);
    return { success: false, error: message };
  }
}

/**
 * 7. searchCustomers (Query Action)
 * Lightweight server action fallback for querying ICE CREAM liveSearch API.
 * Pure read-only API with zero database overhead.
 */
export async function searchCustomers(
  query: string = '',
  _token?: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const cleanQuery = (query || '').trim().replace(/\s+/g, ' ');
    if (cleanQuery.length < 2) {
      return { success: true, data: [] };
    }

    const encodedKey = encodeURIComponent(Buffer.from(cleanQuery).toString('base64'));
    const apiRes = await fetch(`https://ice-cream.ics.com.ph/api/liveSearch?key=${encodedKey}`, {
      signal: AbortSignal.timeout(6000),
    });

    if (!apiRes.ok) {
      console.warn(`[Action: searchCustomers] API returned status ${apiRes.status}`);
      return { success: true, data: [] };
    }

    const rawData = await apiRes.json();
    const list: any[] = Array.isArray(rawData) ? rawData : (rawData.data || []);

    const candidateMap = new Map<string, any>();

    for (const item of list) {
      // Filter ONLY active accounts as pushed by backend specs
      const isExplicitlyInactive =
        item.is_active === '0' ||
        item.is_active === 0 ||
        item.isActive === false ||
        item.status === '0' ||
        item.status === 0 ||
        String(item.is_active || '').toLowerCase() === 'inactive' ||
        String(item.status || '').toLowerCase() === 'inactive' ||
        String(item.Status || '').toLowerCase() === 'inactive';

      if (isExplicitlyInactive) {
        continue;
      }

      const customerID = item.CustomerID || item.CustomerNumber || `CUST-${item.id || 'N/A'}`;
      const custName = item.CustomerName || 'Unknown Account';
      const rawBuValue = item.BU ?? item.bu ?? item.BusinessUnit ?? item.AccountGroup ?? item.Division ?? item.SalesGroup ?? item.bu_code ?? 'BU5';
      const bu = normalizeBusinessUnit(rawBuValue);
      const assignedAO = item.AO || item.ao || item.AssignedAO || 'Assigned AO';
      const isActive = true;
      const createdDate = item.DateCreated;
      const createdBy = item.CreatedBy;

      // Unique key per (customerID, bu, assignedAO) so distinct BU/AO options are preserved
      const uniqueKey = `${customerID}-${bu}-${assignedAO}-${custName}`.toLowerCase();
      if (!candidateMap.has(uniqueKey)) {
        candidateMap.set(uniqueKey, {
          customerID,
          custName,
          bu,
          assignedAO,
          isActive,
          createdDate,
          createdBy,
        });
      }
    }

    const candidateList = Array.from(candidateMap.values());

    // Rank results by relevance (exact phrase > prefix phrase > word matches)
    const rankedResults = rankCustomersByRelevance(candidateList, cleanQuery);

    return { success: true, data: rankedResults };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Action: searchCustomers] Error:', message);
    return { success: false, error: message };
  }
}

export interface DashboardSummaryData {
  totalCount: number;
  totalRegistered: number;
  expiredThisMonth: number;
  totalRenewed: number;
  dealsByBrand: { brand: string; count: number }[];
  dealsByBU: { bu: string; count: number }[];
  recentDeals: DealHeaderRecord[];
}

/**
 * 9. getDashboardSummary (Server Action)
 * High-performance SQL Server aggregation query for the main Dashboard metrics across all 8,400+ deals.
 */
export async function getDashboardSummary(): Promise<{
  success: boolean;
  data?: DashboardSummaryData;
  error?: string;
}> {
  try {
    let session: any = null;
    try {
      session = await getServerSession(authOptions);
    } catch {
      // In standalone scripts or background jobs outside request context
    }
    const userRole = ((session?.user as any)?.role as string) || 'admin';
    const accountName = ((session?.user as any)?.AccountName || session?.user?.name || '').trim();
    const domainAccount = ((session?.user as any)?.DomainAccount || '').trim();
    const email = ((session?.user as any)?.Email || session?.user?.email || '').trim();
    const accountGroup = ((session?.user as any)?.AccountGroup || '').trim();
    const assignedBUs = (session?.user as any)?.assignedBUs as string[] | undefined;

    const andConditions: any[] = [];
    if (userRole === 'ao') {
      const aoConditions = buildAOScopingConditions(accountName, domainAccount, email);
      andConditions.push({ OR: aoConditions });
    } else if (userRole === 'bu' || userRole === 'bu_admin') {
      const buConditions = buildBUScopingConditions(assignedBUs && assignedBUs.length > 0 ? assignedBUs : accountGroup);
      andConditions.push({ OR: buConditions });
    }

    const cacheKey = serverCache.generateKey('dashboard_summary', {
      userRole,
      accountName,
      domainAccount,
      accountGroup,
      assignedBUs,
    });

    const cached = serverCache.get<DashboardSummaryData>(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    const baseWhere = andConditions.length > 0 ? { AND: andConditions } : {};

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const startIso = startOfMonth.toISOString().slice(0, 10);
    const endIso = endOfMonth.toISOString().slice(0, 10);
    const nowIso = now.toISOString().slice(0, 10);

    // Fast Single-Pass KPI Computation for Admin/Global scope vs Scoped Prisma
    let totalCount = 0;
    let totalRegistered = 0;
    let expiredThisMonth = 0;
    let totalRenewed = 0;

    const isGlobalScope = andConditions.length === 0;
    const officialBUsSqlList = OFFICIAL_REGISTERED_BUS.map((b) => `'${b}'`).join(',');

    const [kpiResult, dealsByBrandGroup, dealsByBUGroup, recentRawDeals]: any = await Promise.all([
      isGlobalScope
        ? prisma.$queryRawUnsafe<any[]>(`
            SELECT
              COUNT(*) AS totalCount,
              SUM(CASE WHEN dealStatus = '1' THEN 1 ELSE 0 END) AS totalRegistered,
              SUM(CASE WHEN expDt >= '${startIso}' AND expDt <= '${endIso}' AND expDt < '${nowIso}' THEN 1 ELSE 0 END) AS expiredThisMonth,
              (SELECT COUNT(DISTINCT r.dealID) FROM DealRenewal r INNER JOIN DealHeader h ON r.dealID = h.dealID WHERE h.BU IN (${officialBUsSqlList})) AS totalRenewed
            FROM DealHeader;
          `)
        : Promise.all([
            prisma.dealHeader.count({ where: baseWhere }),
            prisma.dealHeader.count({ where: { ...baseWhere, dealStatus: '1' } }),
            prisma.dealHeader.count({
              where: {
                ...baseWhere,
                expDt: { gte: startOfMonth, lte: endOfMonth, lt: now },
              },
            }),
            prisma.dealHeader.count({
              where: { ...baseWhere, BU: { in: [...OFFICIAL_REGISTERED_BUS] }, Renewals: { some: {} } },
            }),
          ]),
      prisma.dealHeader.groupBy({
        by: ['brand'],
        where: baseWhere,
        _count: {
          dealID: true,
        },
        orderBy: {
          _count: {
            dealID: 'desc',
          },
        },
        take: 10,
      }),
      // Deals Grouped by BU
      prisma.dealHeader.groupBy({
        by: ['BU'],
        where: baseWhere,
        _count: {
          dealID: true,
        },
        orderBy: {
          _count: {
            dealID: 'desc',
          },
        },
      }),
      // Recent 5 deals with lean projection
      prisma.dealHeader.findMany({
        where: baseWhere,
        take: 5,
        orderBy: {
          dtCreated: 'desc',
        },
        select: {
          dealID: true,
          dtRegistered: true,
          expiration: true,
          expDt: true,
          brand: true,
          customerID: true,
          dealRegID: true,
          ProjectName: true,
          AssignedAO: true,
          BU: true,
          dealStatus: true,
          createdBy: true,
          custName: true,
          remarks: true,
          dtCreated: true,
          dtValidTo: true,
          DealItems: {
            select: {
              dealItemID: true,
              dealID: true,
              itemDesc: true,
              qty: true,
              currency: true,
              totalAmt: true,
            },
          },
        },
      }),
    ]);

    if (isGlobalScope && Array.isArray(kpiResult) && kpiResult.length > 0) {
      totalCount = Number(kpiResult[0].totalCount || 0);
      totalRegistered = Number(kpiResult[0].totalRegistered || 0);
      expiredThisMonth = Number(kpiResult[0].expiredThisMonth || 0);
      totalRenewed = Number(kpiResult[0].totalRenewed || 0);
    } else if (Array.isArray(kpiResult)) {
      totalCount = kpiResult[0];
      totalRegistered = kpiResult[1];
      expiredThisMonth = kpiResult[2];
      totalRenewed = kpiResult[3];
    }

    const formattedRecentDeals: DealHeaderRecord[] = recentRawDeals.map((deal: any) => {
      const totalsByCurrency: CurrencyTotals = {};
      deal.DealItems.forEach((item: any) => {
        const curr = item.currency || 'USD';
        const amt = parseSafeNumber(item.totalAmt);
        totalsByCurrency[curr] = (totalsByCurrency[curr] || 0) + amt;
      });

      return {
        dealID: deal.dealID,
        dtRegistered: deal.dtRegistered || new Date(),
        expiration: deal.expiration || null,
        expDt: deal.expDt || new Date(),
        brand: deal.brand || '',
        customerID: deal.customerID,
        dealRegID: deal.dealRegID || '',
        ProjectName: deal.ProjectName || '',
        AssignedAO: deal.AssignedAO || '',
        BU: deal.BU || '',
        dealStatus: deal.dealStatus || '1',
        createdBy: deal.createdBy || '',
        custName: deal.custName || '',
        remarks: deal.remarks || null,
        dtCreated: deal.dtCreated || new Date(),
        dtValidTo: deal.dtValidTo || null,
        items: deal.DealItems.map((i: any) => ({
          itemID: i.dealItemID,
          dealID: i.dealID || deal.dealID,
          itemDesc: i.itemDesc || '',
          qty: parseSafeInt(i.qty, 1),
          currency: i.currency || 'USD',
          totalAmt: parseSafeNumber(i.totalAmt),
        })),
        aggregatedTotals: totalsByCurrency,
      };
    });

    const dealsByBrand = dealsByBrandGroup.map((b: any) => ({
      brand: b.brand || 'Unspecified',
      count: b._count.dealID,
    }));

    const dealsByBU = dealsByBUGroup.map((bu: any) => ({
      bu: bu.BU || 'Unassigned',
      count: bu._count.dealID,
    }));

    const summaryData: DashboardSummaryData = {
      totalCount,
      totalRegistered,
      expiredThisMonth,
      totalRenewed,
      dealsByBrand,
      dealsByBU,
      recentDeals: formattedRecentDeals,
    };

    // Cache in server memory for 120s
    serverCache.set(cacheKey, summaryData, 120_000, ['dashboard', 'deals']);

    return {
      success: true,
      data: summaryData,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Action: getDashboardSummary] Error:', message);
    return { success: false, error: message };
  }
}

