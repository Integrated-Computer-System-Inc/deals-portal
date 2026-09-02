import { prisma } from '../src/index';

async function main() {
  const users = await prisma.$queryRawUnsafe<any[]>(`
    SELECT AccountID, AccountName, Email, UserRole, RememberToken, DtCreation, LastLogin 
    FROM [dbo].[Users];
  `);
  console.log('Current dbo.Users records:');
  console.table(users);
  await prisma.$disconnect();
}

main().catch(console.error);
