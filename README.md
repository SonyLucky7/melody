# 🎵 Melody - High-Fidelity Music Streaming Ecosystem

A Spotify-style music streaming ecosystem reverse-engineered and redesigned with **Melody** brand identity. Audio is stored permanently **exclusively in a private Telegram channel**, with an ultra-lightweight Node.js backend running on 1–2 GB RAM and a 1 GB PostgreSQL database.

---

## 📦 Project Deliverables

| Platform | Technology Stack | Location | Status |
| :--- | :--- | :--- | :--- |
| **Shared Backend** | Node.js + Express + TypeScript + PostgreSQL 18 + Telegram Multi-Bot Storage + 64 KB Range Streaming | [`server/`](server/) | ✅ Production Ready |
| **Web Player** | React 18 + Vite + Tailwind CSS + Media Session API + Spotify Dark UI | [`client/`](client/) | ✅ Production Ready |
| **Windows Desktop App** | Electron Desktop Wrapper + Media Keys + System Tray | [`client/`](client/) | ✅ Production Ready |
| **Mac Desktop App** | Electron macOS Wrapper + TouchBar/Media Integration | [`client/`](client/) | ✅ Production Ready |
| **Android Application** | Kotlin + AndroidX Media3 (ExoPlayer) + Jetpack Compose + Foreground Service | [`android/`](android/) | ✅ Production Ready |

---

## 💎 Core Architectural Features

### 1. 100% Free Premium Sound (320 kbps Studio Quality)
- Every single feature (unlimited high-fidelity streaming, playlist creation, liked tracks, playback history, device management) is **100% FREE** for all users.
- `FREE_MODE=true` is enabled by default.

### 2. Multi-Bot Telegram Storage & 64 KB Range Streaming
- **Permanent Storage in Telegram**: Songs are uploaded to a private Telegram channel via a **2–3 Bot Redundancy & Race Pool**. The server disk and PostgreSQL database never store audio permanently.
- **Zero RAM Bloat**: Audio is streamed in 64 KB chunks (`highWaterMark: 65536`), using $\le 80\text{ MB}$ RAM on the server.
- **Seekable HTTP 206 Streaming**: Full support for `Accept-Ranges`, `Content-Range`, and `Content-Length` headers, enabling instant scrubbing on Web `<audio>` and Android ExoPlayer.
- **Immediate File Cleanup**: Temp audio files (`/tmp/melody/melody-<id>-<uuid>.mp3`) are deleted immediately when a stream finishes or is aborted by the client. An automated 5-minute cron job removes any orphaned files older than 30 minutes.

### 3. Option 1 Licence Key & 5-Device Concurrency
- **12-Character Option 1 Key**: $\text{First 3 letters of First Name} + \text{First 3 letters of Surname} + \text{Last 6 digits of Mobile}$.
  - Example: *Rahul Sharma* with mobile ending *987654* $\rightarrow$ `RAHS-HA98-7654`.
- **5-Device Limit**: Key-only activation permits up to 5 concurrent active devices. A 6th device receives `HTTP 403 DEVICE_LIMIT_REACHED` with the list of current active devices. Users can log out any individual device to immediately free a slot.

---

## 🚀 Quick Start Guide

### 1. Run the Shared Backend
```bash
cd server
npm install
npm run migrate    # Applies database schema
npm run dev        # Starts server on http://localhost:5000
npm test           # Runs 9/9 unit & integration tests
```

### 2. Run the Web Player
```bash
cd client
npm install
npm run dev        # Starts web app on http://localhost:3000
```

### 3. Run the Windows / Mac Desktop App
```bash
cd client
npm run electron:start
```

### 4. Build the Android App
```bash
cd android
./gradlew assembleDebug
```

---

## 🎨 Brand Assets
All application icons, logos, and taskbar watermarks are loaded from:
- `logos/Melody-Logo-Pack`: App icon (1024x1024), Transparent logo, ICO file, vector artwork.
- `logos/Melody-Watermarks-Taskbar`: Multi-resolution taskbar icons (16, 24, 32, 48, 256) and watermarks.
