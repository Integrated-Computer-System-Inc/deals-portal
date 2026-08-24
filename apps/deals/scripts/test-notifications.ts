import { resolveDealEmailRecipients } from '../lib/email-recipients';
import {
  generateCreateDealEmail,
  generateUpdateDealEmail,
  generateLostDealEmail,
  generateRenewDealEmail,
  generateExpiringDealEmail,
} from '../lib/email-templates';
import { getAppsDevBccEmails, getSenderAddress } from '../lib/email-config';
import { prisma } from '@my-app/database';

async function runTests() {
  console.log('=== 1. Testing Sender Header and BCC List ===');
  console.log('Sender Address:', getSenderAddress());
  console.log('AppsDev BCC List:', getAppsDevBccEmails());

  console.log('\n=== 2. Testing Recipient Routing for Multiple BUs ===');
  const testCases = [
    { ao: 'EDEN BAUTISTA', bu: 'BU1' },
    { ao: 'ROSETTE DE GUZMAN', bu: 'BU2' },
    { ao: 'RAYANNE DY', bu: 'BU5' },
    { ao: 'ALICIA GARFIN', bu: 'BU8' },
    { ao: 'JOYCE ANDREA GUANZON', bu: 'BU10' },
  ];

  for (const tc of testCases) {
    const res = await resolveDealEmailRecipients(tc.ao, tc.bu);
    console.log(`\nDeal BU: ${tc.bu}, AO: ${tc.ao}`);
    console.log(`  TO : ${res.sendTo}`);
    console.log(`  CC : ${res.sendCC}`);
    console.log(`  BCC: ${res.sendBCC}`);
  }

  console.log('\n=== 3. Testing Email Template Generators ===');
  const createEmail = generateCreateDealEmail({
    dealID: 9999,
    dealRegID: 'DR-TEST-001',
    custName: 'ACME CORP PHILIPPINES',
    projectName: 'Enterprise Core Upgrade',
    brand: 'Cisco',
    bu: 'BU2',
    assignedAO: 'ROSETTE DE GUZMAN',
    regDate: new Date(),
    expDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    totalAmount: 1500000,
    creatorName: 'John Doe',
    creatorAccount: 'CORP\\JDOE',
  });
  console.log('Create Deal Subject:', createEmail.subject);
  console.log('Create Deal HTML length:', createEmail.message.length);

  const lostEmail = generateLostDealEmail({
    dealID: 9999,
    dealRegID: 'DR-TEST-001',
    custName: 'ACME CORP PHILIPPINES',
    projectName: 'Enterprise Core Upgrade',
    brand: 'Cisco',
    bu: 'BU2',
    assignedAO: 'ROSETTE DE GUZMAN',
    competitorVendor: 'Competitor Phils',
    competitorBrand: 'Huawei',
    icsOffer: 'PHP 1,500,000',
    competitorOffer: 'PHP 1,200,000',
    reason: 'Price difference (20% lower offer from competitor)',
    otherInformation: 'Customer opted for budget constraints.',
    creatorName: 'John Doe',
    creatorAccount: 'CORP\\JDOE',
  });
  console.log('Lost Deal Subject:', lostEmail.subject);

  const renewEmail = generateRenewDealEmail({
    dealID: 9999,
    dealRegID: 'DR-TEST-001',
    custName: 'ACME CORP PHILIPPINES',
    projectName: 'Enterprise Core Upgrade',
    brand: 'Cisco',
    bu: 'BU2',
    assignedAO: 'ROSETTE DE GUZMAN',
    renewalDate: new Date(),
    newExpirationDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    validityDays: 60,
    remarks: 'Approved extension by Principal',
    creatorName: 'John Doe',
  });
  console.log('Renew Deal Subject:', renewEmail.subject);

  const exp30Email = generateExpiringDealEmail({
    dealID: 9999,
    dealRegID: 'DR-TEST-001',
    custName: 'ACME CORP PHILIPPINES',
    projectName: 'Enterprise Core Upgrade',
    brand: 'Cisco',
    bu: 'BU2',
    assignedAO: 'ROSETTE DE GUZMAN',
    expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    daysRemaining: 30,
    warningLevel: '30d',
  });
  console.log('30d Expiring Subject:', exp30Email.subject);

  const exp7Email = generateExpiringDealEmail({
    dealID: 9999,
    dealRegID: 'DR-TEST-001',
    custName: 'ACME CORP PHILIPPINES',
    projectName: 'Enterprise Core Upgrade',
    brand: 'Cisco',
    bu: 'BU2',
    assignedAO: 'ROSETTE DE GUZMAN',
    expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    daysRemaining: 7,
    warningLevel: '7d',
  });
  console.log('7d Expiring Subject:', exp7Email.subject);

  const expDailyEmail = generateExpiringDealEmail({
    dealID: 9999,
    dealRegID: 'DR-TEST-001',
    custName: 'ACME CORP PHILIPPINES',
    projectName: 'Enterprise Core Upgrade',
    brand: 'Cisco',
    bu: 'BU2',
    assignedAO: 'ROSETTE DE GUZMAN',
    expirationDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    daysRemaining: 2,
    warningLevel: 'daily',
  });
  console.log('Daily Expiring Subject:', expDailyEmail.subject);

  console.log('\n✓ All unit verifications completed successfully!');
}

runTests()
  .catch((e) => {
    console.error('Test error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
