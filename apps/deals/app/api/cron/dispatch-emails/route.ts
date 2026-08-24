import { NextRequest, NextResponse } from 'next/server';
import { runNotificationCron } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

/**
 * Route: /api/cron/dispatch-emails
 * Unified scheduled worker that:
 * 1. Scans active deals for expiration milestones (30d, 15d, 7d, <=3d daily) and enqueues warning emails.
 * 2. Reads dbo.deals_reg_notification where status = 0, dispatches via SMTP, and marks status = 1 (Sent) or 2 (Failed).
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
    console.error('[/api/cron/dispatch-emails] Execution error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
