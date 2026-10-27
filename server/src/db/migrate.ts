import fs from 'fs';
import path from 'path';
import { query, pool } from './client';

export async function runMigrations(): Promise<void> {
  const schemaPath = path.join(__dirname, 'schema.sql');
  console.log(`[Migrations] Reading schema from ${schemaPath}...`);
  const sql = fs.readFileSync(schemaPath, 'utf8');

  try {
    await query(sql);
    console.log('[Migrations] PostgreSQL tables, indexes & constraints initialized successfully.');
  } catch (err: any) {
    console.error('[Migrations Error]: Failed to run schema migrations:', err.message);
    throw err;
  }
}

if (require.main === module) {
  runMigrations()
    .then(async () => {
      console.log('[Migrations] Completed.');
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[Migrations Fatal]:', err);
      await pool.end();
      process.exit(1);
    });
}
