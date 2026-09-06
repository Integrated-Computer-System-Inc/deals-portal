import { prisma } from '../src/index';

async function main() {
  console.log('--- Applying dbo.DealReportView to SQL Server ---');

  const dropSql = `
    IF OBJECT_ID('dbo.DealReportView', 'V') IS NOT NULL
      DROP VIEW dbo.DealReportView;
  `;

  const createSql = `
    EXEC sp_executesql N'
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
        ISNULL(itemAgg.TotalAmount, 0) AS TotalAmount,
        ISNULL(itemAgg.ItemCount, 0) AS ItemCount,
        CASE WHEN renAgg.dealID IS NOT NULL THEN 1 ELSE 0 END AS IsRenewed,
        ISNULL(renAgg.RenewalCount, 0) AS RenewalCount,
        renAgg.LatestRenewalDate,
        CASE WHEN l.dealID IS NOT NULL THEN 1 ELSE 0 END AS IsLost,
        l.competitorVendor,
        l.competitorBrand,
        l.reason AS LostReason,
        DATEDIFF(day, GETDATE(), d.expDt) AS DaysRemaining,
        CASE WHEN d.expDt < GETDATE() THEN 1 ELSE 0 END AS IsExpired
    FROM dbo.DealHeader d
    LEFT JOIN dbo.DealBrands b ON d.brand = b.brand
    LEFT JOIN (
        SELECT 
            dealID,
            SUM(ISNULL(TRY_CAST(REPLACE(totalAmt, '','', '''') AS DECIMAL(18,2)), 0)) AS TotalAmount,
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
    '
  `;

  try {
    console.log('1. Dropping existing view if present...');
    await prisma.$executeRawUnsafe(dropSql);

    console.log('2. Creating dbo.DealReportView...');
    await prisma.$executeRawUnsafe(createSql);
    console.log('✅ View dbo.DealReportView created successfully!');

    // Test query the view
    console.log('3. Verifying query against dbo.DealReportView...');
    const testRows: any[] = await prisma.$queryRawUnsafe(`
      SELECT TOP 5 
        dealID, dealRegID, custName, brand, BU, AssignedAO, assignedPM, TotalAmount, ItemCount, IsRenewed, IsLost
      FROM dbo.DealReportView
      ORDER BY dtCreated DESC;
    `);

    console.log('Sample rows from dbo.DealReportView:');
    console.table(testRows);
  } catch (err: any) {
    console.error('Error applying view:', err.message);
    console.log('\n👉 If DDL permissions are restricted, run create-deal-report-view.sql in SSMS.');
  } finally {
    await prisma.$disconnect();
  }
}

main();
