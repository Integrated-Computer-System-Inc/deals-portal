import { NextRequest, NextResponse } from 'next/server';
import { runNotificationCron } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

/**
 * Route: /api/cron/notifications (Alias/Compatibility endpoint)
 * Unified scheduled worker delegating to runNotificationCron.
 */
export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');

    if (cronSecret && process.env.NODE_ENV === 'production') {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
    }

    const results = await runNotificationCron();

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[/api/cron/notifications] Execution error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
