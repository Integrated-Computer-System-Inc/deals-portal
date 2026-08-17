'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@my-app/database';
import {
  CreateDealPayload,
  UpdateDealPayload,
  SaveLostDealPayload,
  UpdateWTNPayload,
  ScopedDealsFilter,
  DealHeaderRecord,
  CurrencyTotals,
} from '@my-app/types';
import { revalidatePath } from 'next/cache';
import { resolveDealEmailRecipients } from '@/lib/notifications';
import { rankCustomersByRelevance, normalizeBusinessUnit } from '@/lib/searchUtils';

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

/**
 * 1. getScopedDeals / getDealsList (Server Action / Query)
 * Retrieves filtered active deals based on user role (AO, PM, BU Head, or Admin).
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
    const session = await getServerSession(authOptions);
    const userRole = filter.userRole || (session?.user as any)?.role || 'admin';
    const accountName = filter.accountName || (session?.user as any)?.AccountName;
    const accountGroup = filter.accountGroup || (session?.user as any)?.AccountGroup;

    const page = Math.max(1, filter.page || 1);
    const pageSize = filter.pageSize !== undefined ? filter.pageSize : 0;
    const searchQuery = (filter.searchQuery || '').trim();
    const statusFilter = filter.statusFilter || 'ALL';
    const buFilter = filter.buFilter || 'ALL';
    const brandFilter = filter.brandFilter || 'ALL';

    const andConditions: any[] = [];

    // Role-based scoping
    if (userRole === 'ao' && accountName) {
      andConditions.push({ AssignedAO: accountName });
    } else if ((userRole === 'bu' || userRole === 'bu_admin') && accountGroup) {
      andConditions.push({ BU: accountGroup });
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      andConditions.push({ dealStatus: String(statusFilter) });
    }

    // BU filter
    if (buFilter !== 'ALL') {
      andConditions.push({ BU: String(buFilter) });
    }

    // Brand filter
    if (brandFilter !== 'ALL' && brandFilter !== '') {
      andConditions.push({ brand: String(brandFilter) });
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

    // 2. Database-level limit & offset
    const rawDeals = await prisma.dealHeader.findMany({
      where: whereClause,
      include: {
        DealItems: true,
        DealWTN: true,
        DealResponse: true,
        DealLost: true,
      },
      orderBy: {
        dtCreated: 'desc',
      },
      ...(pageSize > 0
        ? {
            take: pageSize,
            skip: (page - 1) * pageSize,
          }
        : {}),
    });

    const formattedDeals: DealHeaderRecord[] = rawDeals.map((deal) => {
      const totalsByCurrency: CurrencyTotals = {};

      deal.DealItems.forEach((item) => {
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
        items: deal.DealItems.map((i) => ({
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
              icsOffer: parseSafeNumber(deal.DealLost.icsOffer),
              competitorOffer: parseSafeNumber(deal.DealLost.competitorOffer),
              reason: deal.DealLost.reason || '',
              otherInformation: deal.DealLost.otherInformation || undefined,
            }
          : null,
        aggregatedTotals: totalsByCurrency,
      };
    });

    const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1;

    return {
      success: true,
      data: formattedDeals,
      totalCount,
      page,
      pageSize,
      totalPages,
    };
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
    const deal = await prisma.dealHeader.findUnique({
      where: { dealID: Number(dealID) },
      include: {
        DealItems: true,
        DealWTN: true,
        DealResponse: true,
        DealLost: true,
      },
    });

    if (!deal) {
      return { success: true, data: null };
    }

    const totalsByCurrency: CurrencyTotals = {};
    deal.DealItems.forEach((item) => {
      const curr = item.currency || 'USD';
      const amt = parseSafeNumber(item.totalAmt);
      totalsByCurrency[curr] = (totalsByCurrency[curr] || 0) + amt;
    });

    const formatted: DealHeaderRecord = {
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
      items: deal.DealItems.map((i) => ({
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
            icsOffer: parseSafeNumber(deal.DealLost.icsOffer),
            competitorOffer: parseSafeNumber(deal.DealLost.competitorOffer),
            reason: deal.DealLost.reason || '',
            otherInformation: deal.DealLost.otherInformation || undefined,
          }
        : null,
      aggregatedTotals: totalsByCurrency,
    };

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
        payload.brand,
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
      if (buVal !== 'BU6') {
        const recipients = await resolveDealEmailRecipients(aoVal, buVal);
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

        const messageHtml = `
          <h2>Deal Registration: Created Deal Notification</h2>
          <p>A new deal has been registered for <strong>${payload.custName}</strong> by ${userName} (${domainAccount}).</p>
          <ul>
            <li><strong>Project Name:</strong> ${payload.ProjectName || payload.projectName}</li>
            <li><strong>Brand:</strong> ${payload.brand}</li>
            <li><strong>Business Unit (BU):</strong> ${buVal}</li>
            <li><strong>Assigned AO:</strong> ${aoVal}</li>
            <li><strong>Registration Date:</strong> ${regDate.toLocaleDateString()}</li>
            <li><strong>Expiration Date:</strong> ${expDate.toLocaleDateString()}</li>
            <li><strong>Total Amount:</strong> ${totalAmount.toLocaleString()}</li>
          </ul>
          <p><a href="${baseUrl}/deals/${nextDealID}/edit" style="display:inline-block;padding:8px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:4px;">View Deal in Portal</a></p>
        `;

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
          'Deal Registration: Created Deal Notification',
          messageHtml,
          recipients.sendTo,
          recipients.sendCC,
          recipients.sendBCC,
          now,
          0
        );
      }

      return { dealID: nextDealID };
    });

    revalidatePath('/deals');
    revalidatePath('/dashboard');
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

      const oldStatus = currentDeal.dealStatus;
      const newStatus = String(payload.dealStatus);

      // 1. Target Table: DealHeader
      await tx.dealHeader.update({
        where: { dealID: dealID },
        data: {
          dtRegistered: regDate,
          expiration: String(payload.expDt),
          expDt: expDate,
          brand: payload.brand,
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
        const recipients = await resolveDealEmailRecipients(payload.AssignedAO, payload.BU);
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

        const messageHtml = `
          <h2>Deal Registration: Update Notification</h2>
          <p>The deal for <strong>${payload.custName}</strong> has been updated by ${userName} (${domainAccount}).</p>
          <ul>
            <li><strong>Deal Ref ID:</strong> ${currentDeal.dealRegID}</li>
            <li><strong>Project Name:</strong> ${payload.ProjectName}</li>
            <li><strong>Brand:</strong> ${payload.brand}</li>
            <li><strong>Status:</strong> ${newStatus}</li>
            <li><strong>Total Amount:</strong> ${totalAmount.toLocaleString()}</li>
          </ul>
          <p><a href="${baseUrl}/deals/${dealID}/edit" style="display:inline-block;padding:8px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:4px;">View Deal in Portal</a></p>
        `;

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
          `Deal Registration: Update Notification (${currentDeal.dealRegID})`,
          messageHtml,
          recipients.sendTo,
          recipients.sendCC,
          recipients.sendBCC,
          now,
          0
        );
      }
    });

    revalidatePath('/deals');
    revalidatePath('/dashboard');
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

    revalidatePath('/deals');
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
    const dealID = Number(payload.dealID);

    await prisma.$transaction(async (tx) => {
      // Update DealHeader status to '8' (Lost)
      await tx.dealHeader.update({
        where: { dealID: dealID },
        data: { dealStatus: '8' },
      });

      // Target Table: DealLost
      await tx.dealLost.deleteMany({ where: { dealID: dealID } });
      await tx.dealLost.create({
        data: {
          dealID: dealID,
          competitorVendor: payload.competitorVendor,
          competitorBrand: payload.competitorBrand,
          icsOffer: String(payload.icsOffer),
          competitorOffer: String(payload.competitorOffer),
          reason: payload.reason,
          otherInformation: payload.otherInformation || null,
        },
      });
    });

    revalidatePath('/deals');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Action: saveLostDeal] Error:', message);
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

/**
 * 8. exportDealsCSVData (Server Action)
 * High-performance, lean query specifically designed for streaming / downloading all matching deals to CSV.
 */
export async function exportDealsCSVData(
  filter: ScopedDealsFilter
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    const userRole = filter.userRole || (session?.user as any)?.role || 'admin';
    const accountName = filter.accountName || (session?.user as any)?.AccountName;
    const accountGroup = filter.accountGroup || (session?.user as any)?.AccountGroup;

    const searchQuery = (filter.searchQuery || '').trim();
    const statusFilter = filter.statusFilter || 'ALL';
    const buFilter = filter.buFilter || 'ALL';
    const brandFilter = filter.brandFilter || 'ALL';

    const andConditions: any[] = [];

    if (userRole === 'ao' && accountName) {
      andConditions.push({ AssignedAO: accountName });
    } else if ((userRole === 'bu' || userRole === 'bu_admin') && accountGroup) {
      andConditions.push({ BU: accountGroup });
    }

    if (statusFilter !== 'ALL') {
      andConditions.push({ dealStatus: String(statusFilter) });
    }

    if (buFilter !== 'ALL') {
      andConditions.push({ BU: String(buFilter) });
    }

    if (brandFilter !== 'ALL' && brandFilter !== '') {
      andConditions.push({ brand: String(brandFilter) });
    }

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

    const rawDeals = await prisma.dealHeader.findMany({
      where: whereClause,
      select: {
        dealRegID: true,
        dtRegistered: true,
        expDt: true,
        expiration: true,
        custName: true,
        ProjectName: true,
        brand: true,
        BU: true,
        AssignedAO: true,
        dealStatus: true,
        DealItems: {
          select: {
            currency: true,
            totalAmt: true,
          },
        },
      },
      orderBy: {
        dtCreated: 'desc',
      },
    });

    const rows = rawDeals.map((deal) => {
      const totalsByCurrency: Record<string, number> = {};
      deal.DealItems.forEach((item) => {
        const curr = item.currency || 'USD';
        const amt = parseSafeNumber(item.totalAmt);
        totalsByCurrency[curr] = (totalsByCurrency[curr] || 0) + amt;
      });

      return {
        dealRegID: deal.dealRegID || '',
        dtRegistered: deal.dtRegistered,
        expDt: deal.expDt || deal.expiration,
        custName: deal.custName || '',
        projectName: deal.ProjectName || '',
        brand: deal.brand || '',
        bu: deal.BU || '',
        assignedAO: deal.AssignedAO || '',
        dealStatus: deal.dealStatus || '1',
        aggregatedTotals: totalsByCurrency,
      };
    });

    return { success: true, data: rows };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Action: exportDealsCSVData] Error:', message);
    return { success: false, error: message };
  }
}

export interface DashboardSummaryData {
  totalCount: number;
  totalRegistered: number;
  expiredThisMonth: number;
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
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role || 'admin';
    const accountName = (session?.user as any)?.AccountName;
    const accountGroup = (session?.user as any)?.AccountGroup;

    const andConditions: any[] = [];
    if (userRole === 'ao' && accountName) {
      andConditions.push({ AssignedAO: accountName });
    } else if ((userRole === 'bu' || userRole === 'bu_admin') && accountGroup) {
      andConditions.push({ BU: accountGroup });
    }

    const baseWhere = andConditions.length > 0 ? { AND: andConditions } : {};

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [
      totalCount,
      totalRegistered,
      expiredThisMonth,
      dealsByBrandGroup,
      dealsByBUGroup,
      recentRawDeals,
    ] = await Promise.all([
      // 1. Total deals in scope
      prisma.dealHeader.count({ where: baseWhere }),
      // 2. Registered status ('1')
      prisma.dealHeader.count({
        where: {
          ...baseWhere,
          dealStatus: '1',
        },
      }),
      // 3. Expired this month
      prisma.dealHeader.count({
        where: {
          ...baseWhere,
          expDt: {
            gte: startOfMonth,
            lte: endOfMonth,
            lt: now,
          },
        },
      }),
      // 4. Deals Grouped by Brand (Top 10)
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
      // 5. Deals Grouped by BU
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
      // 6. Recent 5 deals
      prisma.dealHeader.findMany({
        where: baseWhere,
        take: 5,
        orderBy: {
          dtCreated: 'desc',
        },
        include: {
          DealItems: true,
        },
      }),
    ]);

    const formattedRecentDeals: DealHeaderRecord[] = recentRawDeals.map((deal) => {
      const totalsByCurrency: CurrencyTotals = {};
      deal.DealItems.forEach((item) => {
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
        items: deal.DealItems.map((i) => ({
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

    const dealsByBrand = dealsByBrandGroup.map((b) => ({
      brand: b.brand || 'Unspecified',
      count: b._count.dealID,
    }));

    const dealsByBU = dealsByBUGroup.map((bu) => ({
      bu: bu.BU || 'Unassigned',
      count: bu._count.dealID,
    }));

    return {
      success: true,
      data: {
        totalCount,
        totalRegistered,
        expiredThisMonth,
        dealsByBrand,
        dealsByBU,
        recentDeals: formattedRecentDeals,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Action: getDashboardSummary] Error:', message);
    return { success: false, error: message };
  }
}

