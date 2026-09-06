-- ==============================================================================
-- Deals Registration Portal - Create DealReportView
-- Target Database: DealsRegistrationDB
-- Target Instance: Microsoft SQL Server Management Studio (SSMS)
-- Description:
--   Creates the enriched deal-level view dbo.DealReportView that pre-joins
--   and calculates line item amounts, renewal counts, loss reasons, assigned PM,
--   and expiration status for the /reports analytics dashboard.
-- ==============================================================================

USE [DealsRegistrationDB];
GO

PRINT '==============================================================================';
PRINT '>>> Creating or Updating View: dbo.DealReportView...';
PRINT '>>> Server Time: ' + CONVERT(VARCHAR(30), GETDATE(), 120);
PRINT '==============================================================================';
GO

IF OBJECT_ID(N'[dbo].[DealReportView]', N'V') IS NOT NULL
BEGIN
    PRINT '  -> Dropping existing dbo.DealReportView...';
    DROP VIEW [dbo].[DealReportView];
END
GO

PRINT '  -> Creating dbo.DealReportView...';
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

PRINT '  -> View dbo.DealReportView created successfully!';
GO

-- Verification Query: Fetch sample rows
PRINT '==============================================================================';
PRINT '>>> Verification: Fetching top 5 sample rows from dbo.DealReportView...';
PRINT '==============================================================================';
GO

SELECT TOP 5
    dealID,
    dealRegID,
    custName,
    brand,
    BU,
    AssignedAO,
    assignedPM,
    TotalAmount,
    ItemCount,
    IsRenewed,
    RenewalCount,
    IsLost,
    DaysRemaining,
    IsExpired
FROM dbo.DealReportView
ORDER BY dtCreated DESC;
GO

PRINT '==============================================================================';
PRINT '>>> Verification Completed Successfully!';
PRINT '==============================================================================';
GO
