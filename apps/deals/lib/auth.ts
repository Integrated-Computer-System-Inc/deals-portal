import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { UserRole } from '@my-app/types';
import { prisma } from '@my-app/database';
import { randomUUID } from 'crypto';
import { resolveUserRoleAndBUs, isConfiguredAdminEmail } from './roles';

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
      },
      async authorize(credentials) {
        const type = credentials?.accountType || 'admin';
        const email = credentials?.email?.toLowerCase();

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
    async signIn({ user, account }) {
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

          // 2. Check if user is an Admin configured in ADMIN_EMAILS
          const isAdmin = isConfiguredAdminEmail(emailLower) || isConfiguredAdminEmail(user.email);

          // 3. Query cdbAccounts with lightweight scalar projection (skipping binary blobs)
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

          // 4. Block access if user does not exist in corporate directory AND is not in ADMIN_EMAILS
          if (!cdbAccount && !isAdmin) {
            console.warn(
              `[Google Sign-In] Access Denied: User ${user.email} (${user.name}) not found in cdbAccounts and not in ADMIN_EMAILS.`
            );
            return '/login?error=AccessDenied';
          }

          // 5. Resolve Role, Assigned Business Units & Authorization Status
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

          const rememberToken = randomUUID();
          const assignedBUsStr = userAccess.assignedBUs.join(',') || accountGroup || 'BU5';
          const domainAccount = cdbAccount?.DomainAccount
            ? `CORP\\${cdbAccount.DomainAccount}`
            : `CORP\\${emailLower.split('@')[0].toUpperCase()}`;

          // 6. Persist / upsert session details into dbo.Users table if table exists
          try {
            await prisma.$executeRawUnsafe(`
              IF EXISTS (SELECT * FROM sysobjects WHERE name='Users' and xtype='U')
              BEGIN
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
              END
            `);
          } catch (dbError) {
            console.warn('[Google Sign-In] Could not persist into Users table. Continuing login:', dbError);
          }

          // 7. Attach claims to NextAuth user object
          (user as any).AccountID = String(accountId);
          (user as any).AccountName = accountName;
          (user as any).AccountGroup = assignedBUsStr;
          (user as any).DomainAccount = domainAccount;
          (user as any).role = userAccess.role;
          (user as any).assignedBUs = userAccess.assignedBUs;
          (user as any).RememberToken = rememberToken;

          return true;
        } catch (error) {
          console.error('[Google Sign-In] Unexpected error during authentication validation:', error);
          return '/login?error=AccessDenied';
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const u = user as any;
        token.AccountID = u.AccountID || 'UNKNOWN';
        token.AccountName = u.AccountName || u.name || 'User';
        token.role = u.role || 'ao';
        token.DomainAccount = u.DomainAccount || `CORP\\${(u.email || '').split('@')[0].toUpperCase()}`;
        token.AccountGroup = u.AccountGroup || 'BU5';
        token.assignedBUs = u.assignedBUs || [];
        token.RememberToken = u.RememberToken || null;
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
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET || 'super-secret-deals-reg-portal-key',
};
