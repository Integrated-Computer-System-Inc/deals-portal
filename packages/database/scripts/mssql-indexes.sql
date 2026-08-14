-- ==============================================================================
-- Deals Registration Portal - Performance Indexing Script for Microsoft SQL Server
-- Target Database: DealsRegistrationDB
-- Description: Creates optimized clustered and nonclustered indexes with INCLUDE columns
--              to accelerate scoped queries, foreign key joins, sorting, and notification queues.
-- Idempotency: All index creations check IF NOT EXISTS before executing.
-- ==============================================================================

USE [DealsRegistrationDB];
GO

PRINT '>>> Starting Index Optimization for Deals Registration Portal...';
GO

-- ------------------------------------------------------------------------------
-- 1. Table: DealHeader
-- ------------------------------------------------------------------------------
-- 1.1 Primary Key / Clustered Index (if not already defined)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[DealHeader]') AND is_primary_key = 1)
BEGIN
    PRINT 'Adding Primary Key on dbo.DealHeader(dealID)...';
    ALTER TABLE [dbo].[DealHeader] ADD CONSTRAINT [PK_DealHeader_dealID] PRIMARY KEY CLUSTERED ([dealID] ASC);
END
GO

-- 1.2 Nonclustered Index for AO Scoped Queries: (AssignedAO, dtCreated DESC)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealHeader_AssignedAO_dtCreated' AND object_id = OBJECT_ID(N'[dbo].[DealHeader]'))
BEGIN
    PRINT 'Creating Index: IX_DealHeader_AssignedAO_dtCreated...';
    CREATE NONCLUSTERED INDEX [IX_DealHeader_AssignedAO_dtCreated]
    ON [dbo].[DealHeader] ([AssignedAO] ASC, [dtCreated] DESC)
    INCLUDE ([dealRegID], [ProjectName], [BU], [dealStatus], [dtRegistered], [expDt], [brand], [customerID], [custName], [createdBy], [remarks], [dtValidTo]);
END
GO

-- 1.3 Nonclustered Index for BU Scoped Queries: (BU, dtCreated DESC)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealHeader_BU_dtCreated' AND object_id = OBJECT_ID(N'[dbo].[DealHeader]'))
BEGIN
    PRINT 'Creating Index: IX_DealHeader_BU_dtCreated...';
    CREATE NONCLUSTERED INDEX [IX_DealHeader_BU_dtCreated]
    ON [dbo].[DealHeader] ([BU] ASC, [dtCreated] DESC)
    INCLUDE ([dealRegID], [ProjectName], [AssignedAO], [dealStatus], [dtRegistered], [expDt], [brand], [customerID], [custName], [createdBy], [remarks], [dtValidTo]);
END
GO

-- 1.4 Nonclustered Index for Admin / Global Sorting: (dtCreated DESC)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealHeader_dtCreated' AND object_id = OBJECT_ID(N'[dbo].[DealHeader]'))
BEGIN
    PRINT 'Creating Index: IX_DealHeader_dtCreated...';
    CREATE NONCLUSTERED INDEX [IX_DealHeader_dtCreated]
    ON [dbo].[DealHeader] ([dtCreated] DESC)
    INCLUDE ([dealRegID], [ProjectName], [AssignedAO], [BU], [dealStatus], [dtRegistered], [expDt], [brand], [customerID], [custName], [createdBy], [remarks], [dtValidTo]);
END
GO

-- 1.5 Nonclustered Index on Deal Registration ID (Unique identifier lookup)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealHeader_dealRegID' AND object_id = OBJECT_ID(N'[dbo].[DealHeader]'))
BEGIN
    PRINT 'Creating Index: IX_DealHeader_dealRegID...';
    CREATE NONCLUSTERED INDEX [IX_DealHeader_dealRegID]
    ON [dbo].[DealHeader] ([dealRegID] ASC);
END
GO

-- 1.6 Nonclustered Index on customerID & brand
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealHeader_customerID' AND object_id = OBJECT_ID(N'[dbo].[DealHeader]'))
BEGIN
    PRINT 'Creating Index: IX_DealHeader_customerID...';
    CREATE NONCLUSTERED INDEX [IX_DealHeader_customerID]
    ON [dbo].[DealHeader] ([customerID] ASC);
END
GO

-- ------------------------------------------------------------------------------
-- 2. Table: DealItems
-- ------------------------------------------------------------------------------
-- 2.1 Primary Key / Clustered Index (if not already defined)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[DealItems]') AND is_primary_key = 1)
BEGIN
    PRINT 'Adding Primary Key on dbo.DealItems(dealItemID)...';
    ALTER TABLE [dbo].[DealItems] ADD CONSTRAINT [PK_DealItems_dealItemID] PRIMARY KEY CLUSTERED ([dealItemID] ASC);
END
GO

-- 2.2 Foreign Key Index: (dealID) with covering INCLUDE columns
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealItems_dealID' AND object_id = OBJECT_ID(N'[dbo].[DealItems]'))
BEGIN
    PRINT 'Creating Index: IX_DealItems_dealID...';
    CREATE NONCLUSTERED INDEX [IX_DealItems_dealID]
    ON [dbo].[DealItems] ([dealID] ASC)
    INCLUDE ([dealItemID], [itemDesc], [qty], [currency], [totalAmt]);
END
GO

-- ------------------------------------------------------------------------------
-- 3. Table: deals_reg_notification (Email Queue / Scheduled Worker)
-- ------------------------------------------------------------------------------
-- 3.1 Primary Key / Clustered Index (if not already defined)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[deals_reg_notification]') AND is_primary_key = 1)
BEGIN
    PRINT 'Adding Primary Key on dbo.deals_reg_notification(email_id)...';
    ALTER TABLE [dbo].[deals_reg_notification] ADD CONSTRAINT [PK_deals_reg_notification_email_id] PRIMARY KEY CLUSTERED ([email_id] ASC);
END
GO

-- 3.2 Covering Index for Pending Email Queue Worker: (status, dateCreated ASC)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_deals_reg_notification_status_dateCreated' AND object_id = OBJECT_ID(N'[dbo].[deals_reg_notification]'))
BEGIN
    PRINT 'Creating Index: IX_deals_reg_notification_status_dateCreated...';
    CREATE NONCLUSTERED INDEX [IX_deals_reg_notification_status_dateCreated]
    ON [dbo].[deals_reg_notification] ([status] ASC, [dateCreated] ASC)
    INCLUDE ([email_id], [creator], [subject], [message], [sendTo], [sendCC], [sendBCC], [dateSent]);
END
GO

-- ------------------------------------------------------------------------------
-- 4. Table: dealWTN (When To Notify Alerts)
-- ------------------------------------------------------------------------------
-- 4.1 Primary Key / Clustered Index (if not already defined)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[dealWTN]') AND is_primary_key = 1)
BEGIN
    PRINT 'Adding Primary Key on dbo.dealWTN(id)...';
    ALTER TABLE [dbo].[dealWTN] ADD CONSTRAINT [PK_dealWTN_id] PRIMARY KEY CLUSTERED ([id] ASC);
END
GO

-- 4.2 Nonclustered Index on dealID & whenToNotify
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_dealWTN_dealID' AND object_id = OBJECT_ID(N'[dbo].[dealWTN]'))
BEGIN
    PRINT 'Creating Index: IX_dealWTN_dealID...';
    CREATE NONCLUSTERED INDEX [IX_dealWTN_dealID]
    ON [dbo].[dealWTN] ([dealID] ASC)
    INCLUDE ([id], [whenToNotify]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_dealWTN_whenToNotify' AND object_id = OBJECT_ID(N'[dbo].[dealWTN]'))
BEGIN
    PRINT 'Creating Index: IX_dealWTN_whenToNotify...';
    CREATE NONCLUSTERED INDEX [IX_dealWTN_whenToNotify]
    ON [dbo].[dealWTN] ([whenToNotify] ASC);
END
GO

-- ------------------------------------------------------------------------------
-- 5. Table: DealResponse
-- ------------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[DealResponse]') AND is_primary_key = 1)
BEGIN
    PRINT 'Adding Primary Key on dbo.DealResponse(id)...';
    ALTER TABLE [dbo].[DealResponse] ADD CONSTRAINT [PK_DealResponse_id] PRIMARY KEY CLUSTERED ([id] ASC);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealResponse_dealID' AND object_id = OBJECT_ID(N'[dbo].[DealResponse]'))
BEGIN
    PRINT 'Creating Index: IX_DealResponse_dealID...';
    CREATE NONCLUSTERED INDEX [IX_DealResponse_dealID]
    ON [dbo].[DealResponse] ([dealID] ASC)
    INCLUDE ([id], [responseDays]);
END
GO

-- ------------------------------------------------------------------------------
-- 6. Table: DealLost
-- ------------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[DealLost]') AND is_primary_key = 1)
BEGIN
    PRINT 'Adding Primary Key on dbo.DealLost(dealID)...';
    ALTER TABLE [dbo].[DealLost] ADD CONSTRAINT [PK_DealLost_dealID] PRIMARY KEY CLUSTERED ([dealID] ASC);
END
GO

-- ------------------------------------------------------------------------------
-- 7. Table: cdbAccounts (User, AO, and Account Metadata)
-- ------------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[cdbAccounts]') AND is_primary_key = 1)
BEGIN
    PRINT 'Adding Primary Key on dbo.cdbAccounts(AccountID)...';
    ALTER TABLE [dbo].[cdbAccounts] ADD CONSTRAINT [PK_cdbAccounts_AccountID] PRIMARY KEY CLUSTERED ([AccountID] ASC);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_cdbAccounts_AccountName' AND object_id = OBJECT_ID(N'[dbo].[cdbAccounts]'))
BEGIN
    PRINT 'Creating Index: IX_cdbAccounts_AccountName...';
    CREATE NONCLUSTERED INDEX [IX_cdbAccounts_AccountName]
    ON [dbo].[cdbAccounts] ([AccountName] ASC)
    INCLUDE ([AccountIDNo], [AccountGroup], [AccountType], [DomainAccount], [Email], [isActive]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_cdbAccounts_DomainAccount' AND object_id = OBJECT_ID(N'[dbo].[cdbAccounts]'))
BEGIN
    PRINT 'Creating Index: IX_cdbAccounts_DomainAccount...';
    CREATE NONCLUSTERED INDEX [IX_cdbAccounts_DomainAccount]
    ON [dbo].[cdbAccounts] ([DomainAccount] ASC)
    INCLUDE ([AccountIDNo], [AccountName], [AccountGroup], [AccountType], [Email], [isActive]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_cdbAccounts_AccountGroup' AND object_id = OBJECT_ID(N'[dbo].[cdbAccounts]'))
BEGIN
    PRINT 'Creating Index: IX_cdbAccounts_AccountGroup...';
    CREATE NONCLUSTERED INDEX [IX_cdbAccounts_AccountGroup]
    ON [dbo].[cdbAccounts] ([AccountGroup] ASC, [AccountType] ASC)
    INCLUDE ([AccountName], [DomainAccount], [Email], [isActive]);
END
GO

-- ------------------------------------------------------------------------------
-- 8. Table: DealBrands & DealStatus
-- ------------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[DealBrands]') AND is_primary_key = 1)
BEGIN
    PRINT 'Adding Primary Key on dbo.DealBrands(id)...';
    ALTER TABLE [dbo].[DealBrands] ADD CONSTRAINT [PK_DealBrands_id] PRIMARY KEY CLUSTERED ([id] ASC);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[DealStatus]') AND is_primary_key = 1)
BEGIN
    PRINT 'Adding Primary Key on dbo.DealStatus(status_id)...';
    ALTER TABLE [dbo].[DealStatus] ADD CONSTRAINT [PK_DealStatus_status_id] PRIMARY KEY CLUSTERED ([status_id] ASC);
END
GO

PRINT '>>> Index Optimization Script Completed Successfully!';
GO
