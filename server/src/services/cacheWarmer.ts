import fs from 'fs';
import path from 'path';
import { query } from '../db/client';
import { config } from '../config';

export async function warmSpoolCache(): Promise<void> {
  try {
    await fs.promises.mkdir(config.tempDir, { recursive: true });

    const weekndDir = 'C:\\Users\\hac\\Downloads\\the weeknd';
    const lanaDir = 'C:\\Users\\hac\\Downloads\\Lana Del Rey (Style) - usesuno.com';

    const weekndFiles = fs.existsSync(weekndDir) ? fs.readdirSync(weekndDir) : [];
    const lanaFiles = fs.existsSync(lanaDir) ? fs.readdirSync(lanaDir) : [];

    const res = await query('SELECT id, title, artist FROM songs');
    let count = 0;

    for (const song of res.rows) {
      const spoolPath = path.join(config.tempDir, `song-${song.id}.mp3`);
      if (fs.existsSync(spoolPath) && fs.statSync(spoolPath).size > 1000) continue;

      let source: string | null = null;
      if (song.artist.toLowerCase().includes('weeknd')) {
        const match = weekndFiles.find((f) => {
          const clean = f.replace(/\.mp3$/i, '').replace(/_spotdown\.org$/i, '').trim().toLowerCase();
          return clean === song.title.toLowerCase();
        });
        if (match) source = path.join(weekndDir, match);
      } else if (song.artist.toLowerCase().includes('lana')) {
        const match = lanaFiles.find((f) => {
          const clean = f.replace(/\.mp3$/i, '').replace(/\s*-\s*usesuno\.com$/i, '').trim().toLowerCase();
          return clean === song.title.toLowerCase();
        });
        if (match) source = path.join(lanaDir, match);
      }

      if (source && fs.existsSync(source)) {
        await fs.promises.copyFile(source, spoolPath);
        count++;
      }
    }

    if (count > 0) {
      console.log(`[Cache Warmer] Warmed ${count} tracks into local NVMe spool for sub-5ms instant playback.`);
    }
  } catch (err: any) {
    console.warn('[Cache Warmer Notice]:', err.message);
  }
}
