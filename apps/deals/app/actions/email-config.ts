'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@my-app/database';
import { revalidatePath } from 'next/cache';
import { runEmailConfigMigration } from '@/lib/db-migration';
import { invalidateEmailConfigCache } from '@/lib/email-recipients';
import { getMailTransporter, getSenderAddress } from '@/lib/email-config';

export interface EmailRecipientItem {
  accountId?: number;
  name: string;
  email: string;
  domainAccount?: string;
  accountGroup?: string;
}

export interface AppEmailConfigRecord {
  id: number;
  mode: 'DEV' | 'LIVE';
  devRecipients: EmailRecipientItem[];
  devCCRecipients: EmailRecipientItem[];
  devBCCRecipients: EmailRecipientItem[];
  liveCCRecipients: EmailRecipientItem[];
  liveBCCRecipients: EmailRecipientItem[];
  includeBuHead: boolean;
  includeAdminAndAA: boolean;
  includeBrandPm: boolean;
  updatedBy: string;
  updatedAt: string;
  tableExists?: boolean;
}

/**
 * Ensures caller is an authenticated IT Administrator
 */
async function assertAdminSession() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  const role = user?.role;

  if (!session || role !== 'ITadmin') {
    throw new Error('Unauthorized: Only IT Administrators can access Email Configuration.');
  }

  return { session, user };
}

/**
 * Safe JSON parser for recipient lists
 */
function parseRecipients(jsonStr?: string | null): EmailRecipientItem[] {
  if (!jsonStr || !jsonStr.trim()) return [];
  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => {
        if (typeof item === 'string') {
          return { name: item.split('@')[0], email: item.toLowerCase().trim() };
        }
        return {
          accountId: item.accountId ? Number(item.accountId) : undefined,
          name: item.name || item.email?.split('@')[0] || 'User',
          email: String(item.email || '').toLowerCase().trim(),
          domainAccount: item.domainAccount,
          accountGroup: item.accountGroup,
        };
      }).filter((r) => r.email && r.email.includes('@'));
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Check if dbo.app_email_config table exists in database
 */
async function checkTableExists(): Promise<boolean> {
  try {
    const res = await prisma.$queryRawUnsafe<any[]>(`
      SELECT COUNT(*) AS cnt
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'app_email_config';
    `);
    return Number(res?.[0]?.cnt || 0) > 0;
  } catch {
    return false;
  }
}

/**
 * Retrieves the current Email Configuration
 */
export async function getEmailConfig(): Promise<{
  success: boolean;
  data?: AppEmailConfigRecord;
  error?: string;
}> {
  try {
    await assertAdminSession();
    
    // Attempt auto-migration if possible
    await runEmailConfigMigration().catch(() => {});

    const tableExists = await checkTableExists();

    if (!tableExists) {
      return {
        success: true,
        data: {
          id: 1,
          mode: 'DEV',
          devRecipients: [],
          devCCRecipients: [],
          devBCCRecipients: [],
          liveCCRecipients: [],
          liveBCCRecipients: [],
          includeBuHead: true,
          includeAdminAndAA: true,
          includeBrandPm: true,
          updatedBy: 'SYSTEM',
          updatedAt: new Date().toISOString(),
          tableExists: false,
        },
      };
    }

    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT TOP 1 [id], [mode], [devRecipients], [devCCRecipients], [devBCCRecipients],
                   [liveCCRecipients], [liveBCCRecipients], [includeBuHead], [includeAdminAndAA], 
                   [includeBrandPm], [updatedBy], [updatedAt]
      FROM [dbo].[app_email_config]
      WHERE [id] = 1;
    `);

    if (!rows || rows.length === 0) {
      return {
        success: true,
        data: {
          id: 1,
          mode: 'DEV',
          devRecipients: [],
          devCCRecipients: [],
          devBCCRecipients: [],
          liveCCRecipients: [],
          liveBCCRecipients: [],
          includeBuHead: true,
          includeAdminAndAA: true,
          includeBrandPm: true,
          updatedBy: 'SYSTEM',
          updatedAt: new Date().toISOString(),
          tableExists: true,
        },
      };
    }

    const row = rows[0];
    const record: AppEmailConfigRecord = {
      id: Number(row.id || 1),
      mode: (String(row.mode || 'DEV').toUpperCase() === 'LIVE' ? 'LIVE' : 'DEV') as 'DEV' | 'LIVE',
      devRecipients: parseRecipients(row.devRecipients),
      devCCRecipients: parseRecipients(row.devCCRecipients),
      devBCCRecipients: parseRecipients(row.devBCCRecipients),
      liveCCRecipients: parseRecipients(row.liveCCRecipients),
      liveBCCRecipients: parseRecipients(row.liveBCCRecipients),
      includeBuHead: row.includeBuHead !== false && row.includeBuHead !== 0,
      includeAdminAndAA: row.includeAdminAndAA !== false && row.includeAdminAndAA !== 0,
      includeBrandPm: row.includeBrandPm !== false && row.includeBrandPm !== 0,
      updatedBy: String(row.updatedBy || 'SYSTEM'),
      updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString(),
      tableExists: true,
    };

    return { success: true, data: record };
  } catch (err: any) {
    console.warn('[Action: getEmailConfig] Non-fatal load fallback:', err.message);
    return {
      success: true,
      data: {
        id: 1,
        mode: 'DEV',
        devRecipients: [],
        devCCRecipients: [],
        devBCCRecipients: [],
        liveCCRecipients: [],
        liveBCCRecipients: [],
        includeBuHead: true,
        includeAdminAndAA: true,
        includeBrandPm: true,
        updatedBy: 'SYSTEM',
        updatedAt: new Date().toISOString(),
        tableExists: false,
      },
    };
  }
}

/**
 * Saves updated Email Configuration
 */
export async function saveEmailConfig(payload: {
  mode: 'DEV' | 'LIVE';
  devRecipients: EmailRecipientItem[];
  devCCRecipients: EmailRecipientItem[];
  devBCCRecipients: EmailRecipientItem[];
  liveCCRecipients: EmailRecipientItem[];
  liveBCCRecipients: EmailRecipientItem[];
  includeBuHead: boolean;
  includeAdminAndAA: boolean;
  includeBrandPm: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await assertAdminSession();

    // Ensure table exists & has updated columns
    await runEmailConfigMigration().catch(() => {});
    const tableExists = await checkTableExists();

    if (!tableExists) {
      return {
        success: false,
        error: 'The database table dbo.app_email_config has not been created yet. Please check database connection.',
      };
    }

    const updatedBy = user.AccountName || user.DomainAccount || user.Email || 'ITadmin';
    const now = new Date();

    const devJson = JSON.stringify(payload.devRecipients || []);
    const devCCJson = JSON.stringify(payload.devCCRecipients || []);
    const devBCCJson = JSON.stringify(payload.devBCCRecipients || []);
    const liveCCJson = JSON.stringify(payload.liveCCRecipients || []);
    const liveBCCJson = JSON.stringify(payload.liveBCCRecipients || []);
    const mode = payload.mode === 'LIVE' ? 'LIVE' : 'DEV';
    const incBu = payload.includeBuHead ? 1 : 0;
    const incAdmin = payload.includeAdminAndAA ? 1 : 0;
    const incPm = payload.includeBrandPm ? 1 : 0;

    await prisma.$executeRawUnsafe(
      `
      IF EXISTS (SELECT 1 FROM [dbo].[app_email_config] WHERE [id] = 1)
      BEGIN
        UPDATE [dbo].[app_email_config]
        SET
          [mode] = @P1,
          [devRecipients] = @P2,
          [devCCRecipients] = @P3,
          [devBCCRecipients] = @P4,
          [liveCCRecipients] = @P5,
          [liveBCCRecipients] = @P6,
          [includeBuHead] = @P7,
          [includeAdminAndAA] = @P8,
          [includeBrandPm] = @P9,
          [updatedBy] = @P10,
          [updatedAt] = @P11
        WHERE [id] = 1;
      END
      ELSE
      BEGIN
        INSERT INTO [dbo].[app_email_config] (
          [id], [mode], [devRecipients], [devCCRecipients], [devBCCRecipients],
          [liveCCRecipients], [liveBCCRecipients], [includeBuHead], [includeAdminAndAA], 
          [includeBrandPm], [updatedBy], [updatedAt]
        ) VALUES (
          1, @P1, @P2, @P3, @P4, @P5, @P6, @P7, @P8, @P9, @P10, @P11
        );
      END
    `,
      mode,
      devJson,
      devCCJson,
      devBCCJson,
      liveCCJson,
      liveBCCJson,
      incBu,
      incAdmin,
      incPm,
      updatedBy,
      now
    );

    invalidateEmailConfigCache();
    revalidatePath('/admin/emails');

    return { success: true };
  } catch (err: any) {
    console.error('[Action: saveEmailConfig] Error:', err);
    return { success: false, error: err.message || 'Failed to save email configuration.' };
  }
}

/**
 * Search cdbAccounts directory for user selection
 */
export async function searchCdbAccountsForEmail(searchQuery: string): Promise<{
  success: boolean;
  data: EmailRecipientItem[];
  error?: string;
}> {
  try {
    await assertAdminSession();

    const term = (searchQuery || '').trim();
    if (!term) {
      // Return top active internal accounts
      const topAccounts = await prisma.$queryRawUnsafe<any[]>(`
        SELECT TOP 20 [AccountID], [AccountName], [Email], [DomainAccount], [AccountGroup], [NickName]
        FROM [dbo].[cdbAccounts]
        WHERE [AccountType] <> 'CUSTOMER' 
          AND [Email] IS NOT NULL 
          AND LEN(LTRIM(RTRIM([Email]))) > 3
          AND [Email] LIKE '%@%'
          AND ([isActive] = 1 OR [isActive] IS NULL)
        ORDER BY [AccountName] ASC;
      `);

      return {
        success: true,
        data: topAccounts.map((acc) => ({
          accountId: Number(acc.AccountID),
          name: acc.NickName ? `${acc.AccountName} (${acc.NickName})` : acc.AccountName,
          email: String(acc.Email).toLowerCase().trim(),
          domainAccount: acc.DomainAccount,
          accountGroup: acc.AccountGroup,
        })),
      };
    }

    const tokens = term.split(/\s+/).filter(Boolean);
    const tokenClauses = tokens.map((token) => {
      const clean = token.replace(/'/g, "''");
      return `(
        [AccountName] LIKE N'%${clean}%'
        OR [DomainAccount] LIKE N'%${clean}%'
        OR [Email] LIKE N'%${clean}%'
        OR [NickName] LIKE N'%${clean}%'
        OR [AccountGroup] LIKE N'%${clean}%'
      )`;
    }).join(' AND ');

    const results = await prisma.$queryRawUnsafe<any[]>(`
      SELECT TOP 25 [AccountID], [AccountName], [Email], [DomainAccount], [AccountGroup], [NickName]
      FROM [dbo].[cdbAccounts]
      WHERE [AccountType] <> 'CUSTOMER'
        AND [Email] IS NOT NULL 
        AND LEN(LTRIM(RTRIM([Email]))) > 3
        AND [Email] LIKE '%@%'
        AND (${tokenClauses})
      ORDER BY [AccountName] ASC;
    `);

    return {
      success: true,
      data: results.map((acc) => ({
        accountId: Number(acc.AccountID),
        name: acc.NickName ? `${acc.AccountName} (${acc.NickName})` : acc.AccountName,
        email: String(acc.Email).toLowerCase().trim(),
        domainAccount: acc.DomainAccount,
        accountGroup: acc.AccountGroup,
      })),
    };
  } catch (err: any) {
    console.error('[Action: searchCdbAccountsForEmail] Error:', err);
    return { success: false, data: [], error: err.message || 'Failed to query directory.' };
  }
}

import { getScenarioEmailTemplate } from '@/lib/email-templates';

/**
 * Sends a test notification email using the active configuration and selected scenario template
 */
export async function sendTestNotificationEmail(scenario: string = 'CREATE'): Promise<{
  success: boolean;
  message?: string;
  recipients?: { to: string[]; cc: string[]; bcc: string[]; mode: string };
  error?: string;
}> {
  try {
    const { user } = await assertAdminSession();
    const configRes = await getEmailConfig();
    const config = configRes.data;

    if (!config) {
      throw new Error('Could not retrieve active email configuration.');
    }

    const transporter = getMailTransporter();
    const sender = getSenderAddress();

    let toEmails: string[] = [];
    let ccEmails: string[] = [];
    let bccEmails: string[] = [];

    if (config.mode === 'DEV') {
      toEmails = config.devRecipients.map((r) => r.email).filter(Boolean);
      ccEmails = (config.devCCRecipients || []).map((r) => r.email).filter(Boolean);
      bccEmails = (config.devBCCRecipients || []).map((r) => r.email).filter(Boolean);
    } else {
      toEmails = [user.Email || 'itadmin@ics.com.ph'];
      ccEmails = config.liveCCRecipients.map((r) => r.email).filter(Boolean);
      bccEmails = config.liveBCCRecipients.map((r) => r.email).filter(Boolean);
    }

    if (toEmails.length === 0) {
      throw new Error(
        config.mode === 'DEV'
          ? 'No Dev Mode TO recipients are configured. Please add at least one recipient.'
          : 'No valid recipient found to deliver the test message.'
      );
    }

    const template = getScenarioEmailTemplate(scenario || 'CREATE', {
      mode: config.mode,
      aoNickName: user.AccountName?.split(' ')[0] || 'User',
      triggeredBy: `${user.AccountName || 'IT Admin'} (${user.Email || 'No Email'})`,
      toEmails,
      ccEmails,
      bccEmails,
    });

    let finalSubject = template.subject;
    if (config.mode === 'DEV') {
      const intendedName = user.AccountName?.split(' ')[0] || 'AO';
      finalSubject = `[DEV MODE - Intended for: ${intendedName}] ${finalSubject}`;
    }

    await transporter.sendMail({
      from: sender,
      to: toEmails.join(', '),
      cc: ccEmails.length > 0 ? ccEmails.join(', ') : undefined,
      bcc: bccEmails.length > 0 ? bccEmails.join(', ') : undefined,
      subject: finalSubject,
      html: template.message,
    });

    return {
      success: true,
      message: `Test email (${scenario}) successfully sent in ${config.mode} mode!`,
      recipients: {
        to: toEmails,
        cc: ccEmails,
        bcc: bccEmails,
        mode: config.mode,
      },
    };
  } catch (err: any) {
    console.error('[Action: sendTestNotificationEmail] Error:', err);
    return { success: false, error: err.message || 'Failed to dispatch test email.' };
  }
}
