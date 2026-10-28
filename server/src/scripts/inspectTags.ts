import fs from 'fs';
import path from 'path';

function inspectId3(filePath: string) {
  const fd = fs.openSync(filePath, 'r');
  const header = Buffer.alloc(10);
  fs.readSync(fd, header, 0, 10, 0);

  if (header.toString('utf8', 0, 3) !== 'ID3') {
    fs.closeSync(fd);
    return null;
  }

  // ID3v2 tag size is 4 bytes syncsafe integer at offset 6
  const tagSize =
    ((header[6] & 0x7f) << 21) |
    ((header[7] & 0x7f) << 14) |
    ((header[8] & 0x7f) << 7) |
    (header[9] & 0x7f);

  const tagBuffer = Buffer.alloc(Math.min(tagSize, 8192));
  fs.readSync(fd, tagBuffer, 0, tagBuffer.length, 10);
  fs.closeSync(fd);

  const text = tagBuffer.toString('latin1');
  return { hasId3: true, snippet: text.slice(0, 500) };
}

const dir = 'C:\\Users\\hac\\Downloads\\some popular english songs';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mp3')).slice(0, 5);
for (const f of files) {
  const res = inspectId3(path.join(dir, f));
  console.log(`File: ${f}`);
  console.log('ID3 snippet:', res?.snippet.replace(/[\x00-\x1F]/g, ' '));
}
