import { prisma } from '@my-app/database';
import { getAppsDevBccEmails } from './email-config';

export interface DealEmailRecipients {
  sendTo: string;
  sendCC: string;
  sendBCC: string;
  toEmailList: string[];
  ccEmailList: string[];
  bccEmailList: string[];
  aoNickName?: string;
}

/**
 * Resolves the designated BU Head email for a given Business Unit name/code.
 * NOTE: ACCOUNT_ROLE_REGISTRY was removed in favour of dynamic DB roles.
 * This function now always returns null; BU Head emails should be resolved
 * via a live cdbAccounts query when the feature is re-enabled.
 */
export function resolveBuHeadEmail(_buName: string = ''): string | null {
  // BU head lookup via registry removed — use DB query when re-enabling CC logic.
  return null;
}

/**
 * Returns the default Admin and Admin Assistant emails.
 * NOTE: ACCOUNT_ROLE_REGISTRY was removed; these are hardcoded production defaults.
 */
export function resolveAdminAndAssistantEmails(): { adminEmail: string; aaEmail: string } {
  return {
    adminEmail: 'asy-lu@ics.com.ph',
    aaEmail: 'afrancisco@ics.com.ph',
  };
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
  let aoNickName = '';

  // 1. Resolve Assigned AO email and NickName from cdbAccounts
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
        },
        select: { Email: true, NickName: true, AccountName: true },
      });

      if (aoUser?.Email && aoUser.Email.trim()) {
        aoEmail = aoUser.Email.trim().toLowerCase();
      }
      if (aoUser?.NickName && aoUser.NickName.trim()) {
        aoNickName = aoUser.NickName.trim();
      } else if (aoUser?.AccountName && aoUser.AccountName.trim()) {
        aoNickName = aoUser.AccountName.trim().split(' ')[0];
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
  if (!aoNickName && assignedAO) {
    aoNickName = assignedAO.split(' ')[0];
  }

  // 2. Resolve BU Head email (Commented out for QA testing)
  // let buHeadEmail = resolveBuHeadEmail(bu);
  // if (!buHeadEmail && bu) {
  //   try {
  //     const buUser = await prisma.cdbAccounts.findFirst({
  //       where: {
  //         AccountGroup: bu,
  //         AccountType: { not: 'CUSTOMER' },
  //         Email: { not: '' },
  //       },
  //       select: { Email: true },
  //     });
  //     if (buUser?.Email && buUser.Email.trim()) {
  //       buHeadEmail = buUser.Email.trim().toLowerCase();
  //     }
  //   } catch (err) {
  //     console.warn('[resolveDealEmailRecipients] Error querying BU Head email from cdbAccounts:', err);
  //   }
  // }

  // 3. Resolve Admin and AA emails (Commented out for QA testing)
  // const { adminEmail, aaEmail } = resolveAdminAndAssistantEmails();

  // 4. Construct CC List (Hardcoded for manual QA testing)
  const ccSet = new Set<string>();
  // if (buHeadEmail) ccSet.add(buHeadEmail);
  // if (adminEmail) ccSet.add(adminEmail);
  // if (aaEmail) ccSet.add(aaEmail);

  // Hardcoded QA CC email(s) - modify as needed
  ccSet.add('bcandelaria@ics.com.ph');

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

  // 5. Construct BCC List (Hardcoded for manual QA testing)
  // const bccList = getAppsDevBccEmails();
  const bccList = [
    'jdoremon@ics.com.ph', // Hardcoded QA BCC email(s) - modify as needed
  ];

  const toList = aoEmail ? [aoEmail] : [];
  const ccList = Array.from(ccSet);

  return {
    sendTo: toList.join(', '),
    sendCC: ccList.join(', '),
    sendBCC: bccList.join(', '),
    toEmailList: toList,
    ccEmailList: ccList,
    bccEmailList: bccList,
    aoNickName: aoNickName || assignedAO,
  };
}
