import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { config } from '../config';

export function initializeTempDirectory(): void {
  try {
    if (!fs.existsSync(config.tempDir)) {
      fs.mkdirSync(config.tempDir, { recursive: true });
      console.log(`[Storage Init] Created ephemeral temp audio directory at: ${config.tempDir}`);
    }
  } catch (err: any) {
    console.error(`[Storage Init Error]: Failed to create temp dir ${config.tempDir}:`, err.message);
  }
}

/**
 * Scans temp directory:
 * 1. Removes stale `.tmp` files older than 10 minutes
 * 2. Enforces a 350 MB LRU cap on cached `song-*.mp3` files so hot tracks stay instant on disk
 *    while Render's ephemeral disk never fills up!
 */
export async function cleanOrphanedTempAudio(): Promise<number> {
  let cleanedCount = 0;
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  const maxCacheBytes = 350 * 1024 * 1024; // 350 MB hot LRU audio cache

  try {
    if (!fs.existsSync(config.tempDir)) return 0;

    const files = await fs.promises.readdir(config.tempDir);
    const cachedMp3s: Array<{ fullPath: string; size: number; mtimeMs: number; name: string }> = [];

    for (const file of files) {
      const fullPath = path.join(config.tempDir, file);
      try {
        const stat = await fs.promises.stat(fullPath);
        if (file.includes('.tmp')) {
          if (stat.mtimeMs < tenMinutesAgo) {
            await fs.promises.unlink(fullPath);
            cleanedCount++;
          }
          continue;
        }
        if ((file.startsWith('song-') || file.startsWith('melody-')) && file.endsWith('.mp3')) {
          cachedMp3s.push({ fullPath, size: stat.size, mtimeMs: stat.mtimeMs, name: file });
        }
      } catch {
        // File may have been removed concurrently
      }
    }

    // Evict oldest-accessed tracks only if total cache exceeds 350 MB
    let totalBytes = cachedMp3s.reduce((sum, f) => sum + f.size, 0);
    if (totalBytes > maxCacheBytes) {
      cachedMp3s.sort((a, b) => a.mtimeMs - b.mtimeMs);
      for (const item of cachedMp3s) {
        if (totalBytes <= maxCacheBytes * 0.8) break;
        try {
          await fs.promises.unlink(item.fullPath);
          totalBytes -= item.size;
          cleanedCount++;
        } catch {}
      }
    }
  } catch (err: any) {
    console.error('[Auto-Cleanup Error]: Failed during orphan scan:', err.message);
  }

  return cleanedCount;
}

/**
 * Starts scheduled 5-minute background orphan cleaner cron
 */
export function startPeriodicCleanupCron(): void {
  initializeTempDirectory();

  // Run every 5 minutes: */5 * * * *
  cron.schedule('*/5 * * * *', async () => {
    const cleaned = await cleanOrphanedTempAudio();
    if (cleaned > 0) {
      console.log(`[Scheduled Cleanup] Purged ${cleaned} stale audio spools.`);
    }
  });

  console.log('[Scheduled Cleanup] Active: 5-minute orphan scan (spools > 30m purged).');
}
