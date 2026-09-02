import { prisma } from '@my-app/database';
import { getAppsDevBccEmails } from './email-config';
import { normalizeBrandName, getBrandVariations } from './brandUtils';

export interface DealEmailRecipients {
  sendTo: string;
  sendCC: string;
  sendBCC: string;
  toEmailList: string[];
  ccEmailList: string[];
  bccEmailList: string[];
  aoNickName?: string;
  isDevMode?: boolean;
  subjectPrefix?: string;
}

interface CachedEmailConfig {
  mode: 'DEV' | 'LIVE';
  devRecipients: string[];
  devCCRecipients: string[];
  devBCCRecipients: string[];
  liveCCRecipients: string[];
  liveBCCRecipients: string[];
  includeBuHead: boolean;
  includeAdminAndAA: boolean;
  includeBrandPm: boolean;
  timestamp: number;
}

let cachedConfig: CachedEmailConfig | null = null;
const CACHE_TTL_MS = 15000; // 15 seconds

export function invalidateEmailConfigCache() {
  cachedConfig = null;
}

/**
 * Loads the active email configuration from dbo.app_email_config (cached)
 */
async function loadActiveEmailConfig(): Promise<CachedEmailConfig> {
  const now = Date.now();
  if (cachedConfig && now - cachedConfig.timestamp < CACHE_TTL_MS) {
    return cachedConfig;
  }

  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT TOP 1 [mode], [devRecipients], [devCCRecipients], [devBCCRecipients], 
                   [liveCCRecipients], [liveBCCRecipients], [includeBuHead], [includeAdminAndAA],
                   [includeBrandPm]
      FROM [dbo].[app_email_config]
      WHERE [id] = 1;
    `);

    if (rows && rows.length > 0) {
      const row = rows[0];
      const extractEmails = (jsonStr?: string | null): string[] => {
        if (!jsonStr || !jsonStr.trim()) return [];
        try {
          const parsed = JSON.parse(jsonStr);
          if (Array.isArray(parsed)) {
            return parsed
              .map((item) => (typeof item === 'string' ? item : item.email))
              .filter((e) => Boolean(e) && typeof e === 'string' && e.includes('@'))
              .map((e) => e.trim().toLowerCase());
          }
        } catch {}
        return [];
      };

      const devList = extractEmails(row.devRecipients);
      const devCCList = extractEmails(row.devCCRecipients);
      const devBCCList = extractEmails(row.devBCCRecipients);
      const ccList = extractEmails(row.liveCCRecipients);
      const bccList = extractEmails(row.liveBCCRecipients);

      cachedConfig = {
        mode: (String(row.mode || 'DEV').toUpperCase() === 'LIVE' ? 'LIVE' : 'DEV') as 'DEV' | 'LIVE',
        devRecipients: devList.length > 0 ? devList : getAppsDevBccEmails(),
        devCCRecipients: devCCList,
        devBCCRecipients: devBCCList,
        liveCCRecipients: ccList,
        liveBCCRecipients: bccList.length > 0 ? bccList : getAppsDevBccEmails(),
        includeBuHead: row.includeBuHead !== false && row.includeBuHead !== 0,
        includeAdminAndAA: row.includeAdminAndAA !== false && row.includeAdminAndAA !== 0,
        includeBrandPm: row.includeBrandPm !== false && row.includeBrandPm !== 0,
        timestamp: now,
      };

      return cachedConfig;
    }
  } catch (err) {
    console.warn('[email-recipients] Could not query dbo.app_email_config, using fallback defaults:', err);
  }

  // Fallback defaults if table is not yet created or unreachable
  cachedConfig = {
    mode: 'DEV',
    devRecipients: getAppsDevBccEmails(),
    devCCRecipients: [],
    devBCCRecipients: [],
    liveCCRecipients: [],
    liveBCCRecipients: getAppsDevBccEmails(),
    includeBuHead: true,
    includeAdminAndAA: true,
    includeBrandPm: true,
    timestamp: now,
  };

  return cachedConfig;
}

/**
 * Resolves the designated BU Head email for a given Business Unit name/code from cdbAccounts.
 */
export async function resolveBuHeadEmail(buName: string = ''): Promise<string | null> {
  const cleanBU = (buName || '').trim();
  if (!cleanBU) return null;

  try {
    const buUser = await prisma.cdbAccounts.findFirst({
      where: {
        AccountGroup: cleanBU,
        AccountType: { not: 'CUSTOMER' },
        Email: { not: '' },
      },
      select: { Email: true },
    });
    if (buUser?.Email && buUser.Email.trim()) {
      return buUser.Email.trim().toLowerCase();
    }
  } catch (err) {
    console.warn('[resolveBuHeadEmail] Error querying BU Head email from cdbAccounts:', err);
  }

  return null;
}

/**
 * Resolves the assigned Product Manager (PM) email(s) for a given deal brand.
 * Checks BOTH sources:
 * 1. dbo.DealBrands table (matching brand -> assignedPM, resolved to email via cdbAccounts or Users)
 * 2. dbo.Users table (users with UserRole='pm' and AssignedBrand matching the brand)
 */
export async function resolveBrandPmEmails(dealBrand: string = ''): Promise<string[]> {
  const cleanBrand = (dealBrand || '').trim();
  if (!cleanBrand) return [];

  const canonicalBrand = normalizeBrandName(cleanBrand).toUpperCase();
  const variations = getBrandVariations(cleanBrand).map((b) => b.toUpperCase());
  const brandKeywords = Array.from(new Set([cleanBrand.toUpperCase(), canonicalBrand, ...variations]));

  const matchedEmails = new Set<string>();

  // Source 1: Check dbo.DealBrands table
  try {
    const dealBrandRows = await prisma.dealBrands.findMany({
      select: { brand: true, assignedPM: true },
    });

    for (const row of dealBrandRows) {
      if (!row.brand || !row.assignedPM) continue;
      const rowBrandUpper = row.brand.trim().toUpperCase();
      const rowCanonical = normalizeBrandName(row.brand).toUpperCase();

      const isBrandMatch = brandKeywords.some(
        (kw) => kw === rowBrandUpper || kw === rowCanonical || rowBrandUpper.includes(kw) || kw.includes(rowBrandUpper)
      );

      if (isBrandMatch) {
        // assignedPM might be a comma-separated list of names, domain accounts, or emails
        const pmIdentifiers = row.assignedPM.split(',').map((s) => s.trim()).filter(Boolean);
        for (const pmIdent of pmIdentifiers) {
          if (pmIdent.includes('@')) {
            matchedEmails.add(pmIdent.toLowerCase().trim());
          } else {
            // Lookup in cdbAccounts or Users (by name, domain, nickname, email, AccountID, AccountIDNo, or AONumber)
            try {
              const isNumeric = /^\d+$/.test(pmIdent);
              const numVal = isNumeric ? parseInt(pmIdent, 10) : undefined;

              const cdbConditions: any[] = [
                { AccountName: pmIdent },
                { DomainAccount: pmIdent },
                { NickName: pmIdent },
                { AccountIDNo: pmIdent },
                { Email: pmIdent },
              ];
              if (numVal !== undefined) {
                cdbConditions.push({ AccountID: numVal });
                cdbConditions.push({ AONumber: numVal });
              }

              const account = await prisma.cdbAccounts.findFirst({
                where: { OR: cdbConditions },
                select: { Email: true },
              });

              if (account?.Email && account.Email.includes('@')) {
                matchedEmails.add(account.Email.toLowerCase().trim());
              } else {
                const userConditions: any[] = [
                  { AccountName: pmIdent },
                  { Email: pmIdent },
                ];
                if (numVal !== undefined) {
                  userConditions.push({ AccountID: numVal });
                }

                const user = await prisma.users.findFirst({
                  where: { OR: userConditions },
                  select: { Email: true },
                });
                if (user?.Email && user.Email.includes('@')) {
                  matchedEmails.add(user.Email.toLowerCase().trim());
                }
              }
            } catch (err) {
              console.warn(`[resolveBrandPmEmails] Error looking up PM identifier "${pmIdent}":`, err);
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[resolveBrandPmEmails] Error querying dbo.DealBrands:', err);
  }

  // Source 2: Check dbo.Users table with UserRole='pm' and AssignedBrand
  try {
    const pmUsers = await prisma.$queryRawUnsafe<any[]>(`
      SELECT [AccountID], [AccountName], [Email], [UserRole], [AssignedBrand]
      FROM [dbo].[Users]
      WHERE [UserRole] LIKE 'pm%'
        AND [Email] IS NOT NULL
        AND LEN(LTRIM(RTRIM([Email]))) > 3
        AND [Email] LIKE '%@%';
    `);

    for (const pm of pmUsers) {
      const explicitBrandStr = (pm.AssignedBrand || '').toUpperCase();
      const roleStr = (pm.UserRole || '').toUpperCase();
      
      const assignedTokens = [
        ...explicitBrandStr.split(',').map((s: string) => s.trim()).filter(Boolean),
        ...(roleStr.includes(':') ? roleStr.split(':')[1].split(',').map((s: string) => s.trim()).filter(Boolean) : []),
      ];

      const hasMatch = assignedTokens.some((assigned) =>
        brandKeywords.some((keyword) => assigned === keyword || assigned.includes(keyword) || keyword.includes(assigned))
      );

      if (hasMatch && pm.Email) {
        matchedEmails.add(String(pm.Email).trim().toLowerCase());
      }
    }
  } catch (err) {
    console.warn('[resolveBrandPmEmails] Error querying PM users from dbo.Users:', err);
  }

  return Array.from(matchedEmails).filter((e) => e && e.includes('@'));
}

/**
 * Comprehensive Recipient Routing Engine:
 * - DEV MODE:
 *   - TO: Configured Dev TO recipients (devRecipients)
 *   - CC: Configured Dev CC recipients (devCCRecipients)
 *   - BCC: Configured Dev BCC recipients (devBCCRecipients)
 *   - Subject tagged with [DEV MODE - Intended for: AO Name].
 * - LIVE MODE:
 *   - TO: Assigned Account Officer (AO)
 *   - CC: BU Head (if enabled) + Admin & AA (if enabled) + Brand PM (if enabled) + Custom Live CCs
 *   - BCC: Global BCC list (IT Team)
 *
 * @param assignedAO Name or domain account of assigned AO (DealHeader.AssignedAO)
 * @param bu Business Unit code/name (DealHeader.BU)
 * @param brand Brand name (DealHeader.brand)
 */
export async function resolveDealEmailRecipients(
  assignedAO: string = '',
  bu: string = '',
  brand: string = ''
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

  const activeConfig = await loadActiveEmailConfig();

  // ==========================================
  // CASE A: DEV MODE (Testing / QA Safeguard)
  // ==========================================
  if (activeConfig.mode === 'DEV') {
    const devToList = activeConfig.devRecipients.length > 0
      ? activeConfig.devRecipients
      : getAppsDevBccEmails();
    const devCCList = activeConfig.devCCRecipients || [];
    const devBCCList = activeConfig.devBCCRecipients || [];

    const intendedName = aoNickName || assignedAO || 'Unknown AO';

    return {
      sendTo: devToList.join(', '),
      sendCC: devCCList.join(', '),
      sendBCC: devBCCList.join(', '),
      toEmailList: devToList,
      ccEmailList: devCCList,
      bccEmailList: devBCCList,
      aoNickName: intendedName,
      isDevMode: true,
      subjectPrefix: `[DEV MODE - Intended for: ${intendedName}] `,
    };
  }

  // ==========================================
  // CASE B: LIVE MODE (Production Execution)
  // ==========================================
  const ccSet = new Set<string>();

  // 1. Resolve BU Head if enabled
  if (activeConfig.includeBuHead && bu) {
    const buHeadEmail = await resolveBuHeadEmail(bu);
    if (buHeadEmail) {
      ccSet.add(buHeadEmail);
    }
  }

  // 2. Include default Admin & Admin Assistant if enabled
  if (activeConfig.includeAdminAndAA) {
    ccSet.add('asy-lu@ics.com.ph');
    ccSet.add('afrancisco@ics.com.ph');
  }

  // 3. Resolve Assigned Brand PM(s) if enabled
  if (activeConfig.includeBrandPm && brand) {
    const pmEmails = await resolveBrandPmEmails(brand);
    pmEmails.forEach((pmEmail) => {
      if (pmEmail && pmEmail.includes('@')) {
        ccSet.add(pmEmail.toLowerCase().trim());
      }
    });
  }

  // 4. Add configured Live CC recipients
  if (activeConfig.liveCCRecipients && activeConfig.liveCCRecipients.length > 0) {
    activeConfig.liveCCRecipients.forEach((email) => {
      if (email && email.includes('@')) {
        ccSet.add(email.toLowerCase().trim());
      }
    });
  }

  // 5. Optional management CC override from environment
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

  // 6. Construct BCC List (IT Team / configured Live BCC)
  const bccList = activeConfig.liveBCCRecipients.length > 0
    ? activeConfig.liveBCCRecipients
    : getAppsDevBccEmails();

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
    isDevMode: false,
    subjectPrefix: '',
  };
}
