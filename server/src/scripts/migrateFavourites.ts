import { pool, query } from '../db/client';

async function main() {
  try {
    console.log('Migrating favourites to user-scoped architecture...');
    
    // Drop old composite primary key constraint
    await query(`
      ALTER TABLE favourites DROP CONSTRAINT IF EXISTS favourites_pkey;
    `);

    // Ensure columns exist
    await query(`
      ALTER TABLE favourites ADD COLUMN IF NOT EXISTS id SERIAL PRIMARY KEY;
      ALTER TABLE favourites ADD COLUMN IF NOT EXISTS device_id VARCHAR(100);
      ALTER TABLE favourites ALTER COLUMN licence_id DROP NOT NULL;
    `);

    // Clean up any duplicates before adding unique constraint
    await query(`
      DELETE FROM favourites a USING favourites b
      WHERE a.id < b.id 
        AND a.device_id IS NOT NULL 
        AND a.device_id = b.device_id 
        AND a.song_id = b.song_id;
    `);

    // Add unique constraint for (device_id, song_id)
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_device_song_unique 
      ON favourites (device_id, song_id);
    `);

    console.log('Successfully upgraded favourites table to user/device-scoped isolation!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await pool.end();
  }
}

main();
