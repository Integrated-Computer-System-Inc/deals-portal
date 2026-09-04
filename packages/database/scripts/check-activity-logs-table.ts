import { prisma } from '../src/index';

async function main() {
  try {
    const tableCheck = await prisma.$queryRawUnsafe<any[]>(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'activity_logs';
    `);
    console.log('activity_logs table check result:', tableCheck);
  } catch (err) {
    console.error('Error checking table:', err);
  }
}

main().finally(() => prisma.$disconnect());
