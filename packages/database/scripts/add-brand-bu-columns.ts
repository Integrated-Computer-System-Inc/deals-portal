import { prisma } from '../src/index';

async function main() {
  console.log('🚀 Running database schema update for dbo.Users...');

  try {
    // 1. Add AssignedBrands and AssignedBUs columns using dynamic SQL
    await prisma.$executeRawUnsafe(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.columns 
        WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND name = 'AssignedBrands'
      )
      BEGIN
        EXEC('ALTER TABLE [dbo].[Users] ADD [AssignedBrands] VARCHAR(MAX) NULL');
      END;

      IF NOT EXISTS (
        SELECT 1 FROM sys.columns 
        WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND name = 'AssignedBUs'
      )
      BEGIN
        EXEC('ALTER TABLE [dbo].[Users] ADD [AssignedBUs] VARCHAR(MAX) NULL');
      END;
    `);
    console.log('✓ Columns [AssignedBrands] and [AssignedBUs] checked/added in [dbo].[Users].');

    // 2. Fetch all active PM accounts from cdbAccounts
    console.log('\n🔍 Fetching active PM accounts from cdbAccounts (AccountGroup=PMD, AccountType=PM)...');
    const pms = await prisma.cdbAccounts.findMany({
      where: {
        AccountGroup: 'PMD',
        AccountType: { startsWith: 'PM' },
        isActive: 1,
      },
      select: {
        AccountID: true,
        AccountName: true,
        Email: true,
        DomainAccount: true,
        AccountGroup: true,
        AccountType: true,
        isActive: true,
      },
    });

    console.log(`Found ${pms.length} active PM accounts in corporate directory.`);

    // 3. Upsert each PM account into dbo.Users with role 'pm'
    for (const pm of pms) {
      const email = pm.Email ? pm.Email.trim().toLowerCase() : '';
      if (!email) continue;
      const name = pm.AccountName ? pm.AccountName.trim() : 'Product Manager';

      await prisma.$executeRawUnsafe(`
        IF EXISTS (SELECT 1 FROM [dbo].[Users] WHERE AccountID = ${pm.AccountID})
        BEGIN
          UPDATE [dbo].[Users]
          SET AccountName = N'${name.replace(/'/g, "''")}',
              Email = '${email.replace(/'/g, "''")}',
              UserRole = 'pm',
              LastLogin = ISNULL(LastLogin, GETDATE())
          WHERE AccountID = ${pm.AccountID};
        END
        ELSE IF EXISTS (SELECT 1 FROM [dbo].[Users] WHERE LOWER(Email) = '${email.replace(/'/g, "''")}')
        BEGIN
          UPDATE [dbo].[Users]
          SET AccountID = ${pm.AccountID},
              AccountName = N'${name.replace(/'/g, "''")}',
              UserRole = 'pm',
              LastLogin = ISNULL(LastLogin, GETDATE())
          WHERE LOWER(Email) = '${email.replace(/'/g, "''")}';
        END
        ELSE
        BEGIN
          INSERT INTO [dbo].[Users] (AccountID, AccountName, Email, UserRole, AssignedBrands, AssignedBUs, DtCreation, LastLogin)
          VALUES (${pm.AccountID}, N'${name.replace(/'/g, "''")}', '${email.replace(/'/g, "''")}', 'pm', NULL, NULL, GETDATE(), NULL);
        END
      `);
      console.log(`✓ Pre-seeded PM: ${name} (${email}) - AccountID: ${pm.AccountID}`);
    }

    console.log('\n📊 Current Users in dbo.Users table:');
    const users = await prisma.$queryRawUnsafe<any[]>(`
      SELECT AccountID, AccountName, Email, UserRole, AssignedBrands, AssignedBUs, LastLogin, DtCreation 
      FROM [dbo].[Users] 
      ORDER BY UserRole ASC, AccountName ASC;
    `);

    console.table(users);
    console.log('\n✅ Database schema migration and PM seeding completed successfully!');
  } catch (err) {
    console.error('❌ Error during schema migration:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
