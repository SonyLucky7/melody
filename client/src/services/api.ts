import { Song, Playlist, ActiveDevice } from '../types';

export const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? (window.location.port === '3000' ? `http://${window.location.hostname}:5000` : '')
    : 'https://melody-mzsm.onrender.com');

// High-speed direct streaming via Vercel Edge / Render Backend (sub-second instant start)
export const STREAM_BASE =
  import.meta.env.VITE_STREAM_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? window.location.origin
    : 'https://melody-mzsm.onrender.com');

export function getFullCoverUrl(coverUrl?: string | null): string {
  if (!coverUrl) return '/Melody-Logo-512.png';
  if (coverUrl.startsWith('http://') || coverUrl.startsWith('https://') || coverUrl.startsWith('data:')) {
    return coverUrl;
  }
  const cleanCover = coverUrl.startsWith('/') ? coverUrl : `/${coverUrl}`;
  // In the browser, relative URLs resolve cleanly to current domain (Vercel CDN or localhost)
  if (typeof window !== 'undefined') {
    return cleanCover;
  }
  return `${API_BASE}${cleanCover}`;
}

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

export async function fetchSongs(search = '', language = '', limit = 500, offset = 0): Promise<Song[]> {
  try {
    // If specific search, fetch single page directly
    if (search || limit <= 100) {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (language) params.set('language', language);
      params.set('limit', limit.toString());
      if (offset) params.set('offset', offset.toString());

      const res = await fetch(`${API_BASE}/api/songs?${params.toString()}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch songs');
      const data = await res.json();
      return data.data || [];
    }

    // Auto-paginating catalog fetcher: fetches full catalog in chunks of 100
    const allSongs: Song[] = [];
    let currentOffset = offset;
    const pageSize = 100;

    while (allSongs.length < limit) {
      const params = new URLSearchParams();
      if (language) params.set('language', language);
      params.set('limit', pageSize.toString());
      params.set('offset', currentOffset.toString());

      const res = await fetch(`${API_BASE}/api/songs?${params.toString()}`, {
        headers: authHeaders(),
      });
      if (!res.ok) break;
      const data = await res.json();
      const pageSongs: Song[] = data.data || [];
      if (pageSongs.length === 0) break;

      allSongs.push(...pageSongs);
      if (pageSongs.length < pageSize) break; // Reached end of catalog
      currentOffset += pageSize;
    }

    return allSongs;
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
    if (!json.streamUrl) return null;
    return json.streamUrl.startsWith('http') ? json.streamUrl : `${API_BASE}${json.streamUrl}`;
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

export async function addSongToPlaylist(playlistId: number, songId: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/playlists/${playlistId}/songs`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ song_id: songId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function removeSongFromPlaylist(playlistId: number, songId: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/playlists/${playlistId}/songs/${songId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deletePlaylist(playlistId: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/playlists/${playlistId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// --- Auth, User Profile & Device Management API ---

export interface UserProfile {
  firstName: string;
  surname: string;
  mobile: string;
  email?: string | null;
  plan: 'annual' | 'lifetime';
  expiresAt: string | null;
  licenceKey: string;
  formattedKey: string;
}

export function getUserProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem('melody_user_profile');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setUserProfile(profile: UserProfile): void {
  localStorage.setItem('melody_user_profile', JSON.stringify(profile));
}

export function clearUserProfile(): void {
  localStorage.removeItem('melody_user_profile');
  localStorage.removeItem('melody_session_token');
}

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
    if (data.user) {
      setUserProfile(data.user);
    }
  }
  return { status: res.status, data };
}

export async function fetchDevices(): Promise<{ devices: ActiveDevice[]; user?: UserProfile }> {
  try {
    const res = await fetch(`${API_BASE}/devices`, { headers: authHeaders() });
    if (!res.ok) return { devices: [] };
    const json = await res.json();
    if (json.user) {
      setUserProfile(json.user);
    }
    return { devices: json.devices || [], user: json.user };
  } catch {
    return { devices: [] };
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

// --- Direct UPI QR Payment API ---

export interface PaymentPlan {
  id: 'annual' | 'lifetime';
  name: string;
  price: number;
  originalPrice: number;
  duration: string;
  tag: string;
  upiPayUri: string;
  qrCodeUrl: string;
  features: string[];
}

export interface PaymentConfigResponse {
  success: boolean;
  upiIdMasked: string;
  upiName: string;
  plans: PaymentPlan[];
}

export async function fetchPaymentConfig(): Promise<PaymentConfigResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/api/payment/config`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.plans && data.plans.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.warn('[fetchPaymentConfig API Warning]:', err);
  }

  // Instant resilient fallback with dynamic zero-fees UPI QR
  const upiId = 'anantakrishi7@axl';
  const upiName = 'Melody Music VIP';
  const annualUri = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=49&cu=INR&tn=MelodyVIP-Annual`;
  const lifetimeUri = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=99&cu=INR&tn=MelodyVIP-Lifetime`;

  return {
    success: true,
    upiIdMasked: 'an****7@axl',
    upiName,
    plans: [
      {
        id: 'annual',
        name: 'Annual VIP',
        price: 49,
        originalPrice: 199,
        duration: '1 Year',
        tag: 'POPULAR',
        upiPayUri: annualUri,
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=10&data=${encodeURIComponent(annualUri)}`,
        features: [
          'Full Studio 320kbps High-Res Audio',
          'Listen on up to 5 Devices at once',
          'Unlimited Offline Downloads',
          'Personalized Option 1 Licence Key',
          '1 Full Year VIP Access (Just ₹4/month)',
        ],
      },
      {
        id: 'lifetime',
        name: 'Lifetime VIP',
        price: 99,
        originalPrice: 499,
        duration: 'Lifetime',
        tag: 'BEST VALUE',
        upiPayUri: lifetimeUri,
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=10&data=${encodeURIComponent(lifetimeUri)}`,
        features: [
          'Pay Once, Listen Forever ($0/month)',
          'Full Studio 320kbps High-Res Audio',
          'Listen on up to 5 Devices at once',
          'Unlimited Offline Downloads',
          'Golden VIP Profile Badge',
          'All Future Updates & Music Drops Included',
        ],
      },
    ],
  };
}

export async function submitUpiPayment(payload: {
  firstName: string;
  surname: string;
  mobile: string;
  email?: string;
  plan: 'annual' | 'lifetime';
  upiUtrRef: string;
  deviceName?: string;
}) {
  const res = await fetch(`${API_BASE}/api/payment/upi-submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      deviceId: getDeviceId(),
      deviceName: payload.deviceName || 'Melody Web Player',
    }),
  });
  const data = await res.json();
  if (res.ok && data.data?.token) {
    setDeviceToken(data.data.token);
    setUserProfile({
      firstName: payload.firstName,
      surname: payload.surname,
      mobile: payload.mobile,
      email: payload.email,
      plan: data.data.plan,
      expiresAt: data.data.expiresAt,
      licenceKey: data.data.licenceKey,
      formattedKey: data.data.formattedKey,
    });
  }
  return { ok: res.ok, status: res.status, data };
}
