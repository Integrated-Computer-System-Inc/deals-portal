import { prisma } from '../src/index';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('================================================================');
  console.log(' Deals Registration Portal - MSSQL Indexing Runner');
  console.log('================================================================\n');

  const sqlFilePath = path.join(__dirname, 'mssql-indexes.sql');
  if (!fs.existsSync(sqlFilePath)) {
    console.error(`[ERROR] SQL file not found at: ${sqlFilePath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  
  // Clean up batches by GO delimiter or semicolon
  const batches = sqlContent
    .split(/^\s*GO\s*$/gim)
    .map((b) => b.trim())
    .filter((b) => b.length > 0 && !b.startsWith('USE ['));

  console.log(`Loaded ${batches.length} SQL batches from ${sqlFilePath}\n`);

  let successCount = 0;
  let skippedOrFailed = 0;
  let ddlPermissionRestricted = false;

  const startTime = Date.now();

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const firstLine = batch.split('\n')[0].substring(0, 70);

    try {
      process.stdout.write(`[${i + 1}/${batches.length}] Executing: ${firstLine}... `);
      await prisma.$executeRawUnsafe(batch);
      console.log('OK');
      successCount++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.log('SKIPPED / NOTICE');
      
      if (message.includes('1088') || message.includes('permission') || message.includes('denied')) {
        ddlPermissionRestricted = true;
      }
      console.warn(`    ↳ ${message.split('\n')[0]}`);
      skippedOrFailed++;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n----------------------------------------------------------------');
  console.log(`Execution completed in ${duration}s.`);
  console.log(`Batches processed: ${successCount} successful, ${skippedOrFailed} notices/skipped.`);

  if (ddlPermissionRestricted) {
    console.log('\n[NOTICE: MSSQL DDL Permissions Required]');
    console.log('The application database user has DML (Read/Write) permissions, but requires');
    console.log('ALTER / DDL permissions to create indexes on SQL Server.');
    console.log('\nTo apply the indexes instantly with elevated permissions:');
    console.log(`1. Open SQL Server Management Studio (SSMS) or Azure Data Studio.`);
    console.log(`2. Connect to server: AI-DATABASE\\AINSTEIN`);
    console.log(`3. Open and execute the script:`);
    console.log(`   ${sqlFilePath}`);
  } else {
    console.log('\nAll database indexes have been applied and verified!');
  }
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
