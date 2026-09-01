import { prisma } from '../src/index';

async function main() {
  const info = await prisma.$queryRawUnsafe<any[]>(`
    SELECT DB_NAME() as db_name, USER_NAME() as user_name, SUSER_SNAME() as login_name;
  `);
  console.log('DB Info:', info);
  await prisma.$disconnect();
}

main().catch(console.error);
