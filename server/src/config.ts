import dotenv from 'dotenv';
import path from 'path';
import os from 'os';

dotenv.config();

export interface Config {
  port: number;
  databaseUrl: string;
  telegramBotTokens: string[];
  telegramChannelId: string;
  sessionSecret: string;
  freeMode: boolean;
  adminSecret: string;
  tempDir: string;
  maxConcurrentStreams: number;
  allowedOrigins: string[];
}

const rawTokens = process.env.TELEGRAM_BOT_TOKENS || process.env.TELEGRAM_BOT_TOKEN || '';
const telegramBotTokens = rawTokens
  .split(',')
  .map(token => token.trim())
  .filter(Boolean);

export const config: Config = {
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgres://avnadmin:AVNS_jQofDJASuMaK6SiZ8X3@pg-1e9f27fb-melody.k.aivencloud.com:19956/defaultdb?sslmode=require',
  telegramBotTokens: telegramBotTokens.length > 0 ? telegramBotTokens : ['MOCK_BOT_TOKEN_1', 'MOCK_BOT_TOKEN_2'],
  telegramChannelId: process.env.TELEGRAM_CHANNEL_ID || '-1000000000000',
  sessionSecret: process.env.SESSION_SECRET || 'melody-super-secure-session-secret-2026',
  freeMode: process.env.FREE_MODE === undefined ? true : process.env.FREE_MODE === 'true',
  adminSecret: process.env.ADMIN_SECRET || 'melody-admin-access-token-9876',
  tempDir: process.env.TEMP_DIR || path.join(os.tmpdir(), 'melody'),
  maxConcurrentStreams: parseInt(process.env.MAX_CONCURRENT_STREAMS || '10', 10),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173,https://melody.app')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean),
};
