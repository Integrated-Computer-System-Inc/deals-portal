import { prisma } from '../src/index';

async function main() {
  try {
    const activeStats: any = await prisma.$queryRawUnsafe(`
      SELECT isActive, COUNT(*) as count
      FROM cdbAccounts
      WHERE AccountType = 'AO'
      GROUP BY isActive;
    `);
    console.log('AO isActive stats:', activeStats);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
