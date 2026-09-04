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
    console.error('[DB Migration] Failed to run Users table migration:', err);
  }
}

let emailConfigMigrationRan = false;

/**
 * Idempotent migration: creates dbo.app_email_config if it doesn't exist yet
 * and seeds initial default configuration.
 */
export async function runEmailConfigMigration(): Promise<void> {
  if (emailConfigMigrationRan) return;
  emailConfigMigrationRan = true;

  try {
    // 1. Create app_email_config table if not existing
    await prisma.$executeRawUnsafe(`
      IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'app_email_config'
      )
      BEGIN
        CREATE TABLE [dbo].[app_email_config] (
          [id] INT NOT NULL PRIMARY KEY,
          [mode] NVARCHAR(20) NOT NULL DEFAULT 'DEV',
          [devRecipients] NVARCHAR(MAX) NULL,
          [devCCRecipients] NVARCHAR(MAX) NULL,
          [devBCCRecipients] NVARCHAR(MAX) NULL,
          [liveCCRecipients] NVARCHAR(MAX) NULL,
          [liveBCCRecipients] NVARCHAR(MAX) NULL,
          [includeBuHead] BIT NOT NULL DEFAULT 1,
          [includeAdminAndAA] BIT NOT NULL DEFAULT 1,
          [includeBrandPm] BIT NOT NULL DEFAULT 1,
          [updatedBy] NVARCHAR(200) NULL,
          [updatedAt] DATETIME NULL
        );
      END
    `);

    // 2. Add devCCRecipients, devBCCRecipients, and includeBrandPm columns if table already existed
    await prisma.$executeRawUnsafe(`
      IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'app_email_config' AND COLUMN_NAME = 'devCCRecipients'
      )
      ALTER TABLE [dbo].[app_email_config] ADD [devCCRecipients] NVARCHAR(MAX) NULL;

      IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'app_email_config' AND COLUMN_NAME = 'devBCCRecipients'
      )
      ALTER TABLE [dbo].[app_email_config] ADD [devBCCRecipients] NVARCHAR(MAX) NULL;

      IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'app_email_config' AND COLUMN_NAME = 'includeBrandPm'
      )
      ALTER TABLE [dbo].[app_email_config] ADD [includeBrandPm] BIT NOT NULL DEFAULT 1;
    `);

    // 3. Seed initial default row if table is empty
    await prisma.$executeRawUnsafe(`
      IF NOT EXISTS (SELECT 1 FROM [dbo].[app_email_config] WHERE [id] = 1)
      BEGIN
        INSERT INTO [dbo].[app_email_config] (
          [id], [mode], [devRecipients], [devCCRecipients], [devBCCRecipients], [liveCCRecipients], [liveBCCRecipients], [includeBuHead], [includeAdminAndAA], [includeBrandPm], [updatedBy], [updatedAt]
        ) VALUES (
          1,
          'DEV',
          '[]',
          '[]',
          '[]',
          '[]',
          '[]',
          1,
          1,
          1,
          'SYSTEM',
          GETDATE()
        );
      END
    `);

    console.log('[DB Migration] Email config table migration and seed completed.');
  } catch (err) {
    console.error('[DB Migration] Failed to run Email Config table migration:', err);
  }
}

let activityLogsMigrationRan = false;
let activityLogsTableExistsCache: boolean | null = null;

/**
 * Checks if dbo.activity_logs table exists.
 */
export async function hasActivityLogsTable(): Promise<boolean> {
  if (activityLogsTableExistsCache !== null) return activityLogsTableExistsCache;
  try {
    const res = await prisma.$queryRawUnsafe<any[]>(`
      SELECT COUNT(*) AS cnt
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'activity_logs';
    `);
    const count = Number(res?.[0]?.cnt || 0);
    activityLogsTableExistsCache = count > 0;
    return activityLogsTableExistsCache;
  } catch {
    return false;
  }
}

/**
 * Idempotent migration: creates dbo.activity_logs if it doesn't exist yet.
 */
export async function runActivityLogsMigration(): Promise<void> {
  if (activityLogsMigrationRan) return;
  activityLogsMigrationRan = true;

  try {
    await prisma.$executeRawUnsafe(`
      IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'activity_logs'
      )
      BEGIN
        CREATE TABLE [dbo].[activity_logs] (
          [logID]           INT NOT NULL,
          [dealID]          INT NULL,
          [dealRegID]       VARCHAR(50) NULL,
          [custName]        NVARCHAR(MAX) NULL,
          [projectName]     NVARCHAR(MAX) NULL,
          [action]          VARCHAR(50) NOT NULL,
          [fieldName]       VARCHAR(100) NULL,
          [oldValue]        NVARCHAR(MAX) NULL,
          [newValue]        NVARCHAR(MAX) NULL,
          [remarks]         NVARCHAR(MAX) NULL,
          [performedBy]     VARCHAR(100) NOT NULL,
          [performedByName] NVARCHAR(200) NULL,
          [performedByRole] VARCHAR(50) NULL,
          [impersonatedBy]  VARCHAR(100) NULL,
          [dtCreated]       DATETIME NOT NULL CONSTRAINT [DF_activity_logs_dtCreated] DEFAULT (GETDATE()),
          CONSTRAINT [PK_activity_logs] PRIMARY KEY CLUSTERED ([logID] ASC)
        );

        CREATE NONCLUSTERED INDEX [IX_activity_logs_dtCreated] ON [dbo].[activity_logs] ([dtCreated] DESC);
        CREATE NONCLUSTERED INDEX [IX_activity_logs_dealID] ON [dbo].[activity_logs] ([dealID] ASC);
        CREATE NONCLUSTERED INDEX [IX_activity_logs_dealRegID] ON [dbo].[activity_logs] ([dealRegID] ASC);
        CREATE NONCLUSTERED INDEX [IX_activity_logs_action] ON [dbo].[activity_logs] ([action] ASC);
        CREATE NONCLUSTERED INDEX [IX_activity_logs_performedBy] ON [dbo].[activity_logs] ([performedBy] ASC);
      END
    `);
    activityLogsTableExistsCache = true;
    console.log('[DB Migration] activity_logs table verification/migration completed.');
  } catch (err: any) {
    console.warn('[DB Migration] Note on activity_logs table check:', err?.message || err);
  }
}


