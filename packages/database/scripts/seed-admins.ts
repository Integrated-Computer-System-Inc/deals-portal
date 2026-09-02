import { prisma } from '../src/index';

interface PortalUserSeed {
  AccountID: number;
  AccountName: string;
  Email: string;
  UserRole: string;
  Category: 'ITadmin' | 'admin' | 'aa' | 'bu';
}

const CORE_USERS_TO_SEED: PortalUserSeed[] = [
  // 1. IT Administrators (Superadmins)
  {
    AccountID: 57845,
    AccountName: 'JAMES PAOLO DOREMON',
    Email: 'jdoremon@ics.com.ph',
    UserRole: 'ITadmin',
    Category: 'ITadmin',
  },
  {
    AccountID: 57846,
    AccountName: 'BHARON CHRISTOPHER CANDELARIA',
    Email: 'bcandelaria@ics.com.ph',
    UserRole: 'ITadmin',
    Category: 'ITadmin',
  },
  {
    AccountID: 57732,
    AccountName: 'MARK EDO ESCARIO',
    Email: 'mescario@ics.com.ph',
    UserRole: 'ITadmin',
    Category: 'ITadmin',
  },
  {
    AccountID: 56395,
    AccountName: 'DAN LEMUEL RAMOS',
    Email: 'dramos@ics.com.ph',
    UserRole: 'ITadmin',
    Category: 'ITadmin',
  },

  // 2. Sales Administrator
  {
    AccountID: 415,
    AccountName: 'ADELIANA SY-LU',
    Email: 'asy-lu@ics.com.ph',
    UserRole: 'admin',
    Category: 'admin',
  },

  // 3. Admin Assistant
  {
    AccountID: 57835,
    AccountName: 'ATHENA BEATRICE FRANCISCO',
    Email: 'AFRANCISCO@ICS.COM.PH',
    UserRole: 'aa',
    Category: 'aa',
  },

  // 4. BU Heads
  {
    AccountID: 926,
    AccountName: 'MYRNALENE CARANDANG',
    Email: 'mcarandang@ics.com.ph',
    UserRole: 'bu:BU1',
    Category: 'bu',
  },
  {
    AccountID: 205,
    AccountName: 'ROSETTE DE GUZMAN',
    Email: 'rdeguzman@ics.com.ph',
    UserRole: 'bu:BU2',
    Category: 'bu',
  },
  {
    AccountID: 856,
    AccountName: 'FLORDELIZA RICAFLANCA',
    Email: 'fricaflanca@ics.com.ph',
    UserRole: 'bu:BU5',
    Category: 'bu',
  },
  {
    AccountID: 387,
    AccountName: 'SHIELA MARIE PEÑALOSA-MARCELO',
    Email: 'smpenalosa@ics.com.ph',
    UserRole: 'bu:BU8,BU12,CE01',
    Category: 'bu',
  },
  {
    AccountID: 310,
    AccountName: 'PATRICIA LORIA',
    Email: 'ploria@ics.com.ph',
    UserRole: 'bu:BU10',
    Category: 'bu',
  },
];

async function main() {
  console.log('🚀 Starting Portal Users Seeding (IT Admins & Product Managers)...');

  try {
    // 1. Remove obsolete mock IDs (1, 99999) if they exist
    console.log('Cleaning up obsolete mock IDs (1, 99999)...');
    await prisma.$executeRawUnsafe(`
      DELETE FROM [dbo].[Users] WHERE AccountID IN (1, 99999);
    `);

    // 2. Upsert Core Portal Users (IT Admins, Sales Admin, AA, BU Heads)
    console.log('\n--- Seeding Core Portal Users (IT Admins, Sales Admin, AA, BU Heads) ---');
    for (const u of CORE_USERS_TO_SEED) {
      console.log(`Processing ${u.Category.toUpperCase()}: ${u.AccountName} (${u.Email}) [AccountID: ${u.AccountID}] -> Role: '${u.UserRole}'`);

      await prisma.$executeRawUnsafe(`
        IF EXISTS (SELECT 1 FROM [dbo].[Users] WHERE AccountID = ${u.AccountID})
        BEGIN
          UPDATE [dbo].[Users] 
          SET AccountName = N'${u.AccountName.replace(/'/g, "''")}',
              Email = '${u.Email.toLowerCase().replace(/'/g, "''")}',
              UserRole = '${u.UserRole}',
              LastLogin = ISNULL(LastLogin, GETDATE())
          WHERE AccountID = ${u.AccountID};
        END
        ELSE IF EXISTS (SELECT 1 FROM [dbo].[Users] WHERE LOWER(Email) = '${u.Email.toLowerCase().replace(/'/g, "''")}')
        BEGIN
          UPDATE [dbo].[Users] 
          SET AccountID = ${u.AccountID},
              AccountName = N'${u.AccountName.replace(/'/g, "''")}',
              UserRole = '${u.UserRole}',
              LastLogin = ISNULL(LastLogin, GETDATE())
          WHERE LOWER(Email) = '${u.Email.toLowerCase().replace(/'/g, "''")}';
        END
        ELSE
        BEGIN
          INSERT INTO [dbo].[Users] (AccountID, AccountName, Email, UserRole, DtCreation, LastLogin)
          VALUES (${u.AccountID}, N'${u.AccountName.replace(/'/g, "''")}', '${u.Email.toLowerCase().replace(/'/g, "''")}', '${u.UserRole}', GETDATE(), NULL);
        END
      `);
      console.log(`✓ ${u.AccountName} (${u.Email}) successfully configured with role '${u.UserRole}'.`);
    }

    // 3. Fetch and pre-seed active PM accounts from cdbAccounts
    console.log('\n--- Seeding Product Managers (AccountGroup = PMD, AccountType = PM) ---');
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

    console.log(`Found ${pms.length} active PM accounts in cdbAccounts.`);
    for (const pm of pms) {
      const email = pm.Email ? pm.Email.trim().toLowerCase() : '';
      if (!email) continue;
      const name = pm.AccountName ? pm.AccountName.trim() : 'Product Manager';

      await prisma.$executeRawUnsafe(`
        IF EXISTS (SELECT 1 FROM [dbo].[Users] WHERE AccountID = ${pm.AccountID})
        BEGIN
          -- Only update user role if not already customized with brands
          UPDATE [dbo].[Users] 
          SET AccountName = N'${name.replace(/'/g, "''")}',
              Email = '${email.replace(/'/g, "''")}',
              UserRole = CASE WHEN UserRole LIKE 'pm%' THEN UserRole ELSE 'pm' END,
              LastLogin = ISNULL(LastLogin, GETDATE())
          WHERE AccountID = ${pm.AccountID};
        END
        ELSE IF EXISTS (SELECT 1 FROM [dbo].[Users] WHERE LOWER(Email) = '${email.replace(/'/g, "''")}')
        BEGIN
          UPDATE [dbo].[Users] 
          SET AccountID = ${pm.AccountID},
              AccountName = N'${name.replace(/'/g, "''")}',
              UserRole = CASE WHEN UserRole LIKE 'pm%' THEN UserRole ELSE 'pm' END,
              LastLogin = ISNULL(LastLogin, GETDATE())
          WHERE LOWER(Email) = '${email.replace(/'/g, "''")}';
        END
        ELSE
        BEGIN
          INSERT INTO [dbo].[Users] (AccountID, AccountName, Email, UserRole, DtCreation, LastLogin)
          VALUES (${pm.AccountID}, N'${name.replace(/'/g, "''")}', '${email.replace(/'/g, "''")}', 'pm', GETDATE(), NULL);
        END
      `);
      console.log(`✓ PM ${email} (AccountID ${pm.AccountID}) successfully configured.`);
    }

    console.log('\n📊 Current Users in dbo.Users table:');
    const users = await prisma.$queryRawUnsafe<any[]>(`
      SELECT AccountID, AccountName, Email, UserRole, LastLogin, DtCreation 
      FROM [dbo].[Users] 
      ORDER BY UserRole ASC, AccountName ASC;
    `);

    console.table(users);
    console.log('\n✅ Portal users seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during user seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
