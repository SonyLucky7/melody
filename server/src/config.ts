import dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import { hashPasswordSync } from './utils/hash';

// Load .env explicitly from the server directory or current working directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

export interface Config {
  port: number;
  databaseUrl: string;
  telegramBotTokens: string[];
  telegramChannelId: string;
  sessionSecret: string;
  freeMode: boolean;
  adminSecret: string;
  adminEmail: string;
  adminPasswordHash: string;
  tempDir: string;
  maxConcurrentStreams: number;
  allowedOrigins: string[];
  upiId: string;
  upiName: string;
}

const rawTokens = process.env.TELEGRAM_BOT_TOKENS || process.env.TELEGRAM_BOT_TOKEN || '';
const telegramBotTokens = rawTokens
  .split(',')
  .map(token => token.trim())
  .filter(Boolean);

// Resolve password as a secure bcrypt hash
const rawPassword = process.env.ADMIN_PASSWORD || '';
const rawPasswordHash = process.env.ADMIN_PASSWORD_HASH || '';
const adminPasswordHash = rawPasswordHash
  ? rawPasswordHash
  : rawPassword
  ? hashPasswordSync(rawPassword)
  : '';

// Securely read UPI ID from environment
function getSecureUpiId(): string {
  return (process.env.UPI_ID && process.env.UPI_ID.trim()) || '';
}

export const config: Config = {
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  telegramBotTokens: telegramBotTokens,
  telegramChannelId: process.env.TELEGRAM_CHANNEL_ID || '',
  sessionSecret: process.env.SESSION_SECRET || 'melody-secure-session-secret-change-in-env',
  freeMode: process.env.FREE_MODE === undefined ? true : process.env.FREE_MODE === 'true',
  adminSecret: process.env.ADMIN_SECRET || '',
  adminEmail: process.env.ADMIN_EMAIL || '',
  adminPasswordHash,
  tempDir: process.env.TEMP_DIR || path.join(os.tmpdir(), 'melody'),
  maxConcurrentStreams: parseInt(process.env.MAX_CONCURRENT_STREAMS || '10', 10),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173,https://melody.app,https://melody-chi-nine.vercel.app')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean),
  upiId: getSecureUpiId(),
  upiName: process.env.UPI_NAME || 'Melody Music VIP',
};
