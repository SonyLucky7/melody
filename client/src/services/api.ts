import { Song, Playlist, ActiveDevice } from '../types';

const API_BASE = ''; // Uses Vite proxy to http://localhost:5000 or same host in prod

export function getDeviceId(): string {
  let id = localStorage.getItem('melody_device_id');
  if (!id) {
    id = 'web-' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('melody_device_id', id);
  }
  return id;
}

export function getDeviceToken(): string | null {
  return localStorage.getItem('melody_session_token');
}

export function setDeviceToken(token: string): void {
  localStorage.setItem('melody_session_token', token);
}

export function clearDeviceToken(): void {
  localStorage.removeItem('melody_session_token');
}

function authHeaders(): HeadersInit {
  const token = getDeviceToken();
  const headers: HeadersInit = {
    'x-device-id': getDeviceId(),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// --- Music Catalog API ---

export async function fetchSongs(search = '', language = '', limit = 40): Promise<Song[]> {
  try {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (language) params.set('language', language);
    params.set('limit', limit.toString());

    const res = await fetch(`${API_BASE}/api/songs?${params.toString()}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch songs');
    const data = await res.json();
    return data.data || [];
  } catch (err) {
    console.warn('[API fetchSongs Error]:', err);
    return [];
  }
}

export async function fetchSongById(id: number): Promise<Song | null> {
  try {
    const res = await fetch(`${API_BASE}/api/songs/${id}`, { headers: authHeaders() });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

export async function requestPlayUrl(songId: number): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/songs/${songId}/play`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Unable to get stream token');
    const json = await res.json();
    return json.streamUrl;
  } catch (err) {
    console.error('[API requestPlayUrl Error]:', err);
    return null;
  }
}

export async function recordPlayback(songId: number): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/songs/${songId}/played`, {
      method: 'POST',
      headers: authHeaders(),
    });
  } catch {}
}

export async function fetchRecentlyPlayed(): Promise<Song[]> {
  try {
    const res = await fetch(`${API_BASE}/api/history`, { headers: authHeaders() });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

// --- Favourites API ---

export async function fetchFavourites(): Promise<Song[]> {
  try {
    const res = await fetch(`${API_BASE}/api/favourites`, { headers: authHeaders() });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

export async function addFavourite(songId: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/favourites/${songId}`, {
      method: 'POST',
      headers: authHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function removeFavourite(songId: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/favourites/${songId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// --- Playlists API ---

export async function fetchPlaylists(): Promise<Playlist[]> {
  try {
    const res = await fetch(`${API_BASE}/api/playlists`, { headers: authHeaders() });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

export async function createPlaylist(name: string): Promise<Playlist | null> {
  try {
    const res = await fetch(`${API_BASE}/api/playlists`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

export async function fetchPlaylistSongs(playlistId: number): Promise<Song[]> {
  try {
    const res = await fetch(`${API_BASE}/api/playlists/${playlistId}`, { headers: authHeaders() });
    if (!res.ok) return [];
    const json = await res.json();
    return json.songs || [];
  } catch {
    return [];
  }
}

// --- Auth & Device Management API ---

export async function activateLicence(key: string, deviceName: string) {
  const res = await fetch(`${API_BASE}/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key,
      device_id: getDeviceId(),
      device_name: deviceName || 'Melody Web Player',
    }),
  });
  const data = await res.json();
  if (res.ok && data.token) {
    setDeviceToken(data.token);
  }
  return { status: res.status, data };
}

export async function fetchDevices(): Promise<ActiveDevice[]> {
  try {
    const res = await fetch(`${API_BASE}/devices`, { headers: authHeaders() });
    if (!res.ok) return [];
    const json = await res.json();
    return json.devices || [];
  } catch {
    return [];
  }
}

export async function logoutDevice(deviceId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/devices/${deviceId}/logout`, {
      method: 'POST',
      headers: authHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function requestFreeLicence(firstName: string, surname: string, mobile: string) {
  const res = await fetch(`${API_BASE}/api/checkout/free`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ first_name: firstName, surname, mobile }),
  });
  return res.json();
}
