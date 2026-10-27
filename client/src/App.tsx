import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { PlayerBar } from './components/PlayerBar';
import { SongCard } from './components/SongCard';
import { SongRow } from './components/SongRow';
import { ActivationModal } from './components/ActivationModal';
import { DeviceModal } from './components/DeviceModal';
import { usePlayer } from './context/PlayerContext';
import { fetchSongs, fetchPlaylists, fetchRecentlyPlayed, fetchFavourites, createPlaylist, fetchPlaylistSongs } from './services/api';
import { Song, Playlist, ActiveDevice } from './types';
import { Search, Heart, Clock, Music, Disc, Play } from 'lucide-react';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<string>('home');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<Song[]>([]);

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

  const { playSong } = usePlayer();

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    setLoading(true);
    const [fetchedSongs, fetchedPlaylists, fetchedRecent, fetchedFavs] = await Promise.all([
      fetchSongs('', '', 50),
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

  const handleSelectView = async (view: string, data?: any) => {
    setCurrentView(view);
    if (view === 'playlist' && data) {
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

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0f0f13] text-white">
      {/* Upper Area: Sidebar + Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentView={currentView}
          onSelectView={handleSelectView}
          playlists={playlists}
          onCreatePlaylist={handleCreatePlaylist}
          onOpenActivation={() => setIsActivationOpen(true)}
          onOpenDevices={() => setIsDevicesOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-gradient-to-b from-[#181824] via-[#0f0f13] to-[#0f0f13]">
          {/* Top Sticky Header */}
          <header className="sticky top-0 z-20 h-16 bg-[#121218]/80 backdrop-blur-md px-6 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-4 flex-1 max-w-md">
              {currentView === 'search' ? (
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search songs, artists, or albums..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#1b1b26] border border-white/10 rounded-full pl-10 pr-4 py-2 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-blue-500 transition-colors"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="text-sm font-semibold text-neutral-400">
                  Welcome to <span className="text-white font-bold">Melody</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Clean header space */}
            </div>
          </header>

          {/* View Router */}
          <div className="p-6 flex-1">
            {/* VIEW: HOME */}
            {currentView === 'home' && (
              <div className="space-y-8">
                {/* Greeting Hero */}
                <div>
                  <h1 className="text-3xl font-extrabold text-white tracking-tight">Good evening</h1>
                  <p className="text-sm text-neutral-400 mt-1">High-fidelity studio audio streaming from Telegram</p>
                </div>

                {/* Quick Access Grid (Spotify-style) */}
                {songs.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {songs.slice(0, 6).map((song) => (
                      <div
                        key={song.id}
                        onClick={() => playSong(song, songs)}
                        className="group flex items-center gap-3 bg-[#181822] hover:bg-[#252535] rounded-lg overflow-hidden cursor-pointer transition-all border border-white/5 shadow-sm pr-3"
                      >
                        <img
                          src={song.cover_url || '/Melody-Logo-192.png'}
                          alt={song.title}
                          className="w-16 h-16 object-cover flex-shrink-0"
                        />
                        <span className="font-bold text-sm truncate flex-1">{song.title}</span>
                        <div className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all">
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Language Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {['', 'english', 'hindi', 'tamil', 'telugu', 'punjabi'].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setSelectedLanguage(lang)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
                        selectedLanguage === lang
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                          : 'bg-[#1a1a26] text-neutral-400 hover:text-white hover:bg-[#222232]'
                      }`}
                    >
                      {lang === '' ? 'All Tracks' : lang}
                    </button>
                  ))}
                </div>

                {/* Main Song Grid */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white tracking-tight">Featured Tracks</h2>
                    <span className="text-xs text-neutral-400 font-medium">{filteredSongs.length} available</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filteredSongs.map((song) => (
                      <SongCard key={song.id} song={song} queueContext={filteredSongs} />
                    ))}
                  </div>

                  {filteredSongs.length === 0 && !loading && (
                    <div className="py-16 text-center text-neutral-500 flex flex-col items-center gap-2">
                      <Music className="w-10 h-10 opacity-40 text-blue-400" />
                      <p className="text-sm font-semibold">No tracks found.</p>
                      <p className="text-xs text-neutral-400">New tracks will appear here once added to the library.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW: SEARCH */}
            {currentView === 'search' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Search Results</h2>
                  <span className="text-xs text-neutral-400">{filteredSongs.length} matches</span>
                </div>

                <div className="space-y-1">
                  {filteredSongs.map((song, i) => (
                    <SongRow key={song.id} index={i} song={song} queueContext={filteredSongs} />
                  ))}
                </div>

                {filteredSongs.length === 0 && (
                  <div className="py-16 text-center text-neutral-500">
                    No songs found matching "{searchQuery}".
                  </div>
                )}
              </div>
            )}

            {/* VIEW: LIKED SONGS */}
            {currentView === 'favourites' && (
              <div className="space-y-6">
                <div className="flex items-end gap-5 bg-gradient-to-t from-transparent to-blue-900/20 p-6 rounded-2xl border border-blue-500/10">
                  <div className="w-36 h-36 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-500 flex items-center justify-center shadow-2xl">
                    <Heart className="w-16 h-16 fill-white text-white" />
                  </div>
                  <div>
                    <span className="text-xs uppercase font-extrabold tracking-widest text-blue-400">Playlist</span>
                    <h1 className="text-4xl font-extrabold text-white mt-1">Liked Songs</h1>
                    <p className="text-xs text-neutral-400 mt-2">{likedSongsList.length} favourite tracks</p>
                  </div>
                </div>

                <div className="space-y-1">
                  {likedSongsList.map((song, i) => (
                    <SongRow key={song.id} index={i} song={song} queueContext={likedSongsList} />
                  ))}
                  {likedSongsList.length === 0 && (
                    <div className="py-12 text-center text-neutral-500">
                      No liked songs yet. Tap the heart icon on any song!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW: RECENTLY PLAYED */}
            {currentView === 'history' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6 text-blue-400" />
                  <h2 className="text-2xl font-bold text-white">Recently Played History</h2>
                </div>

                <div className="space-y-1">
                  {recentSongs.map((song, i) => (
                    <SongRow key={song.id} index={i} song={song} queueContext={recentSongs} />
                  ))}
                  {recentSongs.length === 0 && (
                    <div className="py-12 text-center text-neutral-500">
                      No listening history yet. Start playing your favorite tracks!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW: CUSTOM PLAYLIST */}
            {currentView === 'playlist' && selectedPlaylist && (
              <div className="space-y-6">
                <div className="flex items-end gap-5 p-6 rounded-2xl bg-white/5 border border-white/5">
                  <div className="w-36 h-36 rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center shadow-xl">
                    <Disc className="w-16 h-16 text-blue-400" />
                  </div>
                  <div>
                    <span className="text-xs uppercase font-extrabold tracking-widest text-neutral-400">Playlist</span>
                    <h1 className="text-4xl font-extrabold text-white mt-1">{selectedPlaylist.name}</h1>
                    <p className="text-xs text-neutral-400 mt-2">{playlistSongs.length} tracks</p>
                  </div>
                </div>

                <div className="space-y-1">
                  {playlistSongs.map((song, i) => (
                    <SongRow key={song.id} index={i} song={song} queueContext={playlistSongs} />
                  ))}
                  {playlistSongs.length === 0 && (
                    <div className="py-12 text-center text-neutral-500">
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
      <PlayerBar />

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
    </div>
  );
};
