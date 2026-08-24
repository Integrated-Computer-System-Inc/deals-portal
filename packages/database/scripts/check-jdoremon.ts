import { prisma } from '../src/index';

async function main() {
  try {
    const acc = await prisma.cdbAccounts.findFirst({
      where: {
        OR: [
          { Email: 'jdoremon@ics.com.ph' },
          { Email: 'JDOREMON@ICS.COM.PH' },
          { DomainAccount: { contains: 'doremon' } },
          { AccountName: { contains: 'doremon' } },
          { AccountName: { contains: 'james' } },
        ],
      },
    });
    console.log('Lookup for jdoremon in cdbAccounts:', acc);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
