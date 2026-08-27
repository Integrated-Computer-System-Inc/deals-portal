import { prisma } from '../src/index';

interface AdminSeed {
  AccountID: number;
  AccountName: string;
  Email: string;
  UserRole: string;
}

const ADMINS_TO_SEED: AdminSeed[] = [
  {
    AccountID: 99999,
    AccountName: 'James Paolo Doremon',
    Email: 'jdoremon@ics.com.ph',
    UserRole: 'admin',
  },
  {
    AccountID: 1,
    AccountName: 'Bharon Christopher Candelaria',
    Email: 'bcandelaria@ics.com.ph',
    UserRole: 'admin',
  },
];

async function main() {
  console.log('🚀 Starting Admin Users Seeding...');

  try {
    for (const admin of ADMINS_TO_SEED) {
      console.log(`\nProcessing admin: ${admin.AccountName} (${admin.Email}) with AccountID: ${admin.AccountID}`);

      await prisma.$executeRawUnsafe(`
        IF EXISTS (SELECT 1 FROM Users WHERE AccountID = ${admin.AccountID})
        BEGIN
          UPDATE Users 
          SET AccountName = N'${admin.AccountName.replace(/'/g, "''")}',
              Email = '${admin.Email.toLowerCase().replace(/'/g, "''")}',
              UserRole = '${admin.UserRole}',
              LastLogin = ISNULL(LastLogin, GETDATE())
          WHERE AccountID = ${admin.AccountID};
          PRINT 'Updated existing AccountID ${admin.AccountID}';
        END
        ELSE IF EXISTS (SELECT 1 FROM Users WHERE LOWER(Email) = '${admin.Email.toLowerCase().replace(/'/g, "''")}')
        BEGIN
          UPDATE Users 
          SET AccountID = ${admin.AccountID},
              AccountName = N'${admin.AccountName.replace(/'/g, "''")}',
              UserRole = '${admin.UserRole}',
              LastLogin = ISNULL(LastLogin, GETDATE())
          WHERE LOWER(Email) = '${admin.Email.toLowerCase().replace(/'/g, "''")}';
          PRINT 'Updated existing Email ${admin.Email} with AccountID ${admin.AccountID}';
        END
        ELSE
        BEGIN
          INSERT INTO Users (AccountID, AccountName, Email, UserRole, DtCreation, LastLogin)
          VALUES (${admin.AccountID}, N'${admin.AccountName.replace(/'/g, "''")}', '${admin.Email.toLowerCase().replace(/'/g, "''")}', '${admin.UserRole}', GETDATE(), GETDATE());
          PRINT 'Inserted new admin ${admin.Email}';
        END
      `);
      console.log(`✓ Admin ${admin.Email} successfully configured.`);
    }

    console.log('\n📊 Current Users in dbo.Users table:');
    const users = await prisma.$queryRawUnsafe<any[]>(`
      SELECT AccountID, AccountName, Email, UserRole, LastLogin, DtCreation 
      FROM Users 
      ORDER BY AccountID ASC;
    `);

    console.table(users);
    console.log('\n✅ Admin seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during admin seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
