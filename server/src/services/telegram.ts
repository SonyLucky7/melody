import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { config } from '../config';

// High-performance persistent keep-alive agent to eliminate TLS handshake latency
export const telegramAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 20,
  keepAliveMsecs: 60000,
  timeout: 60000,
});

export interface TelegramUploadResult {
  telegram_file_id: string;
  telegram_message_id: number;
  duration_seconds: number;
  file_size_bytes: number;
}

export class TelegramMultiBotService {
  private botTokens: string[];
  private channelId: string;
  private currentBotIndex = 0;
  private urlCache = new Map<string, { downloadUrl: string; botIndex: number; expiresAt: number }>();

  constructor(botTokens: string[], channelId: string) {
    this.botTokens = botTokens.length > 0 ? botTokens : ['MOCK_BOT_TOKEN_1', 'MOCK_BOT_TOKEN_2'];
    this.channelId = channelId;
  }

  /**
   * Upload an MP3 audio file to the private Telegram channel with automatic bot failover
   */
  async uploadAudio(
    audioBuffer: Buffer,
    filename: string,
    title: string,
    artist: string,
    coverBuffer?: Buffer
  ): Promise<TelegramUploadResult> {
    let lastError: Error | null = null;
    const numBots = this.botTokens.length;

    for (let attempt = 0; attempt < numBots; attempt++) {
      const idx = (this.currentBotIndex + attempt) % numBots;
      const token = this.botTokens[idx];
      try {
        console.log(`[Telegram Bot ${idx + 1}] Uploading audio "${title}" to channel...`);
        const result = await this.executeMultipartAudioUpload(
          token,
          this.channelId,
          audioBuffer,
          filename,
          title,
          artist,
          coverBuffer
        );
        this.currentBotIndex = (idx + 1) % numBots;
        return result;
      } catch (err: any) {
        console.warn(`[Telegram Bot ${idx + 1} Error]: ${err.message}. Trying next bot...`);
        lastError = err;
      }
    }

    throw new Error(`All Telegram bots failed to upload audio. Last error: ${lastError?.message}`);
  }

  /**
   * Upload audio with a specific dedicated bot for maximum multi-bot concurrency
   */
  async uploadAudioWithBotIndex(
    botIndex: number,
    audioBuffer: Buffer,
    filename: string,
    title: string,
    artist: string,
    coverBuffer?: Buffer
  ): Promise<TelegramUploadResult> {
    const token = this.botTokens[botIndex % this.botTokens.length];
    return this.executeMultipartAudioUpload(
      token,
      this.channelId,
      audioBuffer,
      filename,
      title,
      artist,
      coverBuffer
    );
  }

  /**
   * Race all Telegram bots in parallel simultaneously - fastest bot wins immediately with minimum latency!
   * File download URL is cached in memory for 50 minutes.
   */
  async getFileDownloadUrl(fileId: string): Promise<{ downloadUrl: string; botIndex: number }> {
    if (fileId.startsWith('http://') || fileId.startsWith('https://')) {
      return { downloadUrl: fileId, botIndex: -1 };
    }

    const cached = this.urlCache.get(fileId);
    if (cached && cached.expiresAt > Date.now()) {
      return { downloadUrl: cached.downloadUrl, botIndex: cached.botIndex };
    }

    // Race ALL bots in parallel simultaneously - whichever bot responds first wins!
    const promises = this.botTokens.map(async (token, idx) => {
      const res = await this.fetchJson(
        `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`
      );
      if (res && res.ok && res.result?.file_path) {
        return {
          downloadUrl: `https://api.telegram.org/file/bot${token}/${res.result.file_path}`,
          botIndex: idx,
        };
      }
      throw new Error(`Bot ${idx + 1} getFile failed`);
    });

    try {
      const result = await Promise.any(promises);
      this.urlCache.set(fileId, {
        downloadUrl: result.downloadUrl,
        botIndex: result.botIndex,
        expiresAt: Date.now() + 50 * 60 * 1000,
      });
      return result;
    } catch (err: any) {
      throw new Error(`Failed to resolve file URL from all Telegram bots: ${err.message}`);
    }
  }

  /**
   * Background pre-warmup: Resolves download URLs ahead of time so playback starts instantly in 0ms!
   */
  warmupFiles(fileIds: string[]): void {
    const unCached = fileIds
      .filter((id) => !id.startsWith('http') && !this.urlCache.has(id))
      .slice(0, 50);
    if (unCached.length === 0) return;

    // Run non-blocking in background in concurrent batches of 6
    setTimeout(async () => {
      const batchSize = 6;
      for (let i = 0; i < unCached.length; i += batchSize) {
        const batch = unCached.slice(i, i + batchSize);
        await Promise.allSettled(batch.map((id) => this.getFileDownloadUrl(id)));
      }
    }, 50);
  }

  /**
   * Download audio file from Telegram directly to an ephemeral local temp file
   * Writes to a .tmp file first, then atomically renames to destPath to prevent partial read bugs
   */
  async downloadToFile(fileId: string, destPath: string): Promise<number> {
    const { downloadUrl, botIndex } = await this.getFileDownloadUrl(fileId);
    const tmpPath = `${destPath}.tmp.${Date.now()}`;
    if (botIndex === -1) {
      console.log(`[Direct Streaming] Downloading ${fileId.slice(0, 40)}... to ${tmpPath}`);
    } else {
      console.log(`[Telegram Streaming] Bot ${botIndex + 1} downloading to ${tmpPath}...`);
    }

    await fs.promises.mkdir(path.dirname(destPath), { recursive: true });

    return new Promise((resolve, reject) => {
      const fileStream = fs.createWriteStream(tmpPath);
      const protocol = downloadUrl.startsWith('https') ? https : http;

      const req = protocol.get(downloadUrl, { agent: telegramAgent, timeout: 45000 }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fileStream.close();
          fs.unlink(tmpPath, () => {});
          return this.downloadToFile(res.headers.location, destPath).then(resolve).catch(reject);
        }

        if (res.statusCode !== 200) {
          fileStream.close();
          fs.unlink(tmpPath, () => {});
          return reject(new Error(`Download returned status ${res.statusCode}`));
        }

        let totalBytes = 0;
        res.on('data', (chunk) => {
          totalBytes += chunk.length;
        });

        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close(async () => {
            try {
              // Atomically rename once 100% complete so readers never see partial files
              await fs.promises.rename(tmpPath, destPath);
              console.log(`[Telegram Streaming] Finished spooling: ${destPath} (${totalBytes} bytes)`);
              resolve(totalBytes);
            } catch (renameErr) {
              fs.unlink(tmpPath, () => {});
              reject(renameErr);
            }
          });
        });
      });

      req.on('error', (err) => {
        fileStream.close();
        fs.unlink(tmpPath, () => {});
        reject(err);
      });
    });
  }

  private async executeMultipartAudioUpload(
    token: string,
    chatId: string,
    audioBuffer: Buffer,
    filename: string,
    title: string,
    artist: string,
    coverBuffer?: Buffer
  ): Promise<TelegramUploadResult> {
    const boundary = '--------------------------' + Date.now().toString(16);

    const parts: Buffer[] = [];

    // chat_id
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n`));
    // title
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\n${title}\r\n`));
    // performer
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="performer"\r\n\r\n${artist}\r\n`));

    // audio file
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="audio"; filename="${filename}"\r\nContent-Type: audio/mpeg\r\n\r\n`
      )
    );
    parts.push(audioBuffer);
    parts.push(Buffer.from('\r\n'));

    // cover thumbnail if available
    if (coverBuffer) {
      parts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="thumbnail"; filename="cover.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`
        )
      );
      parts.push(coverBuffer);
      parts.push(Buffer.from('\r\n'));
    }

    parts.push(Buffer.from(`--${boundary}--\r\n`));
    const fullBody = Buffer.concat(parts);

    const url = new URL(`https://api.telegram.org/bot${token}/sendAudio`);

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: url.hostname,
          path: url.pathname,
          method: 'POST',
          agent: telegramAgent,
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': fullBody.length,
          },
          timeout: 45000,
        },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              if (!parsed.ok) {
                return reject(new Error(parsed.description || 'Telegram API Error'));
              }
              const audio = parsed.result?.audio || parsed.result?.document;
              if (!audio || !audio.file_id) {
                return reject(new Error('No audio file_id in Telegram response'));
              }
              resolve({
                telegram_file_id: audio.file_id,
                telegram_message_id: parsed.result.message_id,
                duration_seconds: audio.duration || 0,
                file_size_bytes: audio.file_size || audioBuffer.length,
              });
            } catch (e: any) {
              reject(new Error(`Invalid JSON from Telegram: ${data}`));
            }
          });
        }
      );

      req.on('error', reject);
      req.write(fullBody);
      req.end();
    });
  }

  private fetchJson(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      https
        .get(url, { agent: telegramAgent, timeout: 5000 }, (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        })
        .on('error', reject);
    });
  }
}

export const telegramService = new TelegramMultiBotService(
  config.telegramBotTokens,
  config.telegramChannelId
);
