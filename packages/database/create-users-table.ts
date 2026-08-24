import { prisma } from './src/index';

async function main() {
  console.log('Creating Users table if it does not exist...');
  
  await prisma.$executeRawUnsafe(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' and xtype='U')
    CREATE TABLE Users (
        AccountID INT PRIMARY KEY,
        AccountName NVARCHAR(600) NOT NULL,
        Email VARCHAR(255) UNIQUE NOT NULL,
        UserRole VARCHAR(50) NOT NULL,
        RememberToken VARCHAR(MAX) NULL,
        DtCreation DATETIME DEFAULT GETDATE() NOT NULL,
        LastLogin DATETIME NULL
    );
  `);
  
  console.log('Users table created or already exists.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
