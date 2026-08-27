import { prisma } from '../src/index';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('--- Applying Missing Performance Indexes ---');
  const sqlFile = path.join(__dirname, 'apply-missing-indexes.sql');
  const content = fs.readFileSync(sqlFile, 'utf8');
  const batches = content
    .split(/^\s*GO\s*$/gim)
    .map((b) => b.trim())
    .filter((b) => b.length > 0 && !b.startsWith('USE ['));

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    try {
      console.log(`Executing batch ${i + 1}/${batches.length}...`);
      await prisma.$executeRawUnsafe(batch);
      console.log(`Batch ${i + 1} succeeded.`);
    } catch (err: any) {
      console.warn(`Batch ${i + 1} notice:`, err.message);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
