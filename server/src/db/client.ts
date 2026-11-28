import { Pool, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config';

// Constrained connection pool (3 max per Vercel serverless instance, 10 max on dedicated Node server)
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const sanitizedUrl = config.databaseUrl.split('?')[0];

export const pool = new Pool({
  connectionString: sanitizedUrl,
  ssl: {
    rejectUnauthorized: false,
  },
  max: isServerless ? 3 : 10,
  idleTimeoutMillis: isServerless ? 15000 : 30000,
  connectionTimeoutMillis: 8000,
  allowExitOnIdle: isServerless,
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
