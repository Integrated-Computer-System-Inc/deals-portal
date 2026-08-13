import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating UsersTable if it does not exist...');
  
  await prisma.$executeRawUnsafe(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='UsersTable' and xtype='U')
    CREATE TABLE UsersTable (
        AccountID VARCHAR(100) PRIMARY KEY,
        AccountName VARCHAR(255) NOT NULL,
        Email VARCHAR(255) UNIQUE NOT NULL,
        UserRole VARCHAR(50) NULL,
        RememberToken VARCHAR(MAX) NULL,
        DateTimeCreation DATETIME DEFAULT GETDATE() NOT NULL
    );
  `);
  
  console.log('UsersTable created or already exists.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
