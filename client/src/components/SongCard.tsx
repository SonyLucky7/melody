import React from 'react';
import { Play, Pause, Download, Check, Loader2 } from 'lucide-react';
import { Song } from '../types';
import { usePlayer } from '../context/PlayerContext';
import { getFullCoverUrl } from '../services/api';

interface SongCardProps {
  song: Song;
  queueContext?: Song[];
  onSelectArtist?: (artist: string) => void;
}

export const SongCard: React.FC<SongCardProps> = ({ song, queueContext, onSelectArtist }) => {
  const {
    currentSong,
    isPlaying,
    playSong,
    togglePlay,
    downloadedSongIds,
    downloadProgress,
    downloadSong,
    removeDownload,
  } = usePlayer();

  const isCurrent = currentSong?.id === song.id;
  const isDownloaded = downloadedSongIds.has(song.id);
  const progress = downloadProgress[song.id];

  const handleCardClick = () => {
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
      onClick={handleCardClick}
      className="group relative p-3.5 bg-[#181818] hover:bg-[#282828] rounded-md transition-all duration-300 cursor-pointer shadow-md flex flex-col"
    >
      <div className="relative aspect-square w-full rounded-md overflow-hidden bg-[#242424] mb-3 shadow-lg">
        <img
          src={getFullCoverUrl(song.cover_url)}
          alt={song.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Floating Melody Purple Play Button */}
        <div
          className={`absolute bottom-2 right-2 w-11 h-11 rounded-full bg-[#a855f7] hover:bg-[#9333ea] active:scale-95 text-white flex items-center justify-center shadow-2xl shadow-purple-950/60 transition-all duration-300 ${
            isCurrent
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-90 translate-y-2 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0'
          }`}
        >
          {isCurrent && isPlaying ? (
            <Pause className="w-5 h-5 fill-white ml-0" />
          ) : (
            <Play className="w-5 h-5 fill-white ml-0.5" />
          )}
        </div>

        {/* Top-Right Downloaded Badge / Download Trigger */}
        <button
          onClick={handleToggleDownload}
          className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md transition-all ${
            isDownloaded
              ? 'bg-[#a855f7] text-white shadow-md'
              : progress !== undefined
              ? 'bg-black/70 text-[#a855f7]'
              : 'bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:scale-110'
          }`}
          title={
            isDownloaded
              ? 'Downloaded to this device (Click to remove)'
              : progress !== undefined
              ? `Downloading ${progress}%`
              : 'Download for offline play'
          }
        >
          {progress !== undefined ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isDownloaded ? (
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      <div className="flex flex-col">
        <span
          className={`text-sm font-bold truncate transition-colors ${
            isCurrent ? 'text-[#a855f7]' : 'text-white'
          }`}
        >
          {song.title}
        </span>
        <span
          onClick={(e) => {
            if (onSelectArtist) {
              e.stopPropagation();
              onSelectArtist(song.artist);
            }
          }}
          className="text-xs text-[#b3b3b3] hover:text-white hover:underline truncate mt-1 font-medium cursor-pointer"
        >
          {song.artist}
        </span>
      </div>
    </div>
  );
};
