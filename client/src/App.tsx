import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { PlayerBar } from './components/PlayerBar';
import { SongCard } from './components/SongCard';
import { SongRow } from './components/SongRow';
import { ArtistView } from './components/ArtistView';
import { ActivationModal } from './components/ActivationModal';
import { DeviceModal } from './components/DeviceModal';
import { EqualizerModal } from './components/EqualizerModal';
import { NowPlayingView } from './components/NowPlayingView';
import { usePlayer } from './context/PlayerContext';
import {
  fetchSongs,
  fetchPlaylists,
  fetchRecentlyPlayed,
  fetchFavourites,
  createPlaylist,
  fetchPlaylistSongs,
} from './services/api';
import { Song, Playlist, ActiveDevice } from './types';
import { Search, Heart, Clock, Music, Disc, Play, ChevronLeft, ChevronRight, CheckCircle2, ArrowDownCircle } from 'lucide-react';

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

  // Modals
  const [isActivationOpen, setIsActivationOpen] = useState(false);
  const [isDevicesOpen, setIsDevicesOpen] = useState(false);
  const [deviceLimitDevices, setDeviceLimitDevices] = useState<ActiveDevice[]>([]);

  const { playSong, offlineTracks } = usePlayer();
  const offlineTracksTotalMb = (offlineTracks.reduce((acc, t) => acc + (t.fileSize || 0), 0) / (1024 * 1024)).toFixed(1);

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    setLoading(true);
    const [fetchedSongs, fetchedPlaylists, fetchedRecent, fetchedFavs] = await Promise.all([
      fetchSongs('', '', 100),
      fetchPlaylists(),
      fetchRecentlyPlayed(),
      fetchFavourites(),
    ]);

    setSongs(fetchedSongs);
    setPlaylists(fetchedPlaylists);
    setRecentSongs(fetchedRecent);
    setLikedSongsList(fetchedFavs);
    setLoading(false);
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

  const filteredSongs = songs.filter((s) => {
    const matchesSearch =
      !searchQuery ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.album && s.album.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesLang = !selectedLanguage || s.language?.toLowerCase() === selectedLanguage.toLowerCase();
    return matchesSearch && matchesLang;
  });

  const theWeekndSongs = songs.filter((s) => s.artist.toLowerCase().includes('weeknd'));
  const lanaSongs = songs.filter((s) => s.artist.toLowerCase().includes('lana'));

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
          onOpenActivation={() => setIsActivationOpen(true)}
          onOpenDevices={() => setIsDevicesOpen(true)}
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

            {/* Right Header: Spotify Profile Avatar */}
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full bg-[#242424] hover:bg-[#2e2e2e] border border-white/10 flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
                title="Profile"
              >
                <span className="text-xs font-bold text-white">M</span>
              </div>
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
                          src={song.cover_url || '/Melody-Logo-192.png'}
                          alt={song.title}
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
                    {/* The Weeknd Card */}
                    <div
                      onClick={() => handleSelectView('artist', 'The Weeknd')}
                      className="group p-4 bg-[#181818] hover:bg-[#282828] rounded-md transition-all cursor-pointer flex flex-col items-center text-center relative"
                    >
                      <div className="relative w-36 h-36 rounded-full overflow-hidden bg-neutral-800 mb-4 shadow-xl">
                        <img
                          src="/covers/the-weeknd-avatar.jpg"
                          alt="The Weeknd"
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

                {/* 3. The Weeknd Curated Carousel */}
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
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Lana Del Rey Curated Carousel */}
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
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Complete Featured Catalog Grid */}
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
                    <div className="flex gap-4">
                      {['The Weeknd', 'Lana Del Rey'].filter((a) =>
                        a.toLowerCase().includes(searchQuery.toLowerCase())
                      ).map((artistName) => (
                        <div
                          key={artistName}
                          onClick={() => handleSelectView('artist', artistName)}
                          className="flex items-center gap-3 p-3 bg-[#181818] hover:bg-[#282828] rounded-md cursor-pointer transition-all"
                        >
                          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white">
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
                <div className="flex items-end gap-6 p-8 rounded-xl bg-white/5 border border-white/5">
                  <div className="w-44 h-44 rounded-md bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center shadow-xl">
                    <Disc className="w-20 h-20 text-blue-400" />
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs uppercase font-extrabold tracking-widest text-[#b3b3b3]">Playlist</span>
                    <h1 className="text-5xl font-black text-white">{selectedPlaylist.name}</h1>
                    <p className="text-xs text-[#b3b3b3]">{playlistSongs.length} tracks</p>
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
                    />
                  ))}
                  {playlistSongs.length === 0 && (
                    <div className="py-12 text-center text-[#b3b3b3]">
                      This playlist is empty. Add songs from your library!
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
        onClose={() => setIsActivationOpen(false)}
        onActivated={() => {
          loadCatalog();
        }}
        onDeviceLimitReached={(devs) => {
          setDeviceLimitDevices(devs);
          setIsDevicesOpen(true);
        }}
      />

      <DeviceModal
        isOpen={isDevicesOpen}
        onClose={() => setIsDevicesOpen(false)}
        devicesList={deviceLimitDevices}
        onSlotFreed={() => {
          setIsActivationOpen(true);
        }}
      />

      {/* Spotify Equalizer Modal */}
      <EqualizerModal />

      {/* Immersive Now Playing Animated Theme View */}
      <NowPlayingView />
    </div>
  );
};
