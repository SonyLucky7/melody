import fs from 'fs';
import path from 'path';
import { query, pool } from '../db/client';
import { telegramService } from '../services/telegram';

interface TrackMeta {
  artist: string;
  title: string;
  album: string;
  coverBuffer?: Buffer;
  durationSeconds: number;
}

export function parseId3v2(filePath: string): Partial<TrackMeta> {
  const result: Partial<TrackMeta> = {};
  let fd: number;
  try {
    fd = fs.openSync(filePath, 'r');
  } catch {
    return result;
  }

  try {
    const header = Buffer.alloc(10);
    fs.readSync(fd, header, 0, 10, 0);

    if (header.toString('utf8', 0, 3) !== 'ID3') {
      fs.closeSync(fd);
      return result;
    }

    const tagSize =
      ((header[6] & 0x7f) << 21) |
      ((header[7] & 0x7f) << 14) |
      ((header[8] & 0x7f) << 7) |
      (header[9] & 0x7f);

    const fullTag = Buffer.alloc(tagSize);
    fs.readSync(fd, fullTag, 0, tagSize, 10);
    fs.closeSync(fd);

    let offset = 0;
    while (offset + 10 < tagSize) {
      const frameId = fullTag.toString('latin1', offset, offset + 4);
      if (frameId.charCodeAt(0) === 0 || !/^[A-Z0-9]{4}$/.test(frameId)) {
        break;
      }

      const frameSize = fullTag.readUInt32BE(offset + 4);
      offset += 10;

      if (frameSize <= 0 || offset + frameSize > tagSize) break;

      const frameData = fullTag.slice(offset, offset + frameSize);
      offset += frameSize;

      if (frameId === 'TIT2' || frameId === 'TPE1' || frameId === 'TALB') {
        const encoding = frameData[0];
        let text = '';
        if (encoding === 0 || encoding === 3) {
          text = frameData.slice(1).toString(encoding === 3 ? 'utf8' : 'latin1').replace(/\0.*$/g, '').trim();
        } else if (encoding === 1 || encoding === 2) {
          text = frameData.slice(1).toString('utf16le').replace(/\0.*$/g, '').trim();
        }

        if (frameId === 'TIT2' && text) result.title = text;
        if (frameId === 'TPE1' && text) result.artist = text;
        if (frameId === 'TALB' && text) result.album = text;
      } else if (frameId === 'APIC' && !result.coverBuffer) {
        try {
          const encoding = frameData[0];
          let p = 1;
          while (p < frameData.length && frameData[p] !== 0) p++;
          p++; // skip mime null
          p++; // skip picture type
          if (encoding === 1 || encoding === 2) {
            while (p + 1 < frameData.length && !(frameData[p] === 0 && frameData[p + 1] === 0)) p += 2;
            p += 2;
          } else {
            while (p < frameData.length && frameData[p] !== 0) p++;
            p++;
          }
          if (p < frameData.length) {
            result.coverBuffer = frameData.slice(p);
          }
        } catch {}
      }
    }
  } catch {
    try { fs.closeSync(fd); } catch {}
  }

  return result;
}

function cleanFallbackName(filename: string): { artist: string; title: string } {
  let clean = filename
    .replace(/\.mp3$/i, '')
    .replace(/_spotdown\.org/gi, '')
    .replace(/\s*\(\d+\)\s*$/i, '')
    .trim();

  let artist = 'Slowed + Reverb';
  let title = clean;

  if (clean.includes(' - ')) {
    const parts = clean.split(' - ');
    title = parts[0].trim();
    artist = parts.slice(1).join(' - ').trim();
  }

  return { artist, title };
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('====================================================');
  console.log('  🎵 MELODY BATCH IMPORTER: SLOWED + REVERBED SONGS');
  console.log('  📁 Source: C:\\Users\\hac\\Downloads\\slowed reverbed songs');
  console.log('====================================================\n');

  const sourceDir = 'C:\\Users\\hac\\Downloads\\slowed reverbed songs';
  if (!fs.existsSync(sourceDir)) {
    console.error(`Source directory not found: ${sourceDir}`);
    process.exit(1);
  }

  const allFiles = fs.readdirSync(sourceDir).filter((f) => f.toLowerCase().endsWith('.mp3'));
  console.log(`Found ${allFiles.length} MP3 files in directory.\n`);

  // Deduplicate files by base name (ignore (1).mp3, (2).mp3 duplicates)
  const fileMap = new Map<string, string>();
  for (const f of allFiles) {
    const baseKey = f.toLowerCase().replace(/\s*\(\d+\)\s*\.mp3$/i, '.mp3');
    if (!fileMap.has(baseKey)) {
      fileMap.set(baseKey, f);
    }
  }

  const files = Array.from(fileMap.values());
  console.log(`Filtered to ${files.length} unique tracks (deduped repeated files).\n`);

  const serverCoversDir = path.resolve(__dirname, '../../public/covers');
  const clientCoversDir = path.resolve(__dirname, '../../../client/public/covers');
  await fs.promises.mkdir(serverCoversDir, { recursive: true });
  await fs.promises.mkdir(clientCoversDir, { recursive: true });

  // Query existing database tracks
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

    const id3 = parseId3v2(fullPath);
    const fallback = cleanFallbackName(filename);

    const title = id3.title || fallback.title;
    const artist = id3.artist || fallback.artist;
    const album = id3.album || 'Slowed + Reverb Vibes';
    let coverBuffer = id3.coverBuffer;

    const lowerKey = `${title.toLowerCase()}:::${artist.toLowerCase()}`;
    if (existingSet.has(lowerKey)) {
      console.log(`${progress} ⏩ Skipped (already in database): "${title}" by ${artist}`);
      skippedCount++;
      continue;
    }

    let coverUrl = '/Melody-Logo-1024.png';
    if (coverBuffer && coverBuffer.length > 1000) {
      const safeSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 30);
      const coverFileName = `slowed-${safeSlug}-${Date.now().toString(36)}.jpg`;
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
        filename,
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
          'english',
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

    if (i < files.length - 1) {
      await sleep(1000); // 1s throttle between uploads for Telegram rate limits
    }
  }

  console.log('====================================================');
  console.log('🎉 Slowed + Reverbed Batch Import Complete!');
  console.log(`   ✅ Successfully uploaded & indexed: ${successCount}`);
  console.log(`   ⏩ Already existed in DB: ${skippedCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log('====================================================');

  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error in slowed reverb import:', err);
  process.exit(1);
});
