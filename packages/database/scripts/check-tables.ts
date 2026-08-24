import { prisma } from '../src/index';

async function main() {
  try {
    const tables: any = await prisma.$queryRawUnsafe(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME;
    `);
    console.log('Existing tables in database:', tables);
  } catch (err) {
    console.error('Error checking tables:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
