import { prisma } from '../src/index';

async function main() {
  const info = await prisma.$queryRawUnsafe<any[]>(`
    SELECT 
      name,
      is_read_committed_snapshot_on,
      snapshot_isolation_state_desc
    FROM sys.databases
    WHERE name = DB_NAME();
  `);
  console.log('DB Info:', info);
  await prisma.$disconnect();
}

main().catch(console.error);
