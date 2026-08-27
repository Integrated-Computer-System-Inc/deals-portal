import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { UserRole } from '@my-app/types';
import { prisma } from '@my-app/database';
import { randomUUID } from 'crypto';
import { resolveUserRoleAndBUs, isSuperadminEmail, isConfiguredAdminEmail, getImpersonationPersona, ACCOUNT_ROLE_REGISTRY } from './roles';
import { serverCache } from '@/lib/serverCache';

const CDB_ACCOUNT_SELECT = {
  AccountID: true,
  AccountName: true,
  Email: true,
  DomainAccount: true,
  AccountGroup: true,
  AccountType: true,
  isActive: true,
} as const;

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
      id: 'demo-credentials',
      name: 'Demo Accounts',
      credentials: {
        accountType: { label: 'Account Type', type: 'text' },
        accountName: { label: 'Account Name', type: 'text' },
        accountGroup: { label: 'Account Group', type: 'text' },
        email: { label: 'Email', type: 'text' },
        personaAccountId: { label: 'Persona Account ID', type: 'text' },
        adminEmail: { label: 'Admin Email', type: 'text' },
      },
      async authorize(credentials) {
        const type = credentials?.accountType || 'admin';
        const email = credentials?.email?.toLowerCase();

        // Check if direct persona accountId is provided for dev impersonation
        if (credentials?.personaAccountId) {
          const pId = Number(credentials.personaAccountId);
          const persona = getImpersonationPersona(pId) || ACCOUNT_ROLE_REGISTRY[pId];
          if (persona) {
            const personaEmail = persona.email || `${persona.name.toLowerCase().replace(/\s+/g, '')}@ics.com.ph`;
            const rawDomain = persona.domainAccount || personaEmail.split('@')[0].toUpperCase();
            return {
              id: `usr_${persona.accountId}`,
              name: persona.name,
              email: personaEmail,
              DomainAccount: rawDomain.startsWith('CORP\\') ? rawDomain : `CORP\\${rawDomain}`,
              AccountGroup: persona.assignedBUs.join(',') || 'HQ',
              AccountID: String(persona.accountId),
              AccountName: persona.name,
              role: persona.role,
              assignedBUs: persona.assignedBUs,
              RememberToken: randomUUID(),
              isImpersonating: true,
              originalAdminEmail: credentials.adminEmail || 'jdoremon@ics.com.ph',
            };
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
              const existingUser = await prisma.$queryRawUnsafe<any[]>(`
                IF EXISTS (SELECT * FROM sysobjects WHERE name='Users' and xtype='U')
                  SELECT TOP 1 AccountID, AccountName, Email, UserRole, RememberToken
                  FROM Users
                  WHERE LOWER(Email) = '${userEmail.replace(/'/g, "''")}';
              `);
              if (Array.isArray(existingUser) && existingUser.length > 0 && existingUser[0].UserRole) {
                const u = existingUser[0];
                const accountId = Number(u.AccountID);
                const userRole = u.UserRole as UserRole;
                const accountName = u.AccountName || userEmail.split('@')[0].toUpperCase();
                const userAccess = resolveUserRoleAndBUs(accountId, userEmail, 'HQ', 'AO', 1, userRole);
                const assignedBUs = userRole === 'admin' ? ['ALL'] : (userAccess.assignedBUs.length > 0 ? userAccess.assignedBUs : ['BU5']);

                return {
                  id: `usr_${accountId}`,
                  name: accountName,
                  email: userEmail,
                  DomainAccount: `CORP\\${userEmail.split('@')[0].toUpperCase()}`,
                  AccountGroup: assignedBUs.join(',') || 'BU5',
                  AccountID: String(accountId),
                  AccountName: accountName,
                  role: userRole,
                  assignedBUs: assignedBUs,
                  RememberToken: u.RememberToken || rememberToken,
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

            const accountId = cdbAccount ? cdbAccount.AccountID : 99999;
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
              await prisma.$executeRawUnsafe(`
                IF EXISTS (SELECT * FROM sysobjects WHERE name='Users' and xtype='U')
                BEGIN
                  IF EXISTS (SELECT 1 FROM Users WHERE AccountID = ${accountId})
                    UPDATE Users 
                    SET AccountName = N'${accountName.replace(/'/g, "''")}',
                        Email = '${userEmail.replace(/'/g, "''")}',
                        UserRole = '${userAccess.role}',
                        RememberToken = '${rememberToken}',
                        LastLogin = GETDATE()
                    WHERE AccountID = ${accountId};
                  ELSE
                    INSERT INTO Users (AccountID, AccountName, Email, UserRole, RememberToken, DtCreation, LastLogin)
                    VALUES (${accountId}, N'${accountName.replace(/'/g, "''")}', '${userEmail.replace(/'/g, "''")}', '${userAccess.role}', '${rememberToken}', GETDATE(), GETDATE());
                END
              `);
            } catch (dbErr) {
              console.warn('[Credentials] Error saving into Users table:', dbErr);
            }

            const assignedBUsStr = userAccess.assignedBUs.join(',') || accountGroup || 'BU5';
            return {
              id: `usr_${accountId}`,
              name: accountName,
              email: userEmail,
              DomainAccount: cdbAccount?.DomainAccount ? `CORP\\${cdbAccount.DomainAccount}` : `CORP\\${userEmail.split('@')[0].toUpperCase()}`,
              AccountGroup: assignedBUsStr,
              AccountID: String(accountId),
              AccountName: accountName,
              role: userAccess.role,
              assignedBUs: userAccess.assignedBUs,
              RememberToken: rememberToken,
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

          // 1. Validate enterprise email domain (all @ics.com.ph allowed)
          const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || 'ics.com.ph')
            .split(',')
            .map((d) => d.trim().toLowerCase())
            .filter(Boolean);

          if (!emailDomain || !allowedDomains.includes(emailDomain)) {
            console.warn(
              `[Google Sign-In] Rejected: ${user.email} does not match allowed domains:`,
              allowedDomains
            );
            return '/login?error=AccessDenied';
          }

          // Extract latest Google profile photo URL
          const googlePhotoUrl = (user.image || (profile as any)?.picture || (account as any)?.picture || '').trim();

          // Helper to synchronize Google profile photo with cdbAccounts and cache
          const syncGooglePhotoToCdb = async (targetEmail: string, targetAccountId?: number) => {
            if (!googlePhotoUrl) return;
            try {
              const conditions: any[] = [
                { Email: targetEmail },
                { Email: targetEmail.toUpperCase() },
              ];
              if (targetAccountId && !isNaN(targetAccountId) && targetAccountId > 0) {
                conditions.push({ AccountID: targetAccountId });
              }
              await prisma.cdbAccounts.updateMany({
                where: { OR: conditions },
                data: {
                  GAvatar: googlePhotoUrl,
                  LastSynced: new Date(),
                },
              });
              serverCache.delete('cdb_ao_avatars_map');
              serverCache.invalidateTags(['deals', 'dashboard']);
            } catch (syncPhotoError) {
              console.warn('[Google Sign-In] Auto-syncing Google profile photo error:', syncPhotoError);
            }
          };

          // 2. FAST-PATH: Check if user is already registered in dbo.Users table with valid RememberToken
          try {
            const usersQueryResult = await prisma.$queryRawUnsafe<any[]>(`
              IF EXISTS (SELECT * FROM sysobjects WHERE name='Users' and xtype='U')
                SELECT TOP 1 AccountID, AccountName, Email, UserRole, RememberToken, DtCreation, LastLogin
                FROM Users
                WHERE LOWER(Email) = '${emailLower.replace(/'/g, "''")}';
            `);

            if (Array.isArray(usersQueryResult) && usersQueryResult.length > 0 && usersQueryResult[0].UserRole) {
              const existingUser = usersQueryResult[0];
              const accountId = Number(existingUser.AccountID);
              const userRole = existingUser.UserRole as UserRole;
              const accountName = existingUser.AccountName || user.name || emailLower.split('@')[0].toUpperCase();
              const rememberToken = existingUser.RememberToken || randomUUID();

              // Resolve BU scopes with explicit UserRole from Users table
              const userAccess = resolveUserRoleAndBUs(
                accountId,
                emailLower,
                'HQ',
                'AO',
                1,
                userRole
              );

              const assignedBUs = userRole === 'admin'
                ? ['ALL']
                : (userAccess.assignedBUs.length > 0 ? userAccess.assignedBUs : ['BU5']);

              // Synchronize photo and LastLogin asynchronously
              syncGooglePhotoToCdb(emailLower, accountId).catch(() => {});
              prisma.$executeRawUnsafe(`
                UPDATE Users 
                SET LastLogin = GETDATE(), RememberToken = '${rememberToken}' 
                WHERE AccountID = ${accountId};
              `).catch((e) => console.warn('[Fast-Path] Non-blocking LastLogin update error:', e));

              const domainAccount = `CORP\\${emailLower.split('@')[0].toUpperCase()}`;

              (user as any).AccountID = String(accountId);
              (user as any).AccountName = accountName;
              (user as any).AccountGroup = assignedBUs.join(',');
              (user as any).DomainAccount = domainAccount;
              (user as any).role = userRole;
              (user as any).assignedBUs = assignedBUs;
              (user as any).RememberToken = rememberToken;
              (user as any).GAvatar = googlePhotoUrl || undefined;

              return true;
            }
          } catch (fastPathError) {
            console.warn('[Google Sign-In] Fast-path lookup skipped, proceeding with directory verification:', fastPathError);
          }

          // 3. Check if user is a designated Superadmin
          const isSuperadmin = isSuperadminEmail(emailLower) || isSuperadminEmail(user.email);

          // 4. Query cdbAccounts with lightweight scalar projection (skipping binary blobs)
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

          // 5. Block access if user does not exist in corporate directory AND is not in Users/Superadmins
          if (!cdbAccount && !isSuperadmin) {
            console.warn(
              `[Google Sign-In] Access Denied: User ${user.email} (${user.name}) not found in cdbAccounts and not in Users table.`
            );
            return '/login?error=AccessDenied';
          }

          // 6. Resolve Role, Assigned Business Units & Authorization Status
          const accountId = cdbAccount ? cdbAccount.AccountID : 99999;
          const accountName = cdbAccount ? cdbAccount.AccountName : (user.name || emailLower.split('@')[0].toUpperCase());
          const accountGroup = cdbAccount ? cdbAccount.AccountGroup : 'HQ';
          const accountType = cdbAccount ? cdbAccount.AccountType : 'ADMIN';
          const isActive = cdbAccount ? cdbAccount.isActive : 1;

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
          syncGooglePhotoToCdb(emailLower, accountId).catch(() => {});

          const rememberToken = randomUUID();
          const assignedBUsStr = userAccess.assignedBUs.join(',') || accountGroup || 'BU5';
          const domainAccount = cdbAccount?.DomainAccount
            ? `CORP\\${cdbAccount.DomainAccount}`
            : `CORP\\${emailLower.split('@')[0].toUpperCase()}`;

          // 7. Persist / upsert session details into dbo.Users table if table exists
          try {
            await prisma.$executeRawUnsafe(`
              IF EXISTS (SELECT 1 FROM Users WHERE AccountID = ${accountId})
                UPDATE Users 
                SET AccountName = N'${accountName.replace(/'/g, "''")}',
                    Email = '${emailLower.replace(/'/g, "''")}',
                    UserRole = '${userAccess.role}',
                    RememberToken = '${rememberToken}',
                    LastLogin = GETDATE()
                WHERE AccountID = ${accountId};
              ELSE
                INSERT INTO Users (AccountID, AccountName, Email, UserRole, RememberToken, DtCreation, LastLogin)
                VALUES (${accountId}, N'${accountName.replace(/'/g, "''")}', '${emailLower.replace(/'/g, "''")}', '${userAccess.role}', '${rememberToken}', GETDATE(), GETDATE());
            `);
          } catch (dbError) {
            console.warn('[Google Sign-In] Users upsert notice:', dbError);
          }

          // 8. Attach claims to NextAuth user object
          (user as any).AccountID = String(accountId);
          (user as any).AccountName = accountName;
          (user as any).AccountGroup = assignedBUsStr;
          (user as any).DomainAccount = domainAccount;
          (user as any).role = userAccess.role;
          (user as any).assignedBUs = userAccess.assignedBUs;
          (user as any).RememberToken = rememberToken;
          (user as any).GAvatar = googlePhotoUrl || undefined;

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
        token.role = u.role || 'ao';
        token.DomainAccount = u.DomainAccount || `CORP\\${(u.email || '').split('@')[0].toUpperCase()}`;
        token.AccountGroup = u.AccountGroup || 'BU5';
        token.assignedBUs = u.assignedBUs || [];
        token.RememberToken = u.RememberToken || null;
        token.isImpersonating = u.isImpersonating || false;
        token.originalAdminEmail = u.originalAdminEmail || (isSuperadminEmail(u.email) ? u.email : undefined);
        token.GAvatar = u.GAvatar || user.image || undefined;
      }

      // Handle in-place session update (e.g. from useSession().update(...) or impersonation switch)
      if (trigger === 'update' && updateSession) {
        if (updateSession.impersonateTarget !== undefined) {
          const target = updateSession.impersonateTarget;
          if (target === null) {
            // Exit impersonation: restore superadmin claims
            const adminEmail = (token.originalAdminEmail as string) || (token.email as string) || 'jdoremon@ics.com.ph';
            token.role = 'admin';
            token.AccountName = 'Administrator';
            token.AccountGroup = 'HQ';
            token.DomainAccount = `CORP\\${adminEmail.split('@')[0].toUpperCase()}`;
            token.assignedBUs = [];
            token.isImpersonating = false;
          } else if (target) {
            // Apply target persona claims
            token.AccountID = String(target.accountId);
            token.AccountName = target.name;
            token.role = target.role;
            const rawDomain = target.domainAccount || target.email.split('@')[0].toUpperCase();
            token.DomainAccount = rawDomain.startsWith('CORP\\') ? rawDomain : `CORP\\${rawDomain}`;
            token.AccountGroup = target.assignedBUs.join(',') || 'HQ';
            token.assignedBUs = target.assignedBUs;
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
      if (session.user) {
        const u = session.user as any;
        u.DomainAccount = token.DomainAccount as string;
        u.AccountGroup = token.AccountGroup as string;
        u.AccountID = token.AccountID as string;
        u.AccountName = token.AccountName as string;
        u.role = token.role as UserRole;
        u.assignedBUs = (token.assignedBUs as string[]) || [];
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
    maxAge: 30 * 24 * 60 * 60, // 30 Days "Remember Me" persistent session
    updateAge: 24 * 60 * 60,    // Update token once per day
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET || 'super-secret-deals-reg-portal-key',
};
