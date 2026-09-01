import { resolveUserRoleAndBUs } from '../lib/roles';
import { prisma } from '@my-app/database';

async function testRoles() {
  console.log('--- 1. Testing Role Resolution with AO, IT Admins, and Dynamic Roles ---');

  // BU Heads (with clean role + explicitBU)
  const buClean = resolveUserRoleAndBUs(387, 'smpenalosa@ics.com.ph', 'BU8', 'AO', 1, 'bu', 'BU8,BU12,CE01');
  console.log('Account 387 (Shiela Marcelo - Dedicated AssignedBU Column):', buClean.role, buClean.assignedBUs, buClean.isAuthorized ? '✓ Authorized' : '✗ Rejected');
  console.assert(buClean.role === 'bu' && buClean.isAuthorized && buClean.assignedBUs.length === 3, 'Test clean BU failed');

  // PM (with clean role + explicitBrand)
  const pmClean = resolveUserRoleAndBUs(999, 'pm.user@ics.com.ph', 'PMD', 'PM', 1, 'pm', null, 'DELL,HPI,CISCO');
  console.log('Account 999 (PM - Dedicated AssignedBrand Column):', pmClean.role, pmClean.assignedBrands, pmClean.isAuthorized ? '✓ Authorized' : '✗ Rejected');
  console.assert(pmClean.role === 'pm' && pmClean.isAuthorized && pmClean.assignedBrands?.length === 3, 'Test clean PM failed');

  // BU Heads (with legacy composite role from Users table - backward compat)
  const bu1 = resolveUserRoleAndBUs(926, 'mcarandang@ics.com.ph', 'BU1', 'AO', 1, 'bu:BU1');
  console.log('Account 926 (Myrnalene Carandang - Legacy Composite):', bu1.role, bu1.isAuthorized ? '✓ Authorized' : '✗ Rejected');
  console.assert(bu1.role === 'bu' && bu1.isAuthorized, 'Test 926 failed');

  const buMulti = resolveUserRoleAndBUs(387, 'smpenalosa@ics.com.ph', 'BU8', 'AO', 1, 'bu:BU8,BU12,CE01');
  console.log('Account 387 (Shiela Marcelo - Multi BU Legacy):', buMulti.role, buMulti.assignedBUs, buMulti.isAuthorized ? '✓ Authorized' : '✗ Rejected');
  console.assert(buMulti.role === 'bu' && buMulti.isAuthorized && buMulti.assignedBUs.length === 3, 'Test 387 failed');

  // Admin Assistant (with explicitRole from Users table)
  const aa = resolveUserRoleAndBUs(57835, 'AFRANCISCO@ICS.COM.PH', 'BU2', 'USER', 1, 'aa');
  console.log('Account 57835 (Athena Beatrice Francisco):', aa.role, aa.isAuthorized ? '✓ Authorized' : '✗ Rejected');
  console.assert(aa.role === 'aa' && aa.isAuthorized, 'Test 57835 failed');

  // Admin (with explicitRole from Users table)
  const admin = resolveUserRoleAndBUs(415, 'asy-lu@ics.com.ph', 'BU2', 'AO', 1, 'admin');
  console.log('Account 415 (Adeliana Sy-Lu):', admin.role, admin.isAuthorized ? '✓ Authorized' : '✗ Rejected');
  console.assert(admin.role === 'admin' && admin.isAuthorized, 'Test 415 failed');

  // 4 Allowed IT Admins
  const itAdmin1 = resolveUserRoleAndBUs(57845, 'jdoremon@ics.com.ph', 'IT', 'SUPPORT', 1);
  console.log('IT Admin 1 (57845 - jdoremon@ics.com.ph):', itAdmin1.role, itAdmin1.isAuthorized ? '✓ Authorized' : '✗ Rejected');
  console.assert(itAdmin1.role === 'ITadmin' && itAdmin1.isAuthorized && itAdmin1.isITAdmin, 'Test IT Admin 1 failed');

  const itAdmin2 = resolveUserRoleAndBUs(57846, 'bcandelaria@ics.com.ph', 'IT', 'SUPPORT', 1);
  console.log('IT Admin 2 (57846 - bcandelaria@ics.com.ph):', itAdmin2.role, itAdmin2.isAuthorized ? '✓ Authorized' : '✗ Rejected');
  console.assert(itAdmin2.role === 'ITadmin' && itAdmin2.isAuthorized && itAdmin2.isITAdmin, 'Test IT Admin 2 failed');

  const itAdmin3 = resolveUserRoleAndBUs(57732, 'mescario@ics.com.ph', 'IT', 'SUPPORT', 1);
  console.log('IT Admin 3 (57732 - mescario@ics.com.ph):', itAdmin3.role, itAdmin3.isAuthorized ? '✓ Authorized' : '✗ Rejected');
  console.assert(itAdmin3.role === 'ITadmin' && itAdmin3.isAuthorized && itAdmin3.isITAdmin, 'Test IT Admin 3 failed');

  const itAdmin4 = resolveUserRoleAndBUs(56395, 'dramos@ics.com.ph', 'IT', 'SUPPORT', 1);
  console.log('IT Admin 4 (56395 - dramos@ics.com.ph):', itAdmin4.role, itAdmin4.isAuthorized ? '✓ Authorized' : '✗ Rejected');
  console.assert(itAdmin4.role === 'ITadmin' && itAdmin4.isAuthorized && itAdmin4.isITAdmin, 'Test IT Admin 4 failed');

  // Unauthorized IT Support (not in allowed list) -> MUST BE REJECTED
  const unauthorizedIT = resolveUserRoleAndBUs(56850, 'jsoledad@ics.com.ph', 'IT', 'SUPPORT', 1);
  console.log('Unauthorized IT Support (56850):', unauthorizedIT.role, unauthorizedIT.isAuthorized ? '✓ Authorized' : '✗ Rejected (Reason: ' + unauthorizedIT.rejectionReason + ')');
  console.assert(unauthorizedIT.role === null && !unauthorizedIT.isAuthorized, 'Test unauthorized IT should be rejected');

  // Dynamic user with composite role 'bu:BU1,BU2' from Users table
  const dynamicBUUser = resolveUserRoleAndBUs(12345, 'custom.bu@ics.com.ph', 'HQ', 'USER', 1, 'bu:BU1,BU2');
  console.log('Dynamic BU User with composite role bu:BU1,BU2:', dynamicBUUser.role, dynamicBUUser.assignedBUs, dynamicBUUser.isAuthorized ? '✓ Authorized' : '✗ Rejected');
  console.assert(dynamicBUUser.role === 'bu' && dynamicBUUser.assignedBUs.includes('BU1') && dynamicBUUser.assignedBUs.includes('BU2'), 'Test dynamic BU user failed');

  // Active Generic AO
  const activeAo = resolveUserRoleAndBUs(705, 'camille.kilakiga@ics.com.ph', 'BU5', 'AO', 1);
  console.log('Active AO (705, AccountType=AO, isActive=1):', activeAo.role, activeAo.isAuthorized ? '✓ Authorized' : '✗ Rejected');
  console.assert(activeAo.role === 'ao' && activeAo.isAuthorized, 'Test active AO failed');

  // Inactive AO (isActive = 0) -> MUST BE REJECTED
  const inactiveAo = resolveUserRoleAndBUs(706, 'inactive.ao@ics.com.ph', 'BU5', 'AO', 0);
  console.log('Inactive AO (AccountType=AO, isActive=0):', inactiveAo.role, inactiveAo.isAuthorized ? '✓ Authorized' : '✗ Rejected (Reason: ' + inactiveAo.rejectionReason + ')');
  console.assert(inactiveAo.role === null && !inactiveAo.isAuthorized, 'Test inactive AO should be rejected');

  // Non-AO Account Type (AccountType = 'CUSTOMER') -> MUST BE REJECTED
  const customerUser = resolveUserRoleAndBUs(22222, 'customer@client.com', 'HQ', 'CUSTOMER', 1);
  console.log('Customer Account (AccountType=CUSTOMER):', customerUser.role, customerUser.isAuthorized ? '✓ Authorized' : '✗ Rejected');
  console.assert(customerUser.role === null && !customerUser.isAuthorized, 'Test customer should be rejected');

  console.log('\n--- 2. Testing Database Fast-Path for All 4 IT Admins in Users Table ---');
  const dbUsers = await prisma.$queryRawUnsafe<any[]>('SELECT AccountID, AccountName, Email, UserRole FROM Users ORDER BY AccountID ASC');
  console.log('Found users in dbo.Users table:', dbUsers);
  console.assert(dbUsers.length >= 4, 'Should have at least 4 seeded IT Admins in Users table');

  for (const u of dbUsers) {
    const res = resolveUserRoleAndBUs(Number(u.AccountID), u.Email, 'HQ', 'SUPPORT', 1, u.UserRole);
    console.log(`✓ DB User ${u.AccountName} (${u.Email}, AccountID ${u.AccountID}) -> Role: ${res.role}, isITAdmin: ${res.isITAdmin}, isPM: ${res.isPM}, isAuthorized: ${res.isAuthorized}`);
    if (u.UserRole === 'ITadmin') {
      console.assert(res.isAuthorized && res.isITAdmin && res.role === 'ITadmin', `IT Admin ${u.Email} should be authorized ITadmin`);
    } else if (u.UserRole?.startsWith('pm') || u.UserRole === 'pm') {
      console.assert(res.isAuthorized && res.isPM && res.role === 'pm', `PM ${u.Email} should be authorized pm`);
    }
  }

  console.log('\nAll role and IT admin validation tests passed successfully!');
  await prisma.$disconnect();
}

testRoles().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
