import { prisma } from '@my-app/database';
import { getMailTransporter, getSenderAddress } from './email-config';
import { resolveDealEmailRecipients } from './email-recipients';
import {
  generateExpiringDealEmail,
  ExpirationWarningLevel,
} from './email-templates';

// Re-export recipient resolver for backwards compatibility
export { resolveDealEmailRecipients };

export interface NotificationResult {
  processedCount: number;
  successCount: number;
  failureCount: number;
  details: {
    notificationID: number;
    recipient: string;
    status: 'sent' | 'failed';
    error?: string;
  }[];
}

export interface ExpiringScanResult {
  scannedCount: number;
  enqueuedCount: number;
  updatedWtnCount: number;
  details: {
    dealID: number;
    dealRegID: string;
    custName: string;
    daysRemaining: number;
    warningLevel: ExpirationWarningLevel;
    status: 'enqueued' | 'skipped_duplicate' | 'error';
    error?: string;
  }[];
}

export interface UnifiedCronResult {
  timestamp: string;
  expiringScan: ExpiringScanResult;
  emailDispatch: NotificationResult;
}

/**
 * Scan deals table for upcoming expirations, evaluate milestone thresholds
 * (30d, 15d, 7d, <=3d daily), enqueue notifications into dbo.deals_reg_notification,
 * and update dbo.dealWTN.whenToNotify to the next scheduled alert date.
 */
export async function scanExpiringDeals(): Promise<ExpiringScanResult> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

  const results: ExpiringScanResult = {
    scannedCount: 0,
    enqueuedCount: 0,
    updatedWtnCount: 0,
    details: [],
  };

  try {
    // 1. Fetch active deals with an expiration date, excluding BU6 and closed/lost/expired statuses
    // Status '6': Closed, '7': Lost, '8': Expired/Cancelled
    const activeDeals = await prisma.dealHeader.findMany({
      where: {
        OR: [
          { expDt: { not: null } },
          { dtValidTo: { not: null } },
        ],
        BU: { not: 'BU6' },
        dealStatus: { notIn: ['6', '7', '8'] },
      },
      include: {
        DealWTN: true,
      },
      take: 200,
    });

    results.scannedCount = activeDeals.length;

    for (const deal of activeDeals) {
      const expirationVal = deal.expDt || deal.dtValidTo;
      if (!expirationVal) continue;

      const expDate = new Date(expirationVal);
      const diffMs = expDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // If already past expiration, do not send upcoming expiration alerts
      if (daysRemaining < 0) {
        continue;
      }

      // Check whenToNotify timestamp
      const targetNotifyDate = deal.DealWTN?.whenToNotify ? new Date(deal.DealWTN.whenToNotify) : null;
      
      // Determine if deal is eligible for scanning now:
      // Either whenToNotify is not set, or whenToNotify <= now
      const isDueForCheck = !targetNotifyDate || targetNotifyDate.getTime() <= now.getTime();
      if (!isDueForCheck) {
        continue;
      }

      // 2. Classify warning level and calculate next alert milestone
      let warningLevel: ExpirationWarningLevel | null = null;
      let nextWhenToNotify: Date | null = null;

      if (daysRemaining > 15 && daysRemaining <= 30) {
        warningLevel = '30d';
        // Next warning at 15 days before expiry
        nextWhenToNotify = new Date(expDate.getTime() - 15 * 24 * 60 * 60 * 1000);
      } else if (daysRemaining > 7 && daysRemaining <= 15) {
        warningLevel = '15d';
        // Next warning at 7 days before expiry
        nextWhenToNotify = new Date(expDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (daysRemaining > 3 && daysRemaining <= 7) {
        warningLevel = '7d';
        // Next warning at 3 days before expiry
        nextWhenToNotify = new Date(expDate.getTime() - 3 * 24 * 60 * 60 * 1000);
      } else if (daysRemaining >= 0 && daysRemaining <= 3) {
        warningLevel = 'daily';
        // Next warning tomorrow at same time
        nextWhenToNotify = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      }

      // If more than 30 days remaining, schedule initial check at 30 days before expiry
      if (daysRemaining > 30) {
        nextWhenToNotify = new Date(expDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // 3. If a warning milestone was reached, check for duplicate and enqueue notification
      if (warningLevel) {
        try {
          const dealRef = deal.dealRegID || `ID-${deal.dealID}`;
          
          // Check if an alert for this deal was already generated today in dbo.deals_reg_notification
          const existingToday = await prisma.deals_reg_notification.findFirst({
            where: {
              dateCreated: { gte: startOfToday },
              subject: { contains: dealRef },
            },
          });

          if (existingToday) {
            results.details.push({
              dealID: deal.dealID,
              dealRegID: dealRef,
              custName: deal.custName || '',
              daysRemaining,
              warningLevel,
              status: 'skipped_duplicate',
            });
          } else {
            // Resolve TO, CC, BCC
            const recipients = await resolveDealEmailRecipients(deal.AssignedAO || '', deal.BU || '');

            // Generate HTML template
            const { subject, message } = generateExpiringDealEmail({
              dealID: deal.dealID,
              dealRegID: deal.dealRegID,
              custName: deal.custName || '',
              projectName: deal.ProjectName,
              brand: deal.brand || '',
              bu: deal.BU || '',
              assignedAO: deal.AssignedAO || '',
              expirationDate: expDate,
              daysRemaining,
              warningLevel,
            });

            // Enqueue into dbo.deals_reg_notification
            await prisma.$transaction(async (tx) => {
              const maxNotifResult = await tx.$queryRawUnsafe<any[]>(
                `SELECT ISNULL(MAX(email_id), 0) AS maxId FROM [dbo].[deals_reg_notification]`
              );
              const nextNotifId = Number(maxNotifResult?.[0]?.maxId || 0) + 1;

              await tx.$executeRawUnsafe(
                `INSERT INTO [dbo].[deals_reg_notification] (
                  [email_id], [creator], [subject], [message], [sendTo], [sendCC], [sendBCC], [dateCreated], [status]
                ) VALUES (@P1, @P2, @P3, @P4, @P5, @P6, @P7, @P8, @P9)`,
                nextNotifId,
                'SYSTEM_CRON',
                subject,
                message,
                recipients.sendTo,
                recipients.sendCC,
                recipients.sendBCC,
                now,
                0
              );
            });

            results.enqueuedCount++;
            results.details.push({
              dealID: deal.dealID,
              dealRegID: dealRef,
              custName: deal.custName || '',
              daysRemaining,
              warningLevel,
              status: 'enqueued',
            });
          }
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error(`[scanExpiringDeals] Failed enqueuing alert for deal ${deal.dealID}:`, errorMsg);
          results.details.push({
            dealID: deal.dealID,
            dealRegID: deal.dealRegID || `ID-${deal.dealID}`,
            custName: deal.custName || '',
            daysRemaining,
            warningLevel,
            status: 'error',
            error: errorMsg,
          });
        }
      }

      // 4. Update dealWTN with next alert milestone date
      if (nextWhenToNotify) {
        try {
          if (deal.DealWTN) {
            await prisma.dealWTN.update({
              where: { dealID: deal.dealID },
              data: { whenToNotify: nextWhenToNotify },
            });
          } else {
            const maxWtnResult = await prisma.$queryRawUnsafe<any[]>(
              `SELECT ISNULL(MAX(id), 0) AS maxId FROM [dbo].[dealWTN]`
            );
            const nextWtnId = Number(maxWtnResult?.[0]?.maxId || 0) + 1;

            await prisma.dealWTN.create({
              data: {
                id: nextWtnId,
                dealID: deal.dealID,
                whenToNotify: nextWhenToNotify,
              },
            });
          }
          results.updatedWtnCount++;
        } catch (wtnErr) {
          console.warn(`[scanExpiringDeals] Error updating dealWTN for deal ${deal.dealID}:`, wtnErr);
        }
      }
    }
  } catch (err) {
    console.error('[scanExpiringDeals] Global scanner execution error:', err);
  }

  return results;
}

/**
 * Scheduled task that reads deals_reg_notification where status = 0,
 * sends emails via SMTP, and marks them status = 1 (Sent) or status = 2 (Failed).
 */
export async function processNotifications(): Promise<NotificationResult> {
  const transporter = getMailTransporter();
  const senderAddress = getSenderAddress();

  const pendingNotifications = await prisma.deals_reg_notification.findMany({
    where: {
      status: 0,
    },
    take: 50, // Batch limit per cycle
    orderBy: {
      dateCreated: 'asc',
    },
  });

  const results: NotificationResult = {
    processedCount: pendingNotifications.length,
    successCount: 0,
    failureCount: 0,
    details: [],
  };

  for (const notification of pendingNotifications) {
    try {
      // Validate recipients
      const toAddresses = (notification.sendTo || '')
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);

      if (toAddresses.length === 0) {
        throw new Error('Notification has no valid "to" recipient specified');
      }

      await transporter.sendMail({
        from: senderAddress,
        to: notification.sendTo || undefined,
        cc: notification.sendCC || undefined,
        bcc: notification.sendBCC || undefined,
        subject: notification.subject || 'Deal Registration Notification',
        html: notification.message || '',
      });

      // Mark as Sent
      await prisma.deals_reg_notification.update({
        where: {
          email_id: notification.email_id,
        },
        data: {
          status: 1,
          dateSent: new Date(),
        },
      });

      results.successCount++;
      results.details.push({
        notificationID: notification.email_id,
        recipient: notification.sendTo || '',
        status: 'sent',
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(
        `[NotificationWorker] Failed sending notification ID ${notification.email_id}:`,
        errorMsg
      );

      // Flag as Failed (status = 2) to prevent infinite poison-pill retry loops
      try {
        await prisma.deals_reg_notification.update({
          where: {
            email_id: notification.email_id,
          },
          data: {
            status: 2,
          },
        });
      } catch (updateErr) {
        console.error(`[NotificationWorker] Failed updating status=2 for ID ${notification.email_id}:`, updateErr);
      }

      results.failureCount++;
      results.details.push({
        notificationID: notification.email_id,
        recipient: notification.sendTo || '',
        status: 'failed',
        error: errorMsg,
      });
    }
  }

  return results;
}

/**
 * Unified entrypoint for the cron worker:
 * 1. Scans expiring deals and enqueues warning emails into deals_reg_notification
 * 2. Dispatches all pending queue items via SMTP
 */
export async function runNotificationCron(): Promise<UnifiedCronResult> {
  const expiringScan = await scanExpiringDeals();
  const emailDispatch = await processNotifications();

  return {
    timestamp: new Date().toISOString(),
    expiringScan,
    emailDispatch,
  };
}
