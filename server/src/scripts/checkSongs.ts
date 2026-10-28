import fs from 'fs';
import path from 'path';
import { query, pool } from '../db/client';

async function check() {
  const songs = await query('SELECT id, title, artist, album, cover_url FROM songs ORDER BY id');
  console.log(`Found ${songs.rows.length} existing songs in DB:`);
  for (const s of songs.rows) {
    console.log(`[#${s.id}] ${s.artist} - ${s.title} (${s.album || 'No album'}) [Cover: ${s.cover_url}]`);
  }
  await pool.end();
}

check().catch(console.error);
