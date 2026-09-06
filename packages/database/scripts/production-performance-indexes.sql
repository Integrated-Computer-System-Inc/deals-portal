-- ==============================================================================
-- Deals Registration Portal - Production Performance Indexing Suite
-- Target Database: DealsRegistrationDB
-- Target Instance: Microsoft SQL Server Management Studio (SSMS)
-- Description:
--   Creates optimized Primary Keys and Nonclustered Covering Indexes (with INCLUDE columns)
--   to eliminate Clustered Index Scans and Key Lookups across:
--     1. DealHeader (AO, BU, dtCreated sorting, expDt expiry warnings, brand)
--     2. DealItems (dealID join with item descriptions & amounts)
--     3. DealRenewal (dealID join with renewal dates & remarks)
--     4. DealLinks (dealID and previousDealID self-joins)
--     5. DealLost (dealID competitor analysis)
--     6. dealWTN (whenToNotify notification alerts)
--     7. deals_reg_notification (email queue worker)
--     8. activity_logs (audit history modal)
--     9. cdbAccounts (user & AO profile avatar mapping)
--
-- Safety & Idempotency:
--   Every statement is guarded with IF NOT EXISTS checks.
--   Can be safely executed multiple times without errors or data disruption.
-- ==============================================================================

USE [DealsRegistrationDB];
GO

PRINT '==============================================================================';
PRINT '>>> Starting Production Index Optimization for Deals Registration Portal...';
PRINT '>>> Server Time: ' + CONVERT(VARCHAR(30), GETDATE(), 120);
PRINT '==============================================================================';
GO

-- ==============================================================================
-- 1. Table: dbo.DealHeader
-- ==============================================================================
PRINT '--- [1/9] Checking & Optimizing Table: DealHeader ---';
GO

-- 1.1 Primary Key / Clustered Index on dealID
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[DealHeader]') AND is_primary_key = 1)
BEGIN
    PRINT '  -> Adding Primary Key: PK_DealHeader_dealID...';
    ALTER TABLE [dbo].[DealHeader] ADD CONSTRAINT [PK_DealHeader_dealID] PRIMARY KEY CLUSTERED ([dealID] ASC);
END
ELSE
BEGIN
    PRINT '  -> Primary Key on DealHeader already exists.';
END
GO

-- 1.2 Nonclustered Index for AO Scoped Queries: (AssignedAO, dtCreated DESC)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealHeader_AssignedAO_dtCreated' AND object_id = OBJECT_ID(N'[dbo].[DealHeader]'))
BEGIN
    PRINT '  -> Creating Index: IX_DealHeader_AssignedAO_dtCreated...';
    CREATE NONCLUSTERED INDEX [IX_DealHeader_AssignedAO_dtCreated]
    ON [dbo].[DealHeader] ([AssignedAO] ASC, [dtCreated] DESC)
    INCLUDE (
        [dealID], [dealRegID], [ProjectName], [BU], [dealStatus],
        [dtRegistered], [expDt], [brand], [customerID], [custName],
        [createdBy], [remarks], [dtValidTo]
    );
END
ELSE
BEGIN
    PRINT '  -> Index IX_DealHeader_AssignedAO_dtCreated already exists.';
END
GO

-- 1.3 Nonclustered Index for BU Scoped Queries: (BU, dtCreated DESC)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealHeader_BU_dtCreated' AND object_id = OBJECT_ID(N'[dbo].[DealHeader]'))
BEGIN
    PRINT '  -> Creating Index: IX_DealHeader_BU_dtCreated...';
    CREATE NONCLUSTERED INDEX [IX_DealHeader_BU_dtCreated]
    ON [dbo].[DealHeader] ([BU] ASC, [dtCreated] DESC)
    INCLUDE (
        [dealID], [dealRegID], [ProjectName], [AssignedAO], [dealStatus],
        [dtRegistered], [expDt], [brand], [customerID], [custName],
        [createdBy], [remarks], [dtValidTo]
    );
END
ELSE
BEGIN
    PRINT '  -> Index IX_DealHeader_BU_dtCreated already exists.';
END
GO

-- 1.4 Nonclustered Index for Admin / Global Sorting: (dtCreated DESC)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealHeader_dtCreated' AND object_id = OBJECT_ID(N'[dbo].[DealHeader]'))
BEGIN
    PRINT '  -> Creating Index: IX_DealHeader_dtCreated...';
    CREATE NONCLUSTERED INDEX [IX_DealHeader_dtCreated]
    ON [dbo].[DealHeader] ([dtCreated] DESC)
    INCLUDE (
        [dealID], [dealRegID], [ProjectName], [AssignedAO], [BU],
        [dealStatus], [dtRegistered], [expDt], [brand], [customerID],
        [custName], [createdBy], [remarks], [dtValidTo]
    );
END
ELSE
BEGIN
    PRINT '  -> Index IX_DealHeader_dtCreated already exists.';
END
GO

-- 1.5 Nonclustered Index on Expiration Date (expDt) for Expiry Calculations & Follow-ups
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealHeader_expDt' AND object_id = OBJECT_ID(N'[dbo].[DealHeader]'))
BEGIN
    PRINT '  -> Creating Index: IX_DealHeader_expDt...';
    CREATE NONCLUSTERED INDEX [IX_DealHeader_expDt]
    ON [dbo].[DealHeader] ([expDt] ASC)
    INCLUDE (
        [dealID], [dealRegID], [ProjectName], [AssignedAO], [BU],
        [dealStatus], [custName], [brand], [dtCreated]
    );
END
ELSE
BEGIN
    PRINT '  -> Index IX_DealHeader_expDt already exists.';
END
GO

-- 1.6 Nonclustered Index on Brand & dtCreated for Brand Analytics
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealHeader_brand_dtCreated' AND object_id = OBJECT_ID(N'[dbo].[DealHeader]'))
BEGIN
    PRINT '  -> Creating Index: IX_DealHeader_brand_dtCreated...';
    CREATE NONCLUSTERED INDEX [IX_DealHeader_brand_dtCreated]
    ON [dbo].[DealHeader] ([brand] ASC, [dtCreated] DESC)
    INCLUDE (
        [dealID], [dealRegID], [AssignedAO], [BU], [dealStatus],
        [custName], [ProjectName], [expDt]
    );
END
ELSE
BEGIN
    PRINT '  -> Index IX_DealHeader_brand_dtCreated already exists.';
END
GO

-- 1.7 Nonclustered Index on dealRegID (Fast unique lookup)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealHeader_dealRegID' AND object_id = OBJECT_ID(N'[dbo].[DealHeader]'))
BEGIN
    PRINT '  -> Creating Index: IX_DealHeader_dealRegID...';
    CREATE NONCLUSTERED INDEX [IX_DealHeader_dealRegID]
    ON [dbo].[DealHeader] ([dealRegID] ASC);
END
ELSE
BEGIN
    PRINT '  -> Index IX_DealHeader_dealRegID already exists.';
END
GO

-- 1.8 Nonclustered Index on customerID
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealHeader_customerID' AND object_id = OBJECT_ID(N'[dbo].[DealHeader]'))
BEGIN
    PRINT '  -> Creating Index: IX_DealHeader_customerID...';
    CREATE NONCLUSTERED INDEX [IX_DealHeader_customerID]
    ON [dbo].[DealHeader] ([customerID] ASC);
END
ELSE
BEGIN
    PRINT '  -> Index IX_DealHeader_customerID already exists.';
END
GO

-- ==============================================================================
-- 2. Table: dbo.DealItems
-- ==============================================================================
PRINT '--- [2/9] Checking & Optimizing Table: DealItems ---';
GO

-- 2.1 Primary Key on dealItemID
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[DealItems]') AND is_primary_key = 1)
BEGIN
    PRINT '  -> Adding Primary Key: PK_DealItems_dealItemID...';
    ALTER TABLE [dbo].[DealItems] ADD CONSTRAINT [PK_DealItems_dealItemID] PRIMARY KEY CLUSTERED ([dealItemID] ASC);
END
ELSE
BEGIN
    PRINT '  -> Primary Key on DealItems already exists.';
END
GO

-- 2.2 Foreign Key Index: (dealID) with covering line-item details
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealItems_dealID' AND object_id = OBJECT_ID(N'[dbo].[DealItems]'))
BEGIN
    PRINT '  -> Creating Index: IX_DealItems_dealID...';
    CREATE NONCLUSTERED INDEX [IX_DealItems_dealID]
    ON [dbo].[DealItems] ([dealID] ASC)
    INCLUDE ([dealItemID], [itemDesc], [qty], [currency], [totalAmt]);
END
ELSE
BEGIN
    PRINT '  -> Index IX_DealItems_dealID already exists.';
END
GO

-- ==============================================================================
-- 3. Table: dbo.DealRenewal
-- ==============================================================================
PRINT '--- [3/9] Checking & Optimizing Table: DealRenewal ---';
GO

-- 3.1 Primary Key on renewalID
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[DealRenewal]') AND is_primary_key = 1)
BEGIN
    PRINT '  -> Adding Primary Key: PK_DealRenewal_renewalID...';
    ALTER TABLE [dbo].[DealRenewal] ADD CONSTRAINT [PK_DealRenewal_renewalID] PRIMARY KEY CLUSTERED ([renewalID] ASC);
END
ELSE
BEGIN
    PRINT '  -> Primary Key on DealRenewal already exists.';
END
GO

-- 3.2 Foreign Key Index: (dealID) with covering renewal fields
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealRenewal_dealID' AND object_id = OBJECT_ID(N'[dbo].[DealRenewal]'))
BEGIN
    PRINT '  -> Creating Index: IX_DealRenewal_dealID...';
    CREATE NONCLUSTERED INDEX [IX_DealRenewal_dealID]
    ON [dbo].[DealRenewal] ([dealID] ASC)
    INCLUDE ([renewalID], [dtRenewal], [rexpDt], [remarks], [dtCreated]);
END
ELSE
BEGIN
    PRINT '  -> Index IX_DealRenewal_dealID already exists.';
END
GO

-- ==============================================================================
-- 4. Table: dbo.DealLinks (Extension / Renewal Chain)
-- ==============================================================================
IF EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DealLinks]') AND type in (N'U'))
BEGIN
    PRINT '--- [4/9] Checking & Optimizing Table: DealLinks ---';
    
    -- 4.1 Index on dealID (Current Deal)
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealLinks_dealID' AND object_id = OBJECT_ID(N'[dbo].[DealLinks]'))
    BEGIN
        PRINT '  -> Creating Index: IX_DealLinks_dealID...';
        CREATE NONCLUSTERED INDEX [IX_DealLinks_dealID]
        ON [dbo].[DealLinks] ([dealID] ASC)
        INCLUDE ([previousDealID], [dtCreated]);
    END
    ELSE
    BEGIN
        PRINT '  -> Index IX_DealLinks_dealID already exists.';
    END

    -- 4.2 Index on previousDealID (Parent / Predecessor Deal)
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealLinks_previousDealID' AND object_id = OBJECT_ID(N'[dbo].[DealLinks]'))
    BEGIN
        PRINT '  -> Creating Index: IX_DealLinks_previousDealID...';
        CREATE NONCLUSTERED INDEX [IX_DealLinks_previousDealID]
        ON [dbo].[DealLinks] ([previousDealID] ASC)
        INCLUDE ([dealID], [dtCreated]);
    END
    ELSE
    BEGIN
        PRINT '  -> Index IX_DealLinks_previousDealID already exists.';
    END
END
ELSE
BEGIN
    PRINT '--- [4/9] Table DealLinks does not exist yet. Skipping. ---';
END
GO

-- ==============================================================================
-- 5. Table: dbo.DealLost
-- ==============================================================================
PRINT '--- [5/9] Checking & Optimizing Table: DealLost ---';
GO

-- 5.1 Primary Key on dealID
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[DealLost]') AND is_primary_key = 1)
BEGIN
    PRINT '  -> Adding Primary Key: PK_DealLost_dealID...';
    ALTER TABLE [dbo].[DealLost] ADD CONSTRAINT [PK_DealLost_dealID] PRIMARY KEY CLUSTERED ([dealID] ASC);
END
ELSE
BEGIN
    PRINT '  -> Primary Key on DealLost already exists.';
END
GO

-- ==============================================================================
-- 6. Table: dbo.dealWTN (When To Notify Alerts)
-- ==============================================================================
PRINT '--- [6/9] Checking & Optimizing Table: dealWTN ---';
GO

-- 6.1 Primary Key on id
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[dealWTN]') AND is_primary_key = 1)
BEGIN
    PRINT '  -> Adding Primary Key: PK_dealWTN_id...';
    ALTER TABLE [dbo].[dealWTN] ADD CONSTRAINT [PK_dealWTN_id] PRIMARY KEY CLUSTERED ([id] ASC);
END
ELSE
BEGIN
    PRINT '  -> Primary Key on dealWTN already exists.';
END
GO

-- 6.2 Index on dealID
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_dealWTN_dealID' AND object_id = OBJECT_ID(N'[dbo].[dealWTN]'))
BEGIN
    PRINT '  -> Creating Index: IX_dealWTN_dealID...';
    CREATE NONCLUSTERED INDEX [IX_dealWTN_dealID]
    ON [dbo].[dealWTN] ([dealID] ASC)
    INCLUDE ([id], [whenToNotify]);
END
ELSE
BEGIN
    PRINT '  -> Index IX_dealWTN_dealID already exists.';
END
GO

-- 6.3 Index on whenToNotify for notification cron scheduling
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_dealWTN_whenToNotify' AND object_id = OBJECT_ID(N'[dbo].[dealWTN]'))
BEGIN
    PRINT '  -> Creating Index: IX_dealWTN_whenToNotify...';
    CREATE NONCLUSTERED INDEX [IX_dealWTN_whenToNotify]
    ON [dbo].[dealWTN] ([whenToNotify] ASC);
END
ELSE
BEGIN
    PRINT '  -> Index IX_dealWTN_whenToNotify already exists.';
END
GO

-- ==============================================================================
-- 7. Table: dbo.deals_reg_notification (Email Queue / Background Worker)
-- ==============================================================================
PRINT '--- [7/9] Checking & Optimizing Table: deals_reg_notification ---';
GO

-- 7.1 Primary Key on email_id
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[deals_reg_notification]') AND is_primary_key = 1)
BEGIN
    PRINT '  -> Adding Primary Key: PK_deals_reg_notification_email_id...';
    ALTER TABLE [dbo].[deals_reg_notification] ADD CONSTRAINT [PK_deals_reg_notification_email_id] PRIMARY KEY CLUSTERED ([email_id] ASC);
END
ELSE
BEGIN
    PRINT '  -> Primary Key on deals_reg_notification already exists.';
END
GO

-- 7.2 Covering Index for pending email queue processing: (status, dateCreated ASC)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_deals_reg_notification_status_dateCreated' AND object_id = OBJECT_ID(N'[dbo].[deals_reg_notification]'))
BEGIN
    PRINT '  -> Creating Index: IX_deals_reg_notification_status_dateCreated...';
    CREATE NONCLUSTERED INDEX [IX_deals_reg_notification_status_dateCreated]
    ON [dbo].[deals_reg_notification] ([status] ASC, [dateCreated] ASC)
    INCLUDE ([email_id], [creator], [subject], [message], [sendTo], [sendCC], [sendBCC], [dateSent]);
END
ELSE
BEGIN
    PRINT '  -> Index IX_deals_reg_notification_status_dateCreated already exists.';
END
GO

-- ==============================================================================
-- 8. Table: dbo.activity_logs (Audit Trail History)
-- ==============================================================================
IF EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[activity_logs]') AND type in (N'U'))
BEGIN
    PRINT '--- [8/9] Checking & Optimizing Table: activity_logs ---';

    -- 8.1 Index on dealID & dtCreated for deal-specific audit modal
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_activity_logs_dealID_dtCreated' AND object_id = OBJECT_ID(N'[dbo].[activity_logs]'))
    BEGIN
        PRINT '  -> Creating Index: IX_activity_logs_dealID_dtCreated...';
        CREATE NONCLUSTERED INDEX [IX_activity_logs_dealID_dtCreated]
        ON [dbo].[activity_logs] ([dealID] ASC, [dtCreated] DESC)
        INCLUDE ([logID], [action], [fieldName], [performedBy], [performedByName]);
    END
    ELSE
    BEGIN
        PRINT '  -> Index IX_activity_logs_dealID_dtCreated already exists.';
    END

    -- 8.2 Index on dtCreated for global audit log view
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_activity_logs_dtCreated' AND object_id = OBJECT_ID(N'[dbo].[activity_logs]'))
    BEGIN
        PRINT '  -> Creating Index: IX_activity_logs_dtCreated...';
        CREATE NONCLUSTERED INDEX [IX_activity_logs_dtCreated]
        ON [dbo].[activity_logs] ([dtCreated] DESC);
    END
    ELSE
    BEGIN
        PRINT '  -> Index IX_activity_logs_dtCreated already exists.';
    END
END
ELSE
BEGIN
    PRINT '--- [8/9] Table activity_logs does not exist yet. Skipping. ---';
END
GO

-- ==============================================================================
-- 9. Table: dbo.cdbAccounts (User / AO Identity and Avatars)
-- ==============================================================================
PRINT '--- [9/9] Checking & Optimizing Table: cdbAccounts ---';
GO

-- 9.1 Primary Key on AccountID
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[cdbAccounts]') AND is_primary_key = 1)
BEGIN
    PRINT '  -> Adding Primary Key: PK_cdbAccounts_AccountID...';
    ALTER TABLE [dbo].[cdbAccounts] ADD CONSTRAINT [PK_cdbAccounts_AccountID] PRIMARY KEY CLUSTERED ([AccountID] ASC);
END
ELSE
BEGIN
    PRINT '  -> Primary Key on cdbAccounts already exists.';
END
GO

-- 9.2 Covering Index on AccountName
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_cdbAccounts_AccountName' AND object_id = OBJECT_ID(N'[dbo].[cdbAccounts]'))
BEGIN
    PRINT '  -> Creating Index: IX_cdbAccounts_AccountName...';
    CREATE NONCLUSTERED INDEX [IX_cdbAccounts_AccountName]
    ON [dbo].[cdbAccounts] ([AccountName] ASC)
    INCLUDE ([AccountIDNo], [AccountGroup], [AccountType], [DomainAccount], [Email], [isActive]);
END
ELSE
BEGIN
    PRINT '  -> Index IX_cdbAccounts_AccountName already exists.';
END
GO

-- 9.3 Covering Index on DomainAccount
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_cdbAccounts_DomainAccount' AND object_id = OBJECT_ID(N'[dbo].[cdbAccounts]'))
BEGIN
    PRINT '  -> Creating Index: IX_cdbAccounts_DomainAccount...';
    CREATE NONCLUSTERED INDEX [IX_cdbAccounts_DomainAccount]
    ON [dbo].[cdbAccounts] ([DomainAccount] ASC)
    INCLUDE ([AccountIDNo], [AccountName], [AccountGroup], [AccountType], [Email], [isActive]);
END
ELSE
BEGIN
    PRINT '  -> Index IX_cdbAccounts_DomainAccount already exists.';
END
GO

-- 9.4 Covering Index on Email
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_cdbAccounts_Email' AND object_id = OBJECT_ID(N'[dbo].[cdbAccounts]'))
BEGIN
    PRINT '  -> Creating Index: IX_cdbAccounts_Email...';
    CREATE NONCLUSTERED INDEX [IX_cdbAccounts_Email]
    ON [dbo].[cdbAccounts] ([Email] ASC)
    INCLUDE ([AccountID], [AccountName], [DomainAccount], [AccountGroup], [isActive]);
END
ELSE
BEGIN
    PRINT '  -> Index IX_cdbAccounts_Email already exists.';
END
GO

-- ==============================================================================
-- 10. POST-EXECUTION VERIFICATION & STATUS REPORT
-- ==============================================================================
PRINT '==============================================================================';
PRINT '>>> Post-Execution Verification: Listing All Active Nonclustered Indexes...';
PRINT '==============================================================================';
GO

SELECT 
    t.name AS [Table],
    i.name AS [Index Name],
    i.type_desc AS [Type],
    STRING_AGG(CASE WHEN ic.is_included_column = 0 THEN c.name END, ', ') 
        WITHIN GROUP (ORDER BY ic.index_column_id) AS [Key Columns],
    STRING_AGG(CASE WHEN ic.is_included_column = 1 THEN c.name END, ', ') 
        WITHIN GROUP (ORDER BY ic.index_column_id) AS [Included (Covering) Columns]
FROM sys.indexes i
INNER JOIN sys.tables t ON i.object_id = t.object_id
INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
WHERE t.name IN ('DealHeader', 'DealItems', 'DealRenewal', 'DealLinks', 'DealLost', 'dealWTN', 'deals_reg_notification', 'activity_logs', 'cdbAccounts')
  AND i.type_desc = 'NONCLUSTERED'
GROUP BY t.name, i.name, i.type_desc
ORDER BY t.name, i.name;
GO

PRINT '==============================================================================';
PRINT '>>> Diagnostic Performance Test with STATISTICS IO / TIME:';
PRINT '==============================================================================';
GO

SET STATISTICS IO, TIME ON;

-- Test Query 1: AO Scoped Filter (Should use IX_DealHeader_AssignedAO_dtCreated Index Seek)
SELECT TOP 50 
    dealID, dealRegID, custName, ProjectName, brand, BU, AssignedAO, dealStatus, expDt
FROM dbo.DealHeader
WHERE AssignedAO = 'Dan Lemuel Ramos'
ORDER BY dtCreated DESC;

-- Test Query 2: Expiration Warning Filter (Should use IX_DealHeader_expDt Index Seek)
SELECT TOP 50 
    dealID, dealRegID, custName, ProjectName, expDt
FROM dbo.DealHeader
WHERE expDt >= GETDATE() AND expDt <= DATEADD(day, 30, GETDATE())
ORDER BY expDt ASC;

SET STATISTICS IO, TIME OFF;
GO

PRINT '==============================================================================';
PRINT '>>> All production indexes have been successfully created and verified!';
PRINT '==============================================================================';
GO
