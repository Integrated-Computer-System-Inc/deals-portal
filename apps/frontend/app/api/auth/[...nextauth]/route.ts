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
      name: 'Demo Account Switcher',
      credentials: {
        role: { label: 'Role', type: 'text' },
        accountName: { label: 'Account Name', type: 'text' },
      },
      async authorize(credentials) {
        const role = (credentials?.role || 'admin') as UserRole;
        const accountName = credentials?.accountName || 'Sarah Jenkins';

        return {
          id: 'usr_demo_101',
          name: accountName,
          email: `${accountName.toLowerCase().replace(/\s+/g, '.')}@company.com`,
          DomainAccount: `CORP\\${accountName.toUpperCase().replace(/\s+/g, '')}`,
          AccountGroup: role === 'bu_admin' ? 'BU2' : 'BU1',
          AccountID: 'ACC-8890',
          AccountName: accountName,
          role: role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.DomainAccount = user.DomainAccount || 'CORP\\DEMOUSER';
        token.AccountGroup = user.AccountGroup || 'BU1';
        token.AccountID = user.AccountID || 'ACC-0001';
        token.AccountName = user.AccountName || user.name || 'Demo User';
        token.role = user.role || 'admin';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.DomainAccount = token.DomainAccount as string;
        session.user.AccountGroup = token.AccountGroup as string;
        session.user.AccountID = token.AccountID as string;
        session.user.AccountName = token.AccountName as string;
        session.user.role = token.role as UserRole;
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
