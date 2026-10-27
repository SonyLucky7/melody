# Melody Music System - Shared Backend & Ecosystem Specification
**Date**: 2026-10-27  
**Status**: Approved (Brainstorming Phase)  
**System**: Melody (Spotify-style music player ecosystem: Shared Backend, Web Player, Desktop Windows/Mac, Android App)

---

## 1. Executive Summary & Goals
Melody is an audio streaming ecosystem built around a high-performance, resource-constrained backend. Music audio tracks are permanently stored **exclusively** in a private Telegram channel via a multi-bot redundancy pool. The backend server never stores audio permanently on disk or in PostgreSQL, streaming directly to clients via ephemeral, self-cleaning 64 KB range spools.

### Deliverables Roadmap
- **Sub-Project 1 (Core Backbone)**: Shared Backend (Node.js + Express + TypeScript + PostgreSQL 18 + Telegram Multi-Bot Storage + 64 KB HTTP 206 Seekable Streaming + Option 1 Licence Key Auth + 5-Device Concurrency Manager + Free/Paid Switch + Admin Upload).
- **Sub-Project 2**: Spotify-Style Web Player & Desktop App (React / Next.js / Vite SPA with Media Session API + Electron/Tauri desktop wrapper for Windows and macOS using Melody brand pack).
- **Sub-Project 3**: Spotify-Style Android Player (Media3 / ExoPlayer with high-fidelity audio pipeline, key activation, and offline-resilient streaming).

---

## 2. Hard Constraints & Budgets
| Resource | Constraint / Limit | Enforcement Mechanism |
| :--- | :--- | :--- |
| **App Server RAM** | 1 - 2 GB RAM max | Node.js process stays $\le$ 80-120 MB RAM; no full-file in-memory buffering. |
| **App Server Disk** | 1 - 10 GB disk | Temp streaming spools limited to 10 concurrent files ($\le$ 500 MB peak); immediate deletion on finish/abort + 5-min cron cleanup. |
| **Database** | PostgreSQL Free Plan (1 CPU, 1 GB RAM, 1 GB storage) | Zero audio bytes stored in DB; only lightweight text metadata and `telegram_file_id`. Connection pool size limited to 10. |
| **Audio File Size** | $\le 20\text{ MB}$ per song (Telegram Bot API limit) | Verified during Admin upload. |
| **Audio Quality** | Premium Studio Quality: Up to 320 kbps MP3/AAC, 44.1/48 kHz, full stereo dynamic range | Upload validator preserves bitrate without lossy re-compression. |

---

## 3. Architecture & Multi-Bot Telegram Storage

```
+-------------------+        +--------------------+        +---------------------+
|   Android App     |        |   Website Player   |        |   Windows/Mac App   |
| (Media3/ExoPlayer)|        | (HTML5 Audio/Media)|        | (Melody Desktop)    |
+---------+---------+        +---------+----------+        +----------+----------+
          |                            |                              |
          +----------------------------+------------------------------+
                                       |
                           REST / HTTP 206 Range Stream
                                       v
                       +-------------------------------+
                       |     Melody Shared Backend     |
                       |    (Express + TypeScript)     |
                       +---------------+---------------+
                                       |
                 +---------------------+---------------------+
                 |                                           |
                 v                                           v
      +----------------------+                   +-----------------------+
      |  PostgreSQL Database |                   |  Telegram Multi-Bot   |
      |   (Aiven Cloud DB)   |                   |  Redundancy & Race    |
      | Metadata + Licences  |                   | Bot 1, Bot 2, Bot 3   |
      +----------------------+                   +-----------+-----------+
                                                             |
                                                             v
                                                 +-----------------------+
                                                 | Private Channel Audio |
                                                 |  Permanent Storage    |
                                                 +-----------------------+
```

### Multi-Bot Redundancy & Race Pool
- Configured via `TELEGRAM_BOT_TOKENS=token1,token2,token3` and `TELEGRAM_CHANNEL_ID`.
- **Admin Upload**: Audio is uploaded to the private Telegram channel using Bot 1. If Bot 1 encounters a rate limit or network issue, it instantly fails over to Bot 2.
- **Fast Playback Retrieval**: On `/api/stream/:id`, the streaming service queries `getFile` through a racing/failover pool:
  - Dispatches to the primary bot; if response takes $> 1500\text{ ms}$ or fails, the secondary bot is triggered in parallel. Whichever bot stream connects first feeds the spooler, ensuring sub-second playback startup.

### 64 KB Seekable Range Streaming
1. Client requests `GET /api/songs/:id/play` with active device session token.
2. Backend verifies licence/free mode and issues an HMAC-SHA256 signed URL valid for 10 minutes: `/api/stream/:id?token=...&d=...`.
3. Client requests `GET /api/stream/:id?token=...`.
4. Backend downloads audio to `/tmp/melody-<songId>-<uuid>.mp3` with concurrency throttling.
5. Audio is streamed using `fs.createReadStream(path, { start, end, highWaterMark: 65536 })`.
6. Sets HTTP 206 Partial Content headers:
   - `Content-Range: bytes <start>-<end>/<total>`
   - `Accept-Ranges: bytes`
   - `Content-Length: <chunk-length>`
   - `Content-Type: audio/mpeg`
7. **Lifecycle Deletion**:
   - `res.on('finish')`, `res.on('close')`, and stream error events invoke `fs.unlink()` to erase the temp file immediately.
   - Periodic cron runs every 5 minutes and cleans any `/tmp/melody-*` files older than 30 minutes.

---

## 4. Database Schema (PostgreSQL 18)

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  surname VARCHAR(50) NOT NULL,
  mobile VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Songs table
CREATE TABLE IF NOT EXISTS songs (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  artist VARCHAR(255) NOT NULL,
  album VARCHAR(255),
  language VARCHAR(50) NOT NULL DEFAULT 'english',
  duration_seconds INT NOT NULL DEFAULT 0,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  telegram_file_id VARCHAR(255) NOT NULL,
  telegram_message_id BIGINT NOT NULL,
  cover_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_songs_search ON songs (LOWER(title), LOWER(artist), LOWER(language));

-- Licences table
CREATE TABLE IF NOT EXISTS licences (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  licence_key VARCHAR(20) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  max_devices INT NOT NULL DEFAULT 5,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  licence_id INT REFERENCES licences(id) ON DELETE CASCADE,
  device_id VARCHAR(100) NOT NULL,
  device_name VARCHAR(100) NOT NULL,
  device_token_hash VARCHAR(255) NOT NULL,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(licence_id, device_id)
);

-- Playlists table
CREATE TABLE IF NOT EXISTS playlists (
  id SERIAL PRIMARY KEY,
  licence_id INT REFERENCES licences(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Playlist Songs table
CREATE TABLE IF NOT EXISTS playlist_songs (
  playlist_id INT REFERENCES playlists(id) ON DELETE CASCADE,
  song_id INT REFERENCES songs(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  PRIMARY KEY (playlist_id, song_id)
);

-- Favourites table
CREATE TABLE IF NOT EXISTS favourites (
  licence_id INT REFERENCES licences(id) ON DELETE CASCADE,
  song_id INT REFERENCES songs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (licence_id, song_id)
);

-- Recently Played table (Spotify-style user playback history)
CREATE TABLE IF NOT EXISTS recent_plays (
  id SERIAL PRIMARY KEY,
  licence_id INT REFERENCES licences(id) ON DELETE CASCADE,
  song_id INT REFERENCES songs(id) ON DELETE CASCADE,
  played_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recent_plays_licence ON recent_plays (licence_id, played_at DESC);
```

---

## 5. Auth, Licence Keys & Device Limit

### Option 1 Licence Key Generation
- Format: Exactly 12 characters.
- $\text{Key} = \text{UPPER}(\text{first 3 letters of first\_name}) + \text{UPPER}(\text{first 3 letters of surname}) + \text{last 6 digits of mobile}$.
- Formatted display: `RAHS-HA98-7654` (3 parts with hyphens, hyphens stripped before DB query).
- **Security Rule**: Backend strictly checks the `licences` table. Random keys matching the format are rejected immediately.

### Business Phase Flag
- `FREE_MODE=true`: Anyone can stream without an active key or payment.
- `FREE_MODE=false`: Playback requires an activated device token linked to a paid licence (`paid_at IS NOT NULL`).

### Activation & Device Concurrency (5-Device Limit)
- `POST /activate` with `{ key, device_id, device_name }`.
  1. Validates key exists in `licences` with `status = 'active'`. In Phase 2 (`FREE_MODE=false`), checks `paid_at IS NOT NULL`.
  2. If `device_id` already exists for this licence: updates `last_active_at`, generates new JWT device session token, returns 200.
  3. If new `device_id`:
     - Counts active devices under this licence.
     - If count $< 5$: inserts device, issues JWT device token, returns 200.
     - If count $\ge 5$: returns `HTTP 403 DEVICE_LIMIT_REACHED` with the list of current 5 active devices `[{ device_id, device_name, last_active_at }]`.
- `POST /devices/:deviceId/logout`: Revokes the specified device slot from the `devices` table.
- All playback routes verify device session status in database.

---

## 6. Complete API Specifications

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/activate` | Key-only activation, registers device slot | Public |
| `POST` | `/devices/:deviceId/logout` | Revokes specific device session | Device Token |
| `GET` | `/devices` | Lists registered devices for current licence | Device Token |
| `GET` | `/api/songs` | Search songs by title, artist, language with pagination | Public / Device Token |
| `GET` | `/api/songs/:id` | Returns metadata only (no file_id or bot tokens) | Public / Device Token |
| `GET` | `/api/songs/:id/play` | Generates 10-minute signed stream URL | Device Token (or Public if FREE_MODE) |
| `GET` | `/api/stream/:id` | Streams 64 KB HTTP 206 audio chunks | Signed Stream Token |
| `GET` | `/api/playlists` | List user playlists | Device Token |
| `POST` | `/api/playlists` | Create user playlist | Device Token |
| `POST` | `/api/playlists/:id/songs`| Add song to playlist | Device Token |
| `DELETE` | `/api/playlists/:id/songs/:songId` | Remove song from playlist | Device Token |
| `GET` | `/api/favourites` | List favourite songs | Device Token |
| `POST` | `/api/favourites/:songId` | Add song to favourites | Device Token |
| `DELETE`| `/api/favourites/:songId` | Remove song from favourites | Device Token |
| `GET` | `/api/history` | List recently played songs for current licence (Spotify style) | Device Token |
| `POST` | `/api/songs/:id/played` | Record song play in listening history | Device Token (or Public if FREE_MODE) |
| `POST` | `/api/admin/upload` | Multipart audio + cover upload -> Telegram -> DB | Admin Secret |
| `POST` | `/api/admin/licences` | Issues user + Option 1 licence key | Admin Secret |
| `POST` | `/api/checkout/mock` | Simulates ₹49 payment & issues licence key | Public / Device Token |

---

## 7. Verification & Testing Criteria
1. **Admin Upload**: Admin uploads MP3 $\le$ 20 MB + JPG cover -> sent to Telegram channel -> saved to PostgreSQL.
2. **FREE_MODE Playback**: When `FREE_MODE=true`, user can search, request stream, and seek without an activation key.
3. **Paid Mode Playback**: When `FREE_MODE=false`, streaming without a valid paid key returns 401/403.
4. **Option 1 Key Validation**: Generates `RAHS-HA98-7654`, successfully activates, rejects fictitious keys.
5. **5-Device Limit Enforcement**: Registering a 6th device returns `HTTP 403 DEVICE_LIMIT_REACHED` with the 5 devices; logging out one device frees the slot for the 6th.
6. **Streaming & Cleanup**: Spools to `/tmp/melody-*`, streams 64 KB chunks with HTTP 206 Range headers; file is removed on stream end/client abort. Orphan cleaner cleans files $> 30\text{ min}$.
7. **Security**: Telegram bot token and `telegram_file_id` never exposed in client responses.
