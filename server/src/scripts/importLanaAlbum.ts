import fs from 'fs';
import path from 'path';
import { query, pool } from '../db/client';
import { telegramService } from '../services/telegram';

interface TrackMeta {
  filePath: string;
  filename: string;
  fileSizeBytes: number;
  artist: string;
  title: string;
  album: string;
  coverUrl: string;
  coverBuffer?: Buffer;
  durationSeconds: number;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchMetadata(artist: string, title: string): Promise<{ album: string; coverUrl: string; coverBuffer?: Buffer; durationSeconds: number }> {
  try {
    const cleanSearchTitle = title
      .replace(/\(feat.*?\)/i, '')
      .replace(/\(with.*?\)/i, '')
      .replace(/\(SPOTISAVER\)/i, '')
      .trim();

    const searchTerm = `${cleanSearchTitle} ${artist}`;
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=musicTrack&limit=1`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      const item = data.results[0];
      const album = item.collectionName || 'Lana Del Rey Studio';
      const durationSeconds = Math.round((item.trackTimeMillis || 0) / 1000);
      const rawArt = item.artworkUrl100 || '';
      const highResArt = rawArt ? rawArt.replace('100x100bb', '600x600bb') : null;

      let coverBuffer: Buffer | undefined;
      let finalCoverUrl = '/covers/lana-collection.jpg';

      if (highResArt) {
        try {
          const artRes = await fetch(highResArt);
          if (artRes.ok) {
            coverBuffer = Buffer.from(await artRes.arrayBuffer());
          }
        } catch {}
      }

      return {
        album,
        coverUrl: finalCoverUrl,
        coverBuffer,
        durationSeconds,
      };
    }
  } catch (err: any) {
    console.warn(`[iTunes Search Warning] ${artist} - ${title}:`, err.message);
  }

  return {
    album: 'Studio Collection',
    coverUrl: '/covers/lana-collection.jpg',
    durationSeconds: 0,
  };
}

async function main() {
  console.log('====================================================');
  console.log('  🎵 MELODY IMPORT: LANA DEL REY ALBUM');
  console.log('  📁 Source: C:\\Users\\hac\\Downloads\\album_pK0wa_Lana_Del_Rey');
  console.log('====================================================\n');

  const sourceDir = 'C:\\Users\\hac\\Downloads\\album_pK0wa_Lana_Del_Rey';
  if (!fs.existsSync(sourceDir)) {
    console.error(`Directory not found: ${sourceDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(sourceDir).filter((f) => f.toLowerCase().endsWith('.mp3'));
  console.log(`Found ${files.length} MP3 files in album folder.\n`);

  const serverCoversDir = path.resolve(__dirname, '../../public/covers');
  const clientCoversDir = path.resolve(__dirname, '../../../client/public/covers');
  await fs.promises.mkdir(serverCoversDir, { recursive: true });
  await fs.promises.mkdir(clientCoversDir, { recursive: true });

  // Get existing songs to prevent duplicates
  const existingRes = await query('SELECT LOWER(title) as t, LOWER(artist) as a FROM songs');
  const existingSet = new Set(existingRes.rows.map((r: any) => `${r.t}:::${r.a}`));

  let successCount = 0;
  let skippedCount = 0;
  let failCount = 0;

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const fullPath = path.join(sourceDir, filename);
    const stat = fs.statSync(fullPath);
    const progress = `[${i + 1}/${files.length}]`;

    // Parse filename: "Lana Del Rey - Born To Die (SPOTISAVER).mp3"
    // or "Zach Bryan, Lana Del Rey - Lies (feat. Lana Del Rey) (SPOTISAVER).mp3"
    const nameWithoutExt = filename.replace(/\.mp3$/i, '');
    let artist = 'Lana Del Rey';
    let title = nameWithoutExt;

    if (nameWithoutExt.includes(' - ')) {
      const parts = nameWithoutExt.split(' - ');
      artist = parts[0].trim();
      title = parts.slice(1).join(' - ').trim();
    }

    // Remove SPOTISAVER tag
    title = title.replace(/\(SPOTISAVER\)/i, '').trim();

    // Check duplicate
    if (existingSet.has(`${title.toLowerCase()}:::${artist.toLowerCase()}`)) {
      console.log(`${progress} ⏩ Skipped (already in database): "${title}" by ${artist}`);
      skippedCount++;
      continue;
    }

    console.log(`${progress} 🔍 Enriching metadata for "${title}" by ${artist}...`);
    const meta = await fetchMetadata(artist, title);

    // Save specific high-res artwork if available
    let coverUrl = meta.coverUrl;
    if (meta.coverBuffer) {
      const safeSlug = title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30);
      const coverFileName = `lana-${safeSlug}-${Date.now().toString(36)}.jpg`;
      const serverCoverDest = path.join(serverCoversDir, coverFileName);
      const clientCoverDest = path.join(clientCoversDir, coverFileName);

      try {
        await fs.promises.writeFile(serverCoverDest, meta.coverBuffer);
        await fs.promises.writeFile(clientCoverDest, meta.coverBuffer);
        coverUrl = `/covers/${coverFileName}`;
      } catch (err) {}
    }

    console.log(`   📤 Uploading audio to Telegram Cloud (${(stat.size / 1024 / 1024).toFixed(2)} MB)...`);

    try {
      const audioBuffer = await fs.promises.readFile(fullPath);
      const tgResult = await telegramService.uploadAudio(
        audioBuffer,
        filename,
        title,
        artist,
        meta.coverBuffer
      );

      if (!tgResult || !tgResult.telegram_file_id) {
        throw new Error('Telegram upload failed - no file_id returned');
      }

      const duration = tgResult.duration_seconds || meta.durationSeconds || 0;

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
          meta.album,
          'english',
          duration,
          stat.size,
          tgResult.telegram_file_id,
          tgResult.telegram_message_id,
          coverUrl,
        ]
      );

      const songId = insertRes.rows[0].id;
      console.log(`   ✅ Live in Melody! [#${songId}] "${title}" (Album: ${meta.album}, ${duration}s)\n`);
      successCount++;
    } catch (uploadErr: any) {
      console.error(`   ❌ Failed to upload "${title}":`, uploadErr.message);
      failCount++;
    }

    if (i < files.length - 1) {
      await sleep(1000); // 1s throttle between uploads for Telegram rate limits
    }
  }

  console.log('====================================================');
  console.log('🎉 Import Complete!');
  console.log(`   ✅ Added to Melody: ${successCount}`);
  console.log(`   ⏩ Already existed: ${skippedCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log('====================================================');

  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error in import:', err);
  process.exit(1);
});
