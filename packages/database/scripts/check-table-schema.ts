import { prisma } from '../src/index';

async function main() {
  const tables = await prisma.$queryRawUnsafe<any[]>(`
    SELECT s.name AS schema_name, t.name AS table_name
    FROM sys.tables t
    JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE t.name LIKE '%User%' OR t.name LIKE '%cdb%';
  `);
  console.log('Tables found:');
  console.table(tables);
  await prisma.$disconnect();
}

main().catch(console.error);
