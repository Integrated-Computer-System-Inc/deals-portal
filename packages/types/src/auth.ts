/**
 * Extended NextAuth Session & JWT Types with Domain User Claims
 */

import 'next-auth';
import 'next-auth/jwt';
import { UserRole } from './deals';

export interface DomainUserClaims {
  DomainAccount: string;
  AccountGroup: string;
  AccountID: string;
  AccountName: string;
  role: UserRole;
}

export interface CustomUserSession extends DomainUserClaims {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

declare module 'next-auth' {
  interface Session {
    user: CustomUserSession;
  }

  interface User extends DomainUserClaims {
    id?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DomainUserClaims {
    sub?: string;
  }
}
