import { prisma } from '@my-app/database';
import { ACCOUNT_ROLE_REGISTRY } from './roles';
import { getAppsDevBccEmails } from './email-config';

export interface DealEmailRecipients {
  sendTo: string;
  sendCC: string;
  sendBCC: string;
  toEmailList: string[];
  ccEmailList: string[];
  bccEmailList: string[];
}

/**
 * Resolves the designated BU Head email for a given Business Unit name/code
 */
export function resolveBuHeadEmail(buName: string = ''): string | null {
  const cleanBu = (buName || '').trim().toUpperCase();
  if (!cleanBu) return null;

  // 1. Search in ACCOUNT_ROLE_REGISTRY for matching BU
  for (const config of Object.values(ACCOUNT_ROLE_REGISTRY)) {
    if (
      config.role === 'bu' &&
      config.assignedBUs.some((b) => b.toUpperCase() === cleanBu)
    ) {
      if (config.email && config.email.trim()) {
        return config.email.trim().toLowerCase();
      }
    }
  }

  return null;
}

/**
 * Resolves static/registry Admin and Admin Assistant emails
 */
export function resolveAdminAndAssistantEmails(): { adminEmail: string; aaEmail: string } {
  let adminEmail = 'asy-lu@ics.com.ph';
  let aaEmail = 'afrancisco@ics.com.ph';

  for (const config of Object.values(ACCOUNT_ROLE_REGISTRY)) {
    if (config.role === 'admin' && config.email) {
      adminEmail = config.email.trim().toLowerCase();
    }
    if (config.role === 'aa' && config.email) {
      aaEmail = config.email.trim().toLowerCase();
    }
  }

  return { adminEmail, aaEmail };
}

/**
 * Comprehensive Recipient Routing Engine:
 * - TO: Assigned Account Officer (AO)
 * - CC: Deal BU Head + Admin (Adeliana Sy-Lu) + Admin Assistant (Athena Francisco)
 * - BCC: AppsDev IT Team (dramos, bcandelaria, jdoremon, jesurena, mescario)
 *
 * @param assignedAO Name or domain account of assigned AO (DealHeader.AssignedAO)
 * @param bu Business Unit code/name (DealHeader.BU)
 */
export async function resolveDealEmailRecipients(
  assignedAO: string = '',
  bu: string = ''
): Promise<DealEmailRecipients> {
  let aoEmail = '';

  // 1. Resolve Assigned AO email from cdbAccounts
  try {
    const cleanAO = (assignedAO || '').trim();
    if (cleanAO) {
      const aoUser = await prisma.cdbAccounts.findFirst({
        where: {
          OR: [
            { AccountName: cleanAO },
            { DomainAccount: cleanAO },
            { NickName: cleanAO },
          ],
          Email: { not: '' },
        },
        select: { Email: true },
      });

      if (aoUser?.Email && aoUser.Email.trim()) {
        aoEmail = aoUser.Email.trim().toLowerCase();
      }
    }
  } catch (err) {
    console.warn('[resolveDealEmailRecipients] Error querying AO email from cdbAccounts:', err);
  }

  // AO Fallback if not found in cdbAccounts
  if (!aoEmail && assignedAO) {
    const sanitized = assignedAO.replace(/[^a-zA-Z0-9]/g, '.').toLowerCase();
    aoEmail = `${sanitized}@ics.com.ph`;
  }

  // 2. Resolve BU Head email
  let buHeadEmail = resolveBuHeadEmail(bu);

  // Fallback: Query cdbAccounts for AccountGroup = bu
  if (!buHeadEmail && bu) {
    try {
      const buUser = await prisma.cdbAccounts.findFirst({
        where: {
          AccountGroup: bu,
          AccountType: { not: 'CUSTOMER' },
          Email: { not: '' },
        },
        select: { Email: true },
      });
      if (buUser?.Email && buUser.Email.trim()) {
        buHeadEmail = buUser.Email.trim().toLowerCase();
      }
    } catch (err) {
      console.warn('[resolveDealEmailRecipients] Error querying BU Head email from cdbAccounts:', err);
    }
  }

  // 3. Resolve Admin and AA emails
  const { adminEmail, aaEmail } = resolveAdminAndAssistantEmails();

  // 4. Construct CC List: BU Head + Admin + Admin Assistant + any MANAGEMENT_CC_EMAILS
  const ccSet = new Set<string>();
  if (buHeadEmail) ccSet.add(buHeadEmail);
  if (adminEmail) ccSet.add(adminEmail);
  if (aaEmail) ccSet.add(aaEmail);

  // Optional management CC override from environment
  if (process.env.MANAGEMENT_CC_EMAILS) {
    process.env.MANAGEMENT_CC_EMAILS.split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
      .forEach((e) => ccSet.add(e));
  }

  // Do not duplicate AO in CC if AO is also in CC
  if (aoEmail) {
    ccSet.delete(aoEmail);
  }

  // 5. Construct BCC List: AppsDev Team
  const bccList = getAppsDevBccEmails();

  const toList = aoEmail ? [aoEmail] : [];
  const ccList = Array.from(ccSet);

  return {
    sendTo: toList.join(', '),
    sendCC: ccList.join(', '),
    sendBCC: bccList.join(', '),
    toEmailList: toList,
    ccEmailList: ccList,
    bccEmailList: bccList,
  };
}
