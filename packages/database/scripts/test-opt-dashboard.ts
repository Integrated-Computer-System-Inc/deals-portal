import { prisma } from '../src/index';

async function testOptimizedDashboard() {
  console.log('--- Testing Optimized Dashboard Query ---');
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const startIso = startOfMonth.toISOString().slice(0, 10);
  const endIso = endOfMonth.toISOString().slice(0, 10);
  const nowIso = now.toISOString().slice(0, 10);

  const t0 = performance.now();

  const [kpiRows, brands, bus, recentDeals]: any = await Promise.all([
    prisma.$queryRawUnsafe(`
      SELECT
        COUNT(*) AS totalCount,
        SUM(CASE WHEN dealStatus = '1' THEN 1 ELSE 0 END) AS totalRegistered,
        SUM(CASE WHEN expDt >= '${startIso}' AND expDt <= '${endIso}' AND expDt < '${nowIso}' THEN 1 ELSE 0 END) AS expiredThisMonth,
        (SELECT COUNT(DISTINCT dealID) FROM DealRenewal) AS totalRenewed
      FROM DealHeader;
    `),
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
      select: {
        dealID: true,
        dtRegistered: true,
        expDt: true,
        brand: true,
        customerID: true,
        dealRegID: true,
        ProjectName: true,
        AssignedAO: true,
        BU: true,
        dealStatus: true,
        custName: true,
        dtCreated: true,
        DealItems: {
          select: {
            dealItemID: true,
            dealID: true,
            currency: true,
            totalAmt: true,
          },
        },
      },
    }),
  ]);

  const t1 = performance.now();
  console.log(`Executed in ${(t1 - t0).toFixed(2)} ms!`);
  console.log('KPIs:', kpiRows[0]);
  console.log(`Brands: ${brands.length}, BUs: ${bus.length}, Recent: ${recentDeals.length}`);
}

testOptimizedDashboard()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
