-- ==============================================================================
-- Deals Registration Portal - All-In-One Master Database Deployment Script
-- Target DBMS: Microsoft SQL Server (2016+)
-- Database: DealsRegistrationDB (or your target database name)
-- 
-- Description:
--   Complete Single Source of Truth deployment script consolidating:
--     1. Concurrency & RCSI Isolation Check (Priority 2)
--     2. Core Extension Tables: Users, DealRenewal, DealLinks, app_email_config, activity_logs
--     3. Reporting Views: dbo.DealReportView (Priority 3)
--     4. Production Performance Indexes: Full covering index suite (Priority 1)
--     5. Default System Seeds: Email routing config
--     6. Post-Deployment Verification Summary
--
-- Idempotency:
--   Fully idempotent. Safe to run repeatedly on new or existing production databases.
-- ==============================================================================

USE [DealsRegistrationDB]; -- Replace with your target database name if different
GO

PRINT '==============================================================================';
PRINT '>>> Starting Deals Registration Portal Master Database Deployment...';
PRINT '>>> Server Time: ' + CONVERT(VARCHAR(30), GETDATE(), 120);
PRINT '==============================================================================';
GO

-- ==============================================================================
-- 1. Database Concurrency & RCSI Configuration (Priority 2)
-- ==============================================================================
PRINT '>>> [1/6] Checking Database Concurrency & Read Committed Snapshot Isolation...';
GO

DECLARE @rcsi_on BIT;
DECLARE @snap_state VARCHAR(50);

SELECT 
    @rcsi_on = is_read_committed_snapshot_on,
    @snap_state = snapshot_isolation_state_desc
FROM sys.databases
WHERE name = DB_NAME();

IF @rcsi_on = 1
BEGIN
    PRINT '    [OK] Read Committed Snapshot Isolation (RCSI) is already ON.';
END
ELSE
BEGIN
    PRINT '    [!] NOTICE: RCSI is currently OFF.';
    PRINT '        To enable RCSI without blocking, execute enable-rcsi.sql from master:';
    PRINT '        ALTER DATABASE [' + DB_NAME() + '] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;';
    PRINT '        ALTER DATABASE [' + DB_NAME() + '] SET READ_COMMITTED_SNAPSHOT ON;';
    PRINT '        ALTER DATABASE [' + DB_NAME() + '] SET MULTI_USER;';
END
GO


-- ==============================================================================
-- 2. Core Extension Tables & Schema Enhancements
-- ==============================================================================
PRINT '>>> [2/6] Checking Core Extension Tables...';
GO

-- 2.1 Table: dbo.Users (RBAC & User Access Scoping)
PRINT '  --- [2.1] Table: dbo.Users ---';
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

-- 2.2 Table: dbo.DealRenewal (Deal Extensions & Renewals)
PRINT '  --- [2.2] Table: dbo.DealRenewal ---';
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

-- 2.3 Table: dbo.DealLinks (Linked Deals / Deal Extension Chains)
PRINT '  --- [2.3] Table: dbo.DealLinks ---';
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'DealLinks'
)
BEGIN
    CREATE TABLE [dbo].[DealLinks] (
        [id]             INT NOT NULL,
        [dealID]         INT NOT NULL,
        [previousDealID] INT NOT NULL,
        [dtCreated]      DATETIME NULL CONSTRAINT [DF_DealLinks_dtCreated] DEFAULT (GETDATE()),
        CONSTRAINT [PK_DealLinks] PRIMARY KEY CLUSTERED ([id] ASC)
    );

    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'DealHeader')
    BEGIN
        ALTER TABLE [dbo].[DealLinks]
        ADD CONSTRAINT [FK_DealLinks_Current] FOREIGN KEY ([dealID]) 
        REFERENCES [dbo].[DealHeader] ([dealID]) ON DELETE CASCADE;

        ALTER TABLE [dbo].[DealLinks]
        ADD CONSTRAINT [FK_DealLinks_Previous] FOREIGN KEY ([previousDealID]) 
        REFERENCES [dbo].[DealHeader] ([dealID]);
    END

    PRINT '    [+] Created table [dbo].[DealLinks].';
END
ELSE
BEGIN
    PRINT '    [OK] Table [dbo].[DealLinks] exists.';
END
GO

-- 2.4 Table: dbo.app_email_config (Central Email Routing Settings)
PRINT '  --- [2.4] Table: dbo.app_email_config ---';
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
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'app_email_config' AND COLUMN_NAME = 'devCCRecipients')
BEGIN
    ALTER TABLE [dbo].[app_email_config] ADD [devCCRecipients] NVARCHAR(MAX) NULL;
    PRINT '    [+] Added column [devCCRecipients] to dbo.app_email_config.';
END
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'app_email_config' AND COLUMN_NAME = 'devBCCRecipients')
BEGIN
    ALTER TABLE [dbo].[app_email_config] ADD [devBCCRecipients] NVARCHAR(MAX) NULL;
    PRINT '    [+] Added column [devBCCRecipients] to dbo.app_email_config.';
END
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'app_email_config' AND COLUMN_NAME = 'includeBrandPm')
BEGIN
    ALTER TABLE [dbo].[app_email_config] ADD [includeBrandPm] BIT NOT NULL CONSTRAINT [DF_app_email_config_includeBrandPm] DEFAULT 1;
    PRINT '    [+] Added column [includeBrandPm] to dbo.app_email_config.';
END
GO

-- 2.5 Table: dbo.activity_logs (Audit Trail History)
PRINT '  --- [2.5] Table: dbo.activity_logs ---';
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
    PRINT '    [+] Created table [dbo].[activity_logs].';
END
ELSE
BEGIN
    PRINT '    [OK] Table [dbo].[activity_logs] exists.';
END
GO


-- ==============================================================================
-- 3. Reporting Views (Priority 3)
-- ==============================================================================
PRINT '>>> [3/6] Configuring Reporting Views...';
GO

IF OBJECT_ID(N'[dbo].[DealReportView]', N'V') IS NOT NULL
BEGIN
    PRINT '    [*] Updating existing dbo.DealReportView...';
    DROP VIEW [dbo].[DealReportView];
END
GO

CREATE VIEW dbo.DealReportView
AS
SELECT 
    d.dealID,
    d.dealRegID,
    d.custName,
    d.ProjectName,
    d.brand,
    d.BU,
    d.AssignedAO,
    d.dealStatus,
    d.dtRegistered,
    d.expDt,
    d.dtCreated,
    d.createdBy,
    d.remarks,
    b.assignedPM,
    -- Pre-calculated Line Item Totals & Counts
    ISNULL(itemAgg.TotalAmount, 0) AS TotalAmount,
    ISNULL(itemAgg.ItemCount, 0) AS ItemCount,
    -- Pre-calculated Renewal Details
    CASE WHEN renAgg.dealID IS NOT NULL THEN 1 ELSE 0 END AS IsRenewed,
    ISNULL(renAgg.RenewalCount, 0) AS RenewalCount,
    renAgg.LatestRenewalDate,
    -- Pre-calculated Lost Details
    CASE WHEN l.dealID IS NOT NULL THEN 1 ELSE 0 END AS IsLost,
    l.competitorVendor,
    l.competitorBrand,
    l.reason AS LostReason,
    -- Date Helpers
    DATEDIFF(day, GETDATE(), d.expDt) AS DaysRemaining,
    CASE WHEN d.expDt < GETDATE() THEN 1 ELSE 0 END AS IsExpired
FROM dbo.DealHeader d
LEFT JOIN dbo.DealBrands b ON d.brand = b.brand
LEFT JOIN (
    SELECT 
        dealID,
        SUM(ISNULL(TRY_CAST(REPLACE(totalAmt, ',', '') AS DECIMAL(18,2)), 0)) AS TotalAmount,
        COUNT(*) AS ItemCount
    FROM dbo.DealItems
    GROUP BY dealID
) itemAgg ON d.dealID = itemAgg.dealID
LEFT JOIN (
    SELECT 
        dealID,
        COUNT(*) AS RenewalCount,
        MAX(dtRenewal) AS LatestRenewalDate
    FROM dbo.DealRenewal
    GROUP BY dealID
) renAgg ON d.dealID = renAgg.dealID
LEFT JOIN dbo.DealLost l ON d.dealID = l.dealID;
GO

PRINT '    [+] View dbo.DealReportView created successfully.';
GO


-- ==============================================================================
-- 4. Performance Indexes Suite (Priority 1)
-- ==============================================================================
PRINT '>>> [4/6] Checking & Creating Performance Indexes...';
GO

-- 4.1 DealHeader Primary Key & Covering Indexes
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[DealHeader]') AND is_primary_key = 1)
BEGIN
    ALTER TABLE [dbo].[DealHeader] ADD CONSTRAINT [PK_DealHeader_dealID] PRIMARY KEY CLUSTERED ([dealID] ASC);
    PRINT '    [+] Primary Key PK_DealHeader_dealID created.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealHeader_AssignedAO_dtCreated' AND object_id = OBJECT_ID(N'[dbo].[DealHeader]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_DealHeader_AssignedAO_dtCreated]
    ON [dbo].[DealHeader] ([AssignedAO] ASC, [dtCreated] DESC)
    INCLUDE ([dealID], [dealRegID], [ProjectName], [BU], [dealStatus], [dtRegistered], [expDt], [brand], [customerID], [custName], [createdBy], [remarks], [dtValidTo]);
    PRINT '    [+] Index IX_DealHeader_AssignedAO_dtCreated created.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealHeader_BU_dtCreated' AND object_id = OBJECT_ID(N'[dbo].[DealHeader]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_DealHeader_BU_dtCreated]
    ON [dbo].[DealHeader] ([BU] ASC, [dtCreated] DESC)
    INCLUDE ([dealID], [dealRegID], [ProjectName], [AssignedAO], [dealStatus], [dtRegistered], [expDt], [brand], [customerID], [custName], [createdBy], [remarks], [dtValidTo]);
    PRINT '    [+] Index IX_DealHeader_BU_dtCreated created.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealHeader_dtCreated' AND object_id = OBJECT_ID(N'[dbo].[DealHeader]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_DealHeader_dtCreated]
    ON [dbo].[DealHeader] ([dtCreated] DESC)
    INCLUDE ([dealID], [dealRegID], [ProjectName], [AssignedAO], [BU], [dealStatus], [dtRegistered], [expDt], [brand], [customerID], [custName], [createdBy], [remarks], [dtValidTo]);
    PRINT '    [+] Index IX_DealHeader_dtCreated created.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealHeader_expDt' AND object_id = OBJECT_ID(N'[dbo].[DealHeader]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_DealHeader_expDt]
    ON [dbo].[DealHeader] ([expDt] ASC)
    INCLUDE ([dealID], [dealRegID], [ProjectName], [AssignedAO], [BU], [dealStatus], [custName], [brand], [dtCreated]);
    PRINT '    [+] Index IX_DealHeader_expDt created.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealHeader_brand_dtCreated' AND object_id = OBJECT_ID(N'[dbo].[DealHeader]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_DealHeader_brand_dtCreated]
    ON [dbo].[DealHeader] ([brand] ASC, [dtCreated] DESC)
    INCLUDE ([dealID], [dealRegID], [AssignedAO], [BU], [dealStatus], [custName], [ProjectName], [expDt]);
    PRINT '    [+] Index IX_DealHeader_brand_dtCreated created.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealHeader_dealRegID' AND object_id = OBJECT_ID(N'[dbo].[DealHeader]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_DealHeader_dealRegID] ON [dbo].[DealHeader] ([dealRegID] ASC);
    PRINT '    [+] Index IX_DealHeader_dealRegID created.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealHeader_customerID' AND object_id = OBJECT_ID(N'[dbo].[DealHeader]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_DealHeader_customerID] ON [dbo].[DealHeader] ([customerID] ASC);
    PRINT '    [+] Index IX_DealHeader_customerID created.';
END
GO

-- 4.2 DealItems Indexes
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[DealItems]') AND is_primary_key = 1)
BEGIN
    ALTER TABLE [dbo].[DealItems] ADD CONSTRAINT [PK_DealItems_dealItemID] PRIMARY KEY CLUSTERED ([dealItemID] ASC);
    PRINT '    [+] Primary Key PK_DealItems_dealItemID created.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealItems_dealID' AND object_id = OBJECT_ID(N'[dbo].[DealItems]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_DealItems_dealID]
    ON [dbo].[DealItems] ([dealID] ASC)
    INCLUDE ([dealItemID], [itemDesc], [qty], [currency], [totalAmt]);
    PRINT '    [+] Index IX_DealItems_dealID created.';
END
GO

-- 4.3 DealRenewal Indexes
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealRenewal_dealID' AND object_id = OBJECT_ID(N'[dbo].[DealRenewal]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_DealRenewal_dealID]
    ON [dbo].[DealRenewal] ([dealID] ASC)
    INCLUDE ([renewalID], [dtRenewal], [rexpDt], [remarks], [dtCreated]);
    PRINT '    [+] Index IX_DealRenewal_dealID created.';
END
GO

-- 4.4 DealLinks Indexes
IF EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DealLinks]') AND type in (N'U'))
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealLinks_dealID' AND object_id = OBJECT_ID(N'[dbo].[DealLinks]'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_DealLinks_dealID] ON [dbo].[DealLinks] ([dealID] ASC) INCLUDE ([previousDealID], [dtCreated]);
        PRINT '    [+] Index IX_DealLinks_dealID created.';
    END

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealLinks_previousDealID' AND object_id = OBJECT_ID(N'[dbo].[DealLinks]'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_DealLinks_previousDealID] ON [dbo].[DealLinks] ([previousDealID] ASC) INCLUDE ([dealID], [dtCreated]);
        PRINT '    [+] Index IX_DealLinks_previousDealID created.';
    END
END
GO

-- 4.5 dealWTN Indexes
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_dealWTN_dealID' AND object_id = OBJECT_ID(N'[dbo].[dealWTN]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_dealWTN_dealID] ON [dbo].[dealWTN] ([dealID] ASC) INCLUDE ([id], [whenToNotify]);
    PRINT '    [+] Index IX_dealWTN_dealID created.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_dealWTN_whenToNotify' AND object_id = OBJECT_ID(N'[dbo].[dealWTN]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_dealWTN_whenToNotify] ON [dbo].[dealWTN] ([whenToNotify] ASC);
    PRINT '    [+] Index IX_dealWTN_whenToNotify created.';
END
GO

-- 4.6 deals_reg_notification Indexes
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_deals_reg_notification_status_dateCreated' AND object_id = OBJECT_ID(N'[dbo].[deals_reg_notification]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_deals_reg_notification_status_dateCreated]
    ON [dbo].[deals_reg_notification] ([status] ASC, [dateCreated] ASC)
    INCLUDE ([email_id], [creator], [subject], [message], [sendTo], [sendCC], [sendBCC], [dateSent]);
    PRINT '    [+] Index IX_deals_reg_notification_status_dateCreated created.';
END
GO

-- 4.7 activity_logs Indexes
IF EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[activity_logs]') AND type in (N'U'))
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_activity_logs_dealID_dtCreated' AND object_id = OBJECT_ID(N'[dbo].[activity_logs]'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_activity_logs_dealID_dtCreated]
        ON [dbo].[activity_logs] ([dealID] ASC, [dtCreated] DESC)
        INCLUDE ([logID], [action], [fieldName], [performedBy], [performedByName]);
        PRINT '    [+] Index IX_activity_logs_dealID_dtCreated created.';
    END
END
GO

-- 4.8 cdbAccounts Indexes
IF EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[cdbAccounts]') AND type in (N'U'))
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[cdbAccounts]') AND is_primary_key = 1)
    BEGIN
        ALTER TABLE [dbo].[cdbAccounts] ADD CONSTRAINT [PK_cdbAccounts_AccountID] PRIMARY KEY CLUSTERED ([AccountID] ASC);
        PRINT '    [+] Primary Key PK_cdbAccounts_AccountID created.';
    END

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_cdbAccounts_AccountName' AND object_id = OBJECT_ID(N'[dbo].[cdbAccounts]'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_cdbAccounts_AccountName]
        ON [dbo].[cdbAccounts] ([AccountName] ASC)
        INCLUDE ([AccountIDNo], [AccountGroup], [AccountType], [DomainAccount], [Email], [isActive]);
        PRINT '    [+] Index IX_cdbAccounts_AccountName created.';
    END

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_cdbAccounts_DomainAccount' AND object_id = OBJECT_ID(N'[dbo].[cdbAccounts]'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_cdbAccounts_DomainAccount]
        ON [dbo].[cdbAccounts] ([DomainAccount] ASC)
        INCLUDE ([AccountIDNo], [AccountName], [AccountGroup], [AccountType], [Email], [isActive]);
        PRINT '    [+] Index IX_cdbAccounts_DomainAccount created.';
    END

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_cdbAccounts_Email' AND object_id = OBJECT_ID(N'[dbo].[cdbAccounts]'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_cdbAccounts_Email]
        ON [dbo].[cdbAccounts] ([Email] ASC)
        INCLUDE ([AccountID], [AccountName], [DomainAccount], [AccountGroup], [isActive]);
        PRINT '    [+] Index IX_cdbAccounts_Email created.';
    END
END
GO


-- ==============================================================================
-- 5. Seed Default System Configuration
-- ==============================================================================
PRINT '>>> [5/6] Checking initial email configuration seed...';
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
-- 6. Post-Deployment Verification Summary
-- ==============================================================================
PRINT '==============================================================================';
PRINT '>>> [6/6] Verifying Database Deployment Status...';
PRINT '==============================================================================';
GO

-- Verify Email Config
SELECT 
    'app_email_config' AS [Component],
    [mode] AS [Mode], 
    [includeBuHead] AS [BuHead], 
    [includeAdminAndAA] AS [AdminAA], 
    [includeBrandPm] AS [BrandPM],
    [updatedBy] AS [UpdatedBy], 
    [updatedAt] AS [UpdatedAt]
FROM [dbo].[app_email_config]
WHERE [id] = 1;
GO

-- Verify Active Indexes Count
SELECT 
    t.name AS [Table],
    COUNT(i.index_id) AS [Active Nonclustered Indexes]
FROM sys.indexes i
INNER JOIN sys.tables t ON i.object_id = t.object_id
WHERE t.name IN ('DealHeader', 'DealItems', 'DealRenewal', 'DealLinks', 'DealLost', 'dealWTN', 'deals_reg_notification', 'activity_logs', 'cdbAccounts')
  AND i.type_desc = 'NONCLUSTERED'
GROUP BY t.name
ORDER BY t.name;
GO

-- Verify DealReportView sample
SELECT TOP 3 
    dealID, dealRegID, custName, brand, BU, AssignedAO, assignedPM, TotalAmount, ItemCount, IsRenewed, IsLost
FROM dbo.DealReportView
ORDER BY dtCreated DESC;
GO

PRINT '==============================================================================';
PRINT '>>> Deals Registration Portal Master Deployment Completed Successfully!';
PRINT '==============================================================================';
GO
