import { Song } from '../types';
import { API_BASE, STREAM_BASE } from './api';

export interface OfflineTrack {
  id: number;
  title: string;
  artist: string;
  album?: string;
  language?: string;
  duration_seconds: number;
  cover_url?: string;
  audioBlob: Blob;
  downloadedAt: number;
  fileSize: number;
}

const DB_NAME = 'MelodyOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'offline_tracks';

// Open or initialize IndexedDB
export function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this browser.'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Save song and audio blob for offline play
export async function saveSongOffline(song: Song, audioBlob: Blob): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const record: OfflineTrack = {
      id: song.id,
      title: song.title,
      artist: song.artist,
      album: song.album,
      language: song.language,
      duration_seconds: song.duration_seconds,
      cover_url: song.cover_url,
      audioBlob,
      downloadedAt: Date.now(),
      fileSize: audioBlob.size,
    };

    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Retrieve single offline song
export async function getOfflineSong(id: number): Promise<OfflineTrack | null> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

// Retrieve all offline downloaded tracks
export async function getAllOfflineSongs(): Promise<OfflineTrack[]> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

// Check if song is downloaded
export async function isSongDownloaded(id: number): Promise<boolean> {
  const song = await getOfflineSong(id);
  return !!song;
}

// Delete offline download
export async function removeOfflineSong(id: number): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Calculate total offline storage usage
export async function getOfflineStorageUsage(): Promise<{ count: number; totalBytes: number }> {
  const all = await getAllOfflineSongs();
  const totalBytes = all.reduce((acc, cur) => acc + (cur.fileSize || 0), 0);
  return {
    count: all.length,
    totalBytes,
  };
}

// Download song with progress callback and store locally
export async function downloadSongForOffline(
  song: Song,
  onProgress?: (progressPercent: number) => void
): Promise<OfflineTrack> {
  const url = `${STREAM_BASE}/api/stream/${song.id}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download audio for song "${song.title}" (HTTP ${response.status})`);
  }

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  if (!response.body) {
    const blob = await response.blob();
    await saveSongOffline(song, blob);
    if (onProgress) onProgress(100);
    return {
      id: song.id,
      title: song.title,
      artist: song.artist,
      album: song.album,
      duration_seconds: song.duration_seconds,
      cover_url: song.cover_url,
      audioBlob: blob,
      downloadedAt: Date.now(),
      fileSize: blob.size,
    };
  }

  const reader = response.body.getReader();
  let receivedLength = 0;
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    receivedLength += value.length;

    if (total > 0 && onProgress) {
      const percent = Math.min(100, Math.round((receivedLength / total) * 100));
      onProgress(percent);
    }
  }

  const audioBlob = new Blob(chunks, { type: 'audio/mpeg' });
  await saveSongOffline(song, audioBlob);
  if (onProgress) onProgress(100);

  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    album: song.album,
    duration_seconds: song.duration_seconds,
    cover_url: song.cover_url,
    audioBlob,
    downloadedAt: Date.now(),
    fileSize: audioBlob.size,
  };
}
