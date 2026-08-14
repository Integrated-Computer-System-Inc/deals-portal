import { NextRequest, NextResponse } from 'next/server';
import { getScopedDeals } from '@/app/actions/deals';
import { ScopedDealsFilter } from '@my-app/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/deals
 * Direct API endpoint for fetching scoped deals.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filter: ScopedDealsFilter = {
      userRole: (searchParams.get('userRole') as ScopedDealsFilter['userRole']) || undefined,
      accountName: searchParams.get('accountName') || undefined,
      accountGroup: searchParams.get('accountGroup') || undefined,
    };

    const result = await getScopedDeals(filter);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[/api/deals] Execution error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
