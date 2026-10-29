import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Volume1,
  Heart,
  Laptop,
  Sliders,
  Maximize2,
  Loader2,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { getFullCoverUrl } from '../services/api';

interface PlayerBarProps {
  onSelectArtist?: (artist: string) => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({ onSelectArtist }) => {
  const {
    currentSong,
    isPlaying,
    isLoadingTrack,
    currentTime,
    duration,
    volume,
    isShuffle,
    repeatMode,
    isRepeatOne,
    favourites,
    isEqEnabled,
    eqPreset,
    setIsEqModalOpen,
    setIsNowPlayingOpen,
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
    setVolume,
    toggleShuffle,
    toggleRepeat,
    toggleFavourite,
  } = usePlayer();

  const [isHoveringSeek, setIsHoveringSeek] = useState(false);
  const isLiked = currentSong ? favourites.has(currentSong.id) : false;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <footer className="relative h-16 md:h-20 bg-[#181818] border-t border-[#282828] px-3 md:px-4 flex items-center justify-between z-40 select-none">
      {/* Top Edge Micro-Progress Bar on Mobile */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-1 bg-white/10 overflow-hidden">
        <div
          className="h-full bg-[#a855f7] transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 1. Left: Track Info & Cover (Click opens Now Playing Animated Theme) */}
      <div className="flex items-center gap-2.5 md:gap-3.5 flex-1 min-w-0 md:w-1/4 md:min-w-[200px]">
        {currentSong ? (
          <>
            <div
              onClick={() => setIsNowPlayingOpen(true)}
              className="relative group/cover cursor-pointer flex-shrink-0"
              title="Open Now Playing Theme"
            >
              <img
                src={getFullCoverUrl(currentSong.cover_url)}
                alt={currentSong.title}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/Melody-Logo-512.png';
                }}
                className="w-10 h-10 md:w-14 md:h-14 rounded-md object-cover shadow-lg shadow-black/50 group-hover/cover:brightness-75 transition-all"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cover:opacity-100 transition-opacity">
                <Maximize2 className="w-4 h-4 md:w-5 md:h-5 text-white drop-shadow-md" />
              </div>
            </div>
            <div
              onClick={() => setIsNowPlayingOpen(true)}
              className="flex flex-col truncate max-w-[120px] sm:max-w-[180px] cursor-pointer group/title"
              title="Open Now Playing Theme"
            >
              <span className="text-xs md:text-sm font-semibold text-white truncate group-hover/title:text-[#a855f7] hover:underline transition-colors">
                {currentSong.title}
              </span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectArtist) onSelectArtist(currentSong.artist);
                }}
                className="text-[10px] md:text-xs text-[#b3b3b3] truncate hover:text-white hover:underline cursor-pointer transition-colors"
              >
                {currentSong.artist}
              </span>
            </div>
            <button
              onClick={() => toggleFavourite(currentSong)}
              className="ml-2 p-1.5 rounded-full hover:scale-105 transition-all text-[#b3b3b3] hover:text-white"
              title={isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
            >
              <Heart
                className={`w-4 h-4 transition-colors ${
                  isLiked ? 'fill-[#a855f7] text-[#a855f7]' : 'text-[#b3b3b3] hover:text-white'
                }`}
              />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3 text-neutral-500">
            <div className="w-14 h-14 rounded-md bg-[#282828] flex items-center justify-center">
              <span className="text-xs font-bold text-neutral-500">Melody</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-neutral-300">Choose a song</span>
              <span className="text-[11px] text-neutral-500">Instant Streaming</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Center: Spotify Controls & Seekbar */}
      <div className="flex flex-col items-center gap-1 md:gap-1.5 w-auto md:w-2/4 md:max-w-2xl px-1 sm:px-2 flex-shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-5">
          {/* Shuffle */}
          <button
            onClick={toggleShuffle}
            className={`hidden sm:block p-1.5 rounded-full transition-colors relative ${
              isShuffle ? 'text-[#a855f7]' : 'text-[#b3b3b3] hover:text-white'
            }`}
            title={isShuffle ? 'Disable shuffle' : 'Enable shuffle'}
          >
            <Shuffle className="w-4 h-4" />
            {isShuffle && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#a855f7]" />
            )}
          </button>

          {/* Previous */}
          <button
            onClick={prevTrack}
            disabled={!currentSong}
            className="p-1 text-[#b3b3b3] hover:text-white transition-colors disabled:opacity-40"
            title="Previous track"
          >
            <SkipBack className="w-4 h-4 md:w-5 md:h-5 fill-current" />
          </button>

          {/* Pure Spotify Circular Play/Pause Button */}
          <button
            onClick={togglePlay}
            disabled={!currentSong}
            className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white hover:scale-105 active:scale-95 text-black flex items-center justify-center shadow-md transition-transform disabled:opacity-40 disabled:hover:scale-100"
            title={isLoadingTrack ? 'Buffering track...' : isPlaying ? 'Pause' : 'Play'}
          >
            {isLoadingTrack ? (
              <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-black animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-3.5 h-3.5 md:w-4 md:h-4 fill-black text-black" />
            ) : (
              <Play className="w-3.5 h-3.5 md:w-4 md:h-4 fill-black text-black ml-0.5" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={nextTrack}
            disabled={!currentSong}
            className="p-1 text-[#b3b3b3] hover:text-white transition-colors disabled:opacity-40"
            title="Next track"
          >
            <SkipForward className="w-4 h-4 md:w-5 md:h-5 fill-current" />
          </button>

          {/* Repeat */}
          <button
            onClick={toggleRepeat}
            className={`hidden sm:block p-1.5 rounded-full transition-colors relative ${
              repeatMode !== 'off' ? 'text-[#a855f7]' : 'text-[#b3b3b3] hover:text-white'
            }`}
            title={
              repeatMode === 'off'
                ? 'Enable repeat'
                : repeatMode === 'all'
                ? 'Enable repeat one'
                : 'Disable repeat'
            }
          >
            <Repeat className="w-4 h-4" />
            {repeatMode !== 'off' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#a855f7]" />
            )}
            {isRepeatOne && (
              <span className="absolute top-0 right-0 text-[8px] font-black leading-none bg-[#a855f7] text-white rounded-full px-0.5">
                1
              </span>
            )}
          </button>
        </div>

        {/* Spotify Scrubber Seekbar with Purple Progress & Knob on Hover (Desktop) */}
        <div className="hidden md:flex w-full items-center gap-2 text-xs font-medium text-[#b3b3b3]">
          <span className="w-9 text-right text-[11px] font-mono tabular-nums">{formatTime(currentTime)}</span>
          
          <div
            className="relative flex-1 h-3 flex items-center cursor-pointer group"
            onMouseEnter={() => setIsHoveringSeek(true)}
            onMouseLeave={() => setIsHoveringSeek(false)}
          >
            {/* Background track */}
            <div className="w-full h-1 bg-[#4d4d4d] rounded-full overflow-hidden">
              {/* Progress Fill */}
              <div
                className={`h-full rounded-full transition-colors ${
                  isHoveringSeek ? 'bg-[#a855f7]' : 'bg-white'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Invisible Range Input for Smooth Scrubbing */}
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.25}
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              disabled={!currentSong}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            {/* Circular Scrubber Knob (visible on hover) */}
            {isHoveringSeek && (
              <div
                className="absolute w-3 h-3 bg-white rounded-full shadow-md pointer-events-none -translate-x-1/2"
                style={{ left: `${progressPercent}%` }}
              />
            )}
          </div>

          <span className="w-9 text-[11px] font-mono tabular-nums">{formatTime(duration)}</span>
        </div>
      </div>

      {/* 3. Right: Audio Options & Volume (Desktop Only) */}
      <div className="hidden md:flex items-center justify-end gap-3 w-1/4 min-w-[200px]">
        {/* Equalizer Quick Access */}
        <button
          onClick={() => setIsEqModalOpen(true)}
          className={`p-1.5 rounded-full transition-colors relative ${
            isEqEnabled ? 'text-[#a855f7]' : 'text-[#b3b3b3] hover:text-white'
          }`}
          title={`Equalizer (${isEqEnabled ? eqPreset : 'Bypassed'})`}
        >
          <Sliders className="w-4 h-4" />
          {isEqEnabled && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#a855f7]" />
          )}
        </button>

        {/* Device Status */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#242424] text-[11px] text-[#b3b3b3]">
          <Laptop className="w-3.5 h-3.5 text-[#a855f7]" />
          <span className="truncate max-w-[90px]">Melody Web</span>
        </div>

        {/* Volume Controls */}
        <div className="flex items-center gap-2 group/vol">
          <button
            onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
            className="text-[#b3b3b3] hover:text-white transition-colors p-1"
          >
            {volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : volume < 0.5 ? (
              <Volume1 className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          <div className="relative w-24 h-3 flex items-center cursor-pointer">
            <div className="w-full h-1 bg-[#4d4d4d] rounded-full overflow-hidden">
              <div
                className="h-full bg-white group-hover/vol:bg-[#a855f7] rounded-full transition-colors"
                style={{ width: `${volume * 100}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Expand Now Playing Theme Button */}
        <button
          onClick={() => setIsNowPlayingOpen(true)}
          disabled={!currentSong}
          className="p-1 text-[#b3b3b3] hover:text-white transition-colors disabled:opacity-20"
          title="Open Now Playing Theme"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </footer>
  );
};
