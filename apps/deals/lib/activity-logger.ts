import { prisma } from '@my-app/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ActivityLogRecord } from '@my-app/types';

export interface ActivityLogInput {
  dealID?: number | null;
  dealRegID?: string | null;
  custName?: string | null;
  projectName?: string | null;
  action: string;
  fieldName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  remarks?: string | null;
  performedBy?: string | null;
  performedByName?: string | null;
  performedByRole?: string | null;
  impersonatedBy?: string | null;
}

/**
 * Extracts the current user details from NextAuth session for auditing.
 */
async function resolveCurrentActor(fallbackDomain = 'SYSTEM') {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (user) {
      const performedBy = user.DomainAccount || user.Email || user.email || fallbackDomain;
      const performedByName = user.AccountName || user.name || null;
      const performedByRole = user.role || null;
      const impersonatedBy = user.isImpersonating ? (user.originalAdminEmail || null) : null;

      return {
        performedBy,
        performedByName,
        performedByRole,
        impersonatedBy,
      };
    }
  } catch {
    // Background task or non-request context
  }

  return {
    performedBy: fallbackDomain,
    performedByName: fallbackDomain === 'SYSTEM' ? 'System Process' : fallbackDomain,
    performedByRole: null,
    impersonatedBy: null,
  };
}

/**
 * Logs a single activity audit entry to [dbo].[activity_logs].
 */
export async function logActivity(
  entry: ActivityLogInput,
  tx?: any
): Promise<void> {
  await logActivitiesBatch([entry], tx);
}

/**
 * Logs multiple activity audit entries to [dbo].[activity_logs] in a single operation.
 */
export async function logActivitiesBatch(
  entries: ActivityLogInput[],
  tx?: any
): Promise<void> {
  if (!entries || entries.length === 0) return;

  try {
    const client = tx || prisma;
    const defaultActor = await resolveCurrentActor();

    // 1. Get current maximum logID
    const maxResult = await client.$queryRawUnsafe(
      `SELECT ISNULL(MAX(logID), 0) AS maxId FROM [dbo].[activity_logs]`
    );
    let currentLogId = Number(maxResult?.[0]?.maxId || 0);

    const now = new Date();

    for (const item of entries) {
      currentLogId++;
      const performedBy = item.performedBy || defaultActor.performedBy;
      const performedByName = item.performedByName ?? defaultActor.performedByName;
      const performedByRole = item.performedByRole ?? defaultActor.performedByRole;
      const impersonatedBy = item.impersonatedBy ?? defaultActor.impersonatedBy;

      await client.$executeRawUnsafe(
        `INSERT INTO [dbo].[activity_logs] (
          [logID], [dealID], [dealRegID], [custName], [projectName],
          [action], [fieldName], [oldValue], [newValue], [remarks],
          [performedBy], [performedByName], [performedByRole], [impersonatedBy], [dtCreated]
        ) VALUES (
          @P1, @P2, @P3, @P4, @P5, @P6, @P7, @P8, @P9, @P10, @P11, @P12, @P13, @P14, @P15
        )`,
        currentLogId,
        item.dealID ?? null,
        item.dealRegID ?? null,
        item.custName ?? null,
        item.projectName ?? null,
        item.action,
        item.fieldName ?? null,
        item.oldValue ?? null,
        item.newValue ?? null,
        item.remarks ?? null,
        performedBy,
        performedByName,
        performedByRole,
        impersonatedBy,
        now
      );
    }
  } catch (error: any) {
    // Non-blocking catch to ensure portal business flow is never interrupted by audit logging
    console.warn('[ActivityLogger] Warning: Failed to record activity log entry:', error?.message || error);
  }
}
