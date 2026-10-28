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
import { AdModal, AdReason } from './components/AdModal';
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
} from 'lucide-react';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<string>('home');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<string>('The Weeknd');
  const [playlistSongs, setPlaylistSongs] = useState<Song[]>([]);

  // Navigation History for Spotify-style Back/Forward
  const [viewHistory, setViewHistory] = useState<Array<{ view: string; data?: any }>>([{ view: 'home' }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);
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

  const { playSong, offlineTracks, refreshFavourites, isPlaying, togglePlay, currentSong } = usePlayer();
  const offlineTracksTotalMb = (offlineTracks.reduce((acc, t) => acc + (t.fileSize || 0), 0) / (1024 * 1024)).toFixed(1);

  // Google Ads Listening Session Engine State
  const [isAdOpen, setIsAdOpen] = useState(false);
  const [adReason, setAdReason] = useState<AdReason>('guest_launch');
  const [guestSecondsRemaining, setGuestSecondsRemaining] = useState<number>(() => {
    try {
      const stored = sessionStorage.getItem('melody_guest_free_pass_until');
      if (stored) {
        return Math.max(0, Math.floor((Number(stored) - Date.now()) / 1000));
      }
    } catch {}
    return 0;
  });
  const [annualListeningSeconds, setAnnualListeningSeconds] = useState<number>(0);
  const [lifetimeListeningSeconds, setLifetimeListeningSeconds] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('melody_lifetime_listened_seconds');
      return stored ? parseInt(stored, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });

  // Guest Launch Ad: Show on opening app if no active session free pass exists
  useEffect(() => {
    if (!userProfile) {
      const stored = sessionStorage.getItem('melody_guest_free_pass_until');
      if (!stored || Number(stored) <= Date.now()) {
        setAdReason('guest_launch');
        setIsAdOpen(true);
      }
    }
  }, [userProfile]);

  // Active Playback Listening Tick (Deducts seconds only while music is playing)
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      // 1. Free Guest (Session-based: 30 minutes active listening)
      if (!userProfile) {
        setGuestSecondsRemaining((prev) => {
          if (prev <= 1) {
            togglePlay();
            setAdReason('guest_30m');
            setIsAdOpen(true);
            return 30 * 60;
          }
          return prev - 1;
        });
      }
      // 2. Annual VIP: Every 1 hour (3600 seconds) of active listening
      else if (userProfile.plan === 'annual') {
        setAnnualListeningSeconds((prev) => {
          const next = prev + 1;
          if (next >= 3600) {
            togglePlay();
            setAdReason('annual_60m');
            setIsAdOpen(true);
            return 0;
          }
          return next;
        });
      }
      // 3. Lifetime VIP: Every 3 hours (10800 seconds) cumulative across days/sessions
      else if (userProfile.plan === 'lifetime') {
        setLifetimeListeningSeconds((prev) => {
          const next = prev + 1;
          try {
            localStorage.setItem('melody_lifetime_listened_seconds', String(next));
          } catch {}
          if (next >= 10800) {
            togglePlay();
            setAdReason('lifetime_180m');
            setIsAdOpen(true);
            try {
              localStorage.setItem('melody_lifetime_listened_seconds', '0');
            } catch {}
            return 0;
          }
          return next;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, userProfile, togglePlay]);

  const handleAdCompleted = () => {
    setIsAdOpen(false);
    if (adReason === 'guest_launch' || adReason === 'guest_30m') {
      const unlockUntil = Date.now() + 30 * 60 * 1000;
      try {
        sessionStorage.setItem('melody_guest_free_pass_until', String(unlockUntil));
      } catch {}
      setGuestSecondsRemaining(30 * 60);
    }
    if (currentSong && !isPlaying) {
      togglePlay();
    }
  };

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
      fetchSongs('', '', 500),
      fetchPlaylists(),
      fetchRecentlyPlayed(),
      fetchFavourites(),
      fetchDevices(),
    ]);

    setSongs(fetchedSongs);
    setPlaylists(fetchedPlaylists);
    setRecentSongs(fetchedRecent);
    setLikedSongsList(fetchedFavs);

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
    setCurrentView(view);

    if (view === 'artist' && data) {
      setSelectedArtist(data);
    } else if (view === 'playlist' && data) {
      setSelectedPlaylist(data);
      const s = await fetchPlaylistSongs(data.id);
      setPlaylistSongs(s);
    } else if (view === 'favourites') {
      const favs = await fetchFavourites();
      setLikedSongsList(favs);
    } else if (view === 'history') {
      const rec = await fetchRecentlyPlayed();
      setRecentSongs(rec);
    }

    if (!fromNav) {
      const newHistory = viewHistory.slice(0, historyIndex + 1);
      newHistory.push({ view, data });
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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#121212] text-white select-none">
      {/* Upper Area: Spotify Sidebar + Main Content */}
      <div className="flex flex-1 overflow-hidden">
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
          userProfile={userProfile}
        />

        {/* Main Content Area with Spotify Dark Gradient */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-gradient-to-b from-[#20202b] via-[#121212] to-[#121212]">
          {/* Top Sticky Header with Spotify Navigation Controls */}
          <header className="sticky top-0 z-30 h-16 bg-[#121212]/80 backdrop-blur-md px-6 flex items-center justify-between border-b border-white/5">
            {/* Left: Spotify Back & Forward Buttons */}
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBack}
                  disabled={historyIndex === 0}
                  className="w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:hover:bg-black/60"
                  title="Go back"
                >
                  <ChevronLeft className="w-5 h-5 ml-[-1px]" />
                </button>
                <button
                  onClick={handleForward}
                  disabled={historyIndex >= viewHistory.length - 1}
                  className="w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:hover:bg-black/60"
                  title="Go forward"
                >
                  <ChevronRight className="w-5 h-5 mr-[-1px]" />
                </button>
              </div>

              {/* Search Bar when on Search View */}
              {currentView === 'search' && (
                <div className="relative w-full max-w-md">
                  <Search className="w-4 h-4 text-[#b3b3b3] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="What do you want to play?"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#242424] hover:bg-[#2a2a2a] focus:bg-[#242424] border border-transparent focus:border-white/20 rounded-full pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-[#b3b3b3] outline-none transition-all"
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* Right Header: Auth & VIP Badges */}
            <div className="flex items-center gap-3" ref={profileMenuRef}>
              {userProfile ? (
                /* Authenticated VIP User Controls */
                <div className="flex items-center gap-2.5">
                  {/* VIP Plan Badge - Opens Spotify Profile */}
                  <div
                    onClick={() => setIsProfileModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-purple-900/60 to-indigo-900/60 border border-purple-500/40 text-purple-200 text-xs font-bold shadow-sm cursor-pointer hover:border-purple-400 hover:scale-105 transition-all"
                    title="View Profile & Cloud Settings"
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>{userProfile.plan === 'lifetime' ? 'Lifetime VIP' : 'Annual VIP'}</span>
                  </div>

                  {/* Device Slot Button */}
                  <button
                    onClick={() => setIsDevicesOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 text-xs font-medium transition-all"
                    title="Active Devices"
                  >
                    <Laptop className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="hidden sm:inline">Devices</span>
                  </button>

                  {/* Profile Avatar Trigger */}
                  <div className="relative">
                    <button
                      onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 border border-white/20 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 shadow-md shadow-purple-900/30 font-bold text-xs text-white"
                      title={`${userProfile.firstName} ${userProfile.surname}`}
                    >
                      {getInitials()}
                    </button>

                    {/* Profile Dropdown Menu */}
                    {isProfileMenuOpen && (
                      <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#181824] border border-purple-500/20 shadow-2xl p-4 z-50 text-xs space-y-3 animate-fade-in">
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

                        {/* Licence Key Box */}
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

                        {/* Plan Details */}
                        <div className="space-y-1 text-[11px] text-neutral-400">
                          <div className="flex justify-between">
                            <span>Membership:</span>
                            <span className="font-bold text-purple-300 capitalize">
                              {userProfile.plan === 'lifetime' ? 'Lifetime VIP (Forever)' : 'Annual VIP'}
                            </span>
                          </div>
                          {userProfile.expiresAt && (
                            <div className="flex justify-between">
                              <span>Expires:</span>
                              <span className="text-neutral-300">
                                {new Date(userProfile.expiresAt).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="pt-2 border-t border-white/5 space-y-1">
                          <button
                            onClick={() => {
                              setIsProfileMenuOpen(false);
                              setIsProfileModalOpen(true);
                            }}
                            className="w-full py-1.5 px-2.5 text-left rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 flex items-center gap-2 transition-colors font-semibold"
                          >
                            <User className="w-3.5 h-3.5 text-purple-400" />
                            <span>Spotify Profile & Settings</span>
                          </button>
                          <button
                            onClick={() => {
                              setIsProfileMenuOpen(false);
                              handleSelectView('history');
                            }}
                            className="w-full py-1.5 px-2.5 text-left rounded-lg hover:bg-white/5 text-neutral-300 flex items-center gap-2 transition-colors"
                          >
                            <Clock className="w-3.5 h-3.5 text-purple-400" />
                            <span>Recently Played ({recentSongs.length})</span>
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
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Guest / Non-Activated Header Buttons */
                <div className="flex items-center gap-2">
                  {guestSecondsRemaining > 0 && (
                    <div
                      onClick={openVipModal}
                      title="Free Pass active. Click to remove sponsor breaks with VIP!"
                      className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold cursor-pointer hover:bg-emerald-500/20 transition"
                    >
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Free Pass: {Math.floor(guestSecondsRemaining / 60)}:{(guestSecondsRemaining % 60).toString().padStart(2, '0')}</span>
                    </div>
                  )}

                  <button
                    onClick={openVipModal}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all hover:scale-105 active:scale-95"
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                    <span>Get VIP</span>
                    <span className="bg-black/30 px-1.5 py-0.5 rounded text-[10px] font-black">₹49</span>
                  </button>

                  <button
                    onClick={openLoginModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all hover:scale-105"
                  >
                    <Key className="w-3.5 h-3.5 text-purple-400" />
                    <span>Log In</span>
                  </button>
                </div>
              )}

              {/* Help & Support Trigger */}
              <button
                onClick={() => setIsHelpOpen(true)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-colors ml-1"
                title="Help & Discord Support"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* View Router */}
          <div className="p-6 flex-1">
            {/* VIEW: HOME (Exact Spotify Dashboard) */}
            {currentView === 'home' && (
              <div className="space-y-8">
                {/* Time-of-day Spotify Greeting */}
                <div>
                  <h1 className="text-3xl font-black text-white tracking-tight">{getGreeting()}</h1>
                </div>

                {/* 1. Top 6 Spotify Quick-Picks Grid */}
                {songs.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {songs.slice(0, 6).map((song) => (
                      <div
                        key={song.id}
                        onClick={() => playSong(song, songs)}
                        className="group flex items-center gap-3 bg-white/5 hover:bg-white/15 rounded-md overflow-hidden cursor-pointer transition-all border border-white/5 shadow-sm pr-3"
                      >
                        <img
                          src={getFullCoverUrl(song.cover_url)}
                          alt={song.title}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/Melody-Logo-512.png';
                          }}
                          className="w-16 h-16 object-cover flex-shrink-0"
                        />
                        <span className="font-bold text-sm truncate flex-1">{song.title}</span>
                        <div className="w-10 h-10 rounded-full bg-[#a855f7] hover:bg-[#9333ea] text-white flex items-center justify-center shadow-xl shadow-purple-900/30 opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all">
                          <Play className="w-5 h-5 fill-white ml-0.5" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. Popular Artists Section (Spotify Circular Avatars) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-white tracking-tight">Popular Artists</h2>
                      <p className="text-xs text-[#b3b3b3] mt-0.5">Explore discographies and top hits</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {/* Sidhu Moose Wala Card */}
                    <div
                      onClick={() => handleSelectView('artist', 'Sidhu Moose Wala')}
                      className="group p-4 bg-[#181818] hover:bg-[#282828] rounded-md transition-all cursor-pointer flex flex-col items-center text-center relative"
                    >
                      <div className="relative w-36 h-36 rounded-full overflow-hidden bg-neutral-800 mb-4 shadow-xl">
                        <img
                          src="/covers/desi-295-mvs26s80.jpg"
                          alt="Sidhu Moose Wala"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/Melody-Logo-512.png';
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 group-hover:brightness-110 transition-all duration-300"
                        />
                      </div>
                      <span className="font-bold text-base text-white truncate w-full flex items-center justify-center gap-1.5">
                        Sidhu Moose Wala
                        <CheckCircle2 className="w-4 h-4 fill-blue-500 text-white" />
                      </span>
                      <span className="text-xs text-[#b3b3b3] mt-1 font-medium">Artist &bull; {sidhuSongs.length} Tracks</span>
                    </div>

                    {/* Yo Yo Honey Singh Card */}
                    <div
                      onClick={() => handleSelectView('artist', 'Yo Yo Honey Singh')}
                      className="group p-4 bg-[#181818] hover:bg-[#282828] rounded-md transition-all cursor-pointer flex flex-col items-center text-center relative"
                    >
                      <div className="relative w-36 h-36 rounded-full overflow-hidden bg-neutral-800 mb-4 shadow-xl">
                        <img
                          src="/covers/desi-desi-kalakaar-mvs2csms.jpg"
                          alt="Yo Yo Honey Singh"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/Melody-Logo-512.png';
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 group-hover:brightness-110 transition-all duration-300"
                        />
                      </div>
                      <span className="font-bold text-base text-white truncate w-full flex items-center justify-center gap-1.5">
                        Yo Yo Honey Singh
                        <CheckCircle2 className="w-4 h-4 fill-blue-500 text-white" />
                      </span>
                      <span className="text-xs text-[#b3b3b3] mt-1 font-medium">Artist &bull; {honeySongs.length} Tracks</span>
                    </div>

                    {/* Ariana Grande Card */}
                    <div
                      onClick={() => handleSelectView('artist', 'Ariana Grande')}
                      className="group p-4 bg-[#181818] hover:bg-[#282828] rounded-md transition-all cursor-pointer flex flex-col items-center text-center relative"
                    >
                      <div className="relative w-36 h-36 rounded-full overflow-hidden bg-neutral-800 mb-4 shadow-xl">
                        <img
                          src="/covers/ariana-positions-mvrzwtf6.jpg"
                          alt="Ariana Grande"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/Melody-Logo-512.png';
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 group-hover:brightness-110 transition-all duration-300"
                        />
                      </div>
                      <span className="font-bold text-base text-white truncate w-full flex items-center justify-center gap-1.5">
                        Ariana Grande
                        <CheckCircle2 className="w-4 h-4 fill-blue-500 text-white" />
                      </span>
                      <span className="text-xs text-[#b3b3b3] mt-1 font-medium">Artist &bull; {arianaSongs.length} Tracks</span>
                    </div>

                    {/* The Weeknd Card */}
                    <div
                      onClick={() => handleSelectView('artist', 'The Weeknd')}
                      className="group p-4 bg-[#181818] hover:bg-[#282828] rounded-md transition-all cursor-pointer flex flex-col items-center text-center relative"
                    >
                      <div className="relative w-36 h-36 rounded-full overflow-hidden bg-neutral-800 mb-4 shadow-xl">
                        <img
                          src="/covers/the-weeknd-avatar.jpg"
                          alt="The Weeknd"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/Melody-Logo-512.png';
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 group-hover:brightness-110 transition-all duration-300"
                        />
                      </div>
                      <span className="font-bold text-base text-white truncate w-full flex items-center justify-center gap-1.5">
                        The Weeknd
                        <CheckCircle2 className="w-4 h-4 fill-blue-500 text-white" />
                      </span>
                      <span className="text-xs text-[#b3b3b3] mt-1 font-medium">Artist &bull; {theWeekndSongs.length} Tracks</span>
                    </div>

                    {/* Lana Del Rey Card */}
                    <div
                      onClick={() => handleSelectView('artist', 'Lana Del Rey')}
                      className="group p-4 bg-[#181818] hover:bg-[#282828] rounded-md transition-all cursor-pointer flex flex-col items-center text-center relative"
                    >
                      <div className="relative w-36 h-36 rounded-full overflow-hidden bg-neutral-800 mb-4 shadow-xl">
                        <img
                          src="/covers/lana-collection.jpg"
                          alt="Lana Del Rey"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/Melody-Logo-512.png';
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 group-hover:brightness-110 transition-all duration-300"
                        />
                      </div>
                      <span className="font-bold text-base text-white truncate w-full flex items-center justify-center gap-1.5">
                        Lana Del Rey
                        <CheckCircle2 className="w-4 h-4 fill-blue-500 text-white" />
                      </span>
                      <span className="text-xs text-[#b3b3b3] mt-1 font-medium">Artist &bull; {lanaSongs.length} Tracks</span>
                    </div>
                  </div>
                </div>

                {/* 3. Sidhu Moose Wala Curated Section */}
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
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Search Results</h2>
                  <span className="text-xs text-[#b3b3b3]">{filteredSongs.length} matches</span>
                </div>

                {/* Artist Matches */}
                {searchQuery && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#b3b3b3]">Artists</h3>
                    <div className="flex flex-wrap gap-4">
                      {['Sidhu Moose Wala', 'Yo Yo Honey Singh', 'Ariana Grande', 'The Weeknd', 'Lana Del Rey']
                        .filter((a) => a.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((artistName) => (
                          <div
                            key={artistName}
                            onClick={() => handleSelectView('artist', artistName)}
                            className="flex items-center gap-3 p-3 bg-[#181818] hover:bg-[#282828] rounded-md cursor-pointer transition-all"
                          >
                            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white">
                              {artistName[0]}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-white">{artistName}</div>
                              <div className="text-xs text-[#b3b3b3]">Artist</div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Songs Table Header */}
                <div className="grid grid-cols-[36px_1fr_1fr_80px] px-3.5 py-2 border-b border-white/10 text-xs font-semibold text-[#b3b3b3] uppercase tracking-wider">
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
                  <div className="py-16 text-center text-[#b3b3b3]">
                    No songs found matching "{searchQuery}".
                  </div>
                )}
              </div>
            )}

            {/* VIEW: LIKED SONGS */}
            {currentView === 'favourites' && (
              <div className="space-y-6">
                <div className="flex items-end gap-6 bg-gradient-to-t from-transparent to-blue-900/30 p-8 rounded-xl border border-white/5">
                  <div className="w-44 h-44 rounded-md bg-gradient-to-br from-indigo-600 to-blue-500 flex items-center justify-center shadow-2xl">
                    <Heart className="w-20 h-20 fill-white text-white" />
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs uppercase font-extrabold tracking-widest text-blue-400">Playlist</span>
                    <h1 className="text-5xl font-black text-white">Liked Songs</h1>
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
                    <div className="py-12 text-center text-[#b3b3b3]">
                      No liked songs yet. Tap the heart icon on any song!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW: DOWNLOADED (SAVED ON THIS DEVICE FOR OFFLINE PLAY) */}
            {currentView === 'downloaded' && (
              <div className="space-y-6">
                <div className="flex items-end gap-6 p-8 rounded-xl bg-gradient-to-r from-purple-950/40 via-purple-900/20 to-transparent border border-purple-500/20 shadow-xl">
                  <div className="w-40 h-40 rounded-xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-900 flex items-center justify-center shadow-2xl shadow-purple-900/50 flex-shrink-0">
                    <ArrowDownCircle className="w-20 h-20 text-white" />
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs uppercase font-extrabold tracking-widest text-purple-400">Local Device Storage</span>
                    <h1 className="text-4xl md:text-5xl font-black text-white">Downloaded</h1>
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
                    <div className="py-16 text-center text-[#b3b3b3] space-y-2">
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
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 p-8 rounded-2xl bg-gradient-to-r from-purple-900/40 via-neutral-900/40 to-neutral-900/20 border border-white/5 shadow-2xl">
                  <div className="w-44 h-44 rounded-xl bg-gradient-to-br from-purple-700 via-indigo-800 to-neutral-900 flex items-center justify-center shadow-2xl shadow-purple-950/50 flex-shrink-0 border border-white/10">
                    <Disc className="w-20 h-20 text-purple-300" />
                  </div>
                  <div className="space-y-3 flex-1 min-w-0">
                    <span className="text-xs uppercase font-extrabold tracking-widest text-purple-400">Public Playlist</span>
                    <h1 className="text-4xl sm:text-5xl font-black text-white truncate">{selectedPlaylist.name}</h1>
                    <p className="text-xs text-neutral-400">
                      Created by you • {playlistSongs.length} songs • Synced with PostgreSQL Database
                    </p>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={() => {
                          if (playlistSongs.length > 0) {
                            playSong(playlistSongs[0], playlistSongs);
                          }
                        }}
                        disabled={playlistSongs.length === 0}
                        className="flex items-center gap-2 px-6 py-3 rounded-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition-all hover:scale-105"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>Play</span>
                      </button>

                      <button
                        onClick={() => handleDeletePlaylist(selectedPlaylist.id)}
                        className="px-4 py-2.5 rounded-full bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-neutral-400 hover:text-red-400 text-xs font-semibold transition-colors"
                      >
                        Delete Playlist
                      </button>
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
                  {playlistSongs.length === 0 && (
                    <div className="py-16 text-center text-neutral-400 space-y-2">
                      <Disc className="w-12 h-12 mx-auto text-purple-400/40" />
                      <p className="text-sm font-medium">This playlist is currently empty.</p>
                      <p className="text-xs text-neutral-500">Click the '+' button on any track in your library to add it here!</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Persistent Bottom Spotify-Style Player */}
      <PlayerBar onSelectArtist={(artist) => handleSelectView('artist', artist)} />

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

      {/* Google Ads Interstitial & Listening Gate Modal */}
      <AdModal
        isOpen={isAdOpen}
        reason={adReason}
        onAdCompleted={handleAdCompleted}
        onOpenUpgrade={openVipModal}
      />
    </div>
  );
};
