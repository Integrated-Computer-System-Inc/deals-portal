'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@my-app/database';
import { isSuperadminEmail, resolveUserRoleAndBUs, ImpersonationPersona } from '@/lib/roles';
import { serverCache } from '@/lib/serverCache';
import { revalidatePath } from 'next/cache';
import { UserRole } from '@my-app/types';
import { runUserTableMigration, hasAssignedColumns } from '@/lib/db-migration';

/**
 * Validates if the current session belongs to an authorized Superadmin
 * (either directly or via an active impersonation session).
 */
export async function isAuthorizedImpersonator(): Promise<{
  authorized: boolean;
  adminEmail: string | null;
  currentRole: string | null;
  isImpersonating: boolean;
}> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { authorized: false, adminEmail: null, currentRole: null, isImpersonating: false };
  }

  const sessionEmail = session.user.email || '';
  const originalAdminEmail = (session.user as any)?.originalAdminEmail || null;
  const isImpersonating = Boolean((session.user as any)?.isImpersonating);
  const currentRole = ((session.user as any)?.role as string) || null;

  // Check if direct email, original admin email in SUPERADMIN_EMAILS, or role is ITadmin
  const authorized = isSuperadminEmail(sessionEmail) || isSuperadminEmail(originalAdminEmail) || currentRole === 'ITadmin';

  return {
    authorized,
    adminEmail: originalAdminEmail || (isSuperadminEmail(sessionEmail) ? sessionEmail : null),
    currentRole,
    isImpersonating,
  };
}

/**
 * Returns the list of available personas dynamically from dbo.Users and cdbAccounts.
 */
export async function getAvailablePersonas(): Promise<{
  success: boolean;
  data?: ImpersonationPersona[];
  error?: string;
}> {
  try {
    const auth = await isAuthorizedImpersonator();
    if (!auth.authorized) {
      return { success: false, error: 'Unauthorized: Impersonator mode requires Superadmin privileges.' };
    }

    await runUserTableMigration();
    const hasCols = await hasAssignedColumns();

    const selectQuery = hasCols
      ? `SELECT u.AccountID, u.AccountName, u.Email, u.UserRole, u.AssignedBU, u.AssignedBrand,
                c.DomainAccount, c.AccountGroup, c.AccountType, c.isActive, c.GAvatar
         FROM [dbo].[Users] u
         LEFT JOIN [dbo].[cdbAccounts] c ON u.AccountID = c.AccountID
         ORDER BY u.UserRole ASC, u.AccountName ASC;`
      : `SELECT u.AccountID, u.AccountName, u.Email, u.UserRole,
                c.DomainAccount, c.AccountGroup, c.AccountType, c.isActive, c.GAvatar
         FROM [dbo].[Users] u
         LEFT JOIN [dbo].[cdbAccounts] c ON u.AccountID = c.AccountID
         ORDER BY u.UserRole ASC, u.AccountName ASC;`;

    const dbUsers = await prisma.$queryRawUnsafe<any[]>(selectQuery);

    const personas: ImpersonationPersona[] = (dbUsers || []).map((u) => {
      const accountId = Number(u.AccountID);
      const rawRole = String(u.UserRole || 'ao');
      const resolved = resolveUserRoleAndBUs(
        accountId,
        u.Email,
        u.AccountGroup || 'HQ',
        u.AccountType || 'AO',
        u.isActive ?? 1,
        rawRole,
        u.AssignedBU || null,
        u.AssignedBrand || null
      );

      const role = (resolved.role || 'ao') as UserRole;
      let category: ImpersonationPersona['category'] = 'ACCOUNT_OFFICER';
      if (role === 'ITadmin' || role === 'admin' || role === 'aa') {
        category = 'ADMIN';
      } else if (role === 'bu') {
        category = 'BU_HEAD';
      } else if (role === 'pm') {
        category = 'PM';
      }

      let dealCountDescription: string | undefined;
      if (role === 'ITadmin' || role === 'admin') {
        dealCountDescription = 'Full organization-wide access (All BUs)';
      } else if (role === 'aa') {
        dealCountDescription = 'Global read/write access (All BUs)';
      } else if (role === 'pm') {
        const brands = resolved.assignedBrands && resolved.assignedBrands.length > 0 ? resolved.assignedBrands.join(', ') : 'All Brands';
        dealCountDescription = `Scoped to Brand(s): ${brands}`;
      } else if (role === 'bu') {
        dealCountDescription = `Scoped to BU(s): ${resolved.assignedBUs.join(', ') || 'Assigned BUs'}`;
      } else {
        dealCountDescription = `Account Officer (BU: ${resolved.assignedBUs.join(', ') || u.AccountGroup || 'BU'})`;
      }

      const domainAccount = u.DomainAccount || (u.Email || '').split('@')[0].toUpperCase();

      return {
        accountId,
        name: u.AccountName || (u.Email || '').split('@')[0].toUpperCase(),
        email: u.Email || '',
        domainAccount,
        role,
        assignedBUs: resolved.assignedBUs || [],
        assignedBrands: resolved.assignedBrands || [],
        roleTitle: resolved.roleTitle,
        category,
        GAvatar: u.GAvatar || null,
        dealCountDescription,
      };
    });

    return { success: true, data: personas };
  } catch (error: any) {
    console.error('[getAvailablePersonas] Error:', error);
    return { success: false, data: [], error: error.message || 'Failed to fetch personas' };
  }
}

/**
 * Prepares the target persona payload for in-place session updating.
 * Clears server cache and triggers revalidation.
 */
export async function switchImpersonationTarget(targetAccountId: number | null): Promise<{
  success: boolean;
  target: ImpersonationPersona | null;
  error?: string;
}> {
  const auth = await isAuthorizedImpersonator();
  if (!auth.authorized) {
    return { success: false, target: null, error: 'Unauthorized: Only Superadmins can switch personas.' };
  }

  // Clear memory cache for deals so the newly switched user gets fresh scoped data
  serverCache.clear();

  if (targetAccountId === null) {
    // Exit impersonation
    revalidatePath('/deals');
    revalidatePath('/dashboard');
    revalidatePath('/reports');
    return { success: true, target: null };
  }

  try {
    const hasCols = await hasAssignedColumns();
    const selectOneQuery = hasCols
      ? `SELECT TOP 1 u.AccountID, u.AccountName, u.Email, u.UserRole, u.AssignedBU, u.AssignedBrand,
                      c.DomainAccount, c.AccountGroup, c.AccountType, c.isActive, c.GAvatar
         FROM [dbo].[Users] u
         LEFT JOIN [dbo].[cdbAccounts] c ON u.AccountID = c.AccountID
         WHERE u.AccountID = ${targetAccountId};`
      : `SELECT TOP 1 u.AccountID, u.AccountName, u.Email, u.UserRole,
                      c.DomainAccount, c.AccountGroup, c.AccountType, c.isActive, c.GAvatar
         FROM [dbo].[Users] u
         LEFT JOIN [dbo].[cdbAccounts] c ON u.AccountID = c.AccountID
         WHERE u.AccountID = ${targetAccountId};`;

    const userRows = await prisma.$queryRawUnsafe<any[]>(selectOneQuery);

    if (!userRows || userRows.length === 0) {
      // Check cdbAccounts directly as fallback for unseeded active accounts
      const cdbRows = await prisma.$queryRawUnsafe<any[]>(`
        SELECT TOP 1 AccountID, AccountName, Email, DomainAccount, AccountGroup, AccountType, isActive, GAvatar
        FROM [dbo].[cdbAccounts]
        WHERE AccountID = ${targetAccountId};
      `);

      if (!cdbRows || cdbRows.length === 0) {
        return { success: false, target: null, error: `Account with AccountID ${targetAccountId} not found.` };
      }

      const c = cdbRows[0];
      const resolved = resolveUserRoleAndBUs(
        targetAccountId,
        c.Email,
        c.AccountGroup || 'HQ',
        c.AccountType || 'AO',
        c.isActive ?? 1
      );

      const target: ImpersonationPersona = {
        accountId: targetAccountId,
        name: c.AccountName || c.Email.split('@')[0].toUpperCase(),
        email: c.Email || '',
        domainAccount: c.DomainAccount || c.Email.split('@')[0].toUpperCase(),
        role: (resolved.role || 'ao') as UserRole,
        assignedBUs: resolved.assignedBUs || [],
        assignedBrands: resolved.assignedBrands || [],
        roleTitle: resolved.roleTitle,
        category: resolved.isBuHead ? 'BU_HEAD' : resolved.isPM ? 'PM' : resolved.isAdmin ? 'ADMIN' : 'ACCOUNT_OFFICER',
        GAvatar: c.GAvatar || null,
      };

      revalidatePath('/deals');
      revalidatePath('/dashboard');
      revalidatePath('/reports');
      return { success: true, target };
    }

    const u = userRows[0];
    const resolved = resolveUserRoleAndBUs(
      targetAccountId,
      u.Email,
      u.AccountGroup || 'HQ',
      u.AccountType || 'AO',
      u.isActive ?? 1,
      u.UserRole,
      u.AssignedBU || null,
      u.AssignedBrand || null
    );

    const role = (resolved.role || 'ao') as UserRole;
    let category: ImpersonationPersona['category'] = 'ACCOUNT_OFFICER';
    if (role === 'ITadmin' || role === 'admin' || role === 'aa') {
      category = 'ADMIN';
    } else if (role === 'bu') {
      category = 'BU_HEAD';
    } else if (role === 'pm') {
      category = 'PM';
    }

    const target: ImpersonationPersona = {
      accountId: targetAccountId,
      name: u.AccountName || u.Email.split('@')[0].toUpperCase(),
      email: u.Email || '',
      domainAccount: u.DomainAccount || u.Email.split('@')[0].toUpperCase(),
      role,
      assignedBUs: resolved.assignedBUs || [],
      assignedBrands: resolved.assignedBrands || [],
      roleTitle: resolved.roleTitle,
      category,
      GAvatar: u.GAvatar || null,
    };

    revalidatePath('/deals');
    revalidatePath('/dashboard');
    revalidatePath('/reports');

    return { success: true, target };
  } catch (err: any) {
    console.error('[switchImpersonationTarget] Error:', err);
    return { success: false, target: null, error: err.message || 'Failed to switch persona' };
  }
}
