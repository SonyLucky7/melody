import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { query } from '../db/client';

export async function getFavourites(req: AuthenticatedRequest, res: Response): Promise<void> {
  const licenceId = req.session?.licenceId || 0;
  const deviceId = req.session?.deviceId || (req.headers['x-device-id'] as string) || '';

  try {
    const favRes = await query(
      `SELECT DISTINCT ON (s.id) 
              s.id, s.title, s.artist, s.album, s.language, s.duration_seconds, s.cover_url, f.created_at
       FROM favourites f
       JOIN songs s ON s.id = f.song_id
       WHERE (
         ($1 > 0 AND f.licence_id = $1)
         OR ($1 = 0 AND $2 != '' AND f.device_id = $2)
       )
       ORDER BY s.id, f.created_at DESC`,
      [licenceId, deviceId]
    );

    // Sort by created_at descending so newest favourites appear first
    const sorted = favRes.rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.status(200).json({
      success: true,
      data: sorted,
    });
  } catch (err: any) {
    console.error('[Get Favourites Error]:', err);
    res.status(500).json({ error: 'DATABASE_ERROR', message: 'Failed to fetch favourites.' });
  }
}

export async function addFavourite(req: AuthenticatedRequest, res: Response): Promise<void> {
  const licenceId = req.session?.licenceId || 0;
  const deviceId = req.session?.deviceId || (req.headers['x-device-id'] as string) || 'anonymous-device';
  const songId = parseInt(req.params.songId, 10);

  if (isNaN(songId)) {
    res.status(400).json({ error: 'INVALID_ID', message: 'Valid song ID required.' });
    return;
  }

  try {
    if (licenceId > 0) {
      // Check if already in this licence's favourites
      const exists = await query(
        `SELECT id FROM favourites WHERE licence_id = $1 AND song_id = $2`,
        [licenceId, songId]
      );
      if (exists.rows.length === 0) {
        await query(
          `INSERT INTO favourites (licence_id, device_id, song_id) VALUES ($1, $2, $3)`,
          [licenceId, deviceId, songId]
        );
      }
    } else {
      await query(
        `INSERT INTO favourites (device_id, song_id)
         VALUES ($1, $2)
         ON CONFLICT (device_id, song_id) DO NOTHING`,
        [deviceId, songId]
      );
    }

    res.status(200).json({ success: true, message: 'Song added to favourites.' });
  } catch (err: any) {
    console.error('[Add Favourite Error]:', err);
    res.status(500).json({ error: 'DATABASE_ERROR', message: 'Failed to add favourite.' });
  }
}

export async function removeFavourite(req: AuthenticatedRequest, res: Response): Promise<void> {
  const licenceId = req.session?.licenceId || 0;
  const deviceId = req.session?.deviceId || (req.headers['x-device-id'] as string) || '';
  const songId = parseInt(req.params.songId, 10);

  if (isNaN(songId)) {
    res.status(400).json({ error: 'INVALID_ID', message: 'Valid song ID required.' });
    return;
  }

  try {
    await query(
      `DELETE FROM favourites 
       WHERE song_id = $1 
         AND (
           ($2 > 0 AND licence_id = $2)
           OR ($2 = 0 AND $3 != '' AND device_id = $3)
         )`,
      [songId, licenceId, deviceId]
    );

    res.status(200).json({ success: true, message: 'Song removed from favourites.' });
  } catch (err: any) {
    console.error('[Remove Favourite Error]:', err);
    res.status(500).json({ error: 'DATABASE_ERROR', message: 'Failed to remove favourite.' });
  }
}
