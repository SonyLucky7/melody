import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { config } from '../config';
import { query } from '../db/client';
import { telegramService } from './telegram';

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
 * Handle HTTP 206 Range Stream for an audio track
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

  // 2. Check disk / concurrency semaphore
  if (!spoolManager.canSpool()) {
    res.status(503).json({
      error: 'SERVER_BUSY',
      message: 'Too many concurrent audio streams. Please retry in a few seconds.',
    });
    return;
  }

  // Generate unique ephemeral temp file path: /tmp/melody/melody-<songId>-<uuid>.mp3
  const tempId = crypto.randomBytes(8).toString('hex');
  const tempFilePath = path.join(config.tempDir, `melody-${songId}-${tempId}.mp3`);

  spoolManager.increment();

  // Helper to safely delete the temp file exactly once
  let fileDeleted = false;
  const cleanupTempFile = () => {
    if (!fileDeleted) {
      fileDeleted = true;
      spoolManager.decrement();
      fs.unlink(tempFilePath, (err) => {
        if (!err) {
          console.log(`[Stream Cleanup] Deleted temp file: ${tempFilePath}`);
        }
      });
    }
  };

  try {
    // 3. Download the single song from Telegram directly to temp file
    await telegramService.downloadToFile(song.telegram_file_id, tempFilePath);

    const stat = await fs.promises.stat(tempFilePath);
    const totalSize = stat.size;

    // 4. Handle HTTP Range Requests (Seeking & Scrubbing in Player)
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (start >= totalSize || end >= totalSize || start > end) {
        res.status(416).set({ 'Content-Range': `bytes */${totalSize}` }).end();
        cleanupTempFile();
        return;
      }

      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      });

      // Stream only requested 64 KB chunks
      const stream = fs.createReadStream(tempFilePath, {
        start,
        end,
        highWaterMark: 64 * 1024, // Strict 64 KB buffer
      });

      stream.pipe(res);

      res.on('finish', cleanupTempFile);
      res.on('close', cleanupTempFile);
      stream.on('error', (err) => {
        console.error('[Stream Error]:', err.message);
        cleanupTempFile();
      });
    } else {
      // Full playback without range header
      res.writeHead(200, {
        'Content-Length': totalSize,
        'Content-Type': 'audio/mpeg',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      });

      const stream = fs.createReadStream(tempFilePath, {
        highWaterMark: 64 * 1024,
      });

      stream.pipe(res);

      res.on('finish', cleanupTempFile);
      res.on('close', cleanupTempFile);
      stream.on('error', (err) => {
        console.error('[Stream Error]:', err.message);
        cleanupTempFile();
      });
    }
  } catch (err: any) {
    console.error(`[Streaming Failure for Song ${songId}]:`, err.message);
    cleanupTempFile();
    if (!res.headersSent) {
      res.status(500).json({ error: 'STREAM_ERROR', message: 'Failed to stream audio track.' });
    }
  }
}
