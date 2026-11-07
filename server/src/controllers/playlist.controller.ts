import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { query } from '../db/client';

export const CURATED_PLAYLISTS = [
  {
    id: 10,
    name: 'Motivation Vol. 1',
    description: 'Drake, Lil Wayne, 50 Cent, Eminem & high-energy workout bangers.',
    total_songs: 92,
    cover_url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80',
    query: `SELECT id, title, artist, album, language, duration_seconds, cover_url FROM songs WHERE album = 'Motivation Vol. 1' ORDER BY id DESC`,
  },
  {
    id: 11,
    name: 'Motivation Vol. 2',
    description: 'Trophies, Steady Mobbin, We Dem Boyz, Black and Yellow workout power.',
    total_songs: 91,
    cover_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80',
    query: `SELECT id, title, artist, album, language, duration_seconds, cover_url FROM songs WHERE album = 'Motivation Vol. 2' ORDER BY id DESC`,
  },
  {
    id: 12,
    name: 'Brazil Phonk Essentials',
    description: 'Montagem, Automotivo, Brazilian drift phonk, funk pesado & bass boosts.',
    total_songs: 312,
    cover_url: 'https://image-cdn-ak.spotifycdn.com/image/ab67706c0000d72c469ab8293c7d2056b6c9df23',
    query: `SELECT id, title, artist, album, language, duration_seconds, cover_url FROM songs WHERE LOWER(album) LIKE '%brazil%' OR LOWER(title) LIKE '%montagem%' OR LOWER(title) LIKE '%automotivo%' OR id IN (SELECT song_id FROM playlist_songs WHERE playlist_id = 12) ORDER BY id DESC`,
  },
  {
    id: 9,
    name: 'TikTok Phonk',
    description: 'Kordhell, DVRST, Hensonn, phonk drift and bass heavy tracks.',
    total_songs: 60,
    cover_url: 'https://image-cdn-ak.spotifycdn.com/image/ab67706c0000d72c469ab8293c7d2056b6c9df23',
    query: `SELECT id, title, artist, album, language, duration_seconds, cover_url FROM songs WHERE LOWER(album) LIKE '%phonk%' OR LOWER(album) LIKE '%brazil%' OR LOWER(language) = 'phonk' OR LOWER(title) LIKE '%phonk%' OR LOWER(title) LIKE '%montagem%' OR LOWER(title) LIKE '%automotivo%' ORDER BY id DESC`,
  },
  {
    id: 3,
    name: 'Slowed + Reverb Essentials',
    description: 'Late night slowed and reverbed vibes, lofi & atmospheric chill.',
    total_songs: 95,
    cover_url: 'https://melody-chi-nine.vercel.app/covers/weeknd-song-7.jpg',
    query: `SELECT id, title, artist, album, language, duration_seconds, cover_url FROM songs WHERE LOWER(title) LIKE '%slowed%' OR LOWER(title) LIKE '%reverb%' OR LOWER(album) LIKE '%slowed%' ORDER BY id DESC`,
  },
  {
    id: 4,
    name: 'Sidhu Moose Wala Legends',
    description: '295, The Last Ride, Legend, Levels, So High & all iconic anthems.',
    total_songs: 9,
    cover_url: 'https://melody-chi-nine.vercel.app/covers/desi-295-mvs26s80.jpg',
    query: `SELECT id, title, artist, album, language, duration_seconds, cover_url FROM songs WHERE LOWER(artist) LIKE '%moose wala%' ORDER BY id DESC`,
  },
  {
    id: 5,
    name: 'Yo Yo Honey Singh Blockbusters',
    description: 'Dope Shope, Blue Eyes, Desi Kalakaar, Love Dose & legendary Punjabi hits.',
    total_songs: 10,
    cover_url: 'https://melody-chi-nine.vercel.app/covers/desi-dope-shope-mvs2dv2r.jpg',
    query: `SELECT id, title, artist, album, language, duration_seconds, cover_url FROM songs WHERE LOWER(artist) LIKE '%honey singh%' ORDER BY id DESC`,
  },
  {
    id: 6,
    name: 'The Weeknd Master Collection',
    description: 'Blinding Lights, Starboy, After Hours, Die For You & Abel classics.',
    total_songs: 54,
    cover_url: 'https://melody-chi-nine.vercel.app/covers/the-weeknd-avatar.jpg',
    query: `SELECT id, title, artist, album, language, duration_seconds, cover_url FROM songs WHERE LOWER(artist) LIKE '%weeknd%' ORDER BY id DESC`,
  },
  {
    id: 7,
    name: 'Lana Del Rey Aesthetics',
    description: 'Summertime Sadness, Video Games, Young and Beautiful, Born to Die.',
    total_songs: 31,
    cover_url: 'https://melody-chi-nine.vercel.app/covers/lana-collection.jpg',
    query: `SELECT id, title, artist, album, language, duration_seconds, cover_url FROM songs WHERE LOWER(artist) LIKE '%lana%' ORDER BY id DESC`,
  },
  {
    id: 8,
    name: 'Ariana Grande Top Hits',
    description: '7 rings, thank u next, Dangerous Woman, positions & pop royalty.',
    total_songs: 60,
    cover_url: 'https://melody-chi-nine.vercel.app/covers/ariana-7-rings-mvrzjch5.jpg',
    query: `SELECT id, title, artist, album, language, duration_seconds, cover_url FROM songs WHERE LOWER(artist) LIKE '%ariana%' ORDER BY id DESC`,
  },
];

export async function getPlaylists(req: AuthenticatedRequest, res: Response): Promise<void> {
  const licenceId = req.session?.licenceId || 0;
  const deviceId = req.session?.deviceId || (req.headers['x-device-id'] as string) || '';

  try {
    const playlistsRes = await query(
      `SELECT p.id, p.name, p.created_at, COUNT(ps.song_id)::int as total_songs
       FROM playlists p
       LEFT JOIN playlist_songs ps ON ps.playlist_id = p.id
       WHERE (
         p.is_public = true
         OR p.licence_id IS NULL
         OR ($1 > 0 AND p.licence_id = $1)
         OR ($1 = 0 AND $2 != '' AND p.device_id = $2)
       )
       GROUP BY p.id
       ORDER BY p.id DESC`,
      [licenceId, deviceId]
    );

    const curatedList = CURATED_PLAYLISTS.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      cover_url: c.cover_url,
      total_songs: c.total_songs,
      is_public: true,
      created_at: new Date().toISOString(),
    }));

    const userPlaylists = playlistsRes.rows.filter(
      (r: any) => !CURATED_PLAYLISTS.some((c) => c.id === r.id)
    );

    res.status(200).json({
      success: true,
      data: [...curatedList, ...userPlaylists],
    });
  } catch (err: any) {
    console.error('[Get Playlists Error]:', err);
    res.status(500).json({ error: 'DATABASE_ERROR', message: 'Failed to fetch playlists.' });
  }
}

export async function createPlaylist(req: AuthenticatedRequest, res: Response): Promise<void> {
  const licenceId = req.session?.licenceId || 0;
  const deviceId = req.session?.deviceId || (req.headers['x-device-id'] as string) || 'guest-device';
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';

  if (!name) {
    res.status(400).json({ error: 'BAD_REQUEST', message: 'Playlist name is required.' });
    return;
  }

  try {
    const createRes = await query(
      `INSERT INTO playlists (licence_id, device_id, name, is_public)
       VALUES ($1, $2, $3, true)
       RETURNING id, name, created_at`,
      [licenceId > 0 ? licenceId : null, deviceId, name]
    );

    res.status(201).json({
      success: true,
      data: {
        ...createRes.rows[0],
        total_songs: 0,
      },
    });
  } catch (err: any) {
    console.error('[Create Playlist Error]:', err);
    res.status(500).json({ error: 'DATABASE_ERROR', message: 'Failed to create playlist.' });
  }
}

export async function getPlaylistSongs(req: AuthenticatedRequest, res: Response): Promise<void> {
  const licenceId = req.session?.licenceId || 0;
  const deviceId = req.session?.deviceId || (req.headers['x-device-id'] as string) || '';
  const playlistId = parseInt(req.params.id, 10);

  if (isNaN(playlistId)) {
    res.status(400).json({ error: 'INVALID_ID', message: 'Playlist ID must be an integer.' });
    return;
  }

  // 1. Instant resolution for Curated Public Playlists (Motivation 1 & 2, Phonk, Slowed, Weeknd, Sidhu, Honey Singh, Lana, Ariana)
  const curated = CURATED_PLAYLISTS.find((p) => p.id === playlistId);
  if (curated) {
    try {
      const songsRes = await query(curated.query);
      res.status(200).json({
        success: true,
        playlist: {
          id: curated.id,
          name: curated.name,
          description: curated.description,
          cover_url: curated.cover_url,
          total_songs: songsRes.rows.length,
          is_public: true,
        },
        songs: songsRes.rows,
      });
      return;
    } catch (err: any) {
      console.error(`[Curated Playlist ${playlistId} Error]:`, err);
    }
  }

  try {
    // Verify playlist belongs to licence or device
    const pCheck = await query(
      `SELECT id, name FROM playlists 
       WHERE id = $1 AND (
         is_public = true
         OR licence_id IS NULL
         OR ($2 > 0 AND licence_id = $2)
         OR ($2 = 0 AND $3 != '' AND device_id = $3)
       )`,
      [playlistId, licenceId, deviceId]
    );

    if (pCheck.rows.length === 0) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Playlist not found.' });
      return;
    }

    const songsRes = await query(
      `SELECT s.id, s.title, s.artist, s.album, s.language, s.duration_seconds, s.cover_url, ps.position
       FROM playlist_songs ps
       JOIN songs s ON s.id = ps.song_id
       WHERE ps.playlist_id = $1
       ORDER BY ps.position ASC, ps.song_id ASC`,
      [playlistId]
    );

    res.status(200).json({
      success: true,
      playlist: pCheck.rows[0],
      songs: songsRes.rows,
    });
  } catch (err: any) {
    console.error('[Get Playlist Songs Error]:', err);
    res.status(500).json({ error: 'DATABASE_ERROR', message: 'Failed to fetch playlist songs.' });
  }
}

export async function addSongToPlaylist(req: AuthenticatedRequest, res: Response): Promise<void> {
  const licenceId = req.session?.licenceId || 0;
  const deviceId = req.session?.deviceId || (req.headers['x-device-id'] as string) || '';
  const playlistId = parseInt(req.params.id, 10);
  const songId = parseInt(req.body.song_id, 10);

  if (isNaN(playlistId) || isNaN(songId)) {
    res.status(400).json({ error: 'BAD_REQUEST', message: 'Valid playlist ID and song_id required.' });
    return;
  }

  try {
    const pCheck = await query(
      `SELECT id FROM playlists 
       WHERE id = $1 AND (
         ($2 > 0 AND licence_id = $2)
         OR ($2 = 0 AND $3 != '' AND device_id = $3)
       )`,
      [playlistId, licenceId, deviceId]
    );

    if (pCheck.rows.length === 0) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Playlist not found.' });
      return;
    }

    // Get max position
    const posRes = await query(
      `SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM playlist_songs WHERE playlist_id = $1`,
      [playlistId]
    );
    const nextPos = posRes.rows[0]?.next_pos || 1;

    await query(
      `INSERT INTO playlist_songs (playlist_id, song_id, position)
       VALUES ($1, $2, $3)
       ON CONFLICT (playlist_id, song_id) DO NOTHING`,
      [playlistId, songId, nextPos]
    );

    res.status(200).json({ success: true, message: 'Song added to playlist.' });
  } catch (err: any) {
    console.error('[Add Song to Playlist Error]:', err);
    res.status(500).json({ error: 'DATABASE_ERROR', message: 'Failed to add song to playlist.' });
  }
}

export async function removeSongFromPlaylist(req: AuthenticatedRequest, res: Response): Promise<void> {
  const licenceId = req.session?.licenceId || 0;
  const deviceId = req.session?.deviceId || (req.headers['x-device-id'] as string) || '';
  const playlistId = parseInt(req.params.id, 10);
  const songId = parseInt(req.params.songId, 10);

  if (isNaN(playlistId) || isNaN(songId)) {
    res.status(400).json({ error: 'BAD_REQUEST', message: 'Valid playlist ID and song ID required.' });
    return;
  }

  try {
    const pCheck = await query(
      `SELECT id FROM playlists 
       WHERE id = $1 AND (
         ($2 > 0 AND licence_id = $2)
         OR ($2 = 0 AND $3 != '' AND device_id = $3)
       )`,
      [playlistId, licenceId, deviceId]
    );

    if (pCheck.rows.length === 0) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Playlist not found.' });
      return;
    }

    await query(
      `DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2`,
      [playlistId, songId]
    );

    res.status(200).json({ success: true, message: 'Song removed from playlist.' });
  } catch (err: any) {
    console.error('[Remove Song Error]:', err);
    res.status(500).json({ error: 'DATABASE_ERROR', message: 'Failed to remove song.' });
  }
}

export async function deletePlaylist(req: AuthenticatedRequest, res: Response): Promise<void> {
  const licenceId = req.session?.licenceId || 0;
  const deviceId = req.session?.deviceId || (req.headers['x-device-id'] as string) || '';
  const playlistId = parseInt(req.params.id, 10);

  if (isNaN(playlistId)) {
    res.status(400).json({ error: 'BAD_REQUEST', message: 'Valid playlist ID required.' });
    return;
  }

  try {
    const delRes = await query(
      `DELETE FROM playlists 
       WHERE id = $1 AND (
         ($2 > 0 AND licence_id = $2)
         OR ($2 = 0 AND $3 != '' AND device_id = $3)
       ) RETURNING id`,
      [playlistId, licenceId, deviceId]
    );

    if (delRes.rows.length === 0) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Playlist not found.' });
      return;
    }

    res.status(200).json({ success: true, message: 'Playlist deleted successfully.' });
  } catch (err: any) {
    console.error('[Delete Playlist Error]:', err);
    res.status(500).json({ error: 'DATABASE_ERROR', message: 'Failed to delete playlist.' });
  }
}
