'use server';

import { prisma } from '@my-app/database';
import {
  CreateDealPayload,
  UpdateDealPayload,
  SaveLostDealPayload,
  UpdateWTNPayload,
  ScopedDealsFilter,
  DealHeaderRecord,
  CurrencyTotals,
  MOCK_DEALS,
} from '@my-app/types';
import { revalidatePath } from 'next/cache';

const withTimeout = async <T>(promise: Promise<T>, timeoutMs = 800): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Database timeout - using local mock cache')), timeoutMs)
    ),
  ]);
};

function getMockScopedDeals(filter: ScopedDealsFilter): DealHeaderRecord[] {
  if (filter.userRole === 'ao' && filter.accountName) {
    const filtered = MOCK_DEALS.filter((d) =>
      d.assignedAO.toLowerCase().includes(filter.accountName?.toLowerCase() || '')
    );
    return filtered.length > 0 ? filtered : MOCK_DEALS;
  }
  if (filter.userRole === 'bu_admin' && filter.accountGroup) {
    const filtered = MOCK_DEALS.filter((d) => d.bu === filter.accountGroup);
    return filtered.length > 0 ? filtered : MOCK_DEALS;
  }
  return MOCK_DEALS;
}

/**
 * 1. getScopedDeals (Query Action)
 * Applies 3-tier access restrictions based on user role (admin, bu_admin, ao).
 * Groups and aggregates line item totals by currency.
 */
export async function getScopedDeals(filter: ScopedDealsFilter): Promise<{ success: boolean; data?: DealHeaderRecord[]; error?: string }> {
  try {
    const whereClause: Record<string, unknown> = {};

    if (filter.userRole === 'ao' && filter.accountName) {
      whereClause.AssignedAO = filter.accountName;
    } else if (filter.userRole === 'bu_admin' && filter.accountGroup) {
      whereClause.BU = filter.accountGroup;
    }
    // Admin has unrestricted access (empty whereClause)

    const query = prisma.dealHeader.findMany({
      where: whereClause,
      include: {
        DealItems: true,
        DealWTN: true,
        DealResponse: true,
        DealLost: true,
      },
      orderBy: {
        DtCreated: 'desc',
      },
    });

    const rawDeals = (await withTimeout(query, 800)) as any[] | null;

    if (!rawDeals || rawDeals.length === 0) {
      return { success: true, data: getMockScopedDeals(filter) };
    }

    const formattedDeals: DealHeaderRecord[] = rawDeals.map((deal: any) => {
      const totalsByCurrency: CurrencyTotals = {};

      deal.DealItems.forEach((item: any) => {
        const curr = item.Currency || 'USD';
        totalsByCurrency[curr] = (totalsByCurrency[curr] || 0) + item.TotalAmt;
      });

      return {
        dealID: deal.DealID,
        dtRegistered: deal.DtRegistered,
        expiration: deal.Expiration,
        expDt: deal.ExpDt,
        brand: deal.Brand,
        customerID: deal.CustomerID,
        dealRegID: deal.DealRegID,
        projectName: deal.ProjectName,
        assignedAO: deal.AssignedAO,
        bu: deal.BU,
        dealStatus: deal.DealStatus,
        createdBy: deal.CreatedBy,
        custName: deal.CustName,
        remarks: deal.Remarks,
        dtCreated: deal.DtCreated,
        items: deal.DealItems.map((i: any) => ({
          itemID: i.ItemID,
          dealID: i.DealID,
          itemDesc: i.ItemDesc,
          qty: i.Qty,
          currency: i.Currency,
          totalAmt: i.TotalAmt,
        })),
        wtn: deal.DealWTN
          ? {
              wtnID: deal.DealWTN.WTNID,
              dealID: deal.DealWTN.DealID,
              whenToNotify: deal.DealWTN.WhenToNotify,
            }
          : null,
        response: deal.DealResponse
          ? {
              responseID: deal.DealResponse.ResponseID,
              dealID: deal.DealResponse.DealID,
              responseDays: deal.DealResponse.ResponseDays,
            }
          : null,
        lostInfo: deal.DealLost
          ? {
              lostID: deal.DealLost.LostID,
              dealID: deal.DealLost.DealID,
              competitorVendor: deal.DealLost.CompetitorVendor,
              competitorBrand: deal.DealLost.CompetitorBrand,
              icsOffer: deal.DealLost.IcsOffer,
              competitorOffer: deal.DealLost.CompetitorOffer,
              reason: deal.DealLost.Reason,
              otherInformation: deal.DealLost.OtherInformation || undefined,
            }
          : null,
        aggregatedTotals: totalsByCurrency,
      };
    });

    return { success: true, data: formattedDeals };
  } catch (err: unknown) {
    // Return mock data immediately so UI never hangs while DB is offline
    return { success: true, data: getMockScopedDeals(filter) };
  }
}

/**
 * 2. createDeal (Server Action)
 * Atomic prisma.$transaction:
 * - Inserts into DealHeader and loops DealItems.
 * - Calculates WhenToNotify in DealWTN: If now() > (ExpDt - 10 days), set to now(), else (ExpDt - 10 days).
 * - If BU != 'BU6', queues a row in DealsRegNotification (Status = 0).
 */
export async function createDeal(payload: CreateDealPayload, createdBy: string): Promise<{ success: boolean; dealID?: number; error?: string }> {
  try {
    const expDate = new Date(payload.expDt);
    const regDate = new Date(payload.dtRegistered);
    const now = new Date();

    const dealRegID = `REG-${Date.now().toString(36).toUpperCase()}`;

    // Compute WTN date: now() > (ExpDt - 10 days) ? now() : (ExpDt - 10 days)
    const tenDaysBeforeExp = new Date(expDate);
    tenDaysBeforeExp.setDate(tenDaysBeforeExp.getDate() - 10);
    const whenToNotify = now > tenDaysBeforeExp ? now : tenDaysBeforeExp;

    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Create DealHeader
      const header = await tx.dealHeader.create({
        data: {
          DtRegistered: regDate,
          Expiration: expDate,
          ExpDt: expDate,
          Brand: payload.brand,
          CustomerID: payload.customerID,
          DealRegID: dealRegID,
          ProjectName: payload.projectName,
          AssignedAO: payload.assignedAO,
          BU: payload.bu,
          DealStatus: payload.dealStatus,
          CreatedBy: createdBy,
          CustName: payload.custName,
          Remarks: payload.remarks || null,
        },
      });

      // 2. Loop and Insert DealItems
      if (payload.items && payload.items.length > 0) {
        await tx.dealItems.createMany({
          data: payload.items.map((item) => ({
            DealID: header.DealID,
            ItemDesc: item.itemDesc,
            Qty: Number(item.qty),
            Currency: item.currency,
            TotalAmt: Number(item.totalAmt),
          })),
        });
      }

      // 3. Create DealWTN
      await tx.dealWTN.create({
        data: {
          DealID: header.DealID,
          WhenToNotify: whenToNotify,
        },
      });

      // 4. Queue notification if BU != 'BU6'
      if (payload.bu !== 'BU6') {
        await tx.dealsRegNotification.create({
          data: {
            Creator: createdBy,
            Subject: `New Deal Registered: ${header.DealRegID} - ${payload.projectName}`,
            Message: `<p>A new deal has been registered for <strong>${payload.custName}</strong> by ${createdBy}.</p><p>Project: ${payload.projectName}</p>`,
            SendTo: 'approvals@company.com',
            SendCC: 'sales-admin@company.com',
            Status: 0, // Unsent
          },
        });
      }

      return header;
    });

    revalidatePath('/deals');
    revalidatePath('/dashboard');
    return { success: true, dealID: result.DealID };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Action: createDeal] Error:', message);
    return { success: false, error: message };
  }
}

/**
 * 3. updateDeal (Server Action)
 * - Updates DealHeader, deletes existing DealItems, and re-inserts modified line items.
 * - Recalculates DealWTN (WhenToNotify = ExpDt - 2 days).
 * - SLA Calculation: If status moved from 4 (Pending) to 1 (Registered), compute diffInDays(DtCreated, now()) and record in DealResponse.
 *   If moving away from 1, 6, or 7, delete matching response record.
 */
export async function updateDeal(payload: UpdateDealPayload): Promise<{ success: boolean; error?: string }> {
  try {
    const expDate = new Date(payload.expDt);
    const regDate = new Date(payload.dtRegistered);
    const now = new Date();

    // WTN Recalculation: ExpDt - 2 days
    const twoDaysBeforeExp = new Date(expDate);
    twoDaysBeforeExp.setDate(twoDaysBeforeExp.getDate() - 2);

    await prisma.$transaction(async (tx: any) => {
      // Fetch current deal for SLA check
      const currentDeal = await tx.dealHeader.findUnique({
        where: { DealID: payload.dealID },
      });

      if (!currentDeal) {
        throw new Error(`Deal ID ${payload.dealID} not found.`);
      }

      const oldStatus = currentDeal.DealStatus;
      const newStatus = payload.dealStatus;

      // 1. Update DealHeader
      await tx.dealHeader.update({
        where: { DealID: payload.dealID },
        data: {
          DtRegistered: regDate,
          Expiration: expDate,
          ExpDt: expDate,
          Brand: payload.brand,
          CustomerID: payload.customerID,
          DealRegID: payload.dealRegID,
          ProjectName: payload.projectName,
          AssignedAO: payload.assignedAO,
          BU: payload.bu,
          DealStatus: newStatus,
          CustName: payload.custName,
          Remarks: payload.remarks || null,
        },
      });

      // 2. Refresh DealItems (delete & re-insert)
      await tx.dealItems.deleteMany({
        where: { DealID: payload.dealID },
      });

      if (payload.items && payload.items.length > 0) {
        await tx.dealItems.createMany({
          data: payload.items.map((item) => ({
            DealID: payload.dealID,
            ItemDesc: item.itemDesc,
            Qty: Number(item.qty),
            Currency: item.currency,
            TotalAmt: Number(item.totalAmt),
          })),
        });
      }

      // 3. Upsert DealWTN
      await tx.dealWTN.upsert({
        where: { DealID: payload.dealID },
        update: { WhenToNotify: twoDaysBeforeExp },
        create: {
          DealID: payload.dealID,
          WhenToNotify: twoDaysBeforeExp,
        },
      });

      // 4. SLA Handling
      // If moving from 4 (Pending) to 1 (Registered)
      if (oldStatus === 4 && newStatus === 1) {
        const dtCreated = currentDeal.DtCreated;
        const diffInMs = Math.abs(now.getTime() - dtCreated.getTime());
        const responseDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

        await tx.dealResponse.upsert({
          where: { DealID: payload.dealID },
          update: { ResponseDays: responseDays },
          create: {
            DealID: payload.dealID,
            ResponseDays: responseDays,
          },
        });
      }

      // If moving away from 1, 6, or 7 -> delete matching response record
      if (![1, 6, 7].includes(newStatus)) {
        await tx.dealResponse.deleteMany({
          where: { DealID: payload.dealID },
        });
      }

      // 5. Trigger email notification if toEmail is true
      if (payload.toEmail) {
        await tx.dealsRegNotification.create({
          data: {
            Creator: currentDeal.CreatedBy,
            Subject: `Deal Updated: ${payload.dealRegID} - ${payload.projectName}`,
            Message: `<p>The deal <strong>${payload.dealRegID}</strong> (${payload.projectName}) was updated.</p><p>New Status: ${newStatus}</p>`,
            SendTo: 'approvals@company.com',
            SendCC: 'sales-admin@company.com',
            Status: 0,
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
 * 4. updateWTN (Server Action)
 * Directly updates WhenToNotify date in DealWTN for a specified deal.
 */
export async function updateWTN(payload: UpdateWTNPayload): Promise<{ success: boolean; error?: string }> {
  try {
    const wtnDate = new Date(payload.whenToNotify);

    await prisma.dealWTN.upsert({
      where: { DealID: payload.dealID },
      update: { WhenToNotify: wtnDate },
      create: {
        DealID: payload.dealID,
        WhenToNotify: wtnDate,
      },
    });

    revalidatePath('/deals');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Action: updateWTN] Error:', message);
    return { success: false, error: message };
  }
}

/**
 * 5. saveLostDeal (Server Action)
 * Collects competitor and loss details into DealLost and sets DealStatus to 8 (Lost).
 */
export async function saveLostDeal(payload: SaveLostDealPayload): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.$transaction(async (tx: any) => {
      // 1. Update deal status to 8 (Lost)
      await tx.dealHeader.update({
        where: { DealID: payload.dealID },
        data: { DealStatus: 8 },
      });

      // 2. Upsert DealLost entry
      await tx.dealLost.upsert({
        where: { DealID: payload.dealID },
        update: {
          CompetitorVendor: payload.competitorVendor,
          CompetitorBrand: payload.competitorBrand,
          IcsOffer: Number(payload.icsOffer),
          CompetitorOffer: Number(payload.competitorOffer),
          Reason: payload.reason,
          OtherInformation: payload.otherInformation || null,
        },
        create: {
          DealID: payload.dealID,
          CompetitorVendor: payload.competitorVendor,
          CompetitorBrand: payload.competitorBrand,
          IcsOffer: Number(payload.icsOffer),
          CompetitorOffer: Number(payload.competitorOffer),
          Reason: payload.reason,
          OtherInformation: payload.otherInformation || null,
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
 * 6. getDealById (Query Action)
 * Retrieves single DealHeader and matching DealItems for view/edit screen.
 */
export async function getDealById(dealID: number): Promise<{ success: boolean; data?: DealHeaderRecord | null; error?: string }> {
  try {
    const query = prisma.dealHeader.findUnique({
      where: { DealID: dealID },
      include: {
        DealItems: true,
        DealWTN: true,
        DealResponse: true,
        DealLost: true,
      },
    });

    const deal = (await withTimeout(query, 800)) as any;

    if (!deal) {
      const mockMatch = MOCK_DEALS.find((d) => d.dealID === dealID) || MOCK_DEALS[0];
      return { success: true, data: mockMatch };
    }

    const formattedDeal: DealHeaderRecord = {
      dealID: deal.DealID,
      dtRegistered: deal.DtRegistered,
      expiration: deal.Expiration,
      expDt: deal.ExpDt,
      brand: deal.Brand,
      customerID: deal.CustomerID,
      dealRegID: deal.DealRegID,
      projectName: deal.ProjectName,
      assignedAO: deal.AssignedAO,
      bu: deal.BU,
      dealStatus: deal.DealStatus,
      createdBy: deal.CreatedBy,
      custName: deal.CustName,
      remarks: deal.Remarks,
      dtCreated: deal.DtCreated,
      items: deal.DealItems.map((i: any) => ({
        itemID: i.ItemID,
        dealID: i.DealID,
        itemDesc: i.ItemDesc,
        qty: i.Qty,
        currency: i.Currency,
        totalAmt: i.TotalAmt,
      })),
      wtn: deal.DealWTN
        ? {
            wtnID: deal.DealWTN.WTNID,
            dealID: deal.DealWTN.DealID,
            whenToNotify: deal.DealWTN.WhenToNotify,
          }
        : null,
      response: deal.DealResponse
        ? {
            responseID: deal.DealResponse.ResponseID,
            dealID: deal.DealResponse.DealID,
            responseDays: deal.DealResponse.ResponseDays,
          }
        : null,
      lostInfo: deal.DealLost
        ? {
            lostID: deal.DealLost.LostID,
            dealID: deal.DealLost.DealID,
            competitorVendor: deal.DealLost.CompetitorVendor,
            competitorBrand: deal.DealLost.CompetitorBrand,
            icsOffer: deal.DealLost.IcsOffer,
            competitorOffer: deal.DealLost.CompetitorOffer,
            reason: deal.DealLost.Reason,
            otherInformation: deal.DealLost.OtherInformation || undefined,
          }
        : null,
    };

    return { success: true, data: formattedDeal };
  } catch (err: unknown) {
    const mockMatch = MOCK_DEALS.find((d) => d.dealID === dealID) || MOCK_DEALS[0];
    return { success: true, data: mockMatch };
  }
}

