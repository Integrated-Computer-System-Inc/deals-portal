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
  const pendingNotifications = await prisma.dealsRegNotification.findMany({
    where: {
      Status: 0,
    },
    take: 50, // Batch limit per cycle
    orderBy: {
      DateCreated: 'asc',
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
        from: notification.Creator || process.env.EMAIL_FROM || 'noreply@dealsportal.com',
        to: notification.SendTo,
        cc: notification.SendCC || undefined,
        bcc: notification.SendBCC || undefined,
        subject: notification.Subject,
        html: notification.Message,
      });

      // Update notification record in DB (Status = 1, DateSent = GETDATE())
      await prisma.dealsRegNotification.update({
        where: {
          NotificationID: notification.NotificationID,
        },
        data: {
          Status: 1,
          DateSent: new Date(),
        },
      });

      results.successCount++;
      results.details.push({
        notificationID: notification.NotificationID,
        recipient: notification.SendTo,
        status: 'sent',
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[EmailWorker] Failed sending notification ID ${notification.NotificationID}:`, errorMsg);
      results.failureCount++;
      results.details.push({
        notificationID: notification.NotificationID,
        recipient: notification.SendTo,
        status: 'failed',
        error: errorMsg,
      });
    }
  }

  return results;
}
