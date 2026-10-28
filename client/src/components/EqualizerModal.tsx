import React from 'react';
import { X, RotateCcw, Sliders, Volume2, Sparkles } from 'lucide-react';
import { usePlayer, EQ_FREQUENCIES, EQ_BAND_LABELS, EQ_BAND_TYPES, EQ_PRESETS } from '../context/PlayerContext';

export const EqualizerModal: React.FC = () => {
  const {
    isEqEnabled,
    toggleEq,
    eqPreset,
    setEqPreset,
    eqBands,
    setEqBand,
    resetEq,
    isEqModalOpen,
    setIsEqModalOpen,
  } = usePlayer();

  if (!isEqModalOpen) return null;

  // Compute SVG spline curve points for visual frequency curve
  // Width: 460px, Height: 120px, 0dB is at y=60px
  // Gain -12dB -> y=105px, +12dB -> y=15px
  const svgWidth = 460;
  const svgHeight = 120;
  const points = eqBands.map((gain, i) => {
    const x = 35 + (i * (svgWidth - 70)) / (eqBands.length - 1);
    const clampedGain = isEqEnabled ? gain : 0;
    const y = 60 - (clampedGain / 12) * 45;
    return { x, y };
  });

  // Construct smooth SVG path
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const mx = (p0.x + p1.x) / 2;
    pathD += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  // Fill area path closing down to bottom
  const fillPathD = `${pathD} L ${points[points.length - 1].x} ${svgHeight} L ${points[0].x} ${svgHeight} Z`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-[#181818] border border-[#282828] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-[#1f1f1f]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#a855f7]/20 flex items-center justify-center text-[#a855f7]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                Equalizer
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/10 text-neutral-300">
                  Melody Studio DSP
                </span>
              </h2>
              <p className="text-xs text-[#b3b3b3]">Fine-tune 6-band studio frequency response</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Master Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#b3b3b3]">
                {isEqEnabled ? 'Enabled' : 'Bypassed'}
              </span>
              <button
                onClick={toggleEq}
                className={`w-11 h-6 rounded-full p-1 transition-colors relative ${
                  isEqEnabled ? 'bg-[#a855f7]' : 'bg-[#3e3e3e]'
                }`}
                title="Toggle Equalizer"
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    isEqEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <button
              onClick={() => setIsEqModalOpen(false)}
              className="text-[#b3b3b3] hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Preset Selector */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#b3b3b3]">Sound Presets</span>
              <button
                onClick={resetEq}
                className="text-xs text-[#b3b3b3] hover:text-white flex items-center gap-1 transition-colors"
                title="Reset to Flat"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {Object.keys(EQ_PRESETS).map((name) => {
                const isActive = eqPreset === name;
                return (
                  <button
                    key={name}
                    onClick={() => setEqPreset(name)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-[#a855f7] text-white shadow-lg shadow-purple-900/30 scale-105'
                        : 'bg-[#242424] text-[#b3b3b3] hover:text-white hover:bg-[#2e2e2e]'
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive SVG Frequency Spectrum Curve */}
          <div className="relative bg-[#121212] rounded-lg p-3 border border-white/5 overflow-hidden">
            <div className="absolute top-2 left-3 text-[10px] font-mono text-neutral-500 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#a855f7]" />
              Response Curve
            </div>
            <div className="absolute top-2 right-3 text-[10px] font-mono text-neutral-500">
              {isEqEnabled ? `${eqPreset} (${eqBands.map((g) => (g > 0 ? `+${g}` : g)).join(', ')} dB)` : 'Flat (Bypassed)'}
            </div>

            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-24 overflow-visible mt-3">
              {/* Reference Grid Lines */}
              <line x1="20" y1="15" x2={svgWidth - 20} y2="15" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
              <line x1="20" y1="60" x2={svgWidth - 20} y2="60" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <line x1="20" y1="105" x2={svgWidth - 20} y2="105" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />

              {/* Gradient Shading */}
              <defs>
                <linearGradient id="eqGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              <path d={fillPathD} fill="url(#eqGradient)" />
              <path
                d={pathD}
                fill="none"
                stroke={isEqEnabled ? '#a855f7' : '#777777'}
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Points */}
              {points.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  fill="#ffffff"
                  stroke="#a855f7"
                  strokeWidth="2"
                />
              ))}
            </svg>
          </div>

          {/* 6 Vertical Band Sliders */}
          <div className="grid grid-cols-6 gap-3 pt-2">
            {EQ_BAND_LABELS.map((label, idx) => {
              const gain = eqBands[idx] || 0;
              const type = EQ_BAND_TYPES[idx];

              return (
                <div key={label} className="flex flex-col items-center">
                  {/* Current Gain Value */}
                  <span
                    className={`text-xs font-mono font-bold mb-2 ${
                      gain > 0 ? 'text-[#a855f7]' : gain < 0 ? 'text-red-400' : 'text-[#b3b3b3]'
                    }`}
                  >
                    {gain > 0 ? `+${gain}` : gain}
                    <span className="text-[10px] text-neutral-500 font-normal">dB</span>
                  </span>

                  {/* Vertical Slider Track Container */}
                  <div className="relative h-44 w-8 flex items-center justify-center bg-[#121212] rounded-full border border-white/5 py-3">
                    {/* Center 0dB indicator notch */}
                    <div className="absolute top-1/2 left-1 right-1 h-[1px] bg-white/20 pointer-events-none" />

                    {/* Native Vertical Range Input */}
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="1"
                      value={gain}
                      disabled={!isEqEnabled}
                      onChange={(e) => setEqBand(idx, parseInt(e.target.value, 10))}
                      className="slider-vertical h-36 w-6 cursor-pointer appearance-none bg-transparent disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{
                        writingMode: 'vertical-lr',
                        direction: 'rtl',
                      }}
                    />
                  </div>

                  {/* Frequency Label */}
                  <span className="text-xs font-bold text-white mt-3">{label}</span>
                  <span className="text-[10px] uppercase font-semibold text-[#b3b3b3]">{type}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#121212] border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#b3b3b3]">
            <Volume2 className="w-4 h-4 text-[#a855f7]" />
            <span>High-fidelity 32-bit floating point DSP</span>
          </div>

          <button
            onClick={() => setIsEqModalOpen(false)}
            className="px-5 py-1.5 rounded-full bg-white hover:bg-neutral-200 text-black font-bold text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
