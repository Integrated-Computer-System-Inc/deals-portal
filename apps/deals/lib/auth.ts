import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { UserRole } from '@my-app/types';
import { prisma } from '@my-app/database';

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
      },
      async authorize(credentials) {
        const type = credentials?.accountType || 'admin';

        switch (type) {
          case 'bu':
            return {
              id: 'usr_demo_bu5',
              name: 'BU Head',
              email: 'bu.supervisor@ics.com.ph',
              DomainAccount: 'CORP\\BU5_HEAD',
              AccountGroup: credentials?.accountGroup || 'BU5',
              AccountID: 'ACC-BU-5001',
              AccountName: 'BU Head',
              role: 'bu' as UserRole,
            };
          case 'ao':
            return {
              id: 'usr_demo_ao_camille',
              name: credentials?.accountName || 'CAMILLE KILAKIGA',
              email: 'camille.kilakiga@ics.com.ph',
              DomainAccount: 'CORP\\CKILAKIGA',
              AccountGroup: credentials?.accountGroup || 'BU5',
              AccountID: 'ACC-AO-705',
              AccountName: credentials?.accountName || 'CAMILLE KILAKIGA',
              role: 'ao' as UserRole,
            };
          case 'aa':
            return {
              id: 'usr_demo_sales_aa',
              name: 'Sales AA',
              email: 'sales.aa@ics.com.ph',
              DomainAccount: 'CORP\\SALES_AA',
              AccountGroup: 'HQ',
              AccountID: 'ACC-AA-1001',
              AccountName: 'Sales AA',
              role: 'aa' as UserRole,
            };
          case 'admin':
          default:
            return {
              id: 'usr_demo_admin',
              name: credentials?.accountName || 'Administrator',
              email: 'admin@ics.com.ph',
              DomainAccount: 'CORP\\ADMIN',
              AccountGroup: 'HQ',
              AccountID: 'ACC-ADMIN-001',
              AccountName: credentials?.accountName || 'Administrator',
              role: 'admin' as UserRole,
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

          const emailLower = user.email.toLowerCase();
          const emailDomain = emailLower.split('@')[1];

          // 1. Validate enterprise email domain (all @ics.com.ph allowed)
          const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || 'ics.com.ph')
            .split(',')
            .map((d) => d.trim().toLowerCase())
            .filter(Boolean);

          if (!emailDomain || !allowedDomains.includes(emailDomain)) {
            console.warn(
              `Sign-in rejected: ${user.email} does not match allowed domains:`,
              allowedDomains
            );
            return '/login?error=AccessDenied';
          }

          // 2. Check if user is configured as Admin via ADMIN_EMAILS env variable
          const adminEmails = (process.env.ADMIN_EMAILS || 'jdoremon@ics.com.ph')
            .split(',')
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean);

          const isAdmin = adminEmails.includes(emailLower);

          // 3. Defaults based on Google profile
          const emailPrefix = emailLower.split('@')[0];
          let accountID = `ACC-${emailPrefix.toUpperCase()}`;
          let accountName = user.name || emailPrefix.replace(/\./g, ' ').toUpperCase();
          let accountGroup = isAdmin ? 'HQ' : 'BU5';
          let domainAccount = `CORP\\${emailPrefix.toUpperCase()}`;

          // 4. Try to fetch rich corporate directory information with ultra-fast 100ms timeout
          try {
            const encodedEmail = Buffer.from(user.email).toString('base64');
            const res = await fetch(`https://ice-cream.ics.com.ph/api/liveSearch?key=${encodedEmail}`, {
              signal: AbortSignal.timeout(100),
            });

            if (res.ok) {
              const data = await res.json();
              const accountData = Array.isArray(data) ? data[0] : data;

              if (accountData) {
                if (accountData.AccountID) accountID = String(accountData.AccountID);
                if (accountData.AccountName) accountName = accountData.AccountName;
                if (accountData.AccountGroup) accountGroup = accountData.AccountGroup;
                if (accountData.DomainAccount) domainAccount = accountData.DomainAccount;
              }
            }
          } catch {
            // Fast fallback to Google profile defaults
          }

          // 5. Role determination:
          // Admin if in ADMIN_EMAILS, else check existing UsersTable role, else default to 'ao'
          let roleToAssign: UserRole = isAdmin ? 'admin' : 'ao';

          try {
            const existingUser = await prisma.usersTable.findUnique({
              where: { Email: user.email },
            });

            if (isAdmin) {
              roleToAssign = 'admin';
            } else if (existingUser && existingUser.UserRole) {
              roleToAssign = existingUser.UserRole as UserRole;
            }

            await prisma.usersTable.upsert({
              where: { Email: user.email },
              update: {
                AccountName: accountName,
                ...(isAdmin ? { UserRole: 'admin' } : {}),
              },
              create: {
                AccountID: accountID,
                AccountName: accountName,
                Email: user.email,
                UserRole: roleToAssign,
              },
            });
          } catch (dbError) {
            console.warn('Could not upsert into UsersTable. Continuing login.', dbError);
          }

          (user as any).AccountID = accountID;
          (user as any).AccountName = accountName;
          (user as any).AccountGroup = accountGroup;
          (user as any).DomainAccount = domainAccount;
          (user as any).role = roleToAssign;
          return true;
        } catch (error) {
          console.error('Error during Google sign-in validation:', error);
          return '/login?error=AccessDenied';
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        const u = user as any;
        token.AccountID = u.AccountID || 'UNKNOWN';
        token.AccountName = u.AccountName || u.name || 'User';
        token.role = u.role || 'ao';
        token.DomainAccount = u.DomainAccount || `CORP\\${(u.email || '').split('@')[0].toUpperCase()}`;
        token.AccountGroup = u.AccountGroup || 'BU5';
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
