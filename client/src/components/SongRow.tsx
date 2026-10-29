import React from 'react';
import { Play, Pause, Heart, Download, Check, Loader2, ListPlus, Trash2 } from 'lucide-react';
import { Song } from '../types';
import { usePlayer } from '../context/PlayerContext';
import { getFullCoverUrl } from '../services/api';

interface SongRowProps {
  index: number;
  song: Song;
  queueContext?: Song[];
  onSelectArtist?: (artist: string) => void;
  onAddToPlaylist?: (song: Song) => void;
  onRemoveFromPlaylist?: (song: Song) => void;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const SongRow: React.FC<SongRowProps> = ({
  index,
  song,
  queueContext,
  onSelectArtist,
  onAddToPlaylist,
  onRemoveFromPlaylist,
}) => {
  const {
    currentSong,
    isPlaying,
    isLoadingTrack,
    playSong,
    togglePlay,
    favourites,
    toggleFavourite,
    downloadedSongIds,
    downloadProgress,
    downloadSong,
    removeDownload,
  } = usePlayer();

  const isCurrent = currentSong?.id === song.id;
  const isLiked = favourites.has(song.id);
  const isDownloaded = downloadedSongIds.has(song.id);
  const progress = downloadProgress[song.id];

  const handleRowClick = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playSong(song, queueContext);
    }
  };

  const handleToggleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloaded) {
      removeDownload(song.id);
    } else if (progress === undefined) {
      downloadSong(song);
    }
  };

  return (
    <div
      onClick={handleRowClick}
      className={`group flex items-center justify-between px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-md cursor-pointer transition-colors ${
        isCurrent ? 'bg-white/10' : 'hover:bg-white/5'
      }`}
    >
      <div className="flex items-center gap-2.5 sm:gap-3.5 flex-1 min-w-0">
        {/* Track # or Play Button or Loading Spinner or Animated Purple Equalizer */}
        <div className="w-6 flex items-center justify-center text-xs font-mono text-[#b3b3b3]">
          {isCurrent && isLoadingTrack ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#a855f7]" />
          ) : isCurrent && isPlaying ? (
            <span className="flex items-end gap-0.5 h-3">
              <span className="w-0.5 h-full bg-[#a855f7] animate-pulse"></span>
              <span className="w-0.5 h-2/3 bg-[#a855f7] animate-pulse delay-75"></span>
              <span className="w-0.5 h-4/5 bg-[#a855f7] animate-pulse delay-150"></span>
            </span>
          ) : (
            <span className={`group-hover:hidden ${isCurrent ? 'text-[#a855f7] font-bold' : ''}`}>
              {index + 1}
            </span>
          )}
          <span className="hidden group-hover:block text-white">
            {isCurrent && isLoadingTrack ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : isCurrent && isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
          </span>
        </div>

        {/* Thumbnail & Track Info */}
        <img
          src={getFullCoverUrl(song.cover_url)}
          alt={song.title}
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/Melody-Logo-512.png';
          }}
          className="w-10 h-10 rounded object-cover shadow-sm flex-shrink-0"
        />

        <div className="flex flex-col truncate pr-2">
          <span className={`text-sm font-semibold truncate ${isCurrent ? 'text-[#a855f7]' : 'text-white'}`}>
            {song.title}
          </span>
          <span
            onClick={(e) => {
              if (onSelectArtist) {
                e.stopPropagation();
                onSelectArtist(song.artist);
              }
            }}
            className="text-xs text-[#b3b3b3] truncate hover:text-white hover:underline cursor-pointer"
          >
            {song.artist}
          </span>
        </div>
      </div>

      {/* Album Name */}
      <div className="hidden md:block w-1/4 truncate text-xs text-[#b3b3b3] font-medium pr-4">
        {song.album || 'Single'}
      </div>

      {/* Actions: Download Offline, Heart Like, & Duration */}
      <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
        {/* Offline Download Button */}
        <button
          onClick={handleToggleDownload}
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
              <span className="text-[10px] font-mono text-[#a855f7]">{progress}%</span>
            </div>
          ) : isDownloaded ? (
            <div className="w-5 h-5 rounded-full bg-[#a855f7] text-black flex items-center justify-center shadow-sm">
              <Check className="w-3 h-3 stroke-[3] text-white" />
            </div>
          ) : (
            <Download className="w-4 h-4 text-neutral-400 opacity-70 sm:opacity-0 group-hover:opacity-100 hover:text-white transition-opacity" />
          )}
        </button>

        {/* User-Scoped Heart Like Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavourite(song);
          }}
          className="p-1 text-neutral-400 hover:text-white transition-colors"
          title={isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
        >
          <Heart
            className={`w-4 h-4 ${
              isLiked ? 'fill-[#a855f7] text-[#a855f7]' : 'opacity-70 sm:opacity-0 group-hover:opacity-100'
            }`}
          />
        </button>

        {/* Add to Custom Playlist Button */}
        {onAddToPlaylist && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToPlaylist(song);
            }}
            className="p-1 text-neutral-400 hover:text-white transition-colors opacity-70 sm:opacity-0 group-hover:opacity-100"
            title="Add to Playlist"
          >
            <ListPlus className="w-4 h-4" />
          </button>
        )}

        {/* Remove from Playlist Button (if inside custom playlist) */}
        {onRemoveFromPlaylist && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemoveFromPlaylist(song);
            }}
            className="p-1 text-neutral-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
            title="Remove from this Playlist"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        <span className="text-xs font-mono text-[#b3b3b3] w-10 text-right">
          {formatDuration(song.duration_seconds)}
        </span>
      </div>
    </div>
  );
};
