import { prisma } from '../src/index';

interface BenchmarkResult {
  testName: string;
  recordsCount: number;
  durationMs: number;
  notes?: string;
}

async function runBenchmark() {
  console.log('================================================================');
  console.log(' Deals Registration Portal - Performance Benchmark Suite');
  console.log(' Testing against Microsoft SQL Server instance');
  console.log('================================================================\n');

  // Check connection & record counts
  const [dealCount, itemCount, lostCount, wtnCount, renewalCount, accountsCount] = await Promise.all([
    prisma.dealHeader.count(),
    prisma.dealItems.count(),
    prisma.dealLost.count(),
    prisma.dealWTN.count(),
    prisma.dealRenewal.count(),
    prisma.cdbAccounts.count(),
  ]);

  console.log('📊 Current Database Record Counts:');
  console.log(`  - DealHeader:           ${dealCount.toLocaleString()} rows`);
  console.log(`  - DealItems:            ${itemCount.toLocaleString()} rows`);
  console.log(`  - DealLost:             ${lostCount.toLocaleString()} rows`);
  console.log(`  - dealWTN:              ${wtnCount.toLocaleString()} rows`);
  console.log(`  - DealRenewal:          ${renewalCount.toLocaleString()} rows`);
  console.log(`  - cdbAccounts:          ${accountsCount.toLocaleString()} rows\n`);

  const results: BenchmarkResult[] = [];

  // --------------------------------------------------------------------------
  // Benchmark 1: AO Scoped Query (Simulates AO logging in)
  // --------------------------------------------------------------------------
  console.log('Running Test 1: AO-Scoped Query (AssignedAO filter with 5 relations)...');
  const t0 = performance.now();
  const aoDeals = await prisma.dealHeader.findMany({
    where: {
      OR: [
        { AssignedAO: { contains: 'Dan Lemuel Ramos' } },
        { createdBy: { contains: 'DRAMOS' } },
      ],
    },
    select: {
      dealID: true,
      dealRegID: true,
      custName: true,
      ProjectName: true,
      brand: true,
      BU: true,
      AssignedAO: true,
      dealStatus: true,
      expDt: true,
      dtCreated: true,
      DealItems: { select: { dealItemID: true, itemDesc: true, totalAmt: true } },
      Renewals: { take: 1, orderBy: { dtCreated: 'desc' } },
    },
    orderBy: { dtCreated: 'desc' },
  });
  const t1 = performance.now();
  const d1 = +(t1 - t0).toFixed(2);
  results.push({ testName: '1. AO-Scoped Query', recordsCount: aoDeals.length, durationMs: d1 });
  console.log(`  ↳ Completed in ${d1} ms (${aoDeals.length} deals fetched)\n`);

  // --------------------------------------------------------------------------
  // Benchmark 2: BU Scoped Query (Simulates BU Head viewing their deals)
  // --------------------------------------------------------------------------
  console.log('Running Test 2: BU-Scoped Query (BU filter with 5 relations)...');
  const t2 = performance.now();
  const buDeals = await prisma.dealHeader.findMany({
    where: {
      BU: 'BU5',
    },
    select: {
      dealID: true,
      dealRegID: true,
      custName: true,
      ProjectName: true,
      brand: true,
      BU: true,
      dealStatus: true,
      expDt: true,
      dtCreated: true,
      DealItems: { select: { dealItemID: true, itemDesc: true, totalAmt: true } },
    },
    orderBy: { dtCreated: 'desc' },
  });
  const t3 = performance.now();
  const d2 = +(t3 - t2).toFixed(2);
  results.push({ testName: '2. BU-Scoped Query (BU5)', recordsCount: buDeals.length, durationMs: d2 });
  console.log(`  ↳ Completed in ${d2} ms (${buDeals.length} deals fetched)\n`);

  // --------------------------------------------------------------------------
  // Benchmark 3: Expiry Filter Query (Upcoming 30 days notice)
  // --------------------------------------------------------------------------
  console.log('Running Test 3: Expiry Warnings Query (expDt within next 30 days)...');
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const t4 = performance.now();
  const expiringDeals = await prisma.dealHeader.findMany({
    where: {
      expDt: {
        gte: now,
        lte: in30Days,
      },
    },
    select: {
      dealID: true,
      dealRegID: true,
      custName: true,
      ProjectName: true,
      expDt: true,
      AssignedAO: true,
    },
    orderBy: { expDt: 'asc' },
    take: 50,
  });
  const t5 = performance.now();
  const d3 = +(t5 - t4).toFixed(2);
  results.push({ testName: '3. Expiry Warning Filter (30 Days)', recordsCount: expiringDeals.length, durationMs: d3 });
  console.log(`  ↳ Completed in ${d3} ms (${expiringDeals.length} expiring deals)\n`);

  // --------------------------------------------------------------------------
  // Benchmark 4: Paginated Deal List with Relations (take: 50, skip: 0)
  // --------------------------------------------------------------------------
  console.log('Running Test 4: Paginated Deal Table (take: 50, skip: 0 with lean relations)...');
  const t6 = performance.now();
  const pagedDeals = await prisma.dealHeader.findMany({
    take: 50,
    skip: 0,
    select: {
      dealID: true,
      dealRegID: true,
      custName: true,
      ProjectName: true,
      brand: true,
      BU: true,
      AssignedAO: true,
      dealStatus: true,
      expDt: true,
      dtCreated: true,
      DealItems: { select: { dealItemID: true, itemDesc: true, totalAmt: true } },
      DealLost: { select: { competitorVendor: true, reason: true } },
      Renewals: { take: 1, orderBy: { dtCreated: 'desc' } },
    },
    orderBy: { dtCreated: 'desc' },
  });
  const t7 = performance.now();
  const d4 = +(t7 - t6).toFixed(2);
  results.push({ testName: '4. Paginated List (50 deals + relations)', recordsCount: pagedDeals.length, durationMs: d4 });
  console.log(`  ↳ Completed in ${d4} ms (${pagedDeals.length} deals)\n`);

  // --------------------------------------------------------------------------
  // Benchmark 5: Dashboard Single-Pass KPI Computation
  // --------------------------------------------------------------------------
  console.log('Running Test 5: Dashboard KPI Aggregation Query...');
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const t8 = performance.now();
  const kpiResult: any = await prisma.$queryRawUnsafe(`
    SELECT
      COUNT(*) AS totalCount,
      SUM(CASE WHEN dealStatus = '1' THEN 1 ELSE 0 END) AS totalRegistered,
      SUM(CASE WHEN expDt >= '${startOfMonth.toISOString().slice(0, 10)}' AND expDt <= '${endOfMonth.toISOString().slice(0, 10)}' AND expDt < '${now.toISOString().slice(0, 10)}' THEN 1 ELSE 0 END) AS expiredThisMonth,
      (SELECT COUNT(DISTINCT dealID) FROM dbo.DealRenewal) AS totalRenewed
    FROM dbo.DealHeader;
  `);
  const t9 = performance.now();
  const d5 = +(t9 - t8).toFixed(2);
  results.push({ testName: '5. Dashboard KPI Single-Pass Aggregation', recordsCount: 1, durationMs: d5 });
  console.log(`  ↳ Completed in ${d5} ms:`, kpiResult[0]);
  console.log();

  // --------------------------------------------------------------------------
  // Benchmark 6: Reports Server-Side Aggregation via DealReportView
  // --------------------------------------------------------------------------
  console.log('Running Test 6: Reports Metrics Aggregation (via DealReportView)...');
  try {
    const t10 = performance.now();
    const [reportKPIs, brandReportGroup, buReportGroup] = await Promise.all([
      prisma.dealReportView.aggregate({
        _sum: { TotalAmount: true },
        _count: { dealID: true },
      }),
      prisma.dealReportView.groupBy({
        by: ['brand', 'assignedPM'],
        _count: { dealID: true },
        _sum: { TotalAmount: true },
        orderBy: { _count: { dealID: 'desc' } },
        take: 10,
      }),
      prisma.dealReportView.groupBy({
        by: ['BU'],
        _count: { dealID: true },
        _sum: { TotalAmount: true },
        orderBy: { _count: { dealID: 'desc' } },
      }),
    ]);
    const t11 = performance.now();
    const d6 = +(t11 - t10).toFixed(2);
    results.push({ testName: '6. Reports Server Aggregation (DealReportView)', recordsCount: brandReportGroup.length + buReportGroup.length, durationMs: d6 });
    console.log(`  ↳ Completed in ${d6} ms (${brandReportGroup.length} top brands, ${buReportGroup.length} BUs aggregated)\n`);
  } catch (err: any) {
    console.log('  ↳ Notice: DealReportView not yet created in SQL Server (run create-deal-report-view.sql in SSMS)\n');
  }

  // --------------------------------------------------------------------------
  // Summary Table
  // --------------------------------------------------------------------------
  console.log('================================================================');
  console.log(' BENCHMARK SUMMARY RESULTS:');
  console.log('================================================================');
  console.table(results);
  console.log('================================================================\n');
}

runBenchmark()
  .catch((err) => {
    console.error('[BENCHMARK ERROR]', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
