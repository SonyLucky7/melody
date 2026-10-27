# Melody Shared Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the high-performance, Spotify-style shared backend for Melody (Android, Web, Windows, Mac) with Telegram multi-bot audio storage, ephemeral 64 KB range streaming, Option 1 licence keys, 5-device concurrency management, and zero audio stored in PostgreSQL.

**Architecture:** Node.js + Express 5 with TypeScript. Audio is stored permanently only in a private Telegram channel via a multi-bot race pool. Streamed via ephemeral 64 KB HTTP 206 partial-content spools that auto-delete immediately on stream end/abort. PostgreSQL stores only lightweight text metadata, licence keys, device sessions, playlists, favourites, and recently played history.

**Tech Stack:** Node.js 20+, Express 5, TypeScript, PostgreSQL (`pg`), Multer, JsonWebToken, Node-Cron, Supertest.

**Spec:** [`docs/superpowers/specs/2026-10-27-melody-system-design.md`](file:///d:/rea%20Projects/melody/docs/superpowers/specs/2026-10-27-melody-system-design.md)

## Global Constraints
- App Server RAM: Max 1–2 GB RAM; Node.js memory footprint $\le 100\text{ MB}$.
- App Server Disk: Ephemeral temp streaming spools limited to $\le 500\text{ MB}$; never permanent audio on disk.
- Database: Free PostgreSQL 18 (1 CPU, 1 GB RAM, 1 GB storage). Max 10 connections in pool. Zero audio bytes in DB.
- Audio Quality: Up to 320 kbps high fidelity stereo MP3/AAC, $\le 20\text{ MB}$ per file (Telegram Bot limit).
- Licensing: Option 1 format (12 characters: `RAHS-HA98-7654`), verified strictly against DB.
- Device Limit: Max 5 active devices per licence; 6th device receives `HTTP 403 DEVICE_LIMIT_REACHED` with active device list.
- Free Mode Switch: `FREE_MODE=true` enables open playback; `FREE_MODE=false` requires paid licence.

---

### Task 1: Project Scaffolding & Strongly Typed Configuration

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/src/config.ts`
- Create: `server/.env.example`
- Create: `server/.env`

**Interfaces:**
- Produces: `config` object exporting `port`, `databaseUrl`, `telegramBotTokens`, `telegramChannelId`, `sessionSecret`, `freeMode`, `adminSecret`, `tempDir`, `maxConcurrentStreams`.

- [ ] **Step 1: Write package.json and tsconfig.json**
- [ ] **Step 2: Create src/config.ts with dotenv validation**
- [ ] **Step 3: Create .env.example and populate .env with provided Aiven database credentials**
- [ ] **Step 4: Install dependencies and verify compilation**
- [ ] **Step 5: Commit scaffolding**

---

### Task 2: PostgreSQL Database Schema, Client Pool & Migration Runner

**Files:**
- Create: `server/src/db/schema.sql`
- Create: `server/src/db/client.ts`
- Create: `server/src/db/migrate.ts`
- Test: `server/tests/db.test.ts`

**Interfaces:**
- Consumes: `config.databaseUrl`
- Produces: `query(text, params)`, `pool`, `runMigrations()`

- [ ] **Step 1: Write database schema SQL (users, songs, licences, devices, playlists, playlist_songs, favourites, recent_plays)**
- [ ] **Step 2: Implement pg.Pool client with SSL support and max 10 connections limit**
- [ ] **Step 3: Implement automated migration runner**
- [ ] **Step 4: Write test verifying schema creation and constraints**
- [ ] **Step 5: Run migration test and commit**

---

### Task 3: Option 1 Licence Key Service, Device Concurrency & Auth Middleware

**Files:**
- Create: `server/src/services/licence.ts`
- Create: `server/src/middleware/auth.ts`
- Create: `server/src/controllers/auth.controller.ts`
- Create: `server/src/routes/device.routes.ts`
- Test: `server/tests/auth.test.ts`

**Interfaces:**
- Consumes: `query()`
- Produces:
  - `generateOption1Key(firstName, surname, mobile): string`
  - `formatLicenceKey(rawKey): string`
  - `verifyDeviceSession(req, res, next)`
  - `POST /activate`, `POST /devices/:deviceId/logout`, `GET /devices`

- [ ] **Step 1: Write failing tests for Option 1 key formatting and 5-device limit**
- [ ] **Step 2: Implement Option 1 key generation (`first 3 first_name + first 3 surname + last 6 mobile`)**
- [ ] **Step 3: Implement device session management with 5-device limit and HTTP 403 response**
- [ ] **Step 4: Implement auth verification middleware**
- [ ] **Step 5: Run tests and commit**

---

### Task 4: Telegram Multi-Bot Storage & Racing Service

**Files:**
- Create: `server/src/services/telegram.ts`
- Test: `server/tests/telegram.test.ts`

**Interfaces:**
- Consumes: `config.telegramBotTokens`, `config.telegramChannelId`
- Produces:
  - `uploadAudioToTelegram(buffer, filename, mimeType)`
  - `getTelegramFileUrl(fileId)` with 2–3 bot racing/failover
  - `downloadTelegramFileStream(fileId)`

- [ ] **Step 1: Write unit test mocking Telegram Bot API upload and download**
- [ ] **Step 2: Implement multi-bot racing and automatic failover pool**
- [ ] **Step 3: Implement audio upload and Telegram file URL resolver**
- [ ] **Step 4: Verify multi-bot failover handling**
- [ ] **Step 5: Commit Telegram service**

---

### Task 5: Ephemeral 64 KB Range Streaming Engine & Auto-Delete Lifecycle

**Files:**
- Create: `server/src/services/stream.ts`
- Create: `server/src/services/cleanup.ts`
- Modify: `server/src/controllers/song.controller.ts`
- Test: `server/tests/stream.test.ts`

**Interfaces:**
- Consumes: `telegramService`, `config.tempDir`
- Produces:
  - `generateSignedStreamToken(songId, deviceId)`
  - `verifySignedStreamToken(token, songId)`
  - `streamSong(req, res, songId)` with HTTP 206 Partial Content in 64 KB chunks
  - Immediate `fs.unlink()` on client disconnect/finish
  - Cron cleanup job every 5 minutes for orphaned files $> 30\text{ min}$

- [ ] **Step 1: Write test for HTTP 206 partial content range requests and immediate file cleanup**
- [ ] **Step 2: Implement signed 10-minute stream token generator & verifier**
- [ ] **Step 3: Implement spooler and 64 KB chunk Range streaming**
- [ ] **Step 4: Implement immediate cleanup hooks and periodic orphan cleaner**
- [ ] **Step 5: Run streaming tests and commit**

---

### Task 6: Music Catalog, Playlists, Favourites & Spotify-Style Recent Plays History

**Files:**
- Create: `server/src/controllers/song.controller.ts`
- Create: `server/src/controllers/playlist.controller.ts`
- Create: `server/src/controllers/favourite.controller.ts`
- Create: `server/src/routes/api.routes.ts`
- Test: `server/tests/api.test.ts`

**Interfaces:**
- Produces:
  - `GET /api/songs` (search by title, artist, language with pagination)
  - `GET /api/songs/:id` (metadata only, no telegram_file_id)
  - `GET /api/songs/:id/play` (signed stream URL)
  - `GET /api/playlists`, `POST /api/playlists`, `POST /api/playlists/:id/songs`, `DELETE /api/playlists/:id/songs/:songId`
  - `POST /api/favourites/:songId`, `DELETE /api/favourites/:songId`, `GET /api/favourites`
  - `GET /api/history`, `POST /api/songs/:id/played` (Spotify-style listening history)

- [ ] **Step 1: Write tests for search, playlists, favourites, and recently played**
- [ ] **Step 2: Implement song search controller with indexed queries**
- [ ] **Step 3: Implement playlist and favourites controllers**
- [ ] **Step 4: Implement recently played history controller**
- [ ] **Step 5: Run tests and commit**

---

### Task 7: Admin Upload Pipeline & Checkout Simulation

**Files:**
- Create: `server/src/controllers/admin.controller.ts`
- Create: `server/src/routes/admin.routes.ts`
- Create: `server/src/middleware/admin.ts`
- Test: `server/tests/admin.test.ts`

**Interfaces:**
- Produces:
  - `POST /api/admin/upload` (multipart audio + cover -> Telegram channel -> DB)
  - `POST /api/admin/licences` (admin generates user + Option 1 key)
  - `POST /api/checkout/mock` (simulates ₹49 payment and activates licence)

- [ ] **Step 1: Write test for admin upload validation (MP3 only, $\le 20\text{ MB}$, JPG cover)**
- [ ] **Step 2: Implement Multer upload handler and Telegram channel forwarding**
- [ ] **Step 3: Implement admin licence issuing and mock payment checkout**
- [ ] **Step 4: Run tests and commit**

---

### Task 8: Server Assembly, Healthcheck, Comprehensive Verification & README

**Files:**
- Create: `server/src/index.ts`
- Create: `server/README.md`
- Test: `server/tests/e2e.test.ts`

**Interfaces:**
- Produces: Express server running on port `PORT`, graceful shutdown, full checklist passing.

- [ ] **Step 1: Assemble Express server with CORS, Helmet, RateLimiting, and Routes**
- [ ] **Step 2: Write end-to-end integration test covering all 8 delivery requirements**
- [ ] **Step 3: Run comprehensive test suite and verify 100% pass**
- [ ] **Step 4: Write production deployment and operations guide in README.md**
- [ ] **Step 5: Final commit for Sub-Project 1**
