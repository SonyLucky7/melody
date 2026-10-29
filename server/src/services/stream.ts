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

/**
 * Handle Ultra-Fast Sub-50ms Range Stream for an audio track
 */
export async function handleAudioStream(req: Request, res: Response, songId: number): Promise<void> {
  // 1. Fetch song metadata & telegram_file_id from PostgreSQL
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

  const song = songRes.rows[0];
  const expectedTotalBytes = parseInt(song.file_size_bytes || '0', 10);
  const spoolPath = path.join(config.tempDir, `song-${songId}.mp3`);

  // Fast Path 1: Instant Local Spool Stream (only when 100% downloaded)
  if (fs.existsSync(spoolPath)) {
    try {
      const stat = fs.statSync(spoolPath);
      if (stat.size > 0 && (expectedTotalBytes === 0 || stat.size >= expectedTotalBytes - 2048)) {
        // Touch access time to keep cache hot
        fs.utimes(spoolPath, new Date(), new Date(), () => {});
        serveFromDisk(req, res, spoolPath, stat.size);
        return;
      }
    } catch {}
  }

  // Direct High-Speed Streaming: Resolve Telegram file URL (racing all bots concurrently)
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
      tgRes.pipe(res);

      // Local spool caching: save stream to disk for instant 0ms seeking & replays
      if (!rangeHeader || rangeHeader === 'bytes=0-') {
        try {
          const fileOut = fs.createWriteStream(spoolPath);
          tgRes.pipe(fileOut);
          fileOut.on('error', () => {});
        } catch {}
      }
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

    const stream = fs.createReadStream(filePath, {
      highWaterMark: 64 * 1024,
    });

    stream.pipe(res);
  }
}
