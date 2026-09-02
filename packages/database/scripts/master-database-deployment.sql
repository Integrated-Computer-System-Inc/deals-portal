-- ==============================================================================
-- Deals Registration Portal - All-In-One Master Database Deployment Script
-- Target DBMS: Microsoft SQL Server (2016+)
-- Database: DealsRegistrationDB (or your target database name)
-- Idempotency: Fully idempotent. Safe to run repeatedly on new or existing DBs.
-- ==============================================================================

USE [DealsRegistrationDB]; -- Replace with your actual Deals database name if different
GO

PRINT '======================================================================';
PRINT '>>> Starting Deals Registration Portal Master Database Deployment...';
PRINT '======================================================================';
GO

-- ==============================================================================
-- 1. Table: dbo.Users (RBAC & User Access Scoping)
-- ==============================================================================
PRINT '>>> [1/6] Checking dbo.Users table and columns...';
GO

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Users'
)
BEGIN
    CREATE TABLE [dbo].[Users] (
        [AccountID] INT NOT NULL,
        [AccountName] NVARCHAR(600) NOT NULL,
        [Email] VARCHAR(255) NOT NULL,
        [UserRole] VARCHAR(50) NOT NULL,
        [AssignedBU] NVARCHAR(500) NULL,
        [AssignedBrand] NVARCHAR(500) NULL,
        [RememberToken] VARCHAR(MAX) NULL,
        [DtCreation] DATETIME NOT NULL CONSTRAINT [DF_Users_DtCreation] DEFAULT (GETDATE()),
        [LastLogin] DATETIME NULL,
        CONSTRAINT [PK_Users] PRIMARY KEY CLUSTERED ([AccountID] ASC),
        CONSTRAINT [UQ_Users_Email] UNIQUE NONCLUSTERED ([Email] ASC)
    );
    PRINT '    [+] Created table [dbo].[Users].';
END
ELSE
BEGIN
    PRINT '    [OK] Table [dbo].[Users] exists.';
END
GO

-- Ensure AssignedBU column exists
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'AssignedBU'
)
BEGIN
    ALTER TABLE [dbo].[Users] ADD [AssignedBU] NVARCHAR(500) NULL;
    PRINT '    [+] Added column [AssignedBU] to dbo.Users.';
END
GO

-- Ensure AssignedBrand column exists
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'AssignedBrand'
)
BEGIN
    ALTER TABLE [dbo].[Users] ADD [AssignedBrand] NVARCHAR(500) NULL;
    PRINT '    [+] Added column [AssignedBrand] to dbo.Users.';
END
GO

-- Migrate any legacy composite roles ('bu:BU1,BU2' or 'pm:DELL,HPI')
IF EXISTS (SELECT 1 FROM [dbo].[Users] WHERE [UserRole] LIKE '%:%')
BEGIN
    PRINT '    [*] Back-filling legacy composite roles into AssignedBU / AssignedBrand...';
    UPDATE [dbo].[Users]
    SET
        [AssignedBU] = CASE
            WHEN [UserRole] LIKE 'bu:%'       THEN SUBSTRING([UserRole], CHARINDEX(':', [UserRole]) + 1, 500)
            WHEN [UserRole] LIKE 'ao:%'       THEN SUBSTRING([UserRole], CHARINDEX(':', [UserRole]) + 1, 500)
            WHEN [UserRole] LIKE 'bu_admin:%' THEN SUBSTRING([UserRole], CHARINDEX(':', [UserRole]) + 1, 500)
            ELSE [AssignedBU]
        END,
        [AssignedBrand] = CASE
            WHEN [UserRole] LIKE 'pm:%' THEN SUBSTRING([UserRole], CHARINDEX(':', [UserRole]) + 1, 500)
            ELSE [AssignedBrand]
        END,
        [UserRole] = CASE
            WHEN CHARINDEX(':', [UserRole]) > 0 THEN LEFT([UserRole], CHARINDEX(':', [UserRole]) - 1)
            ELSE [UserRole]
        END
    WHERE [UserRole] LIKE '%:%';
END
GO


-- ==============================================================================
-- 2. Table: dbo.DealRenewal (Deal Extension & Renewals)
-- ==============================================================================
PRINT '>>> [2/6] Checking dbo.DealRenewal table...';
GO

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'DealRenewal'
)
BEGIN
    CREATE TABLE [dbo].[DealRenewal] (
        [renewalID] INT NOT NULL,
        [dealID] INT NOT NULL,
        [dtRenewal] DATE NULL,
        [rexpDt] DATE NULL,
        [remarks] VARCHAR(MAX) NULL,
        [dtCreated] DATETIME NULL CONSTRAINT [DF_DealRenewal_dtCreated] DEFAULT (GETDATE()),
        CONSTRAINT [PK_DealRenewal] PRIMARY KEY CLUSTERED ([renewalID] ASC)
    );

    -- Add Foreign Key if DealHeader table exists
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'DealHeader')
    BEGIN
        ALTER TABLE [dbo].[DealRenewal]
        ADD CONSTRAINT [FK_DealRenewal_DealHeader] FOREIGN KEY ([dealID]) 
        REFERENCES [dbo].[DealHeader] ([dealID]) ON DELETE CASCADE;
    END

    PRINT '    [+] Created table [dbo].[DealRenewal].';
END
ELSE
BEGIN
    PRINT '    [OK] Table [dbo].[DealRenewal] exists.';
END
GO


-- ==============================================================================
-- 3. Table: dbo.app_email_config (Central Email Routing & Mode Settings)
-- ==============================================================================
PRINT '>>> [3/6] Checking dbo.app_email_config table and columns...';
GO

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'app_email_config'
)
BEGIN
    CREATE TABLE [dbo].[app_email_config] (
        [id] INT NOT NULL,
        [mode] NVARCHAR(20) NOT NULL CONSTRAINT [DF_app_email_config_mode] DEFAULT 'DEV',
        [devRecipients] NVARCHAR(MAX) NULL,
        [devCCRecipients] NVARCHAR(MAX) NULL,
        [devBCCRecipients] NVARCHAR(MAX) NULL,
        [liveCCRecipients] NVARCHAR(MAX) NULL,
        [liveBCCRecipients] NVARCHAR(MAX) NULL,
        [includeBuHead] BIT NOT NULL CONSTRAINT [DF_app_email_config_includeBuHead] DEFAULT 1,
        [includeAdminAndAA] BIT NOT NULL CONSTRAINT [DF_app_email_config_includeAdminAndAA] DEFAULT 1,
        [includeBrandPm] BIT NOT NULL CONSTRAINT [DF_app_email_config_includeBrandPm] DEFAULT 1,
        [updatedBy] NVARCHAR(200) NULL,
        [updatedAt] DATETIME NULL,
        CONSTRAINT [PK_app_email_config] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT '    [+] Created table [dbo].[app_email_config].';
END
ELSE
BEGIN
    PRINT '    [OK] Table [dbo].[app_email_config] exists.';
END
GO

-- Ensure all email config columns exist
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'app_email_config' AND COLUMN_NAME = 'devCCRecipients'
)
BEGIN
    ALTER TABLE [dbo].[app_email_config] ADD [devCCRecipients] NVARCHAR(MAX) NULL;
    PRINT '    [+] Added column [devCCRecipients] to dbo.app_email_config.';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'app_email_config' AND COLUMN_NAME = 'devBCCRecipients'
)
BEGIN
    ALTER TABLE [dbo].[app_email_config] ADD [devBCCRecipients] NVARCHAR(MAX) NULL;
    PRINT '    [+] Added column [devBCCRecipients] to dbo.app_email_config.';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'app_email_config' AND COLUMN_NAME = 'includeBrandPm'
)
BEGIN
    ALTER TABLE [dbo].[app_email_config] ADD [includeBrandPm] BIT NOT NULL CONSTRAINT [DF_app_email_config_includeBrandPm] DEFAULT 1;
    PRINT '    [+] Added column [includeBrandPm] to dbo.app_email_config.';
END
GO


-- ==============================================================================
-- 4. Seed Default Email Configuration (ID = 1)
-- ==============================================================================
PRINT '>>> [4/6] Checking initial email configuration seed...';
GO

IF NOT EXISTS (SELECT 1 FROM [dbo].[app_email_config] WHERE [id] = 1)
BEGIN
    PRINT '    [*] Seeding default email configuration (ID = 1)...';

    INSERT INTO [dbo].[app_email_config] (
        [id],
        [mode],
        [devRecipients],
        [devCCRecipients],
        [devBCCRecipients],
        [liveCCRecipients],
        [liveBCCRecipients],
        [includeBuHead],
        [includeAdminAndAA],
        [includeBrandPm],
        [updatedBy],
        [updatedAt]
    ) VALUES (
        1,
        'DEV',
        N'[{"email":"dramos@ics.com.ph","name":"Dave Ramos"},{"email":"bcandelaria@ics.com.ph","name":"Bryan Candelaria"},{"email":"jdoremon@ics.com.ph","name":"John Doremon"},{"email":"jesurena@ics.com.ph","name":"Jeric Esurena"},{"email":"mescario@ics.com.ph","name":"Mark Escario"}]',
        N'[]',
        N'[]',
        N'[{"email":"asy-lu@ics.com.ph","name":"Adeliana Sy-Lu"},{"email":"afrancisco@ics.com.ph","name":"Athena Francisco"}]',
        N'[{"email":"dramos@ics.com.ph","name":"Dave Ramos"},{"email":"bcandelaria@ics.com.ph","name":"Bryan Candelaria"},{"email":"jdoremon@ics.com.ph","name":"John Doremon"},{"email":"jesurena@ics.com.ph","name":"Jeric Esurena"},{"email":"mescario@ics.com.ph","name":"Mark Escario"}]',
        1,
        1,
        1,
        'SYSTEM_SETUP',
        GETDATE()
    );
    PRINT '    [+] Default email configuration seeded.';
END
ELSE
BEGIN
    PRINT '    [OK] Row [id] = 1 already configured.';
END
GO


-- ==============================================================================
-- 5. Performance Indexes
-- ==============================================================================
PRINT '>>> [5/6] Checking performance indexes...';
GO

-- DealHeader indexes
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealHeader_AssignedAO_dtCreated' AND object_id = OBJECT_ID(N'[dbo].[DealHeader]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_DealHeader_AssignedAO_dtCreated]
    ON [dbo].[DealHeader] ([AssignedAO] ASC, [dtCreated] DESC)
    INCLUDE ([dealRegID], [ProjectName], [BU], [dealStatus], [dtRegistered], [expDt], [brand], [customerID], [custName], [createdBy], [remarks], [dtValidTo]);
    PRINT '    [+] Index IX_DealHeader_AssignedAO_dtCreated created.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealHeader_BU_dtCreated' AND object_id = OBJECT_ID(N'[dbo].[DealHeader]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_DealHeader_BU_dtCreated]
    ON [dbo].[DealHeader] ([BU] ASC, [dtCreated] DESC)
    INCLUDE ([dealRegID], [ProjectName], [AssignedAO], [dealStatus], [dtRegistered], [expDt], [brand], [customerID], [custName], [createdBy], [remarks], [dtValidTo]);
    PRINT '    [+] Index IX_DealHeader_BU_dtCreated created.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealHeader_dtCreated' AND object_id = OBJECT_ID(N'[dbo].[DealHeader]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_DealHeader_dtCreated]
    ON [dbo].[DealHeader] ([dtCreated] DESC)
    INCLUDE ([dealRegID], [ProjectName], [AssignedAO], [BU], [dealStatus], [dtRegistered], [expDt], [brand], [customerID], [custName], [createdBy], [remarks], [dtValidTo]);
    PRINT '    [+] Index IX_DealHeader_dtCreated created.';
END
GO

-- dealWTN index (Expiration Alerts)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_dealWTN_whenToNotify' AND object_id = OBJECT_ID(N'[dbo].[dealWTN]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_dealWTN_whenToNotify]
    ON [dbo].[dealWTN] ([whenToNotify] ASC)
    INCLUDE ([dealID]);
    PRINT '    [+] Index IX_dealWTN_whenToNotify created.';
END
GO

-- deals_reg_notification index (Dispatch Queue)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_deals_reg_notification_status' AND object_id = OBJECT_ID(N'[dbo].[deals_reg_notification]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_deals_reg_notification_status]
    ON [dbo].[deals_reg_notification] ([status] ASC, [dateCreated] ASC);
    PRINT '    [+] Index IX_deals_reg_notification_status created.';
END
GO

-- DealRenewal indexes
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealRenewal_dealID' AND object_id = OBJECT_ID(N'[dbo].[DealRenewal]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_DealRenewal_dealID] ON [dbo].[DealRenewal] ([dealID] ASC);
    PRINT '    [+] Index IX_DealRenewal_dealID created.';
END
GO


-- ==============================================================================
-- 6. Verification Summary
-- ==============================================================================
PRINT '>>> [6/6] Verifying database configuration...';
GO

SELECT 
    'app_email_config' AS [Table],
    [id], 
    [mode], 
    [includeBuHead] AS [BuHead], 
    [includeAdminAndAA] AS [AdminAA], 
    [includeBrandPm] AS [BrandPM],
    [updatedBy], 
    [updatedAt]
FROM [dbo].[app_email_config]
WHERE [id] = 1;
GO

PRINT '======================================================================';
PRINT '>>> Deals Registration Portal Master Deployment Completed Successfully!';
PRINT '======================================================================';
GO
