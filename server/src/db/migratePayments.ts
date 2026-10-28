import { query, pool } from './client';

async function migrate() {
  console.log('Migrating database for Payments and Licence Expiry...');

  await query(`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE SET NULL,
      licence_id INT REFERENCES licences(id) ON DELETE CASCADE,
      plan VARCHAR(50) NOT NULL,
      amount_inr INT NOT NULL,
      upi_utr_ref VARCHAR(100) UNIQUE,
      status VARCHAR(20) NOT NULL DEFAULT 'verified',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await query(`
    ALTER TABLE licences ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
  `);

  await query(`
    ALTER TABLE licences ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'lifetime';
  `);

  console.log('Payments migration complete!');
  await pool.end();
}

migrate().catch(console.error);
