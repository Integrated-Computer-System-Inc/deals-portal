import nodemailer from 'nodemailer';

/**
 * Standard IT AppsDev department email distribution list for BCC
 */
export const DEFAULT_APPSDEV_BCC_EMAILS = [
  'dramos@ics.com.ph',
  'bcandelaria@ics.com.ph',
  'jdoremon@ics.com.ph',
  'jesurena@ics.com.ph',
  'mescario@ics.com.ph',
];

/**
 * Helper to get the resolved AppsDev BCC list with optional environment variable override
 */
export function getAppsDevBccEmails(): string[] {
  const envBcc = process.env.APPSDEV_BCC_EMAILS || process.env.NOTIFICATION_BCC_EMAILS;
  if (envBcc && envBcc.trim()) {
    return envBcc
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  }
  return DEFAULT_APPSDEV_BCC_EMAILS;
}

/**
 * Helper to format RFC-compliant sender header
 * e.g. "NoReply: Deals Registration" <noreply-newsite@ics.com.ph>
 */
export function getSenderAddress(): string {
  const fromName = process.env.SMTP_FROM || 'NoReply: Deals Registration';
  const fromEmail = process.env.SMTP_USER || 'noreply-newsite@ics.com.ph';

  // If fromName already includes an email format (e.g. "Name <email@ics.com.ph>"), return as is
  if (fromName.includes('<') && fromName.includes('>')) {
    return fromName;
  }

  // If fromName is a plain email, return it directly
  if (fromName.includes('@') && !fromName.includes(':')) {
    return fromName;
  }

  return `"${fromName.trim()}" <${fromEmail.trim()}>`;
}

/**
 * Get Nodemailer SMTP Transporter configured from environment variables
 */
export function getMailTransporter(): nodemailer.Transporter {
  const smtpHost = process.env.MAIL_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(
    process.env.MAIL_PORT || process.env.SMTP_PORT || '587',
    10
  );
  const smtpSecure =
    process.env.SMTP_SECURE === 'true' || smtpPort === 465;
  const smtpUser = process.env.SMTP_USER || '';
  const smtpPass = process.env.SMTP_PASSWORD || '';

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth:
      smtpUser && smtpPass
        ? {
            user: smtpUser,
            pass: smtpPass,
          }
        : undefined,
    tls: {
      // Allow self-signed or relay certificates if needed
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  });
}

