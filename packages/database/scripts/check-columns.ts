import { prisma } from '../src/index';

async function main() {
  try {
    const dbInfo = await prisma.$queryRawUnsafe<any[]>(`
      SELECT DB_NAME() as db, CURRENT_USER as usr, USER_NAME() as db_usr, SUSER_SNAME() as suser;
    `);
    console.log('DB Connection info:', dbInfo);

    const tables = await prisma.$queryRawUnsafe<any[]>(`
      SELECT TABLE_CATALOG, TABLE_SCHEMA, TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'Users';
    `);
    console.log('Users table location:', tables);

    const res = await prisma.$queryRawUnsafe<any[]>(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Users';
    `);
    console.log('Users columns in DB:', res);
  } catch (err) {
    console.error('Check error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
