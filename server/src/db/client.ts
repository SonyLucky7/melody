import { Pool, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config';

// Constrained connection pool for PostgreSQL 18 Free tier (1 CPU, 1 GB RAM)
const sanitizedUrl = config.databaseUrl.split('?')[0];

export const pool = new Pool({
  connectionString: sanitizedUrl,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10, // Hard limit to prevent RAM exhaustion on 1 GB DB
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 8000,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]:', err.message);
});

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.DEBUG_SQL === 'true') {
      console.log(`[SQL] ${text.slice(0, 80)}... (${duration}ms, rows: ${res.rowCount})`);
    }
    return res;
  } catch (err: any) {
    console.error(`[SQL Error]: ${err.message} in query: ${text}`);
    throw err;
  }
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const res = await pool.query('SELECT 1 as alive');
    return res.rows[0]?.alive === 1;
  } catch (err: any) {
    console.warn('[Database Connectivity Warning]:', err.message);
    return false;
  }
}
