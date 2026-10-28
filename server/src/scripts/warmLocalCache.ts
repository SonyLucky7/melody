import fs from 'fs';
import path from 'path';
import { pool } from '../db/client';
import { config } from '../config';

async function warmCache() {
  console.log('⚡ Warming Melody High-Speed Spool Cache...');
  await fs.promises.mkdir(config.tempDir, { recursive: true });

  const res = await pool.query('SELECT id, title, artist FROM songs');
  const weekndDir = 'C:\\Users\\hac\\Downloads\\the weeknd';
  const lanaDir = 'C:\\Users\\hac\\Downloads\\Lana Del Rey (Style) - usesuno.com';

  const weekndFiles = fs.existsSync(weekndDir) ? fs.readdirSync(weekndDir) : [];
  const lanaFiles = fs.existsSync(lanaDir) ? fs.readdirSync(lanaDir) : [];

  let warmedCount = 0;
  let alreadyWarmed = 0;

  for (const song of res.rows) {
    const targetSpool = path.join(config.tempDir, `song-${song.id}.mp3`);

    if (fs.existsSync(targetSpool) && fs.statSync(targetSpool).size > 1000) {
      alreadyWarmed++;
      continue;
    }

    let sourceFile: string | null = null;

    if (song.artist.toLowerCase().includes('weeknd')) {
      const match = weekndFiles.find((f) => {
        const clean = f.replace(/\.mp3$/i, '').replace(/_spotdown\.org$/i, '').trim().toLowerCase();
        return clean === song.title.toLowerCase();
      });
      if (match) sourceFile = path.join(weekndDir, match);
    } else if (song.artist.toLowerCase().includes('lana')) {
      const match = lanaFiles.find((f) => {
        const clean = f.replace(/\.mp3$/i, '').replace(/\s*-\s*usesuno\.com$/i, '').trim().toLowerCase();
        return clean === song.title.toLowerCase();
      });
      if (match) sourceFile = path.join(lanaDir, match);
    }

    if (sourceFile && fs.existsSync(sourceFile)) {
      await fs.promises.copyFile(sourceFile, targetSpool);
      warmedCount++;
    }
  }

  console.log(`✅ Cache Warming Complete!`);
  console.log(`   ⚡ Newly Warmed: ${warmedCount} tracks`);
  console.log(`   ⚡ Already Cached: ${alreadyWarmed} tracks`);
  console.log(`   🚀 Total Ready for Sub-5ms Playback: ${warmedCount + alreadyWarmed} tracks`);

  await pool.end();
  process.exit(0);
}

warmCache().catch((err) => {
  console.error(err);
  process.exit(1);
});
