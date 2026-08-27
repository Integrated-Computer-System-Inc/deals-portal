import { resolveUserRoleAndBUs } from '../lib/roles';
import { prisma } from '@my-app/database';

async function testRoles() {
  console.log('--- 1. Testing Role Resolution with AO & Active Checks ---');

  // BU Heads (in registry)
  const bu1 = resolveUserRoleAndBUs(926, 'mcarandang@ics.com.ph', 'BU1', 'AO', 1);
  console.log('Account 926 (Myrnalene Carandang):', bu1.role, bu1.isAuthorized ? '✓ Authorized' : '✗ Rejected');
  console.assert(bu1.role === 'bu' && bu1.isAuthorized, 'Test 926 failed');

  const buMulti = resolveUserRoleAndBUs(387, 'smpenalosa@ics.com.ph', 'BU8', 'AO', 1);
  console.log('Account 387 (Shiela Marcelo - Multi BU):', buMulti.role, buMulti.assignedBUs, buMulti.isAuthorized ? '✓ Authorized' : '✗ Rejected');
  console.assert(buMulti.role === 'bu' && buMulti.isAuthorized && buMulti.assignedBUs.length === 3, 'Test 387 failed');

  // Admin Assistant (in registry, AccountType in cdbAccounts is 'USER')
  const aa = resolveUserRoleAndBUs(57835, 'AFRANCISCO@ICS.COM.PH', 'BU2', 'USER', 1);
  console.log('Account 57835 (Athena Beatrice Francisco):', aa.role, aa.isAuthorized ? '✓ Authorized' : '✗ Rejected');
  console.assert(aa.role === 'aa' && aa.isAuthorized, 'Test 57835 failed');

  // Admin (in registry)
  const admin = resolveUserRoleAndBUs(415, 'asy-lu@ics.com.ph', 'BU2', 'AO', 1);
  console.log('Account 415 (Adeliana Sy-Lu):', admin.role, admin.isAuthorized ? '✓ Authorized' : '✗ Rejected');
  console.assert(admin.role === 'admin' && admin.isAuthorized, 'Test 415 failed');

  // IT Admin overrides
  const itAdmin1 = resolveUserRoleAndBUs(99999, 'jdoremon@ics.com.ph', 'HQ', 'USER', 1);
  console.log('IT Admin 1 (jdoremon@ics.com.ph):', itAdmin1.role, itAdmin1.isAuthorized ? '✓ Authorized' : '✗ Rejected');
  console.assert(itAdmin1.role === 'admin' && itAdmin1.isAuthorized, 'Test IT Admin 1 failed');

  const itAdmin2 = resolveUserRoleAndBUs(1, 'bcandelaria@ics.com.ph', 'HQ', 'USER', 1);
  console.log('IT Admin 2 (bcandelaria@ics.com.ph):', itAdmin2.role, itAdmin2.isAuthorized ? '✓ Authorized' : '✗ Rejected');
  console.assert(itAdmin2.role === 'admin' && itAdmin2.isAuthorized, 'Test IT Admin 2 failed');

  // Active Generic AO
  const activeAo = resolveUserRoleAndBUs(705, 'camille.kilakiga@ics.com.ph', 'BU5', 'AO', 1);
  console.log('Active AO (705, AccountType=AO, isActive=1):', activeAo.role, activeAo.isAuthorized ? '✓ Authorized' : '✗ Rejected');
  console.assert(activeAo.role === 'ao' && activeAo.isAuthorized, 'Test active AO failed');

  // Inactive AO (isActive = 0) -> MUST BE REJECTED
  const inactiveAo = resolveUserRoleAndBUs(706, 'inactive.ao@ics.com.ph', 'BU5', 'AO', 0);
  console.log('Inactive AO (AccountType=AO, isActive=0):', inactiveAo.role, inactiveAo.isAuthorized ? '✓ Authorized' : '✗ Rejected (Reason: ' + inactiveAo.rejectionReason + ')');
  console.assert(inactiveAo.role === null && !inactiveAo.isAuthorized, 'Test inactive AO should be rejected');

  // Non-AO Account Type (AccountType = 'USER', not in registry) -> MUST BE REJECTED
  const nonAoUser = resolveUserRoleAndBUs(12345, 'generic.user@ics.com.ph', 'BU5', 'USER', 1);
  console.log('Non-AO User (AccountType=USER, not in registry):', nonAoUser.role, nonAoUser.isAuthorized ? '✓ Authorized' : '✗ Rejected (Reason: ' + nonAoUser.rejectionReason + ')');
  console.assert(nonAoUser.role === null && !nonAoUser.isAuthorized, 'Test non-AO user should be rejected');

  // Non-AO Account Type (AccountType = 'CUSTOMER') -> MUST BE REJECTED
  const customerUser = resolveUserRoleAndBUs(22222, 'customer@client.com', 'HQ', 'CUSTOMER', 1);
  console.log('Customer Account (AccountType=CUSTOMER):', customerUser.role, customerUser.isAuthorized ? '✓ Authorized' : '✗ Rejected');
  console.assert(customerUser.role === null && !customerUser.isAuthorized, 'Test customer should be rejected');

  console.log('\n--- 2. Testing Real Database Accounts ---');
  // Query 1 Active AO, 1 Inactive AO, 1 Non-AO USER
  const sampleActiveAo = await prisma.cdbAccounts.findFirst({
    where: { AccountType: 'AO', isActive: 1 },
  });
  if (sampleActiveAo) {
    const res = resolveUserRoleAndBUs(sampleActiveAo.AccountID, sampleActiveAo.Email, sampleActiveAo.AccountGroup, sampleActiveAo.AccountType, sampleActiveAo.isActive);
    console.log(`✓ Active AO in DB: ${sampleActiveAo.AccountName} (${sampleActiveAo.Email}) -> Role: ${res.role}, Authorized: ${res.isAuthorized}`);
    console.assert(res.isAuthorized && res.role === 'ao', 'Active AO in DB test failed');
  }

  const sampleInactiveAo = await prisma.cdbAccounts.findFirst({
    where: { AccountType: 'AO', isActive: 0 },
  });
  if (sampleInactiveAo) {
    const res = resolveUserRoleAndBUs(sampleInactiveAo.AccountID, sampleInactiveAo.Email, sampleInactiveAo.AccountGroup, sampleInactiveAo.AccountType, sampleInactiveAo.isActive);
    console.log(`✓ Inactive AO in DB: ${sampleInactiveAo.AccountName} (${sampleInactiveAo.Email}) -> Role: ${res.role}, Authorized: ${res.isAuthorized} (Expected: Rejected)`);
    console.assert(!res.isAuthorized, 'Inactive AO in DB test failed');
  }

  const sampleGenericUser = await prisma.cdbAccounts.findFirst({
    where: {
      AccountType: 'USER',
      AccountID: { notIn: [57835, 415, 926, 205, 856, 387, 310] },
      isActive: 1,
    },
  });
  if (sampleGenericUser) {
    const res = resolveUserRoleAndBUs(sampleGenericUser.AccountID, sampleGenericUser.Email, sampleGenericUser.AccountGroup, sampleGenericUser.AccountType, sampleGenericUser.isActive);
    console.log(`✓ Non-AO USER in DB: ${sampleGenericUser.AccountName} (${sampleGenericUser.Email}) -> Role: ${res.role}, Authorized: ${res.isAuthorized} (Expected: Rejected)`);
    console.assert(!res.isAuthorized, 'Non-AO USER in DB test failed');
  }

  console.log('\nAll AO validation tests passed successfully!');
  await prisma.$disconnect();
}

testRoles().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
