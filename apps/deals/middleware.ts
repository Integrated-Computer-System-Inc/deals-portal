import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    // Custom middleware logic can go here if needed.
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => Boolean(token && !token.error && token.AccountID),
    },
    pages: {
      signIn: '/login',
      error: '/login',
    },
  }
);

export const config = {
  matcher: [
    // Protect everything except /login and public assets
    '/((?!api|icons|_next/static|_next/image|favicon.ico|login).*)',
  ],
};
