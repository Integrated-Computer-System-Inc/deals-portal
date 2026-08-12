import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Seeding initial database records...');

  // 1. Seed Users
  await prisma.user.upsert({
    where: { Email: 'sarah.jenkins@company.com' },
    update: {},
    create: {
      AccountName: 'Sarah Jenkins',
      Email: 'sarah.jenkins@company.com',
      DomainAccount: 'CORP\\SJENKINS',
      AccountGroup: 'BU1',
      AccountID: 'ACC-001',
    },
  });

  await prisma.user.upsert({
    where: { Email: 'alex.rivera@company.com' },
    update: {},
    create: {
      AccountName: 'Alex Rivera',
      Email: 'alex.rivera@company.com',
      DomainAccount: 'CORP\\ARIVERA',
      AccountGroup: 'BU1',
      AccountID: 'ACC-002',
    },
  });

  await prisma.user.upsert({
    where: { Email: 'david.chen@company.com' },
    update: {},
    create: {
      AccountName: 'David Chen',
      Email: 'david.chen@company.com',
      DomainAccount: 'CORP\\DCHEN',
      AccountGroup: 'BU2',
      AccountID: 'ACC-003',
    },
  });

  // 2. Seed Sample Deals
  const deal1 = await prisma.dealHeader.upsert({
    where: { DealRegID: 'REG-CSCO-2026-001' },
    update: {},
    create: {
      DtRegistered: new Date('2026-01-15'),
      Expiration: new Date('2026-09-30'),
      ExpDt: new Date('2026-09-30'),
      Brand: 'Cisco',
      CustomerID: 'CUST-8812',
      DealRegID: 'REG-CSCO-2026-001',
      ProjectName: 'Global Campus Core Network Upgrade',
      AssignedAO: 'Alex Rivera',
      BU: 'BU1',
      DealStatus: 1, // Registered
      CreatedBy: 'Alex Rivera',
      CustName: 'Metropolitan Financial Services',
      Remarks: 'High-priority enterprise network refresh',
    },
  });

  await prisma.dealItems.deleteMany({ where: { DealID: deal1.DealID } });
  await prisma.dealItems.createMany({
    data: [
      { DealID: deal1.DealID, ItemDesc: 'Cisco Catalyst 9500 48-port Core Switch', Qty: 4, Currency: 'USD', TotalAmt: 48000.00 },
      { DealID: deal1.DealID, ItemDesc: 'Cisco DNA Center Advantage License 5yr', Qty: 4, Currency: 'USD', TotalAmt: 12500.00 },
    ],
  });

  const tenDaysBefore = new Date(deal1.ExpDt);
  tenDaysBefore.setDate(tenDaysBefore.getDate() - 10);
  await prisma.dealWTN.upsert({
    where: { DealID: deal1.DealID },
    update: {},
    create: {
      DealID: deal1.DealID,
      WhenToNotify: tenDaysBefore,
    },
  });

  const deal2 = await prisma.dealHeader.upsert({
    where: { DealRegID: 'REG-FORT-2026-002' },
    update: {},
    create: {
      DtRegistered: new Date('2026-02-01'),
      Expiration: new Date('2026-08-10'), // Expired recently
      ExpDt: new Date('2026-08-10'),
      Brand: 'Fortinet',
      CustomerID: 'CUST-3341',
      DealRegID: 'REG-FORT-2026-002',
      ProjectName: 'Perimeter Next-Gen Firewall Rollout',
      AssignedAO: 'Sarah Jenkins',
      BU: 'BU2',
      DealStatus: 4, // Pending
      CreatedBy: 'Sarah Jenkins',
      CustName: 'AeroSpace Technologies Ltd',
      Remarks: 'Pending vendor margin confirmation',
    },
  });

  await prisma.dealItems.deleteMany({ where: { DealID: deal2.DealID } });
  await prisma.dealItems.createMany({
    data: [
      { DealID: deal2.DealID, ItemDesc: 'FortiGate 600F High Availability Pair', Qty: 2, Currency: 'USD', TotalAmt: 34000.00 },
      { DealID: deal2.DealID, ItemDesc: 'Local Integration & Setup Professional Services', Qty: 1, Currency: 'PHP', TotalAmt: 450000.00 },
    ],
  });

  await prisma.dealWTN.upsert({
    where: { DealID: deal2.DealID },
    update: {},
    create: {
      DealID: deal2.DealID,
      WhenToNotify: new Date('2026-08-01'),
    },
  });

  console.log('[Seed] Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
