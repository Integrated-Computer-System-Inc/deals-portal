import { NextRequest, NextResponse } from 'next/server';
import { processNotifications } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

/**
 * Route: /api/cron/dispatch-emails (TSK-006)
 * Scheduled task that reads deals_reg_notification where status = 0,
 * sends emails via SMTP, and marks them status = 1 with dateSent = now()
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

    const results = await processNotifications();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[/api/cron/dispatch-emails] Execution error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
