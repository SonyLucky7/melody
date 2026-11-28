import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { Request, Response } from 'express';
import { config } from '../config';
import { query } from '../db/client';
import { telegramService, telegramAgent } from './telegram';

export interface StreamTokenPayload {
  songId: number;
  deviceId: string;
  exp: number; // unix timestamp in ms
}

// Active Spools Registry to manage concurrent streams and prevent disk overload
class ActiveSpoolManager {
  private activeCount = 0;
  private readonly maxLimit: number;

  constructor(maxLimit: number) {
    this.maxLimit = maxLimit;
  }

  canSpool(): boolean {
    return this.activeCount < this.maxLimit;
  }

  increment(): void {
    this.activeCount++;
  }

  decrement(): void {
    if (this.activeCount > 0) this.activeCount--;
  }

  getActiveCount(): number {
    return this.activeCount;
  }
}

export const spoolManager = new ActiveSpoolManager(config.maxConcurrentStreams);

/**
 * Generate an HMAC-SHA256 signed stream token valid for 10 minutes
 */
export function generateSignedStreamToken(songId: number, deviceId: string): string {
  const exp = Date.now() + 10 * 60 * 1000; // 10 minutes from now
  const payload = `${songId}:${deviceId}:${exp}`;
  const signature = crypto
    .createHmac('sha256', config.sessionSecret)
    .update(payload)
    .digest('hex');

  const tokenString = `${payload}:${signature}`;
  return Buffer.from(tokenString).toString('base64url');
}

/**
 * Verify signed stream token
 */
export function verifySignedStreamToken(token: string, expectedSongId: number): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const [songIdStr, deviceId, expStr, signature] = decoded.split(':');

    if (!songIdStr || !deviceId || !expStr || !signature) return false;

    const songId = parseInt(songIdStr, 10);
    const exp = parseInt(expStr, 10);

    if (songId !== expectedSongId) return false;
    if (Date.now() > exp) return false; // Expired

    const expectedSignature = crypto
      .createHmac('sha256', config.sessionSecret)
      .update(`${songId}:${deviceId}:${exp}`)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}

// In-memory song metadata cache (5-minute TTL so DB updates propagate automatically)
const songMetadataCache = new Map<number, {
  song: { id: number; title: string; artist: string; file_size_bytes: string; telegram_file_id: string };
  expiresAt: number;
}>();

// Set of files currently downloading to disk in background to avoid duplicate downloads
const activeBackgroundDownloads = new Set<string>();

// Max chunk size (1.5 MB ≈ ~50s of 256kbps audio) served directly from Telegram while background spool completes.
// Prevents Telegram CDN, Render proxy, or Vercel's 4.5 MB serverless limit from ever cutting audio mid-song!
const DIRECT_UNSPOOLED_CHUNK_BYTES = 1536 * 1024;
const isServerlessRuntime = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

/**
 * Trigger a deduplicated, full-speed background download of the complete audio file
 * directly from Telegram to local NVMe spool (dedicated Node server only; skipped on serverless).
 */
export function ensureBackgroundSpool(songId: number, fileId: string, expectedTotalBytes: number): void {
  if (isServerlessRuntime) return;
  const key = `song-${songId}`;
  const spoolPath = path.join(config.tempDir, `${key}.mp3`);
  if (activeBackgroundDownloads.has(key)) return;
  try {
    if (fs.existsSync(spoolPath)) {
      const st = fs.statSync(spoolPath);
      if (st.size > 100000 && (expectedTotalBytes === 0 || st.size >= expectedTotalBytes - 4096)) {
        return;
      }
    }
  } catch {}

  activeBackgroundDownloads.add(key);
  telegramService
    .downloadToFile(fileId, spoolPath)
    .catch((err) => {
      console.warn(`[Background Spool Notice] song-${songId}: ${err?.message || err}`);
    })
    .finally(() => {
      activeBackgroundDownloads.delete(key);
    });
}

/**
 * Handle Ultra-Fast, Zero-Cut Range Stream for an audio track
 */
export async function handleAudioStream(req: Request, res: Response, songId: number): Promise<void> {
  const isHead = req.method === 'HEAD';

  // 1. Fetch song metadata from in-memory cache (5-min TTL) or PostgreSQL
  const cachedEntry = songMetadataCache.get(songId);
  let song = cachedEntry && cachedEntry.expiresAt > Date.now() ? cachedEntry.song : undefined;
  if (!song) {
    const songRes = await query(
      `SELECT id, title, artist, file_size_bytes, telegram_file_id 
       FROM songs 
       WHERE id = $1`,
      [songId]
    );

    if (songRes.rows.length === 0) {
      res.status(404).json({ error: 'SONG_NOT_FOUND', message: 'Song not found.' });
      return;
    }

    song = songRes.rows[0];
    if (song) {
      songMetadataCache.set(songId, { song, expiresAt: Date.now() + 5 * 60 * 1000 });
    }
  }

  if (!song) {
    res.status(404).json({ error: 'SONG_NOT_FOUND', message: 'Song not found.' });
    return;
  }

  const expectedTotalBytes = parseInt(song.file_size_bytes || '0', 10);
  const spoolPath = path.join(config.tempDir, `song-${songId}.mp3`);

  // Fast Path 1: Instant Local Spool Stream (when complete file is cached on disk -> ZERO mid-song cuts!)
  if (fs.existsSync(spoolPath)) {
    try {
      const stat = fs.statSync(spoolPath);
      if (stat.size > 100000 && (expectedTotalBytes === 0 || stat.size >= expectedTotalBytes - 4096)) {
        fs.utimes(spoolPath, new Date(), new Date(), () => {});
        serveFromDisk(req, res, spoolPath, stat.size);
        return;
      } else if (stat.size > 0 && expectedTotalBytes > 0 && stat.size < expectedTotalBytes - 4096) {
        fs.unlink(spoolPath, () => {});
      }
    } catch {}
  }

  // Fast Path 0: Instant 0ms response for HTTP HEAD requests (probed by ExoPlayer & Chrome)
  if (isHead && expectedTotalBytes > 0) {
    // Kick off background spool immediately on HEAD probe so audio is cached before first seek/next chunk!
    ensureBackgroundSpool(songId, song.telegram_file_id, expectedTotalBytes);
    const rangeHeader = req.headers.range;
    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = Math.max(0, parseInt(parts[0], 10) || 0);
      const end = parts[1] ? Math.min(parseInt(parts[1], 10), expectedTotalBytes - 1) : expectedTotalBytes - 1;
      const chunkSize = Math.max(0, end - start + 1);
      res.writeHead(206, {
        'Content-Type': 'audio/mpeg',
        'Accept-Ranges': 'bytes',
        'Content-Range': `bytes ${start}-${end}/${expectedTotalBytes}`,
        'Content-Length': chunkSize,
        'Cache-Control': 'public, max-age=604800, immutable',
        'X-Accel-Buffering': 'no',
      });
      res.end();
      return;
    } else {
      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Accept-Ranges': 'bytes',
        'Content-Length': expectedTotalBytes,
        'Cache-Control': 'public, max-age=604800, immutable',
        'X-Accel-Buffering': 'no',
      });
      res.end();
      return;
    }
  }

  // Immediately kick off full-speed background spool to local NVMe disk!
  // While this 1st chunk streams directly in <200ms, the entire MP3 saves locally in <1s,
  // so every subsequent chunk/seek plays from local disk with ZERO Telegram socket drops!
  if (!isHead) {
    ensureBackgroundSpool(songId, song.telegram_file_id, expectedTotalBytes);
  }

  // Direct High-Speed Streaming: Resolve Telegram file URL with automatic stale-URL retry
  const streamFromTelegram = async (attempt: number): Promise<void> => {
    const { downloadUrl } = await telegramService.getFileDownloadUrl(song!.telegram_file_id);
    let effectiveRangeHeader = req.headers.range;
    const protocol = downloadUrl.startsWith('https') ? https : http;

    // For Range requests on unspooled large tracks (and ALL requests on Vercel Serverless),
    // cap the direct upstream slice to 1.5 MB so responses stay well below Vercel's 4.5 MB limit
    // and never stall on slow mobile reads. Players automatically follow up with the next Range chunk!
    if (!isHead && expectedTotalBytes > DIRECT_UNSPOOLED_CHUNK_BYTES) {
      if (effectiveRangeHeader) {
        const match = /^bytes=(\d+)-(\d*)$/.exec(effectiveRangeHeader.trim());
        if (match) {
          const start = Math.max(0, parseInt(match[1], 10) || 0);
          const requestedEnd = match[2] ? parseInt(match[2], 10) : expectedTotalBytes - 1;
          const clampedEnd = Math.min(requestedEnd, expectedTotalBytes - 1);
          const cappedEnd = Math.min(clampedEnd, start + DIRECT_UNSPOOLED_CHUNK_BYTES - 1);
          if (start < expectedTotalBytes && cappedEnd >= start) {
            effectiveRangeHeader = `bytes=${start}-${cappedEnd}`;
          }
        }
      } else if (isServerlessRuntime) {
        effectiveRangeHeader = `bytes=0-${DIRECT_UNSPOOLED_CHUNK_BYTES - 1}`;
      }
    }

    const requestHeaders: Record<string, string> = {
      'User-Agent': 'MelodyPlayer/1.2',
    };
    if (effectiveRangeHeader) {
      requestHeaders['Range'] = effectiveRangeHeader;
    }

    res.socket?.setNoDelay(true);

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const done = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };

      const tgReq = protocol.get(downloadUrl, { agent: telegramAgent, headers: requestHeaders }, (tgRes) => {
        tgReq.setTimeout(0);

        const statusCode = tgRes.statusCode || 500;

        // If Telegram rejected (e.g. expired cached download URL -> 404/400), invalidate & retry once
        if (statusCode >= 400) {
          tgRes.resume();
          if (attempt === 0) {
            telegramService.invalidateCache(song!.telegram_file_id);
            streamFromTelegram(1).then(done).catch(reject);
            return;
          }
          if (!res.headersSent) {
            res.status(502).json({ error: 'UPSTREAM_STREAM_ERROR', message: `Audio CDN returned status ${statusCode}.` });
          }
          done();
          return;
        }

        const responseHeaders: Record<string, any> = {
          'Content-Type': 'audio/mpeg',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=86400, s-maxage=86400, immutable',
          'X-Accel-Buffering': 'no',
        };

        if (tgRes.headers['content-range']) {
          responseHeaders['Content-Range'] = tgRes.headers['content-range'];
        }
        if (tgRes.headers['content-length']) {
          responseHeaders['Content-Length'] = tgRes.headers['content-length'];
        }

        res.writeHead(statusCode, responseHeaders);

        if (isHead) {
          res.end();
          tgReq.destroy();
          done();
          return;
        }

        let tgFinishedCleanly = false;

        tgRes.on('end', () => {
          tgFinishedCleanly = true;
          done();
        });

        tgRes.on('error', () => {
          if (!res.writableEnded) {
            res.destroy();
          }
          done();
        });

        tgRes.pipe(res);

        req.on('close', () => {
          if (!tgFinishedCleanly) {
            tgReq.destroy();
          }
          done();
        });
      });

      tgReq.setTimeout(15000, () => {
        if (!res.headersSent) {
          tgReq.destroy(new Error('Telegram streaming connect timeout'));
        }
      });

      tgReq.on('error', (err) => {
        if (!res.headersSent) {
          if (attempt === 0) {
            telegramService.invalidateCache(song!.telegram_file_id);
            streamFromTelegram(1).then(done).catch(reject);
            return;
          }
          console.error('[Direct Stream Error]:', err.message);
          res.status(502).json({ error: 'STREAM_ERROR', message: 'Failed to proxy audio stream.' });
        } else if (!res.writableEnded) {
          res.destroy();
        }
        done();
      });
    });
  };

  try {
    await streamFromTelegram(0);
  } catch (err: any) {
    console.error(`[Streaming Failure for Song ${songId}]:`, err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'STREAM_ERROR', message: 'Failed to stream audio track.' });
    }
  }
}

/**
 * Serve audio range from local spool disk in 1 - 2 ms (RFC 7233 compliant, zero socket leaks)
 */
function serveFromDisk(req: Request, res: Response, filePath: string, totalSize: number): void {
  const isHead = req.method === 'HEAD';
  const range = req.headers.range;
  res.socket?.setNoDelay(true);

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const rawStart = parseInt(parts[0], 10);
    const start = isNaN(rawStart) ? 0 : Math.max(0, rawStart);
    // RFC 7233: Clamp end to totalSize - 1 instead of rejecting with 416 when client requests past EOF!
    const rawEnd = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
    const end = isNaN(rawEnd) ? totalSize - 1 : Math.min(rawEnd, totalSize - 1);

    if (start >= totalSize || start > end) {
      res.status(416).set({ 'Content-Range': `bytes */${totalSize}` }).end();
      return;
    }

    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${totalSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=604800, immutable',
      'X-Accel-Buffering': 'no',
    });

    if (isHead) {
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath, {
      start,
      end,
      highWaterMark: 64 * 1024,
    });

    stream.on('error', () => {
      if (!res.writableEnded) res.destroy();
    });
    req.on('close', () => {
      if (!stream.destroyed) stream.destroy();
    });

    stream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': totalSize,
      'Content-Type': 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=604800, immutable',
      'X-Accel-Buffering': 'no',
    });

    if (isHead) {
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath, {
      highWaterMark: 64 * 1024,
    });

    stream.on('error', () => {
      if (!res.writableEnded) res.destroy();
    });
    req.on('close', () => {
      if (!stream.destroyed) stream.destroy();
    });

    stream.pipe(res);
  }
}
