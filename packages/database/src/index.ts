import { PrismaClient } from '@prisma/client';

export function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const user = process.env.MSSQL_USER || 'DealWithIt_App';
  let password = process.env.MSSQL_PASSWORD || '';
  if (!password || password === '1)3al!') {
    password = '1)3al$Gatekeeper!';
  }
  const server = process.env.MSSQL_SERVER || 'AI-DATABASE';
  const instance = process.env.MSSQL_INSTANCE || 'AINSTEIN';
  const database = process.env.MSSQL_DATABASE || 'DealsRegistrationDB';
  const port = process.env.MSSQL_PORT || '1433';

  const host = instance ? `${server}\\${instance}` : `${server}:${port}`;
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
