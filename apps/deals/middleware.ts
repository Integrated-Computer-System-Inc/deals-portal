import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    // Custom middleware logic can go here if needed.
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
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
    '/((?!api|_next/static|_next/image|favicon.ico|login).*)',
  ],
};
