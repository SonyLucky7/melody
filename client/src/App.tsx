import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { PlayerBar } from './components/PlayerBar';
import { SongCard } from './components/SongCard';
import { SongRow } from './components/SongRow';
import { ArtistView } from './components/ArtistView';
import { ActivationModal } from './components/ActivationModal';
import { DeviceModal } from './components/DeviceModal';
import { EqualizerModal } from './components/EqualizerModal';
import { NowPlayingView } from './components/NowPlayingView';
import { HelpModal } from './components/HelpModal';
import { ProfileModal } from './components/ProfileModal';
import { AddToPlaylistModal } from './components/AddToPlaylistModal';
import { DownloadModal } from './components/DownloadModal';
import { SupportModal } from './components/SupportModal';
import { usePlayer } from './context/PlayerContext';
import {
  fetchSongs,
  fetchPlaylists,
  fetchRecentlyPlayed,
  fetchFavourites,
  createPlaylist,
  deletePlaylist,
  removeSongFromPlaylist,
  fetchPlaylistSongs,
  getFullCoverUrl,
  getUserProfile,
  setUserProfile,
  clearUserProfile,
  fetchDevices,
  activateLicence,
  UserProfile,
} from './services/api';
import { Song, Playlist, ActiveDevice } from './types';
import {
  Search,
  Heart,
  Clock,
  Disc,
  Play,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ArrowDownCircle,
  Crown,
  Key,
  Laptop,
  LogOut,
  Copy,
  Check,
  User,
  ShieldCheck,
  HelpCircle,
  Plus,
  PlusSquare,
  Home,
  Bell,
  Users,
  FolderArchive,
  Library,
  X,
  Headphones,
} from 'lucide-react';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// Curated Public Playlists always available across mobile and desktop
export const PUBLIC_PLAYLISTS: Playlist[] = [
  {
    id: 10,
    name: 'Motivation Vol. 1',
    description: 'Drake, Lil Wayne, 50 Cent, Eminem & high-energy workout bangers.',
    total_songs: 92,
    cover_url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 11,
    name: 'Motivation Vol. 2',
    description: 'Trophies, Steady Mobbin, We Dem Boyz, Black and Yellow workout power.',
    total_songs: 91,
    cover_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 12,
    name: 'Brazil Phonk Essentials',
    description: 'Montagem, Automotivo, Brazilian drift phonk, funk pesado & bass boosts.',
    total_songs: 312,
    cover_url: 'https://image-cdn-ak.spotifycdn.com/image/ab67706c0000d72c469ab8293c7d2056b6c9df23'
  },
  {
    id: 9,
    name: 'TikTok Phonk',
    description: 'Kordhell, DVRST, Hensonn, phonk drift and bass heavy tracks.',
    total_songs: 60,
    cover_url: 'https://image-cdn-ak.spotifycdn.com/image/ab67706c0000d72c469ab8293c7d2056b6c9df23'
  },
  {
    id: 3,
    name: 'Slowed + Reverb Essentials',
    description: 'Late night slowed and reverbed vibes, lofi & atmospheric chill.',
    total_songs: 95,
    cover_url: 'https://melody-chi-nine.vercel.app/covers/weeknd-song-7.jpg'
  },
  {
    id: 4,
    name: 'Sidhu Moose Wala Legends',
    description: '295, The Last Ride, Legend, Levels, So High & all iconic anthems.',
    total_songs: 9,
    cover_url: 'https://melody-chi-nine.vercel.app/covers/desi-295-mvs26s80.jpg'
  },
  {
    id: 5,
    name: 'Yo Yo Honey Singh Blockbusters',
    description: 'Dope Shope, Blue Eyes, Desi Kalakaar, Love Dose & legendary Punjabi hits.',
    total_songs: 10,
    cover_url: 'https://melody-chi-nine.vercel.app/covers/desi-dope-shope-mvs2dv2r.jpg'
  },
  {
    id: 6,
    name: 'The Weeknd Master Collection',
    description: 'Blinding Lights, Starboy, After Hours, Die For You & Abel classics.',
    total_songs: 54,
    cover_url: 'https://melody-chi-nine.vercel.app/covers/the-weeknd-avatar.jpg'
  },
  {
    id: 7,
    name: 'Lana Del Rey Aesthetics',
    description: 'Summertime Sadness, Video Games, Young and Beautiful, Born to Die.',
    total_songs: 31,
    cover_url: 'https://melody-chi-nine.vercel.app/covers/lana-collection.jpg'
  },
  {
    id: 8,
    name: 'Ariana Grande Top Hits',
    description: '7 rings, thank u next, Dangerous Woman, positions & pop royalty.',
    total_songs: 60,
    cover_url: 'https://melody-chi-nine.vercel.app/covers/ariana-7-rings-mvrzjch5.jpg'
  },
];

export function getPlaylistTracks(playlist: Playlist, songCatalog: Song[]): Song[] {
  if (!playlist || !songCatalog || songCatalog.length === 0) return [];
  const nameLower = (playlist.name || '').toLowerCase();
  const id = Number(playlist.id);

  if (id === 10 || nameLower.includes('motivation vol. 1') || nameLower === 'motivation 1') {
    return songCatalog.filter((x) => x.album === 'Motivation Vol. 1');
  }
  if (id === 11 || nameLower.includes('motivation vol. 2') || nameLower === 'motivation 2') {
    return songCatalog.filter((x) => x.album === 'Motivation Vol. 2');
  }
  if (nameLower.includes('motivation')) {
    return songCatalog.filter((x) => x.album?.toLowerCase().includes('motivation'));
  }
  if (id === 12 || nameLower.includes('brazil phonk')) {
    return songCatalog.filter(
      (x) =>
        x.album?.toLowerCase().includes('brazil') ||
        x.title.toLowerCase().includes('montagem') ||
        x.title.toLowerCase().includes('automotivo') ||
        x.album?.toLowerCase().includes('phonk')
    );
  }
  if (id === 9 || nameLower.includes('phonk')) {
    return songCatalog.filter(
      (x) =>
        x.album?.toLowerCase().includes('phonk') ||
        x.language?.toLowerCase() === 'phonk' ||
        x.title.toLowerCase().includes('phonk') ||
        x.title.toLowerCase().includes('montagem')
    );
  }
  if (id === 3 || nameLower.includes('slowed') || nameLower.includes('reverb')) {
    return songCatalog.filter(
      (x) =>
        x.title.toLowerCase().includes('slowed') ||
        x.title.toLowerCase().includes('reverb') ||
        x.album?.toLowerCase().includes('slowed')
    );
  }
  if (id === 4 || nameLower.includes('sidhu') || nameLower.includes('moose')) {
    return songCatalog.filter((x) => x.artist.toLowerCase().includes('moose wala'));
  }
  if (id === 5 || nameLower.includes('honey') || nameLower.includes('yo yo')) {
    return songCatalog.filter((x) => x.artist.toLowerCase().includes('honey singh'));
  }
  if (id === 6 || nameLower.includes('weeknd')) {
    return songCatalog.filter((x) => x.artist.toLowerCase().includes('weeknd'));
  }
  if (id === 7 || nameLower.includes('lana')) {
    return songCatalog.filter((x) => x.artist.toLowerCase().includes('lana'));
  }
  if (id === 8 || nameLower.includes('ariana')) {
    return songCatalog.filter((x) => x.artist.toLowerCase().includes('ariana'));
  }

  const byAlbum = songCatalog.filter((x) => x.album && x.album.toLowerCase() === nameLower);
  if (byAlbum.length > 0) return byAlbum;

  return [];
}

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<string>('home');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<string>('The Weeknd');
  const [playlistSongs, setPlaylistSongs] = useState<Song[]>([]);

  // Navigation History for Spotify-style Back/Forward
  const [viewHistory, setViewHistory] = useState<Array<{ view: string; data?: any }>>([{ view: 'home' }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [songs, setSongs] = useState<Song[]>(() => {
    try {
      const cached = localStorage.getItem('melody_cached_songs');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      const cached = localStorage.getItem('melody_cached_playlists');
      if (cached) {
        const parsed: Playlist[] = JSON.parse(cached);
        const map = new Map<number, Playlist>();
        PUBLIC_PLAYLISTS.forEach((p) => map.set(p.id, p));
        parsed.forEach((p) => map.set(p.id, { ...map.get(p.id), ...p }));
        return Array.from(map.values());
      }
      return PUBLIC_PLAYLISTS;
    } catch {
      return PUBLIC_PLAYLISTS;
    }
  });
  const [recentSongs, setRecentSongs] = useState<Song[]>(() => {
    try {
      const cached = localStorage.getItem('melody_cached_recents');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [likedSongsList, setLikedSongsList] = useState<Song[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [loading, setLoading] = useState(false);

  // User Profile & Authentication State
  const [userProfile, setUserProfileState] = useState<UserProfile | null>(() => getUserProfile());
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [copiedMenuKey, setCopiedMenuKey] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Modals & Playlists
  const [isActivationOpen, setIsActivationOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [activationInitialTab, setActivationInitialTab] = useState<'vip' | 'login'>('vip');
  const [isDevicesOpen, setIsDevicesOpen] = useState(false);
  const [deviceLimitDevices, setDeviceLimitDevices] = useState<ActiveDevice[]>([]);
  const [songToAddToPlaylist, setSongToAddToPlaylist] = useState<Song | null>(null);
  const [showMobileInstallBanner, setShowMobileInstallBanner] = useState(true);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  const { playSong, offlineTracks, refreshFavourites } = usePlayer();
  const offlineTracksTotalMb = (offlineTracks.reduce((acc, t) => acc + (t.fileSize || 0), 0) / (1024 * 1024)).toFixed(1);

  // Auto-resolve playlist tracks if songs were still fetching when playlist was selected
  useEffect(() => {
    if (currentView === 'playlist' && selectedPlaylist && songs.length > 0) {
      if (playlistSongs.length === 0) {
        const resolved = getPlaylistTracks(selectedPlaylist, songs);
        if (resolved.length > 0) {
          setPlaylistSongs(resolved);
        }
      }
    }
  }, [songs, currentView, selectedPlaylist, playlistSongs.length]);

  useEffect(() => {
    loadCatalog();
    checkUrlActivation();
  }, []);

  const checkUrlActivation = async () => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const keyToActivate = urlParams.get('activate_key') || urlParams.get('key');
    if (!keyToActivate) return;

    try {
      const res = await activateLicence(keyToActivate.trim(), 'Web Player');
      if (res.status === 200 && res.data?.token) {
        if (res.data.user) {
          setUserProfileState(res.data.user);
          setUserProfile(res.data.user);
        }
        window.history.replaceState({}, document.title, window.location.pathname);
        loadCatalog();
        alert(`🎉 VIP Membership Activated Successfully! Welcome to Melody VIP, ${res.data.user?.firstName || 'VIP Member'}!`);
      }
    } catch (e) {
      console.warn('[Auto Activation Notice]:', e);
    }
  };

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadCatalog = async () => {
    setLoading(true);
    const [fetchedSongs, fetchedPlaylists, fetchedRecent, fetchedFavs, devicesData] = await Promise.all([
      fetchSongs('', '', 1000),
      fetchPlaylists(),
      fetchRecentlyPlayed(),
      fetchFavourites(),
      fetchDevices(),
    ]);

    setSongs(fetchedSongs);

    // Merge public playlists with fetched ones
    const playlistMap = new Map<number, Playlist>();
    PUBLIC_PLAYLISTS.forEach(p => playlistMap.set(p.id, p));
    fetchedPlaylists.forEach(p => {
      const existing = playlistMap.get(p.id);
      playlistMap.set(p.id, {
        ...existing,
        ...p,
        total_songs: p.total_songs || existing?.total_songs || 0,
      });
    });

    const combinedPlaylists = Array.from(playlistMap.values());
    setPlaylists(combinedPlaylists);
    setRecentSongs(fetchedRecent);
    setLikedSongsList(fetchedFavs);

    try {
      if (fetchedSongs.length > 0) localStorage.setItem('melody_cached_songs', JSON.stringify(fetchedSongs));
      if (combinedPlaylists.length > 0) localStorage.setItem('melody_cached_playlists', JSON.stringify(combinedPlaylists));
      if (fetchedRecent.length > 0) localStorage.setItem('melody_cached_recents', JSON.stringify(fetchedRecent));
    } catch {}

    if (devicesData.user) {
      setUserProfileState(devicesData.user);
      setUserProfile(devicesData.user);
    }
    refreshFavourites();
    setLoading(false);
  };

  const openVipModal = () => {
    setActivationInitialTab('vip');
    setIsActivationOpen(true);
  };

  const openLoginModal = () => {
    setActivationInitialTab('login');
    setIsActivationOpen(true);
  };

  const handleLogout = () => {
    clearUserProfile();
    setUserProfileState(null);
    setIsProfileMenuOpen(false);
    loadCatalog();
  };

  const handleCopyMenuKey = () => {
    if (!userProfile?.formattedKey) return;
    navigator.clipboard.writeText(userProfile.formattedKey);
    setCopiedMenuKey(true);
    setTimeout(() => setCopiedMenuKey(false), 2000);
  };

  const handleSelectView = async (view: string, data?: any, fromNav = false) => {
    let targetView = view;
    if (view === 'liked') targetView = 'favourites';
    setCurrentView(targetView);

    if (targetView === 'artist' && data) {
      setSelectedArtist(data);
    } else if (targetView === 'playlist' && data) {
      const fullPlaylist = playlists.find(p => p.id === data.id) || PUBLIC_PLAYLISTS.find(p => p.id === data.id) || data;
      setSelectedPlaylist(fullPlaylist);

      // Instant local resolution so tracks NEVER show empty!
      const instant = getPlaylistTracks(fullPlaylist, songs);
      setPlaylistSongs(instant);

      // In background, fetch from backend and use if returned
      fetchPlaylistSongs(fullPlaylist.id).then((s) => {
        if (s && s.length > 0) {
          setPlaylistSongs(s);
        } else if (instant.length > 0) {
          setPlaylistSongs(instant);
        }
      }).catch(() => {
        if (instant.length > 0) setPlaylistSongs(instant);
      });
    } else if (targetView === 'favourites') {
      const favs = await fetchFavourites();
      setLikedSongsList(favs);
    } else if (targetView === 'history') {
      const rec = await fetchRecentlyPlayed();
      setRecentSongs(rec);
    }

    if (!fromNav) {
      const newHistory = viewHistory.slice(0, historyIndex + 1);
      newHistory.push({ view: targetView, data });
      setViewHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const prev = viewHistory[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      handleSelectView(prev.view, prev.data, true);
    }
  };

  const handleForward = () => {
    if (historyIndex < viewHistory.length - 1) {
      const next = viewHistory[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      handleSelectView(next.view, next.data, true);
    }
  };

  const handleCreatePlaylist = async () => {
    const name = prompt('Enter new playlist name:');
    if (!name?.trim()) return;
    const pl = await createPlaylist(name.trim());
    if (pl) {
      setPlaylists((prev) => [pl, ...prev]);
      handleSelectView('playlist', pl);
    }
  };

  const handleDeletePlaylist = async (playlistId: number) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    const ok = await deletePlaylist(playlistId);
    if (ok) {
      setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
      handleSelectView('home');
    }
  };

  const handleRemoveSongFromCurrentPlaylist = async (songId: number) => {
    if (!selectedPlaylist) return;
    const ok = await removeSongFromPlaylist(selectedPlaylist.id, songId);
    if (ok) {
      setPlaylistSongs((prev) => prev.filter((s) => s.id !== songId));
      loadCatalog();
    }
  };

  const filteredSongs = songs.filter((s) => {
    const matchesSearch =
      !searchQuery ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.album && s.album.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesLang = !selectedLanguage || s.language?.toLowerCase() === selectedLanguage.toLowerCase();
    return matchesSearch && matchesLang;
  });

  // Artist specific song collections
  const theWeekndSongs = songs.filter((s) => s.artist.toLowerCase().includes('weeknd'));
  const lanaSongs = songs.filter((s) => s.artist.toLowerCase().includes('lana'));
  const arianaSongs = songs.filter((s) => s.artist.toLowerCase().includes('ariana'));
  const sidhuSongs = songs.filter((s) => s.artist.toLowerCase().includes('moose wala'));
  const honeySongs = songs.filter((s) => s.artist.toLowerCase().includes('honey singh'));

  // Get user initials for avatar
  const getInitials = () => {
    if (!userProfile) return 'M';
    const first = userProfile.firstName?.charAt(0) || '';
    const last = userProfile.surname?.charAt(0) || '';
    return (first + last).toUpperCase() || 'VIP';
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-[100vw] overflow-hidden bg-black text-white select-none">
      {/* 0. Mobile Top Dismissible App Install Banner (Spotify mobile web pattern) */}
      {showMobileInstallBanner && (
        <div className="md:hidden flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-purple-950 via-[#181818] to-neutral-900 border-b border-purple-500/20 text-white z-50 flex-shrink-0 animate-fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setShowMobileInstallBanner(false)}
              className="text-neutral-400 hover:text-white p-1 -ml-1 transition-colors flex-shrink-0"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src="/Melody-AppIcon-1024.png"
              alt="Melody App"
              className="w-7 h-7 rounded-lg shadow-md border border-white/10 flex-shrink-0 object-cover"
            />
            <div className="flex flex-col truncate">
              <span className="text-[11px] font-bold text-white truncate flex items-center gap-1">
                Melody Android App
                <span className="px-1 py-0.2 text-[8px] rounded-full bg-purple-600/40 text-purple-300 font-mono">v1.1.0</span>
              </span>
              <span className="text-[9px] text-purple-200/80 truncate">Free lossless 320k streaming & offline mode</span>
            </div>
          </div>
          <button
            onClick={() => setIsDownloadModalOpen(true)}
            className="flex-shrink-0 ml-2 px-3 py-1 rounded-full bg-white hover:bg-neutral-200 text-black text-xs font-black active:scale-95 transition-all shadow-lg flex items-center gap-1 cursor-pointer"
          >
            <ArrowDownCircle className="w-3.5 h-3.5 text-black" />
            <span>Install</span>
          </button>
        </div>
      )}

      {/* 1. Spotify Modern Full-Width Top Header Bar (Clean & Responsive on Mobile) */}
      <header className="h-14 sm:h-16 px-3 md:px-6 bg-black flex items-center justify-between z-40 flex-shrink-0 select-none">
        {/* Left: Melody Circular Brand Icon & Wordmark */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div 
            onClick={() => handleSelectView('home')} 
            className="flex items-center gap-2 cursor-pointer group"
            title="Melody Home"
          >
            <img 
              src="/Melody-AppIcon-1024.png" 
              alt="Melody Logo" 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full shadow-lg shadow-purple-500/25 group-hover:scale-105 transition-transform object-cover" 
            />
            <span className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5 leading-none">
              Melody
            </span>
          </div>
        </div>

        {/* Center: Circular Home Button + Capsule Pill Search Bar (Desktop Only) */}
        <div className="hidden sm:flex items-center gap-2 max-w-xl w-full justify-center px-1 sm:px-2">
          {/* Circular Home Button */}
          <button
            onClick={() => handleSelectView('home')}
            className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
              currentView === 'home'
                ? 'bg-[#2a2a2a] text-white scale-105 shadow-md shadow-black/40'
                : 'bg-[#1f1f1f] text-[#b3b3b3] hover:text-white hover:bg-[#282828] hover:scale-105'
            }`}
            title="Home"
          >
            <Home className="w-5 h-5 fill-current" />
          </button>

          {/* Spotify Capsule Pill Search Bar */}
          <div className="relative flex-1 max-w-[474px] group">
            <div className="flex items-center h-10 md:h-12 bg-[#1f1f1f] hover:bg-[#282828] focus-within:bg-[#1f1f1f] border border-transparent focus-within:border-white/20 rounded-full px-3 md:px-4 transition-all shadow-inner">
              <Search className="w-4 h-4 md:w-5 md:h-5 text-[#b3b3b3] group-hover:text-white flex-shrink-0 mr-2 md:mr-3 transition-colors" />
              <input
                type="text"
                placeholder="What do you want to play?"
                value={searchQuery}
                onFocus={() => {
                  if (currentView !== 'search') handleSelectView('search');
                }}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (currentView !== 'search') handleSelectView('search');
                }}
                className="w-full bg-transparent text-xs sm:text-sm text-white placeholder:text-[#b3b3b3] placeholder:font-normal outline-none"
              />
              {/* Divider */}
              <div className="hidden sm:block h-5 w-[1px] bg-white/20 mx-3 flex-shrink-0" />
              {/* Browse Library Drawer Icon */}
              <button
                onClick={() => handleSelectView('library')}
                title="Browse Your Library"
                className="hidden sm:block text-[#b3b3b3] hover:text-white transition-colors flex-shrink-0 p-1 cursor-pointer"
              >
                <FolderArchive className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Section: Explore Premium, Install App, Bell, Users, Profile Avatar */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0" ref={profileMenuRef}>
          {/* White Pill Button: Explore Premium (Desktop Only) */}
          <button
            onClick={userProfile ? () => setIsProfileModalOpen(true) : openLoginModal}
            className="hidden md:flex items-center px-4 py-2 rounded-full bg-white text-black hover:bg-neutral-200 text-sm font-bold tracking-tight transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer whitespace-nowrap"
          >
            Explore Premium
          </button>

          {/* Install App Pill Button (Prominently visible on mobile & desktop - opens multi-platform modal) */}
          <button
            onClick={() => setIsDownloadModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-md transition-all whitespace-nowrap cursor-pointer"
            title="Download Melody for Android, TV, Windows, Mac & iOS"
          >
            <ArrowDownCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            <span className="hidden sm:inline">Install App</span>
            <span className="sm:hidden">Install</span>
          </button>

          {/* 24/7 Customer Support Button */}
          <button
            onClick={() => setIsSupportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-md transition-all whitespace-nowrap cursor-pointer border border-white/5"
            title="Customer Support & Help"
          >
            <Headphones className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400" />
            <span className="hidden md:inline">Support</span>
          </button>

          {/* Notification Bell */}
          <button
            onClick={() => setIsHelpOpen(true)}
            className="hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/10 text-[#b3b3b3] hover:text-white items-center justify-center transition-all cursor-pointer"
            title="Updates & Help"
          >
            <Bell className="w-5 h-5" />
          </button>

          {/* Friends / Devices Activity */}
          <button
            onClick={() => setIsDevicesOpen(true)}
            className="hidden md:flex w-10 h-10 rounded-full hover:bg-white/10 text-[#b3b3b3] hover:text-white items-center justify-center transition-all cursor-pointer"
            title="Active Devices & Sessions"
          >
            <Users className="w-5 h-5" />
          </button>

          {/* User Profile Avatar with Blue Online Status Dot */}
          <div className="relative">
            <button
              onClick={() => userProfile ? setIsProfileMenuOpen(!isProfileMenuOpen) : openLoginModal()}
              className="relative w-9 h-9 rounded-full bg-[#242424] hover:bg-[#333333] border border-white/10 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 shadow-md text-white font-bold text-xs"
              title={userProfile ? `${userProfile.firstName} ${userProfile.surname}` : 'Log In / Profile'}
            >
              {userProfile ? (
                <span>{getInitials()}</span>
              ) : (
                <User className="w-4 h-4 text-[#b3b3b3]" />
              )}
              {/* Online indicator dot */}
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#3d91f4] border-2 border-black" />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#181824] border border-purple-500/20 shadow-2xl p-4 z-50 text-xs space-y-3 animate-fade-in">
                {userProfile ? (
                  <>
                    <div className="flex items-center gap-3 pb-3 border-b border-white/5">
                      <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 font-black text-sm">
                        {getInitials()}
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-bold text-white text-sm truncate">
                          {userProfile.firstName} {userProfile.surname}
                        </div>
                        <div className="text-[11px] text-neutral-400 font-mono">
                          +91 {userProfile.mobile}
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#0e0e16] border border-purple-500/20">
                      <div className="text-[10px] uppercase font-bold text-purple-400 tracking-wider mb-0.5">
                        Licence Key
                      </div>
                      <div className="flex items-center justify-between font-mono font-bold text-white text-xs tracking-wider">
                        <span>{userProfile.formattedKey}</span>
                        <button
                          onClick={handleCopyMenuKey}
                          className="p-1 hover:bg-white/10 rounded text-neutral-400 hover:text-white transition-colors"
                          title="Copy Key"
                        >
                          {copiedMenuKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/5 space-y-1">
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setIsProfileModalOpen(true);
                        }}
                        className="w-full py-1.5 px-2.5 text-left rounded-lg hover:bg-white/5 text-neutral-300 flex items-center gap-2 transition-colors"
                      >
                        <User className="w-3.5 h-3.5 text-purple-400" />
                        <span>Account & Profile Settings</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          handleSelectView('liked');
                        }}
                        className="w-full py-1.5 px-2.5 text-left rounded-lg hover:bg-white/5 text-neutral-300 flex items-center gap-2 transition-colors"
                      >
                        <Heart className="w-3.5 h-3.5 text-pink-400" />
                        <span>Liked Songs ({likedSongsList.length})</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          handleSelectView('library');
                        }}
                        className="w-full py-1.5 px-2.5 text-left rounded-lg hover:bg-white/5 text-neutral-300 flex items-center gap-2 transition-colors"
                      >
                        <Disc className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Your Playlists ({playlists.length})</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setIsDevicesOpen(true);
                        }}
                        className="w-full py-1.5 px-2.5 text-left rounded-lg hover:bg-white/5 text-neutral-300 flex items-center gap-2 transition-colors"
                      >
                        <Laptop className="w-3.5 h-3.5" />
                        <span>Manage Active Devices</span>
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full py-1.5 px-2.5 text-left rounded-lg hover:bg-red-500/10 text-red-400 flex items-center gap-2 transition-colors font-medium"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Log Out on this Device</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <p className="text-neutral-300 text-xs">Log in to sync your custom playlists and liked tracks across all your devices.</p>
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        openLoginModal();
                      }}
                      className="w-full py-2 rounded-full bg-white text-black font-extrabold text-xs hover:bg-neutral-200 transition-all cursor-pointer"
                    >
                      Log In to Cloud Sync
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace: Sidebar + Floating Spotify Rounded Card */}
      <div className="flex flex-1 overflow-hidden px-1 sm:px-2 pb-1 sm:pb-2 gap-2">
        <Sidebar
          currentView={currentView}
          selectedArtist={selectedArtist}
          onSelectView={(v, d) => handleSelectView(v, d)}
          playlists={playlists}
          onCreatePlaylist={handleCreatePlaylist}
          onOpenActivation={openVipModal}
          onOpenDevices={() => setIsDevicesOpen(true)}
          onOpenHelp={() => setIsHelpOpen(true)}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onOpenDownload={() => setIsDownloadModalOpen(true)}
          onOpenSupport={() => setIsSupportModalOpen(true)}
          userProfile={userProfile}
        />

        {/* Main Content Area with Spotify Dark Gradient */}
        <main className="flex-1 min-h-0 flex flex-col overflow-y-auto bg-gradient-to-b from-[#20202b] via-[#121212] to-[#121212] rounded-lg border border-white/5 overscroll-contain">
          {/* View Router */}
          <div className="p-3 sm:p-6 flex-1 pb-44 md:pb-24 overflow-x-hidden">
            {/* VIEW: HOME (Exact Spotify Dashboard) */}
            {currentView === 'home' && (
              <div className="space-y-6 sm:space-y-8">
                {/* Time-of-day Spotify Greeting */}
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{getGreeting()}</h1>
                </div>

                {/* 1. Top 6 Spotify Quick-Picks Grid (2-cols on mobile, 3-cols on desktop) */}
                {songs.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                    {songs.slice(0, 6).map((song) => (
                      <div
                        key={song.id}
                        onClick={() => playSong(song, songs)}
                        className="group flex items-center gap-2 sm:gap-3 bg-white/5 hover:bg-white/15 rounded-md overflow-hidden cursor-pointer transition-all border border-white/5 shadow-sm pr-2 sm:pr-3 h-14 sm:h-16"
                      >
                        <img
                          src={getFullCoverUrl(song.cover_url)}
                          alt={song.title}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/Melody-Logo-512.png';
                          }}
                          className="w-14 h-14 sm:w-16 sm:h-16 object-cover flex-shrink-0"
                        />
                        <span className="font-bold text-xs sm:text-sm truncate flex-1 leading-snug">{song.title}</span>
                        <div className="hidden sm:flex w-9 h-9 rounded-full bg-[#a855f7] hover:bg-[#9333ea] text-white items-center justify-center shadow-xl shadow-purple-900/30 opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all flex-shrink-0">
                          <Play className="w-4 h-4 fill-white ml-0.5" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. Popular Artists Section (Spotify Circular Avatars - Scaled for Mobile) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Popular Artists</h2>
                      <p className="text-xs text-[#b3b3b3] mt-0.5">Explore discographies and top hits</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-4">
                    {/* Sidhu Moose Wala Card */}
                    <div
                      onClick={() => handleSelectView('artist', 'Sidhu Moose Wala')}
                      className="group p-2.5 sm:p-4 bg-[#181818] hover:bg-[#282828] rounded-md transition-all cursor-pointer flex flex-col items-center text-center relative"
                    >
                      <div className="relative aspect-square w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 rounded-full overflow-hidden bg-neutral-800 mb-2 sm:mb-4 shadow-xl">
                        <img
                          src="/covers/desi-295-mvs26s80.jpg"
                          alt="Sidhu Moose Wala"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/Melody-Logo-512.png';
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 group-hover:brightness-110 transition-all duration-300"
                        />
                      </div>
                      <span className="font-bold text-xs sm:text-base text-white truncate w-full flex items-center justify-center gap-1">
                        Sidhu Moose Wala
                        <CheckCircle2 className="w-3.5 h-3.5 fill-blue-500 text-white flex-shrink-0" />
                      </span>
                      <span className="text-[10px] sm:text-xs text-[#b3b3b3] mt-0.5 font-medium">Artist &bull; {sidhuSongs.length} Tracks</span>
                    </div>

                    {/* Yo Yo Honey Singh Card */}
                    <div
                      onClick={() => handleSelectView('artist', 'Yo Yo Honey Singh')}
                      className="group p-2.5 sm:p-4 bg-[#181818] hover:bg-[#282828] rounded-md transition-all cursor-pointer flex flex-col items-center text-center relative"
                    >
                      <div className="relative aspect-square w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 rounded-full overflow-hidden bg-neutral-800 mb-2 sm:mb-4 shadow-xl">
                        <img
                          src="/covers/desi-desi-kalakaar-mvs2csms.jpg"
                          alt="Yo Yo Honey Singh"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/Melody-Logo-512.png';
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 group-hover:brightness-110 transition-all duration-300"
                        />
                      </div>
                      <span className="font-bold text-xs sm:text-base text-white truncate w-full flex items-center justify-center gap-1">
                        Yo Yo Honey Singh
                        <CheckCircle2 className="w-3.5 h-3.5 fill-blue-500 text-white flex-shrink-0" />
                      </span>
                      <span className="text-[10px] sm:text-xs text-[#b3b3b3] mt-0.5 font-medium">Artist &bull; {honeySongs.length} Tracks</span>
                    </div>

                    {/* Ariana Grande Card */}
                    <div
                      onClick={() => handleSelectView('artist', 'Ariana Grande')}
                      className="group p-2.5 sm:p-4 bg-[#181818] hover:bg-[#282828] rounded-md transition-all cursor-pointer flex flex-col items-center text-center relative"
                    >
                      <div className="relative aspect-square w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 rounded-full overflow-hidden bg-neutral-800 mb-2 sm:mb-4 shadow-xl">
                        <img
                          src="/covers/ariana-positions-mvrzwtf6.jpg"
                          alt="Ariana Grande"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/Melody-Logo-512.png';
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 group-hover:brightness-110 transition-all duration-300"
                        />
                      </div>
                      <span className="font-bold text-xs sm:text-base text-white truncate w-full flex items-center justify-center gap-1">
                        Ariana Grande
                        <CheckCircle2 className="w-3.5 h-3.5 fill-blue-500 text-white flex-shrink-0" />
                      </span>
                      <span className="text-[10px] sm:text-xs text-[#b3b3b3] mt-0.5 font-medium">Artist &bull; {arianaSongs.length} Tracks</span>
                    </div>

                    {/* The Weeknd Card */}
                    <div
                      onClick={() => handleSelectView('artist', 'The Weeknd')}
                      className="group p-2.5 sm:p-4 bg-[#181818] hover:bg-[#282828] rounded-md transition-all cursor-pointer flex flex-col items-center text-center relative"
                    >
                      <div className="relative aspect-square w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 rounded-full overflow-hidden bg-neutral-800 mb-2 sm:mb-4 shadow-xl">
                        <img
                          src="/covers/the-weeknd-avatar.jpg"
                          alt="The Weeknd"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/Melody-Logo-512.png';
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 group-hover:brightness-110 transition-all duration-300"
                        />
                      </div>
                      <span className="font-bold text-xs sm:text-base text-white truncate w-full flex items-center justify-center gap-1">
                        The Weeknd
                        <CheckCircle2 className="w-3.5 h-3.5 fill-blue-500 text-white flex-shrink-0" />
                      </span>
                      <span className="text-[10px] sm:text-xs text-[#b3b3b3] mt-0.5 font-medium">Artist &bull; {theWeekndSongs.length} Tracks</span>
                    </div>

                    {/* Lana Del Rey Card */}
                    <div
                      onClick={() => handleSelectView('artist', 'Lana Del Rey')}
                      className="group p-2.5 sm:p-4 bg-[#181818] hover:bg-[#282828] rounded-md transition-all cursor-pointer flex flex-col items-center text-center relative"
                    >
                      <div className="relative aspect-square w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 rounded-full overflow-hidden bg-neutral-800 mb-2 sm:mb-4 shadow-xl">
                        <img
                          src="/covers/lana-collection.jpg"
                          alt="Lana Del Rey"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/Melody-Logo-512.png';
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 group-hover:brightness-110 transition-all duration-300"
                        />
                      </div>
                      <span className="font-bold text-xs sm:text-base text-white truncate w-full flex items-center justify-center gap-1">
                        Lana Del Rey
                        <CheckCircle2 className="w-3.5 h-3.5 fill-blue-500 text-white flex-shrink-0" />
                      </span>
                      <span className="text-[10px] sm:text-xs text-[#b3b3b3] mt-0.5 font-medium">Artist &bull; {lanaSongs.length} Tracks</span>
                    </div>
                  </div>
                </div>

                {/* 3. Featured Playlists & Collections Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-white tracking-tight">Playlists & Collections</h2>
                      <p className="text-xs text-[#b3b3b3] mt-0.5">Explore your curated mixes and uploaded playlists</p>
                    </div>
                    <button
                      onClick={handleCreatePlaylist}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Playlist</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {/* Create New Playlist Card */}
                    <div
                      onClick={handleCreatePlaylist}
                      className="group p-4 bg-[#181818] hover:bg-[#282828] rounded-md transition-all cursor-pointer flex flex-col items-center justify-center text-center aspect-square border-2 border-dashed border-white/10 hover:border-purple-500/50"
                    >
                      <div className="w-14 h-14 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-lg">
                        <PlusSquare className="w-7 h-7" />
                      </div>
                      <span className="font-bold text-sm text-white">Create Playlist</span>
                      <span className="text-[11px] text-[#b3b3b3] mt-0.5">Add your favorite tracks</span>
                    </div>

                    {/* All User & Public Curated Playlists */}
                    {playlists.map((pl) => {
                      const songCount = pl.total_songs ?? pl.song_count ?? 0;
                      return (
                        <div
                          key={pl.id}
                          onClick={() => handleSelectView('playlist', pl)}
                          className="group relative p-3.5 bg-[#181818] hover:bg-[#282828] rounded-md transition-all duration-300 cursor-pointer shadow-md flex flex-col"
                        >
                          <div className="relative aspect-square w-full rounded-md overflow-hidden bg-gradient-to-br from-purple-900/60 via-indigo-950/80 to-neutral-900 mb-3 shadow-lg flex items-center justify-center border border-white/5">
                            {pl.cover_url ? (
                              <img 
                                src={pl.cover_url} 
                                alt={pl.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Disc className="w-16 h-16 text-purple-400/60 group-hover:scale-110 group-hover:text-purple-300 transition-all duration-300" />
                            )}
                            <div className="absolute bottom-2 right-2 w-11 h-11 rounded-full bg-[#a855f7] hover:bg-[#9333ea] active:scale-95 text-white flex items-center justify-center shadow-2xl opacity-0 group-hover:opacity-100 group-hover:scale-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                              <Play className="w-5 h-5 fill-white ml-0.5" />
                            </div>
                          </div>
                          <span className="font-bold text-sm text-white truncate w-full" title={pl.name}>{pl.name}</span>
                          <p className="text-xs text-[#b3b3b3] mt-1 line-clamp-2 leading-relaxed">
                            {pl.description || `${songCount} songs • High Quality Audio`}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Sidhu Moose Wala Curated Section */}
                {sidhuSongs.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2
                          onClick={() => handleSelectView('artist', 'Sidhu Moose Wala')}
                          className="text-2xl font-bold text-white tracking-tight hover:underline cursor-pointer"
                        >
                          Sidhu Moose Wala Essentials
                        </h2>
                        <p className="text-xs text-[#b3b3b3]">295, So High, Same Beef, East Side Flow & More</p>
                      </div>
                      <button
                        onClick={() => handleSelectView('artist', 'Sidhu Moose Wala')}
                        className="text-xs font-bold text-[#b3b3b3] hover:text-white hover:underline transition-colors uppercase tracking-wider"
                      >
                        Show all ({sidhuSongs.length})
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {sidhuSongs.slice(0, 6).map((song) => (
                        <SongCard
                          key={song.id}
                          song={song}
                          queueContext={sidhuSongs}
                          onSelectArtist={(a) => handleSelectView('artist', a)}
                          onAddToPlaylist={(s) => setSongToAddToPlaylist(s)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Yo Yo Honey Singh Curated Section */}
                {honeySongs.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2
                          onClick={() => handleSelectView('artist', 'Yo Yo Honey Singh')}
                          className="text-2xl font-bold text-white tracking-tight hover:underline cursor-pointer"
                        >
                          Yo Yo Honey Singh Blockbusters
                        </h2>
                        <p className="text-xs text-[#b3b3b3]">Brown Rang, Blue Eyes, Desi Kalakaar, Dope Shope & More</p>
                      </div>
                      <button
                        onClick={() => handleSelectView('artist', 'Yo Yo Honey Singh')}
                        className="text-xs font-bold text-[#b3b3b3] hover:text-white hover:underline transition-colors uppercase tracking-wider"
                      >
                        Show all ({honeySongs.length})
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {honeySongs.slice(0, 6).map((song) => (
                        <SongCard
                          key={song.id}
                          song={song}
                          queueContext={honeySongs}
                          onSelectArtist={(a) => handleSelectView('artist', a)}
                          onAddToPlaylist={(s) => setSongToAddToPlaylist(s)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Ariana Grande Curated Section */}
                {arianaSongs.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2
                          onClick={() => handleSelectView('artist', 'Ariana Grande')}
                          className="text-2xl font-bold text-white tracking-tight hover:underline cursor-pointer"
                        >
                          Ariana Grande Hits
                        </h2>
                        <p className="text-xs text-[#b3b3b3]">Positions, thank u next, Dangerous Woman, 7 rings & More</p>
                      </div>
                      <button
                        onClick={() => handleSelectView('artist', 'Ariana Grande')}
                        className="text-xs font-bold text-[#b3b3b3] hover:text-white hover:underline transition-colors uppercase tracking-wider"
                      >
                        Show all ({arianaSongs.length})
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {arianaSongs.slice(0, 6).map((song) => (
                        <SongCard
                          key={song.id}
                          song={song}
                          queueContext={arianaSongs}
                          onSelectArtist={(a) => handleSelectView('artist', a)}
                          onAddToPlaylist={(s) => setSongToAddToPlaylist(s)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. The Weeknd Curated Carousel */}
                {theWeekndSongs.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2
                          onClick={() => handleSelectView('artist', 'The Weeknd')}
                          className="text-2xl font-bold text-white tracking-tight hover:underline cursor-pointer"
                        >
                          The Weeknd Essentials
                        </h2>
                        <p className="text-xs text-[#b3b3b3]">Top studio tracks and remix editions</p>
                      </div>
                      <button
                        onClick={() => handleSelectView('artist', 'The Weeknd')}
                        className="text-xs font-bold text-[#b3b3b3] hover:text-white hover:underline transition-colors uppercase tracking-wider"
                      >
                        Show all ({theWeekndSongs.length})
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {theWeekndSongs.slice(0, 6).map((song) => (
                        <SongCard
                          key={song.id}
                          song={song}
                          queueContext={theWeekndSongs}
                          onSelectArtist={(a) => handleSelectView('artist', a)}
                          onAddToPlaylist={(s) => setSongToAddToPlaylist(s)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 7. Lana Del Rey Curated Carousel */}
                {lanaSongs.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2
                          onClick={() => handleSelectView('artist', 'Lana Del Rey')}
                          className="text-2xl font-bold text-white tracking-tight hover:underline cursor-pointer"
                        >
                          Lana Del Rey Collection
                        </h2>
                        <p className="text-xs text-[#b3b3b3]">Cinematic melodies and acoustic recordings</p>
                      </div>
                      <button
                        onClick={() => handleSelectView('artist', 'Lana Del Rey')}
                        className="text-xs font-bold text-[#b3b3b3] hover:text-white hover:underline transition-colors uppercase tracking-wider"
                      >
                        Show all ({lanaSongs.length})
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {lanaSongs.slice(0, 6).map((song) => (
                        <SongCard
                          key={song.id}
                          song={song}
                          queueContext={lanaSongs}
                          onSelectArtist={(a) => handleSelectView('artist', a)}
                          onAddToPlaylist={(s) => setSongToAddToPlaylist(s)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 8. Complete Featured Catalog Grid */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white tracking-tight">All Tracks</h2>
                    <span className="text-xs text-[#b3b3b3] font-medium">{filteredSongs.length} available</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filteredSongs.slice(0, 18).map((song) => (
                      <SongCard
                        key={song.id}
                        song={song}
                        queueContext={filteredSongs}
                        onSelectArtist={(a) => handleSelectView('artist', a)}
                        onAddToPlaylist={(s) => setSongToAddToPlaylist(s)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW: ARTIST (Dedicated Spotify Artist Profile Page) */}
            {currentView === 'artist' && (
              <ArtistView
                artistName={selectedArtist}
                songs={songs}
                onBack={() => handleSelectView('home')}
                onAddToPlaylist={(s) => setSongToAddToPlaylist(s)}
              />
            )}

            {/* VIEW: SEARCH */}
            {currentView === 'search' && (
              <div className="space-y-4 sm:space-y-6">
                {/* Mobile Search Bar */}
                <div className="sm:hidden relative">
                  <div className="flex items-center h-11 bg-[#242424] focus-within:bg-[#1f1f1f] border border-white/10 focus-within:border-purple-500/50 rounded-full px-3.5 shadow-lg">
                    <Search className="w-4 h-4 text-neutral-400 mr-2 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="What do you want to play?"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                      className="w-full bg-transparent text-xs text-white placeholder:text-neutral-400 outline-none"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="p-1 text-neutral-400 hover:text-white">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h2 className="text-xl sm:text-2xl font-bold text-white">Search Results</h2>
                  <span className="text-xs text-[#b3b3b3]">{filteredSongs.length} matches</span>
                </div>

                {/* Artist Matches */}
                {searchQuery && (
                  <div className="space-y-2 sm:space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#b3b3b3]">Artists</h3>
                    <div className="flex flex-wrap gap-2.5 sm:gap-4">
                      {['Sidhu Moose Wala', 'Yo Yo Honey Singh', 'Ariana Grande', 'The Weeknd', 'Lana Del Rey']
                        .filter((a) => a.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((artistName) => (
                          <div
                            key={artistName}
                            onClick={() => handleSelectView('artist', artistName)}
                            className="flex items-center gap-2.5 p-2 sm:p-3 bg-[#181818] hover:bg-[#282828] rounded-md cursor-pointer transition-all"
                          >
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold text-xs sm:text-sm text-white">
                              {artistName[0]}
                            </div>
                            <div>
                              <div className="text-xs sm:text-sm font-bold text-white">{artistName}</div>
                              <div className="text-[10px] sm:text-xs text-[#b3b3b3]">Artist</div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Songs Table Header */}
                <div className="grid grid-cols-[28px_1fr_auto] md:grid-cols-[36px_1fr_1fr_80px] px-2.5 sm:px-3.5 py-2 border-b border-white/10 text-xs font-semibold text-[#b3b3b3] uppercase tracking-wider">
                  <span className="text-center">#</span>
                  <span>Title</span>
                  <span className="hidden md:block">Album</span>
                  <span className="text-right">Duration</span>
                </div>

                <div className="space-y-1">
                  {filteredSongs.map((song, i) => (
                    <SongRow
                      key={song.id}
                      index={i}
                      song={song}
                      queueContext={filteredSongs}
                      onSelectArtist={(a) => handleSelectView('artist', a)}
                      onAddToPlaylist={(s) => setSongToAddToPlaylist(s)}
                    />
                  ))}
                </div>

                {filteredSongs.length === 0 && (
                  <div className="py-16 text-center text-[#b3b3b3] text-sm">
                    No songs found matching "{searchQuery}".
                  </div>
                )}
              </div>
            )}

            {/* VIEW: YOUR LIBRARY */}
            {currentView === 'library' && (
              <div className="space-y-6">
                {/* Library Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
                      <Library className="w-5 h-5" />
                    </div>
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Your Library</h1>
                      <p className="text-xs text-[#b3b3b3]">Playlists, downloads, and favorites</p>
                    </div>
                  </div>
                  <button
                    onClick={handleCreatePlaylist}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#a855f7] hover:bg-[#9333ea] text-white text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create</span>
                  </button>
                </div>

                {/* Quick Pinned Cards: Liked Songs & Downloaded */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Liked Songs Tile */}
                  <div
                    onClick={() => handleSelectView('favourites')}
                    className="group flex items-center gap-4 p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-purple-900/50 via-indigo-900/30 to-[#181818] border border-purple-500/20 hover:border-purple-500/50 cursor-pointer transition-all hover:scale-[1.01]"
                  >
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg flex-shrink-0">
                      <Heart className="w-6 h-6 sm:w-7 sm:h-7 fill-white text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm sm:text-base text-white truncate">Liked Songs</h3>
                      <p className="text-xs text-neutral-400">{likedSongsList.length} tracks &bull; Auto-synced</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-neutral-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  </div>

                  {/* Downloaded Songs Tile */}
                  <div
                    onClick={() => handleSelectView('downloaded')}
                    className="group flex items-center gap-4 p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-cyan-950/50 via-blue-950/30 to-[#181818] border border-cyan-500/20 hover:border-cyan-500/50 cursor-pointer transition-all hover:scale-[1.01]"
                  >
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center shadow-lg flex-shrink-0">
                      <ArrowDownCircle className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm sm:text-base text-white truncate">Downloaded</h3>
                      <p className="text-xs text-neutral-400">{offlineTracks.length} tracks &bull; Zero-data offline</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-neutral-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>

                {/* All Playlists Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">All Playlists ({playlists.length})</h2>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4">
                    {playlists.map((pl) => {
                      const songCount = pl.total_songs ?? pl.song_count ?? 0;
                      return (
                        <div
                          key={pl.id}
                          onClick={() => handleSelectView('playlist', pl)}
                          className="group relative p-2.5 sm:p-3.5 bg-[#181818] hover:bg-[#282828] rounded-md transition-all duration-300 cursor-pointer shadow-md flex flex-col"
                        >
                          <div className="relative aspect-square w-full rounded-md overflow-hidden bg-gradient-to-br from-purple-900/60 via-indigo-950/80 to-neutral-900 mb-2.5 shadow-lg flex items-center justify-center border border-white/5">
                            {pl.cover_url ? (
                              <img
                                src={pl.cover_url}
                                alt={pl.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Disc className="w-12 h-12 text-purple-400/60" />
                            )}
                            <div className="absolute bottom-2 right-2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#a855f7] hover:bg-[#9333ea] active:scale-95 text-white flex items-center justify-center shadow-2xl opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all">
                              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white ml-0.5" />
                            </div>
                          </div>
                          <span className="font-bold text-xs sm:text-sm text-white truncate w-full" title={pl.name}>{pl.name}</span>
                          <p className="text-[10px] sm:text-xs text-[#b3b3b3] mt-0.5 line-clamp-2 leading-relaxed">
                            {pl.description || `${songCount} tracks • Studio 320k`}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW: LIKED SONGS */}
            {currentView === 'favourites' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-end text-center sm:text-left gap-4 sm:gap-6 bg-gradient-to-t from-transparent to-blue-900/30 p-4 sm:p-8 rounded-xl border border-white/5">
                  <div className="w-28 h-28 sm:w-44 sm:h-44 rounded-md bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-2xl flex-shrink-0">
                    <Heart className="w-14 h-14 sm:w-20 sm:h-20 fill-white text-white" />
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <span className="text-[11px] sm:text-xs uppercase font-extrabold tracking-widest text-blue-400">Playlist</span>
                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white">Liked Songs</h1>
                    <p className="text-xs text-[#b3b3b3]">{likedSongsList.length} favourite tracks</p>
                  </div>
                </div>

                <div className="space-y-1">
                  {likedSongsList.map((song, i) => (
                    <SongRow
                      key={song.id}
                      index={i}
                      song={song}
                      queueContext={likedSongsList}
                      onSelectArtist={(a) => handleSelectView('artist', a)}
                      onAddToPlaylist={(s) => setSongToAddToPlaylist(s)}
                    />
                  ))}
                  {likedSongsList.length === 0 && (
                    <div className="py-12 text-center text-[#b3b3b3] text-sm">
                      No liked songs yet. Tap the heart icon on any song!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW: DOWNLOADED (SAVED ON THIS DEVICE FOR OFFLINE PLAY) */}
            {currentView === 'downloaded' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-end text-center sm:text-left gap-4 sm:gap-6 p-4 sm:p-8 rounded-xl bg-gradient-to-r from-purple-950/40 via-purple-900/20 to-transparent border border-purple-500/20 shadow-xl">
                  <div className="w-28 h-28 sm:w-40 sm:h-40 rounded-xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-900 flex items-center justify-center shadow-2xl shadow-purple-900/50 flex-shrink-0">
                    <ArrowDownCircle className="w-14 h-14 sm:w-20 sm:h-20 text-white" />
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <span className="text-[11px] sm:text-xs uppercase font-extrabold tracking-widest text-purple-400">Local Device Storage</span>
                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white">Downloaded</h1>
                    <p className="text-xs text-[#b3b3b3]">
                      Saved on this device for zero-data offline playback &bull; {offlineTracks.length} tracks ({offlineTracksTotalMb} MB)
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  {offlineTracks.map((track, i) => (
                    <SongRow
                      key={track.id}
                      index={i}
                      song={track as Song}
                      queueContext={offlineTracks as Song[]}
                      onSelectArtist={(a) => handleSelectView('artist', a)}
                      onAddToPlaylist={(s) => setSongToAddToPlaylist(s)}
                    />
                  ))}
                  {offlineTracks.length === 0 && (
                    <div className="py-16 text-center text-[#b3b3b3] space-y-2 text-sm">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-[#a855f7]">
                        <ArrowDownCircle className="w-6 h-6" />
                      </div>
                      <div className="font-bold text-white">No downloaded songs on this device yet</div>
                      <div className="text-xs max-w-sm mx-auto">
                        Click the download arrow on any song or album to save it locally on your device for instant offline listening.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW: RECENTLY PLAYED */}
            {currentView === 'history' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Clock className="w-7 h-7 text-[#a855f7]" />
                  <h2 className="text-3xl font-black text-white">Recently Played History</h2>
                </div>

                <div className="space-y-1">
                  {recentSongs.map((song, i) => (
                    <SongRow
                      key={song.id}
                      index={i}
                      song={song}
                      queueContext={recentSongs}
                      onSelectArtist={(a) => handleSelectView('artist', a)}
                      onAddToPlaylist={(s) => setSongToAddToPlaylist(s)}
                    />
                  ))}
                  {recentSongs.length === 0 && (
                    <div className="py-12 text-center text-[#b3b3b3]">
                      No listening history yet. Start playing your favorite tracks!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW: CUSTOM PLAYLIST */}
            {currentView === 'playlist' && selectedPlaylist && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 p-4 sm:p-8 rounded-2xl bg-gradient-to-b sm:bg-gradient-to-r from-purple-900/40 via-neutral-900/60 to-black/80 border border-white/10 shadow-2xl">
                  {/* Playlist Cover Art with fallback */}
                  <div className="relative w-36 h-36 sm:w-48 sm:h-48 rounded-xl overflow-hidden shadow-2xl shadow-purple-950/60 flex-shrink-0 border border-white/10 bg-neutral-900">
                    {selectedPlaylist.cover_url ? (
                      <img
                        src={selectedPlaylist.cover_url}
                        alt={selectedPlaylist.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/Melody-Logo-512.png';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-700 via-indigo-800 to-neutral-900">
                        <Disc className="w-16 h-16 text-purple-300" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2.5 flex-1 min-w-0 text-center sm:text-left w-full">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider border border-purple-500/30">
                        {selectedPlaylist.id <= 11 ? 'Curated Playlist' : 'Your Playlist'}
                      </span>
                      <span className="text-[11px] text-neutral-400">Studio 320k Audio</span>
                    </div>

                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white truncate" title={selectedPlaylist.name}>
                      {selectedPlaylist.name}
                    </h1>

                    {selectedPlaylist.description && (
                      <p className="text-xs sm:text-sm text-neutral-300 max-w-xl line-clamp-2">
                        {selectedPlaylist.description}
                      </p>
                    )}

                    <p className="text-xs text-neutral-400 flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
                      <span>Melody Music</span>
                      <span>•</span>
                      <span className="font-semibold text-white">{playlistSongs.length} songs</span>
                      <span>•</span>
                      <span>Free Streaming</span>
                    </p>

                    <div className="flex items-center justify-center sm:justify-start gap-3 pt-2">
                      <button
                        onClick={() => {
                          if (playlistSongs.length > 0) {
                            playSong(playlistSongs[0], playlistSongs);
                          }
                        }}
                        disabled={playlistSongs.length === 0}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#a855f7] hover:bg-[#9333ea] disabled:opacity-40 text-white font-extrabold text-sm shadow-xl shadow-purple-950/60 transition-all hover:scale-105 active:scale-95"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>Play All</span>
                      </button>

                      {/* Only allow deleting custom playlists, never system curated */}
                      {selectedPlaylist.id > 11 && (
                        <button
                          onClick={() => handleDeletePlaylist(selectedPlaylist.id)}
                          className="px-4 py-2 rounded-full bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-neutral-400 hover:text-red-400 text-xs font-semibold transition-colors"
                        >
                          Delete Playlist
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  {playlistSongs.map((song, i) => (
                    <SongRow
                      key={song.id}
                      index={i}
                      song={song}
                      queueContext={playlistSongs}
                      onSelectArtist={(a) => handleSelectView('artist', a)}
                      onAddToPlaylist={(s) => setSongToAddToPlaylist(s)}
                      onRemoveFromPlaylist={() => handleRemoveSongFromCurrentPlaylist(song.id)}
                    />
                  ))}
                  {loading && playlistSongs.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center space-y-3">
                      <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-neutral-400 font-medium">Loading tracks...</p>
                    </div>
                  ) : playlistSongs.length === 0 ? (
                    <div className="py-16 text-center text-neutral-400 space-y-2">
                      <Disc className="w-12 h-12 mx-auto text-purple-400/40" />
                      <p className="text-sm font-medium">This playlist is currently empty.</p>
                      <p className="text-xs text-neutral-500">Click the '+' button on any track in your library to add it here!</p>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Persistent Bottom Spotify-Style Player */}
      <PlayerBar onSelectArtist={(artist) => handleSelectView('artist', artist)} />

      {/* Spotify Mobile Bottom Navigation Bar (md:hidden) */}
      <nav className="md:hidden flex items-center justify-around bg-[#121212]/95 backdrop-blur-xl border-t border-white/10 py-1.5 px-2 z-40 select-none flex-shrink-0 pb-[max(8px,env(safe-area-inset-bottom))]">
        <button
          onClick={() => handleSelectView('home')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-all ${
            currentView === 'home' ? 'text-white' : 'text-[#b3b3b3]'
          }`}
        >
          <Home className={`w-5 h-5 ${currentView === 'home' ? 'text-[#a855f7] fill-current' : ''}`} />
          <span className="text-[10px] font-bold">Home</span>
        </button>

        <button
          onClick={() => handleSelectView('search')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-all ${
            currentView === 'search' ? 'text-white' : 'text-[#b3b3b3]'
          }`}
        >
          <Search className={`w-5 h-5 ${currentView === 'search' ? 'text-[#a855f7] stroke-[2.5]' : ''}`} />
          <span className="text-[10px] font-bold">Search</span>
        </button>

        <button
          onClick={() => handleSelectView('library')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-all ${
            currentView === 'library' ? 'text-white' : 'text-[#b3b3b3]'
          }`}
        >
          <Library className={`w-5 h-5 ${currentView === 'library' ? 'text-[#a855f7]' : ''}`} />
          <span className="text-[10px] font-bold">Your Library</span>
        </button>

        <button
          onClick={() => setIsDownloadModalOpen(true)}
          className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-purple-400 hover:text-purple-300 transition-all active:scale-95 cursor-pointer"
          title="Download Melody App for All Devices"
        >
          <div className="relative">
            <ArrowDownCircle className="w-5 h-5 text-[#a855f7]" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <span className="text-[10px] font-extrabold text-white">Download</span>
        </button>
      </nav>

      {/* Interactive Modals */}
      <ActivationModal
        isOpen={isActivationOpen}
        initialTab={activationInitialTab}
        onClose={() => setIsActivationOpen(false)}
        onActivated={() => {
          loadCatalog();
        }}
        onDeviceLimitReached={(devs) => {
          setDeviceLimitDevices(devs);
          setIsDevicesOpen(true);
        }}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      <DeviceModal
        isOpen={isDevicesOpen}
        onClose={() => setIsDevicesOpen(false)}
        devicesList={deviceLimitDevices}
        onSlotFreed={() => {
          openLoginModal();
        }}
      />

      {/* Help, Discord & FAQ Support Modal */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        onOpenActivation={openVipModal}
      />

      {/* Spotify Equalizer Modal */}
      <EqualizerModal />

      {/* Immersive Now Playing Animated Theme View */}
      <NowPlayingView />

      {/* Spotify User Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userProfile={userProfile}
        onLogout={handleLogout}
        likedCount={likedSongsList.length}
        playlistsCount={playlists.length}
        recentCount={recentSongs.length}
        onNavigateHistory={() => handleSelectView('history')}
        onNavigatePlaylists={() => handleSelectView('library')}
        onNavigateLiked={() => handleSelectView('liked')}
      />

      {/* Add To Custom Playlist Modal */}
      <AddToPlaylistModal
        isOpen={!!songToAddToPlaylist}
        onClose={() => setSongToAddToPlaylist(null)}
        song={songToAddToPlaylist}
        playlists={playlists}
        onPlaylistUpdated={() => loadCatalog()}
      />

      {/* Multi-Platform Download Selector Modal (Android, TV, Windows, Mac, iOS) */}
      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
      />

      {/* 24/7 Customer Support & Help Desk Modal */}
      <SupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        onResync={() => loadCatalog()}
      />
    </div>
  );
};
