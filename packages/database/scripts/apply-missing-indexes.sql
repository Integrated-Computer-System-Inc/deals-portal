-- ==============================================================================
-- Deals Registration Portal - Missing Performance Indexes Script
-- Target Database: DealsRegistrationDB
-- ==============================================================================

USE [DealsRegistrationDB];
GO

-- 1. Index on DealHeader (expDt) for Expiry status calculation & filtering
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealHeader_expDt' AND object_id = OBJECT_ID(N'[dbo].[DealHeader]'))
BEGIN
    PRINT 'Creating Index: IX_DealHeader_expDt...';
    CREATE NONCLUSTERED INDEX [IX_DealHeader_expDt]
    ON [dbo].[DealHeader] ([expDt] ASC)
    INCLUDE ([dealID], [dealRegID], [AssignedAO], [BU], [dealStatus]);
END
GO

-- 2. Index on DealHeader (brand, dtCreated DESC) for Brand analytics & filtering
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealHeader_brand_dtCreated' AND object_id = OBJECT_ID(N'[dbo].[DealHeader]'))
BEGIN
    PRINT 'Creating Index: IX_DealHeader_brand_dtCreated...';
    CREATE NONCLUSTERED INDEX [IX_DealHeader_brand_dtCreated]
    ON [dbo].[DealHeader] ([brand] ASC, [dtCreated] DESC)
    INCLUDE ([dealID], [dealRegID], [AssignedAO], [BU], [dealStatus], [custName]);
END
GO

-- 3. Index on DealRenewal (dealID) for fast join & count queries
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealRenewal_dealID' AND object_id = OBJECT_ID(N'[dbo].[DealRenewal]'))
BEGIN
    PRINT 'Creating Index: IX_DealRenewal_dealID...';
    CREATE NONCLUSTERED INDEX [IX_DealRenewal_dealID]
    ON [dbo].[DealRenewal] ([dealID] ASC)
    INCLUDE ([renewalID], [dtRenewal], [rexpDt]);
END
GO

PRINT '>>> Index creation script finished.';
GO
