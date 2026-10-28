import React, { useEffect, useState, useRef } from 'react';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Heart,
  Download,
  Check,
  Loader2,
  Sliders,
  Volume2,
  VolumeX,
  Volume1,
  Disc,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { getFullCoverUrl } from '../services/api';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const NowPlayingView: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isShuffle,
    repeatMode,
    isRepeatOne,
    favourites,
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
    setVolume,
    toggleShuffle,
    toggleRepeat,
    toggleFavourite,
    downloadedSongIds,
    downloadProgress,
    downloadSong,
    removeDownload,
    isNowPlayingOpen,
    setIsNowPlayingOpen,
    nowPlayingTheme,
    setNowPlayingTheme,
    getAudioFrequencyData,
    isEqEnabled,
    setIsEqModalOpen,
  } = usePlayer();

  const [frequencyData, setFrequencyData] = useState<number[]>(new Array(48).fill(8));
  const [isHoveringSeek, setIsHoveringSeek] = useState(false);
  const animFrameRef = useRef<number | null>(null);

  // Real-time Audio Frequency Loop for Radial Spectrum Visualizer
  useEffect(() => {
    if (!isNowPlayingOpen) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const updateVisualizer = () => {
      const data = getAudioFrequencyData();
      if (data && isPlaying) {
        // Sample 48 frequency bins across the spectrum
        const step = Math.max(1, Math.floor(data.length / 48));
        const sampled: number[] = [];
        for (let i = 0; i < 48; i++) {
          const val = data[i * step] || 0;
          // Scale 0-255 to height range 6px - 44px
          sampled.push(Math.max(6, Math.round((val / 255) * 44)));
        }
        setFrequencyData(sampled);
      } else if (isPlaying) {
        // Fallback rhythmic pulse if AudioContext suspended
        const time = Date.now() / 200;
        const simulated = Array.from({ length: 48 }, (_, i) => {
          const wave = Math.sin(time + i * 0.4) * 0.5 + 0.5;
          return Math.max(6, Math.round(wave * 38));
        });
        setFrequencyData(simulated);
      } else {
        setFrequencyData(new Array(48).fill(6));
      }
      animFrameRef.current = requestAnimationFrame(updateVisualizer);
    };

    animFrameRef.current = requestAnimationFrame(updateVisualizer);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isNowPlayingOpen, isPlaying, getAudioFrequencyData]);

  if (!isNowPlayingOpen || !currentSong) return null;

  const isLiked = favourites.has(currentSong.id);
  const isDownloaded = downloadedSongIds.has(currentSong.id);
  const downloadPct = downloadProgress[currentSong.id];
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-[#0e0e12] overflow-hidden select-none animate-in fade-in duration-300">
      {/* Dynamic Ambient Blurred Background matching Cover Art */}
      <div
        className="absolute inset-0 bg-cover bg-center scale-150 blur-3xl opacity-25 pointer-events-none transition-all duration-1000"
        style={{ backgroundImage: `url(${getFullCoverUrl(currentSong.cover_url)})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#121212]/90 via-[#121212]/95 to-[#0a0a0c] pointer-events-none" />

      {/* 1. Top Header Bar */}
      <header className="relative z-10 px-6 py-5 flex items-center justify-between">
        <button
          onClick={() => setIsNowPlayingOpen(false)}
          className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 text-white flex items-center justify-center transition-all hover:scale-105"
          title="Minimize Now Playing"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center text-center">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#a855f7]">
            Playing from Album
          </span>
          <span className="text-xs font-bold text-neutral-300 truncate max-w-xs md:max-w-md">
            {currentSong.album || 'Melody Discography'}
          </span>
        </div>

        {/* Theme Switcher Toggle Pill */}
        <div className="flex items-center gap-1 bg-white/10 p-1 rounded-full border border-white/10 backdrop-blur-md">
          <button
            onClick={() => setNowPlayingTheme('vinyl')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
              nowPlayingTheme === 'vinyl'
                ? 'bg-[#a855f7] text-white shadow-lg shadow-purple-900/40'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Retro Vinyl Turntable Theme"
          >
            <Disc className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Vinyl</span>
          </button>

          <button
            onClick={() => setNowPlayingTheme('radial')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
              nowPlayingTheme === 'radial'
                ? 'bg-[#a855f7] text-white shadow-lg shadow-purple-900/40'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Radial Spectrum Waveform Theme"
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Waveform</span>
          </button>
        </div>
      </header>

      {/* 2. Center Animated Theme Viewport */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 min-h-0">
        {nowPlayingTheme === 'vinyl' ? (
          /* ==============================================================
             THEME 1: RETRO VINYL TURNTABLE (IMAGE 2)
             ============================================================== */
          <div className="relative flex flex-col items-center justify-center max-w-2xl w-full">
            {/* Turntable Platter Deck */}
            <div className="relative flex items-center justify-center">
              {/* Album Sleeve / Jacket (slid slightly to the left) */}
              <div className="relative w-56 h-56 sm:w-72 sm:h-72 rounded-xl overflow-hidden shadow-2xl -mr-16 sm:-mr-24 z-10 border border-white/10 rotate-[-4deg] transition-transform hover:rotate-0 duration-500 flex-shrink-0">
                <img
                  src={getFullCoverUrl(currentSong.cover_url)}
                  alt={currentSong.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/10 pointer-events-none" />
              </div>

              {/* Spinning Vinyl Record (LP Disc) */}
              <div
                className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.9)] flex items-center justify-center z-20 flex-shrink-0"
                style={{
                  background: 'radial-gradient(circle, #2b1216 0%, #15090b 40%, #0d0607 70%, #080304 100%)',
                  boxShadow: '0 0 0 3px rgba(255,255,255,0.06), 0 25px 60px rgba(0,0,0,0.95)',
                  animation: 'spin 8s linear infinite',
                  animationPlayState: isPlaying ? 'running' : 'paused',
                }}
              >
                {/* Concentric Micro-Grooves */}
                <div className="absolute inset-3 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute inset-6 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute inset-9 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute inset-12 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute inset-16 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute inset-20 rounded-full border border-white/5 pointer-events-none" />

                {/* Vinyl Sheen Light Reflection */}
                <div
                  className="absolute inset-0 rounded-full pointer-events-none opacity-40"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 35%, rgba(255,255,255,0.12) 65%, transparent 100%)',
                  }}
                />

                {/* Center Record Label */}
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#a855f7] border-4 border-[#121212] overflow-hidden flex flex-col items-center justify-center p-2 text-center shadow-inner">
                  <img
                    src={getFullCoverUrl(currentSong.cover_url)}
                    alt="Center label"
                    className="w-full h-full object-cover rounded-full opacity-80"
                  />
                  {/* Center Spindle Hole */}
                  <div className="absolute w-3.5 h-3.5 rounded-full bg-[#121212] border border-white/40 shadow-inner z-10" />
                </div>
              </div>

              {/* Tonearm (Stylus Needle) */}
              <div
                className="absolute -top-10 -right-8 sm:-right-4 w-28 h-48 sm:w-36 sm:h-64 pointer-events-none z-30 transition-transform duration-700 ease-out origin-top-right"
                style={{
                  transform: isPlaying ? 'rotate(24deg)' : 'rotate(0deg)',
                }}
              >
                {/* Arm Pivot Base */}
                <div className="absolute top-2 right-4 w-9 h-9 rounded-full bg-gradient-to-b from-neutral-300 via-neutral-500 to-neutral-700 border border-neutral-300 shadow-xl flex items-center justify-center">
                  <div className="w-3.5 h-3.5 rounded-full bg-neutral-900 border border-neutral-400" />
                </div>

                {/* Metallic Curved Rod */}
                <div className="absolute top-8 right-7 w-1.5 h-36 sm:h-48 bg-gradient-to-r from-neutral-200 via-neutral-400 to-neutral-300 rounded-full shadow-lg" />

                {/* Stylus Cartridge Head */}
                <div className="absolute bottom-2 right-4 w-5 h-8 bg-neutral-900 rounded-sm border border-neutral-600 shadow-md rotate-[-15deg] flex items-center justify-center">
                  <div className="w-1 h-3 bg-[#a855f7] rounded-full" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ==============================================================
             THEME 2: RICH RADIAL WAVEFORM SPECTRUM (IMAGE 1)
             ============================================================== */
          <div className="relative flex items-center justify-center w-full max-w-lg aspect-square">
            {/* Concentric Pulsating Ambient Rings */}
            {isPlaying && (
              <>
                <div className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full border border-[#a855f7]/20 animate-ping duration-1000 pointer-events-none" />
                <div className="absolute w-80 h-80 sm:w-[420px] sm:h-[420px] rounded-full border border-[#ec4899]/15 animate-pulse duration-700 pointer-events-none" />
              </>
            )}

            {/* 48 Radial Frequency Visualizer Spectrum Bars */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {frequencyData.map((barHeight, i) => {
                const angle = i * (360 / 48);
                return (
                  <div
                    key={i}
                    className="absolute origin-bottom"
                    style={{
                      transform: `rotate(${angle}deg) translateY(-140px)`,
                    }}
                  >
                    <div
                      className="w-1 sm:w-1.5 rounded-full transition-all duration-75"
                      style={{
                        height: `${barHeight}px`,
                        background: `linear-gradient(to top, #a855f7, #ec4899)`,
                        boxShadow: isPlaying ? '0 0 10px rgba(168, 85, 247, 0.7)' : 'none',
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Center Circular Artist/Album Artwork */}
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full overflow-hidden shadow-[0_0_60px_rgba(168,85,247,0.35)] border-4 border-[#a855f7]/60 z-10">
              <img
                src={getFullCoverUrl(currentSong.cover_url)}
                alt={currentSong.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>
        )}
      </main>

      {/* 3. Bottom Player Controls Area */}
      <footer className="relative z-10 px-6 sm:px-12 pb-8 pt-3 max-w-3xl w-full mx-auto space-y-4">
        {/* Track Title, Artist, & Actions */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col truncate pr-4">
            <h2 className="text-2xl sm:text-3xl font-black text-white truncate tracking-tight">
              {currentSong.title}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5 text-sm sm:text-base font-semibold text-neutral-300 truncate">
              <span>{currentSong.artist}</span>
              <CheckCircle2 className="w-4 h-4 fill-blue-500 text-white flex-shrink-0" />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Download Offline Button */}
            <button
              onClick={() => {
                if (isDownloaded) {
                  removeDownload(currentSong.id);
                } else if (downloadPct === undefined) {
                  downloadSong(currentSong);
                }
              }}
              className="p-2.5 rounded-full bg-white/5 hover:bg-white/15 text-white transition-all hover:scale-110"
              title={
                isDownloaded
                  ? 'Downloaded to this device (Click to remove)'
                  : downloadPct !== undefined
                  ? `Downloading ${downloadPct}%`
                  : 'Download for offline play'
              }
            >
              {downloadPct !== undefined ? (
                <Loader2 className="w-5 h-5 text-[#a855f7] animate-spin" />
              ) : isDownloaded ? (
                <Check className="w-5 h-5 text-[#a855f7] stroke-[3]" />
              ) : (
                <Download className="w-5 h-5 text-neutral-300" />
              )}
            </button>

            {/* Heart Like Button */}
            <button
              onClick={() => toggleFavourite(currentSong)}
              className="p-2.5 rounded-full bg-white/5 hover:bg-white/15 transition-all hover:scale-110"
              title={isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
            >
              <Heart
                className={`w-6 h-6 transition-colors ${
                  isLiked ? 'fill-[#a855f7] text-[#a855f7]' : 'text-neutral-300'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Live Scrubber Seekbar */}
        <div className="space-y-1">
          <div
            className="relative h-4 flex items-center cursor-pointer group"
            onMouseEnter={() => setIsHoveringSeek(true)}
            onMouseLeave={() => setIsHoveringSeek(false)}
          >
            <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-colors ${
                  isHoveringSeek ? 'bg-[#a855f7]' : 'bg-white'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.25}
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            {/* Scrubber Knob */}
            <div
              className={`absolute w-3.5 h-3.5 bg-white rounded-full shadow-lg pointer-events-none -translate-x-1/2 transition-opacity ${
                isHoveringSeek ? 'opacity-100 scale-110' : 'opacity-0'
              }`}
              style={{ left: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Playback Controls Bar */}
        <div className="flex items-center justify-between pt-1">
          {/* Shuffle */}
          <button
            onClick={toggleShuffle}
            className={`p-2 rounded-full transition-colors relative ${
              isShuffle ? 'text-[#a855f7]' : 'text-neutral-400 hover:text-white'
            }`}
            title={isShuffle ? 'Disable shuffle' : 'Enable shuffle'}
          >
            <Shuffle className="w-5 h-5" />
            {isShuffle && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#a855f7]" />
            )}
          </button>

          {/* Previous Track */}
          <button
            onClick={prevTrack}
            className="p-2 text-neutral-300 hover:text-white transition-colors"
            title="Previous track"
          >
            <SkipBack className="w-7 h-7 fill-current" />
          </button>

          {/* Large Central Play / Pause Button */}
          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-[#a855f7] hover:bg-[#9333ea] hover:scale-105 active:scale-95 text-white flex items-center justify-center shadow-2xl shadow-purple-900/50 transition-all"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 fill-white text-white" />
            ) : (
              <Play className="w-7 h-7 fill-white text-white ml-1" />
            )}
          </button>

          {/* Next Track */}
          <button
            onClick={nextTrack}
            className="p-2 text-neutral-300 hover:text-white transition-colors"
            title="Next track"
          >
            <SkipForward className="w-7 h-7 fill-current" />
          </button>

          {/* Repeat */}
          <button
            onClick={toggleRepeat}
            className={`p-2 rounded-full transition-colors relative ${
              repeatMode !== 'off' ? 'text-[#a855f7]' : 'text-neutral-400 hover:text-white'
            }`}
            title={
              repeatMode === 'off'
                ? 'Enable repeat'
                : repeatMode === 'all'
                ? 'Enable repeat one'
                : 'Disable repeat'
            }
          >
            <Repeat className="w-5 h-5" />
            {repeatMode !== 'off' && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#a855f7]" />
            )}
            {isRepeatOne && (
              <span className="absolute top-1 right-1 text-[8px] font-black leading-none bg-[#a855f7] text-white rounded-full px-0.5">
                1
              </span>
            )}
          </button>
        </div>

        {/* Bottom Auxiliary: Equalizer and Volume */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-neutral-400 text-xs">
          <button
            onClick={() => setIsEqModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all ${
              isEqEnabled ? 'text-[#a855f7] bg-white/5' : 'hover:text-white'
            }`}
            title="Open Equalizer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Equalizer {isEqEnabled ? '(Active)' : ''}</span>
          </button>

          <div className="flex items-center gap-2">
            <button onClick={() => setVolume(volume === 0 ? 0.8 : 0)}>
              {volume === 0 ? (
                <VolumeX className="w-4 h-4 text-neutral-400" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-4 h-4 text-neutral-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-neutral-400" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer"
            />
          </div>
        </div>
      </footer>
    </div>
  );
};
