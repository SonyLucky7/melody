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
  Sliders,
  Volume2,
  VolumeX,
  Volume1,
  Disc3,
  AudioLines,
  Image as ImageIcon,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { getFullCoverUrl } from '../services/api';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Pre-computed concentric groove radii for authentic 180g pressed LP look
// Includes natural wider silent track-break bands like a real physical vinyl record
const VINYL_GROOVE_RADII = [
  189, 185, 182, 179, 176, 173, 170, 167,
  // Track break 1
  161, 158, 155, 152, 149, 146, 143, 140,
  // Track break 2
  134, 131, 128, 125, 122, 119, 116, 113,
  // Track break 3 + inner run-out groove
  107, 104, 101, 98, 95, 92, 84,
];

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
    isNowPlayingOpen,
    setIsNowPlayingOpen,
    nowPlayingTheme,
    setNowPlayingTheme,
    getAudioFrequencyData,
    isEqEnabled,
    setIsEqModalOpen,
  } = usePlayer();

  const [spectrumBars, setSpectrumBars] = useState<number[]>(new Array(44).fill(4));
  const [isHoveringSeek, setIsHoveringSeek] = useState(false);
  const animFrameRef = useRef<number | null>(null);
  const smoothedRef = useRef<number[]>(new Array(44).fill(4));

  // Smooth, low-jitter studio spectrum analyzer loop
  useEffect(() => {
    if (!isNowPlayingOpen || nowPlayingTheme !== 'radial') {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const BAR_COUNT = 44;

    const updateVisualizer = () => {
      const data = getAudioFrequencyData();
      const nextVals: number[] = [];

      if (data && isPlaying) {
        const usableLen = Math.floor(data.length * 0.72);
        const step = Math.max(1, Math.floor(usableLen / BAR_COUNT));
        for (let i = 0; i < BAR_COUNT; i++) {
          // Symmetric musical envelope (bass warm in center, highs tapered at edges)
          const mirrorIdx = Math.abs(i - (BAR_COUNT - 1) / 2);
          const binIdx = Math.min(data.length - 1, Math.floor(mirrorIdx * step * 1.4));
          const raw = (data[binIdx] || 0) / 255;
          const target = Math.max(4, Math.round(Math.pow(raw, 1.15) * 64));
          const prev = smoothedRef.current[i] || 4;
          const smooth = prev + (target - prev) * 0.28;
          smoothedRef.current[i] = smooth;
          nextVals.push(Math.round(smooth));
        }
      } else if (isPlaying) {
        const t = Date.now() / 320;
        for (let i = 0; i < BAR_COUNT; i++) {
          const distFromCenter = Math.abs(i - (BAR_COUNT - 1) / 2) / (BAR_COUNT / 2);
          const envelope = Math.max(0.2, 1 - distFromCenter * 0.72);
          const w1 = Math.sin(t * 1.3 + i * 0.34) * 0.5 + 0.5;
          const w2 = Math.cos(t * 2.1 - i * 0.22) * 0.5 + 0.5;
          const target = Math.max(4, Math.round((w1 * 0.6 + w2 * 0.4) * 54 * envelope));
          const prev = smoothedRef.current[i] || 4;
          const smooth = prev + (target - prev) * 0.22;
          smoothedRef.current[i] = smooth;
          nextVals.push(Math.round(smooth));
        }
      } else {
        for (let i = 0; i < BAR_COUNT; i++) {
          const prev = smoothedRef.current[i] || 4;
          const smooth = prev + (4 - prev) * 0.16;
          smoothedRef.current[i] = smooth;
          nextVals.push(Math.round(smooth));
        }
      }

      setSpectrumBars(nextVals);
      animFrameRef.current = requestAnimationFrame(updateVisualizer);
    };

    animFrameRef.current = requestAnimationFrame(updateVisualizer);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isNowPlayingOpen, nowPlayingTheme, isPlaying, getAudioFrequencyData]);

  // Escape key closes Now Playing smoothly
  useEffect(() => {
    if (!isNowPlayingOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsNowPlayingOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isNowPlayingOpen, setIsNowPlayingOpen]);

  if (!isNowPlayingOpen || !currentSong) return null;

  const coverUrl = getFullCoverUrl(currentSong.cover_url);
  const isLiked = favourites.has(currentSong.id);
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-[#09090b] overflow-hidden select-none animate-fade-in">
      {/* 1. True Atmospheric Diffused Album-Art Studio Backdrop */}
      <div
        className="absolute inset-0 bg-cover bg-center scale-125 blur-[96px] saturate-[1.35] opacity-40 pointer-events-none transition-all duration-1000"
        style={{ backgroundImage: `url(${coverUrl})` }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 85% 65% at 50% 34%, rgba(12,12,15,0.28) 0%, rgba(9,9,12,0.78) 62%, rgba(6,6,8,0.96) 100%)',
        }}
      />
      {/* Subtle analog tactile grain to prevent dark-gradient banding */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.8) 0.5px, transparent 0.5px)',
          backgroundSize: '3px 3px',
        }}
      />

      {/* 2. Isolated Top Editorial Header (generous clearance — zero overlap with stage) */}
      <header className="relative z-30 h-16 sm:h-20 px-4 sm:px-8 flex items-center justify-between flex-shrink-0">
        <button
          onClick={() => setIsNowPlayingOpen(false)}
          className="w-10 h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.13] border border-white/[0.08] text-white/90 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
          title="Minimize Now Playing"
        >
          <ChevronDown className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center min-w-0 px-3">
          <span className="text-[10px] uppercase font-semibold tracking-[0.22em] text-white/45">
            Now Playing
          </span>
          <span className="text-xs sm:text-[13px] font-medium text-white/90 truncate max-w-[160px] sm:max-w-xs md:max-w-md mt-0.5">
            {currentSong.album || currentSong.artist}
          </span>
        </div>

        {/* Clean Monochrome Segmented Switcher (Cover / Vinyl / Spectrum) */}
        <div className="flex items-center gap-0.5 bg-white/[0.07] p-1 rounded-full border border-white/[0.09] backdrop-blur-xl">
          <button
            onClick={() => setNowPlayingTheme('cover')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-tight transition-all cursor-pointer ${
              nowPlayingTheme === 'cover'
                ? 'bg-white text-[#09090b] shadow-sm'
                : 'text-white/60 hover:text-white'
            }`}
            title="Studio Cover View"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cover</span>
          </button>

          <button
            onClick={() => setNowPlayingTheme('vinyl')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-tight transition-all cursor-pointer ${
              nowPlayingTheme === 'vinyl'
                ? 'bg-white text-[#09090b] shadow-sm'
                : 'text-white/60 hover:text-white'
            }`}
            title="Precision Vinyl Turntable"
          >
            <Disc3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Vinyl</span>
          </button>

          <button
            onClick={() => setNowPlayingTheme('radial')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-tight transition-all cursor-pointer ${
              nowPlayingTheme === 'radial'
                ? 'bg-white text-[#09090b] shadow-sm'
                : 'text-white/60 hover:text-white'
            }`}
            title="Studio Spectrum Analyzer"
          >
            <AudioLines className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Spectrum</span>
          </button>
        </div>
      </header>

      {/* 3. Main Visual Stage (strictly bounded between header and footer) */}
      <main className="relative z-10 flex-1 min-h-0 flex items-center justify-center px-5 sm:px-10 py-2">
        {nowPlayingTheme === 'cover' && (
          /* =================================================================
             MODE 1: STUDIO COVER (Flagship Apple Music / Tidal Artwork Stage)
             ================================================================= */
          <div className="flex items-center justify-center w-full h-full">
            <div
              className={`relative aspect-square w-[min(45vh,78vw)] max-w-[390px] rounded-2xl overflow-hidden transition-all duration-700 ease-out ${
                isPlaying
                  ? 'scale-100 shadow-[0_32px_90px_rgba(0,0,0,0.72)]'
                  : 'scale-[0.93] shadow-[0_18px_48px_rgba(0,0,0,0.55)]'
              }`}
              style={{
                boxShadow: isPlaying
                  ? '0 32px 90px rgba(0,0,0,0.75), inset 0 0 0 1px rgba(255,255,255,0.14)'
                  : '0 18px 48px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.08)',
              }}
            >
              <img
                key={`studio-cover-${currentSong.id}`}
                src={coverUrl}
                alt={currentSong.title}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/Melody-Logo-512.png';
                }}
                className="w-full h-full object-cover"
              />
              {/* Subtle top specular glass rim highlight */}
              <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/15 pointer-events-none" />
            </div>
          </div>
        )}

        {nowPlayingTheme === 'vinyl' && (
          /* =================================================================
             MODE 2: AUDIOPHILE PRECISION TURNTABLE (Technics SL-1200 Inspired)
             - Zero neon purple borders
             - Stationary studio anisotropic sheen OVER spinning micro-grooves
             - Precision brushed-titanium S-curve tonearm strictly inside stage
             ================================================================= */
          <div className="relative flex items-center justify-center w-full max-w-[700px] h-full max-h-[430px]">
            <div className="relative flex items-center justify-center">
              {/* Upright Gatefold Matte Record Sleeve (desktop/tablet, grounded cleanly) */}
              <div className="hidden sm:block relative w-[min(36vh,250px)] h-[min(36vh,250px)] md:w-[min(39vh,280px)] md:h-[min(39vh,280px)] rounded-[10px] overflow-hidden -mr-20 md:-mr-24 z-10 flex-shrink-0 shadow-[0_28px_70px_rgba(0,0,0,0.78)] ring-1 ring-white/15">
                <img
                  key={`sleeve-${currentSong.id}`}
                  src={coverUrl}
                  alt={currentSong.title}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/Melody-Logo-512.png';
                  }}
                  className="w-full h-full object-cover"
                />
                {/* Authentic cardboard LP spine crease & matte sheen */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(90deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.03) 3%, rgba(0,0,0,0.28) 5%, transparent 9%, transparent 86%, rgba(0,0,0,0.52) 100%)',
                  }}
                />
              </div>

              {/* Self-Contained Turntable Platter + Tonearm Enclosure */}
              <div className="relative w-[min(43vh,78vw)] h-[min(43vh,78vw)] max-w-[360px] max-h-[360px] flex items-center justify-center z-20 flex-shrink-0">
                {/* Soft Contact Ambient Floor Shadow */}
                <div className="absolute inset-3 rounded-full bg-black/80 blur-2xl translate-y-4 pointer-events-none" />

                {/* Brushed Anodized Platter Rim with Subtle Strobe Ticks */}
                <div
                  className="relative w-[92%] h-[92%] rounded-full p-[5px] flex items-center justify-center shadow-[0_24px_65px_rgba(0,0,0,0.92)]"
                  style={{
                    background:
                      'linear-gradient(145deg, rgba(255,255,255,0.18) 0%, rgba(40,40,46,0.9) 45%, rgba(16,16,20,0.98) 100%)',
                  }}
                >
                  {/* Spinning 180g Pressed Vinyl Disc */}
                  <div
                    className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-[#0c0c0e]"
                    style={{
                      animation: 'spin 11s linear infinite',
                      animationPlayState: isPlaying ? 'running' : 'paused',
                    }}
                  >
                    {/* High-Precision SVG Micro-Groove Plate */}
                    <svg
                      viewBox="0 0 400 400"
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      aria-hidden="true"
                    >
                      <defs>
                        <radialGradient id="vinylBase" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#16161a" />
                          <stop offset="55%" stopColor="#0f0f12" />
                          <stop offset="88%" stopColor="#0b0b0e" />
                          <stop offset="100%" stopColor="#141418" />
                        </radialGradient>
                      </defs>
                      <circle cx="200" cy="200" r="199" fill="url(#vinylBase)" />
                      {VINYL_GROOVE_RADII.map((r, idx) => (
                        <circle
                          key={r}
                          cx="200"
                          cy="200"
                          r={r}
                          fill="none"
                          stroke={idx % 3 === 0 ? 'rgba(255,255,255,0.065)' : 'rgba(255,255,255,0.032)'}
                          strokeWidth={r === 84 ? '1.1' : '0.65'}
                        />
                      ))}
                      {/* Outer raised lip highlight */}
                      <circle cx="200" cy="200" r="197" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />
                    </svg>

                    {/* Authentic Full-Bleed Paper Center Label (NO neon purple border!) */}
                    <div className="relative w-[36%] h-[36%] rounded-full overflow-hidden z-10 shadow-[0_0_0_2px_rgba(0,0,0,0.85),0_0_0_3px_rgba(255,255,255,0.08)]">
                      <img
                        key={`label-${currentSong.id}`}
                        src={coverUrl}
                        alt="Record label"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/Melody-Logo-512.png';
                        }}
                        className="w-full h-full object-cover brightness-[0.94] contrast-[1.04]"
                      />
                      {/* Subtle pressed paper label crease ring */}
                      <div className="absolute inset-2.5 rounded-full border border-black/25 pointer-events-none" />
                      {/* Paper matte diffusion */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/10 pointer-events-none" />
                    </div>
                  </div>

                  {/* STATIONARY Anisotropic Studio Light Reflection (stays fixed while vinyl spins underneath!) */}
                  <div
                    className="absolute inset-[5px] rounded-full pointer-events-none z-20"
                    style={{
                      background:
                        'conic-gradient(from -32deg, transparent 0deg, rgba(255,255,255,0.05) 14deg, rgba(255,255,255,0.19) 28deg, rgba(255,255,255,0.04) 44deg, transparent 62deg, transparent 148deg, rgba(255,255,255,0.04) 166deg, rgba(255,255,255,0.14) 182deg, rgba(255,255,255,0.03) 198deg, transparent 220deg)',
                      maskImage: 'radial-gradient(circle, transparent 36%, black 38%, black 98%, transparent 100%)',
                      WebkitMaskImage:
                        'radial-gradient(circle, transparent 36%, black 38%, black 98%, transparent 100%)',
                    }}
                  />

                  {/* Machined Brushed-Steel Center Spindle Pin (stationary metallic highlight) */}
                  <div className="absolute w-4 h-4 rounded-full z-30 pointer-events-none flex items-center justify-center bg-[#09090b] shadow-[0_1px_4px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.16)]">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: 'radial-gradient(circle at 32% 32%, #f4f4f5 0%, #a1a1aa 55%, #3f3f46 100%)',
                      }}
                    />
                  </div>
                </div>

                {/* Precision Brushed-Titanium S-Curve Tonearm (100% bounded inside turntable frame — NEVER collides with header!) */}
                <svg
                  viewBox="0 0 150 260"
                  className="absolute top-[2%] -right-[7%] sm:-right-[11%] w-[38%] h-[78%] pointer-events-none z-30 overflow-visible drop-shadow-[0_12px_18px_rgba(0,0,0,0.65)]"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="armChrome" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#71717a" />
                      <stop offset="35%" stopColor="#f4f4f5" />
                      <stop offset="65%" stopColor="#d4d4d8" />
                      <stop offset="100%" stopColor="#52525b" />
                    </linearGradient>
                    <radialGradient id="gimbalMetal" cx="38%" cy="32%" r="65%">
                      <stop offset="0%" stopColor="#52525b" />
                      <stop offset="55%" stopColor="#27272a" />
                      <stop offset="100%" stopColor="#09090b" />
                    </radialGradient>
                    <linearGradient id="headshellBody" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3f3f46" />
                      <stop offset="100%" stopColor="#18181b" />
                    </linearGradient>
                  </defs>

                  {/* Fixed Gimbal Deck Plinth Collar */}
                  <circle cx="102" cy="48" r="24" fill="url(#gimbalMetal)" stroke="rgba(255,255,255,0.16)" strokeWidth="1.2" />
                  <circle cx="102" cy="48" r="16" fill="#18181b" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

                  {/* Pivoting S-Curved Arm Assembly around exact gimbal center (102, 48) */}
                  <g
                    style={{
                      transformOrigin: '102px 48px',
                      transform: isPlaying ? 'rotate(19deg)' : 'rotate(-2deg)',
                      transition: 'transform 750ms cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                  >
                    {/* Knurled Counterweight Cylinder behind pivot */}
                    <rect x="94" y="10" width="16" height="22" rx="3" fill="#27272a" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
                    <line x1="94" y1="16" x2="110" y2="16" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
                    <line x1="94" y1="25" x2="110" y2="25" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

                    {/* Rear rod segment */}
                    <line x1="102" y1="32" x2="102" y2="48" stroke="url(#armChrome)" strokeWidth="4.5" strokeLinecap="round" />

                    {/* Authentic Technics S-Curved Tubular Tonearm */}
                    <path
                      d="M 102 48 C 102 108, 106 146, 86 184 C 78 199, 68 210, 58 219"
                      fill="none"
                      stroke="url(#armChrome)"
                      strokeWidth="4.4"
                      strokeLinecap="round"
                    />

                    {/* Gimbal Pivot Bearing Cap */}
                    <circle cx="102" cy="48" r="9.5" fill="#27272a" stroke="#e4e4e7" strokeWidth="1.2" />
                    <circle cx="102" cy="48" r="3.2" fill="#e4e4e7" />

                    {/* Matte Anodized SME Headshell & Cartridge */}
                    <g transform="translate(55, 221) rotate(33)">
                      {/* Finger lift wire */}
                      <path d="M 6 -2 L 15 -7" stroke="#d4d4d8" strokeWidth="1.4" strokeLinecap="round" />
                      {/* Headshell body */}
                      <rect
                        x="-7"
                        y="-4"
                        width="14"
                        height="26"
                        rx="2.5"
                        fill="url(#headshellBody)"
                        stroke="rgba(255,255,255,0.24)"
                        strokeWidth="0.9"
                      />
                      {/* Brass cartridge accent screws */}
                      <circle cx="-3" cy="5" r="1.1" fill="#d4d4d8" />
                      <circle cx="3" cy="5" r="1.1" fill="#d4d4d8" />
                      {/* Subtle warm stylus tip */}
                      <rect x="-2" y="19" width="4" height="5" rx="1" fill="#e4e4e7" />
                    </g>
                  </g>
                </svg>
              </div>
            </div>
          </div>
        )}

        {nowPlayingTheme === 'radial' && (
          /* =================================================================
             MODE 3: STUDIO SPECTRUM ANALYZER (Clean Architectural Visual)
             ================================================================= */
          <div className="flex flex-col items-center justify-center gap-7 sm:gap-8 w-full max-w-xl">
            <div className="relative w-44 h-44 sm:w-56 sm:h-56 rounded-2xl overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.75)] ring-1 ring-white/15">
              <img
                key={`spectrum-cover-${currentSong.id}`}
                src={coverUrl}
                alt={currentSong.title}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/Melody-Logo-512.png';
                }}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Precision 44-Bar Pearlescent Studio Frequency Analyzer */}
            <div className="w-full px-2">
              <div className="h-20 sm:h-24 flex items-end justify-center gap-[3px] sm:gap-[5px]">
                {spectrumBars.map((h, i) => (
                  <div
                    key={i}
                    className="w-[3px] sm:w-[4px] rounded-full transition-[height] duration-75 ease-out"
                    style={{
                      height: `${Math.max(4, h)}px`,
                      background:
                        'linear-gradient(to top, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.82) 70%, #ffffff 100%)',
                    }}
                  />
                ))}
              </div>
              {/* Subtle hairline acoustic horizon + soft reflection */}
              <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/15 to-transparent mt-1" />
              <div className="h-5 flex items-start justify-center gap-[3px] sm:gap-[5px] opacity-20 overflow-hidden pointer-events-none">
                {spectrumBars.map((h, i) => (
                  <div
                    key={`ref-${i}`}
                    className="w-[3px] sm:w-[4px] rounded-full bg-white/60"
                    style={{ height: `${Math.max(2, Math.round(h * 0.28))}px` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 4. Tactile Editorial Player Controls Dock */}
      <footer className="relative z-20 px-6 sm:px-10 pb-6 sm:pb-8 pt-2 max-w-2xl w-full mx-auto space-y-4 flex-shrink-0">
        {/* Track Title, Artist & Save Button */}
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-[26px] font-bold text-white truncate tracking-[-0.02em] leading-tight">
              {currentSong.title}
            </h2>
            <p className="text-sm sm:text-[15px] font-medium text-white/60 truncate mt-1">
              {currentSong.artist}
            </p>
          </div>

          <button
            onClick={() => toggleFavourite(currentSong)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer flex-shrink-0 border ${
              isLiked
                ? 'bg-white/12 border-white/20 text-rose-400'
                : 'bg-white/[0.05] hover:bg-white/[0.11] border-white/[0.08] text-white/70 hover:text-white'
            }`}
            title={isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
          >
            <Heart className={`w-5 h-5 transition-transform ${isLiked ? 'fill-rose-400 text-rose-400 scale-105' : ''}`} />
          </button>
        </div>

        {/* Hairline Precision Scrubber */}
        <div className="space-y-1.5">
          <div
            className="relative h-5 flex items-center cursor-pointer group"
            onMouseEnter={() => setIsHoveringSeek(true)}
            onMouseLeave={() => setIsHoveringSeek(false)}
          >
            <div
              className={`w-full rounded-full overflow-hidden bg-white/15 transition-all duration-150 ${
                isHoveringSeek ? 'h-[6px]' : 'h-[4px]'
              }`}
            >
              <div
                className="h-full rounded-full bg-white transition-[width] duration-75"
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
              aria-label="Seek audio position"
            />

            <div
              className={`absolute w-3.5 h-3.5 bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.6)] pointer-events-none -translate-x-1/2 transition-all duration-150 ${
                isHoveringSeek ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
              }`}
              style={{ left: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-medium tabular-nums text-white/45 tracking-wide">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Primary Transport Row */}
        <div className="flex items-center justify-between pt-0.5">
          {/* Shuffle */}
          <button
            onClick={toggleShuffle}
            className={`relative p-2.5 rounded-full transition-colors cursor-pointer ${
              isShuffle ? 'text-white' : 'text-white/45 hover:text-white/90'
            }`}
            title={isShuffle ? 'Disable shuffle' : 'Enable shuffle'}
          >
            <Shuffle className="w-[18px] h-[18px]" />
            {isShuffle && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />
            )}
          </button>

          {/* Previous */}
          <button
            onClick={prevTrack}
            className="p-2 text-white/85 hover:text-white active:scale-90 transition-all cursor-pointer"
            title="Previous track"
          >
            <SkipBack className="w-7 h-7 fill-current" />
          </button>

          {/* Pure White High-Contrast Tactile Play / Pause */}
          <button
            onClick={togglePlay}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white hover:bg-neutral-100 hover:scale-[1.04] active:scale-95 text-[#09090b] flex items-center justify-center shadow-[0_14px_38px_rgba(0,0,0,0.55)] transition-all cursor-pointer"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 sm:w-7 sm:h-7 fill-[#09090b] text-[#09090b]" />
            ) : (
              <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-[#09090b] text-[#09090b] ml-0.5" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={nextTrack}
            className="p-2 text-white/85 hover:text-white active:scale-90 transition-all cursor-pointer"
            title="Next track"
          >
            <SkipForward className="w-7 h-7 fill-current" />
          </button>

          {/* Repeat */}
          <button
            onClick={toggleRepeat}
            className={`relative p-2.5 rounded-full transition-colors cursor-pointer ${
              repeatMode !== 'off' ? 'text-white' : 'text-white/45 hover:text-white/90'
            }`}
            title={
              repeatMode === 'off'
                ? 'Enable repeat'
                : repeatMode === 'all'
                ? 'Enable repeat one'
                : 'Disable repeat'
            }
          >
            <Repeat className="w-[18px] h-[18px]" />
            {repeatMode !== 'off' && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />
            )}
            {isRepeatOne && (
              <span className="absolute top-1.5 right-1 text-[8px] font-black leading-none bg-white text-black rounded-full px-1 py-[1px]">
                1
              </span>
            )}
          </button>
        </div>

        {/* Minimalist Bottom Utility Bar (Equalizer & Tactile Volume) */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.07] text-xs">
          <button
            onClick={() => setIsEqModalOpen(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
              isEqEnabled
                ? 'bg-white/12 border-white/20 text-white font-medium'
                : 'bg-white/[0.04] hover:bg-white/[0.09] border-white/[0.07] text-white/60 hover:text-white'
            }`}
            title="Open Studio Equalizer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isEqEnabled ? 'Equalizer · On' : 'Equalizer'}</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
              className="text-white/55 hover:text-white transition-colors cursor-pointer"
              title={volume === 0 ? 'Unmute' : 'Mute'}
            >
              {volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <div className="relative w-24 h-4 flex items-center">
              <div className="w-full h-1 bg-white/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/90 rounded-full"
                  style={{ width: `${Math.round(volume * 100)}%` }}
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
                aria-label="Volume"
              />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
