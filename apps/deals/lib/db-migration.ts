import { prisma } from '@my-app/database';

let columnsExistCache: boolean | null = null;
let migrationRan = false;

/**
 * Checks if AssignedBU and AssignedBrand columns exist in dbo.Users.
 */
export async function hasAssignedColumns(): Promise<boolean> {
  if (columnsExistCache !== null) return columnsExistCache;
  try {
    const res = await prisma.$queryRawUnsafe<any[]>(`
      SELECT COUNT(*) AS cnt
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Users'
        AND COLUMN_NAME IN ('AssignedBU', 'AssignedBrand');
    `);
    const count = Number(res?.[0]?.cnt || 0);
    columnsExistCache = count >= 2;
    return columnsExistCache;
  } catch {
    return false;
  }
}

/**
 * Invalidate column existence cache (e.g. after migration is run).
 */
export function invalidateColumnCache() {
  columnsExistCache = null;
}

/**
 * Idempotent migration: adds AssignedBU + AssignedBrand columns to dbo.Users
 * and back-fills existing rows that still use the composite UserRole format
 * (e.g. 'bu:BU8,BU12,CE01' → UserRole='bu', AssignedBU='BU8,BU12,CE01').
 *
 * Note: If the SQL login does not have DDL (ALTER TABLE) privileges,
 * run the SQL migration script in SSMS.
 */
export async function runUserTableMigration(): Promise<void> {
  if (migrationRan) return;
  migrationRan = true;

  try {
    // 1. Add AssignedBU column if it doesn't exist yet
    await prisma.$executeRawUnsafe(`
      IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'AssignedBU'
      )
      ALTER TABLE [dbo].[Users] ADD AssignedBU NVARCHAR(500) NULL;
    `);

    // 2. Add AssignedBrand column if it doesn't exist yet
    await prisma.$executeRawUnsafe(`
      IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'AssignedBrand'
      )
      ALTER TABLE [dbo].[Users] ADD AssignedBrand NVARCHAR(500) NULL;
    `);

    // 3. Back-fill existing rows that still have composite UserRole values
    //    Rows with 'bu:BU1,BU2', 'ao:BU5', 'bu_admin:BU8' → split into role + AssignedBU
    //    Rows with 'pm:DELL,HPI'                           → split into role + AssignedBrand
    //    Only rows matching '%:%' are touched (WHERE clause makes it idempotent)
    await prisma.$executeRawUnsafe(`
      UPDATE [dbo].[Users]
      SET
        AssignedBU = CASE
          WHEN UserRole LIKE 'bu:%'       THEN SUBSTRING(UserRole, CHARINDEX(':', UserRole) + 1, 500)
          WHEN UserRole LIKE 'ao:%'       THEN SUBSTRING(UserRole, CHARINDEX(':', UserRole) + 1, 500)
          WHEN UserRole LIKE 'bu_admin:%' THEN SUBSTRING(UserRole, CHARINDEX(':', UserRole) + 1, 500)
          ELSE AssignedBU
        END,
        AssignedBrand = CASE
          WHEN UserRole LIKE 'pm:%' THEN SUBSTRING(UserRole, CHARINDEX(':', UserRole) + 1, 500)
          ELSE AssignedBrand
        END,
        UserRole = CASE
          WHEN CHARINDEX(':', UserRole) > 0
          THEN LEFT(UserRole, CHARINDEX(':', UserRole) - 1)
          ELSE UserRole
        END
      WHERE UserRole LIKE '%:%';
    `);

    console.log('[DB Migration] Users table migration completed (AssignedBU + AssignedBrand).');
  } catch (err) {
    // Non-fatal — app still runs, but log prominently
    console.error('[DB Migration] Failed to run Users table migration:', err);
  }
}
