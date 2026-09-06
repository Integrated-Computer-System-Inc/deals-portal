'use server';

import { prisma } from '@my-app/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { resolveDealEmailRecipients } from '@/lib/email-recipients';
import { getMailTransporter } from '@/lib/email-config';
import { generateFollowUpEmailHtml } from '@/lib/email-templates';
import { logActivity } from '@/lib/activity-logger';

export interface FollowUpDealContext {
  dealID: number;
  dealRegID: string | null;
  custName: string;
  projectName: string | null;
  brand: string | null;
  bu: string | null;
  assignedAO: string | null;
  expiration: string | null;
  expDt: Date | null;
  dtRegistered: Date | null;
  dealStatus: string | null;
  totalAmount: number;
  currency: string;
}

export interface FollowUpRecipientsContext {
  to: string[];
  cc: string[];
  bcc: string[];
  aoNickName: string;
  isDevMode: boolean;
}

export interface GetFollowUpContextResponse {
  success: boolean;
  data?: {
    deal: FollowUpDealContext;
    recipients: FollowUpRecipientsContext;
    currentUser: {
      name: string;
      email: string;
      avatar?: string | null;
      role?: string;
    };
  };
  error?: string;
}

export interface SendFollowUpPayload {
  dealID: number;
  subject: string;
  message: string;
  toList: string[];
  ccList: string[];
  bccList: string[];
}

export interface SendFollowUpResponse {
  success: boolean;
  message?: string;
  error?: string;
}

const AUTHORIZED_ROLES = ['admin', 'aa', 'ITadmin'];

/**
 * Fetches context for composing a follow-up email on a specific deal:
 * deal information, default recipients (TO, CC, BCC), and sender profile.
 */
export async function getFollowUpDealContext(
  dealID: number
): Promise<GetFollowUpContextResponse> {
  try {
    const id = Number(dealID);
    if (!id || isNaN(id)) {
      return { success: false, error: 'Invalid deal ID provided.' };
    }

    const session = await getServerSession(authOptions);
    const sessionRole = (session?.user as any)?.role as string | undefined;

    if (!sessionRole || !AUTHORIZED_ROLES.includes(sessionRole)) {
      return {
        success: false,
        error: 'Access Denied: Only Admin Assistant, Admin, or IT Admin can send deal follow-ups.',
      };
    }

    const deal = await prisma.dealHeader.findUnique({
      where: { dealID: id },
      include: {
        DealItems: true,
      },
    });

    if (!deal) {
      return { success: false, error: 'Deal not found.' };
    }

    // Calculate total amount & resolve currency
    let totalAmount = 0;
    let currency = 'PHP';
    if (Array.isArray(deal.DealItems) && deal.DealItems.length > 0) {
      deal.DealItems.forEach((item) => {
        const amt = parseFloat(item.totalAmt || '0') || 0;
        totalAmount += amt;
        if (item.currency && item.currency.trim()) {
          currency = item.currency.trim().toUpperCase();
        }
      });
    }

    // Resolve recipients using notification routing engine
    const recipients = await resolveDealEmailRecipients(
      deal.AssignedAO || '',
      deal.BU || '',
      deal.brand || ''
    );

    const currentUserName =
      (session?.user as any)?.AccountName ||
      session?.user?.name ||
      'Portal Administrator';
    const currentUserEmail =
      (session?.user as any)?.Email || session?.user?.email || '';
    const currentUserAvatar =
      (session?.user as any)?.GAvatar ||
      session?.user?.image ||
      null;

    // Guarantee current sender's email in CC list so they receive a copy and thread in Gmail
    const resolvedCCList = [...recipients.ccEmailList];
    if (currentUserEmail && currentUserEmail.includes('@')) {
      const normalizedCurrent = currentUserEmail.toLowerCase().trim();
      if (!resolvedCCList.some((e) => e.toLowerCase().trim() === normalizedCurrent)) {
        resolvedCCList.unshift(normalizedCurrent);
      }
    }

    return {
      success: true,
      data: {
        deal: {
          dealID: deal.dealID,
          dealRegID: deal.dealRegID,
          custName: deal.custName || 'Unknown Customer',
          projectName: deal.ProjectName,
          brand: deal.brand,
          bu: deal.BU,
          assignedAO: deal.AssignedAO,
          expiration: deal.expiration,
          expDt: deal.expDt,
          dtRegistered: deal.dtRegistered,
          dealStatus: deal.dealStatus,
          totalAmount,
          currency,
        },
        recipients: {
          to: recipients.toEmailList,
          cc: resolvedCCList,
          bcc: recipients.bccEmailList,
          aoNickName: recipients.aoNickName || deal.AssignedAO || 'Team',
          isDevMode: Boolean(recipients.isDevMode),
        },
        currentUser: {
          name: currentUserName,
          email: currentUserEmail,
          avatar: currentUserAvatar,
          role: sessionRole,
        },
      },
    };
  } catch (error: any) {
    console.error('[Action: getFollowUpDealContext] Error:', error);
    return {
      success: false,
      error: error?.message || 'Failed to load follow-up details.',
    };
  }
}

/**
 * Sends a branded follow-up email for a specific deal and audits the activity.
 */
export async function sendFollowUpEmail(
  payload: SendFollowUpPayload
): Promise<SendFollowUpResponse> {
  try {
    const session = await getServerSession(authOptions);
    const sessionRole = (session?.user as any)?.role as string | undefined;

    if (!sessionRole || !AUTHORIZED_ROLES.includes(sessionRole)) {
      return {
        success: false,
        error: 'Access Denied: Only Admin Assistant, Admin, or IT Admin can send deal follow-ups.',
      };
    }

    // Validate inputs
    const subject = (payload.subject || '').trim();
    if (!subject) {
      return { success: false, error: 'Email subject cannot be empty.' };
    }

    const message = (payload.message || '').trim();
    if (!message) {
      return { success: false, error: 'Follow-up message body cannot be empty.' };
    }

    const cleanToList = (payload.toList || [])
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e && e.includes('@'));

    if (cleanToList.length === 0) {
      return {
        success: false,
        error: 'At least one valid recipient (TO) email address is required.',
      };
    }

    const cleanCcList = (payload.ccList || [])
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e && e.includes('@'));

    let cleanBccList = (payload.bccList || [])
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e && e.includes('@'));

    const id = Number(payload.dealID);
    if (!id || isNaN(id)) {
      return { success: false, error: 'Invalid deal ID provided.' };
    }

    const deal = await prisma.dealHeader.findUnique({
      where: { dealID: id },
      include: {
        DealItems: true,
      },
    });

    if (!deal) {
      return { success: false, error: 'Target deal was not found in the database.' };
    }

    // If client omitted BCC, silently fallback to system IT BCC list
    if (cleanBccList.length === 0) {
      try {
        const defaultRecipients = await resolveDealEmailRecipients(
          deal.AssignedAO || '',
          deal.BU || '',
          deal.brand || ''
        );
        cleanBccList = defaultRecipients.bccEmailList || [];
      } catch {
        // Continue if fallback resolution fails
      }
    }

    // Calculate totals
    let totalAmount = 0;
    let currency = 'PHP';
    if (Array.isArray(deal.DealItems)) {
      deal.DealItems.forEach((item) => {
        const amt = parseFloat(item.totalAmt || '0') || 0;
        totalAmount += amt;
        if (item.currency && item.currency.trim()) {
          currency = item.currency.trim().toUpperCase();
        }
      });
    }

    const senderName =
      (session?.user as any)?.AccountName ||
      session?.user?.name ||
      'Portal Administrator';
    const senderEmail =
      (session?.user as any)?.Email || session?.user?.email || '';
    const senderAvatar =
      (session?.user as any)?.GAvatar ||
      session?.user?.image ||
      null;

    // Guarantee that sender is included in CC so she receives a copy in Gmail for the thread
    if (senderEmail && senderEmail.includes('@')) {
      const normalizedSender = senderEmail.trim().toLowerCase();
      if (!cleanCcList.includes(normalizedSender)) {
        cleanCcList.unshift(normalizedSender);
      }
    }

    // Render HTML template
    const emailData = generateFollowUpEmailHtml({
      dealID: deal.dealID,
      dealRegID: deal.dealRegID,
      custName: deal.custName || 'Unknown Customer',
      projectName: deal.ProjectName,
      brand: deal.brand || 'N/A',
      bu: deal.BU || 'N/A',
      assignedAO: deal.AssignedAO || 'Unassigned',
      aoNickName: deal.AssignedAO ? deal.AssignedAO.split(' ')[0] : 'Team',
      currency,
      regDate: deal.dtRegistered,
      expDate: deal.expDt || deal.expiration,
      totalAmount,
      dealStatus: deal.dealStatus,
      customMessage: message,
      senderName,
      senderAvatar,
      sentAt: new Date(),
    });

    // Configure Mail Transport & Send
    const transporter = getMailTransporter();
    const systemSmtpUser = process.env.SMTP_USER || 'noreply-newsite@ics.com.ph';

    await transporter.sendMail({
      from: `"${senderName}" <${systemSmtpUser}>`,
      replyTo: senderEmail || undefined,
      to: cleanToList.join(', '),
      cc: cleanCcList.length > 0 ? cleanCcList.join(', ') : undefined,
      bcc: cleanBccList.length > 0 ? cleanBccList.join(', ') : undefined,
      subject,
      html: emailData.message,
    });

    // Audit Trail: Record activity log
    try {
      await logActivity({
        dealID: deal.dealID,
        dealRegID: deal.dealRegID,
        custName: deal.custName,
        projectName: deal.ProjectName,
        action: 'FOLLOW_UP_SENT',
        fieldName: 'Email Follow-Up',
        newValue: `Sent to: ${cleanToList.join(', ')}`,
        remarks: `Subject: ${subject} | CC: ${cleanCcList.join(', ')}`,
        performedBy:
          (session?.user as any)?.DomainAccount ||
          senderEmail ||
          'UNKNOWN',
        performedByName: senderName,
        performedByRole: sessionRole,
        impersonatedBy: (session?.user as any)?.isImpersonating
          ? (session?.user as any)?.originalAdminEmail
          : null,
      });
    } catch (logErr) {
      console.warn('[sendFollowUpEmail] Activity log warning:', logErr);
    }

    return {
      success: true,
      message: `Follow-up email successfully sent to ${cleanToList.join(', ')}.`,
    };
  } catch (error: any) {
    console.error('[Action: sendFollowUpEmail] Error:', error);
    return {
      success: false,
      error: error?.message || 'An unexpected error occurred while sending the email.',
    };
  }
}
