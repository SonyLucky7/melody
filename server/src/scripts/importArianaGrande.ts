import fs from 'fs';
import path from 'path';
import { query, pool } from '../db/client';
import { telegramService } from '../services/telegram';

interface TrackMeta {
  album: string;
  artist: string;
  cleanTitle: string;
  coverUrl: string;
  coverBuffer?: Buffer;
  durationSeconds: number;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseFilename(filename: string): { artist: string; title: string } {
  let clean = filename
    .replace(/\.mp3$/i, '')
    .replace(/_spotdown\.org/gi, '')
    .replace(/\s*\(\d+\)\s*$/i, '')
    .trim();

  // Special title corrections
  if (clean.toLowerCase().startsWith('yes, and_')) {
    clean = clean.replace(/^yes,\s*and_+/i, 'yes, and?');
  }

  let artist = 'Ariana Grande';
  let title = clean;

  // Track specific artist overrides
  const lower = clean.toLowerCase();
  if (lower.includes('rain on me')) {
    artist = 'Lady Gaga, Ariana Grande';
  } else if (lower.includes('bang bang')) {
    artist = 'Jessie J, Ariana Grande, Nicki Minaj';
  } else if (lower.includes('save your tears')) {
    artist = 'The Weeknd, Ariana Grande';
  } else if (lower.includes('stuck with u')) {
    artist = 'Ariana Grande, Justin Bieber';
  } else if (lower.includes('don\'t call me angel')) {
    artist = 'Ariana Grande, Miley Cyrus, Lana Del Rey';
  } else if (clean.includes(' - ')) {
    const parts = clean.split(' - ');
    if (parts[0].toLowerCase().includes('ariana grande')) {
      artist = parts[0].trim();
      title = parts.slice(1).join(' - ').trim();
    }
  }

  return { artist, title };
}

async function fetchMetadata(artist: string, title: string): Promise<TrackMeta> {
  try {
    const cleanSearchTitle = title
      .replace(/\(feat.*?\)/i, '')
      .replace(/\(with.*?\)/i, '')
      .replace(/-\s*remix/i, '')
      .replace(/-\s*acoustic/i, '')
      .replace(/-\s*extended/i, '')
      .replace(/-\s*a cappella/i, '')
      .trim();

    const searchTerm = `${cleanSearchTitle} Ariana Grande`;
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=musicTrack&limit=1`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      const item = data.results[0];
      const album = item.collectionName || 'Ariana Grande Hits';
      const durationSeconds = Math.round((item.trackTimeMillis || 0) / 1000);
      const rawArt = item.artworkUrl100 || '';
      const highResArt = rawArt ? rawArt.replace('100x100bb', '600x600bb') : null;

      let coverBuffer: Buffer | undefined;

      if (highResArt) {
        try {
          const artRes = await fetch(highResArt);
          if (artRes.ok) {
            coverBuffer = Buffer.from(await artRes.arrayBuffer());
          }
        } catch {}
      }

      return {
        artist,
        cleanTitle: title,
        album,
        coverUrl: '/covers/ariana-collection.jpg',
        coverBuffer,
        durationSeconds,
      };
    }
  } catch (err: any) {
    console.warn(`[iTunes Search Warning] ${title}:`, err.message);
  }

  return {
    artist,
    cleanTitle: title,
    album: 'Ariana Grande Hits',
    coverUrl: '/covers/ariana-collection.jpg',
    durationSeconds: 0,
  };
}

async function main() {
  console.log('====================================================');
  console.log('  🎵 MELODY BATCH IMPORTER: ARIANA GRANDE COLLECTION');
  console.log('  📁 Source: C:\\Users\\hac\\Downloads\\ariana grande');
  console.log('====================================================\n');

  const sourceDir = 'C:\\Users\\hac\\Downloads\\ariana grande';
  if (!fs.existsSync(sourceDir)) {
    console.error(`Source directory not found: ${sourceDir}`);
    process.exit(1);
  }

  const allFiles = fs.readdirSync(sourceDir).filter((f) => f.toLowerCase().endsWith('.mp3'));
  console.log(`Found ${allFiles.length} MP3 files in folder.\n`);

  // Filter out exact duplicate files (e.g. "the boy is mine_spotdown.org (1).mp3")
  const fileMap = new Map<string, string>();
  for (const f of allFiles) {
    const { title } = parseFilename(f);
    const key = title.toLowerCase();
    if (!fileMap.has(key)) {
      fileMap.set(key, f);
    }
  }

  const uniqueFiles = Array.from(fileMap.values());
  console.log(`Filtered down to ${uniqueFiles.length} unique songs after deduping.\n`);

  const serverCoversDir = path.resolve(__dirname, '../../public/covers');
  const clientCoversDir = path.resolve(__dirname, '../../../client/public/covers');
  await fs.promises.mkdir(serverCoversDir, { recursive: true });
  await fs.promises.mkdir(clientCoversDir, { recursive: true });

  // Load existing songs to prevent duplicate inserts in DB
  const existingRes = await query('SELECT LOWER(title) as t FROM songs');
  const existingSet = new Set(existingRes.rows.map((r: any) => r.t));

  let successCount = 0;
  let skippedCount = 0;
  let failCount = 0;

  for (let i = 0; i < uniqueFiles.length; i++) {
    const filename = uniqueFiles[i];
    const fullPath = path.join(sourceDir, filename);
    const stat = fs.statSync(fullPath);
    const progress = `[${i + 1}/${uniqueFiles.length}]`;

    const { artist, title } = parseFilename(filename);

    if (existingSet.has(title.toLowerCase())) {
      console.log(`${progress} ⏩ Skipped (already in library): "${title}" by ${artist}`);
      skippedCount++;
      continue;
    }

    console.log(`${progress} 🔍 Matching metadata for "${title}" by ${artist}...`);
    const meta = await fetchMetadata(artist, title);

    // Save 600x600 cover artwork locally for blazing 1ms instant loading
    let coverUrl = '/Melody-Logo-1024.png';
    if (meta.coverBuffer) {
      const safeSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 30);
      const coverFileName = `ariana-${safeSlug}-${Date.now().toString(36)}.jpg`;
      const serverCoverDest = path.join(serverCoversDir, coverFileName);
      const clientCoverDest = path.join(clientCoversDir, coverFileName);

      try {
        await fs.promises.writeFile(serverCoverDest, meta.coverBuffer);
        await fs.promises.writeFile(clientCoverDest, meta.coverBuffer);
        coverUrl = `/covers/${coverFileName}`;
      } catch (err) {}
    }

    const mb = (stat.size / 1024 / 1024).toFixed(2);
    console.log(`   📤 Uploading audio to Telegram Cloud (${mb} MB)...`);

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
        throw new Error('Telegram did not return a valid file_id');
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
      existingSet.add(title.toLowerCase());
      console.log(`   ✅ Live in Melody! [#${songId}] "${title}" (Album: ${meta.album}, ${duration}s)\n`);
      successCount++;
    } catch (err: any) {
      console.error(`   ❌ Failed to upload "${title}":`, err.message, '\n');
      failCount++;
    }

    if (i < uniqueFiles.length - 1) {
      await sleep(1000); // 1s throttle between uploads to respect Telegram Bot API limits
    }
  }

  console.log('====================================================');
  console.log('🎉 Ariana Grande Batch Import Complete!');
  console.log(`   ✅ Successfully uploaded & indexed: ${successCount}`);
  console.log(`   ⏩ Already existed in DB: ${skippedCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log('====================================================');

  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error in Ariana Grande import:', err);
  process.exit(1);
});
