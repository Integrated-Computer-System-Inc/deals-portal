import { resolveUserRoleAndBUs, buildPMScopingConditions, isDealAccessibleByUser } from '../apps/deals/lib/roles';
import { getBrandVariations } from '../apps/deals/lib/brandUtils';
import { prisma } from '../packages/database/src/index';

async function runTests() {
  console.log('=== Starting PM Role & Scoping Test Suite ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  }

  // 1. Test resolveUserRoleAndBUs for explicit PM role without brands
  const res1 = resolveUserRoleAndBUs(1528, 'alegaspi@ics.com.ph', 'PMD', 'PM', 1, 'pm');
  assert(res1.role === 'pm', 'res1 role is pm');
  assert(res1.isPM === true, 'res1 isPM is true');
  assert(res1.isAdmin === false, 'res1 isAdmin is false');
  assert(res1.isAuthorized === true, 'res1 isAuthorized is true');
  assert(Array.isArray(res1.assignedBrands) && res1.assignedBrands.length === 0, 'res1 assignedBrands is empty array');

  // 2. Test resolveUserRoleAndBUs for composite PM role 'pm:DELL,HPI,MICROSOFT'
  const res2 = resolveUserRoleAndBUs(1528, 'alegaspi@ics.com.ph', 'PMD', 'PM', 1, 'pm:DELL,HPI,MICROSOFT');
  assert(res2.role === 'pm', 'res2 role is pm');
  assert(res2.isPM === true, 'res2 isPM is true');
  assert(
    res2.assignedBrands?.includes('DELL') &&
    res2.assignedBrands?.includes('HPI') &&
    res2.assignedBrands?.includes('MICROSOFT'),
    'res2 correctly parses assignedBrands from composite role'
  );

  // 3. Test resolveUserRoleAndBUs fallback for active PMD/PM in cdbAccounts
  const res3 = resolveUserRoleAndBUs(55842, 'jesller@ics.com.ph', 'PMD', 'PM', 1, null);
  assert(res3.role === 'pm', 'res3 fallback resolves role as pm');
  assert(res3.isPM === true, 'res3 isPM is true');
  assert(res3.isAuthorized === true, 'res3 isAuthorized is true');

  // 4. Test buildPMScopingConditions
  const pmConditions = buildPMScopingConditions(['DELL', 'HPI']);
  assert(pmConditions.length > 0, 'buildPMScopingConditions returns conditions');
  assert(pmConditions[0].OR !== undefined, 'pmConditions contains OR array');

  const emptyConditions = buildPMScopingConditions([]);
  assert(emptyConditions[0].dealID === -1, 'empty brands returns impossible condition { dealID: -1 }');

  // 5. Test isDealAccessibleByUser for PM
  const pmUserWithDell = {
    role: 'pm',
    assignedBrands: ['DELL', 'HP POLY'],
  };

  const dellDeal = { dealID: 100, brand: 'Dell Technologies', BU: 'BU1' };
  const polyDeal = { dealID: 101, brand: 'POLY', BU: 'BU2' };
  const ciscoDeal = { dealID: 102, brand: 'CISCO', BU: 'BU1' };

  assert(isDealAccessibleByUser(dellDeal as any, pmUserWithDell as any) === true, 'PM can access Dell deal (via variation)');
  assert(isDealAccessibleByUser(polyDeal as any, pmUserWithDell as any) === true, 'PM can access HP Poly deal (via variation)');
  assert(isDealAccessibleByUser(ciscoDeal as any, pmUserWithDell as any) === false, 'PM cannot access Cisco deal');

  // 6. Check pre-seeded PM users in DB
  console.log('\n--- Checking dbo.Users for seeded PM accounts ---');
  const dbUsers = await prisma.$queryRawUnsafe<any[]>(`
    SELECT AccountID, AccountName, Email, UserRole FROM [dbo].[Users] WHERE UserRole LIKE 'pm%' ORDER BY AccountName;
  `);

  assert(dbUsers.length >= 10, `Found ${dbUsers.length} PM accounts registered in dbo.Users (expected >= 10)`);
  for (const u of dbUsers) {
    console.log(`   - [AccountID: ${u.AccountID}] ${u.AccountName} (${u.Email}) -> UserRole: '${u.UserRole}'`);
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
