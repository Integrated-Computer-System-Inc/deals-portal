/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  SMOKE TEST: Email Notification Pipeline (4 Events)            ║
 * ║                                                                ║
 * ║  Create Deal · Update Deal · Lost Deal · Renew Deal            ║
 * ║                                                                ║
 * ║  THIS IS A TEST ONLY — uses hardcoded test recipients.         ║
 * ║  Run: npx tsx scripts/smoke-test-emails.ts                     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * End-to-end pipeline validation:
 *   1. Generate branded HTML email templates (all 4 events)
 *   2. Insert into dbo.deals_reg_notification (status=0)
 *   3. Dispatch ONLY the smoke-test rows via SMTP
 *   4. Verify status=1 (Sent) for all 4 test emails
 *
 * Recipients (hardcoded for smoke test):
 *   TO  : jdoremon@ics.com.ph
 *   CC  : jesurena@ics.com.ph, bcandelaria@ics.com.ph
 *   BCC : dramos@ics.com.ph, mescario@ics.com.ph
 *
 * SMTP: Uses smtp.gmail.com:587 with noreply-newsite@ics.com.ph + app password
 */

import { prisma } from '@my-app/database';
import nodemailer from 'nodemailer';
import {
  generateCreateDealEmail,
  generateUpdateDealEmail,
  generateLostDealEmail,
  generateRenewDealEmail,
} from '../lib/email-templates';

// ──────────────────────────────────────────────────────────
// Hardcoded smoke test recipients (NOT production routing)
// ──────────────────────────────────────────────────────────
const SMOKE_TO  = 'jdoremon@ics.com.ph';
const SMOKE_CC  = 'jesurena@ics.com.ph, bcandelaria@ics.com.ph';
const SMOKE_BCC = 'dramos@ics.com.ph, mescario@ics.com.ph';
const SMOKE_CREATOR = 'SMOKE_TEST';

// ──────────────────────────────────────────────────────────
// SMTP config — explicit for smoke test (gmail + app password)
// ──────────────────────────────────────────────────────────
const SMTP_CONFIG = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'noreply-newsite@ics.com.ph',
    pass: 'yfawqcuhittogpcg',
  },
  tls: { rejectUnauthorized: false },
};
const SMTP_FROM = '"NoReply: Deals Registration" <noreply-newsite@ics.com.ph>';

// ──────────────────────────────────────────────────────────
// Build the 4 test payloads
// ──────────────────────────────────────────────────────────

function buildTestPayloads() {
  const now = new Date();
  const in30d = new Date(now.getTime() + 30 * 86_400_000);
  const in60d = new Date(now.getTime() + 60 * 86_400_000);

  // 1 ▸ Create Deal
  const create = generateCreateDealEmail({
    dealID: 99901,
    dealRegID: 'DR-2026-001',
    custName: 'San Miguel Corporation',
    projectName: 'Enterprise Infrastructure Refresh 2026',
    brand: 'Cisco',
    bu: 'BU2',
    assignedAO: 'Juan Dela Cruz',
    regDate: now,
    expDate: in30d,
    totalAmount: 1_250_000,
    creatorName: 'System Administrator',
    creatorAccount: SMOKE_CREATOR,
  });

  // 2 ▸ Update Deal
  const update = generateUpdateDealEmail({
    dealID: 99902,
    dealRegID: 'DR-2026-002',
    custName: 'Ayala Land Inc.',
    projectName: 'Core Switch and Firewall Migration',
    brand: 'Fortinet',
    bu: 'BU5',
    assignedAO: 'Maria Santos',
    newStatus: 'Approved',
    totalAmount: 3_800_000,
    creatorName: 'System Administrator',
    creatorAccount: SMOKE_CREATOR,
  });

  // 3 ▸ Lost Deal
  const lost = generateLostDealEmail({
    dealID: 99903,
    dealRegID: 'DR-2026-003',
    custName: 'BDO Unibank, Inc.',
    projectName: 'Branch Router Replacement Project',
    brand: 'HPE Aruba',
    bu: 'BU1',
    assignedAO: 'Roberto Gomez',
    competitorVendor: 'Trends & Technologies',
    competitorBrand: 'Huawei',
    icsOffer: 'PHP 4,500,000',
    competitorOffer: 'PHP 3,850,000',
    reason: 'Competitor offered lower pricing on equivalent hardware model.',
    otherInformation: 'Customer opted for competitor bid due to budget freeze.',
    creatorName: 'System Administrator',
    creatorAccount: SMOKE_CREATOR,
  });

  // 4 ▸ Renew Deal
  const renew = generateRenewDealEmail({
    dealID: 99904,
    dealRegID: 'DR-2026-004',
    custName: 'Globe Telecom',
    projectName: 'Data Center Maintenance Support Renewal',
    brand: 'Dell Technologies',
    bu: 'BU8',
    assignedAO: 'Angela Reyes',
    renewalDate: now,
    newExpirationDate: in60d,
    validityDays: 60,
    remarks: 'Customer requested 60-day validity extension pending board approval.',
    creatorName: 'System Administrator',
    creatorAccount: SMOKE_CREATOR,
  });

  return [
    { label: 'Create Deal', ...create },
    { label: 'Update Deal', ...update },
    { label: 'Lost Deal',   ...lost },
    { label: 'Renew Deal',  ...renew },
  ];
}

// ──────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('┌──────────────────────────────────────────────────────────────────┐');
  console.log('│  SMOKE TEST: Email Notification Pipeline                        │');
  console.log('│  Events: Create · Update · Lost · Renew                         │');
  console.log('├──────────────────────────────────────────────────────────────────┤');
  console.log(`│  TO  : ${SMOKE_TO.padEnd(54)}│`);
  console.log(`│  CC  : ${SMOKE_CC.padEnd(54)}│`);
  console.log(`│  BCC : ${SMOKE_BCC.padEnd(54)}│`);
  console.log('├──────────────────────────────────────────────────────────────────┤');
  console.log(`│  SMTP : ${SMTP_CONFIG.host}:${SMTP_CONFIG.port} (${SMTP_CONFIG.auth.user})`.padEnd(65) + '│');
  console.log('└──────────────────────────────────────────────────────────────────┘');
  console.log('');

  const payloads = buildTestPayloads();
  const now = new Date();
  const enqueuedIds: number[] = [];

  // ── Step 1: Enqueue all 4 notifications ──────────────────
  console.log('▶ Step 1/3: Enqueueing 4 test notifications into dbo.deals_reg_notification...');

  for (const payload of payloads) {
    const maxResult = await prisma.$queryRawUnsafe<any[]>(
      `SELECT ISNULL(MAX(email_id), 0) AS maxId FROM [dbo].[deals_reg_notification]`
    );
    const nextId = Number(maxResult?.[0]?.maxId || 0) + 1;

    await prisma.$executeRawUnsafe(
      `INSERT INTO [dbo].[deals_reg_notification] (
        [email_id], [creator], [subject], [message], [sendTo], [sendCC], [sendBCC], [dateCreated], [status]
      ) VALUES (@P1, @P2, @P3, @P4, @P5, @P6, @P7, @P8, @P9)`,
      nextId,
      SMOKE_CREATOR,
      payload.subject,
      payload.message,
      SMOKE_TO,
      SMOKE_CC,
      SMOKE_BCC,
      now,
      0
    );

    enqueuedIds.push(nextId);
    console.log(`  ✓ ${payload.label} → email_id = ${nextId}`);
  }

  console.log(`\n  ✅ Enqueued ${enqueuedIds.length} test notifications (IDs: ${enqueuedIds.join(', ')})`);

  // ── Step 2: Dispatch ONLY these 4 smoke-test rows via SMTP ─
  console.log('\n▶ Step 2/3: Dispatching 4 smoke-test emails via SMTP...');

  const transporter = nodemailer.createTransport(SMTP_CONFIG);
  let sentCount = 0;
  let failedCount = 0;

  // Fetch only the smoke-test rows
  const smokeRows = await prisma.deals_reg_notification.findMany({
    where: {
      email_id: { in: enqueuedIds },
      status: 0,
    },
    orderBy: { dateCreated: 'asc' },
  });

  for (const notification of smokeRows) {
    try {
      await transporter.sendMail({
        from: SMTP_FROM,
        to: notification.sendTo || undefined,
        cc: notification.sendCC || undefined,
        bcc: notification.sendBCC || undefined,
        subject: notification.subject || 'Deal Registration Notification',
        html: notification.message || '',
      });

      // Mark as Sent
      await prisma.deals_reg_notification.update({
        where: { email_id: notification.email_id },
        data: { status: 1, dateSent: new Date() },
      });

      sentCount++;
      console.log(`  ✅ ID ${notification.email_id} → ${notification.sendTo} [SENT]`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);

      // Mark as Failed
      await prisma.deals_reg_notification.update({
        where: { email_id: notification.email_id },
        data: { status: 2 },
      });

      failedCount++;
      console.log(`  ❌ ID ${notification.email_id} → ${notification.sendTo} [FAILED] — ${errorMsg}`);
    }
  }

  console.log(`\n  Sent: ${sentCount} | Failed: ${failedCount}`);

  // Close the transporter pool connection
  transporter.close();

  // ── Step 3: Verify final status ──────────────────────────
  console.log('\n▶ Step 3/3: Verifying final status in dbo.deals_reg_notification...');

  const verifyResults = await prisma.deals_reg_notification.findMany({
    where: { email_id: { in: enqueuedIds } },
    select: {
      email_id: true,
      subject: true,
      status: true,
      dateSent: true,
      sendTo: true,
    },
  });

  let allPassed = true;
  for (const row of verifyResults) {
    const statusLabel =
      row.status === 1 ? '✅ SENT' :
      row.status === 2 ? '❌ FAILED' :
      '⏳ PENDING';
    if (row.status !== 1) allPassed = false;
    console.log(`  ${statusLabel}  ID ${row.email_id}  →  ${row.sendTo}  (dateSent: ${row.dateSent?.toISOString() || 'null'})`);
  }

  console.log('');
  console.log('┌──────────────────────────────────────────────────────────────────┐');
  if (allPassed) {
    console.log('│  ✅ ALL 4 SMOKE TESTS PASSED — Pipeline is production-ready!    │');
  } else {
    console.log('│  ❌ SOME TESTS FAILED — Check SMTP config and error details.    │');
  }
  console.log('└──────────────────────────────────────────────────────────────────┘');
  console.log('');
}

main()
  .catch((e) => {
    console.error('\n❌ Smoke test fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
