import fs from 'fs';
import path from 'path';
import { telegramService } from '../src/services/telegram';
import { query, pool } from '../src/db/client';

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.log(`
Usage:
  npx tsx scripts/upload-song.ts <audio_file.mp3> <title> <artist> [album] [language] [cover_image.jpg]

Example:
  npx tsx scripts/upload-song.ts ./starboy.mp3 "Starboy" "The Weeknd" "Starboy" "english" ./cover.jpg
    `);
    process.exit(1);
  }

  const [audioPath, title, artist, album = '', language = 'english', coverPath] = args;

  if (!fs.existsSync(audioPath)) {
    console.error(`Error: Audio file not found at: ${audioPath}`);
    process.exit(1);
  }

  const audioBuffer = fs.readFileSync(audioPath);
  const coverBuffer = coverPath && fs.existsSync(coverPath) ? fs.readFileSync(coverPath) : undefined;

  console.log(`[Admin CLI] Uploading "${title}" by ${artist} (${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB) to Telegram channel...`);

  try {
    const tgResult = await telegramService.uploadAudio(
      audioBuffer,
      path.basename(audioPath),
      title,
      artist,
      coverBuffer
    );

    console.log(`[Admin CLI] Uploaded to Telegram! file_id: ${tgResult.telegram_file_id.slice(0, 15)}... msg_id: ${tgResult.telegram_message_id}`);

    const coverUrl = coverBuffer ? `data:image/jpeg;base64,${coverBuffer.toString('base64')}` : null;

    const res = await query(
      `INSERT INTO songs (
        title, artist, album, language, duration_seconds, file_size_bytes,
        telegram_file_id, telegram_message_id, cover_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, title, artist`,
      [
        title,
        artist,
        album || null,
        language.toLowerCase(),
        tgResult.duration_seconds || 0,
        tgResult.file_size_bytes || audioBuffer.length,
        tgResult.telegram_file_id,
        tgResult.telegram_message_id,
        coverUrl,
      ]
    );

    console.log(`[Admin CLI] Successfully saved song to database with ID: ${res.rows[0].id}`);
  } catch (err: any) {
    console.error('[Admin CLI Error]:', err.message);
  } finally {
    await pool.end();
  }
}

main();
