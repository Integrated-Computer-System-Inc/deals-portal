'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@my-app/database';
import { UserRole } from '@my-app/types';
import { revalidatePath } from 'next/cache';
import { resolveUserRoleAndBUs } from '@/lib/roles';
import { runUserTableMigration, hasAssignedColumns } from '@/lib/db-migration';
import { logActivity } from '@/lib/activity-logger';
import { serverCache } from '@/lib/serverCache';


export interface AdminUserRecord {
  AccountID: number;
  AccountName: string;
  Email: string;
  UserRole: UserRole;
  rawRoleString: string;
  AssignedBUs: string[];
  AssignedBrands: string[];
  GAvatar?: string | null;
  DomainAccount?: string;
  DirectoryAccountGroup?: string;
  DirectoryAccountType?: string;
  DirectoryIsActive?: number;
  LastLogin?: string | null;
  DtCreation: string;
  isSuperadmin: boolean;
}

export interface CdbDirectoryUser {
  AccountID: number;
  AccountName: string;
  Email: string;
  DomainAccount: string;
  AccountGroup: string;
  AccountType: string;
  isActive: number;
  alreadyRegistered: boolean;
  GAvatar?: string | null;
}

/**
 * Ensures caller is an authenticated IT Administrator
 */
async function assertAdminSession() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  const role = user?.role;

  if (!session || role !== 'ITadmin') {
    throw new Error('Unauthorized: Only IT Administrators can access User Management.');
  }

  return { session, user };
}

/**
 * Retrieves all registered users from dbo.Users, enriched with cdbAccounts directory details
 */
export async function getUsersList(): Promise<{ success: boolean; data: AdminUserRecord[]; error?: string }> {
  try {
    await assertAdminSession();
    await runUserTableMigration();
    const hasCols = await hasAssignedColumns();

    const selectQuery = hasCols
      ? `SELECT AccountID, AccountName, Email, UserRole, AssignedBU, AssignedBrand, LastLogin, DtCreation FROM [dbo].[Users] ORDER BY DtCreation DESC, AccountName ASC;`
      : `SELECT AccountID, AccountName, Email, UserRole, LastLogin, DtCreation FROM [dbo].[Users] ORDER BY DtCreation DESC, AccountName ASC;`;

    const dbUsers = await prisma.$queryRawUnsafe<any[]>(selectQuery);

    if (!dbUsers || dbUsers.length === 0) {
      return { success: true, data: [] };
    }

    const accountIds = dbUsers.map((u) => Number(u.AccountID)).filter((id) => !isNaN(id));
    const validEmails = dbUsers
      .map((u) => String(u.Email || '').trim().replace(/'/g, "''").toLowerCase())
      .filter((e) => e.length > 0);

    const whereClauses: string[] = [];
    if (accountIds.length > 0) {
      whereClauses.push(`AccountID IN (${accountIds.join(',')})`);
    }
    if (validEmails.length > 0) {
      whereClauses.push(`LOWER(LTRIM(RTRIM(Email))) IN (${validEmails.map((e) => `'${e}'`).join(',')})`);
    }

    // Fetch directory metadata from cdbAccounts
    let directoryAccounts: any[] = [];
    if (whereClauses.length > 0) {
      directoryAccounts = await prisma.$queryRawUnsafe<any[]>(`
        SELECT AccountID, AccountName, Email, DomainAccount, AccountGroup, AccountType, isActive, GAvatar 
        FROM [dbo].[cdbAccounts] 
        WHERE ${whereClauses.join(' OR ')};
      `);
    }

    const directoryMap = new Map<number, any>();
    const directoryEmailMap = new Map<string, any>();
    for (const acc of directoryAccounts) {
      directoryMap.set(Number(acc.AccountID), acc);
      if (acc.Email) {
        directoryEmailMap.set(String(acc.Email).trim().toLowerCase(), acc);
      }
    }

    const session = await getServerSession(authOptions);
    const sessionAvatar = (session?.user as any)?.GAvatar || session?.user?.image;
    const sessionEmail = String(session?.user?.email || '').toLowerCase().trim();
    const sessionAccountId = Number((session?.user as any)?.AccountID);

    const enrichedUsers: AdminUserRecord[] = dbUsers.map((u) => {
      const accountId = Number(u.AccountID);
      const userEmail = String(u.Email || '').trim().toLowerCase();
      const dir = directoryMap.get(accountId) || (userEmail ? directoryEmailMap.get(userEmail) : undefined);
      const rawRole = String(u.UserRole || 'ao');

      const resolved = resolveUserRoleAndBUs(
        accountId,
        u.Email,
        dir?.AccountGroup || 'HQ',
        dir?.AccountType || 'AO',
        dir?.isActive ?? 1,
        rawRole,
        u.AssignedBU || null,
        u.AssignedBrand || null
      );

      // Self-heal: If active logged-in user viewing has an avatar in session but cdbAccounts is empty, use sessionAvatar and sync
      let finalAvatar = dir?.GAvatar ? String(dir.GAvatar).trim() : null;
      if (!finalAvatar && sessionAvatar && (accountId === sessionAccountId || userEmail === sessionEmail)) {
        finalAvatar = sessionAvatar;
        const safeUrl = String(sessionAvatar).replace(/'/g, "''");
        prisma.$executeRawUnsafe(`
          UPDATE [dbo].[cdbAccounts]
          SET GAvatar = '${safeUrl}'
          WHERE AccountID = ${accountId} OR LOWER(LTRIM(RTRIM(Email))) = '${userEmail}';
        `).then(() => serverCache.delete('cdb_ao_avatars_map')).catch(() => {});
      }

      return {
        AccountID: accountId,
        AccountName: u.AccountName || dir?.AccountName || 'Unknown User',
        Email: u.Email || dir?.Email || '',
        UserRole: (resolved.role || 'ao') as UserRole,
        rawRoleString: rawRole,
        AssignedBUs: resolved.assignedBUs || [],
        AssignedBrands: resolved.assignedBrands || [],
        GAvatar: finalAvatar,
        DomainAccount: dir?.DomainAccount || '',
        DirectoryAccountGroup: dir?.AccountGroup || '',
        DirectoryAccountType: dir?.AccountType || '',
        DirectoryIsActive: dir?.isActive ?? 1,
        LastLogin: u.LastLogin ? new Date(u.LastLogin).toISOString() : null,
        DtCreation: u.DtCreation ? new Date(u.DtCreation).toISOString() : new Date().toISOString(),
        isSuperadmin: resolved.isITAdmin || [57845, 57846, 57732, 56395].includes(accountId),
      };
    });

    return { success: true, data: enrichedUsers };
  } catch (error: any) {
    console.error('[getUsersList] Error:', error);
    return { success: false, data: [], error: error.message || 'Failed to fetch users' };
  }
}

/**
 * Searches the corporate directory (cdbAccounts) for active employees
 */
export async function searchCdbDirectory(
  query: string
): Promise<{ success: boolean; data: CdbDirectoryUser[]; error?: string }> {
  try {
    await assertAdminSession();

    const trimmed = (query || '').trim().replace(/'/g, "''");
    if (!trimmed || trimmed.length < 2) {
      return { success: true, data: [] };
    }

    // Get list of currently registered user IDs
    const existingUsers = await prisma.$queryRawUnsafe<any[]>(`SELECT AccountID FROM [dbo].[Users]`);
    const registeredIds = new Set(existingUsers.map((u) => Number(u.AccountID)));

    const results = await prisma.$queryRawUnsafe<any[]>(`
      SELECT TOP 20 AccountID, AccountName, Email, DomainAccount, AccountGroup, AccountType, isActive, GAvatar 
      FROM [dbo].[cdbAccounts]
      WHERE isActive = 1
        AND (
          AccountName LIKE '%${trimmed}%'
          OR Email LIKE '%${trimmed}%'
          OR DomainAccount LIKE '%${trimmed}%'
          OR CAST(AccountID AS VARCHAR(20)) = '${trimmed}'
        )
      ORDER BY AccountName ASC;
    `);

    const formatted: CdbDirectoryUser[] = results.map((r) => ({
      AccountID: Number(r.AccountID),
      AccountName: String(r.AccountName || '').trim(),
      Email: String(r.Email || '').trim(),
      DomainAccount: String(r.DomainAccount || '').trim(),
      AccountGroup: String(r.AccountGroup || '').trim(),
      AccountType: String(r.AccountType || '').trim(),
      isActive: Number(r.isActive ?? 1),
      alreadyRegistered: registeredIds.has(Number(r.AccountID)),
      GAvatar: r.GAvatar || null,
    }));

    return { success: true, data: formatted };
  } catch (error: any) {
    console.error('[searchCdbDirectory] Error:', error);
    return { success: false, data: [], error: error.message || 'Directory search failed' };
  }
}

/**
 * Formats a string array into a comma-separated SQL-safe string for storage.
 */
function formatListForSql(items: string[] | undefined): string {
  if (!items || items.length === 0) return '';
  return items.map((s) => s.trim().toUpperCase()).filter(Boolean).join(',').replace(/'/g, "''");
}

/**
 * Adds a new user from cdbAccounts directory into dbo.Users
 */
export async function createUser(payload: {
  accountId: number;
  role: UserRole;
  assignedBUs?: string[];
  assignedBrands?: string[];
}): Promise<{ success: boolean; error?: string }> {
  try {
    await assertAdminSession();

    const { accountId, role, assignedBUs, assignedBrands } = payload;
    if (!accountId || isNaN(accountId)) {
      return { success: false, error: 'Invalid Account ID' };
    }

    // Verify user exists in cdbAccounts
    const cdbUser = await prisma.$queryRawUnsafe<any[]>(`
      SELECT TOP 1 AccountID, AccountName, Email, DomainAccount, AccountGroup, AccountType, isActive 
      FROM [dbo].[cdbAccounts] 
      WHERE AccountID = ${accountId};
    `);

    if (!cdbUser || cdbUser.length === 0) {
      return { success: false, error: `Employee with AccountID ${accountId} not found in corporate directory.` };
    }

    const employee = cdbUser[0];
    const employeeEmail = (employee.Email || '').trim().toLowerCase();
    const employeeName = (employee.AccountName || '').trim();

    if (!employeeEmail) {
      return { success: false, error: 'Selected employee does not have a valid corporate email address.' };
    }

    // Check if user is already registered in Users table
    const existing = await prisma.$queryRawUnsafe<any[]>(`
      SELECT AccountID FROM [dbo].[Users] 
      WHERE AccountID = ${accountId} OR LOWER(Email) = '${employeeEmail.replace(/'/g, "''")}';
    `);

    if (existing && existing.length > 0) {
      return { success: false, error: `User is already registered in the portal (AccountID: ${existing[0].AccountID}).` };
    }

    const hasCols = await hasAssignedColumns();
    const buVal = formatListForSql(assignedBUs);
    const brandVal = formatListForSql(assignedBrands);
    const cleanRole = (role as string).replace(/'/g, "''");

    if (hasCols) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO [dbo].[Users] (AccountID, AccountName, Email, UserRole, AssignedBU, AssignedBrand, DtCreation, LastLogin)
        VALUES (
          ${accountId},
          N'${employeeName.replace(/'/g, "''")}',
          '${employeeEmail.replace(/'/g, "''")}',
          '${cleanRole}',
          ${buVal ? `'${buVal}'` : 'NULL'},
          ${brandVal ? `'${brandVal}'` : 'NULL'},
          GETDATE(),
          NULL
        );
      `);
    } else {
      // Fallback composite format if ALTER TABLE has not been run in SSMS
      let compositeRole: string = cleanRole;
      if (role === 'pm' && brandVal) compositeRole = `pm:${brandVal}`;
      else if (buVal) compositeRole = `${cleanRole}:${buVal}`;

      await prisma.$executeRawUnsafe(`
        INSERT INTO [dbo].[Users] (AccountID, AccountName, Email, UserRole, DtCreation, LastLogin)
        VALUES (
          ${accountId},
          N'${employeeName.replace(/'/g, "''")}',
          '${employeeEmail.replace(/'/g, "''")}',
          '${compositeRole.replace(/'/g, "''")}',
          GETDATE(),
          NULL
        );
      `);
    }

    revalidatePath('/admin/users');

    await logActivity({
      action: 'USER_MANAGEMENT',
      fieldName: 'User Account',
      oldValue: null,
      newValue: `Registered user: ${employeeName} (${employeeEmail}, Role: ${role}, BU: ${buVal || 'None'}, Brands: ${brandVal || 'None'})`,
      remarks: `Created user ${employeeName} (AccountID: ${accountId})`,
    });

    return { success: true };

  } catch (error: any) {
    console.error('[createUser] Error:', error);
    return { success: false, error: error.message || 'Failed to create user' };
  }
}

/**
 * Updates an existing user's role, assigned business units, and assigned brands
 */
export async function updateUser(payload: {
  accountId: number;
  role: UserRole;
  assignedBUs?: string[];
  assignedBrands?: string[];
}): Promise<{ success: boolean; error?: string }> {
  try {
    await assertAdminSession();

    const { accountId, role, assignedBUs, assignedBrands } = payload;
    if (!accountId || isNaN(accountId)) {
      return { success: false, error: 'Invalid Account ID' };
    }

    const hasCols = await hasAssignedColumns();
    const buVal = formatListForSql(assignedBUs);
    const brandVal = formatListForSql(assignedBrands);
    const cleanRole = (role as string).replace(/'/g, "''");

    if (hasCols) {
      await prisma.$executeRawUnsafe(`
        UPDATE [dbo].[Users] 
        SET UserRole      = '${cleanRole}',
            AssignedBU    = ${buVal ? `'${buVal}'` : 'NULL'},
            AssignedBrand = ${brandVal ? `'${brandVal}'` : 'NULL'}
        WHERE AccountID = ${accountId};
      `);
    } else {
      let compositeRole: string = cleanRole;
      if (role === 'pm' && brandVal) compositeRole = `pm:${brandVal}`;
      else if (buVal) compositeRole = `${cleanRole}:${buVal}`;

      await prisma.$executeRawUnsafe(`
        UPDATE [dbo].[Users] 
        SET UserRole = '${compositeRole.replace(/'/g, "''")}'
        WHERE AccountID = ${accountId};
      `);
    }

    revalidatePath('/admin/users');

    await logActivity({
      action: 'USER_MANAGEMENT',
      fieldName: 'User Role/Scope',
      oldValue: null,
      newValue: `Role: ${role}; BUs: ${buVal || 'None'}; Brands: ${brandVal || 'None'}`,
      remarks: `Updated AccountID: ${accountId}`,
    });

    return { success: true };

  } catch (error: any) {
    console.error('[updateUser] Error:', error);
    return { success: false, error: error.message || 'Failed to update user' };
  }
}

/**
 * Dedicated server action to update assigned brands for a Product Manager
 */
export async function updateUserBrands(
  accountId: number,
  brands: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await assertAdminSession();

    if (!accountId || isNaN(accountId)) {
      return { success: false, error: 'Invalid Account ID' };
    }

    const hasCols = await hasAssignedColumns();
    const brandVal = formatListForSql(brands);

    if (hasCols) {
      await prisma.$executeRawUnsafe(`
        UPDATE [dbo].[Users]
        SET UserRole      = 'pm',
            AssignedBrand = ${brandVal ? `'${brandVal}'` : 'NULL'}
        WHERE AccountID = ${accountId};
      `);
    } else {
      const storedRole = brandVal ? `pm:${brandVal}` : 'pm';
      await prisma.$executeRawUnsafe(`
        UPDATE [dbo].[Users]
        SET UserRole = '${storedRole.replace(/'/g, "''")}'
        WHERE AccountID = ${accountId};
      `);
    }

    revalidatePath('/admin/users');

    await logActivity({
      action: 'USER_MANAGEMENT',
      fieldName: 'Assigned Brands',
      oldValue: null,
      newValue: brandVal || 'None',
      remarks: `Updated PM brands for AccountID: ${accountId}`,
    });

    return { success: true };

  } catch (error: any) {
    console.error('[updateUserBrands] Error:', error);
    return { success: false, error: error.message || 'Failed to update brands' };
  }
}

/**
 * Dedicated server action to update assigned Business Units for BU Heads & Account Officers
 */
export async function updateUserBUs(
  accountId: number,
  bus: string[],
  baseRole: UserRole = 'bu'
): Promise<{ success: boolean; error?: string }> {
  try {
    await assertAdminSession();

    if (!accountId || isNaN(accountId)) {
      return { success: false, error: 'Invalid Account ID' };
    }

    const hasCols = await hasAssignedColumns();
    const buVal = formatListForSql(bus);
    const cleanBase = (baseRole as string).replace(/'/g, "''");

    if (hasCols) {
      await prisma.$executeRawUnsafe(`
        UPDATE [dbo].[Users]
        SET UserRole   = '${cleanBase}',
            AssignedBU = ${buVal ? `'${buVal}'` : 'NULL'}
        WHERE AccountID = ${accountId};
      `);
    } else {
      const storedRole = buVal ? `${cleanBase}:${buVal}` : cleanBase;
      await prisma.$executeRawUnsafe(`
        UPDATE [dbo].[Users]
        SET UserRole = '${storedRole.replace(/'/g, "''")}'
        WHERE AccountID = ${accountId};
      `);
    }

    revalidatePath('/admin/users');

    await logActivity({
      action: 'USER_MANAGEMENT',
      fieldName: 'Assigned BUs',
      oldValue: null,
      newValue: `Role: ${cleanBase}, BUs: ${buVal || 'None'}`,
      remarks: `Updated BUs for AccountID: ${accountId}`,
    });

    return { success: true };

  } catch (error: any) {
    console.error('[updateUserBUs] Error:', error);
    return { success: false, error: error.message || 'Failed to update business units' };
  }
}

/**
 * Removes a user from dbo.Users, revoking portal access immediately
 */
export async function deleteUser(accountId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await assertAdminSession();

    if (!accountId || isNaN(accountId)) {
      return { success: false, error: 'Invalid Account ID' };
    }

    const callerAccountId = Number(user?.AccountID);
    if (callerAccountId === accountId) {
      return { success: false, error: 'Action Denied: You cannot delete your own logged-in account.' };
    }

    await prisma.$executeRawUnsafe(`
      DELETE FROM [dbo].[Users] WHERE AccountID = ${accountId};
    `);

    revalidatePath('/admin/users');

    await logActivity({
      action: 'USER_MANAGEMENT',
      fieldName: 'User Account',
      oldValue: `AccountID: ${accountId}`,
      newValue: 'Deleted from portal access',
      remarks: `Deleted by ${user?.AccountName || user?.name || user?.Email || 'ITadmin'}`,
    });

    return { success: true };

  } catch (error: any) {
    console.error('[deleteUser] Error:', error);
    return { success: false, error: error.message || 'Failed to delete user' };
  }
}
