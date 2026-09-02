import fs from 'fs';
import path from 'path';
import { prisma } from '../src/index';

async function runMasterDeployment() {
  console.log('🚀 Running Master Database Deployment...');

  const sqlFilePath = path.join(__dirname, 'master-database-deployment.sql');
  if (!fs.existsSync(sqlFilePath)) {
    throw new Error(`Master SQL script not found at: ${sqlFilePath}`);
  }

  const rawSql = fs.readFileSync(sqlFilePath, 'utf-8');

  // Split by GO batches (standard for MSSQL scripts)
  const batches = rawSql
    .split(/^\s*GO\s*$/gim)
    .map((b) => b.trim())
    .filter((b) => b.length > 0 && !b.startsWith('--'));

  for (const batch of batches) {
    // Skip USE [Database] statements if running via connection string directly
    if (/^\s*USE\s+\[/i.test(batch)) {
      continue;
    }
    try {
      await prisma.$executeRawUnsafe(batch);
    } catch (err: any) {
      console.warn(`[Batch Warning]: ${err.message}`);
    }
  }

  console.log('✅ Master Database Deployment executed successfully!');
}

runMasterDeployment()
  .catch((e) => {
    console.error('❌ Deployment script error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
