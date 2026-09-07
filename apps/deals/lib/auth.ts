import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { UserRole } from '@my-app/types';
import { prisma } from '@my-app/database';
import { randomUUID } from 'crypto';
import { resolveUserRoleAndBUs, isSuperadminEmail, isConfiguredAdminEmail } from './roles';
import { serverCache } from '@/lib/serverCache';
import { runUserTableMigration, hasAssignedColumns } from '@/lib/db-migration';

const CDB_ACCOUNT_SELECT = {
  AccountID: true,
  AccountName: true,
  Email: true,
  DomainAccount: true,
  AccountGroup: true,
  AccountType: true,
  isActive: true,
  GAvatar: true,
} as const;

export const ABSOLUTE_SESSION_MAX_AGE = 24 * 60 * 60; // 24 Hours in seconds (1 Day)
export const REMEMBER_TOKEN_CACHE_TTL = 15_000; // 15 seconds in milliseconds
export const USER_AVATAR_CACHE_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * Normalizes Google profile photo URLs to high resolution (=s256-c).
 * Replaces default low-res =s96-c or appends size query.
 */
export function normalizeGooglePhotoUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  // Upgrade Google User Content photo URLs to high-res (256x256 cropped)
  if (trimmed.includes('googleusercontent.com')) {
    if (/=s\d+(-c)?$/i.test(trimmed)) {
      return trimmed.replace(/=s\d+(-c)?$/i, '=s256-c');
    }
    return `${trimmed}=s256-c`;
  }
  return trimmed;
}

/**
 * Retrieves the cached user avatar from cdbAccounts or in-memory cache.
 */
export async function getCachedUserAvatar(accountId: number): Promise<string | null> {
  const cacheKey = `user:avatar:${accountId}`;
  const cached = serverCache.get<string>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT TOP 1 GAvatar FROM [dbo].[cdbAccounts] WHERE AccountID = ${accountId};
    `);
    if (Array.isArray(rows) && rows.length > 0 && rows[0]?.GAvatar) {
      const avatar = String(rows[0].GAvatar).trim();
      serverCache.set(cacheKey, avatar, USER_AVATAR_CACHE_TTL);
      return avatar;
    }
  } catch (err) {
    console.warn('[Auth] getCachedUserAvatar lookup notice:', err);
  }
  return null;
}

/**
 * Retrieves the currently active RememberToken for an account from memory cache
 * or falls back to querying dbo.Users table. Caches result for 15s to maintain <1ms latency.
 */
export async function getCachedUserRememberToken(accountId: number): Promise<string | null> {
  const cacheKey = `user:remember_token:${accountId}`;
  const cached = serverCache.get<string>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME='Users')
        SELECT TOP 1 RememberToken FROM [dbo].[Users] WHERE AccountID = ${accountId};
    `);
    if (Array.isArray(rows) && rows.length > 0 && rows[0]?.RememberToken) {
      const token = String(rows[0].RememberToken);
      serverCache.set(cacheKey, token, REMEMBER_TOKEN_CACHE_TTL);
      return token;
    }
  } catch (err) {
    console.warn('[Auth] getCachedUserRememberToken lookup notice:', err);
  }
  return null;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'MOCK_GOOGLE_CLIENT_ID',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'MOCK_GOOGLE_CLIENT_SECRET',
      authorization: {
        params: {
          prompt: 'select_account',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
    CredentialsProvider({
      id: 'credentials',
      name: 'Corporate Directory Credentials',
      credentials: {
        email: { label: 'Corporate Email', type: 'email' },
        password: { label: 'Password / Pin', type: 'password' },
        accountType: { label: 'Account Type', type: 'text' },
        personaAccountId: { label: 'Persona Account ID', type: 'text' },
        adminEmail: { label: 'Admin Email', type: 'text' },
        accountName: { label: 'Account Name', type: 'text' },
      },
      async authorize(credentials) {
        const type = credentials?.accountType || 'admin';
        const email = credentials?.email?.toLowerCase();

        // Check if direct persona accountId is provided for dev impersonation
        if (credentials?.personaAccountId) {
          const pId = Number(credentials.personaAccountId);
          try {
            const hasCols = await hasAssignedColumns();
            const selectQuery = hasCols
              ? `SELECT TOP 1 u.AccountID, u.AccountName, u.Email, u.UserRole, u.AssignedBU, u.AssignedBrand,
                              c.DomainAccount, c.AccountGroup, c.AccountType, c.isActive, c.GAvatar
                 FROM [dbo].[Users] u
                 LEFT JOIN [dbo].[cdbAccounts] c ON u.AccountID = c.AccountID
                 WHERE u.AccountID = ${pId};`
              : `SELECT TOP 1 u.AccountID, u.AccountName, u.Email, u.UserRole,
                              c.DomainAccount, c.AccountGroup, c.AccountType, c.isActive, c.GAvatar
                 FROM [dbo].[Users] u
                 LEFT JOIN [dbo].[cdbAccounts] c ON u.AccountID = c.AccountID
                 WHERE u.AccountID = ${pId};`;

            const rows = await prisma.$queryRawUnsafe<any[]>(selectQuery);
            if (Array.isArray(rows) && rows.length > 0) {
              const u = rows[0];
              const resolved = resolveUserRoleAndBUs(pId, u.Email, u.AccountGroup, u.AccountType, u.isActive, u.UserRole, u.AssignedBU || null, u.AssignedBrand || null);
              const pEmail = u.Email || `${(u.AccountName || '').toLowerCase().replace(/\s+/g, '')}@ics.com.ph`;
              const rawDomain = u.DomainAccount || pEmail.split('@')[0].toUpperCase();
              return {
                id: `usr_${pId}`,
                name: u.AccountName,
                email: pEmail,
                DomainAccount: rawDomain.startsWith('CORP\\') ? rawDomain : `CORP\\${rawDomain}`,
                AccountGroup: resolved.assignedBUs.join(',') || 'HQ',
                AccountID: String(pId),
                AccountName: u.AccountName,
                role: resolved.role || 'ao',
                assignedBUs: resolved.assignedBUs,
                assignedBrands: resolved.assignedBrands || [],
                RememberToken: randomUUID(),
                isImpersonating: true,
                originalAdminEmail: credentials.adminEmail || 'jdoremon@ics.com.ph',
                GAvatar: u.GAvatar || undefined,
              };
            }
          } catch (e) {
            console.warn('[Credentials] Persona lookup error:', e);
          }
        }

        // Reject non-corporate accounts (e.g. gmail.com) to enforce enterprise policy
        if (email && !email.endsWith('@ics.com.ph')) {
          return null;
        }

        const rememberToken = randomUUID();

        switch (type) {
          case 'google-corporate':
          case 'corporate': {
            if (!credentials?.email) {
              return null;
            }
            const userEmail = credentials.email.trim().toLowerCase();
            const isAdmin = isConfiguredAdminEmail(userEmail);

            // Fast-path: Check Users table first
            try {
              await runUserTableMigration();
              const hasCols = await hasAssignedColumns();
              const selectFast = hasCols
                ? `IF EXISTS (SELECT * FROM sysobjects WHERE name='Users' and xtype='U')
                     SELECT TOP 1 AccountID, AccountName, Email, UserRole, AssignedBU, AssignedBrand, RememberToken
                     FROM Users
                     WHERE LOWER(Email) = '${userEmail.replace(/'/g, "''")}';`
                : `IF EXISTS (SELECT * FROM sysobjects WHERE name='Users' and xtype='U')
                     SELECT TOP 1 AccountID, AccountName, Email, UserRole, RememberToken
                     FROM Users
                     WHERE LOWER(Email) = '${userEmail.replace(/'/g, "''")}';`;

              const existingUser = await prisma.$queryRawUnsafe<any[]>(selectFast);
              if (Array.isArray(existingUser) && existingUser.length > 0 && existingUser[0].UserRole) {
                const u = existingUser[0];
                const accountId = Number(u.AccountID);
                const accountName = u.AccountName || userEmail.split('@')[0].toUpperCase();
                const userAccess = resolveUserRoleAndBUs(accountId, userEmail, 'HQ', 'AO', 1, u.UserRole, u.AssignedBU || null, u.AssignedBrand || null);
                const resolvedRole = userAccess.role || 'ao';
                const assignedBUs = (resolvedRole === 'ITadmin' || resolvedRole === 'admin') ? ['ALL'] : (userAccess.assignedBUs.length > 0 ? userAccess.assignedBUs : ['BU5']);
                const assignedBrands = userAccess.assignedBrands || [];

                const newRememberToken = randomUUID();
                prisma.$executeRawUnsafe(`
                  UPDATE Users 
                  SET LastLogin = GETDATE(), RememberToken = '${newRememberToken}' 
                  WHERE AccountID = ${accountId};
                `).catch((e) => console.warn('[Credentials Fast-Path] LastLogin update notice:', e));
                serverCache.set(`user:remember_token:${accountId}`, newRememberToken, REMEMBER_TOKEN_CACHE_TTL);

                const accountAvatar = await getCachedUserAvatar(accountId);
                return {
                  id: `usr_${accountId}`,
                  name: accountName,
                  email: userEmail,
                  DomainAccount: `CORP\\${userEmail.split('@')[0].toUpperCase()}`,
                  AccountGroup: assignedBUs.join(',') || 'BU5',
                  AccountID: String(accountId),
                  AccountName: accountName,
                  role: resolvedRole,
                  assignedBUs: assignedBUs,
                  assignedBrands: assignedBrands,
                  RememberToken: newRememberToken,
                  GAvatar: accountAvatar || undefined,
                };
              }
            } catch (err) {
              console.warn('[Credentials Fast-Path] Fallback to directory lookup:', err);
            }

            // Match against cdbAccounts with lightweight projection
            const cdbAccount = await prisma.cdbAccounts.findFirst({
              where: {
                OR: [
                  { Email: userEmail },
                  { Email: userEmail.toUpperCase() },
                ],
              },
              select: CDB_ACCOUNT_SELECT,
            });

            if (!cdbAccount && !isAdmin) {
              console.warn(`[Credentials] Rejected: ${userEmail} not found in cdbAccounts`);
              return null;
            }

            const accountId = cdbAccount ? cdbAccount.AccountID : (isAdmin ? 57845 : 99999);
            const accountName = cdbAccount ? cdbAccount.AccountName : (credentials.accountName || userEmail.split('@')[0].toUpperCase());
            const accountGroup = cdbAccount ? cdbAccount.AccountGroup : 'HQ';
            const accountType = cdbAccount ? cdbAccount.AccountType : 'ADMIN';
            const isActive = cdbAccount ? cdbAccount.isActive : 1;

            const userAccess = resolveUserRoleAndBUs(
              accountId,
              userEmail,
              accountGroup,
              accountType,
              isActive
            );

            if (!userAccess.isAuthorized || !userAccess.role) {
              console.warn(`[Credentials] Rejected: ${userEmail} not authorized (${userAccess.rejectionReason})`);
              return null;
            }

            // Upsert into Users table if it exists
            try {
              const buVal = (userAccess.assignedBUs || []).filter(b => b !== 'ALL').join(',').replace(/'/g, "''");
              const brandVal = (userAccess.assignedBrands || []).filter(b => b !== 'ALL').join(',').replace(/'/g, "''");
              await prisma.$executeRawUnsafe(`
                IF EXISTS (SELECT * FROM sysobjects WHERE name='Users' and xtype='U')
                BEGIN
                  IF EXISTS (SELECT 1 FROM Users WHERE AccountID = ${accountId} OR LOWER(Email) = '${userEmail.replace(/'/g, "''")}')
                    UPDATE Users 
                    SET AccountName = N'${accountName.replace(/'/g, "''")}',
                        Email = '${userEmail.replace(/'/g, "''")}',
                        RememberToken = '${rememberToken}',
                        LastLogin = GETDATE()
                    WHERE AccountID = ${accountId} OR LOWER(Email) = '${userEmail.replace(/'/g, "''")}';
                  ELSE
                    INSERT INTO Users (AccountID, AccountName, Email, UserRole, AssignedBU, AssignedBrand, RememberToken, DtCreation, LastLogin)
                    VALUES (${accountId}, N'${accountName.replace(/'/g, "''")}', '${userEmail.replace(/'/g, "''")}', '${userAccess.role}', ${buVal ? `'${buVal}'` : 'NULL'}, ${brandVal ? `'${brandVal}'` : 'NULL'}, '${rememberToken}', GETDATE(), GETDATE());
                END
              `);
              serverCache.set(`user:remember_token:${accountId}`, rememberToken, REMEMBER_TOKEN_CACHE_TTL);
            } catch (dbErr) {
              console.warn('[Credentials] Error saving into Users table:', dbErr);
            }

            const assignedBUs = (userAccess.role === 'ITadmin' || userAccess.role === 'admin') ? ['ALL'] : userAccess.assignedBUs;
            const assignedBrands = (userAccess.role === 'ITadmin' || userAccess.role === 'admin') ? ['ALL'] : (userAccess.assignedBrands || []);
            const assignedBUsStr = assignedBUs.join(',') || accountGroup || 'BU5';
            const accountAvatar = cdbAccount?.GAvatar || (await getCachedUserAvatar(accountId));
            return {
              id: `usr_${accountId}`,
              name: accountName,
              email: userEmail,
              DomainAccount: cdbAccount?.DomainAccount ? `CORP\\${cdbAccount.DomainAccount}` : `CORP\\${userEmail.split('@')[0].toUpperCase()}`,
              AccountGroup: assignedBUsStr,
              AccountID: String(accountId),
              AccountName: accountName,
              role: userAccess.role,
              assignedBUs: assignedBUs,
              assignedBrands: assignedBrands,
              RememberToken: rememberToken,
              GAvatar: accountAvatar || undefined,
            };
          }
          case 'bu':
            return {
              id: 'usr_demo_bu8',
              name: 'SHIELA MARIE PEÑALOSA-MARCELO',
              email: 'smpenalosa@ics.com.ph',
              DomainAccount: 'CORP\\SMPENALOSA',
              AccountGroup: 'BU8,BU12,CE01',
              AccountID: '387',
              AccountName: 'SHIELA MARIE PEÑALOSA-MARCELO',
              role: 'bu' as UserRole,
              assignedBUs: ['BU8', 'BU12', 'CE01'],
              RememberToken: rememberToken,
            };
          case 'ao':
            return {
              id: 'usr_demo_ao_rosette',
              name: credentials?.accountName || 'ROSETTE DE GUZMAN',
              email: 'rdeguzman@ics.com.ph',
              DomainAccount: 'CORP\\RDEGUZMAN',
              AccountGroup: 'BU2',
              AccountID: '205',
              AccountName: credentials?.accountName || 'ROSETTE DE GUZMAN',
              role: 'ao' as UserRole,
              assignedBUs: ['BU2'],
              RememberToken: rememberToken,
            };
          case 'aa':
            return {
              id: 'usr_demo_sales_aa',
              name: 'ATHENA BEATRICE FRANCISCO',
              email: 'AFRANCISCO@ICS.COM.PH',
              DomainAccount: 'CORP\\AFRANCISCO',
              AccountGroup: 'BU2',
              AccountID: '57835',
              AccountName: 'ATHENA BEATRICE FRANCISCO',
              role: 'aa' as UserRole,
              assignedBUs: [],
              RememberToken: rememberToken,
            };
          case 'admin':
          default:
            return {
              id: 'usr_demo_admin',
              name: 'ADELIANA SY-LU',
              email: 'asy-lu@ics.com.ph',
              DomainAccount: 'CORP\\ASY-LU',
              AccountGroup: 'HQ',
              AccountID: '415',
              AccountName: 'ADELIANA SY-LU',
              role: 'admin' as UserRole,
              assignedBUs: [],
              RememberToken: rememberToken,
            };
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          if (!user.email) return false;

          const emailLower = user.email.toLowerCase().trim();
          const emailDomain = emailLower.split('@')[1];

          // 1. Check if user is a designated Superadmin or Configured Admin (unconditional exemption)
          const isSuperadmin =
            isSuperadminEmail(emailLower) ||
            isSuperadminEmail(user.email) ||
            isConfiguredAdminEmail(emailLower);

          // 2. Validate enterprise email domain (all @ics.com.ph allowed, admins exempt)
          const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || 'ics.com.ph')
            .split(',')
            .map((d) => d.trim().toLowerCase())
            .filter(Boolean);

          if (!isSuperadmin && (!emailDomain || !allowedDomains.includes(emailDomain))) {
            console.warn(
              `[Google Sign-In] Rejected: ${user.email} does not match allowed domains:`,
              allowedDomains
            );
            return '/login?error=AccessDenied';
          }

          // Extract latest Google profile photo URL and upgrade to high-res (=s256-c)
          const rawGooglePhotoUrl = (
            user.image ||
            (profile as any)?.picture ||
            (account as any)?.picture ||
            (profile as any)?.avatar_url ||
            ''
          ).trim();
          const googlePhotoUrl = normalizeGooglePhotoUrl(rawGooglePhotoUrl);

          // Helper to synchronize Google profile photo with cdbAccounts and cache
          const syncGooglePhotoToCdb = async (targetEmail: string, targetAccountId?: number) => {
            if (!googlePhotoUrl) return;
            try {
              const safeUrl = googlePhotoUrl.replace(/'/g, "''");
              const safeEmail = targetEmail.replace(/'/g, "''").toLowerCase().trim();
              const accountClause = (targetAccountId && !isNaN(targetAccountId) && targetAccountId > 0)
                ? `AccountID = ${targetAccountId} OR `
                : '';

              await prisma.$executeRawUnsafe(`
                UPDATE [dbo].[cdbAccounts]
                SET GAvatar = '${safeUrl}'
                WHERE ${accountClause}LOWER(LTRIM(RTRIM(Email))) = '${safeEmail}';
              `);

              if (targetAccountId && !isNaN(targetAccountId) && targetAccountId > 0) {
                serverCache.set(`user:avatar:${targetAccountId}`, googlePhotoUrl, USER_AVATAR_CACHE_TTL);
              }
              serverCache.delete('cdb_ao_avatars_map');
            } catch (syncPhotoError) {
              console.warn('[Google Sign-In] Auto-syncing Google profile photo error:', syncPhotoError);
            }
          };

          // 3. ADMIN EXEMPTION: Administrators get immediate guaranteed access
          if (isSuperadmin) {
            let adminAccountId = 57845;
            let adminAccountName = user.name || emailLower.split('@')[0].toUpperCase();

            // Known admin mappings fallback
            if (emailLower === 'bcandelaria@ics.com.ph') {
              adminAccountId = 57846;
              adminAccountName = 'BHARON CHRISTOPHER CANDELARIA';
            } else if (emailLower === 'jdoremon@ics.com.ph') {
              adminAccountId = 57845;
              adminAccountName = 'JAMES PAOLO DOREMON';
            } else if (emailLower === 'mescario@ics.com.ph') {
              adminAccountId = 57732;
              adminAccountName = 'MARK EDO ESCARIO';
            } else if (emailLower === 'dramos@ics.com.ph') {
              adminAccountId = 56395;
              adminAccountName = 'DAN LEMUEL RAMOS';
            }

            // Attempt to look up cdbAccounts to enrich name / ID if present
            try {
              const cdbAccount = await prisma.cdbAccounts.findFirst({
                where: {
                  OR: [
                    { Email: emailLower },
                    { Email: user.email.trim() },
                    { Email: emailLower.toUpperCase() },
                  ],
                },
                select: CDB_ACCOUNT_SELECT,
              });
              if (cdbAccount) {
                adminAccountId = cdbAccount.AccountID;
                adminAccountName = cdbAccount.AccountName || adminAccountName;
              }
            } catch (e) {
              console.warn('[Google Sign-In] Admin directory lookup skipped:', e);
            }

            // Synchronize photo to cdbAccounts
            await syncGooglePhotoToCdb(emailLower, adminAccountId);

            const rememberToken = randomUUID();

            // Safely upsert admin into dbo.Users table with ITadmin role
            try {
              await prisma.$executeRawUnsafe(`
                IF EXISTS (SELECT * FROM sysobjects WHERE name='Users' and xtype='U')
                BEGIN
                  IF EXISTS (SELECT 1 FROM Users WHERE AccountID = ${adminAccountId} OR LOWER(Email) = '${emailLower.replace(/'/g, "''")}')
                    UPDATE Users 
                    SET AccountName = N'${adminAccountName.replace(/'/g, "''")}',
                        Email = '${emailLower.replace(/'/g, "''")}',
                        UserRole = 'ITadmin',
                        RememberToken = '${rememberToken}',
                        LastLogin = GETDATE()
                    WHERE AccountID = ${adminAccountId} OR LOWER(Email) = '${emailLower.replace(/'/g, "''")}';
                  ELSE
                    INSERT INTO Users (AccountID, AccountName, Email, UserRole, AssignedBU, AssignedBrand, RememberToken, DtCreation, LastLogin)
                    VALUES (${adminAccountId}, N'${adminAccountName.replace(/'/g, "''")}', '${emailLower.replace(/'/g, "''")}', 'ITadmin', NULL, NULL, '${rememberToken}', GETDATE(), GETDATE());
                END
              `);
            } catch (dbErr) {
              console.warn('[Google Sign-In] Admin Users upsert notice:', dbErr);
            }

            // Attach claims
            (user as any).AccountID = String(adminAccountId);
            (user as any).AccountName = adminAccountName;
            (user as any).AccountGroup = 'ALL';
            (user as any).DomainAccount = `CORP\\${emailLower.split('@')[0].toUpperCase()}`;
            (user as any).role = 'ITadmin';
            (user as any).assignedBUs = ['ALL'];
            (user as any).assignedBrands = ['ALL'];
            (user as any).RememberToken = rememberToken;
            (user as any).GAvatar = googlePhotoUrl || undefined;
            if (googlePhotoUrl) {
              user.image = googlePhotoUrl;
            }

            return true;
          }

          // 4. FAST-PATH: Check if regular user is already registered in dbo.Users table
          try {
            const hasCols = await hasAssignedColumns();
            const safeEmail = emailLower.replace(/'/g, "''");
            const selectGoogleFast = hasCols
              ? `IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME='Users')
                   SELECT TOP 1 AccountID, AccountName, Email, UserRole, AssignedBU, AssignedBrand, RememberToken, DtCreation, LastLogin
                   FROM [dbo].[Users]
                   WHERE Email = '${safeEmail}' OR LOWER(Email) = '${safeEmail}';`
              : `IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME='Users')
                   SELECT TOP 1 AccountID, AccountName, Email, UserRole, RememberToken, DtCreation, LastLogin
                   FROM [dbo].[Users]
                   WHERE Email = '${safeEmail}' OR LOWER(Email) = '${safeEmail}';`;

            const usersQueryResult = await prisma.$queryRawUnsafe<any[]>(selectGoogleFast);

            if (Array.isArray(usersQueryResult) && usersQueryResult.length > 0 && usersQueryResult[0].UserRole) {
              const existingUser = usersQueryResult[0];
              const accountId = Number(existingUser.AccountID);
              const accountName = existingUser.AccountName || user.name || emailLower.split('@')[0].toUpperCase();
              const newRememberToken = randomUUID();

              // Resolve BU scopes with explicit UserRole, AssignedBU and AssignedBrand from Users table
              const userAccess = resolveUserRoleAndBUs(
                accountId,
                emailLower,
                'HQ',
                'AO',
                1,
                existingUser.UserRole,
                existingUser.AssignedBU || null,
                existingUser.AssignedBrand || null
              );

              const resolvedRole = userAccess.role || 'ao';
              const assignedBUs = (resolvedRole === 'ITadmin' || resolvedRole === 'admin')
                ? ['ALL']
                : (userAccess.assignedBUs.length > 0 ? userAccess.assignedBUs : ['BU5']);

              // Synchronize photo and LastLogin
              await syncGooglePhotoToCdb(emailLower, accountId);
              prisma.$executeRawUnsafe(`
                UPDATE Users 
                SET LastLogin = GETDATE(), RememberToken = '${newRememberToken}' 
                WHERE AccountID = ${accountId} OR LOWER(Email) = '${emailLower.replace(/'/g, "''")}';
              `).catch((e) => console.warn('[Fast-Path] Non-blocking LastLogin update error:', e));
              serverCache.set(`user:remember_token:${accountId}`, newRememberToken, REMEMBER_TOKEN_CACHE_TTL);

              const domainAccount = `CORP\\${emailLower.split('@')[0].toUpperCase()}`;
              const assignedBrands = userAccess.assignedBrands || [];
              const finalAvatar = googlePhotoUrl || (await getCachedUserAvatar(accountId)) || undefined;

              (user as any).AccountID = String(accountId);
              (user as any).AccountName = accountName;
              (user as any).AccountGroup = assignedBUs.join(',');
              (user as any).DomainAccount = domainAccount;
              (user as any).role = resolvedRole;
              (user as any).assignedBUs = assignedBUs;
              (user as any).assignedBrands = assignedBrands;
              (user as any).RememberToken = newRememberToken;
              (user as any).GAvatar = finalAvatar;
              if (finalAvatar) {
                user.image = finalAvatar;
              }

              return true;
            }
          } catch (fastPathError) {
            console.warn('[Google Sign-In] Fast-path lookup skipped, proceeding with directory verification:', fastPathError);
          }

          // 5. Standard Directory Lookup: Query cdbAccounts with lightweight scalar projection
          let cdbAccount = await prisma.cdbAccounts.findFirst({
            where: {
              OR: [
                { Email: emailLower },
                { Email: user.email.trim() },
                { Email: emailLower.toUpperCase() },
              ],
            },
            select: CDB_ACCOUNT_SELECT,
          });

          if (!cdbAccount && user.name) {
            cdbAccount = await prisma.cdbAccounts.findFirst({
              where: {
                AccountName: user.name.trim(),
              },
              select: CDB_ACCOUNT_SELECT,
            });
          }

          // Block access if user does not exist in corporate directory
          if (!cdbAccount) {
            console.warn(
              `[Google Sign-In] Access Denied: User ${user.email} (${user.name}) not found in cdbAccounts and not in Users table.`
            );
            return '/login?error=AccessDenied';
          }

          // 6. Resolve Role, Assigned Business Units & Authorization Status
          const accountId = cdbAccount.AccountID;
          const accountName = cdbAccount.AccountName || (user.name || emailLower.split('@')[0].toUpperCase());
          const accountGroup = cdbAccount.AccountGroup || 'HQ';
          const accountType = cdbAccount.AccountType || 'AO';
          const isActive = cdbAccount.isActive ?? 1;

          const userAccess = resolveUserRoleAndBUs(
            accountId,
            user.email,
            accountGroup,
            accountType,
            isActive
          );

          // Reject if not authorized
          if (!userAccess.isAuthorized || !userAccess.role) {
            console.warn(
              `[Google Sign-In] Access Denied: User ${user.email} (AccountID: ${accountId}, AccountType: '${accountType}', isActive: ${isActive}) is not authorized. Reason: ${userAccess.rejectionReason}`
            );
            return '/login?error=AccessDenied';
          }

          // Sync latest Google photo to cdbAccounts
          await syncGooglePhotoToCdb(emailLower, accountId);

          const rememberToken = randomUUID();
          const assignedBUsStr = userAccess.assignedBUs.join(',') || accountGroup || 'BU5';
          const domainAccount = cdbAccount?.DomainAccount
            ? `CORP\\${cdbAccount.DomainAccount}`
            : `CORP\\${emailLower.split('@')[0].toUpperCase()}`;

          // 7. Persist / upsert session details into dbo.Users table if table exists
          try {
            const buVal = (userAccess.assignedBUs || []).filter(b => b !== 'ALL').join(',').replace(/'/g, "''");
            const brandVal = (userAccess.assignedBrands || []).filter(b => b !== 'ALL').join(',').replace(/'/g, "''");
            await prisma.$executeRawUnsafe(`
              IF EXISTS (SELECT * FROM sysobjects WHERE name='Users' and xtype='U')
              BEGIN
                IF EXISTS (SELECT 1 FROM Users WHERE AccountID = ${accountId} OR LOWER(Email) = '${emailLower.replace(/'/g, "''")}')
                  UPDATE Users 
                  SET AccountName = N'${accountName.replace(/'/g, "''")}',
                      Email = '${emailLower.replace(/'/g, "''")}',
                      RememberToken = '${rememberToken}',
                      LastLogin = GETDATE()
                  WHERE AccountID = ${accountId} OR LOWER(Email) = '${emailLower.replace(/'/g, "''")}';
                ELSE
                  INSERT INTO Users (AccountID, AccountName, Email, UserRole, AssignedBU, AssignedBrand, RememberToken, DtCreation, LastLogin)
                  VALUES (${accountId}, N'${accountName.replace(/'/g, "''")}', '${emailLower.replace(/'/g, "''")}', '${userAccess.role}', ${buVal ? `'${buVal}'` : 'NULL'}, ${brandVal ? `'${brandVal}'` : 'NULL'}, '${rememberToken}', GETDATE(), GETDATE());
              END
            `);
            serverCache.set(`user:remember_token:${accountId}`, rememberToken, REMEMBER_TOKEN_CACHE_TTL);
          } catch (dbError) {
            console.warn('[Google Sign-In] Users upsert notice:', dbError);
          }

          // 8. Attach claims to NextAuth user object
          const finalAvatar = googlePhotoUrl || cdbAccount?.GAvatar || (await getCachedUserAvatar(accountId)) || undefined;
          (user as any).AccountID = String(accountId);
          (user as any).AccountName = accountName;
          (user as any).AccountGroup = assignedBUsStr;
          (user as any).DomainAccount = domainAccount;
          (user as any).role = userAccess.role;
          (user as any).assignedBUs = userAccess.assignedBUs;
          (user as any).assignedBrands = userAccess.assignedBrands || [];
          (user as any).RememberToken = rememberToken;
          (user as any).GAvatar = finalAvatar;
          if (finalAvatar) {
            user.image = finalAvatar;
          }

          return true;
        } catch (error) {
          console.error('[Google Sign-In] Unexpected error during authentication validation:', error);
          return '/login?error=AccessDenied';
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session: updateSession }) {
      if (user) {
        const u = user as any;
        token.AccountID = u.AccountID || 'UNKNOWN';
        token.AccountName = u.AccountName || u.name || 'User';
        token.name = token.AccountName;
        token.role = u.role || 'ao';
        token.DomainAccount = u.DomainAccount || `CORP\\${(u.email || '').split('@')[0].toUpperCase()}`;
        token.AccountGroup = u.AccountGroup || 'BU5';
        token.assignedBUs = u.assignedBUs || [];
        token.assignedBrands = u.assignedBrands || [];
        token.RememberToken = u.RememberToken || null;
        token.isImpersonating = u.isImpersonating || false;
        token.originalAdminEmail = u.originalAdminEmail || (isSuperadminEmail(u.email) ? u.email : undefined);
        token.GAvatar = u.GAvatar || user.image || (user as any)?.picture || token.picture || undefined;
        token.authTime = Math.floor(Date.now() / 1000);
      }

      // Ensure token.GAvatar is populated whenever picture is available
      if (!token.GAvatar && token.picture) {
        token.GAvatar = token.picture as string;
      }

      // Proactive Self-Healing of user avatar between token and cdbAccounts
      if (token.AccountID && token.AccountID !== 'UNKNOWN') {
        const accId = Number(token.AccountID);
        if (!isNaN(accId)) {
          if (!token.GAvatar) {
            const cachedAvatar = await getCachedUserAvatar(accId);
            if (cachedAvatar) {
              token.GAvatar = cachedAvatar;
            }
          } else {
            // Ensure cdbAccounts has this avatar if not cached yet
            const cached = serverCache.get(`user:avatar:${accId}`);
            if (!cached) {
              const safeUrl = String(token.GAvatar).replace(/'/g, "''");
              prisma.$executeRawUnsafe(`
                UPDATE [dbo].[cdbAccounts]
                SET GAvatar = '${safeUrl}'
                WHERE AccountID = ${accId} AND (GAvatar IS NULL OR GAvatar != '${safeUrl}');
              `).then(() => {
                serverCache.set(`user:avatar:${accId}`, token.GAvatar as string, USER_AVATAR_CACHE_TTL);
                serverCache.delete('cdb_ao_avatars_map');
              }).catch((e) => console.warn('[JWT] Avatar sync notice:', e));
            }
          }
        }
      }

      // 1. Enforce Absolute 24-Hour Session Expiration (1 Day Limit)
      const authTime = (token.authTime as number) || Math.floor(Date.now() / 1000);
      const now = Math.floor(Date.now() / 1000);
      if (now - authTime > ABSOLUTE_SESSION_MAX_AGE) {
        token.error = 'SessionExpired';
        delete (token as any).AccountID;
        delete (token as any).RememberToken;
        delete (token as any).role;
        return token;
      }

      // 2. Enforce Single Active Session via RememberToken
      // Impersonation is isolated so it never triggers or alters the DB token
      if (!token.isImpersonating && token.AccountID && token.RememberToken && !user) {
        const accountId = Number(token.AccountID);
        if (!isNaN(accountId)) {
          const activeRememberToken = await getCachedUserRememberToken(accountId);
          if (activeRememberToken && activeRememberToken !== token.RememberToken) {
            token.error = 'SessionReplaced';
            delete (token as any).AccountID;
            delete (token as any).RememberToken;
            delete (token as any).role;
            return token;
          }
        }
      }

      if (token.error) {
        return token;
      }

      // Proactive Self-Healing Role & Name Sync:
      // Guarantee ITadmin role and proper names for designated IT administrators
      if (!token.isImpersonating) {
        const currentEmail = (token.email as string || '').toLowerCase().trim();
        const currentAccountId = Number(token.AccountID);
        if (isSuperadminEmail(currentEmail) || [57845, 57846, 57732, 56395].includes(currentAccountId)) {
          token.role = 'ITadmin';
          token.assignedBUs = ['ALL'];
          token.assignedBrands = ['ALL'];

          if (currentEmail === 'jdoremon@ics.com.ph' || currentAccountId === 57845) {
            token.AccountID = '57845';
            token.AccountName = 'JAMES PAOLO DOREMON';
            token.name = 'JAMES PAOLO DOREMON';
          } else if (currentEmail === 'bcandelaria@ics.com.ph' || currentAccountId === 57846) {
            token.AccountID = '57846';
            token.AccountName = 'BHARON CHRISTOPHER CANDELARIA';
            token.name = 'BHARON CHRISTOPHER CANDELARIA';
          } else if (currentEmail === 'mescario@ics.com.ph' || currentAccountId === 57732) {
            token.AccountID = '57732';
            token.AccountName = 'MARK EDO ESCARIO';
            token.name = 'MARK EDO ESCARIO';
          } else if (currentEmail === 'dramos@ics.com.ph' || currentAccountId === 56395) {
            token.AccountID = '56395';
            token.AccountName = 'DAN LEMUEL RAMOS';
            token.name = 'DAN LEMUEL RAMOS';
          }
        }
      }

      // Handle in-place session update (e.g. from useSession().update(...) or impersonation switch)
      if (trigger === 'update' && updateSession) {
        if (updateSession.impersonateTarget !== undefined) {
          const target = updateSession.impersonateTarget;
          if (target === null) {
            // Exit impersonation: restore original admin claims
            const adminEmail = ((token.originalAdminEmail as string) || (token.email as string) || 'jdoremon@ics.com.ph').toLowerCase().trim();
            token.role = isSuperadminEmail(adminEmail) ? 'ITadmin' : 'admin';
            token.AccountGroup = 'HQ';
            token.DomainAccount = `CORP\\${adminEmail.split('@')[0].toUpperCase()}`;
            token.assignedBUs = ['ALL'];
            token.assignedBrands = ['ALL'];
            token.isImpersonating = false;

            if (adminEmail === 'jdoremon@ics.com.ph') {
              token.AccountID = '57845';
              token.AccountName = 'JAMES PAOLO DOREMON';
              token.name = 'JAMES PAOLO DOREMON';
            } else if (adminEmail === 'bcandelaria@ics.com.ph') {
              token.AccountID = '57846';
              token.AccountName = 'BHARON CHRISTOPHER CANDELARIA';
              token.name = 'BHARON CHRISTOPHER CANDELARIA';
            } else if (adminEmail === 'mescario@ics.com.ph') {
              token.AccountID = '57732';
              token.AccountName = 'MARK EDO ESCARIO';
              token.name = 'MARK EDO ESCARIO';
            } else if (adminEmail === 'dramos@ics.com.ph') {
              token.AccountID = '56395';
              token.AccountName = 'DAN LEMUEL RAMOS';
              token.name = 'DAN LEMUEL RAMOS';
            } else {
              token.AccountName = adminEmail.split('@')[0].toUpperCase();
              token.name = token.AccountName;
            }
          } else if (target) {
            // Apply target persona claims
            token.AccountID = String(target.accountId);
            token.AccountName = target.name;
            token.name = target.name;
            token.role = target.role;
            const rawDomain = target.domainAccount || target.email.split('@')[0].toUpperCase();
            token.DomainAccount = rawDomain.startsWith('CORP\\') ? rawDomain : `CORP\\${rawDomain}`;
            token.AccountGroup = target.assignedBUs.join(',') || 'HQ';
            token.assignedBUs = target.assignedBUs;
            token.assignedBrands = target.assignedBrands || [];
            token.isImpersonating = true;
            if (!token.originalAdminEmail) {
              token.originalAdminEmail = token.email as string;
            }
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token?.error || !token?.AccountID) {
        return null as any;
      }
      if (session.user) {
        const u = session.user as any;
        u.DomainAccount = token.DomainAccount as string;
        u.AccountGroup = token.AccountGroup as string;
        u.AccountID = token.AccountID as string;
        u.AccountName = (token.AccountName as string) || (session.user.name as string) || 'User';
        session.user.name = u.AccountName;

        // Guarantee ITadmin role for superadmin accounts when not impersonating
        if (!token.isImpersonating) {
          const userEmail = (session.user.email || token.email as string || '').toLowerCase().trim();
          const accountId = Number(token.AccountID);
          if (isSuperadminEmail(userEmail) || [57845, 57846, 57732, 56395].includes(accountId)) {
            u.role = 'ITadmin';
            u.assignedBUs = ['ALL'];
            u.assignedBrands = ['ALL'];
          } else {
            u.role = token.role as UserRole;
            u.assignedBUs = (token.assignedBUs as string[]) || [];
            u.assignedBrands = (token.assignedBrands as string[]) || [];
          }
        } else {
          u.role = token.role as UserRole;
          u.assignedBUs = (token.assignedBUs as string[]) || [];
          u.assignedBrands = (token.assignedBrands as string[]) || [];
        }

        u.RememberToken = (token.RememberToken as string) || null;
        u.isImpersonating = Boolean(token.isImpersonating);
        u.originalAdminEmail = (token.originalAdminEmail as string) || undefined;
        u.GAvatar = (token.GAvatar as string) || undefined;
        if (token.GAvatar) {
          session.user.image = token.GAvatar as string;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: ABSOLUTE_SESSION_MAX_AGE, // 24 Hours (1 Day) session
    updateAge: 15 * 60,               // Re-validate session every 15 minutes
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET || 'super-secret-deals-reg-portal-key',
};
