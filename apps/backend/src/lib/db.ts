import sql, { config as SqlConfig, ConnectionPool } from 'mssql';

function getSqlConfig(): SqlConfig {
  return {
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_SERVER || 'localhost',
    database: process.env.MSSQL_DATABASE,
    port: process.env.MSSQL_PORT ? parseInt(process.env.MSSQL_PORT, 10) : undefined,
    options: {
      // Required for SQL Server Named Instance (e.g., SERVERNAME\INSTANCENAME)
      instanceName: process.env.MSSQL_INSTANCE || undefined,
      // Suitable for self-hosted / internal-network SQL Server
      encrypt: false,
      trustServerCertificate: true,
    },
  };
}

let _mssqlPool: ConnectionPool | undefined;
let _mssqlPoolPromise: Promise<ConnectionPool> | undefined;

/**
 * Returns a shared, connected SQL Server ConnectionPool.
 *
 * - Reads environment variables dynamically when called.
 * - Maintains a singleton pool per process to avoid duplicate connections.
 */
export async function getDbPool(): Promise<ConnectionPool> {
  // Return existing pool if already connected
  if (_mssqlPool?.connected) {
    return _mssqlPool;
  }

  // Return in-flight connection promise to prevent concurrent initialisations
  if (_mssqlPoolPromise) {
    return _mssqlPoolPromise;
  }

  _mssqlPoolPromise = (async () => {
    try {
      const config = getSqlConfig();
      const pool = new sql.ConnectionPool(config);
      const connectedPool = await pool.connect();
      _mssqlPool = connectedPool;
      return connectedPool;
    } catch (err) {
      // Clear promise so the next call retries from scratch
      _mssqlPoolPromise = undefined;
      throw err;
    }
  })();

  return _mssqlPoolPromise;
}

export { sql };
