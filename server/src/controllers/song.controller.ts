import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { query } from '../db/client';
import { config } from '../config';
import { generateSignedStreamToken, verifySignedStreamToken, handleAudioStream } from '../services/stream';
import { telegramService } from '../services/telegram';

/**
 * Search & List Songs with pagination
 * PostgreSQL indexed search only — never Telegram
 */
export async function getSongs(req: AuthenticatedRequest, res: Response): Promise<void> {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const language = typeof req.query.language === 'string' ? req.query.language.trim() : '';
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 1000);
  const offset = Math.max(parseInt(req.query.offset as string, 10) || 0, 0);

  let whereClauses: string[] = [];
  let params: any[] = [];
  let pIdx = 1;

  if (search) {
    whereClauses.push(`(LOWER(title) LIKE $${pIdx} OR LOWER(artist) LIKE $${pIdx} OR LOWER(album) LIKE $${pIdx})`);
    params.push(`%${search.toLowerCase()}%`);
    pIdx++;
  }

  if (language) {
    whereClauses.push(`LOWER(language) = $${pIdx}`);
    params.push(language.toLowerCase());
    pIdx++;
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  try {
    // Note: Fetch telegram_file_id for background server warmup, but strip before returning to client
    const sql = `
      SELECT id, title, artist, album, language, duration_seconds, file_size_bytes, cover_url, created_at, telegram_file_id
      FROM songs
      ${whereSql}
      ORDER BY id DESC
      LIMIT $${pIdx} OFFSET $${pIdx + 1}
    `;
    params.push(limit, offset);

    const countSql = `SELECT COUNT(*) as total FROM songs ${whereSql}`;
    const [dataRes, countRes] = await Promise.all([
      query(sql, params),
      query(countSql, params.slice(0, pIdx - 1)),
    ]);

    // Gently pre-warm only the very top 3 trending tracks on initial home load (never on pagination/search)
    const fileIds = dataRes.rows.map((r: any) => r.telegram_file_id).filter(Boolean);
    if (offset === 0 && !search && fileIds.length > 0) {
      telegramService.warmupFiles(fileIds.slice(0, 3));
    }

    // Strip telegram_file_id before sending to client
    const clientData = dataRes.rows.map(({ telegram_file_id, ...rest }: any) => rest);

    res.status(200).json({
      success: true,
      data: clientData,
      total: parseInt(countRes.rows[0]?.total || '0', 10),
      limit,
      offset,
    });
  } catch (err: any) {
    console.error('[Get Songs Error]:', err);
    res.status(500).json({ error: 'DATABASE_ERROR', message: 'Failed to fetch songs.' });
  }
}

/**
 * Get song metadata by ID (no telegram_file_id)
 */
export async function getSongById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const songId = parseInt(req.params.id, 10);
  if (isNaN(songId)) {
    res.status(400).json({ error: 'INVALID_ID', message: 'Song ID must be an integer.' });
    return;
  }

  try {
    const songRes = await query(
      `SELECT id, title, artist, album, language, duration_seconds, file_size_bytes, cover_url, created_at
       FROM songs
       WHERE id = $1`,
      [songId]
    );

    if (songRes.rows.length === 0) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Song not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      data: songRes.rows[0],
    });
  } catch (err: any) {
    console.error('[Get Song By ID Error]:', err);
    res.status(500).json({ error: 'DATABASE_ERROR', message: 'Failed to fetch song details.' });
  }
}

/**
 * Request Playback URL
 * Validates FREE_MODE or active device session -> returns 10-minute signed stream URL
 */
export async function getSongPlayUrl(req: AuthenticatedRequest, res: Response): Promise<void> {
  const songId = parseInt(req.params.id, 10);
  if (isNaN(songId)) {
    res.status(400).json({ error: 'INVALID_ID', message: 'Song ID must be an integer.' });
    return;
  }

  // Device session is attached by verifyDeviceSession middleware (or guest if FREE_MODE)
  const deviceId = req.session?.deviceId || 'guest-device';

  try {
    // Verify song exists
    const songRes = await query('SELECT id FROM songs WHERE id = $1', [songId]);
    if (songRes.rows.length === 0) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Song not found.' });
      return;
    }

    // Generate signed HMAC token valid for 10 minutes
    const signedToken = generateSignedStreamToken(songId, deviceId);
    const streamUrl = `/api/stream/${songId}?token=${signedToken}`;

    res.status(200).json({
      success: true,
      songId,
      streamUrl,
      expiresInSeconds: 600, // 10 minutes
    });
  } catch (err: any) {
    console.error('[Get Play URL Error]:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to generate play URL.' });
  }
}

/**
 * Audio Stream Endpoint
 * Validates token and serves 64 KB HTTP 206 Range Stream
 * In Free Mode: Allows instant zero-roundtrip direct streaming!
 */
export async function streamAudio(req: AuthenticatedRequest, res: Response): Promise<void> {
  const songId = parseInt(req.params.id, 10);
  const token = req.query.token as string;

  if (isNaN(songId)) {
    res.status(400).json({ error: 'BAD_REQUEST', message: 'Song ID must be an integer.' });
    return;
  }

  // If Free Mode is active, allow instant streaming directly
  if (!config.freeMode) {
    if (!token) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'Stream token is required.' });
      return;
    }
    const isValid = verifySignedStreamToken(token, songId);
    if (!isValid) {
      res.status(401).json({ error: 'TOKEN_EXPIRED', message: 'Stream token has expired or is invalid.' });
      return;
    }
  } else if (token) {
    // If token provided in free mode, verify gently
    verifySignedStreamToken(token, songId);
  }

  await handleAudioStream(req, res, songId);
}

/**
 * Pre-warm Stream
 * Resolves Telegram file download URL in memory ahead of time
 * so when user taps play or track switches, playback starts in <150ms!
 */
export async function prewarmStream(req: AuthenticatedRequest, res: Response): Promise<void> {
  const songId = parseInt(req.params.id, 10);
  if (isNaN(songId)) {
    res.status(400).json({ error: 'INVALID_ID' });
    return;
  }

  try {
    const songRes = await query(
      `SELECT telegram_file_id FROM songs WHERE id = $1`,
      [songId]
    );

    if (songRes.rows.length > 0 && songRes.rows[0].telegram_file_id) {
      telegramService.getFileDownloadUrl(songRes.rows[0].telegram_file_id).catch(() => {});
    }

    res.status(200).json({ success: true, songId, prewarmed: true });
  } catch {
    res.status(200).json({ success: false, songId });
  }
}

/**
 * Record Song Playback (Spotify-style Recent Plays History)
 */
export async function recordSongPlay(req: AuthenticatedRequest, res: Response): Promise<void> {
  const songId = parseInt(req.params.id, 10);
  if (isNaN(songId)) {
    res.status(400).json({ error: 'INVALID_ID', message: 'Song ID must be an integer.' });
    return;
  }

  const licenceId = req.session?.licenceId || 0;

  try {
    if (licenceId > 0) {
      await query(
        `INSERT INTO recent_plays (licence_id, song_id, played_at)
         VALUES ($1, $2, NOW())`,
        [licenceId, songId]
      );
    }
    res.status(200).json({ success: true, message: 'Playback recorded.' });
  } catch (err: any) {
    console.error('[Record Play Error]:', err);
    res.status(500).json({ error: 'DATABASE_ERROR', message: 'Failed to record playback.' });
  }
}

/**
 * Get Spotify-Style Recently Played Songs
 */
export async function getRecentlyPlayed(req: AuthenticatedRequest, res: Response): Promise<void> {
  const licenceId = req.session?.licenceId || 0;

  try {
    const resHistory = await query(
      `SELECT DISTINCT ON (s.id) 
              s.id, s.title, s.artist, s.album, s.language, s.duration_seconds, s.cover_url, rp.played_at
       FROM recent_plays rp
       JOIN songs s ON s.id = rp.song_id
       WHERE rp.licence_id = $1
       ORDER BY s.id, rp.played_at DESC
       LIMIT 30`,
      [licenceId]
    );

    // Re-sort by played_at descending
    const sorted = resHistory.rows.sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime());

    res.status(200).json({
      success: true,
      data: sorted,
    });
  } catch (err: any) {
    console.error('[Get History Error]:', err);
    res.status(500).json({ error: 'DATABASE_ERROR', message: 'Failed to fetch recently played.' });
  }
}
