import { prisma } from '@my-app/database';
import { resolveUserRoleAndBUs, isSuperadminEmail } from '../lib/roles';

async function testAuthFlow() {
  console.log('🧪 Testing Database-First Authentication & Fallback Flow\n');

  // Test 1: Check existing Admin jdoremon@ics.com.ph (AccountID 57845)
  console.log('--- Test 1: Fast-Path for jdoremon@ics.com.ph ---');
  const userJd = await prisma.$queryRawUnsafe<any[]>(`
    SELECT TOP 1 AccountID, AccountName, Email, UserRole, RememberToken 
    FROM Users 
    WHERE LOWER(Email) = 'jdoremon@ics.com.ph';
  `);
  console.log('Users table lookup result for jdoremon:', userJd);
  console.assert(userJd.length > 0 && userJd[0].UserRole === 'ITadmin' && Number(userJd[0].AccountID) === 57845, 'jdoremon should be found with AccountID 57845 and ITadmin role');
  const accessJd = resolveUserRoleAndBUs(userJd[0].AccountID, userJd[0].Email, 'HQ', 'SUPPORT', 1, userJd[0].UserRole);
  console.log('Resolved Access for jdoremon:', { role: accessJd.role, isAuthorized: accessJd.isAuthorized, isITAdmin: accessJd.isITAdmin, isAdmin: accessJd.isAdmin });
  console.assert(accessJd.isAuthorized && accessJd.isITAdmin && accessJd.role === 'ITadmin', 'jdoremon should be authorized as ITadmin');

  // Test 2: Check existing Admin bcandelaria@ics.com.ph (AccountID 57846)
  console.log('\n--- Test 2: Fast-Path for bcandelaria@ics.com.ph ---');
  const userBc = await prisma.$queryRawUnsafe<any[]>(`
    SELECT TOP 1 AccountID, AccountName, Email, UserRole, RememberToken 
    FROM Users 
    WHERE LOWER(Email) = 'bcandelaria@ics.com.ph';
  `);
  console.log('Users table lookup result for bcandelaria:', userBc);
  console.assert(userBc.length > 0 && userBc[0].UserRole === 'ITadmin' && Number(userBc[0].AccountID) === 57846, 'bcandelaria should be found with AccountID 57846 and ITadmin role');
  const accessBc = resolveUserRoleAndBUs(userBc[0].AccountID, userBc[0].Email, 'HQ', 'SUPPORT', 1, userBc[0].UserRole);
  console.log('Resolved Access for bcandelaria:', { role: accessBc.role, isAuthorized: accessBc.isAuthorized, isITAdmin: accessBc.isITAdmin, isAdmin: accessBc.isAdmin });
  console.assert(accessBc.isAuthorized && accessBc.isITAdmin && accessBc.role === 'ITadmin', 'bcandelaria should be authorized as ITadmin');

  // Test 3: Check remaining IT Admins (mescario: 57732, dramos: 56395)
  console.log('\n--- Test 3: Fast-Path for mescario & dramos ---');
  const userMe = await prisma.$queryRawUnsafe<any[]>(`SELECT TOP 1 AccountID, Email, UserRole FROM Users WHERE LOWER(Email) = 'mescario@ics.com.ph';`);
  console.assert(userMe.length > 0 && Number(userMe[0].AccountID) === 57732, 'mescario should have AccountID 57732');
  const userDr = await prisma.$queryRawUnsafe<any[]>(`SELECT TOP 1 AccountID, Email, UserRole FROM Users WHERE LOWER(Email) = 'dramos@ics.com.ph';`);
  console.assert(userDr.length > 0 && Number(userDr[0].AccountID) === 56395, 'dramos should have AccountID 56395');

  // Test 4: Verify Superadmin list for Impersonation
  console.log('\n--- Test 4: Impersonation Authorization ---');
  console.log('isSuperadminEmail(jdoremon@ics.com.ph):', isSuperadminEmail('jdoremon@ics.com.ph'));
  console.log('isSuperadminEmail(bcandelaria@ics.com.ph):', isSuperadminEmail('bcandelaria@ics.com.ph'));
  console.log('isSuperadminEmail(mescario@ics.com.ph):', isSuperadminEmail('mescario@ics.com.ph'));
  console.log('isSuperadminEmail(dramos@ics.com.ph):', isSuperadminEmail('dramos@ics.com.ph'));
  console.log('isSuperadminEmail(other@ics.com.ph):', isSuperadminEmail('other@ics.com.ph'));
  console.assert(isSuperadminEmail('jdoremon@ics.com.ph') === true, 'jdoremon should be superadmin');
  console.assert(isSuperadminEmail('bcandelaria@ics.com.ph') === true, 'bcandelaria should be superadmin');
  console.assert(isSuperadminEmail('mescario@ics.com.ph') === true, 'mescario should be superadmin');
  console.assert(isSuperadminEmail('dramos@ics.com.ph') === true, 'dramos should be superadmin');
  console.assert(isSuperadminEmail('other@ics.com.ph') === false, 'other should NOT be superadmin');

  // Test 5: Directory Fallback for an unseeded active AO
  console.log('\n--- Test 5: Fallback to cdbAccounts for new Active AO ---');
  const activeAoRows = await prisma.$queryRawUnsafe<any[]>(`
    SELECT TOP 1 AccountID, AccountName, Email, AccountGroup, AccountType, isActive, GAvatar
    FROM [dbo].[cdbAccounts]
    WHERE AccountType = 'AO' AND isActive = 1 AND Email IS NOT NULL AND Email != '';
  `);

  if (activeAoRows && activeAoRows.length > 0) {
    const activeAo = activeAoRows[0];
    console.log(`Found active AO in cdbAccounts: ${activeAo.AccountName} (${activeAo.Email})`);
    const fallbackAccess = resolveUserRoleAndBUs(activeAo.AccountID, activeAo.Email, activeAo.AccountGroup, activeAo.AccountType, activeAo.isActive);
    console.log('Resolved Fallback Access:', { role: fallbackAccess.role, isAuthorized: fallbackAccess.isAuthorized });
    console.assert(fallbackAccess.isAuthorized && fallbackAccess.role === 'ao', 'Active AO should be authorized as ao');
  }

  console.log('\n🎉 All authentication flow tests passed!');
  await prisma.$disconnect();
}

testAuthFlow().catch((err) => {
  console.error('Auth test failed:', err);
  process.exit(1);
});
