import { prisma } from '../src/index';

async function main() {
  try {
    const columns: any = await prisma.$queryRawUnsafe(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'cdbAccounts'
      ORDER BY ORDINAL_POSITION;
    `);
    console.log('cdbAccounts columns:', columns);

    // Also check sample accounts for the specific AccountIDs provided by the user
    const ids = [926, 205, 856, 387, 310, 57835, 415];
    const sampleAccounts = await prisma.cdbAccounts.findMany({
      where: {
        AccountID: { in: ids },
      },
    });
    console.log('Found specific accounts:', sampleAccounts);
  } catch (err) {
    console.error('Error inspecting cdbAccounts:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
