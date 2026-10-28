# Melody Shared Backend (Node.js + Express + TypeScript + PostgreSQL + Telegram)

The shared, high-performance backend powering the **Melody** music player ecosystem (Android, Web, Windows, and macOS).

---

## 🎯 Architecture Highlights
- **100% Free Premium Experience**: All high-fidelity audio (320 kbps) and features are free.
- **Telegram Permanent Audio Storage**: Music is stored permanently **ONLY** in your private Telegram channel via a multi-bot redundancy pool (2–3 bots).
- **Zero Audio in PostgreSQL**: PostgreSQL only holds search metadata (~500 bytes/song), licence keys, devices, playlists, favourites, and recently played history.
- **Seekable 64 KB Range Streaming**: Serves audio with standard HTTP 206 Partial Content headers (`Accept-Ranges`, `Content-Range`) in 64 KB chunks (`highWaterMark: 65536`) so seeking/scrubbing works smoothly on Android ExoPlayer and Web `<audio>`.
- **Ephemeral Spooling with Auto-Delete**: Zero permanent audio cached on server disk. The single song temp file `/tmp/melody/melody-<id>-<uuid>.mp3` is deleted immediately on stream completion, client disconnect/abort, or error.
- **Orphan Auto-Cleaner**: Periodic background cron running every 5 minutes deletes any file in `/tmp/melody-*` older than 30 minutes.
- **Option 1 Licence Keys**: Format: `first 3 letters of first name (upper) + first 3 letters of surname (upper) + last 6 digits of mobile` = 12 characters (`RAHS-HA98-7654`).
- **5-Device Limit Enforcement**: Key-only activation with max 5 active devices. 6th device gets `HTTP 403 DEVICE_LIMIT_REACHED` with the 5 active devices. Dedicated single-device logout frees a slot instantly.

---

## ⚙️ Environment Configuration (`.env`)

Create a `.env` file in `server/`:

```env
PORT=5000

# PostgreSQL 18 Free Plan (1 CPU, 1 GB RAM, 1 GB storage)
DATABASE_URL=postgres://user:password@localhost:5432/melody?sslmode=require

# Telegram Multi-Bot Pool (Comma-separated bot tokens for racing & failover)
TELEGRAM_BOT_TOKENS=7891234567:AAExampleToken1,7891234568:AAExampleToken2
TELEGRAM_CHANNEL_ID=-1002345678901

# JWT & HMAC Signing Secrets
SESSION_SECRET=change-this-to-a-long-random-secret
ADMIN_SECRET=change-this-to-a-secure-admin-token
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-this-to-a-secure-admin-password

# Mode Toggle: Set to 'true' for Free Mode, 'false' for Paid/Licence Required
FREE_MODE=true

# Server Resource Guardrails
MAX_CONCURRENT_STREAMS=10
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:5000
```

---

## 🚀 How to Run Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Database Migrations
```bash
npm run migrate
```
This automatically applies `src/db/schema.sql` creating: `users`, `songs`, `licences`, `devices`, `playlists`, `playlist_songs`, `favourites`, and `recent_plays` with indexes.

### 3. Run Development Server
```bash
npm run dev
```

### 4. Run Test Suite
```bash
npm test
```

---

## 🔄 How to Flip `FREE_MODE` On / Off

- **Free Mode (`FREE_MODE=true`)**:
  - Anyone can search and stream songs openly without an activation key or payment.
  - Guest sessions are automatically assigned for instant listening.
- **Paid / Key-Required Mode (`FREE_MODE=false`)**:
  - Playback requires an active Option 1 licence key.
  - Streaming requests without an active licence return `401 Unauthorized`.

To toggle:
1. Change `FREE_MODE=false` in `.env`.
2. Restart the backend process (or run `pm2 reload melody-backend`).

---

## ☁️ Deployment on a 1–2 GB RAM Server

Because our architecture uses 64 KB chunk piping and ephemeral files, the entire Node.js server consumes only **60 to 90 MB RAM**.

### Recommended Production Stack (Ubuntu 22.04 / Debian 12 / Docker):
1. **Install Node.js 20+ and PM2**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo npm install -g pm2
   ```

2. **Clone & Build**:
   ```bash
   cd /var/www/melody/server
   npm install --production=false
   npm run build
   npm prune --production
   ```

3. **Start with PM2 Memory Cap**:
   ```bash
   pm2 start dist/index.js --name "melody-backend" --max-memory-restart 300M
   pm2 save
   pm2 startup
   ```

4. **Nginx Reverse Proxy with Range Header Support**:
   ```nginx
   server {
       listen 80;
       server_name api.melody.app;

       location / {
           proxy_pass http://127.0.0.1:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

           # Enable HTTP 206 Range Buffering bypass
           proxy_set_header Range $http_range;
           proxy_set_header If-Range $http_if_range;
           proxy_buffering off;
       }
   }
   ```

---

## 🎵 API Reference Summary

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `GET /` | GET | Status & configuration info |
| `GET /health` | GET | Healthcheck (DB status, stream counters) |
| `POST /activate` | POST | Key-only activation (`{ key, device_id, device_name }`) |
| `POST /devices/:deviceId/logout` | POST | Free device slot by revoking session |
| `GET /devices` | GET | List active devices on current licence |
| `GET /api/songs` | GET | Search songs by title, artist, language |
| `GET /api/songs/:id` | GET | Song metadata (no file_id exposed) |
| `GET /api/songs/:id/play` | GET | Generates signed 10-minute stream URL |
| `GET /api/stream/:id` | GET | 64 KB HTTP 206 seekable audio stream |
| `GET /api/history` | GET | Recently played songs (Spotify style) |
| `POST /api/songs/:id/played`| POST | Record song play event |
| `GET /api/playlists` | GET | List user playlists |
| `POST /api/playlists` | POST | Create playlist |
| `GET /api/favourites` | GET | List user favourite tracks |
| `POST /api/favourites/:songId`| POST | Add song to favourites |
| `POST /api/admin/upload` | POST | Multipart MP3 + Cover upload to Telegram & DB |
| `POST /api/checkout/free` | POST | Self-service free Option 1 key generator |
