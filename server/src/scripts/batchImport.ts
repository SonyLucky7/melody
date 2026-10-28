import fs from 'fs';
import path from 'path';
import { query } from '../db/client';
import { telegramService } from '../services/telegram';

interface TrackItem {
  filePath: string;
  cleanTitle: string;
  artist: string;
  album: string;
  language: string;
  coverUrl: string;
  fileSizeBytes: number;
}

function cleanTheWeekndTitle(filename: string): string {
  return filename
    .replace(/\.mp3$/i, '')
    .replace(/_spotdown\.org$/i, '')
    .trim();
}

function cleanLanaTitle(filename: string): string {
  return filename
    .replace(/\.mp3$/i, '')
    .replace(/\s*-\s*usesuno\.com$/i, '')
    .trim();
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('====================================================');
  console.log('  🎵 MELODY BATCH AUDIO IMPORTER TO TELEGRAM CLOUD');
  console.log('  🔒 All audio bytes are stored ONLY in Telegram Channel');
  console.log('  📦 Database stores only ~500 bytes of text metadata');
  console.log('====================================================\n');

  const theWeekndDir = 'C:\\Users\\hac\\Downloads\\the weeknd';
  const lanaDir = 'C:\\Users\\hac\\Downloads\\Lana Del Rey (Style) - usesuno.com';

  const tracksToUpload: TrackItem[] = [];

  // 1. Scan The Weeknd folder
  if (fs.existsSync(theWeekndDir)) {
    const files = fs.readdirSync(theWeekndDir).filter((f) => f.toLowerCase().endsWith('.mp3'));
    for (const f of files) {
      const fullPath = path.join(theWeekndDir, f);
      const stat = fs.statSync(fullPath);
      tracksToUpload.push({
        filePath: fullPath,
        cleanTitle: cleanTheWeekndTitle(f),
        artist: 'The Weeknd',
        album: 'The Weeknd Hits',
        language: 'english',
        coverUrl: '/Melody-Logo-1024.png',
        fileSizeBytes: stat.size,
      });
    }
  }

  // 2. Scan Lana Del Rey folder
  if (fs.existsSync(lanaDir)) {
    const files = fs.readdirSync(lanaDir).filter((f) => f.toLowerCase().endsWith('.mp3'));
    for (const f of files) {
      const fullPath = path.join(lanaDir, f);
      const stat = fs.statSync(fullPath);
      tracksToUpload.push({
        filePath: fullPath,
        cleanTitle: cleanLanaTitle(f),
        artist: 'Lana Del Rey',
        album: 'Lana Del Rey Collection',
        language: 'english',
        coverUrl: '/Melody-Logo-512.png',
        fileSizeBytes: stat.size,
      });
    }
  }

  console.log(`📁 Found total ${tracksToUpload.length} audio tracks to process.`);

  // 3. Fetch existing tracks in DB to prevent duplicates
  const existingRes = await query('SELECT title, artist FROM songs');
  const existingSet = new Set(
    existingRes.rows.map((r: any) => `${r.title.toLowerCase()}:::${r.artist.toLowerCase()}`)
  );

  const pendingTracks = tracksToUpload.filter(
    (t) => !existingSet.has(`${t.cleanTitle.toLowerCase()}:::${t.artist.toLowerCase()}`)
  );

  console.log(`✨ Already in database: ${tracksToUpload.length - pendingTracks.length}`);
  console.log(`🚀 New tracks to upload to Telegram: ${pendingTracks.length}\n`);

  if (pendingTracks.length === 0) {
    console.log('🎉 All tracks are already uploaded and indexed! Exiting.');
    process.exit(0);
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < pendingTracks.length; i++) {
    const track = pendingTracks[i];
    const progress = `[${i + 1}/${pendingTracks.length}]`;
    const mb = (track.fileSizeBytes / 1024 / 1024).toFixed(2);

    console.log(`${progress} 📤 Uploading "${track.cleanTitle}" by ${track.artist} (${mb} MB)...`);

    try {
      const audioBuffer = await fs.promises.readFile(track.filePath);

      // STEP 1: Upload to Telegram Cloud via Multi-Bot Rotation
      const tgResult = await telegramService.uploadAudio(
        audioBuffer,
        path.basename(track.filePath),
        track.cleanTitle,
        track.artist
      );

      if (!tgResult || !tgResult.telegram_file_id) {
        throw new Error('Telegram did not return a valid file_id. Audio not stored.');
      }

      // STEP 2: Save metadata ONLY in PostgreSQL (Zero audio binary stored in DB)
      const dbRes = await query(
        `INSERT INTO songs (
          title, artist, album, language, duration_seconds, file_size_bytes,
          telegram_file_id, telegram_message_id, cover_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id`,
        [
          track.cleanTitle,
          track.artist,
          track.album,
          track.language,
          tgResult.duration_seconds || 0,
          tgResult.file_size_bytes || track.fileSizeBytes,
          tgResult.telegram_file_id,
          tgResult.telegram_message_id,
          track.coverUrl,
        ]
      );

      const songId = dbRes.rows[0].id;
      console.log(
        `   ✅ Live on Telegram! File ID: ${tgResult.telegram_file_id.slice(0, 16)}... -> DB Track #${songId}\n`
      );
      successCount++;
    } catch (err: any) {
      console.error(`   ❌ Failed to upload "${track.cleanTitle}": ${err.message}\n`);
      failCount++;
    }

    // Gentle 800ms throttle to comply with Telegram Bot API rate limits
    if (i < pendingTracks.length - 1) {
      await sleep(800);
    }
  }

  console.log('====================================================');
  console.log(`🏁 Batch Upload Complete!`);
  console.log(`   ✅ Successfully uploaded & indexed: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log('====================================================');

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal batch import error:', err);
  process.exit(1);
});
