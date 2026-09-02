import { prisma } from '../packages/database/src/index';

async function testBrandAndBUTagging() {
  console.log('=== Testing PM Brand and BU Tagging in Database ===\n');

  const testPMId = 1528; // ALLYSSA KATHERINE LEGASPI

  // 1. Tag brands
  console.log('1. Tagging brands: DELL, HPI, CISCO');
  await prisma.$executeRawUnsafe(`
    UPDATE [dbo].[Users]
    SET UserRole = 'pm:DELL,HPI,CISCO'
    WHERE AccountID = ${testPMId};
  `);

  const updated1 = await prisma.$queryRawUnsafe<any[]>(`
    SELECT AccountID, AccountName, UserRole FROM [dbo].[Users] WHERE AccountID = ${testPMId};
  `);
  console.log(`   Result: ${updated1[0].AccountName} -> UserRole: '${updated1[0].UserRole}'`);

  if (updated1[0].UserRole === 'pm:DELL,HPI,CISCO') {
    console.log('   ✅ PASS: PM brands successfully updated');
  } else {
    console.error('   ❌ FAIL: PM brands update mismatch');
  }

  // 2. Reset back to 'pm'
  console.log('\n2. Resetting PM role to clean "pm"');
  await prisma.$executeRawUnsafe(`
    UPDATE [dbo].[Users]
    SET UserRole = 'pm'
    WHERE AccountID = ${testPMId};
  `);

  const updated2 = await prisma.$queryRawUnsafe<any[]>(`
    SELECT AccountID, AccountName, UserRole FROM [dbo].[Users] WHERE AccountID = ${testPMId};
  `);
  console.log(`   Result: ${updated2[0].AccountName} -> UserRole: '${updated2[0].UserRole}'`);
  if (updated2[0].UserRole === 'pm') {
    console.log('   ✅ PASS: PM role successfully reset');
  } else {
    console.error('   ❌ FAIL: PM role reset mismatch');
  }

  console.log('\n=== Brand Tagging Integration Test Complete ===\n');
}

testBrandAndBUTagging().catch((e) => {
  console.error(e);
  process.exit(1);
});
