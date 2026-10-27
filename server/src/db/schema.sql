-- Melody Database Schema (PostgreSQL 18 Free Tier Optimized)
-- Strict constraints: 1 CPU, 1 GB RAM, 1 GB storage. Zero audio binary stored in DB.

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  surname VARCHAR(50) NOT NULL,
  mobile VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Songs Table (Metadata + Telegram references only)
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

-- Search Index on lower-cased title, artist, and language
CREATE INDEX IF NOT EXISTS idx_songs_search ON songs (LOWER(title), LOWER(artist), LOWER(language));
CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs (artist);
CREATE INDEX IF NOT EXISTS idx_songs_language ON songs (language);

-- 3. Licences Table (Option 1 key, 5 max devices)
CREATE TABLE IF NOT EXISTS licences (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  licence_key VARCHAR(20) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  max_devices INT NOT NULL DEFAULT 5,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_licences_key ON licences (licence_key);

-- 4. Devices Table (Active device sessions per licence)
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

CREATE INDEX IF NOT EXISTS idx_devices_licence ON devices (licence_id);

-- 5. Playlists Table
CREATE TABLE IF NOT EXISTS playlists (
  id SERIAL PRIMARY KEY,
  licence_id INT REFERENCES licences(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Playlist Songs Junction Table
CREATE TABLE IF NOT EXISTS playlist_songs (
  playlist_id INT REFERENCES playlists(id) ON DELETE CASCADE,
  song_id INT REFERENCES songs(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  PRIMARY KEY (playlist_id, song_id)
);

-- 7. Favourites Table
CREATE TABLE IF NOT EXISTS favourites (
  licence_id INT REFERENCES licences(id) ON DELETE CASCADE,
  song_id INT REFERENCES songs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (licence_id, song_id)
);

-- 8. Recently Played Table (Spotify-style playback history)
CREATE TABLE IF NOT EXISTS recent_plays (
  id SERIAL PRIMARY KEY,
  licence_id INT REFERENCES licences(id) ON DELETE CASCADE,
  song_id INT REFERENCES songs(id) ON DELETE CASCADE,
  played_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recent_plays_history ON recent_plays (licence_id, played_at DESC);
