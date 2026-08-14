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
import { rankCustomersByRelevance } from '@/lib/searchUtils';

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
): Promise<{ success: boolean; data?: DealHeaderRecord[]; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    const userRole = filter.userRole || (session?.user as any)?.role || 'admin';
    const accountName = filter.accountName || (session?.user as any)?.AccountName;
    const accountGroup = filter.accountGroup || (session?.user as any)?.AccountGroup;

    const whereClause: Record<string, unknown> = {};

    if (userRole === 'ao' && accountName) {
      whereClause.AssignedAO = accountName;
    } else if ((userRole === 'bu' || userRole === 'bu_admin') && accountGroup) {
      whereClause.BU = accountGroup;
    }

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

    return { success: true, data: formattedDeals };
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

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create DealHeader
      const header = await tx.dealHeader.create({
        data: {
          dtRegistered: regDate,
          expiration: String(payload.expDt),
          expDt: expDate,
          brand: payload.brand,
          customerID: typeof payload.customerID === 'string' ? parseInt(payload.customerID, 10) : payload.customerID,
          dealRegID: dealRegID,
          ProjectName: payload.ProjectName,
          AssignedAO: payload.AssignedAO,
          BU: payload.BU,
          dealStatus: String(payload.dealStatus),
          createdBy: domainAccount,
          custName: payload.custName,
          remarks: payload.remarks || null,
          dtCreated: now,
          dtValidTo: expDate,
        },
      });

      // 2. Loop through each line item in the form array -> DealItems
      let totalAmount = 0;
      if (payload.items && payload.items.length > 0) {
        await tx.dealItems.createMany({
          data: payload.items.map((item) => {
            totalAmount += Number(item.totalAmt || 0);
            return {
              dealID: header.dealID,
              itemDesc: item.itemDesc,
              qty: String(item.qty),
              currency: item.currency,
              totalAmt: String(item.totalAmt),
            };
          }),
        });
      }

      // 3. Create dealWTN
      await tx.dealWTN.create({
        data: {
          dealID: header.dealID,
          whenToNotify: whenToNotify,
        },
      });

      // 4. Target Table: deals_reg_notification (Skip if BU == 'BU6')
      if (payload.BU !== 'BU6') {
        const recipients = await resolveDealEmailRecipients(payload.AssignedAO, payload.BU);
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

        const messageHtml = `
          <h2>Deal Registration: Created Deal Notification</h2>
          <p>A new deal has been registered for <strong>${payload.custName}</strong> by ${userName} (${domainAccount}).</p>
          <ul>
            <li><strong>Project Name:</strong> ${payload.ProjectName}</li>
            <li><strong>Brand:</strong> ${payload.brand}</li>
            <li><strong>Business Unit (BU):</strong> ${payload.BU}</li>
            <li><strong>Assigned AO:</strong> ${payload.AssignedAO}</li>
            <li><strong>Registration Date:</strong> ${regDate.toLocaleDateString()}</li>
            <li><strong>Expiration Date:</strong> ${expDate.toLocaleDateString()}</li>
            <li><strong>Total Amount:</strong> ${totalAmount.toLocaleString()}</li>
          </ul>
          <p><a href="${baseUrl}/deals/${header.dealID}/edit" style="display:inline-block;padding:8px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:4px;">View Deal in Portal</a></p>
        `;

        await tx.deals_reg_notification.create({
          data: {
            creator: domainAccount,
            subject: 'Deal Registration: Created Deal Notification',
            message: messageHtml,
            sendTo: recipients.sendTo,
            sendCC: recipients.sendCC,
            sendBCC: recipients.sendBCC,
            dateCreated: now,
            status: 0, // Unsent flag
          },
        });
      }

      return header;
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
          customerID: typeof payload.customerID === 'string' ? parseInt(payload.customerID, 10) : payload.customerID,
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
        await tx.dealItems.createMany({
          data: payload.items.map((item) => {
            totalAmount += Number(item.totalAmt || 0);
            return {
              dealID: dealID,
              itemDesc: item.itemDesc,
              qty: String(item.qty),
              currency: item.currency,
              totalAmt: String(item.totalAmt),
            };
          }),
        });
      }

      // 3. Target Table: dealWTN (DELETE then INSERT new whenToNotify = dtExpDt - 2 days)
      await tx.dealWTN.deleteMany({ where: { dealID: dealID } });
      await tx.dealWTN.create({
        data: { dealID: dealID, whenToNotify: twoDaysBeforeExp },
      });

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
          await tx.dealResponse.create({
            data: { dealID: dealID, responseDays: String(diffInDays) },
          });
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

        await tx.deals_reg_notification.create({
          data: {
            creator: domainAccount,
            subject: `Deal Registration: Update Notification (${currentDeal.dealRegID})`,
            message: messageHtml,
            sendTo: recipients.sendTo,
            sendCC: recipients.sendCC,
            sendBCC: recipients.sendBCC,
            status: 0,
            dateCreated: now,
          },
        });
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
      await prisma.dealWTN.create({
        data: { dealID: dealID, whenToNotify: wtnDate },
      });
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
 * Autocomplete and search customer accounts using ICE CREAM liveSearch API with local cdbAccounts ingestion & indexing.
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

    const fetchIceCream = async (searchTerm: string) => {
      try {
        const encodedKey = encodeURIComponent(Buffer.from(searchTerm.trim()).toString('base64'));
        const apiRes = await fetch(`https://ice-cream.ics.com.ph/api/liveSearch?key=${encodedKey}`, {
          signal: AbortSignal.timeout(4000),
        });
        if (!apiRes.ok) return [];
        const data = await apiRes.json();
        const list = Array.isArray(data) ? data : (data.data || []);
        return list.map((item: any) => ({
          customerID: item.CustomerID || item.CustomerNumber || `CUST-${item.id || 'N/A'}`,
          custName: item.CustomerName || 'Unknown Account',
          bu: item.BU || 'BU5',
          assignedAO: item.AO || 'Assigned AO',
          isActive: item.is_active === '1' || item.is_active === 1 || item.isActive === true,
          createdDate: item.DateCreated,
          createdBy: item.CreatedBy,
        }));
      } catch (err) {
        console.warn(`[Search: fetchIceCream] Error fetching for "${searchTerm}":`, err);
        return [];
      }
    };

    let candidateMap = new Map<string, any>();

    // 1. Primary Query to ICE CREAM API
    try {
      const primaryResults = await fetchIceCream(cleanQuery);
      for (const item of primaryResults) {
        const key = `${item.customerID}-${item.custName}`.toLowerCase();
        candidateMap.set(key, item);
      }

      // 2. Tokenized Fallback: If multi-word query (e.g. "Security Bank") returned few results, query tokens
      if (cleanQuery.includes(' ')) {
        const words = cleanQuery.split(/\s+/).filter((w) => w.length >= 2);
        const wordsToQuery = Array.from(new Set([words[0], words.sort((a, b) => b.length - a.length)[0]]));

        for (const token of wordsToQuery) {
          if (token && token.length >= 2 && token !== cleanQuery) {
            const tokenResults = await fetchIceCream(token);
            for (const item of tokenResults) {
              const key = `${item.customerID}-${item.custName}`.toLowerCase();
              if (!candidateMap.has(key)) {
                candidateMap.set(key, item);
              }
            }
          }
        }
      }
    } catch (apiErr) {
      console.warn('[Action: searchCustomers] ICE CREAM API fetch error:', apiErr);
    }

    const candidateList = Array.from(candidateMap.values());

    // 3. Background Ingestion to cdbAccounts
    if (candidateList.length > 0) {
      (async () => {
        try {
          for (const item of candidateList.slice(0, 30)) {
            if (!item.custName || item.custName === 'Unknown Account') continue;

            const existing = await prisma.cdbAccounts.findFirst({
              where: {
                OR: [
                  { AccountIDNo: String(item.customerID) },
                  { AccountName: String(item.custName) },
                ],
              },
            });

            if (existing) {
              await prisma.cdbAccounts.update({
                where: { AccountID: existing.AccountID },
                data: {
                  AccountName: item.custName,
                  AccountGroup: item.bu || existing.AccountGroup,
                  DomainAccount: item.assignedAO || existing.DomainAccount,
                  isActive: item.isActive ? 1 : 0,
                  LastSynced: new Date(),
                },
              });
            } else {
              await prisma.cdbAccounts.create({
                data: {
                  AccountIDNo: String(item.customerID),
                  AONumber: 0,
                  AccountName: item.custName,
                  AccountGroup: item.bu || 'BU5',
                  AccountType: 'CUSTOMER',
                  DomainAccount: item.assignedAO || 'Assigned AO',
                  Email: '',
                  isActive: item.isActive ? 1 : 0,
                  LastSynced: new Date(),
                },
              });
            }
          }
        } catch (dbSyncErr) {
          console.warn('[Action: searchCustomers] Background cdbAccounts sync warning:', dbSyncErr);
        }
      })();
    }

    // 4. If remote results are empty, search local cdbAccounts
    if (candidateList.length === 0) {
      try {
        const words = cleanQuery.split(/\s+/).filter((w) => w.length >= 2);
        const orConditions: any[] = [{ AccountName: { contains: cleanQuery } }];
        for (const w of words) {
          orConditions.push({ AccountName: { contains: w } });
        }

        const localAccounts = await prisma.cdbAccounts.findMany({
          where: {
            OR: orConditions,
          },
          take: 40,
        });

        for (const acc of localAccounts) {
          const item = {
            customerID: acc.AccountIDNo || `CUST-${acc.AccountID}`,
            custName: acc.AccountName,
            bu: acc.AccountGroup || 'BU1',
            assignedAO: acc.DomainAccount || 'Assigned AO',
            isActive: acc.isActive === 1,
          };
          const key = `${item.customerID}-${item.custName}`.toLowerCase();
          candidateMap.set(key, item);
        }
      } catch (localErr) {
        console.warn('[Action: searchCustomers] Local DB search warning:', localErr);
      }
    }

    // 5. Rank and return all candidates using multi-tier relevance scoring
    const allCandidates = Array.from(candidateMap.values());
    const rankedResults = rankCustomersByRelevance(allCandidates, cleanQuery);

    return { success: true, data: rankedResults };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Action: searchCustomers] Error:', message);
    return { success: false, error: message };
  }
}
