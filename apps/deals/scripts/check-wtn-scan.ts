import fs from 'fs';
import path from 'path';

// Load .env manually
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

import { prisma } from '../../../packages/database/src';
import { runNotificationCron, scanExpiringDeals } from '../lib/notifications';

async function main() {
  console.log('1. Setting Deal 8571 WTN to today (2026-08-25)...');
  await prisma.dealWTN.update({
    where: { dealID: 8571 },
    data: { whenToNotify: new Date('2026-08-25T00:00:00.000Z') },
  });
  console.log('Successfully set Deal 8571 WTN to 2026-08-25.');

  // Delete any previous test notification for 8571 today so it can cleanly enqueue fresh
  await prisma.deals_reg_notification.deleteMany({
    where: {
      subject: { contains: 'test-1234-5678' },
    },
  });

  console.log('\n2. Running scanExpiringDeals()...');
  const scanResult = await scanExpiringDeals();
  console.log('Scan Result:', JSON.stringify(scanResult, null, 2));

  console.log('\n3. Running runNotificationCron() to dispatch...');
  const cronResult = await runNotificationCron();
  console.log('Cron Result:', JSON.stringify(cronResult, null, 2));
}

main().finally(() => prisma.$disconnect());
