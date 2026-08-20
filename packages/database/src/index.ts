import { PrismaClient } from '@prisma/client';

export function getDatabaseUrl(): string {
  const server = process.env.MSSQL_SERVER || 'AI-DATABASE';
  const instance = process.env.MSSQL_INSTANCE || 'AINSTEIN';
  const database = process.env.MSSQL_DATABASE || 'DealsRegistrationDB';
  const user = process.env.MSSQL_USER || 'DealWithIt_App';
  let password = process.env.MSSQL_PASSWORD || '1)3al$Gatekeeper!';
  if (!password || password === '1)3al!') {
    password = '1)3al$Gatekeeper!';
  }
  password = password.replace(/\\\$/g, '$');

  const host = instance ? `${server}\\${instance}` : server;
  return `sqlserver://${host};database=${database};user=${user};password=${password};encrypt=true;trustServerCertificate=true;`;
}

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

const databaseUrl = getDatabaseUrl();

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = databaseUrl;
}

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

export * from '@prisma/client';
