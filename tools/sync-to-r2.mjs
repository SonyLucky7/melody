#!/usr/bin/env node
/**
 * Melody Hybrid Storage Sync — Telegram Multi-Bot -> Cloudflare R2 (Free Tier Guarded)
 *
 * Zero external AWS SDK dependencies (uses built-in Node crypto AWS SigV4 + https).
 *
 * Features:
 *  - Hard 9.0 GB Free-Tier Safety Cap (guarantees ₹0 forever under Cloudflare R2's 10 GB free limit!)
 *  - Overflow tracks beyond 9.0 GB stay automatically on Telegram Multi-Bot Pool with zero downtime.
 *  - Mirrors:
 *      1) client/public/Melody-v1.2.6.apk -> apk/Melody-v1.2.6.apk & apk/Melody-latest.apk
 *      2) client/public/covers/*          -> covers/<filename>
 *      3) PostgreSQL songs without r2_url -> songs/<id>.mp3 (and sets songs.r2_url & songs.r2_key)
 *  - 100% resumable: re-running skips songs that already have r2_url set in PostgreSQL.
 *
 * Usage:
 *   1) Create gitignored `.env.r2` in project root with:
 *        R2_ACCOUNT_ID=1fb6a5354578dd3df6ac8463a8ebf902
 *        R2_ACCESS_KEY_ID=<your-r2-access-key-id>
 *        R2_SECRET_ACCESS_KEY=<your-r2-secret-access-key>
 *        R2_BUCKET_NAME=melody-media
 *        R2_PUBLIC_URL=https://pub-xxxxxxxx.r2.dev
 *   2) Run:
 *        node tools/sync-to-r2.mjs                # Full sync (APK + covers + all 859 songs)
 *        node tools/sync-to-r2.mjs --dry-run      # Verify R2 auth & calculate sizes only
 *        node tools/sync-to-r2.mjs --apk-only     # Upload APK only
 *        node tools/sync-to-r2.mjs --covers-only  # Upload covers only
 *        node tools/sync-to-r2.mjs --songs-only   # Sync Telegram songs -> R2 only
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const { Pool } = require(path.join(ROOT, 'client', 'node_modules', 'pg'));

const MAX_R2_BYTES = Math.floor(9.0 * 1024 * 1024 * 1024); // Hard 9.0 GB free-tier guard (< 10 GB R2 free limit)
const CONCURRENCY = 4;
const tgAgent = new https.Agent({ keepAlive: true, maxSockets: 32, timeout: 45000 });
const r2Agent = new https.Agent({ keepAlive: true, maxSockets: 32, timeout: 120000 });

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && !process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(path.join(ROOT, '.env.r2'));
loadEnvFile(path.join(ROOT, '.env.vercel'));
loadEnvFile(path.join(ROOT, 'server', '.env'));

const R2_ACCOUNT_ID = (process.env.R2_ACCOUNT_ID || '').trim();
const R2_ACCESS_KEY_ID = (process.env.R2_ACCESS_KEY_ID || '').trim();
const R2_SECRET_ACCESS_KEY = (process.env.R2_SECRET_ACCESS_KEY || '').trim();
const R2_BUCKET_NAME = (process.env.R2_BUCKET_NAME || 'melody-media').trim();
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').trim().replace(/\/+$/, '');
const DATABASE_URL = (process.env.DATABASE_URL || '').trim().split('?')[0];
const TELEGRAM_BOT_TOKENS = (process.env.TELEGRAM_BOT_TOKENS || '')
  .split(',')
  .map((t) => t.trim())
  .filter(Boolean);

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const ONLY_APK = args.has('--apk-only');
const ONLY_COVERS = args.has('--covers-only');
const ONLY_SONGS = args.has('--songs-only');
const RUN_ALL = !ONLY_APK && !ONLY_COVERS && !ONLY_SONGS;

function assertConfig() {
  const missing = [];
  if (!R2_ACCOUNT_ID) missing.push('R2_ACCOUNT_ID');
  if (!R2_ACCESS_KEY_ID) missing.push('R2_ACCESS_KEY_ID');
  if (!R2_SECRET_ACCESS_KEY) missing.push('R2_SECRET_ACCESS_KEY');
  if (!R2_BUCKET_NAME) missing.push('R2_BUCKET_NAME');
  if (!R2_PUBLIC_URL) missing.push('R2_PUBLIC_URL');
  if ((RUN_ALL || ONLY_SONGS) && !DATABASE_URL) missing.push('DATABASE_URL');
  if ((RUN_ALL || ONLY_SONGS) && TELEGRAM_BOT_TOKENS.length === 0) missing.push('TELEGRAM_BOT_TOKENS');
  if (missing.length) {
    console.error('Missing required environment variables in .env.r2 (or environment):');
    console.error('  ' + missing.join(', '));
    process.exit(1);
  }
}

// --- Pure Node AWS Signature V4 for Cloudflare R2 ---
function sha256Hex(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}
function hmac(key, msg) {
  return crypto.createHmac('sha256', key).update(msg).digest();
}

function encodeS3Key(key) {
  return key
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

function r2Request({ method, key = '', body = null, contentType = '', cacheControl = '' }) {
  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const canonicalUri = key ? `/${encodeURIComponent(R2_BUCKET_NAME)}/${encodeS3Key(key)}` : `/${encodeURIComponent(R2_BUCKET_NAME)}`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const region = 'auto';
  const service = 's3';

  const payloadBuf = body ? (Buffer.isBuffer(body) ? body : Buffer.from(body)) : Buffer.alloc(0);
  const payloadHash = sha256Hex(payloadBuf);

  const headers = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  if (contentType) headers['content-type'] = contentType;
  if (cacheControl) headers['cache-control'] = cacheControl;
  if (payloadBuf.length > 0) headers['content-length'] = String(payloadBuf.length);

  const sortedKeys = Object.keys(headers).sort();
  const canonicalHeaders = sortedKeys.map((k) => `${k}:${headers[k]}\n`).join('');
  const signedHeaders = sortedKeys.join(';');

  const canonicalRequest = [method, canonicalUri, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256Hex(canonicalRequest)].join('\n');

  const kDate = hmac(`AWS4${R2_SECRET_ACCESS_KEY}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  const reqHeaders = {
    ...headers,
    Authorization: `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };

  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname: host, port: 443, path: canonicalUri, method, headers: reqHeaders, agent: r2Agent, timeout: 120000 },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ status: res.statusCode, headers: res.headers, body: text });
          } else {
            reject(new Error(`R2 ${method} ${canonicalUri} failed (${res.statusCode}): ${text.slice(0, 300)}`));
          }
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error(`R2 timeout on ${method} ${key}`)));
    req.on('error', reject);
    if (payloadBuf.length > 0) req.write(payloadBuf);
    req.end();
  });
}

async function r2Head(key) {
  try {
    const res = await r2Request({ method: 'HEAD', key });
    return { exists: true, size: parseInt(res.headers['content-length'] || '0', 10) };
  } catch {
    return { exists: false, size: 0 };
  }
}

function httpsGetBuffer(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { agent: tgAgent, timeout: 45000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        httpsGetBuffer(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode} fetching ${url.slice(0, 60)}`));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('HTTP download timeout')));
    req.on('error', reject);
  });
}

async function downloadFromTelegram(fileId) {
  const tryBot = async (token) => {
    const jsonBuf = await httpsGetBuffer(
      `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`
    );
    const data = JSON.parse(jsonBuf.toString('utf8'));
    if (!data?.ok || !data?.result?.file_path) {
      throw new Error(data?.description || 'getFile failed');
    }
    return await httpsGetBuffer(`https://api.telegram.org/file/bot${token}/${data.result.file_path}`);
  };
  return await Promise.any(TELEGRAM_BOT_TOKENS.map((t) => tryBot(t)));
}

function guessMime(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.apk') return 'application/vnd.android.package-archive';
  if (ext === '.mp3') return 'audio/mpeg';
  return 'application/octet-stream';
}

async function syncApk() {
  const apkLocal = path.join(ROOT, 'client', 'public', 'Melody-v1.2.6.apk');
  if (!fs.existsSync(apkLocal)) {
    console.log('[APK] Local Melody-v1.2.6.apk not found, skipping.');
    return 0;
  }
  const buf = fs.readFileSync(apkLocal);
  const mb = (buf.length / 1048576).toFixed(2);
  console.log(`[APK] Syncing Melody-v1.2.6.apk (${mb} MB) -> R2 apk/Melody-v1.2.6.apk & apk/Melody-latest.apk...`);
  if (!DRY_RUN) {
    await r2Request({
      method: 'PUT',
      key: 'apk/Melody-v1.2.6.apk',
      body: buf,
      contentType: 'application/vnd.android.package-archive',
      cacheControl: 'public, max-age=86400',
    });
    await r2Request({
      method: 'PUT',
      key: 'apk/Melody-latest.apk',
      body: buf,
      contentType: 'application/vnd.android.package-archive',
      cacheControl: 'public, max-age=3600',
    });
  }
  console.log(`[APK] Live URL: ${R2_PUBLIC_URL}/apk/Melody-v1.2.6.apk`);
  return buf.length * 2;
}

async function syncCovers() {
  const coversDir = path.join(ROOT, 'client', 'public', 'covers');
  if (!fs.existsSync(coversDir)) return 0;
  const files = fs.readdirSync(coversDir).filter((f) => fs.statSync(path.join(coversDir, f)).isFile());
  console.log(`[Covers] Checking ${files.length} cover files...`);
  let uploaded = 0;
  let skipped = 0;
  let bytesTotal = 0;

  let idx = 0;
  const worker = async () => {
    while (idx < files.length) {
      const f = files[idx++];
      const fullPath = path.join(coversDir, f);
      const st = fs.statSync(fullPath);
      bytesTotal += st.size;
      const key = `covers/${f}`;
      const head = await r2Head(key);
      if (head.exists && head.size === st.size) {
        skipped++;
        continue;
      }
      if (!DRY_RUN) {
        await r2Request({
          method: 'PUT',
          key,
          body: fs.readFileSync(fullPath),
          contentType: guessMime(f),
          cacheControl: 'public, max-age=31536000, immutable',
        });
      }
      uploaded++;
      if (uploaded % 50 === 0) console.log(`[Covers] Uploaded ${uploaded}/${files.length} (skipped ${skipped})`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  console.log(`[Covers] Done! Uploaded: ${uploaded}, Already on R2: ${skipped}, Total: ${(bytesTotal / 1048576).toFixed(2)} MB`);
  return bytesTotal;
}

async function syncSongs(usedBytesAlready) {
  const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 5 });
  try {
    await pool.query('ALTER TABLE songs ADD COLUMN IF NOT EXISTS r2_url TEXT');
    await pool.query('ALTER TABLE songs ADD COLUMN IF NOT EXISTS r2_key TEXT');

    const alreadyRes = await pool.query(
      `SELECT COUNT(*)::int AS cnt, COALESCE(SUM(file_size_bytes::bigint), 0)::bigint AS bytes
       FROM songs WHERE r2_url IS NOT NULL AND r2_url != ''`
    );
    let r2Bytes = usedBytesAlready + Number(alreadyRes.rows[0].bytes || 0);
    const alreadyCount = alreadyRes.rows[0].cnt;

    const todoRes = await pool.query(
      `SELECT id, title, artist, file_size_bytes, telegram_file_id
       FROM songs
       WHERE (r2_url IS NULL OR r2_url = '')
       ORDER BY id DESC`
    );
    const todo = todoRes.rows;
    console.log(
      `[Songs] Already on R2: ${alreadyCount} | Pending: ${todo.length} | Current R2 footprint: ${(r2Bytes / 1073741824).toFixed(3)} GB / 9.000 GB free cap`
    );

    let migrated = 0;
    let failed = 0;
    let capped = 0;
    let cursor = 0;

    const worker = async () => {
      while (cursor < todo.length) {
        const song = todo[cursor++];
        const estBytes = Number(song.file_size_bytes || 0);
        if (r2Bytes + estBytes > MAX_R2_BYTES) {
          capped++;
          continue;
        }
        const key = `songs/${song.id}.mp3`;
        const publicUrl = `${R2_PUBLIC_URL}/${key}`;

        try {
          const head = await r2Head(key);
          if (head.exists && head.size > 10000) {
            if (!DRY_RUN) {
              await pool.query('UPDATE songs SET r2_url = $1, r2_key = $2 WHERE id = $3', [publicUrl, key, song.id]);
            }
            r2Bytes += head.size;
            migrated++;
            continue;
          }

          if (DRY_RUN) {
            r2Bytes += estBytes;
            migrated++;
            continue;
          }

          const audioBuf = await downloadFromTelegram(song.telegram_file_id);
          if (audioBuf.length < 10000) throw new Error(`Audio too small (${audioBuf.length} bytes)`);

          await r2Request({
            method: 'PUT',
            key,
            body: audioBuf,
            contentType: 'audio/mpeg',
            cacheControl: 'public, max-age=31536000, immutable',
          });

          await pool.query('UPDATE songs SET r2_url = $1, r2_key = $2, file_size_bytes = $3 WHERE id = $4', [
            publicUrl,
            key,
            audioBuf.length,
            song.id,
          ]);

          r2Bytes += audioBuf.length;
          migrated++;
          if (migrated % 25 === 0 || migrated === todo.length) {
            console.log(
              `[Songs] Migrated ${migrated}/${todo.length} (${(r2Bytes / 1073741824).toFixed(3)} GB / 9.00 GB cap) — latest: #${song.id} ${song.title}`
            );
          }
        } catch (err) {
          failed++;
          console.warn(`[Songs WARN] #${song.id} (${song.title}) kept on Telegram fallback: ${err.message}`);
        }
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
    console.log(
      `[Songs] Complete! Migrated: ${migrated}, Failed (kept on Telegram): ${failed}, Overflow capped (>9 GB, kept on Telegram): ${capped}, Total R2: ${(r2Bytes / 1073741824).toFixed(3)} GB`
    );
  } finally {
    await pool.end();
  }
}

async function main() {
  assertConfig();
  console.log(`=== Melody R2 + Telegram Hybrid Sync ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'} ===`);
  console.log(`Bucket: ${R2_BUCKET_NAME} | Public URL: ${R2_PUBLIC_URL}`);

  // Verify bucket access first
  await r2Request({ method: 'HEAD' });
  console.log('[R2] Bucket credentials verified!');

  let usedBytes = 0;
  if (RUN_ALL || ONLY_APK) usedBytes += await syncApk();
  if (RUN_ALL || ONLY_COVERS) usedBytes += await syncCovers();
  if (RUN_ALL || ONLY_SONGS) await syncSongs(usedBytes);

  console.log('=== Sync Finished ===');
}

main().catch((err) => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
