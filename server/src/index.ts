import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { checkDatabaseConnection, pool } from './db/client';
import { runMigrations } from './db/migrate';
import { startPeriodicCleanupCron } from './services/cleanup';
import { spoolManager } from './services/stream';
import { botAdminListener } from './services/botListener';
import { warmSpoolCache } from './services/cacheWarmer';
import { startKeepAliveRobot } from './services/keepAliveRobot';

import deviceRoutes from './routes/device.routes';
import apiRoutes from './routes/api.routes';
import adminRoutes from './routes/admin.routes';

const app = express();

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows cross-origin audio streaming
    contentSecurityPolicy: false, // Allows clean inline styles and fonts on admin portal
  })
);

// CORS configuration for Web, Android and Desktop clients
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow mobile apps, curl, or matching origins
      if (!origin || config.allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(null, true); // Dev-friendly fallback
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please try again later.' },
});

// Stricter Rate Limiting for Key Activation & Stream Init
const activateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 attempts
  message: { error: 'TOO_MANY_ATTEMPTS', message: 'Too many activation attempts. Try again in 5 minutes.' },
});

app.use('/api', globalLimiter);
app.use('/activate', activateLimiter);

// --- Healthcheck Endpoint ---
app.get('/health', async (req, res) => {
  const dbConnected = await checkDatabaseConnection();
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'healthy' : 'degraded',
    database: dbConnected ? 'connected' : 'disconnected',
    freeMode: config.freeMode,
    activeStreams: spoolManager.getActiveCount(),
    maxConcurrentStreams: config.maxConcurrentStreams,
    telegramBotsConfigured: config.telegramBotTokens.length,
    timestamp: new Date().toISOString(),
  });
});

// --- Register Routes ---
app.use(deviceRoutes);      // /activate, /devices
app.use('/api', apiRoutes);  // /api/songs, /api/stream, /api/playlists, /api/favourites, /api/history
app.use('/api', adminRoutes);// /api/admin/upload, /api/admin/licences, /api/checkout/free

// --- Static Audio Cover Artwork & Public Assets ---
app.use('/covers', express.static(path.join(__dirname, '../public/covers')));
app.use(express.static(path.join(__dirname, '../public')));

// --- Admin Portal Endpoint (Dedicated Admin Upload Dashboard) ---
app.use('/admin', express.static(path.join(__dirname, '../public')));
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// --- Serve Compiled Client Web Player (Spotify UI) if present ---
const clientDistCandidates = [
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(__dirname, '../client/dist'),
];
const clientDistPath = clientDistCandidates.find(p => fs.existsSync(path.join(p, 'index.html')));

if (clientDistPath) {
  console.log(`[Static] Serving Melody Web Player UI from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/activate') ||
      req.path.startsWith('/devices') ||
      req.path === '/health' ||
      req.path.startsWith('/admin')
    ) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.status(200).json({
      app: 'Melody Music Shared Backend',
      version: '1.0.0',
      freeMode: config.freeMode,
      activeStreams: spoolManager.getActiveCount(),
      status: 'online',
    });
  });
}

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: `Route ${req.method} ${req.url} does not exist.` });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(500).json({
    error: 'SERVER_ERROR',
    message: err.message || 'An unexpected server error occurred.',
  });
});

// --- Server Startup & Auto-Cleanup Init ---
export const server = app.listen(config.port, async () => {
  console.log(`====================================================`);
  console.log(`  🎵 Melody Shared Backend running on port ${config.port}`);
  console.log(`  💎 Free Mode: ${config.freeMode ? 'ACTIVE (All features 100% Free)' : 'PAID'}`);
  console.log(`  🤖 Telegram Bots configured: ${config.telegramBotTokens.length}`);
  console.log(`  📁 Ephemeral Spool Dir: ${config.tempDir}`);
  console.log(`====================================================`);

  // Start 5-minute orphan cleanup cron
  startPeriodicCleanupCron();

  // Start Telegram Bot Admin direct upload listener
  botAdminListener.start();

  // Start built-in 24/7 Keep-Alive Robot for Render
  startKeepAliveRobot();

  // Run database migrations if DB is accessible
  try {
    const isAlive = await checkDatabaseConnection();
    if (isAlive) {
      console.log('[PostgreSQL] Database online. Running migrations...');
      await runMigrations();
      // Auto-warm high-speed NVMe audio spool cache
      warmSpoolCache().catch(() => {});
    } else {
      console.warn('[PostgreSQL] Database unreachable at startup. Will reconnect on demand.');
    }
  } catch (err: any) {
    console.warn('[PostgreSQL Startup Check]:', err.message);
  }
});

// Graceful Shutdown
const shutdown = async () => {
  console.log('\n[Melody Backend] Gracefully shutting down...');
  botAdminListener.stop();
  server.close(async () => {
    try {
      await pool.end();
      console.log('[Melody Backend] PostgreSQL pool closed.');
    } catch {}
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
