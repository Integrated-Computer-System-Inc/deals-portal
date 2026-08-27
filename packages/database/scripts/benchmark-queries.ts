import { prisma } from '../src/index';

async function runBenchmark() {
  console.log('=== Database Query Performance Benchmark ===\n');

  // 1. Total counts in tables
  const dealCount = await prisma.dealHeader.count();
  const itemCount = await prisma.dealItems.count();
  const lostCount = await prisma.dealLost.count();
  const wtnCount = await prisma.dealWTN.count();
  const renewalCount = await prisma.dealRenewal.count();
  const accountsCount = await prisma.cdbAccounts.count();

  console.log(`Record Counts:`);
  console.log(`- DealHeader: ${dealCount}`);
  console.log(`- DealItems: ${itemCount}`);
  console.log(`- DealLost: ${lostCount}`);
  console.log(`- dealWTN: ${wtnCount}`);
  console.log(`- DealRenewal: ${renewalCount}`);
  console.log(`- cdbAccounts: ${accountsCount}\n`);

  // Benchmark 1: Full findMany with all relations (current unpaginated fetch for Admin)
  console.log('Test 1: Full fetch of all deals with all 5 relations (Current unpaginated getScopedDeals)...');
  const t0 = performance.now();
  const fullDeals = await prisma.dealHeader.findMany({
    include: {
      DealItems: true,
      DealWTN: true,
      DealResponse: true,
      DealLost: true,
      Renewals: true,
    },
    orderBy: { dtCreated: 'desc' },
  });
  const t1 = performance.now();
  console.log(`-> Fetched ${fullDeals.length} deals in ${(t1 - t0).toFixed(2)} ms`);

  // Benchmark 2: Lean relations / field selection (only needed fields for table)
  console.log('\nTest 2: Full fetch with lean field selection (select instead of include)...');
  const t2 = performance.now();
  const leanDeals = await prisma.dealHeader.findMany({
    select: {
      dealID: true,
      dtRegistered: true,
      expiration: true,
      expDt: true,
      brand: true,
      customerID: true,
      dealRegID: true,
      ProjectName: true,
      AssignedAO: true,
      BU: true,
      dealStatus: true,
      createdBy: true,
      custName: true,
      remarks: true,
      dtCreated: true,
      dtValidTo: true,
      DealItems: {
        select: {
          dealItemID: true,
          dealID: true,
          itemDesc: true,
          qty: true,
          currency: true,
          totalAmt: true,
        },
      },
      DealWTN: { select: { id: true, dealID: true, whenToNotify: true } },
      DealResponse: { select: { id: true, dealID: true, responseDays: true } },
      DealLost: { select: { dealID: true, competitorVendor: true, competitorBrand: true, icsOffer: true, competitorOffer: true, reason: true, otherInformation: true } },
      Renewals: { select: { renewalID: true, dealID: true, dtRenewal: true, rexpDt: true, remarks: true, dtCreated: true } },
    },
    orderBy: { dtCreated: 'desc' },
  });
  const t3 = performance.now();
  console.log(`-> Fetched ${leanDeals.length} lean deals in ${(t3 - t2).toFixed(2)} ms`);

  // Benchmark 3: Paginated fetch (take 50, skip 0) with relations
  console.log('\nTest 3: Paginated fetch (take: 50, skip: 0) with relations...');
  const t4 = performance.now();
  const pageDeals = await prisma.dealHeader.findMany({
    take: 50,
    skip: 0,
    include: {
      DealItems: true,
      DealWTN: true,
      DealResponse: true,
      DealLost: true,
      Renewals: true,
    },
    orderBy: { dtCreated: 'desc' },
  });
  const t5 = performance.now();
  console.log(`-> Fetched ${pageDeals.length} paginated deals in ${(t5 - t4).toFixed(2)} ms`);

  // Benchmark 4: AO scoped query (e.g. AssignedAO = 'Dan Lemuel Ramos')
  console.log('\nTest 4: AO Scoped query (AssignedAO / createdBy filter)...');
  const t6 = performance.now();
  const aoDeals = await prisma.dealHeader.findMany({
    where: {
      OR: [
        { AssignedAO: { contains: 'Dan Lemuel Ramos' } },
        { createdBy: { contains: 'DRAMOS' } },
      ],
    },
    include: {
      DealItems: true,
      DealWTN: true,
      DealResponse: true,
      DealLost: true,
      Renewals: true,
    },
    orderBy: { dtCreated: 'desc' },
  });
  const t7 = performance.now();
  console.log(`-> Fetched ${aoDeals.length} AO deals in ${(t7 - t6).toFixed(2)} ms`);

  // Benchmark 5: BU scoped query (e.g. BU = 'BU5')
  console.log('\nTest 5: BU Scoped query (BU = "BU5")...');
  const t8 = performance.now();
  const buDeals = await prisma.dealHeader.findMany({
    where: {
      BU: 'BU5',
    },
    include: {
      DealItems: true,
      DealWTN: true,
      DealResponse: true,
      DealLost: true,
      Renewals: true,
    },
    orderBy: { dtCreated: 'desc' },
  });
  const t9 = performance.now();
  console.log(`-> Fetched ${buDeals.length} BU5 deals in ${(t9 - t8).toFixed(2)} ms`);

  // Benchmark 6: Dashboard Aggregation (Parallel counts + groupBys)
  console.log('\nTest 6: Dashboard Summary Aggregation...');
  const t10 = performance.now();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  await Promise.all([
    prisma.dealHeader.count(),
    prisma.dealHeader.count({ where: { dealStatus: '1' } }),
    prisma.dealHeader.count({
      where: {
        expDt: { gte: startOfMonth, lte: endOfMonth, lt: now },
      },
    }),
    prisma.dealHeader.count({
      where: { Renewals: { some: {} } },
    }),
    prisma.dealHeader.groupBy({
      by: ['brand'],
      _count: { dealID: true },
      orderBy: { _count: { dealID: 'desc' } },
      take: 10,
    }),
    prisma.dealHeader.groupBy({
      by: ['BU'],
      _count: { dealID: true },
      orderBy: { _count: { dealID: 'desc' } },
    }),
    prisma.dealHeader.findMany({
      take: 5,
      orderBy: { dtCreated: 'desc' },
      include: { DealItems: true },
    }),
  ]);
  const t11 = performance.now();
  console.log(`-> Dashboard metrics computed in ${(t11 - t10).toFixed(2)} ms`);

  // Benchmark 7: Single Raw SQL query for Dashboard metrics vs 7 Prisma queries
  console.log('\nTest 7: Single Raw SQL query for Dashboard metrics...');
  const t12 = performance.now();
  const rawDashboard = await prisma.$queryRawUnsafe(`
    SELECT
      COUNT(*) AS totalCount,
      SUM(CASE WHEN dealStatus = '1' THEN 1 ELSE 0 END) AS totalRegistered,
      SUM(CASE WHEN expDt >= '${startOfMonth.toISOString().slice(0, 10)}' AND expDt <= '${endOfMonth.toISOString().slice(0, 10)}' AND expDt < '${now.toISOString().slice(0, 10)}' THEN 1 ELSE 0 END) AS expiredThisMonth,
      (SELECT COUNT(DISTINCT dealID) FROM DealRenewal) AS totalRenewed
    FROM DealHeader;
  `);
  const t13 = performance.now();
  console.log(`-> Raw SQL single-pass aggregate computed in ${(t13 - t12).toFixed(2)} ms:`, rawDashboard);

  console.log('\n=== Benchmark Finished ===');
}

runBenchmark()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
