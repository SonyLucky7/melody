import https from 'https';
import http from 'http';
import crypto from 'crypto';
import pg from 'pg';
import jwt from 'jsonwebtoken';

const { Pool } = pg;

const DIRECT_CHUNK_BYTES = 1536 * 1024; // 1.5 MB per HTTP 206 chunk (3x below Vercel's 4.5 MB limit!)
const telegramAgent = new https.Agent({ keepAlive: true, maxSockets: 64, timeout: 60000 });

let pool = null;
const songMetaCache = new Map();
const tgUrlCache = new Map();
const fileBotAffinity = new Map();

function getPool() {
  if (pool) return pool;
  const rawUrl = (process.env.DATABASE_URL || '').trim();
  if (!rawUrl) return null;
  const sanitized = rawUrl.split('?')[0];
  pool = new Pool({
    connectionString: sanitized,
    ssl: { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 15000,
    connectionTimeoutMillis: 8000,
    allowExitOnIdle: true,
  });
  pool.on('error', () => {});
  return pool;
}

function getBotTokens() {
  const raw = process.env.TELEGRAM_BOT_TOKENS || process.env.TELEGRAM_BOT_TOKEN || '';
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

const CURATED_PLAYLISTS = [
  {
    id: 14,
    name: 'A Telugu',
    description: 'Vennelave Vennelave, Maate Vinadhuga, Inthandham, Emai Poyave, Hoyna Hoyna & Telugu melodies.',
    total_songs: 25,
    cover_url:
      'https://mosaic.scdn.co/640/ab67616d00001e02455b426149833ff977f81656ab67616d00001e027e23cd1ca5abcf039d176f08ab67616d00001e027fe12eefb56610912fa8f9b4ab67616d00001e0284351604b643064b97982db5',
    query: `SELECT s.id, s.title, s.artist, s.album, s.language, s.duration_seconds, s.cover_url FROM playlist_songs ps JOIN songs s ON s.id = ps.song_id WHERE ps.playlist_id = 14 ORDER BY ps.position ASC, ps.song_id ASC`,
  },
  {
    id: 13,
    name: 'Top The Weeknd Songs',
    description: 'Blinding Lights, Starboy, Save Your Tears, Die For You, Timeless, São Paulo & global hits.',
    total_songs: 28,
    cover_url: 'https://melody-chi-nine.vercel.app/covers/the-weeknd-avatar.jpg',
    query: `SELECT s.id, s.title, s.artist, s.album, s.language, s.duration_seconds, s.cover_url FROM playlist_songs ps JOIN songs s ON s.id = ps.song_id WHERE ps.playlist_id = 13 ORDER BY ps.position ASC, ps.song_id ASC`,
  },
  {
    id: 10,
    name: 'Motivation Vol. 1',
    description: 'Drake, Lil Wayne, 50 Cent, Eminem & high-energy workout bangers.',
    total_songs: 92,
    cover_url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80',
    query: `SELECT id, title, artist, album, language, duration_seconds, cover_url FROM songs WHERE album = 'Motivation Vol. 1' ORDER BY id DESC`,
  },
  {
    id: 11,
    name: 'Motivation Vol. 2',
    description: 'Trophies, Steady Mobbin, We Dem Boyz, Black and Yellow workout power.',
    total_songs: 91,
    cover_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80',
    query: `SELECT id, title, artist, album, language, duration_seconds, cover_url FROM songs WHERE album = 'Motivation Vol. 2' ORDER BY id DESC`,
  },
  {
    id: 12,
    name: 'Brazil Phonk Essentials',
    description: 'Montagem, Automotivo, Brazilian drift phonk, funk pesado & bass boosts.',
    total_songs: 327,
    cover_url: 'https://image-cdn-ak.spotifycdn.com/image/ab67706c0000d72c469ab8293c7d2056b6c9df23',
    query: `SELECT id, title, artist, album, language, duration_seconds, cover_url FROM songs WHERE LOWER(album) LIKE '%brazil%' OR LOWER(title) LIKE '%montagem%' OR LOWER(title) LIKE '%automotivo%' OR LOWER(album) LIKE '%phonk%' OR LOWER(language) = 'phonk' OR LOWER(title) LIKE '%phonk%' OR id IN (SELECT song_id FROM playlist_songs WHERE playlist_id = 12) ORDER BY id DESC`,
  },
  {
    id: 9,
    name: 'TikTok Phonk',
    description: 'Kordhell, DVRST, Hensonn, phonk drift and bass heavy tracks.',
    total_songs: 323,
    cover_url: 'https://image-cdn-ak.spotifycdn.com/image/ab67706c0000d72c469ab8293c7d2056b6c9df23',
    query: `SELECT id, title, artist, album, language, duration_seconds, cover_url FROM songs WHERE LOWER(album) LIKE '%phonk%' OR LOWER(album) LIKE '%brazil%' OR LOWER(language) = 'phonk' OR LOWER(title) LIKE '%phonk%' OR LOWER(title) LIKE '%montagem%' OR LOWER(title) LIKE '%automotivo%' ORDER BY id DESC`,
  },
  {
    id: 3,
    name: 'Slowed + Reverb Essentials',
    description: 'Late night slowed and reverbed vibes, lofi & atmospheric chill.',
    total_songs: 137,
    cover_url: 'https://melody-chi-nine.vercel.app/covers/weeknd-song-7.jpg',
    query: `SELECT id, title, artist, album, language, duration_seconds, cover_url FROM songs WHERE LOWER(title) LIKE '%slowed%' OR LOWER(title) LIKE '%reverb%' OR LOWER(album) LIKE '%slowed%' ORDER BY id DESC`,
  },
  {
    id: 4,
    name: 'Sidhu Moose Wala Legends',
    description: '295, The Last Ride, Legend, Levels, So High & all iconic anthems.',
    total_songs: 9,
    cover_url: 'https://melody-chi-nine.vercel.app/covers/desi-295-mvs26s80.jpg',
    query: `SELECT id, title, artist, album, language, duration_seconds, cover_url FROM songs WHERE LOWER(artist) LIKE '%moose wala%' ORDER BY id DESC`,
  },
  {
    id: 5,
    name: 'Yo Yo Honey Singh Blockbusters',
    description: 'Dope Shope, Blue Eyes, Desi Kalakaar, Love Dose & legendary Punjabi hits.',
    total_songs: 10,
    cover_url: 'https://melody-chi-nine.vercel.app/covers/desi-dope-shope-mvs2dv2r.jpg',
    query: `SELECT id, title, artist, album, language, duration_seconds, cover_url FROM songs WHERE LOWER(artist) LIKE '%honey singh%' ORDER BY id DESC`,
  },
  {
    id: 6,
    name: 'The Weeknd Master Collection',
    description: 'Blinding Lights, Starboy, After Hours, Die For You & Abel classics.',
    total_songs: 54,
    cover_url: 'https://melody-chi-nine.vercel.app/covers/the-weeknd-avatar.jpg',
    query: `SELECT id, title, artist, album, language, duration_seconds, cover_url FROM songs WHERE LOWER(artist) LIKE '%weeknd%' ORDER BY id DESC`,
  },
  {
    id: 7,
    name: 'Lana Del Rey Aesthetics',
    description: 'Summertime Sadness, Video Games, Young and Beautiful, Born to Die.',
    total_songs: 31,
    cover_url: 'https://melody-chi-nine.vercel.app/covers/lana-collection.jpg',
    query: `SELECT id, title, artist, album, language, duration_seconds, cover_url FROM songs WHERE LOWER(artist) LIKE '%lana%' ORDER BY id DESC`,
  },
  {
    id: 8,
    name: 'Ariana Grande Top Hits',
    description: '7 rings, thank u next, Dangerous Woman, positions & pop royalty.',
    total_songs: 60,
    cover_url: 'https://melody-chi-nine.vercel.app/covers/ariana-7-rings-mvrzjch5.jpg',
    query: `SELECT id, title, artist, album, language, duration_seconds, cover_url FROM songs WHERE LOWER(artist) LIKE '%ariana%' ORDER BY id DESC`,
  },
];

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type,Authorization,x-device-id,x-device-token,x-admin-secret,Range'
  );
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range,Content-Length,Accept-Ranges,Content-Type');
}

function sendJson(res, status, data, cacheControl) {
  setCors(res);
  if (cacheControl) res.setHeader('Cache-Control', cacheControl);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function getSession(req) {
  const deviceId = String(req.headers['x-device-id'] || '').trim();
  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const secret = process.env.SESSION_SECRET || 'melody-secure-session-secret-change-in-env';
  if (token) {
    try {
      const payload = jwt.verify(token, secret);
      return {
        licenceId: Number(payload.licenceId) || 0,
        deviceId: payload.deviceId || deviceId || 'guest',
      };
    } catch {
      // Stale token degrades gracefully to guest mode
    }
  }
  return { licenceId: 0, deviceId: deviceId || '' };
}

function fetchTelegramJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { agent: telegramAgent, timeout: 10000 }, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error('Telegram timeout')));
    req.on('error', reject);
  });
}

async function resolveTelegramUrl(fileId) {
  const cached = tgUrlCache.get(fileId);
  if (cached && cached.expiresAt > Date.now()) return cached.downloadUrl;

  const tokens = getBotTokens();
  if (tokens.length === 0) throw new Error('TELEGRAM_BOT_TOKENS not configured');

  const tryBot = async (idx) => {
    const token = tokens[idx];
    const data = await fetchTelegramJson(
      `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`
    );
    if (data && data.ok && data.result && data.result.file_path) {
      const downloadUrl = `https://api.telegram.org/file/bot${token}/${data.result.file_path}`;
      fileBotAffinity.set(fileId, idx);
      tgUrlCache.set(fileId, { downloadUrl, expiresAt: Date.now() + 45 * 60 * 1000 });
      return downloadUrl;
    }
    throw new Error(data?.description || 'getFile failed');
  };

  const aff = fileBotAffinity.get(fileId);
  if (aff !== undefined && aff < tokens.length) {
    try {
      return await tryBot(aff);
    } catch {
      fileBotAffinity.delete(fileId);
    }
  }

  return await Promise.any(tokens.map((_, idx) => tryBot(idx)));
}

async function handleStream(req, res, songId, forceTelegram = false) {
  const db = getPool();
  const isHead = req.method === 'HEAD';
  let song = songMetaCache.get(songId);
  if (!song || song.expiresAt <= Date.now()) {
    const r = await db.query(
      'SELECT id, title, artist, file_size_bytes, telegram_file_id, r2_url, r2_key FROM songs WHERE id = $1',
      [songId]
    );
    if (r.rows.length === 0) return sendJson(res, 404, { error: 'SONG_NOT_FOUND', message: 'Song not found.' });
    song = { ...r.rows[0], expiresAt: Date.now() + 5 * 60 * 1000 };
    songMetaCache.set(songId, song);
  }

  // Hybrid Fast Path: Cloudflare R2 Global Edge (₹0 unlimited egress, 0ms seek, zero Vercel payload cap!)
  const r2PublicBase = (process.env.R2_PUBLIC_URL || '').trim().replace(/\/+$/, '');
  const effectiveR2Url =
    song.r2_url && /^https?:\/\//i.test(song.r2_url)
      ? song.r2_url.trim()
      : song.r2_key && r2PublicBase
        ? `${r2PublicBase}/${String(song.r2_key).replace(/^\/+/, '')}`
        : '';

  if (effectiveR2Url && !forceTelegram) {
    setCors(res);
    res.writeHead(302, {
      Location: effectiveR2Url,
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'X-Melody-Storage': 'cloudflare-r2',
    });
    res.end();
    return;
  }

  const totalBytes = parseInt(song.file_size_bytes || '0', 10);

  if (isHead && totalBytes > 0) {
    setCors(res);
    const range = req.headers.range;
    if (range) {
      const m = /^bytes=(\d+)-(\d*)$/.exec(String(range).trim());
      const start = m ? Math.max(0, parseInt(m[1], 10) || 0) : 0;
      const end = m && m[2] ? Math.min(parseInt(m[2], 10), totalBytes - 1) : totalBytes - 1;
      res.writeHead(206, {
        'Content-Type': 'audio/mpeg',
        'Accept-Ranges': 'bytes',
        'Content-Range': `bytes ${start}-${end}/${totalBytes}`,
        'Content-Length': Math.max(0, end - start + 1),
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, immutable',
        'X-Melody-Storage': 'telegram-pool',
      });
    } else {
      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Accept-Ranges': 'bytes',
        'Content-Length': totalBytes,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, immutable',
        'X-Melody-Storage': 'telegram-pool',
      });
    }
    res.end();
    return;
  }

  const proxyAttempt = async (attempt) => {
    const downloadUrl = await resolveTelegramUrl(song.telegram_file_id);
    let rangeHeader = req.headers.range ? String(req.headers.range).trim() : '';

    // Cap EVERY chunk to <= 1.5 MB so Vercel's 4.5 MB payload cap is never hit!
    if (totalBytes > DIRECT_CHUNK_BYTES) {
      if (rangeHeader) {
        const m = /^bytes=(\d+)-(\d*)$/.exec(rangeHeader);
        if (m) {
          const start = Math.max(0, parseInt(m[1], 10) || 0);
          const reqEnd = m[2] ? parseInt(m[2], 10) : totalBytes - 1;
          const clampedEnd = Math.min(reqEnd, totalBytes - 1);
          const cappedEnd = Math.min(clampedEnd, start + DIRECT_CHUNK_BYTES - 1);
          if (start < totalBytes && cappedEnd >= start) {
            rangeHeader = `bytes=${start}-${cappedEnd}`;
          }
        }
      } else {
        rangeHeader = `bytes=0-${DIRECT_CHUNK_BYTES - 1}`;
      }
    }

    const headers = { 'User-Agent': 'MelodyVercelEdge/1.2.6' };
    if (rangeHeader) headers.Range = rangeHeader;

    const proto = downloadUrl.startsWith('https') ? https : http;
    return new Promise((resolve, reject) => {
      const tgReq = proto.get(downloadUrl, { agent: telegramAgent, headers, timeout: 15000 }, (tgRes) => {
        const sc = tgRes.statusCode || 500;
        if (sc >= 400) {
          tgRes.resume();
          if (attempt === 0) {
            tgUrlCache.delete(song.telegram_file_id);
            fileBotAffinity.delete(song.telegram_file_id);
            proxyAttempt(1).then(resolve).catch(reject);
            return;
          }
          sendJson(res, 502, { error: 'UPSTREAM_STREAM_ERROR', message: `Audio CDN returned ${sc}` });
          resolve();
          return;
        }
        setCors(res);
        const outHeaders = {
          'Content-Type': 'audio/mpeg',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=86400, s-maxage=86400, immutable',
          'X-Accel-Buffering': 'no',
          'X-Melody-Storage': 'telegram-pool',
        };
        if (tgRes.headers['content-range']) outHeaders['Content-Range'] = tgRes.headers['content-range'];
        if (tgRes.headers['content-length']) outHeaders['Content-Length'] = tgRes.headers['content-length'];
        res.writeHead(sc, outHeaders);
        if (isHead) {
          res.end();
          tgReq.destroy();
          resolve();
          return;
        }
        tgRes.pipe(res);
        tgRes.on('end', resolve);
        tgRes.on('error', () => {
          if (!res.writableEnded) res.destroy();
          resolve();
        });
      });
      tgReq.on('error', (err) => {
        if (!res.headersSent && attempt === 0) {
          tgUrlCache.delete(song.telegram_file_id);
          proxyAttempt(1).then(resolve).catch(reject);
          return;
        }
        reject(err);
      });
    });
  };

  try {
    await proxyAttempt(0);
  } catch (err) {
    if (!res.headersSent) {
      sendJson(res, 502, { error: 'STREAM_ERROR', message: err.message || 'Audio stream unavailable.' });
    }
  }
}

function proxyRenderFallback(req, res) {
  const targetUrl = `https://melody-mzsm.onrender.com${req.url || '/'}`;
  const headers = { ...req.headers, host: 'melody-mzsm.onrender.com' };
  delete headers['content-length'];

  return new Promise((resolve) => {
    const pReq = https.request(targetUrl, { method: req.method, headers, timeout: 12000 }, (pRes) => {
      if (pRes.statusCode === 503) {
        pRes.resume();
        sendJson(res, 503, {
          error: 'BACKEND_ENV_REQUIRED',
          message:
            'Add DATABASE_URL and TELEGRAM_BOT_TOKENS in Vercel Project Settings -> Environment Variables to run Melody 24/7 on Vercel Serverless.',
        });
        resolve();
        return;
      }
      setCors(res);
      res.writeHead(pRes.statusCode || 502, pRes.headers);
      pRes.pipe(res);
      pRes.on('end', resolve);
    });
    pReq.on('error', (err) => {
      if (!res.headersSent) sendJson(res, 503, { error: 'UPSTREAM_UNAVAILABLE', message: err.message });
      resolve();
    });
    if (req.method !== 'GET' && req.method !== 'HEAD') req.pipe(pReq);
    else pReq.end();
  });
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const db = getPool();
  if (!db) {
    return await proxyRenderFallback(req, res);
  }

  const urlObj = new URL(req.url || '/', 'https://melody-chi-nine.vercel.app');
  const pathname = urlObj.pathname.replace(/\/+$/, '') || '/';
  const method = (req.method || 'GET').toUpperCase();
  const session = getSession(req);

  try {
    // 1. Health check
    if (pathname === '/health' || pathname === '/api/health') {
      const check = await db.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(CASE WHEN r2_url IS NOT NULL AND r2_url != '' THEN 1 END)::int AS r2_count,
                COALESCE(SUM(file_size_bytes::bigint), 0)::bigint AS total_bytes
         FROM songs`
      );
      const total = check.rows[0]?.total || 0;
      const r2Tracks = check.rows[0]?.r2_count || 0;
      const totalGb = Number((Number(check.rows[0]?.total_bytes || 0) / 1073741824).toFixed(2));
      return sendJson(res, 200, {
        status: 'healthy',
        version: '1.2.7-hybrid-r2-telegram',
        runtime: 'vercel-serverless',
        database: 'connected',
        songsCount: total,
        freeMode: true,
        telegramBotsConfigured: getBotTokens().length,
        storage: {
          mode: 'hybrid-r2-telegram',
          r2Tracks,
          telegramFallbackTracks: Math.max(0, total - r2Tracks),
          totalLibraryGb: totalGb,
          r2PublicUrlConfigured: Boolean((process.env.R2_PUBLIC_URL || '').trim()),
        },
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Audio Stream & Prewarm
    let m = pathname.match(/^\/(?:api\/)?stream\/(\d+)\/prewarm$/);
    if (m && method === 'GET') {
      const id = parseInt(m[1], 10);
      const r = await db.query('SELECT telegram_file_id, r2_url FROM songs WHERE id = $1', [id]);
      if (r.rows[0]?.r2_url) {
        return sendJson(res, 200, { success: true, songId: id, storage: 'cloudflare-r2' });
      }
      if (r.rows[0]?.telegram_file_id) {
        resolveTelegramUrl(r.rows[0].telegram_file_id).catch(() => {});
      }
      return sendJson(res, 200, { success: true, songId: id, storage: 'telegram-pool' });
    }

    m = pathname.match(/^\/(?:api\/)?stream\/(\d+)$/);
    if (m && (method === 'GET' || method === 'HEAD')) {
      const forceTelegram = urlObj.searchParams.get('source') === 'telegram';
      return await handleStream(req, res, parseInt(m[1], 10), forceTelegram);
    }

    // 3. Songs Catalog & Details
    if (pathname === '/api/songs' && method === 'GET') {
      const search = (urlObj.searchParams.get('search') || '').trim();
      const language = (urlObj.searchParams.get('language') || '').trim();
      const limit = Math.min(parseInt(urlObj.searchParams.get('limit') || '50', 10) || 50, 1000);
      const offset = Math.max(parseInt(urlObj.searchParams.get('offset') || '0', 10) || 0, 0);

      const where = [];
      const params = [];
      let pIdx = 1;
      if (search) {
        where.push(`(LOWER(title) LIKE $${pIdx} OR LOWER(artist) LIKE $${pIdx} OR LOWER(album) LIKE $${pIdx})`);
        params.push(`%${search.toLowerCase()}%`);
        pIdx++;
      }
      if (language) {
        where.push(`LOWER(language) = $${pIdx}`);
        params.push(language.toLowerCase());
        pIdx++;
      }
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const [dataRes, countRes] = await Promise.all([
        db.query(
          `SELECT id, title, artist, album, language, duration_seconds, file_size_bytes, cover_url, created_at FROM songs ${whereSql} ORDER BY id DESC LIMIT $${pIdx} OFFSET $${pIdx + 1}`,
          [...params, limit, offset]
        ),
        db.query(`SELECT COUNT(*)::int AS total FROM songs ${whereSql}`, params),
      ]);

      const cache = search ? undefined : 'public, max-age=30, s-maxage=60, stale-while-revalidate=300';
      return sendJson(
        res,
        200,
        {
          success: true,
          data: dataRes.rows,
          total: countRes.rows[0]?.total || 0,
          limit,
          offset,
        },
        cache
      );
    }

    m = pathname.match(/^\/api\/songs\/(\d+)\/play$/);
    if (m && method === 'GET') {
      const songId = parseInt(m[1], 10);
      return sendJson(res, 200, {
        success: true,
        songId,
        streamUrl: `/api/stream/${songId}`,
        expiresInSeconds: 600,
      });
    }

    m = pathname.match(/^\/api\/songs\/(\d+)\/played$/);
    if (m && method === 'POST') {
      const songId = parseInt(m[1], 10);
      if (session.licenceId > 0) {
        await db.query('INSERT INTO recent_plays (licence_id, device_id, song_id) VALUES ($1, $2, $3)', [
          session.licenceId,
          session.deviceId || null,
          songId,
        ]);
      } else if (session.deviceId) {
        await db.query('INSERT INTO recent_plays (licence_id, device_id, song_id) VALUES (NULL, $1, $2)', [
          session.deviceId,
          songId,
        ]);
      }
      return sendJson(res, 200, { success: true });
    }

    m = pathname.match(/^\/api\/songs\/(\d+)$/);
    if (m && method === 'GET') {
      const r = await db.query(
        'SELECT id, title, artist, album, language, duration_seconds, file_size_bytes, cover_url, created_at FROM songs WHERE id = $1',
        [parseInt(m[1], 10)]
      );
      if (!r.rows.length) return sendJson(res, 404, { error: 'NOT_FOUND', message: 'Song not found.' });
      return sendJson(res, 200, { success: true, data: r.rows[0] });
    }

    // 4. Recently Played History
    if (pathname === '/api/history' && method === 'GET') {
      if (session.licenceId <= 0 && !session.deviceId) {
        return sendJson(res, 200, { success: true, data: [], total: 0 });
      }
      const hist = await db.query(
        `SELECT s.id, s.title, s.artist, s.album, s.language, s.duration_seconds, s.cover_url, MAX(rp.played_at) AS last_played
         FROM recent_plays rp
         JOIN songs s ON s.id = rp.song_id
         WHERE (($1 > 0 AND rp.licence_id = $1) OR ($1 = 0 AND $2 != '' AND rp.device_id = $2))
         GROUP BY s.id
         ORDER BY last_played DESC
         LIMIT 50`,
        [session.licenceId, session.deviceId]
      );
      return sendJson(res, 200, { success: true, data: hist.rows, total: hist.rows.length });
    }

    // 5. Playlists
    if (pathname === '/api/playlists' && method === 'GET') {
      const dbPl = await db.query(
        `SELECT p.id, p.name, p.created_at, p.is_public, p.licence_id, p.device_id, COUNT(ps.song_id)::int AS total_songs
         FROM playlists p
         LEFT JOIN playlist_songs ps ON ps.playlist_id = p.id
         WHERE (p.is_public = true OR ($1 > 0 AND p.licence_id = $1) OR ($1 = 0 AND $2 != '' AND p.device_id = $2))
         GROUP BY p.id
         HAVING (($1 > 0 AND p.licence_id = $1) OR ($1 = 0 AND $2 != '' AND p.device_id = $2) OR (p.is_public = true AND COUNT(ps.song_id) > 0))
         ORDER BY p.id DESC`,
        [session.licenceId, session.deviceId]
      );
      const curated = CURATED_PLAYLISTS.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        cover_url: c.cover_url,
        total_songs: c.total_songs,
        is_public: true,
        created_at: new Date().toISOString(),
      }));
      const extra = dbPl.rows
        .filter((r) => !CURATED_PLAYLISTS.some((c) => c.id === r.id))
        .map(({ licence_id, device_id, ...rest }) => rest);
      return sendJson(res, 200, { success: true, data: [...curated, ...extra] });
    }

    if (pathname === '/api/playlists' && method === 'POST') {
      const body = await readBody(req);
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name) return sendJson(res, 400, { error: 'BAD_REQUEST', message: 'Playlist name is required.' });
      const created = await db.query(
        `INSERT INTO playlists (licence_id, device_id, name, is_public) VALUES ($1, $2, $3, false) RETURNING id, name, created_at`,
        [session.licenceId > 0 ? session.licenceId : null, session.deviceId || 'guest-device', name]
      );
      return sendJson(res, 201, { success: true, data: { ...created.rows[0], total_songs: 0 } });
    }

    m = pathname.match(/^\/api\/playlists\/(\d+)$/);
    if (m && method === 'GET') {
      const pid = parseInt(m[1], 10);
      const curated = CURATED_PLAYLISTS.find((c) => c.id === pid);
      if (curated) {
        const sr = await db.query(curated.query);
        return sendJson(
          res,
          200,
          {
            success: true,
            playlist: {
              id: curated.id,
              name: curated.name,
              description: curated.description,
              cover_url: curated.cover_url,
              total_songs: sr.rows.length,
              is_public: true,
            },
            songs: sr.rows,
          },
          'public, max-age=30, s-maxage=60, stale-while-revalidate=300'
        );
      }
      const pCheck = await db.query(
        `SELECT id, name FROM playlists WHERE id = $1 AND (is_public = true OR licence_id IS NULL OR ($2 > 0 AND licence_id = $2) OR ($2 = 0 AND $3 != '' AND device_id = $3))`,
        [pid, session.licenceId, session.deviceId]
      );
      if (!pCheck.rows.length) return sendJson(res, 404, { error: 'NOT_FOUND', message: 'Playlist not found.' });
      const sr = await db.query(
        `SELECT s.id, s.title, s.artist, s.album, s.language, s.duration_seconds, s.cover_url FROM playlist_songs ps JOIN songs s ON s.id = ps.song_id WHERE ps.playlist_id = $1 ORDER BY ps.position ASC, ps.song_id ASC`,
        [pid]
      );
      return sendJson(res, 200, { success: true, playlist: pCheck.rows[0], songs: sr.rows });
    }

    if (m && method === 'DELETE') {
      const pid = parseInt(m[1], 10);
      await db.query(
        `DELETE FROM playlists WHERE id = $1 AND (($2 > 0 AND licence_id = $2) OR ($2 = 0 AND $3 != '' AND device_id = $3))`,
        [pid, session.licenceId, session.deviceId]
      );
      return sendJson(res, 200, { success: true });
    }

    m = pathname.match(/^\/api\/playlists\/(\d+)\/songs$/);
    if (m && method === 'POST') {
      const pid = parseInt(m[1], 10);
      const body = await readBody(req);
      const songId = parseInt(body.songId, 10);
      if (isNaN(songId)) return sendJson(res, 400, { error: 'BAD_REQUEST', message: 'Valid songId required.' });
      await db.query(
        `INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES ($1, $2, COALESCE((SELECT MAX(position) + 1 FROM playlist_songs WHERE playlist_id = $1), 0)) ON CONFLICT DO NOTHING`,
        [pid, songId]
      );
      return sendJson(res, 200, { success: true });
    }

    m = pathname.match(/^\/api\/playlists\/(\d+)\/songs\/(\d+)$/);
    if (m && method === 'DELETE') {
      await db.query('DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2', [
        parseInt(m[1], 10),
        parseInt(m[2], 10),
      ]);
      return sendJson(res, 200, { success: true });
    }

    // 6. Favourites
    if (pathname === '/api/favourites' && method === 'GET') {
      const fav = await db.query(
        `SELECT DISTINCT ON (s.id) s.id, s.title, s.artist, s.album, s.language, s.duration_seconds, s.cover_url, f.created_at
         FROM favourites f JOIN songs s ON s.id = f.song_id
         WHERE (($1 > 0 AND f.licence_id = $1) OR ($1 = 0 AND $2 != '' AND f.device_id = $2))
         ORDER BY s.id, f.created_at DESC`,
        [session.licenceId, session.deviceId]
      );
      const sorted = fav.rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return sendJson(res, 200, { success: true, data: sorted, total: sorted.length });
    }

    m = pathname.match(/^\/api\/favourites\/(\d+)$/);
    if (m && method === 'POST') {
      const songId = parseInt(m[1], 10);
      if (session.licenceId > 0) {
        const exists = await db.query('SELECT id FROM favourites WHERE licence_id = $1 AND song_id = $2', [
          session.licenceId,
          songId,
        ]);
        if (!exists.rows.length) {
          await db.query('INSERT INTO favourites (licence_id, device_id, song_id) VALUES ($1, $2, $3)', [
            session.licenceId,
            session.deviceId || 'web',
            songId,
          ]);
        }
      } else {
        await db.query(
          'INSERT INTO favourites (device_id, song_id) VALUES ($1, $2) ON CONFLICT (device_id, song_id) DO NOTHING',
          [session.deviceId || 'anonymous-device', songId]
        );
      }
      return sendJson(res, 200, { success: true });
    }

    if (m && method === 'DELETE') {
      const songId = parseInt(m[1], 10);
      await db.query(
        `DELETE FROM favourites WHERE song_id = $1 AND (($2 > 0 AND licence_id = $2) OR ($2 = 0 AND $3 != '' AND device_id = $3))`,
        [songId, session.licenceId, session.deviceId]
      );
      return sendJson(res, 200, { success: true });
    }

    // 7. Licence Activation & Devices
    if ((pathname === '/activate' || pathname === '/api/activate') && method === 'POST') {
      const body = await readBody(req);
      const cleanKey = String(body.licenceKey || '').trim().replace(/[\s-]/g, '').toUpperCase();
      const deviceId = String(body.deviceId || session.deviceId || `dev-${crypto.randomBytes(6).toString('hex')}`);
      const deviceName = String(body.deviceName || 'Melody Device').slice(0, 60);
      const lic = await db.query('SELECT * FROM licences WHERE UPPER(REPLACE(licence_key, \'-\', \'\')) = $1 LIMIT 1', [
        cleanKey,
      ]);
      if (!lic.rows.length) {
        return sendJson(res, 404, { error: 'INVALID_KEY', message: 'Licence key not found.' });
      }
      const row = lic.rows[0];
      const secret = process.env.SESSION_SECRET || 'melody-secure-session-secret-change-in-env';
      const token = jwt.sign({ licenceId: row.id, deviceId }, secret, { expiresIn: '365d' });
      await db.query(
        `INSERT INTO device_sessions (licence_id, device_id, device_name, session_token, last_active_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (licence_id, device_id) DO UPDATE SET device_name = EXCLUDED.device_name, session_token = EXCLUDED.session_token, last_active_at = NOW()`,
        [row.id, deviceId, deviceName, token]
      );
      const formattedKey = row.licence_key.includes('-')
        ? row.licence_key
        : row.licence_key.replace(/(.{4})(.{4})(.{4})/, '$1-$2-$3');
      return sendJson(res, 200, {
        success: true,
        token,
        user: {
          firstName: row.first_name || 'Melody',
          surname: row.surname || 'Member',
          mobile: row.mobile || '',
          email: row.email || null,
          plan: row.plan || 'lifetime',
          expiresAt: row.expires_at || null,
          licenceKey: row.licence_key,
          formattedKey,
        },
      });
    }

    if ((pathname === '/devices' || pathname === '/api/devices') && method === 'GET') {
      if (session.licenceId <= 0) return sendJson(res, 200, { success: true, devices: [], user: null });
      const [devs, lic] = await Promise.all([
        db.query(
          'SELECT device_id, device_name, last_active_at FROM device_sessions WHERE licence_id = $1 ORDER BY last_active_at DESC',
          [session.licenceId]
        ),
        db.query('SELECT * FROM licences WHERE id = $1 LIMIT 1', [session.licenceId]),
      ]);
      const row = lic.rows[0];
      const user = row
        ? {
            firstName: row.first_name || 'Melody',
            surname: row.surname || 'Member',
            mobile: row.mobile || '',
            email: row.email || null,
            plan: row.plan || 'lifetime',
            expiresAt: row.expires_at || null,
            licenceKey: row.licence_key,
            formattedKey: row.licence_key.includes('-')
              ? row.licence_key
              : row.licence_key.replace(/(.{4})(.{4})(.{4})/, '$1-$2-$3'),
          }
        : null;
      return sendJson(res, 200, { success: true, devices: devs.rows, user });
    }

    return sendJson(res, 404, { error: 'NOT_FOUND', message: `Route ${method} ${pathname} not found.` });
  } catch (err) {
    console.error('[Melody Serverless Error]:', err);
    return sendJson(res, 500, { error: 'SERVER_ERROR', message: err.message || 'Internal error' });
  }
}
