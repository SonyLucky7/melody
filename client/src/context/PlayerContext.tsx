import React, { createContext, useContext, useState, useRef, useEffect, ReactNode, useCallback } from 'react';
import { Song } from '../types';
import { API_BASE, STREAM_BASE, requestPlayUrl, recordPlayback, fetchFavourites, addFavourite, removeFavourite, getUserProfile } from '../services/api';
import {
  OfflineTrack,
  getOfflineSong,
  getAllOfflineSongs,
  downloadSongForOffline,
  removeOfflineSong,
} from '../services/offlineStorage';

export type RepeatMode = 'off' | 'all' | 'one';

export const EQ_FREQUENCIES = [60, 150, 400, 1000, 2400, 15000];
export const EQ_BAND_LABELS = ['60 Hz', '150 Hz', '400 Hz', '1 kHz', '2.4 kHz', '15 kHz'];
export const EQ_BAND_TYPES = ['Sub', 'Bass', 'Low-Mid', 'Mid', 'High-Mid', 'Treble'];

export const EQ_PRESETS: Record<string, number[]> = {
  'Flat': [0, 0, 0, 0, 0, 0],
  'Bass Booster': [6, 4, 2, 0, 0, 0],
  'Bass Reducer': [-6, -4, -2, 0, 0, 0],
  'Electronic': [5, 4, 1, 2, 4, 5],
  'Hip-Hop': [6, 5, 1, 2, 1, 3],
  'Pop': [-1, 2, 4, 3, 1, -1],
  'Rock': [5, 3, -1, 1, 3, 5],
  'Acoustic': [4, 2, 1, 2, 3, 4],
  'Classical': [4, 3, 2, 2, -1, -2],
  'Vocal Booster': [-2, -1, 3, 5, 3, 1],
  'Deep': [4, 2, 0, -1, -3, -4],
  'Treble Booster': [0, 0, 0, 2, 4, 6],
  'Treble Reducer': [0, 0, 0, -2, -4, -6],
};

interface PlayerContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  isLoadingTrack: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  isRepeat: boolean; // boolean alias: repeatMode !== 'off'
  isRepeatOne: boolean; // boolean alias: repeatMode === 'one'
  favourites: Set<number>;
  queue: Song[];
  // Offline Device Storage API
  downloadedSongIds: Set<number>;
  downloadProgress: Record<number, number>;
  offlineTracks: OfflineTrack[];
  downloadSong: (song: Song) => Promise<void>;
  removeDownload: (songId: number) => Promise<void>;
  downloadPlaylist: (songs: Song[]) => Promise<void>;
  // Equalizer API
  isEqEnabled: boolean;
  eqPreset: string;
  eqBands: number[];
  setEqBand: (index: number, gainDb: number) => void;
  setEqPreset: (presetName: string) => void;
  toggleEq: () => void;
  resetEq: () => void;
  isEqModalOpen: boolean;
  setIsEqModalOpen: (open: boolean) => void;
  // Now Playing Theme View
  isNowPlayingOpen: boolean;
  setIsNowPlayingOpen: (open: boolean) => void;
  nowPlayingTheme: 'vinyl' | 'radial' | 'ambient';
  setNowPlayingTheme: (theme: 'vinyl' | 'radial' | 'ambient') => void;
  getAudioFrequencyData: () => Uint8Array | null;
  // Playback Controls
  playSong: (song: Song, queueList?: Song[]) => Promise<void>;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (seconds: number) => void;
  setVolume: (vol: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleFavourite: (song: Song) => Promise<void>;
  refreshFavourites: () => Promise<void>;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

// Modern Fisher-Yates shuffle generator
function createShuffledOrder<T>(list: T[], currentItem?: T): T[] {
  if (list.length <= 1) return [...list];
  const copy = [...list];
  
  // If currentItem exists, extract it to keep it at the start
  let remaining = copy;
  if (currentItem) {
    const idx = copy.findIndex((item) => (item as any)?.id === (currentItem as any)?.id);
    if (idx !== -1) {
      remaining = [...copy.slice(0, idx), ...copy.slice(idx + 1)];
    }
  }

  // Fisher-Yates shuffle
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }

  return currentItem ? [currentItem, ...remaining] : remaining;
}

export const PlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoadingTrack, setIsLoadingTrack] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(0.8);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [queue, setQueue] = useState<Song[]>([]);
  const [favourites, setFavourites] = useState<Set<number>>(new Set());

  // Offline Device Storage State
  const [downloadedSongIds, setDownloadedSongIds] = useState<Set<number>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<Record<number, number>>({});
  const [offlineTracks, setOfflineTracks] = useState<OfflineTrack[]>([]);

  // Load offline songs from IndexedDB on startup
  useEffect(() => {
    getAllOfflineSongs().then((tracks) => {
      setOfflineTracks(tracks);
      setDownloadedSongIds(new Set(tracks.map((t) => t.id)));
    });
  }, []);

  // Equalizer State
  const [isEqEnabled, setIsEqEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('melody_eq_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [eqPreset, setEqPresetState] = useState<string>(() => {
    try {
      return localStorage.getItem('melody_eq_preset') || 'Flat';
    } catch {
      return 'Flat';
    }
  });

  const [eqBands, setEqBands] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('melody_eq_bands');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [0, 0, 0, 0, 0, 0];
  });

  const [isEqModalOpen, setIsEqModalOpen] = useState<boolean>(false);

  // Now Playing Fullscreen Animated Theme View State
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState<boolean>(false);
  const [nowPlayingTheme, setNowPlayingTheme] = useState<'vinyl' | 'radial'>(() => {
    try {
      return (localStorage.getItem('melody_now_playing_theme') as any) || 'vinyl';
    } catch {
      return 'vinyl';
    }
  });

  const updateNowPlayingTheme = (theme: 'vinyl' | 'radial') => {
    setNowPlayingTheme(theme);
    try {
      localStorage.setItem('melody_now_playing_theme', theme);
    } catch {}
  };

  // Persistent Refs to prevent stale closures in audio event handlers
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const isSourceConnectedRef = useRef<boolean>(false);

  const queueRef = useRef<Song[]>([]);
  const currentSongRef = useRef<Song | null>(null);
  const isShuffleRef = useRef<boolean>(false);
  const repeatModeRef = useRef<RepeatMode>('off');
  const shuffledQueueRef = useRef<Song[]>([]);
  const historyRef = useRef<Song[]>([]);
  const isEqEnabledRef = useRef<boolean>(isEqEnabled);
  const eqBandsRef = useRef<number[]>(eqBands);
  const downloadedSongIdsRef = useRef<Set<number>>(new Set());
  const playRequestIdRef = useRef<number>(0);

  // Keep refs in sync with state
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  useEffect(() => {
    isShuffleRef.current = isShuffle;
  }, [isShuffle]);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    isEqEnabledRef.current = isEqEnabled;
  }, [isEqEnabled]);

  useEffect(() => {
    eqBandsRef.current = eqBands;
  }, [eqBands]);

  useEffect(() => {
    downloadedSongIdsRef.current = downloadedSongIds;
  }, [downloadedSongIds]);

  // Download song to local device storage (IndexedDB)
  const downloadSong = useCallback(async (song: Song) => {
    setDownloadProgress((prev) => ({ ...prev, [song.id]: 1 }));
    try {
      await downloadSongForOffline(song, (percent) => {
        setDownloadProgress((prev) => ({ ...prev, [song.id]: percent }));
      });
      setDownloadedSongIds((prev) => new Set([...prev, song.id]));
      setDownloadProgress((prev) => {
        const next = { ...prev };
        delete next[song.id];
        return next;
      });
      const updated = await getAllOfflineSongs();
      setOfflineTracks(updated);
    } catch (err) {
      console.error('Offline download failed:', err);
      setDownloadProgress((prev) => {
        const next = { ...prev };
        delete next[song.id];
        return next;
      });
    }
  }, []);

  // Remove song from local device storage
  const removeDownload = useCallback(async (songId: number) => {
    await removeOfflineSong(songId);
    setDownloadedSongIds((prev) => {
      const next = new Set(prev);
      next.delete(songId);
      return next;
    });
    const updated = await getAllOfflineSongs();
    setOfflineTracks(updated);
  }, []);

  // Download entire playlist/album to local device
  const downloadPlaylist = useCallback(async (songsToDownload: Song[]) => {
    for (const song of songsToDownload) {
      if (!downloadedSongIds.has(song.id)) {
        await downloadSong(song);
      }
    }
  }, [downloadSong, downloadedSongIds]);

  // Initialize Web Audio API Equalizer
  const initEqualizer = useCallback(() => {
    if (audioContextRef.current || isSourceConnectedRef.current) return;
    const audio = audioRef.current;
    if (!audio) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaElementSource(audio);
      isSourceConnectedRef.current = true;

      const filters = EQ_FREQUENCIES.map((freq, i) => {
        const filter = ctx.createBiquadFilter();
        if (i === 0) {
          filter.type = 'lowshelf';
        } else if (i === EQ_FREQUENCIES.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
          filter.Q.value = 1.0;
        }
        filter.frequency.value = freq;
        filter.gain.value = isEqEnabledRef.current ? eqBandsRef.current[i] : 0;
        return filter;
      });

      // Analyser Node for Real-time Radial Waveform Visualizer
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      // Series chain: source -> filters[0] -> ... -> filters[5] -> analyser -> destination
      let prevNode: AudioNode = source;
      filters.forEach((filter) => {
        prevNode.connect(filter);
        prevNode = filter;
      });
      prevNode.connect(analyser);
      analyser.connect(ctx.destination);
      filtersRef.current = filters;
    } catch (err) {
      console.warn('[Equalizer Initialization Warning]:', err);
    }
  }, []);

  const getAudioFrequencyData = useCallback((): Uint8Array | null => {
    if (!analyserRef.current) return null;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    return data;
  }, []);

  // Set individual EQ band gain (-12dB to +12dB)
  const setEqBand = useCallback((index: number, gainDb: number) => {
    const clamped = Math.max(-12, Math.min(12, gainDb));
    setEqBands((prev) => {
      const next = [...prev];
      next[index] = clamped;
      try {
        localStorage.setItem('melody_eq_bands', JSON.stringify(next));
      } catch {}
      return next;
    });
    setEqPresetState('Custom');
    try {
      localStorage.setItem('melody_eq_preset', 'Custom');
    } catch {}

    if (filtersRef.current[index] && isEqEnabledRef.current) {
      const ctx = audioContextRef.current;
      const time = ctx ? ctx.currentTime : 0;
      filtersRef.current[index].gain.setValueAtTime(clamped, time);
    }
  }, []);

  // Choose preset
  const setEqPreset = useCallback((presetName: string) => {
    const preset = EQ_PRESETS[presetName];
    if (!preset) return;
    setEqPresetState(presetName);
    setEqBands(preset);
    try {
      localStorage.setItem('melody_eq_preset', presetName);
      localStorage.setItem('melody_eq_bands', JSON.stringify(preset));
    } catch {}

    if (isEqEnabledRef.current && filtersRef.current.length === preset.length) {
      const ctx = audioContextRef.current;
      const time = ctx ? ctx.currentTime : 0;
      preset.forEach((gain, i) => {
        filtersRef.current[i].gain.setValueAtTime(gain, time);
      });
    }
  }, []);

  // Toggle Equalizer on/off
  const toggleEq = useCallback(() => {
    setIsEqEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('melody_eq_enabled', String(next));
      } catch {}
      const ctx = audioContextRef.current;
      const time = ctx ? ctx.currentTime : 0;
      filtersRef.current.forEach((filter, i) => {
        filter.gain.setValueAtTime(next ? eqBandsRef.current[i] : 0, time);
      });
      return next;
    });
  }, []);

  // Reset EQ to Flat
  const resetEq = useCallback(() => {
    setEqPreset('Flat');
  }, [setEqPreset]);

  // Core Play Function: checks local device storage first for true offline playback
  const playSong = useCallback(async (song: Song, queueList?: Song[]) => {
    if (!song) return;
    const requestId = ++playRequestIdRef.current;

    // Update Queue
    if (queueList && queueList.length > 0) {
      setQueue(queueList);
      queueRef.current = queueList;
      if (isShuffleRef.current) {
        shuffledQueueRef.current = createShuffledOrder(queueList, song);
      }
    } else if (!queueRef.current.some((s) => s.id === song.id)) {
      const newQueue = [...queueRef.current, song];
      setQueue(newQueue);
      queueRef.current = newQueue;
      if (isShuffleRef.current) {
        shuffledQueueRef.current = createShuffledOrder(newQueue, song);
      }
    }

    setCurrentSong(song);
    currentSongRef.current = song;
    setIsLoadingTrack(true);
    setCurrentTime(0);

    // Track playback history
    historyRef.current.push(song);
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
    }

    const audio = audioRef.current;
    if (!audio) return;

    try {
      initEqualizer();
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }

      // Direct high-speed streaming URL for all users (no priority delays)
      const streamUrl = `${STREAM_BASE}/api/stream/${song.id}`;

      // Check offline IndexedDB ONLY if downloaded on this device (eliminates async lag for 99% of plays)
      let targetSrc: string;
      if (downloadedSongIdsRef.current.has(song.id)) {
        const offline = await getOfflineSong(song.id);
        if (requestId !== playRequestIdRef.current) return;
        if (offline && offline.audioBlob) {
          targetSrc = URL.createObjectURL(offline.audioBlob);
          console.log('[Melody Offline] Playing track directly from local device storage:', song.title);
        } else {
          targetSrc = streamUrl;
        }
      } else {
        targetSrc = streamUrl;
      }

      if (requestId !== playRequestIdRef.current) return;

      // Sub-second instant playback: Pause old audio and immediately assign new src without redundant load() cycle
      if (!audio.paused) {
        audio.pause();
      }
      audio.preload = 'auto';
      audio.src = targetSrc;

      // Auto-fallback: If primary Render stream ever errors, fallback smoothly to Vercel Edge proxy
      audio.onerror = () => {
        if (requestId !== playRequestIdRef.current) return;
        const err = audio.error;
        if (err && err.code === MediaError.MEDIA_ERR_ABORTED) return;
        if (audio.src.includes('onrender.com') && typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
          console.warn('[Melody Stream Notice] Falling back to Vercel Edge...');
          if (requestId !== playRequestIdRef.current) return;
          audio.src = `/api/stream/${song.id}`;
          audio.play().catch(() => {});
        }
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (requestId !== playRequestIdRef.current) return;
            setIsPlaying(true);
            setIsLoadingTrack(false);
          })
          .catch((err) => {
            if (requestId !== playRequestIdRef.current) return;
            if (err.name === 'AbortError' || err.code === 20) {
              return;
            }
            console.warn('[Audio Play Promise Notice]:', err);
          });
      }

      // Async record stats in background
      recordPlayback(song.id).catch(() => {});

      // Prefetch upcoming track using persistent ref so browser has buffer ready for <0.2s transition
      const activeList = isShuffleRef.current && shuffledQueueRef.current.length > 0
        ? shuffledQueueRef.current
        : (queueList || queueRef.current);
      const currentIdx = activeList.findIndex((s) => s.id === song.id);
      const nextIdx = (currentIdx + 1) % activeList.length;
      if (nextIdx < activeList.length && activeList[nextIdx].id !== song.id) {
        const nextSong = activeList[nextIdx];
        if (!preloadAudioRef.current) {
          preloadAudioRef.current = new Audio();
          preloadAudioRef.current.preload = 'auto';
        }
        preloadAudioRef.current.src = `${STREAM_BASE}/api/stream/${nextSong.id}`;
        // Pre-warm the next track's download URL on the server so playback starts in <100ms
        fetch(`${STREAM_BASE}/api/stream/${nextSong.id}/prewarm`).catch(() => {});
      }
    } catch (err) {
      if (requestId !== playRequestIdRef.current) return;
      console.error('[Playback Start Error]:', err);
      // Fallback
      try {
        const fallbackUrl = await requestPlayUrl(song.id);
        if (requestId !== playRequestIdRef.current) return;
        if (fallbackUrl) {
          audio.src = fallbackUrl;
          await audio.play();
          setIsPlaying(true);
        }
      } catch (e) {
        if (requestId !== playRequestIdRef.current) return;
        setIsPlaying(false);
      }
    }
  }, [initEqualizer]);

  // Next Track Logic: Handles both user clicks and Autoplay on track completion
  const handleNextTrack = useCallback((isNaturalEnd: boolean = false) => {
    const q = queueRef.current;
    const cur = currentSongRef.current;
    if (q.length === 0 || !cur) return;

    // Repeat One Mode: If track ended naturally, replay from 0
    if (isNaturalEnd && repeatModeRef.current === 'one') {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        setIsPlaying(true);
      }
      return;
    }

    // Shuffle Mode
    if (isShuffleRef.current && shuffledQueueRef.current.length > 0) {
      const sq = shuffledQueueRef.current;
      const curIndex = sq.findIndex((s) => s.id === cur.id);
      const nextIndex = curIndex + 1;

      if (nextIndex < sq.length) {
        playSong(sq[nextIndex]);
      } else {
        // Reached end of shuffled queue: Reshuffle for endless autoplay
        const newShuffled = createShuffledOrder(q);
        shuffledQueueRef.current = newShuffled;
        if (repeatModeRef.current === 'all' || isNaturalEnd) {
          playSong(newShuffled[0]);
        }
      }
      return;
    }

    // Sequential Mode
    const currentIndex = q.findIndex((s) => s.id === cur.id);
    const nextIndex = (currentIndex + 1) % q.length;

    if (nextIndex === 0 && repeatModeRef.current === 'off' && isNaturalEnd) {
      // Loop or restart queue smoothly (Spotify continuous listening)
      playSong(q[0]);
    } else {
      playSong(q[nextIndex]);
    }
  }, [playSong]);

  // Previous Track Logic
  const handlePrevTrack = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    const q = queueRef.current;
    const cur = currentSongRef.current;
    if (q.length === 0 || !cur) return;

    if (isShuffleRef.current && shuffledQueueRef.current.length > 0) {
      const sq = shuffledQueueRef.current;
      const curIndex = sq.findIndex((s) => s.id === cur.id);
      const prevIndex = (curIndex - 1 + sq.length) % sq.length;
      playSong(sq[prevIndex]);
      return;
    }

    const currentIndex = q.findIndex((s) => s.id === cur.id);
    const prevIndex = (currentIndex - 1 + q.length) % q.length;
    playSong(q[prevIndex]);
  }, [playSong]);

  // Initialize Audio Element Once
  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous'; // Crucial for Web Audio API Equalizer
    audio.preload = 'auto'; // Immediate aggressive buffering
    audioRef.current = audio;
    audio.volume = volume;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePlaying = () => {
      setIsPlaying(true);
      setIsLoadingTrack(false);
    };

    const handleWaiting = () => {
      setIsLoadingTrack(true);
    };

    const handleCanPlay = () => {
      setIsLoadingTrack(false);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      // Autoplay: trigger next track using freshest ref state
      handleNextTrack(true);
    };

    const handleError = (e: any) => {
      const err = audio.error;
      // Code 1 = MEDIA_ERR_ABORTED: Normal when user switches tracks, ignore!
      if (err && err.code === MediaError.MEDIA_ERR_ABORTED) {
        return;
      }
      if (!audio.src) return;
      console.warn('[Audio Player Notice]:', e);
      setIsPlaying(false);
      setIsLoadingTrack(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // Initial fetch of user-specific favourites
    fetchFavourites().then((favs) => {
      setFavourites(new Set(favs.map((s) => s.id)));
    });

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [handleNextTrack]);

  // Update Media Session API for Lockscreen and OS media controls
  useEffect(() => {
    if (!currentSong || !('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: currentSong.artist,
      album: currentSong.album || 'Melody Stream',
      artwork: [
        {
          src: currentSong.cover_url || '/Melody-Logo-1024.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    });

    navigator.mediaSession.setActionHandler('play', () => {
      audioRef.current?.play().catch(() => {});
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      audioRef.current?.pause();
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => handlePrevTrack());
    navigator.mediaSession.setActionHandler('nexttrack', () => handleNextTrack(false));
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined && audioRef.current) {
        audioRef.current.currentTime = details.seekTime;
        setCurrentTime(details.seekTime);
      }
    });
  }, [currentSong, handleNextTrack, handlePrevTrack]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    if (isPlaying) {
      audio.pause();
    } else {
      initEqualizer();
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
      audio.play().catch(() => setIsPlaying(false));
    }
  };

  const seek = (seconds: number) => {
    const audio = audioRef.current;
    if (audio) {
      if ('fastSeek' in audio && typeof (audio as any).fastSeek === 'function') {
        try {
          (audio as any).fastSeek(seconds);
        } catch {
          audio.currentTime = seconds;
        }
      } else {
        audio.currentTime = seconds;
      }
      setCurrentTime(seconds);
    }
  };

  const setVolume = (vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
  };

  // Toggle Shuffle: Generates or clears shuffled queue and immediately pre-buffers upcoming track
  const toggleShuffle = () => {
    setIsShuffle((prev) => {
      const next = !prev;
      isShuffleRef.current = next;
      if (next && queueRef.current.length > 0) {
        const shuffled = createShuffledOrder(queueRef.current, currentSongRef.current || undefined);
        shuffledQueueRef.current = shuffled;
        // Immediately pre-buffer and pre-warm upcoming shuffled track for 0ms transition
        if (shuffled.length > 1) {
          const nextSong = shuffled[1];
          if (!preloadAudioRef.current) {
            preloadAudioRef.current = new Audio();
          }
          preloadAudioRef.current.preload = 'auto';
          preloadAudioRef.current.src = `${STREAM_BASE}/api/stream/${nextSong.id}`;
          fetch(`${STREAM_BASE}/api/stream/${nextSong.id}/prewarm`).catch(() => {});
        }
      } else {
        shuffledQueueRef.current = [];
        // Sequential next song pre-buffer
        const q = queueRef.current;
        const cur = currentSongRef.current;
        if (q.length > 1 && cur) {
          const curIdx = q.findIndex((s) => s.id === cur.id);
          const nextIdx = (curIdx + 1) % q.length;
          const nextSong = q[nextIdx];
          if (!preloadAudioRef.current) {
            preloadAudioRef.current = new Audio();
          }
          preloadAudioRef.current.preload = 'auto';
          preloadAudioRef.current.src = `${STREAM_BASE}/api/stream/${nextSong.id}`;
          fetch(`${STREAM_BASE}/api/stream/${nextSong.id}/prewarm`).catch(() => {});
        }
      }
      return next;
    });
  };

  // Toggle Repeat: 3-way Spotify cycle ('off' -> 'all' -> 'one' -> 'off')
  const toggleRepeat = () => {
    setRepeatMode((prev) => {
      let next: RepeatMode = 'off';
      if (prev === 'off') next = 'all';
      else if (prev === 'all') next = 'one';
      else next = 'off';
      repeatModeRef.current = next;
      return next;
    });
  };

  const toggleFavourite = async (song: Song) => {
    const isFav = favourites.has(song.id);
    if (isFav) {
      await removeFavourite(song.id);
      setFavourites((prev) => {
        const next = new Set(prev);
        next.delete(song.id);
        return next;
      });
    } else {
      await addFavourite(song.id);
      setFavourites((prev) => {
        const next = new Set(prev);
        next.add(song.id);
        return next;
      });
    }
  };

  const refreshFavourites = useCallback(async () => {
    try {
      const favs = await fetchFavourites();
      setFavourites(new Set(favs.map((s) => s.id)));
    } catch {}
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        isLoadingTrack,
        currentTime,
        duration,
        volume,
        isShuffle,
        repeatMode,
        isRepeat: repeatMode !== 'off',
        isRepeatOne: repeatMode === 'one',
        favourites,
        queue,
        downloadedSongIds,
        downloadProgress,
        offlineTracks,
        downloadSong,
        removeDownload,
        downloadPlaylist,
        isEqEnabled,
        eqPreset,
        eqBands,
        setEqBand,
        setEqPreset,
        toggleEq,
        resetEq,
        isEqModalOpen,
        setIsEqModalOpen,
        isNowPlayingOpen,
        setIsNowPlayingOpen,
        nowPlayingTheme,
        setNowPlayingTheme: updateNowPlayingTheme,
        getAudioFrequencyData,
        playSong,
        togglePlay,
        nextTrack: () => handleNextTrack(false),
        prevTrack: handlePrevTrack,
        seek,
        setVolume,
        toggleShuffle,
        toggleRepeat,
        toggleFavourite,
        refreshFavourites,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};
