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
 * Scans temp directory and removes orphaned audio files older than 30 minutes
 */
export async function cleanOrphanedTempAudio(): Promise<number> {
  let cleanedCount = 0;
  const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;

  try {
    if (!fs.existsSync(config.tempDir)) return 0;

    const files = await fs.promises.readdir(config.tempDir);

    for (const file of files) {
      if (!file.startsWith('melody-') || !file.endsWith('.mp3')) continue;

      const fullPath = path.join(config.tempDir, file);
      try {
        const stat = await fs.promises.stat(fullPath);
        if (stat.mtimeMs < thirtyMinutesAgo) {
          await fs.promises.unlink(fullPath);
          cleanedCount++;
          console.log(`[Auto-Cleanup] Removed orphaned temp audio file: ${file}`);
        }
      } catch (err) {
        // File may have been removed concurrently
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
