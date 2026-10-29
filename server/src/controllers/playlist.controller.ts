import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { query } from '../db/client';

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

    res.status(200).json({
      success: true,
      data: playlistsRes.rows,
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
