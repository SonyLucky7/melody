import { pool, query } from '../db/client';

async function main() {
  try {
    const check = await query("SELECT id, title, artist, telegram_file_id FROM songs WHERE telegram_file_id LIKE '%Example%';");
    console.log('Dummy mock seed tracks to remove:', check.rows);

    const del = await query("DELETE FROM songs WHERE telegram_file_id LIKE '%Example%';");
    console.log(`Successfully removed ${del.rowCount} dummy placeholder tracks!`);

    const countRes = await query("SELECT COUNT(*) as total FROM songs;");
    console.log(`Remaining catalog count: ${countRes.rows[0].total} verified tracks.`);
  } catch (err) {
    console.error('Error during cleanup:', err);
  } finally {
    await pool.end();
  }
}

main();
