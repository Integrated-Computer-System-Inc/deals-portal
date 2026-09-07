'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@my-app/database';
import { runUserTableMigration } from '@/lib/db-migration';

/**
 * Checks whether the currently logged-in user in dbo.Users has already completed or dismissed the onboarding tour.
 * Returns { hasCompletedTour: boolean }.
 */
export async function getUserTourStatus(): Promise<{ hasCompletedTour: boolean }> {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user) {
      return { hasCompletedTour: true }; // Do not show tour for unauthenticated sessions
    }

    const accountId = Number(user.AccountID || 0);
    const email = (user.email || '').toLowerCase().trim();

    await runUserTableMigration();

    const result = await prisma.$queryRawUnsafe<any[]>(`
      IF EXISTS (SELECT * FROM sysobjects WHERE name='Users' and xtype='U')
      BEGIN
        IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'HasCompletedTour')
          SELECT TOP 1 HasCompletedTour
          FROM [dbo].[Users]
          WHERE AccountID = ${accountId} OR LOWER(Email) = '${email.replace(/'/g, "''")}';
        ELSE
          SELECT CAST(0 AS BIT) AS HasCompletedTour;
      END
      ELSE
        SELECT CAST(0 AS BIT) AS HasCompletedTour;
    `);

    if (Array.isArray(result) && result.length > 0) {
      const val = result[0]?.HasCompletedTour;
      return { hasCompletedTour: Boolean(val === true || val === 1) };
    }

    // If user is brand new and not yet in Users table, treat as first-time (false)
    return { hasCompletedTour: false };
  } catch (err) {
    console.warn('[getUserTourStatus] Error querying tour status from dbo.Users:', err);
    return { hasCompletedTour: false };
  }
}

/**
 * Marks the tour as completed for the current user in dbo.Users table.
 */
export async function markTourCompleted(): Promise<{ success: boolean }> {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user) {
      return { success: false };
    }

    const accountId = Number(user.AccountID || 0);
    const email = (user.email || '').toLowerCase().trim();
    const accountName = (user.AccountName || user.name || email.split('@')[0]).replace(/'/g, "''");
    const userRole = (user.role || 'ao').replace(/'/g, "''");

    await runUserTableMigration();

    await prisma.$executeRawUnsafe(`
      IF EXISTS (SELECT * FROM sysobjects WHERE name='Users' and xtype='U')
      BEGIN
        IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'HasCompletedTour')
        BEGIN
          IF EXISTS (SELECT 1 FROM [dbo].[Users] WHERE AccountID = ${accountId} OR LOWER(Email) = '${email.replace(/'/g, "''")}')
          BEGIN
            UPDATE [dbo].[Users]
            SET HasCompletedTour = 1
            WHERE AccountID = ${accountId} OR LOWER(Email) = '${email.replace(/'/g, "''")}';
          END
          ELSE
          BEGIN
            INSERT INTO [dbo].[Users] (AccountID, AccountName, Email, UserRole, HasCompletedTour, DtCreation, LastLogin)
            VALUES (${accountId}, N'${accountName}', '${email.replace(/'/g, "''")}', '${userRole}', 1, GETDATE(), GETDATE());
          END
        END
      END
    `);

    return { success: true };
  } catch (err) {
    console.error('[markTourCompleted] Error updating HasCompletedTour in dbo.Users:', err);
    return { success: false };
  }
}
