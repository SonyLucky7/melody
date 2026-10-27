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
  const { first_name, surname, mobile, email } = req.body;

  if (!first_name || !surname || !mobile) {
    res.status(400).json({
      error: 'BAD_REQUEST',
      message: 'first_name, surname, and mobile are required.',
    });
    return;
  }

  try {
    const result = await issueLicence(first_name, surname, mobile, email);

    res.status(201).json({
      success: true,
      message: 'Option 1 Licence key created successfully.',
      data: {
        licenceKey: result.licenceKey,
        formattedKey: result.formattedKey,
        userId: result.userId,
      },
    });
  } catch (err: any) {
    console.error('[Admin Issue Licence Error]:', err);
    res.status(500).json({ error: 'DATABASE_ERROR', message: 'Failed to create licence key.' });
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
