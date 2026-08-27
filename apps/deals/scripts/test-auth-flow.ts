import { prisma } from '@my-app/database';
import { resolveUserRoleAndBUs, isSuperadminEmail } from '../lib/roles';
import { randomUUID } from 'crypto';

async function testAuthFlow() {
  console.log('🧪 Testing Database-First Authentication & Fallback Flow\n');

  // Test 1: Check existing Admin jdoremon@ics.com.ph
  console.log('--- Test 1: Fast-Path for jdoremon@ics.com.ph ---');
  const userJd = await prisma.$queryRawUnsafe<any[]>(`
    SELECT TOP 1 AccountID, AccountName, Email, UserRole, RememberToken 
    FROM Users 
    WHERE LOWER(Email) = 'jdoremon@ics.com.ph';
  `);
  console.log('Users table lookup result for jdoremon:', userJd);
  console.assert(userJd.length > 0 && userJd[0].UserRole === 'admin', 'jdoremon should be found with admin role');
  const accessJd = resolveUserRoleAndBUs(userJd[0].AccountID, userJd[0].Email, 'HQ', 'AO', 1, userJd[0].UserRole);
  console.log('Resolved Access for jdoremon:', { role: accessJd.role, isAuthorized: accessJd.isAuthorized, isAdmin: accessJd.isAdmin });
  console.assert(accessJd.isAuthorized && accessJd.isAdmin, 'jdoremon should be authorized as admin');

  // Test 2: Check existing Admin bcandelaria@ics.com.ph
  console.log('\n--- Test 2: Fast-Path for bcandelaria@ics.com.ph ---');
  const userBc = await prisma.$queryRawUnsafe<any[]>(`
    SELECT TOP 1 AccountID, AccountName, Email, UserRole, RememberToken 
    FROM Users 
    WHERE LOWER(Email) = 'bcandelaria@ics.com.ph';
  `);
  console.log('Users table lookup result for bcandelaria:', userBc);
  console.assert(userBc.length > 0 && userBc[0].UserRole === 'admin' && Number(userBc[0].AccountID) === 1, 'bcandelaria should be found with AccountID 1 and admin role');
  const accessBc = resolveUserRoleAndBUs(userBc[0].AccountID, userBc[0].Email, 'HQ', 'AO', 1, userBc[0].UserRole);
  console.log('Resolved Access for bcandelaria:', { role: accessBc.role, isAuthorized: accessBc.isAuthorized, isAdmin: accessBc.isAdmin });
  console.assert(accessBc.isAuthorized && accessBc.isAdmin, 'bcandelaria should be authorized as admin');

  // Test 3: Verify Superadmin list for Impersonation
  console.log('\n--- Test 3: Impersonation Authorization ---');
  console.log('isSuperadminEmail(jdoremon@ics.com.ph):', isSuperadminEmail('jdoremon@ics.com.ph'));
  console.log('isSuperadminEmail(bcandelaria@ics.com.ph):', isSuperadminEmail('bcandelaria@ics.com.ph'));
  console.log('isSuperadminEmail(other@ics.com.ph):', isSuperadminEmail('other@ics.com.ph'));
  console.assert(isSuperadminEmail('jdoremon@ics.com.ph') === true, 'jdoremon should be superadmin');
  console.assert(isSuperadminEmail('bcandelaria@ics.com.ph') === true, 'bcandelaria should be superadmin');
  console.assert(isSuperadminEmail('other@ics.com.ph') === false, 'other should NOT be superadmin');

  // Test 4: Directory Fallback for an unseeded active AO
  console.log('\n--- Test 4: Fallback to cdbAccounts for new Active AO ---');
  const activeAo = await prisma.cdbAccounts.findFirst({
    where: {
      AccountType: 'AO',
      isActive: 1,
      Email: { not: '' },
    },
    select: {
      AccountID: true,
      AccountName: true,
      Email: true,
      AccountGroup: true,
      AccountType: true,
      isActive: true,
    },
  });

  if (activeAo) {
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
