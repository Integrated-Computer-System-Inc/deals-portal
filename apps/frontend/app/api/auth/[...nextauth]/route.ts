import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { UserRole } from '@my-app/types';
import { prisma } from '@my-app/database';

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'MOCK_GOOGLE_CLIENT_ID',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'MOCK_GOOGLE_CLIENT_SECRET',
    }),
    CredentialsProvider({
      id: 'demo-credentials',
      name: 'Demo Login',
      credentials: {
        accountName: { label: 'Account Name', type: 'text' },
      },
      async authorize(credentials) {
        const accountName = credentials?.accountName || 'Demo User';

        return {
          id: 'usr_demo_101',
          name: accountName,
          email: `demo@ics.com.ph`,
          DomainAccount: `CORP\\DEMOUSER`,
          AccountGroup: 'HQ',
          AccountID: 'ACC-0001',
          AccountName: accountName,
          role: 'admin' as UserRole,
        };
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
            // Upsert user into UsersTable
            try {
              await prisma.usersTable.upsert({
                where: { Email: user.email },
                update: {
                  AccountName: accountData.AccountName,
                },
                create: {
                  AccountID: String(accountData.AccountID),
                  AccountName: accountData.AccountName,
                  Email: user.email,
                  UserRole: 'user',
                }
              });
            } catch (dbError) {
              console.warn('Could not upsert into UsersTable. Continuing login.', dbError);
            }
            
            // Attach these to the user object so they can be passed to the jwt callback
            (user as any).AccountID = String(accountData.AccountID);
            (user as any).AccountName = accountData.AccountName;
            (user as any).role = 'user';
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
        if (account?.provider === 'google') {
           token.AccountID = (user as any).AccountID || 'UNKNOWN';
           token.AccountName = (user as any).AccountName || user.name || 'Google User';
           token.role = (user as any).role || 'user';
           token.DomainAccount = `GOOGLE\\${(user.email || '').split('@')[0].toUpperCase()}`;
           token.AccountGroup = 'G-USER';
        } else {
           const u = user as any;
           token.DomainAccount = u.DomainAccount || 'CORP\\DEMOUSER';
           token.AccountGroup = u.AccountGroup || 'HQ';
           token.AccountID = u.AccountID || 'ACC-0001';
           token.AccountName = u.AccountName || u.name || 'Demo User';
           token.role = u.role || 'admin';
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

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
