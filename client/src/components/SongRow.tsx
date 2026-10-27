import React from 'react';
import { Play, Pause, Heart } from 'lucide-react';
import { Song } from '../types';
import { usePlayer } from '../context/PlayerContext';

interface SongRowProps {
  index: number;
  song: Song;
  queueContext?: Song[];
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const SongRow: React.FC<SongRowProps> = ({ index, song, queueContext }) => {
  const { currentSong, isPlaying, playSong, togglePlay, favourites, toggleFavourite } = usePlayer();
  const isCurrent = currentSong?.id === song.id;
  const isLiked = favourites.has(song.id);

  const handleRowClick = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playSong(song, queueContext);
    }
  };

  return (
    <div
      onClick={handleRowClick}
      className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
        isCurrent ? 'bg-blue-600/10' : 'hover:bg-white/5'
      }`}
    >
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        <div className="w-6 flex items-center justify-center text-xs font-mono text-neutral-500">
          {isCurrent && isPlaying ? (
            <span className="flex items-end gap-0.5 h-3">
              <span className="w-0.5 h-full bg-blue-500 animate-pulse"></span>
              <span className="w-0.5 h-2/3 bg-blue-400 animate-pulse delay-75"></span>
              <span className="w-0.5 h-4/5 bg-blue-500 animate-pulse delay-150"></span>
            </span>
          ) : (
            <span className="group-hover:hidden">{index + 1}</span>
          )}
          <span className="hidden group-hover:block text-white">
            {isCurrent && isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
          </span>
        </div>

        <img
          src={song.cover_url || '/Melody-Logo-192.png'}
          alt={song.title}
          className="w-10 h-10 rounded object-cover shadow-sm"
        />

        <div className="flex flex-col truncate pr-2">
          <span className={`text-sm font-semibold truncate ${isCurrent ? 'text-blue-400' : 'text-white'}`}>
            {song.title}
          </span>
          <span className="text-xs text-neutral-400 truncate">{song.artist}</span>
        </div>
      </div>

      <div className="hidden md:block w-1/4 truncate text-xs text-neutral-400 font-medium">
        {song.album || 'Single'}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavourite(song);
          }}
          className="p-1 text-neutral-500 hover:text-white transition-colors"
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-blue-500 text-blue-500' : 'opacity-0 group-hover:opacity-100'}`} />
        </button>

        <span className="text-xs font-mono text-neutral-400 w-10 text-right">
          {formatDuration(song.duration_seconds)}
        </span>
      </div>
    </div>
  );
};
