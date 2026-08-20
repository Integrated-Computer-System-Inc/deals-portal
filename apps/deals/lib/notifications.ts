import { prisma } from '@my-app/database';
import nodemailer from 'nodemailer';

/**
 * Configure Nodemailer transport using SMTP credentials with fallback for development/testing
 */
const smtpHost = process.env.MAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = parseInt(process.env.MAIL_PORT || process.env.SMTP_PORT || '587', 10);
const smtpUser = process.env.MAIL_USERNAME || process.env.SMTP_USER || 'noreply-newsite@ics.com.ph';
const smtpPass = process.env.MAIL_PASSWORD || process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '';

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: process.env.SMTP_SECURE === 'true' || smtpPort === 465,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

export interface NotificationResult {
  processedCount: number;
  successCount: number;
  failureCount: number;
  details: { notificationID: number; recipient: string; status: 'sent' | 'failed'; error?: string }[];
}

/**
 * processNotifications:
 * Scheduled task that reads deals_reg_notification where status = 0,
 * sends emails via SMTP, and marks them status = 1 with dateSent = now()
 */
export async function processNotifications(): Promise<NotificationResult> {
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
      await transporter.sendMail({
        from: notification.creator || process.env.EMAIL_FROM || 'noreply@dealsportal.com',
        to: notification.sendTo || undefined,
        cc: notification.sendCC || undefined,
        bcc: notification.sendBCC || 'dramos@ics.com.ph',
        subject: notification.subject || 'Deal Registration Notification',
        html: notification.message || '',
      });

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
      console.error(`[NotificationWorker] Failed sending notification ID ${notification.email_id}:`, errorMsg);
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
 * Resolve recipient emails from cdbAccounts
 */
export async function resolveDealEmailRecipients(assignedAO: string = '', bu: string = '') {
  let aoEmail = '';
  let buHeadEmail = '';

  try {
    if (assignedAO) {
      const aoUser = await prisma.cdbAccounts.findFirst({
        where: {
          OR: [
            { AccountName: assignedAO },
            { DomainAccount: assignedAO },
          ],
        },
      });
      if (aoUser?.Email) aoEmail = aoUser.Email;
    }

    if (bu) {
      const buUser = await prisma.cdbAccounts.findFirst({
        where: {
          AccountGroup: bu,
          AccountType: { not: 'CUSTOMER' },
        },
      });
      if (buUser?.Email) buHeadEmail = buUser.Email;
    }
  } catch (err) {
    console.warn('[resolveDealEmailRecipients] Error resolving emails from cdbAccounts:', err);
  }

  // Fallbacks if not found
  if (!aoEmail) aoEmail = `${(assignedAO || 'ao').replace(/\s+/g, '.').toLowerCase()}@ics.com.ph`;
  if (!buHeadEmail) buHeadEmail = `${(bu || 'bu').toLowerCase()}-head@ics.com.ph`;

  const fixedManagementCC = (process.env.MANAGEMENT_CC_EMAILS || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  const combinedCC = Array.from(new Set([buHeadEmail, ...fixedManagementCC])).join(', ');

  return {
    sendTo: aoEmail,
    sendCC: combinedCC,
    sendBCC: 'dramos@ics.com.ph',
  };
}
