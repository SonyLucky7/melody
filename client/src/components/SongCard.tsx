import React from 'react';
import { Play, Pause, Loader2, ListPlus } from 'lucide-react';
import { Song } from '../types';
import { usePlayer } from '../context/PlayerContext';
import { getFullCoverUrl } from '../services/api';

interface SongCardProps {
  song: Song;
  queueContext?: Song[];
  onSelectArtist?: (artist: string) => void;
  onAddToPlaylist?: (song: Song) => void;
}

export const SongCard: React.FC<SongCardProps> = ({ song, queueContext, onSelectArtist, onAddToPlaylist }) => {
  const {
    currentSong,
    isPlaying,
    isLoadingTrack,
    playSong,
    togglePlay,
  } = usePlayer();

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
      className="group relative p-3.5 bg-[#181818] hover:bg-[#282828] rounded-md transition-all duration-300 cursor-pointer shadow-md flex flex-col"
    >
      <div className="relative aspect-square w-full rounded-md overflow-hidden bg-gradient-to-br from-neutral-800 to-neutral-900 mb-3 shadow-lg">
        <img
          src={getFullCoverUrl(song.cover_url)}
          alt={song.title}
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.src.includes('melody-chi-nine.vercel.app')) {
              target.src = `https://melody-chi-nine.vercel.app${song.cover_url?.startsWith('/') ? '' : '/'}${song.cover_url}`;
            } else {
              target.src = '/Melody-Logo-512.png';
            }
          }}
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
          {isCurrent && isLoadingTrack ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : isCurrent && isPlaying ? (
            <Pause className="w-5 h-5 fill-white ml-0" />
          ) : (
            <Play className="w-5 h-5 fill-white ml-0.5" />
          )}
        </div>

        {/* Top-Left Add to Playlist Trigger */}
        {onAddToPlaylist && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToPlaylist(song);
            }}
            className="absolute top-2 left-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:scale-110 hover:bg-black/80 backdrop-blur-md transition-all shadow-md"
            title="Add to Playlist"
          >
            <ListPlus className="w-3.5 h-3.5" />
          </button>
        )}
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
