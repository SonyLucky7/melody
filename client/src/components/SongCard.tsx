import React from 'react';
import { Play, Pause } from 'lucide-react';
import { Song } from '../types';
import { usePlayer } from '../context/PlayerContext';

interface SongCardProps {
  song: Song;
  queueContext?: Song[];
}

export const SongCard: React.FC<SongCardProps> = ({ song, queueContext }) => {
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
  const isCurrent = currentSong?.id === song.id;

  const handleCardClick = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playSong(song, queueContext);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative p-3.5 bg-[#16161d] hover:bg-[#20202b] rounded-xl transition-all duration-300 cursor-pointer border border-white/5 hover:border-blue-500/20 shadow-sm flex flex-col"
    >
      <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-neutral-900 mb-3 shadow-md">
        <img
          src={song.cover_url || '/Melody-Logo-512.png'}
          alt={song.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Floating Play Button */}
        <div
          className={`absolute bottom-2 right-2 w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-400 text-white flex items-center justify-center shadow-lg shadow-blue-500/40 transition-all duration-300 ${
            isCurrent
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-90 translate-y-2 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0'
          }`}
        >
          {isCurrent && isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </div>
      </div>

      <div className="flex flex-col">
        <span
          className={`text-sm font-bold truncate transition-colors ${
            isCurrent ? 'text-blue-400' : 'text-white group-hover:text-blue-300'
          }`}
        >
          {song.title}
        </span>
        <span className="text-xs text-neutral-400 truncate mt-0.5 font-medium">{song.artist}</span>
      </div>
    </div>
  );
};
