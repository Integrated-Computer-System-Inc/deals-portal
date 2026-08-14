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

          const encodedEmail = Buffer.from(user.email).toString('base64');
          const res = await fetch(`https://ice-cream.ics.com.ph/api/liveSearch?key=${encodedEmail}`);

          if (!res.ok) {
            console.error('Failed to fetch liveSearch API:', res.statusText);
            return false;
          }

          const data = await res.json();
          const accountData = Array.isArray(data) ? data[0] : data;

          if (accountData && accountData.AccountID && accountData.AccountName) {
            let roleToAssign: UserRole = 'admin';
            try {
              const existingUser = await prisma.usersTable.findUnique({
                where: { Email: user.email },
              });
              if (existingUser && existingUser.UserRole) {
                roleToAssign = existingUser.UserRole as UserRole;
              } else {
                await prisma.usersTable.upsert({
                  where: { Email: user.email },
                  update: {
                    AccountName: accountData.AccountName,
                  },
                  create: {
                    AccountID: String(accountData.AccountID),
                    AccountName: accountData.AccountName,
                    Email: user.email,
                    UserRole: 'admin',
                  },
                });
              }
            } catch (dbError) {
              console.warn('Could not upsert into UsersTable. Continuing login.', dbError);
            }

            (user as any).AccountID = String(accountData.AccountID);
            (user as any).AccountName = accountData.AccountName;
            (user as any).role = roleToAssign;
            return true;
          } else {
            console.error('Validation failed: AccountID or AccountName missing in response.');
            return '/login?error=AccessDenied';
          }
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
        token.AccountName = u.AccountName || u.name || 'Demo User';
        token.role = u.role || 'admin';
        token.DomainAccount = u.DomainAccount || `GOOGLE\\${(u.email || '').split('@')[0].toUpperCase()}`;
        token.AccountGroup = u.AccountGroup || 'HQ';
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
  secret: process.env.NEXTAUTH_SECRET || 'super-secret-deals-reg-portal-key',
};
