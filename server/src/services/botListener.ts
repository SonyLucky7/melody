import https from 'https';
import { config } from '../config';
import { query } from '../db/client';
import { verifyPassword } from '../utils/hash';

export class TelegramBotAdminListener {
  private botToken: string;
  private channelId: string;
  private isPolling = false;
  private offset = 0;
  private authorizedChatIds = new Set<number>();

  constructor(botToken: string, channelId: string) {
    this.botToken = botToken;
    this.channelId = channelId;
  }

  start(): void {
    if (this.isPolling) return;
    this.isPolling = true;
    console.log('[Telegram Admin Bot] Polling started. Direct upload listener active.');
    this.poll();
  }

  stop(): void {
    this.isPolling = false;
  }

  private async poll(): Promise<void> {
    while (this.isPolling) {
      try {
        const updates = await this.getUpdates(this.offset);
        if (updates && updates.length > 0) {
          for (const update of updates) {
            this.offset = update.update_id + 1;
            await this.handleUpdate(update);
          }
        }
      } catch (err: any) {
        // Wait briefly before retrying on network hiccup
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }

  private async handleUpdate(update: any): Promise<void> {
    const msg = update.message;
    if (!msg) return;

    const chatId = msg.chat?.id;
    if (!chatId) return;

    const fromName = msg.from?.first_name || 'Admin';

    // Handle authentication command: /auth <password>
    if (msg.text) {
      const text = msg.text.trim();

      if (text.startsWith('/auth')) {
        const parts = text.split(/\s+/);
        const pass = parts.slice(1).join(' ').trim();

        // Attempt to delete the message containing the password for chat privacy
        if (msg.message_id) {
          this.deleteMessage(chatId, msg.message_id).catch(() => {});
        }

        const isValid = await verifyPassword(pass, config.adminPasswordHash);
        if (isValid) {
          this.authorizedChatIds.add(chatId);
          await this.sendMessage(
            chatId,
            `🔓 *Administrator Authenticated!*
Welcome, ${fromName}. You are now authorized to manage and upload music to Melody.

Send or forward any *MP3 song file* here to save it to your private channel and database.`
          );
        } else {
          await this.sendMessage(chatId, `⛔ *Access Denied:* Invalid administrator password.`);
        }
        return;
      }

      // Handle /start or /help
      if (text.startsWith('/start') || text.startsWith('/help')) {
        if (!this.authorizedChatIds.has(chatId)) {
          await this.sendMessage(
            chatId,
            `🔒 *Melody Admin Bot - Restricted Access*

This bot is private to authorized *Melody* administrators.
To authenticate, send:
\`/auth <your_admin_password>\``
          );
          return;
        }

        await this.sendMessage(
          chatId,
          `🎵 *Welcome to Melody Admin Bot, ${fromName}!*

Send or forward me any *MP3 song file* here, and I will instantly:
1. Save it to your private *Melody* channel
2. Index it into your *PostgreSQL database*
3. Make it streamable on Web, Desktop, and Android!

👉 Just drag & drop or send an MP3 now!`
        );
        return;
      }
    }

    // Check authorization for audio uploads
    if (!this.authorizedChatIds.has(chatId)) {
      await this.sendMessage(
        chatId,
        `⛔ *Unauthorized:* You must authenticate first before uploading music.
Send \`/auth <admin_password>\` to unlock upload capabilities.`
      );
      return;
    }

    // Handle Audio or MP3 Document Upload
    const audio = msg.audio || (msg.document && msg.document.mime_type?.includes('audio') ? msg.document : null);

    if (audio) {
      const title = audio.title || msg.caption || audio.file_name?.replace(/\.mp3$/i, '') || 'Unknown Title';
      const artist = audio.performer || 'Unknown Artist';
      const duration = audio.duration || 0;
      const fileSize = audio.file_size || 0;

      await this.sendMessage(chatId, `⏳ Processing "*${title}*" by *${artist}*... Saving to channel...`);

      try {
        // Send audio to the private channel using its Telegram file_id
        const channelResult = await this.sendAudioToChannel(audio.file_id, title, artist);

        if (!channelResult || !channelResult.ok) {
          throw new Error(channelResult?.description || 'Failed to post to private channel');
        }

        const channelAudio = channelResult.result.audio || channelResult.result.document || audio;
        const channelMessageId = channelResult.result.message_id;
        const channelFileId = channelAudio.file_id;

        // Save metadata to PostgreSQL database
        const dbRes = await query(
          `INSERT INTO songs (
            title, artist, album, language, duration_seconds, file_size_bytes,
            telegram_file_id, telegram_message_id, cover_url
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id`,
          [
            title,
            artist,
            null,
            'english',
            duration,
            fileSize,
            channelFileId,
            channelMessageId,
            '/Melody-Logo-1024.png',
          ]
        );

        const newSongId = dbRes.rows[0].id;

        await this.sendMessage(
          chatId,
          `✅ *Upload Successful!*
🎵 *Title*: ${title}
🎤 *Artist*: ${artist}
⏱ *Duration*: ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}
🆔 *Melody Song ID*: #${newSongId}

Your track is now live in the *Melody* music player on Web, Desktop & Android!`
        );
      } catch (err: any) {
        console.error('[Bot Upload Error]:', err);
        await this.sendMessage(chatId, `❌ *Upload Failed*: ${err.message}`);
      }
    }
  }

  private sendAudioToChannel(fileId: string, title: string, performer: string): Promise<any> {
    const payload = JSON.stringify({
      chat_id: this.channelId,
      audio: fileId,
      title,
      performer,
    });

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'api.telegram.org',
          path: `/bot${this.botToken}/sendAudio`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        }
      );
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  private sendMessage(chatId: number | string, text: string): Promise<any> {
    const payload = JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    });

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'api.telegram.org',
          path: `/bot${this.botToken}/sendMessage`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        }
      );
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  private deleteMessage(chatId: number | string, messageId: number): Promise<boolean> {
    const payload = JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
    });

    return new Promise((resolve) => {
      const req = https.request(
        {
          hostname: 'api.telegram.org',
          path: `/bot${this.botToken}/deleteMessage`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        () => resolve(true)
      );
      req.on('error', () => resolve(false));
      req.write(payload);
      req.end();
    });
  }

  private getUpdates(offset: number): Promise<any[]> {
    return new Promise((resolve) => {
      https
        .get(
          `https://api.telegram.org/bot${this.botToken}/getUpdates?offset=${offset}&timeout=20`,
          { timeout: 25000 },
          (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => {
              try {
                const parsed = JSON.parse(data);
                if (parsed.ok) {
                  resolve(parsed.result || []);
                } else {
                  resolve([]);
                }
              } catch {
                resolve([]);
              }
            });
          }
        )
        .on('error', () => resolve([]));
    });
  }
}

export const botAdminListener = new TelegramBotAdminListener(
  config.telegramBotTokens[0],
  config.telegramChannelId
);
