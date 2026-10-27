import { query, pool } from './client';

async function seed() {
  try {
    const countRes = await query('SELECT COUNT(*) as count FROM songs');
    if (parseInt(countRes.rows[0].count, 10) === 0) {
      console.log('[Seed] Populating initial demo catalog...');
      await query(`
        INSERT INTO songs (title, artist, album, language, duration_seconds, file_size_bytes, telegram_file_id, telegram_message_id, cover_url)
        VALUES 
          ('Starboy', 'The Weeknd ft. Daft Punk', 'Starboy', 'english', 230, 8500000, 'BAACAgIAAxkBAAEExample1', 101, '/Melody-Logo-1024.png'),
          ('Midnight City', 'M83', 'Hurry Up, We Are Dreaming', 'english', 244, 9100000, 'BAACAgIAAxkBAAEExample2', 102, '/Melody-Logo-512.png'),
          ('Blinding Lights', 'The Weeknd', 'After Hours', 'english', 200, 7800000, 'BAACAgIAAxkBAAEExample3', 103, '/Melody-Logo-Transparent.png')
      `);
      console.log('[Seed] Sample tracks inserted successfully.');
    } else {
      console.log(`[Seed] Songs already present (${countRes.rows[0].count} songs).`);
    }
  } catch (err: any) {
    console.error('[Seed Error]:', err.message);
  } finally {
    await pool.end();
  }
}

seed();
