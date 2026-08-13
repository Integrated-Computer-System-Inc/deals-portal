import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { UserRole } from '@my-app/types';

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
    async jwt({ token, user }) {
      if (user) {
        const u = user as any;
        token.DomainAccount = u.DomainAccount || 'CORP\\DEMOUSER';
        token.AccountGroup = u.AccountGroup || 'HQ';
        token.AccountID = u.AccountID || 'ACC-0001';
        token.AccountName = u.AccountName || u.name || 'Demo User';
        token.role = u.role || 'admin';
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
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET || 'super-secret-deals-reg-portal-key',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
