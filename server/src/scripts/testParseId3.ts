import fs from 'fs';
import path from 'path';

export interface Id3Metadata {
  title?: string;
  artist?: string;
  album?: string;
  coverBuffer?: Buffer;
}

export function parseId3v2(filePath: string): Id3Metadata {
  const result: Id3Metadata = {};
  let fd: number;
  try {
    fd = fs.openSync(filePath, 'r');
  } catch {
    return result;
  }

  try {
    const header = Buffer.alloc(10);
    fs.readSync(fd, header, 0, 10, 0);

    if (header.toString('utf8', 0, 3) !== 'ID3') {
      fs.closeSync(fd);
      return result;
    }

    const tagSize =
      ((header[6] & 0x7f) << 21) |
      ((header[7] & 0x7f) << 14) |
      ((header[8] & 0x7f) << 7) |
      (header[9] & 0x7f);

    const fullTag = Buffer.alloc(tagSize);
    fs.readSync(fd, fullTag, 0, tagSize, 10);
    fs.closeSync(fd);

    let offset = 0;
    while (offset + 10 < tagSize) {
      const frameId = fullTag.toString('latin1', offset, offset + 4);
      if (frameId.charCodeAt(0) === 0 || !/^[A-Z0-9]{4}$/.test(frameId)) {
        break; // padding reached
      }

      const frameSize = fullTag.readUInt32BE(offset + 4);
      offset += 10; // skip header (4 id + 4 size + 2 flags)

      if (frameSize <= 0 || offset + frameSize > tagSize) break;

      const frameData = fullTag.slice(offset, offset + frameSize);
      offset += frameSize;

      if (frameId === 'TIT2' || frameId === 'TPE1' || frameId === 'TALB') {
        const encoding = frameData[0];
        let text = '';
        if (encoding === 0 || encoding === 3) {
          text = frameData.slice(1).toString(encoding === 3 ? 'utf8' : 'latin1').replace(/\0.*$/g, '').trim();
        } else if (encoding === 1 || encoding === 2) {
          text = frameData.slice(1).toString('utf16le').replace(/\0.*$/g, '').trim();
        }

        if (frameId === 'TIT2') result.title = text;
        if (frameId === 'TPE1') result.artist = text;
        if (frameId === 'TALB') result.album = text;
      } else if (frameId === 'APIC' && !result.coverBuffer) {
        try {
          const encoding = frameData[0];
          let p = 1;
          // read mime
          while (p < frameData.length && frameData[p] !== 0) p++;
          p++; // skip null
          const picType = frameData[p++];
          // skip description
          if (encoding === 1 || encoding === 2) {
            while (p + 1 < frameData.length && !(frameData[p] === 0 && frameData[p + 1] === 0)) p += 2;
            p += 2;
          } else {
            while (p < frameData.length && frameData[p] !== 0) p++;
            p++;
          }
          if (p < frameData.length) {
            result.coverBuffer = frameData.slice(p);
          }
        } catch {}
      }
    }
  } catch {
    try { fs.closeSync(fd); } catch {}
  }

  return result;
}

// Quick verification
const dir = 'C:\\Users\\hac\\Downloads\\some popular english songs';
const testFiles = fs.readdirSync(dir).filter(f => f.endsWith('.mp3')).slice(0, 5);
for (const f of testFiles) {
  const meta = parseId3v2(path.join(dir, f));
  console.log(`[Parsed] ${meta.artist} - ${meta.title} (${meta.album}) [Cover: ${meta.coverBuffer?.length || 0} bytes]`);
}
