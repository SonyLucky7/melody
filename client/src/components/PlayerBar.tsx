import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, VolumeX, Heart, Laptop } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const PlayerBar: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isShuffle,
    isRepeat,
    favourites,
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
    setVolume,
    toggleShuffle,
    toggleRepeat,
    toggleFavourite,
  } = usePlayer();

  const isLiked = currentSong ? favourites.has(currentSong.id) : false;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <footer className="h-24 bg-[#121218] border-t border-[#1e1e28] px-4 flex items-center justify-between z-30 select-none">
      {/* 1. Left: Track Info & Cover */}
      <div className="flex items-center gap-3 w-1/4 min-w-[200px]">
        {currentSong ? (
          <>
            <img
              src={currentSong.cover_url || '/Melody-Logo-512.png'}
              alt={currentSong.title}
              className="w-14 h-14 rounded-lg object-cover shadow-md shadow-black/40 border border-white/5"
            />
            <div className="flex flex-col truncate max-w-[170px]">
              <span className="text-sm font-bold text-white truncate hover:underline cursor-pointer">
                {currentSong.title}
              </span>
              <span className="text-xs text-neutral-400 truncate hover:text-white cursor-pointer">
                {currentSong.artist}
              </span>
            </div>
            <button
              onClick={() => toggleFavourite(currentSong)}
              className="ml-2 p-1.5 rounded-full hover:bg-white/10 transition-colors"
              title={isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
            >
              <Heart
                className={`w-4 h-4 transition-colors ${
                  isLiked ? 'fill-blue-500 text-blue-500' : 'text-neutral-400 hover:text-white'
                }`}
              />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3 text-neutral-500">
            <div className="w-14 h-14 rounded-lg bg-neutral-900 border border-white/5 flex items-center justify-center">
              <span className="text-xs font-bold text-neutral-600">Melody</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-neutral-400">Select a song</span>
              <span className="text-[11px] text-neutral-600">Ready to stream</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Center: Controls & Seekbar */}
      <div className="flex flex-col items-center gap-1.5 w-2/4 max-w-2xl">
        <div className="flex items-center gap-5">
          <button
            onClick={toggleShuffle}
            className={`p-1 transition-colors ${isShuffle ? 'text-blue-400' : 'text-neutral-400 hover:text-white'}`}
            title="Shuffle"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={prevTrack}
            disabled={!currentSong}
            className="p-1 text-neutral-300 hover:text-white transition-colors disabled:opacity-40"
            title="Previous"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={togglePlay}
            disabled={!currentSong}
            className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-400 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={nextTrack}
            disabled={!currentSong}
            className="p-1 text-neutral-300 hover:text-white transition-colors disabled:opacity-40"
            title="Next"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={toggleRepeat}
            className={`p-1 transition-colors ${isRepeat ? 'text-blue-400' : 'text-neutral-400 hover:text-white'}`}
            title="Repeat"
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        {/* Scrubbable Seekbar */}
        <div className="w-full flex items-center gap-2 text-xs font-medium text-neutral-400">
          <span className="w-10 text-right text-[11px] font-mono">{formatTime(currentTime)}</span>
          <div className="relative flex-1 flex items-center group">
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.5}
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              disabled={!currentSong}
              className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer group-hover:h-1.5 transition-all accent-blue-500"
            />
          </div>
          <span className="w-10 text-[11px] font-mono">{formatTime(duration)}</span>
        </div>
      </div>

      {/* 3. Right: Volume & Device Indicator */}
      <div className="flex items-center justify-end gap-3 w-1/4 min-w-[180px]">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-400">
          <Laptop className="w-3.5 h-3.5 text-blue-400" />
          <span>Melody Player</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-20 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>
    </footer>
  );
};
