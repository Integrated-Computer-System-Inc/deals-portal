import { prisma } from '../src/index';

async function main() {
  try {
    const types: any = await prisma.$queryRawUnsafe(`
      SELECT AccountType, COUNT(*) as count
      FROM cdbAccounts
      GROUP BY AccountType
      ORDER BY count DESC;
    `);
    console.log('AccountType values in cdbAccounts:', types);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
