export interface Song {
  id: number;
  title: string;
  artist: string;
  album?: string;
  language?: string;
  duration_seconds: number;
  file_size_bytes?: number;
  cover_url?: string;
  created_at?: string;
}

export interface Playlist {
  id: number;
  name: string;
  description?: string;
  total_songs?: number;
  song_count?: number;
  cover_url?: string;
  created_at?: string;
}

export interface ActiveDevice {
  device_id: string;
  device_name: string;
  last_active_at: string;
}

export interface UserSession {
  token: string;
  licenceKey?: string;
  deviceId: string;
  deviceName: string;
  isGuest?: boolean;
}
