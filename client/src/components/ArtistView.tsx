import React, { useState } from 'react';
import { Play, Pause, Heart, CheckCircle2, Clock, Check, Download, Loader2 } from 'lucide-react';
import { Song } from '../types';
import { usePlayer } from '../context/PlayerContext';
import { getFullCoverUrl } from '../services/api';

interface ArtistViewProps {
  artistName: string;
  songs: Song[];
  onBack?: () => void;
}

const ARTIST_METADATA: Record<string, { banner: string; avatar: string; listeners: string; bio: string; rank: string }> = {
  'The Weeknd': {
    banner: 'linear-gradient(180deg, rgba(140, 40, 160, 0.7) 0%, rgba(18, 18, 18, 1) 100%)',
    avatar: '/covers/the-weeknd-avatar.jpg',
    listeners: '108,412,891',
    bio: 'Abel Makkonen Tesfaye, known professionally as The Weeknd, is a Canadian singer, songwriter, and record producer known for his sonic versatility and dark lyricism.',
    rank: '#1 in the world',
  },
  'Lana Del Rey': {
    banner: 'linear-gradient(180deg, rgba(110, 60, 150, 0.7) 0%, rgba(18, 18, 18, 1) 100%)',
    avatar: '/covers/lana-collection.jpg',
    listeners: '62,941,200',
    bio: 'Elizabeth Woolridge Grant, known professionally as Lana Del Rey, is an American singer-songwriter recognized for her cinematic glamour and melancholic romance.',
    rank: '#18 in the world',
  },
  'Ariana Grande': {
    banner: 'linear-gradient(180deg, rgba(160, 80, 180, 0.7) 0%, rgba(18, 18, 18, 1) 100%)',
    avatar: '/Melody-Logo-512.png',
    listeners: '94,182,310',
    bio: 'Ariana Grande-Butera is an American singer, songwriter, and actress celebrated for her four-octave vocal range and iconic pop and R&B hits.',
    rank: '#3 in the world',
  },
  'Sidhu Moose Wala': {
    banner: 'linear-gradient(180deg, rgba(180, 70, 70, 0.7) 0%, rgba(18, 18, 18, 1) 100%)',
    avatar: '/Melody-Logo-512.png',
    listeners: '21,500,400',
    bio: 'Shubhdeep Singh Sidhu, known as Sidhu Moose Wala, was an iconic Punjabi singer, rapper, and songwriter whose fearless style revolutionized Punjabi music globally.',
    rank: '#1 in Punjabi Music',
  },
  'Yo Yo Honey Singh': {
    banner: 'linear-gradient(180deg, rgba(190, 120, 40, 0.7) 0%, rgba(18, 18, 18, 1) 100%)',
    avatar: '/Melody-Logo-512.png',
    listeners: '18,920,000',
    bio: 'Hirdesh Singh, known as Yo Yo Honey Singh, is an Indian music producer, rapper, and pop singer who pioneered the modern Indian hip-hop and pop era.',
    rank: '#1 in Desi Pop',
  },
};

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const ArtistView: React.FC<ArtistViewProps> = ({ artistName, songs }) => {
  const {
    currentSong,
    isPlaying,
    playSong,
    togglePlay,
    favourites,
    toggleFavourite,
    downloadedSongIds,
    downloadProgress,
    downloadSong,
    removeDownload,
    downloadPlaylist,
  } = usePlayer();

  const [isFollowing, setIsFollowing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  const artistSongs = songs.filter(
    (s) => s.artist.toLowerCase().includes(artistName.toLowerCase()) || artistName.toLowerCase().includes(s.artist.toLowerCase())
  );

  const meta = ARTIST_METADATA[artistName] || {
    banner: 'linear-gradient(180deg, rgba(88, 28, 135, 0.7) 0%, rgba(18, 18, 18, 1) 100%)',
    avatar: '/Melody-Logo-512.png',
    listeners: '4,520,100',
    bio: `${artistName} is featured on Melody Studio Streaming.`,
    rank: 'Featured Artist',
  };

  const isCurrentArtistPlaying = currentSong && artistSongs.some((s) => s.id === currentSong.id) && isPlaying;

  const handlePlayArtist = () => {
    if (isCurrentArtistPlaying) {
      togglePlay();
    } else if (artistSongs.length > 0) {
      playSong(artistSongs[0], artistSongs);
    }
  };

  const handleDownloadAll = async () => {
    setIsDownloadingAll(true);
    await downloadPlaylist(artistSongs);
    setIsDownloadingAll(false);
  };

  const visibleSongs = showAll ? artistSongs : artistSongs.slice(0, 5);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16 select-none">
      {/* 1. Header Hero Banner */}
      <div
        className="relative -mx-6 -mt-6 p-8 md:p-12 min-h-[300px] flex flex-col justify-end overflow-hidden"
        style={{ background: meta.banner }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-black/30 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end gap-6">
          <img
            src={meta.avatar}
            alt={artistName}
            className="w-32 h-32 md:w-44 md:h-44 rounded-full object-cover shadow-2xl border-4 border-white/10 flex-shrink-0"
          />

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-white/90">
              <CheckCircle2 className="w-4 h-4 fill-blue-500 text-white" />
              Verified Artist
            </div>

            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight">
              {artistName}
            </h1>

            <p className="text-xs md:text-sm text-neutral-300 font-medium">
              {meta.listeners} monthly listeners &bull; <span className="text-[#a855f7] font-bold">{meta.rank}</span>
            </p>
          </div>
        </div>
      </div>

      {/* 2. Action Bar */}
      <div className="flex items-center gap-4 pt-2">
        {/* Purple Big Play Button */}
        <button
          onClick={handlePlayArtist}
          disabled={artistSongs.length === 0}
          className="w-14 h-14 rounded-full bg-[#a855f7] hover:bg-[#9333ea] hover:scale-105 active:scale-95 text-white flex items-center justify-center shadow-2xl shadow-purple-900/40 transition-all disabled:opacity-40"
          title={isCurrentArtistPlaying ? 'Pause' : 'Play'}
        >
          {isCurrentArtistPlaying ? (
            <Pause className="w-6 h-6 fill-white text-white" />
          ) : (
            <Play className="w-6 h-6 fill-white text-white ml-1" />
          )}
        </button>

        {/* Follow Button */}
        <button
          onClick={() => setIsFollowing(!isFollowing)}
          className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${
            isFollowing
              ? 'border-white text-white bg-white/10'
              : 'border-white/30 text-white hover:border-white hover:scale-105'
          }`}
        >
          {isFollowing ? (
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Following
            </span>
          ) : (
            'Follow'
          )}
        </button>

        {/* Download All to Local Device */}
        <button
          onClick={handleDownloadAll}
          disabled={isDownloadingAll}
          className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border border-white/20 hover:border-white text-[#b3b3b3] hover:text-white flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-50"
          title="Download entire artist collection to this device"
        >
          {isDownloadingAll ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#a855f7]" />
              Downloading...
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5 text-[#a855f7]" />
              Save All Offline
            </>
          )}
        </button>
      </div>

      {/* 3. Popular Tracks Table */}
      <div className="space-y-4">
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Popular</h2>

        {/* Table Header */}
        <div className="grid grid-cols-[36px_1fr_1fr_60px] md:grid-cols-[40px_4fr_3fr_1fr_100px] px-4 py-2 border-b border-white/10 text-xs font-semibold text-[#b3b3b3] uppercase tracking-wider">
          <span className="text-center">#</span>
          <span>Title</span>
          <span className="hidden md:block">Album</span>
          <span className="hidden md:block text-right">Plays</span>
          <span className="text-right flex items-center justify-end">
            <Clock className="w-4 h-4" />
          </span>
        </div>

        {/* Track Rows */}
        <div className="space-y-1">
          {visibleSongs.map((song, idx) => {
            const isSongCurrent = currentSong?.id === song.id;
            const isLiked = favourites.has(song.id);
            const isDownloaded = downloadedSongIds.has(song.id);
            const progress = downloadProgress[song.id];

            // Realistic formatted fake play count
            const fakePlays = ((idx + 1) * 38472910 + (song.id * 148293)).toLocaleString();

            return (
              <div
                key={song.id}
                onClick={() => {
                  if (isSongCurrent) {
                    togglePlay();
                  } else {
                    playSong(song, artistSongs);
                  }
                }}
                className={`group grid grid-cols-[36px_1fr_1fr_60px] md:grid-cols-[40px_4fr_3fr_1fr_100px] items-center px-4 py-2.5 rounded-lg cursor-pointer transition-colors ${
                  isSongCurrent ? 'bg-white/15' : 'hover:bg-white/10'
                }`}
              >
                {/* Index / Play Icon / Equalizer */}
                <div className="flex items-center justify-center text-xs font-mono text-[#b3b3b3]">
                  {isSongCurrent && isPlaying ? (
                    <span className="flex items-end gap-0.5 h-3">
                      <span className="w-0.5 h-full bg-[#a855f7] animate-pulse"></span>
                      <span className="w-0.5 h-2/3 bg-[#a855f7] animate-pulse delay-75"></span>
                      <span className="w-0.5 h-4/5 bg-[#a855f7] animate-pulse delay-150"></span>
                    </span>
                  ) : (
                    <span className={`group-hover:hidden ${isSongCurrent ? 'text-[#a855f7] font-bold' : ''}`}>
                      {idx + 1}
                    </span>
                  )}
                  <span className="hidden group-hover:block text-white">
                    {isSongCurrent && isPlaying ? (
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current" />
                    )}
                  </span>
                </div>

                {/* Title & Cover */}
                <div className="flex items-center gap-3.5 min-w-0 pr-4">
                  <img
                    src={getFullCoverUrl(song.cover_url)}
                    alt={song.title}
                    className="w-10 h-10 rounded object-cover shadow-md flex-shrink-0"
                  />
                  <div className="flex flex-col truncate">
                    <span
                      className={`text-sm font-semibold truncate ${
                        isSongCurrent ? 'text-[#a855f7]' : 'text-white'
                      }`}
                    >
                      {song.title}
                    </span>
                    <span className="text-xs text-[#b3b3b3] truncate">{song.artist}</span>
                  </div>
                </div>

                {/* Album */}
                <div className="hidden md:block text-xs text-[#b3b3b3] truncate font-medium pr-4">
                  {song.album || 'Single'}
                </div>

                {/* Play Count */}
                <div className="hidden md:block text-xs font-mono text-[#b3b3b3] text-right">
                  {fakePlays}
                </div>

                {/* Actions: Download, Like & Duration */}
                <div className="flex items-center justify-end gap-3">
                  {/* Download Offline Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isDownloaded) {
                        removeDownload(song.id);
                      } else if (progress === undefined) {
                        downloadSong(song);
                      }
                    }}
                    className="p-1 transition-all rounded-full hover:scale-105"
                    title={
                      isDownloaded
                        ? 'Downloaded to this device (Click to remove)'
                        : progress !== undefined
                        ? `Downloading ${progress}%`
                        : 'Download for offline play'
                    }
                  >
                    {progress !== undefined ? (
                      <div className="flex items-center gap-1">
                        <Loader2 className="w-3.5 h-3.5 text-[#a855f7] animate-spin" />
                      </div>
                    ) : isDownloaded ? (
                      <div className="w-4 h-4 rounded-full bg-[#a855f7] text-black flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3] text-white" />
                      </div>
                    ) : (
                      <Download className="w-3.5 h-3.5 text-neutral-400 opacity-0 group-hover:opacity-100 hover:text-white transition-opacity" />
                    )}
                  </button>

                  {/* Like Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavourite(song);
                    }}
                    className="p-1 text-neutral-400 hover:text-white transition-colors"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        isLiked ? 'fill-[#a855f7] text-[#a855f7]' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    />
                  </button>
                  <span className="text-xs font-mono text-[#b3b3b3]">
                    {formatDuration(song.duration_seconds)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* See More / See Less Button */}
        {artistSongs.length > 5 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-bold uppercase tracking-wider text-[#b3b3b3] hover:text-white px-4 py-2 transition-colors"
          >
            {showAll ? 'Show Less' : `See More (${artistSongs.length} tracks)`}
          </button>
        )}
      </div>

      {/* 4. Discography Section */}
      <div className="space-y-4 pt-4">
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Discography</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {artistSongs.slice(0, 10).map((song) => (
            <div
              key={song.id}
              onClick={() => playSong(song, artistSongs)}
              className="group p-3.5 bg-[#181818] hover:bg-[#282828] rounded-md transition-all duration-300 cursor-pointer flex flex-col"
            >
              <div className="relative aspect-square w-full rounded-md overflow-hidden bg-neutral-900 mb-3 shadow-lg">
                <img
                  src={getFullCoverUrl(song.cover_url)}
                  alt={song.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute bottom-2 right-2 w-11 h-11 rounded-full bg-[#a855f7] hover:bg-[#9333ea] text-white flex items-center justify-center shadow-xl opacity-0 scale-90 translate-y-2 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 transition-all">
                  <Play className="w-5 h-5 fill-white ml-0.5" />
                </div>
              </div>
              <span className="text-sm font-bold text-white truncate">{song.title}</span>
              <span className="text-xs text-[#b3b3b3] truncate mt-1">2024 &bull; Single</span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. About Section */}
      <div className="space-y-4 pt-4">
        <h2 className="text-2xl font-extrabold text-white tracking-tight">About</h2>
        <div className="p-6 bg-[#181818] rounded-xl border border-white/5 space-y-4 max-w-2xl">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-neutral-800 overflow-hidden shadow-md flex items-center justify-center text-2xl font-bold text-white">
              {artistName.slice(0, 1)}
            </div>
            <div>
              <div className="text-lg font-bold text-white">{artistName}</div>
              <div className="text-xs text-[#a855f7] font-bold">{meta.listeners} monthly listeners</div>
            </div>
          </div>
          <p className="text-sm text-[#b3b3b3] leading-relaxed">{meta.bio}</p>
        </div>
      </div>
    </div>
  );
};
