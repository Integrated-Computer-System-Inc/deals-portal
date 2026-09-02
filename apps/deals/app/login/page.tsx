/**
 * Login Page — Server Component wrapper
 *
 * Fetches the NextAuth CSRF token on the server during SSR so:
 *  1. The NextAuth API route is compiled and warm before the first user click.
 *  2. The token is passed as a prop to the client component, eliminating the
 *     client-side mount fetch entirely (no "Failed to fetch" cold-start errors).
 */
import { headers } from 'next/headers';
import { LoginPageClient } from './login-client';

async function fetchCsrfToken(): Promise<string | null> {
  try {
    // Build an absolute URL from the incoming request host so this works in
    // any environment (localhost, staging, production).
    const reqHeaders = headers();
    const host = reqHeaders.get('host') ?? 'localhost:3000';
    const protocol = host.startsWith('localhost') ? 'http' : 'https';
    const res = await fetch(`${protocol}://${host}/api/auth/csrf`, {
      // next: { revalidate: 0 } forces a fresh token every request — CSRF tokens
      // must not be cached across users.
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.csrfToken as string) ?? null;
  } catch {
    // If the server fetch fails (e.g. during build), fall back gracefully.
    // The client will still attempt its own fetch on demand.
    return null;
  }
}

export default async function LoginPage() {
  const initialCsrfToken = await fetchCsrfToken();
  return <LoginPageClient initialCsrfToken={initialCsrfToken} />;
}
