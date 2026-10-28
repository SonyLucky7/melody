import fs from 'fs';
import path from 'path';
import { pool, query } from '../db/client';

async function main() {
  try {
    const coverUrl = 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/59/10/66/591066ea-3c85-3dfe-ef82-ffdbbcdfc8b9/12UMGIM00033.rgb.jpg/600x600bb.jpg';
    console.log('Fetching Lana Del Rey official 600x600 artwork...');
    const res = await fetch(coverUrl);
    const buf = Buffer.from(await res.arrayBuffer());

    const clientCover = path.resolve(__dirname, '../../../client/public/covers/lana-collection.jpg');
    const serverCover = path.resolve(__dirname, '../../public/covers/lana-collection.jpg');

    fs.writeFileSync(clientCover, buf);
    fs.writeFileSync(serverCover, buf);
    console.log(`Saved artwork to ${clientCover} (${buf.length} bytes)`);

    const updateRes = await query(
      "UPDATE songs SET cover_url = '/covers/lana-collection.jpg' WHERE artist ILIKE $1",
      ['%lana%']
    );
    console.log(`Updated ${updateRes.rowCount} Lana Del Rey songs with studio artwork!`);
  } catch (err) {
    console.error('Error enriching Lana songs:', err);
  } finally {
    await pool.end();
  }
}

main();
