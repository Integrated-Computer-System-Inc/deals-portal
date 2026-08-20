import { prisma } from '../src/index';

async function main() {
  try {
    const accounts = await prisma.cdbAccounts.findMany({
      take: 15,
      select: {
        AccountID: true,
        AccountName: true,
        AccountGroup: true,
        AccountType: true,
        DomainAccount: true,
        Email: true,
        NickName: true,
      },
    });
    console.log('Sample cdbAccounts:', accounts);

    const notifications = await prisma.deals_reg_notification.findMany({
      take: 5,
      orderBy: { email_id: 'desc' },
    });
    console.log('Recent notifications in deals_reg_notification:', notifications);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
