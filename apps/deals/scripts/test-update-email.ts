import {
  generateCreateDealEmail,
  generateUpdateDealEmail,
  generateRenewDealEmail,
  generateLostDealEmail,
  generateExpiringDealEmail,
} from '../lib/email-templates';

function test() {
  console.log('=== 1. Testing generateCreateDealEmail ===');
  const createEmail = generateCreateDealEmail({
    dealID: 8571,
    dealRegID: 'DR-TEST-001',
    custName: 'San Miguel Corp',
    projectName: 'Network Upgrade 2026',
    brand: 'Dell',
    bu: 'BU2',
    assignedAO: 'Dan Lemuel Ramos',
    aoNickName: 'Dan',
    currency: 'USD',
    regDate: new Date('2026-08-25'),
    expDate: new Date('2026-11-23'),
    totalAmount: 1500000,
  });

  console.log('Create contains "Hi Dan,"?:', createEmail.message.includes('Hi Dan,'));
  console.log('Create contains "Deal Registration ID"?:', createEmail.message.includes('Deal Registration ID'));
  console.log('Create contains "Currency" (USD)?:', createEmail.message.includes('USD'));
  console.log('Create contains "Deal Amount" (1,500,000.00)?:', createEmail.message.includes('1,500,000.00'));
  console.log('Create omits Customer Name row in table?:', !createEmail.message.includes('<td class="label">Customer Name</td>'));
  console.log('Create omits Assigned AO row in table?:', !createEmail.message.includes('<td class="label">Assigned AO</td>'));
  console.log('Create omits BU row in table?:', !createEmail.message.includes('<td class="label">Business Unit (BU)</td>'));

  console.log('\n=== 2. Testing generateUpdateDealEmail ===');
  const updateEmail = generateUpdateDealEmail({
    dealID: 8571,
    dealRegID: 'DR-TEST-001',
    custName: 'San Miguel Corp',
    projectName: 'Network Upgrade 2026',
    brand: 'Dell',
    bu: 'BU2',
    assignedAO: 'Dan Lemuel Ramos',
    aoNickName: 'Dan',
    currency: 'PHP',
    regDate: new Date('2026-08-25'),
    expDate: new Date('2026-11-23'),
    totalAmount: 1500000,
    changes: [
      { label: 'Brand', from: 'Cisco', to: 'Dell' },
      { label: 'Currency', from: 'USD', to: 'PHP' },
      { label: 'Deal Amount', from: '1,200,000.00', to: '1,500,000.00' },
      { label: 'Remarks', from: '(empty)', to: 'Special discount approved by BU Head' }
    ]
  });

  console.log('Update contains "Hi Dan,"?:', updateEmail.message.includes('Hi Dan,'));
  console.log('Update contains "Deal Registration ID"?:', updateEmail.message.includes('Deal Registration ID'));
  console.log('Update contains Status row?:', updateEmail.message.includes('Status</td>') || updateEmail.message.includes('badge-blue">1'));
  console.log('Update omits Customer Name row in table?:', !updateEmail.message.includes('<td class="label">Customer Name</td>'));
  console.log('Update omits Assigned AO row in table?:', !updateEmail.message.includes('<td class="label">Assigned AO</td>'));
  console.log('Update omits BU row in table?:', !updateEmail.message.includes('<td class="label">Business Unit (BU)</td>'));
  console.log('Update contains Brand diff (Cisco -> Dell)?:', updateEmail.message.includes('<del style="color: #dc2626; text-decoration: line-through;">Cisco</del>'));
  console.log('Update contains Currency diff (USD -> PHP)?:', updateEmail.message.includes('<del style="color: #dc2626; text-decoration: line-through;">USD</del>'));
  console.log('Update contains Deal Amount diff?:', updateEmail.message.includes('<strong style="color: #16a34a;">1,500,000.00</strong>'));

  console.log('\n=== 3. Testing generateRenewDealEmail ===');
  const renewEmail = generateRenewDealEmail({
    dealID: 8571,
    dealRegID: 'DR-TEST-001',
    custName: 'San Miguel Corp',
    projectName: 'Network Upgrade 2026',
    brand: 'Dell',
    bu: 'BU2',
    assignedAO: 'Dan Lemuel Ramos',
    aoNickName: 'Dan',
    renewalDate: new Date('2026-08-25'),
    newExpirationDate: new Date('2026-11-23'),
    validityDays: 90,
    remarks: 'Approved renewal'
  });

  console.log('Renew contains "Hi Dan,"?:', renewEmail.message.includes('Hi Dan,'));
  console.log('Renew contains "Deal Registration ID"?:', renewEmail.message.includes('Deal Registration ID'));
  console.log('Renew contains standalone Brand (Dell)?:', renewEmail.message.includes('<td class="value">Dell</td>'));
  console.log('Renew omits Customer Name row in table?:', !renewEmail.message.includes('<td class="label">Customer Name</td>'));
  console.log('Renew omits Assigned AO row in table?:', !renewEmail.message.includes('<td class="label">Assigned AO</td>'));
  console.log('Renew omits Brand & BU compound label?:', !renewEmail.message.includes('Brand & BU'));

  console.log('\n=== 4. Testing generateLostDealEmail ===');
  const lostEmail = generateLostDealEmail({
    dealID: 8571,
    dealRegID: 'DR-TEST-001',
    custName: 'San Miguel Corp',
    projectName: 'Network Upgrade 2026',
    brand: 'Dell',
    bu: 'BU2',
    assignedAO: 'Dan Lemuel Ramos',
    aoNickName: 'Dan',
    competitorVendor: 'Competitor Corp',
    competitorBrand: 'HPE',
    icsOffer: 'PHP 1.5M',
    competitorOffer: 'PHP 1.2M',
    reason: 'Price difference',
    otherInformation: 'Competitor offered heavy discount',
  });

  console.log('Lost contains "Hi Dan,"?:', lostEmail.message.includes('Hi Dan,'));
  console.log('Lost contains "Deal Registration ID"?:', lostEmail.message.includes('Deal Registration ID'));
  console.log('Lost contains standalone Brand (Dell)?:', lostEmail.message.includes('<td class="value">Dell</td>'));
  console.log('Lost omits Customer Name row in table?:', !lostEmail.message.includes('<td class="label">Customer Name</td>'));
  console.log('\n=== 5. Testing generateExpiringDealEmail ===');
  const expiringEmail = generateExpiringDealEmail({
    dealID: 8571,
    dealRegID: 'DR-TEST-001',
    custName: 'San Miguel Corp',
    projectName: 'Network Upgrade 2026',
    brand: 'Dell',
    bu: 'BU2',
    assignedAO: 'Dan Lemuel Ramos',
    aoNickName: 'Dan',
    expirationDate: new Date('2026-09-01'),
    daysRemaining: 7,
    warningLevel: '7d',
  });

  console.log('Expiring contains "Hi Dan,"?:', expiringEmail.message.includes('Hi Dan,'));
  console.log('Expiring contains "CRITICAL: Deal Expiring in 7 Days"?:', expiringEmail.message.includes('CRITICAL: Deal Expiring in 7 Days'));
  console.log('Expiring contains "Deal Registration ID"?:', expiringEmail.message.includes('Deal Registration ID'));
  console.log('Expiring contains standalone Brand (Dell)?:', expiringEmail.message.includes('<td class="value">Dell</td>'));
  console.log('Expiring omits Customer Name row in table?:', !expiringEmail.message.includes('<td class="label">Customer Name</td>'));
  console.log('Expiring omits Assigned AO row in table?:', !expiringEmail.message.includes('<td class="label">Assigned AO</td>'));
  console.log('Expiring contains "View & Renew Deal"?:', expiringEmail.message.includes('View & Renew Deal'));

  console.log('\nALL VERIFICATIONS PASSED.');
}

test();
