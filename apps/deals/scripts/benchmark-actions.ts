import { getScopedDeals, getDashboardSummary } from '../app/actions/deals';

async function testPerformance() {
  console.log('===============================================================');
  console.log(' Deals Registration Portal - Post-Optimization Query Benchmark');
  console.log('===============================================================\n');

  // Test 1: Paginated getScopedDeals (Page 1, 50 deals, Admin scope)
  console.log('1. Testing getScopedDeals: Page 1, PageSize 50 (Global Scope)...');
  const t0 = performance.now();
  const res1 = await getScopedDeals({ page: 1, pageSize: 50, userRole: 'admin' });
  const t1 = performance.now();
  console.log(`   -> Success: ${res1.success}`);
  console.log(`   -> Total in DB: ${res1.totalCount} deals across ${res1.totalPages} pages`);
  console.log(`   -> Returned rows on page: ${res1.data?.length}`);
  console.log(`   -> Time elapsed: ${(t1 - t0).toFixed(2)} ms\n`);

  // Test 2: Search + Status Filter pushdown
  console.log('2. Testing getScopedDeals with Search Query ("Dell") and Registered Status...');
  const t2 = performance.now();
  const res2 = await getScopedDeals({
    searchQuery: 'Dell',
    statusFilter: ['1'],
    page: 1,
    pageSize: 50,
    userRole: 'admin',
  });
  const t3 = performance.now();
  console.log(`   -> Filtered count: ${res2.totalCount}`);
  console.log(`   -> Time elapsed: ${(t3 - t2).toFixed(2)} ms\n`);

  // Test 3: Multi-BU Filter pushdown (BU5 & BU8)
  console.log('3. Testing getScopedDeals with Multi-BU Filter (BU5, BU8)...');
  const t4 = performance.now();
  const res3 = await getScopedDeals({
    buFilter: ['BU5', 'BU8'],
    page: 1,
    pageSize: 50,
    userRole: 'admin',
  });
  const t5 = performance.now();
  console.log(`   -> Multi-BU count: ${res3.totalCount}`);
  console.log(`   -> Time elapsed: ${(t5 - t4).toFixed(2)} ms\n`);

  // Test 4: AO Scoped query (AO = "Dan Lemuel Ramos")
  console.log('4. Testing getScopedDeals for AO role (Dan Lemuel Ramos)...');
  const t6 = performance.now();
  const res4 = await getScopedDeals({
    userRole: 'ao',
    accountName: 'Dan Lemuel Ramos',
    domainAccount: 'CORP\\DRAMOS',
    page: 1,
    pageSize: 50,
  });
  const t7 = performance.now();
  console.log(`   -> AO Scoped count: ${res4.totalCount}`);
  console.log(`   -> Time elapsed: ${(t7 - t6).toFixed(2)} ms\n`);

  // Test 5: Dashboard Summary Aggregation
  console.log('5. Testing getDashboardSummary (Consolidated Aggregation)...');
  const t8 = performance.now();
  const res5 = await getDashboardSummary();
  const t9 = performance.now();
  console.log(`   -> Success: ${res5.success}`);
  console.log(`   -> Total: ${res5.data?.totalCount}, Registered: ${res5.data?.totalRegistered}, Expired: ${res5.data?.expiredThisMonth}, Renewed: ${res5.data?.totalRenewed}`);
  console.log(`   -> Brand Groups: ${res5.data?.dealsByBrand.length}, BU Groups: ${res5.data?.dealsByBU.length}`);
  console.log(`   -> Time elapsed: ${(t9 - t8).toFixed(2)} ms\n`);

  console.log('===============================================================');
  console.log(' All Query Performance Tests Finished Successfully!');
  console.log('===============================================================\n');
}

testPerformance().catch(console.error);
