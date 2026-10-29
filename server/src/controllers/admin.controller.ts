import { Request, Response } from 'express';
import { query } from '../db/client';
import { telegramService } from '../services/telegram';
import { issueLicence } from '../services/licence';

export async function handleAdminUpload(req: Request, res: Response): Promise<void> {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  const audioFile = files?.['audio']?.[0];
  const coverFile = files?.['cover']?.[0];

  const title = (req.body.title || '').trim();
  const artist = (req.body.artist || '').trim();
  const album = (req.body.album || '').trim();
  const language = (req.body.language || 'english').trim().toLowerCase();

  if (!audioFile) {
    res.status(400).json({ error: 'MISSING_AUDIO', message: 'MP3 audio file is required in "audio" field.' });
    return;
  }

  if (!title || !artist) {
    res.status(400).json({ error: 'MISSING_METADATA', message: 'Title and artist are required.' });
    return;
  }

  // Strict Validation: Must be MP3 and <= 20 MB (Telegram Bot API limit)
  const isMp3 =
    audioFile.mimetype === 'audio/mpeg' ||
    audioFile.mimetype === 'audio/mp3' ||
    audioFile.originalname.toLowerCase().endsWith('.mp3');

  if (!isMp3) {
    res.status(400).json({
      error: 'INVALID_FORMAT',
      message: 'Invalid audio format. Only MP3 audio files are accepted.',
    });
    return;
  }

  if (audioFile.size > 20 * 1024 * 1024) {
    res.status(400).json({
      error: 'FILE_TOO_LARGE',
      message: `Audio file (${(audioFile.size / 1024 / 1024).toFixed(1)} MB) exceeds 20 MB Telegram Bot limit.`,
    });
    return;
  }

  try {
    // 1. Upload audio directly to Telegram private channel using multi-bot service
    const telegramResult = await telegramService.uploadAudio(
      audioFile.buffer,
      audioFile.originalname,
      title,
      artist,
      coverFile?.buffer
    );

    // Cover art URL: if uploaded, can point to cover preview or external static URL
    const coverUrl = req.body.cover_url || (coverFile ? `data:image/jpeg;base64,${coverFile.buffer.toString('base64')}` : null);

    // 2. Save metadata ONLY in PostgreSQL (no audio binary in DB)
    const insertRes = await query(
      `INSERT INTO songs (
        title, artist, album, language, duration_seconds, file_size_bytes, 
        telegram_file_id, telegram_message_id, cover_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, title, artist, album, language, duration_seconds, file_size_bytes, cover_url, created_at`,
      [
        title,
        artist,
        album || null,
        language,
        telegramResult.duration_seconds || 0,
        telegramResult.file_size_bytes || audioFile.size,
        telegramResult.telegram_file_id,
        telegramResult.telegram_message_id,
        coverUrl,
      ]
    );

    const song = insertRes.rows[0];

    // Optional Playlist Linking: If admin provided a playlist name, automatically link song
    const playlistName = (req.body.playlist || req.body.playlist_name || '').trim();
    if (playlistName) {
      try {
        let plRes = await query(`SELECT id FROM playlists WHERE LOWER(name) = LOWER($1)`, [playlistName]);
        let plId: number;
        if (plRes.rows.length > 0) {
          plId = plRes.rows[0].id;
        } else {
          const newPl = await query(
            `INSERT INTO playlists (name, description, is_public, created_at, updated_at)
             VALUES ($1, $2, true, NOW(), NOW())
             RETURNING id`,
            [playlistName, `Curated playlist for ${playlistName}`]
          );
          plId = newPl.rows[0].id;
        }
        await query(
          `INSERT INTO playlist_songs (playlist_id, song_id, position)
           VALUES ($1, $2, (SELECT COALESCE(MAX(position), 0) + 1 FROM playlist_songs WHERE playlist_id = $1))
           ON CONFLICT DO NOTHING`,
          [plId, song.id]
        );
        console.log(`[Admin Upload] Added song "${song.title}" to playlist "${playlistName}" (ID: ${plId})`);
      } catch (plErr: any) {
        console.warn('[Admin Upload Playlist Link Warning]:', plErr.message);
      }
    }

    console.log(`[Admin Upload Success] Song "${song.title}" by ${song.artist} uploaded. ID: ${song.id}`);

    res.status(201).json({
      success: true,
      message: 'Song uploaded to Telegram channel and indexed in database.',
      data: song, // Returns metadata only (no telegram_file_id in response)
    });
  } catch (err: any) {
    console.error('[Admin Upload Error]:', err);
    res.status(500).json({ error: 'UPLOAD_FAILED', message: err.message || 'Failed to upload song.' });
  }
}

export async function handleAdminIssueLicence(req: Request, res: Response): Promise<void> {
  const { first_name, surname, mobile, email, plan } = req.body;

  if (!first_name || !surname || !mobile) {
    res.status(400).json({
      error: 'BAD_REQUEST',
      message: 'first_name, surname, and mobile are required.',
    });
    return;
  }

  const targetPlan = plan === 'lifetime' ? 'lifetime' : 'annual';

  try {
    const result = await issueLicence(first_name, surname, mobile, email, targetPlan);
    const autoLoginUrl = `https://melody-chi-nine.vercel.app/?activate_key=${result.licenceKey}`;

    res.status(201).json({
      success: true,
      message: 'Option 1 Licence key created successfully.',
      data: {
        licenceKey: result.licenceKey,
        formattedKey: result.formattedKey,
        plan: result.plan,
        expiresAt: result.expiresAt,
        userId: result.userId,
        autoLoginUrl,
      },
    });
  } catch (err: any) {
    console.error('[Admin Issue Licence Error]:', err);
    res.status(500).json({ error: 'DATABASE_ERROR', message: 'Failed to create licence key.' });
  }
}

export async function handleAdminGetLicences(req: Request, res: Response): Promise<void> {
  try {
    const licencesRes = await query(
      `SELECT l.id, l.licence_key, l.status, l.max_devices, l.plan, l.expires_at, l.paid_at,
              u.first_name, u.surname, u.mobile, u.email,
              (SELECT COUNT(*) FROM device_sessions ds WHERE ds.licence_id = l.id) as active_devices_count
       FROM licences l
       JOIN users u ON u.id = l.user_id
       ORDER BY l.paid_at DESC
       LIMIT 50`
    );

    res.status(200).json({
      success: true,
      data: licencesRes.rows,
    });
  } catch (err: any) {
    console.error('[Admin Get Licences Error]:', err);
    res.status(500).json({ error: 'DATABASE_ERROR', message: 'Failed to fetch licences.' });
  }
}

export async function handleFreeLicenceRegistration(req: Request, res: Response): Promise<void> {
  const { first_name, surname, mobile, email } = req.body;

  if (!first_name || !surname || !mobile) {
    res.status(400).json({
      error: 'BAD_REQUEST',
      message: 'First name, surname, and mobile are required to issue your free Melody key.',
    });
    return;
  }

  try {
    const result = await issueLicence(first_name, surname, mobile, email);

    res.status(201).json({
      success: true,
      message: 'Welcome to Melody! Your free 100% premium licence key has been generated.',
      data: {
        licenceKey: result.licenceKey,
        formattedKey: result.formattedKey,
      },
    });
  } catch (err: any) {
    console.error('[Free Licence Registration Error]:', err);
    res.status(500).json({ error: 'REGISTRATION_ERROR', message: 'Failed to issue free licence.' });
  }
}

export async function handleAdminDeleteSong(req: Request, res: Response): Promise<void> {
  const songId = parseInt(req.params.id, 10);
  if (isNaN(songId)) {
    res.status(400).json({ error: 'INVALID_ID', message: 'Valid integer song ID required.' });
    return;
  }

  try {
    const delRes = await query('DELETE FROM songs WHERE id = $1 RETURNING id, title', [songId]);
    if (delRes.rows.length === 0) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Song not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Song #${songId} ("${delRes.rows[0].title}") deleted from catalog.`,
    });
  } catch (err: any) {
    console.error('[Admin Delete Song Error]:', err);
    res.status(500).json({ error: 'DATABASE_ERROR', message: 'Failed to delete song.' });
  }
}
