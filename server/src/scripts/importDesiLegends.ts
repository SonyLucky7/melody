import fs from 'fs';
import path from 'path';
import { query, pool } from '../db/client';
import { telegramService } from '../services/telegram';
import { parseId3v2 } from './importPopularSongs';

interface TrackItem {
  folder: string;
  filename: string;
  defaultArtist: string;
  language: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('====================================================');
  console.log('  🎵 MELODY BATCH IMPORTER: DESI & PUNJABI LEGENDS');
  console.log('  🎤 Sidhu Moose Wala & Yo Yo Honey Singh');
  console.log('====================================================\n');

  const sidhuDir = 'C:\\Users\\hac\\Downloads\\sidhu moose wala';
  const honeyDir = 'C:\\Users\\hac\\Downloads\\yoyo honey singh';

  const tracks: TrackItem[] = [];

  if (fs.existsSync(sidhuDir)) {
    const files = fs.readdirSync(sidhuDir).filter((f) => f.toLowerCase().endsWith('.mp3'));
    for (const f of files) {
      tracks.push({ folder: sidhuDir, filename: f, defaultArtist: 'Sidhu Moose Wala', language: 'punjabi' });
    }
  }

  if (fs.existsSync(honeyDir)) {
    const files = fs.readdirSync(honeyDir).filter((f) => f.toLowerCase().endsWith('.mp3'));
    for (const f of files) {
      tracks.push({ folder: honeyDir, filename: f, defaultArtist: 'Yo Yo Honey Singh', language: 'hindi' });
    }
  }

  console.log(`Found total ${tracks.length} Punjabi / Desi tracks to process.\n`);

  const serverCoversDir = path.resolve(__dirname, '../../public/covers');
  const clientCoversDir = path.resolve(__dirname, '../../../client/public/covers');
  await fs.promises.mkdir(serverCoversDir, { recursive: true });
  await fs.promises.mkdir(clientCoversDir, { recursive: true });

  const existingRes = await query('SELECT LOWER(title) as t, LOWER(artist) as a FROM songs');
  const existingSet = new Set(existingRes.rows.map((r: any) => `${r.t}:::${r.a}`));

  let successCount = 0;
  let skippedCount = 0;
  let failCount = 0;

  for (let i = 0; i < tracks.length; i++) {
    const item = tracks[i];
    const fullPath = path.join(item.folder, item.filename);
    const stat = fs.statSync(fullPath);
    const progress = `[${i + 1}/${tracks.length}]`;

    const id3 = parseId3v2(fullPath);

    let cleanTitle = item.filename.replace(/\.mp3$/i, '').replace(/_spotdown\.org/gi, '').trim();
    if (cleanTitle.includes(' (From _')) {
      cleanTitle = cleanTitle.replace(/ \(From _.*?_\)/gi, '');
    }

    const title = id3.title || cleanTitle;
    const artist = id3.artist || item.defaultArtist;
    const album = id3.album || `${item.defaultArtist} Hits`;
    const coverBuffer = id3.coverBuffer;

    const lowerKey = `${title.toLowerCase()}:::${artist.toLowerCase()}`;
    if (existingSet.has(lowerKey)) {
      console.log(`${progress} ⏩ Skipped (already in library): "${title}" by ${artist}`);
      skippedCount++;
      continue;
    }

    let coverUrl = '/Melody-Logo-1024.png';
    if (coverBuffer && coverBuffer.length > 1000) {
      const safeSlug = title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30);
      const coverFileName = `desi-${safeSlug}-${Date.now().toString(36)}.jpg`;
      const serverCoverDest = path.join(serverCoversDir, coverFileName);
      const clientCoverDest = path.join(clientCoversDir, coverFileName);

      try {
        await fs.promises.writeFile(serverCoverDest, coverBuffer);
        await fs.promises.writeFile(clientCoverDest, coverBuffer);
        coverUrl = `/covers/${coverFileName}`;
      } catch (err) {}
    }

    const mb = (stat.size / 1024 / 1024).toFixed(2);
    console.log(`${progress} 📤 Uploading "${title}" by ${artist} (${mb} MB)...`);

    try {
      const audioBuffer = await fs.promises.readFile(fullPath);
      const tgResult = await telegramService.uploadAudio(
        audioBuffer,
        item.filename,
        title,
        artist,
        coverBuffer
      );

      if (!tgResult || !tgResult.telegram_file_id) {
        throw new Error('Telegram did not return a valid file_id');
      }

      const duration = tgResult.duration_seconds || 0;

      // Insert into PostgreSQL
      const insertRes = await query(
        `INSERT INTO songs (
          title, artist, album, language, duration_seconds, file_size_bytes,
          telegram_file_id, telegram_message_id, cover_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id`,
        [
          title,
          artist,
          album,
          item.language,
          duration,
          stat.size,
          tgResult.telegram_file_id,
          tgResult.telegram_message_id,
          coverUrl,
        ]
      );

      const songId = insertRes.rows[0].id;
      existingSet.add(lowerKey);
      console.log(`   ✅ Live in Melody! [#${songId}] "${title}" by ${artist} (Album: ${album}, ${duration}s)\n`);
      successCount++;
    } catch (err: any) {
      console.error(`   ❌ Failed to upload "${title}":`, err.message, '\n');
      failCount++;
    }

    if (i < tracks.length - 1) {
      await sleep(1000); // 1s throttle between uploads
    }
  }

  console.log('====================================================');
  console.log('🎉 Desi & Punjabi Legends Import Complete!');
  console.log(`   ✅ Successfully uploaded & indexed: ${successCount}`);
  console.log(`   ⏩ Already existed in DB: ${skippedCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log('====================================================');

  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error in Desi legends import:', err);
  process.exit(1);
});
