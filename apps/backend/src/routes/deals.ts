import { Router, Request, Response } from 'express';
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
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// All deals routes require authentication
router.use(authenticateJWT);

/**
 * GET /api/deals/customers/search
 * Autocomplete customer accounts from cdbAccounts
 */
router.get('/customers/search', async (req: Request, res: Response) => {
  try {
    const query = (req.query.query as string) || '';
    if (!query || query.trim().length === 0) {
      return res.json({ success: true, data: [] });
    }

    const accounts = await prisma.cdbAccounts.findMany({
      where: {
        OR: [
          { AccountName: { contains: query } },
          { AccountIDNo: { contains: query } },
          { AccountGroup: { contains: query } },
        ],
      },
      take: 20,
    });

    const formatted = accounts.map((acc) => ({
      customerID: acc.AccountIDNo || `CUST-${acc.AccountID}`,
      custName: acc.AccountName,
      bu: acc.AccountGroup || 'BU1',
      assignedAO: acc.AccountName || acc.DomainAccount,
    }));

    res.json({ success: true, data: formatted });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Route: GET /api/deals/customers/search] Error:', message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/deals
 * Scoped deal listing — applies role-based access restrictions.
 * Query params: userRole, accountName, accountGroup
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const filter: ScopedDealsFilter = {
      userRole: (req.query.userRole as string) as ScopedDealsFilter['userRole'] || req.user!.role,
      accountName: (req.query.accountName as string) || req.user!.AccountName,
      accountGroup: (req.query.accountGroup as string) || req.user!.AccountGroup,
    };

    const whereClause: Record<string, unknown> = {};

    if (filter.userRole === 'ao' && filter.accountName) {
      whereClause.AssignedAO = filter.accountName;
    } else if (filter.userRole === 'bu_admin' && filter.accountGroup) {
      whereClause.BU = filter.accountGroup;
    }
    // Admin has unrestricted access (empty whereClause)

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
        const amt = parseFloat(item.totalAmt || '0');
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
          qty: parseInt(i.qty || '1', 10),
          currency: i.currency || 'USD',
          totalAmt: parseFloat(i.totalAmt || '0'),
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
              responseDays: parseInt(deal.DealResponse.responseDays || '0', 10),
            }
          : null,
        lostInfo: deal.DealLost
          ? {
              lostID: deal.DealLost.dealID,
              dealID: deal.DealLost.dealID,
              competitorVendor: deal.DealLost.competitorVendor || '',
              competitorBrand: deal.DealLost.competitorBrand || '',
              icsOffer: parseFloat(deal.DealLost.icsOffer || '0'),
              competitorOffer: parseFloat(deal.DealLost.competitorOffer || '0'),
              reason: deal.DealLost.reason || '',
              otherInformation: deal.DealLost.otherInformation || undefined,
            }
          : null,
        aggregatedTotals: totalsByCurrency,
      };
    });

    res.json({ success: true, data: formattedDeals });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Route: GET /api/deals] Error:', message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/deals
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const payload: CreateDealPayload = req.body;
    const createdBy = req.user!.DomainAccount;

    const expDate = new Date(payload.expDt);
    const regDate = new Date(payload.dtRegistered);
    const now = new Date();

    const dealRegID = payload.dealRegID;

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
          createdBy: createdBy,
          custName: payload.custName,
          remarks: payload.remarks || null,
          dtCreated: now,
          dtValidTo: expDate,
        },
      });

      // 2. Loop and Insert DealItems
      let totalAmount = 0;
      if (payload.items && payload.items.length > 0) {
        await tx.dealItems.createMany({
          data: payload.items.map((item) => {
            totalAmount += Number(item.totalAmt);
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

      // 3. Create DealWTN
      await tx.dealWTN.create({
        data: {
          dealID: header.dealID,
          whenToNotify: whenToNotify,
        },
      });

      // 4. Queue notification if BU != 'BU6'
      if (payload.BU !== 'BU6') {
        const aoUser = await tx.cdbAccounts.findFirst({ where: { AccountName: payload.AssignedAO } });
        const buHeadUser = await tx.cdbAccounts.findFirst({ where: { AccountGroup: payload.BU } });
        
        const aoEmail = aoUser?.Email || 'ao@company.com';
        const buHeadEmail = buHeadUser?.Email || 'bu-head@company.com';
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        
        const messageHtml = `
          <h2>New Deal Registered</h2>
          <p>A new deal has been registered for <strong>${payload.custName}</strong> by ${req.user!.AccountName}.</p>
          <ul>
            <li><strong>Project:</strong> ${payload.ProjectName}</li>
            <li><strong>Total Amount:</strong> ${totalAmount.toLocaleString()}</li>
            <li><strong>Brand:</strong> ${payload.brand}</li>
          </ul>
          <p><a href="${frontendUrl}/deals/${header.dealID}/edit">View Deal in Portal</a></p>
        `;

        await tx.deals_reg_notification.create({
          data: {
            creator: createdBy,
            subject: "Deal Registration: Created Deal Notification",
            message: messageHtml,
            sendTo: aoEmail,
            sendCC: null,
            sendBCC: null,
            status: 0, // Unsent
            dateCreated: now,
          },
        });
      }

      return header;
    });

    res.json({ success: true, dealID: result.dealID });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Route: POST /api/deals] Error:', message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * PUT /api/deals/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const dealID = parseInt(req.params.id, 10);
    const payload: UpdateDealPayload = { ...req.body, dealID };
    const updater = req.user!.DomainAccount;

    const expDate = new Date(payload.expDt);
    const regDate = new Date(payload.dtRegistered);
    const now = new Date();

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

      // 1. Update DealHeader
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

      // 2. Delete existing DealItems and Re-insert
      await tx.dealItems.deleteMany({
        where: { dealID: dealID },
      });

      let totalAmount = 0;
      if (payload.items && payload.items.length > 0) {
        await tx.dealItems.createMany({
          data: payload.items.map((item) => {
            totalAmount += Number(item.totalAmt);
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

      // 3. Recalculate DealWTN
      await tx.dealWTN.deleteMany({ where: { dealID: dealID } });
      await tx.dealWTN.create({
        data: { dealID: dealID, whenToNotify: twoDaysBeforeExp },
      });

      // 4. SLA Calculation logic
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

      const previousWasSlaTracked = ['1', '6', '7'].includes(oldStatus || '');
      const newIsSlaTracked = ['1', '6', '7'].includes(newStatus);

      if (previousWasSlaTracked && !newIsSlaTracked) {
        await tx.dealResponse.deleteMany({
          where: { dealID: dealID },
        });
      }

      // 5. Update Notification Logic
      if (payload.toEmail && payload.BU !== 'BU6') {
        const aoUser = await tx.cdbAccounts.findFirst({ where: { AccountName: payload.AssignedAO } });
        const buHeadUser = await tx.cdbAccounts.findFirst({ where: { AccountGroup: payload.BU } });
        
        const aoEmail = aoUser?.Email || 'ao@company.com';
        const buHeadEmail = buHeadUser?.Email || 'bu-head@company.com';
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        
        const messageHtml = `
          <h2>Deal Update Notification</h2>
          <p>The deal for <strong>${payload.custName}</strong> has been updated by ${req.user!.AccountName}.</p>
          <ul>
            <li><strong>Project:</strong> ${payload.ProjectName}</li>
            <li><strong>Total Amount:</strong> ${totalAmount.toLocaleString()}</li>
            <li><strong>Status Code:</strong> ${newStatus}</li>
          </ul>
          <p><a href="${frontendUrl}/deals/${dealID}/edit">View Deal in Portal</a></p>
        `;

        await tx.deals_reg_notification.create({
          data: {
            creator: updater,
            subject: `Deal Registration: Update Notification (${currentDeal.dealRegID})`,
            message: messageHtml,
            sendTo: aoEmail,
            sendCC: null,
            sendBCC: null,
            status: 0,
            dateCreated: now,
          },
        });
      }
    });

    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Route: PUT /api/deals/:id] Error:', message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * PUT /api/deals/:id/wtn
 */
router.put('/:id/wtn', async (req: Request, res: Response) => {
  try {
    const wtn_dealID = parseInt(req.params.id, 10);
    const payload: UpdateWTNPayload = { ...req.body, wtn_dealID };
    const wtnDate = new Date(payload.dtwtn);

    const existingWTN = await prisma.dealWTN.findUnique({ where: { dealID: wtn_dealID } });
    if (existingWTN) {
      await prisma.dealWTN.update({
        where: { dealID: wtn_dealID },
        data: { whenToNotify: wtnDate },
      });
    } else {
      await prisma.dealWTN.create({
        data: { dealID: wtn_dealID, whenToNotify: wtnDate },
      });
    }

    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Route: PUT /api/deals/:id/wtn] Error:', message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/deals/:id/lost
 */
router.post('/:id/lost', async (req: Request, res: Response) => {
  try {
    const dealID = parseInt(req.params.id, 10);
    const payload: SaveLostDealPayload = { ...req.body, dealID };

    await prisma.$transaction(async (tx) => {
      await tx.dealHeader.update({
        where: { dealID: dealID },
        data: { dealStatus: '8' },
      });

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

    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Route: POST /api/deals/:id/lost] Error:', message);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
