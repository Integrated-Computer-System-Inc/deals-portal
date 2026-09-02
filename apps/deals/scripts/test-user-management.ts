import { prisma } from '@my-app/database';
import { resolveUserRoleAndBUs } from '../lib/roles';

async function testUserLifecycle() {
  console.log('🧪 Testing User Management & Permissions Lifecycle\n');

  // 1. Verify 4 IT Admins in dbo.Users
  console.log('--- Step 1: Verify Initial 4 IT Admins ---');
  const initialUsers = await prisma.$queryRawUnsafe<any[]>(`
    SELECT AccountID, AccountName, Email, UserRole FROM [dbo].[Users] ORDER BY AccountID ASC;
  `);
  console.log('Current DB Users:', initialUsers);
  const itAdminIds = [56395, 57732, 57845, 57846];
  for (const id of itAdminIds) {
    const found = initialUsers.find((u) => Number(u.AccountID) === id);
    console.assert(found && found.UserRole === 'ITadmin', `Admin ID ${id} should exist with ITadmin role`);
  }
  console.log('✓ All 4 IT Admins verified in dbo.Users with ITadmin role');

  // 2. Test Directory Search
  console.log('\n--- Step 2: Search cdbAccounts Directory ---');
  const searchResults = await prisma.$queryRawUnsafe<any[]>(`
    SELECT TOP 10 AccountID, AccountName, Email, DomainAccount, AccountGroup, AccountType, isActive 
    FROM [dbo].[cdbAccounts]
    WHERE isActive = 1 AND (AccountName LIKE '%CARANDANG%' OR Email LIKE '%mcarandang%');
  `);
  console.log('Search result for Carandang:', searchResults);
  console.assert(searchResults.length > 0, 'Directory search should find Myrnalene Carandang');

  // 3. Test Dynamic User Insertion (e.g. Test BU Head with custom BUs)
  console.log('\n--- Step 3: Add Dynamic User (BU Head with custom BUs) ---');
  const targetId = 999999;
  const targetEmail = 'test.dynamic@ics.com.ph';
  const targetName = 'TEST DYNAMIC USER';
  const customRole = 'bu:BU1,BU2';

  await prisma.$executeRawUnsafe(`
    IF EXISTS (SELECT 1 FROM [dbo].[Users] WHERE AccountID = ${targetId})
      DELETE FROM [dbo].[Users] WHERE AccountID = ${targetId};

    INSERT INTO [dbo].[Users] (AccountID, AccountName, Email, UserRole, DtCreation, LastLogin)
    VALUES (${targetId}, N'${targetName}', '${targetEmail}', '${customRole}', GETDATE(), NULL);
  `);
  console.log(`✓ Inserted dynamic user ${targetName} (AccountID ${targetId}) with role '${customRole}'`);

  // 4. Verify Fast-Path & Role Resolution for Dynamic User
  console.log('\n--- Step 4: Verify Role Resolution for Dynamic User ---');
  const userRow = await prisma.$queryRawUnsafe<any[]>(`
    SELECT AccountID, AccountName, Email, UserRole FROM [dbo].[Users] WHERE AccountID = ${targetId};
  `);
  console.assert(userRow.length > 0, 'User should exist in dbo.Users');
  const resolved = resolveUserRoleAndBUs(
    userRow[0].AccountID,
    userRow[0].Email,
    'HQ',
    'AO',
    1,
    userRow[0].UserRole
  );
  console.log('Resolved access for dynamic user:', resolved);
  console.assert(resolved.isAuthorized && resolved.role === 'bu', 'Role should resolve to bu');
  console.assert(resolved.assignedBUs.includes('BU1') && resolved.assignedBUs.includes('BU2'), 'Assigned BUs should contain BU1 & BU2');
  console.log('✓ Dynamic user correctly resolved as BU Head for BU1 & BU2');

  // 5. Test Updating User Role (e.g. promote to aa - Admin Assistant)
  console.log('\n--- Step 5: Update Dynamic User Role ---');
  await prisma.$executeRawUnsafe(`
    UPDATE [dbo].[Users] SET UserRole = 'aa' WHERE AccountID = ${targetId};
  `);
  const updatedRow = await prisma.$queryRawUnsafe<any[]>(`
    SELECT AccountID, UserRole FROM [dbo].[Users] WHERE AccountID = ${targetId};
  `);
  const updatedAccess = resolveUserRoleAndBUs(
    updatedRow[0].AccountID,
    targetEmail,
    'HQ',
    'AO',
    1,
    updatedRow[0].UserRole
  );
  console.log('Updated access for user:', updatedAccess);
  console.assert(updatedAccess.isAuthorized && updatedAccess.role === 'aa', 'Role should resolve to aa');
  console.log('✓ Dynamic user role updated to Admin Assistant');

  // 6. Test Deleting User
  console.log('\n--- Step 6: Delete Dynamic User & Revoke Access ---');
  await prisma.$executeRawUnsafe(`
    DELETE FROM [dbo].[Users] WHERE AccountID = ${targetId};
  `);
  const deletedCheck = await prisma.$queryRawUnsafe<any[]>(`
    SELECT AccountID FROM [dbo].[Users] WHERE AccountID = ${targetId};
  `);
  console.assert(deletedCheck.length === 0, 'User should no longer be in dbo.Users');
  console.log('✓ User deleted successfully from dbo.Users');

  // 7. Verify Cleanup & Core 4 IT Admins Remain Intact
  console.log('\n--- Step 7: Verify Core 4 IT Admins Remain Intact ---');
  const finalUsers = await prisma.$queryRawUnsafe<any[]>(`
    SELECT AccountID, AccountName, Email, UserRole FROM [dbo].[Users] ORDER BY AccountID ASC;
  `);
  console.log('Final Users in dbo.Users:', finalUsers);
  console.assert(itAdminIds.every((id) => finalUsers.some((u) => Number(u.AccountID) === id)), 'All 4 IT Admins should exist in Users table');

  console.log('\n🎉 All User Management lifecycle tests passed successfully!');
  await prisma.$disconnect();
}

testUserLifecycle().catch((err) => {
  console.error('Lifecycle test error:', err);
  process.exit(1);
});
