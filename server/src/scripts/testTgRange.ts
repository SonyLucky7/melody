import { pool, query } from '../db/client';
import { telegramService } from '../services/telegram';

async function run() {
  const res = await query('SELECT id, title, telegram_file_id FROM songs WHERE id = 5');
  const song = res.rows[0];
  console.log('Song:', song.title);
  
  const start = Date.now();
  const { downloadUrl, botIndex } = await telegramService.getFileDownloadUrl(song.telegram_file_id);
  console.log(`getFileDownloadUrl took ${Date.now() - start}ms (Bot ${botIndex + 1})`);

  const rangeStart = Date.now();
  const tgRes = await fetch(downloadUrl, {
    headers: { 'Range': 'bytes=0-65535' }
  });

  console.log(`Telegram Range fetch took ${Date.now() - rangeStart}ms`);
  console.log('Status:', tgRes.status);
  console.log('Content-Range:', tgRes.headers.get('content-range'));
  console.log('Content-Length:', tgRes.headers.get('content-length'));
  
  await pool.end();
  process.exit(0);
}

run().catch(console.error);
