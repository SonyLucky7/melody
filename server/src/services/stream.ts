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

// In-memory song metadata cache to eliminate redundant PostgreSQL queries on every Range request
const songMetadataCache = new Map<number, { id: number; title: string; artist: string; file_size_bytes: string; telegram_file_id: string }>();

// Set of files currently downloading to disk in background to avoid duplicate downloads
const activeBackgroundDownloads = new Set<string>();

/**
 * Handle Ultra-Fast Sub-50ms Range Stream for an audio track
 */
export async function handleAudioStream(req: Request, res: Response, songId: number): Promise<void> {
  const isHead = req.method === 'HEAD';

  // 1. Fetch song metadata from in-memory cache or PostgreSQL
  let song = songMetadataCache.get(songId);
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
      songMetadataCache.set(songId, song);
    }
  }

  if (!song) {
    res.status(404).json({ error: 'SONG_NOT_FOUND', message: 'Song not found.' });
    return;
  }

  const expectedTotalBytes = parseInt(song.file_size_bytes || '0', 10);
  const spoolPath = path.join(config.tempDir, `song-${songId}.mp3`);
  const tmpSpoolPath = path.join(config.tempDir, `song-${songId}.mp3.tmp`);

  // Fast Path 0: Instant 0ms response for HTTP HEAD requests (probed by ExoPlayer & Chrome)
  if (isHead && expectedTotalBytes > 0) {
    const rangeHeader = req.headers.range;
    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10) || 0;
      const end = parts[1] ? parseInt(parts[1], 10) : expectedTotalBytes - 1;
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

  // Fast Path 1: Instant Local Spool Stream (when downloaded)
  if (fs.existsSync(spoolPath)) {
    try {
      const stat = fs.statSync(spoolPath);
      if (stat.size > 500000 && (expectedTotalBytes === 0 || stat.size >= expectedTotalBytes - 4096)) {
        // Touch access time to keep cache hot
        fs.utimes(spoolPath, new Date(), new Date(), () => {});
        serveFromDisk(req, res, spoolPath, stat.size);
        return;
      }
    } catch {}
  }

  // Direct High-Speed Streaming: Resolve Telegram file URL
  try {
    const { downloadUrl } = await telegramService.getFileDownloadUrl(song.telegram_file_id);

    // Stream range immediately from Telegram's file CDN directly to client
    const rangeHeader = req.headers.range;
    const protocol = downloadUrl.startsWith('https') ? https : http;

    const requestHeaders: Record<string, string> = {
      'User-Agent': 'MelodyPlayer/1.0',
    };
    if (rangeHeader) {
      requestHeaders['Range'] = rangeHeader;
    }

    // Flush socket immediately without TCP buffering delay
    res.socket?.setNoDelay(true);

    const tgReq = protocol.get(downloadUrl, { agent: telegramAgent, headers: requestHeaders }, (tgRes) => {
      const statusCode = tgRes.statusCode || (rangeHeader ? 206 : 200);

      const responseHeaders: Record<string, any> = {
        'Content-Type': 'audio/mpeg',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=604800, immutable',
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
        return;
      }

      tgRes.pipe(res);

      // Local spool caching: save stream to disk atomically for instant 0ms seeking & replays
      if (!rangeHeader || rangeHeader === 'bytes=0-') {
        if (!fs.existsSync(spoolPath) && !fs.existsSync(tmpSpoolPath)) {
          try {
            const fileOut = fs.createWriteStream(tmpSpoolPath);
            tgRes.pipe(fileOut);
            fileOut.on('finish', async () => {
              try {
                await fs.promises.rename(tmpSpoolPath, spoolPath);
              } catch {}
            });
            fileOut.on('error', () => {
              fs.unlink(tmpSpoolPath, () => {});
            });
          } catch {}
        }
      }
    });

    tgReq.setTimeout(25000, () => {
      tgReq.destroy(new Error('Telegram streaming request timed out'));
    });

    tgReq.on('error', (err) => {
      console.error('[Direct Stream Error]:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'STREAM_ERROR', message: 'Failed to proxy audio stream.' });
      }
    });

    req.on('close', () => {
      tgReq.destroy();
    });
  } catch (err: any) {
    console.error(`[Streaming Failure for Song ${songId}]:`, err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'STREAM_ERROR', message: 'Failed to stream audio track.' });
    }
  }
}

/**
 * Serve audio range from local spool disk in 1 - 2 ms
 */
function serveFromDisk(req: Request, res: Response, filePath: string, totalSize: number): void {
  const isHead = req.method === 'HEAD';
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

    if (start >= totalSize || end >= totalSize || start > end) {
      res.status(416).set({ 'Content-Range': `bytes */${totalSize}` }).end();
      return;
    }

    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${totalSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=1800',
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

    stream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': totalSize,
      'Content-Type': 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=1800',
    });

    if (isHead) {
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath, {
      highWaterMark: 64 * 1024,
    });

    stream.pipe(res);
  }
}
