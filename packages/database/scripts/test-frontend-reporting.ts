import { prisma } from '../src/index';

async function testFrontendReporting() {
  console.log('================================================================');
  console.log(' Testing DealReportView Reporting Actions & Drilldowns');
  console.log('================================================================\n');

  // 1. Overall View Counts
  const totalInView = await prisma.dealReportView.count();
  console.log(`[1] Total records in DealReportView: ${totalInView}`);

  // 2. Test KPIs
  const [totalReg, totalExp, totalRen, lostCount, pipelineAgg] = await Promise.all([
    prisma.dealReportView.count({ where: { dealStatus: '1' } }),
    prisma.dealReportView.count({ where: { IsExpired: 1 } }),
    prisma.dealReportView.count({ where: { IsRenewed: 1 } }),
    prisma.dealReportView.count({ where: { OR: [{ IsLost: 1 }, { dealStatus: '7' }] } }),
    prisma.dealReportView.aggregate({ _sum: { TotalAmount: true } }),
  ]);

  console.log(`[2] KPIs:`);
  console.log(`    - Total Registered (dealStatus = 1): ${totalReg}`);
  console.log(`    - Total Expired: ${totalExp}`);
  console.log(`    - Total Renewed: ${totalRen}`);
  console.log(`    - Total Lost: ${lostCount}`);
  console.log(`    - Pipeline Value: PHP ${Number(pipelineAgg._sum?.TotalAmount || 0).toLocaleString()}`);

  // 3. Test Expiry Risk Deals
  const riskDeals = await prisma.dealReportView.findMany({
    where: {
      DaysRemaining: { gte: 0, lte: 30 },
      IsExpired: 0,
      dealStatus: { notIn: ['2', '7', '8'] },
    },
    select: { DaysRemaining: true },
  });

  let criticalCount = 0;
  let urgentCount = 0;
  let warningCount = 0;
  let noticeCount = 0;
  riskDeals.forEach((d) => {
    const days = d.DaysRemaining ?? -1;
    if (days >= 0 && days <= 3) criticalCount++;
    else if (days > 3 && days <= 7) urgentCount++;
    else if (days > 7 && days <= 15) warningCount++;
    else if (days > 15 && days <= 30) noticeCount++;
  });

  console.log(`[3] Expiry Risk Analysis (Total: ${riskDeals.length}):`);
  console.log(`    - Critical (<=3d): ${criticalCount}`);
  console.log(`    - Urgent (<=7d): ${urgentCount}`);
  console.log(`    - Warning (<=15d): ${warningCount}`);
  console.log(`    - Notice (<=30d): ${noticeCount}`);

  // 4. Test Top 6 Recent Deals for Activity Stream
  const recentDeals = await prisma.dealReportView.findMany({
    take: 6,
    orderBy: { dtCreated: 'desc' },
  });
  console.log(`[4] Recent Deals Stream fetched: ${recentDeals.length} deals`);
  recentDeals.forEach((d, i) => {
    console.log(`    ${i + 1}. [${d.dealRegID || d.dealID}] ${d.custName?.slice(0, 20)}... | Brand: ${d.brand} | BU: ${d.BU} | Amount: PHP ${Number(d.TotalAmount || 0).toLocaleString()}`);
  });

  // 5. Test Drilldown pagination (Registered, Page 1, PageSize 10)
  const [drillTotal, drillPage1] = await Promise.all([
    prisma.dealReportView.count({ where: { dealStatus: '1' } }),
    prisma.dealReportView.findMany({
      where: { dealStatus: '1' },
      take: 10,
      skip: 0,
      orderBy: { dtCreated: 'desc' },
    }),
  ]);
  console.log(`[5] Drilldown Test (Registered): Total = ${drillTotal}, Page 1 Size = ${drillPage1.length}`);

  console.log('\n================================================================');
  console.log(' All Reporting View queries verified successfully!');
  console.log('================================================================\n');
}

testFrontendReporting()
  .catch((e) => {
    console.error('Error during reporting view test:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
