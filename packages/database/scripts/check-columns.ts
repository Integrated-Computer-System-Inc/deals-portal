import { prisma } from '../src/index';

async function main() {
  try {
    const res = await prisma.$queryRawUnsafe<any[]>(`
      SELECT c.name, t.name AS type_name
      FROM sys.columns c
      JOIN sys.types t ON c.user_type_id = t.user_type_id
      WHERE c.object_id = OBJECT_ID('dbo.DealRenewal')
    `);
    console.log('DealRenewal columns in DB:', res);
  } catch (err) {
    console.error('Check error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
