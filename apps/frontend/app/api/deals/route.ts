import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

/**
 * GET /api/deals
 * Proxies the request to the Express backend REST endpoint.
 */
export async function GET(request: Request) {
  try {
    // Forward any authorization headers from the incoming request
    const authHeader = request.headers.get('authorization') || '';

    const res = await fetch(`${BACKEND_URL}/api/deals`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: 'no-store',
    });

    const data = await res.json();

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[/api/deals] Backend proxy error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch deals from the backend service.',
      },
      { status: 500 }
    );
  }
}
