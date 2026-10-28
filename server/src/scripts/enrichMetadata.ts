import fs from 'fs';
import path from 'path';
import { pool } from '../db/client';

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function enrichMetadata() {
  console.log('====================================================');
  console.log('  🎨 ENRICHING SONG METADATA & 600x600 STUDIO ARTWORK');
  console.log('====================================================\n');

  const coversDir = path.resolve(__dirname, '../../../client/public/covers');
  const serverCoversDir = path.resolve(__dirname, '../../public/covers');

  await fs.promises.mkdir(coversDir, { recursive: true });
  await fs.promises.mkdir(serverCoversDir, { recursive: true });

  const res = await pool.query("SELECT id, title, artist, album, cover_url FROM songs WHERE LOWER(artist) LIKE '%weeknd%' ORDER BY id ASC");
  console.log(`Found ${res.rows.length} Weeknd tracks to enrich.\n`);

  let updated = 0;

  for (let i = 0; i < res.rows.length; i++) {
    const song = res.rows[i];
    const progress = `[${i + 1}/${res.rows.length}]`;

    try {
      const cleanSearchTitle = song.title
        .replace(/\(with.*?\)/i, '')
        .replace(/-\s*Remix/i, '')
        .replace(/Single Version/i, '')
        .trim();

      const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanSearchTitle + ' ' + song.artist)}&entity=musicTrack&limit=1`;
      const apiRes = await fetch(itunesUrl);
      const data = await apiRes.json();

      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        const officialAlbum = item.collectionName || song.album || 'Single';
        const rawArtwork = item.artworkUrl100 || '';
        const highResArtworkUrl = rawArtwork ? rawArtwork.replace('100x100bb', '600x600bb') : null;

        let localCoverPath = song.cover_url;

        // Download cover artwork locally for blazing 1ms local load
        if (highResArtworkUrl) {
          const coverFilename = `weeknd-song-${song.id}.jpg`;
          const localDest = path.join(coversDir, coverFilename);
          const serverDest = path.join(serverCoversDir, coverFilename);

          try {
            const imgRes = await fetch(highResArtworkUrl);
            if (imgRes.ok) {
              const arrayBuffer = await imgRes.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              await fs.promises.writeFile(localDest, buffer);
              await fs.promises.writeFile(serverDest, buffer);
              localCoverPath = `/covers/${coverFilename}`;
            }
          } catch (imgErr) {
            localCoverPath = highResArtworkUrl; // fallback to CDN url if local download fails
          }
        }

        // Update database row with official album and cover
        await pool.query(
          'UPDATE songs SET album = $1, cover_url = $2 WHERE id = $3',
          [officialAlbum, localCoverPath, song.id]
        );

        console.log(`${progress} ✅ "${song.title}" -> Album: "${officialAlbum}" | Art saved!`);
        updated++;
      } else {
        console.log(`${progress} ℹ️ No iTunes match for "${song.title}", keeping current metadata.`);
      }
    } catch (err: any) {
      console.warn(`${progress} ⚠️ Error enriching "${song.title}": ${err.message}`);
    }

    await sleep(250); // gentle throttle
  }

  console.log('\n====================================================');
  console.log(`🏁 Metadata Enrichment Complete!`);
  console.log(`   ✨ Updated ${updated} tracks with studio artwork and official albums.`);
  console.log('====================================================');

  await pool.end();
  process.exit(0);
}

enrichMetadata().catch((err) => {
  console.error(err);
  process.exit(1);
});
