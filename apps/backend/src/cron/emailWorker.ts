import { prisma } from '@my-app/database';
import nodemailer from 'nodemailer';

/**
 * Configure Nodemailer transport using SMTP credentials or mock ethereal account
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'ethereal_user',
    pass: process.env.SMTP_PASS || 'ethereal_pass',
  },
});

export interface EmailWorkerResult {
  processedCount: number;
  successCount: number;
  failureCount: number;
  details: { notificationID: number; recipient: string; status: 'sent' | 'failed'; error?: string }[];
}

/**
 * Background Email Worker Task
 * Fetches unsent rows (Status == 0) from DealsRegNotification,
 * dispatches emails via Nodemailer/SMTP, and updates Status = 1 with DateSent = GETDATE()
 */
export async function processPendingEmails(): Promise<EmailWorkerResult> {
  const pendingNotifications = await prisma.deals_reg_notification.findMany({
    where: {
      status: 0,
    },
    take: 50, // Batch limit per cycle
    orderBy: {
      dateCreated: 'asc',
    },
  });

  const results: EmailWorkerResult = {
    processedCount: pendingNotifications.length,
    successCount: 0,
    failureCount: 0,
    details: [],
  };

  for (const notification of pendingNotifications) {
    try {
      // Dispatch email payload
      await transporter.sendMail({
        from: notification.creator || process.env.EMAIL_FROM || 'noreply@dealsportal.com',
        to: notification.sendTo || undefined,
        cc: notification.sendCC || undefined,
        bcc: notification.sendBCC || undefined,
        subject: notification.subject || 'Notification',
        html: notification.message || '',
      });

      // Update notification record in DB (status = 1, dateSent = GETDATE())
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
      console.error(`[EmailWorker] Failed sending notification ID ${notification.email_id}:`, errorMsg);
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
