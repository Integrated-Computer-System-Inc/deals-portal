import { prisma } from '../src/index';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('================================================================');
  console.log(' Deals Registration Portal - Apply DealLinks Table Script');
  console.log('================================================================\n');

  const sqlFilePath = path.join(__dirname, 'create-deal-links-table.sql');
  if (!fs.existsSync(sqlFilePath)) {
    console.error(`[ERROR] SQL file not found at: ${sqlFilePath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

  // Clean up batches by GO delimiter
  const batches = sqlContent
    .split(/^\s*GO\s*$/gim)
    .map((b) => b.trim())
    .filter((b) => b.length > 0 && !b.startsWith('USE ['));

  console.log(`Loaded ${batches.length} SQL batches from ${sqlFilePath}\n`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const firstLine = batch.split('\n')[0].substring(0, 70);

    try {
      process.stdout.write(`[${i + 1}/${batches.length}] Executing: ${firstLine}... `);
      await prisma.$executeRawUnsafe(batch);
      console.log('OK');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`    ↳ ${message.split('\n')[0]}`);
    }
  }

  console.log('\n================================================================');
  console.log('DealLinks table creation/verification complete.');
  console.log('================================================================\n');
}

main()
  .catch((e) => {
    console.error('[FATAL ERROR]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
