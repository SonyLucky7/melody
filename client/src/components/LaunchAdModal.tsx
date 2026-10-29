import React, { useState, useEffect } from 'react';
import { Sparkles, X, Play, ShieldCheck } from 'lucide-react';

interface LaunchAdModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LaunchAdModal: React.FC<LaunchAdModalProps> = ({ isOpen, onClose }) => {
  const [countdown, setCountdown] = useState<number>(5);
  const [canSkip, setCanSkip] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(5);
      setCanSkip(false);
      return;
    }

    setCountdown(5);
    setCanSkip(false);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Push Google AdSense ad if adsbygoogle script is loaded
    try {
      if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      }
    } catch {}

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#141419] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              SPONSOR MESSAGE
            </span>
            <span className="text-xs text-white/50 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Verified Sponsor
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!canSkip ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-semibold">
                <span>Unlock in</span>
                <span className="w-4 text-center text-emerald-400 font-bold">{countdown}s</span>
              </div>
            ) : (
              <button
                onClick={onClose}
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <span>Enter Melody</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content Container */}
        <div className="p-6 flex flex-col items-center text-center">
          <h2 className="text-xl font-bold text-white mb-2">Welcome to Melody</h2>
          <p className="text-sm text-white/70 max-w-md mb-6">
            100% Free Studio-Quality Music Streaming with zero subscription fees.
          </p>

          {/* Ad Slot Canvas: Google AdSense / Sponsor Creative */}
          <div className="w-full h-56 rounded-xl bg-gradient-to-br from-[#1a1a24] to-[#0d0d12] border border-white/10 relative overflow-hidden flex flex-col items-center justify-center p-6 group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-emerald-500/10 to-indigo-500/10 opacity-70 group-hover:opacity-100 transition-opacity" />

            {/* Google AdSense Responsive Slot */}
            <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
              <ins
                className="adsbygoogle"
                style={{ display: 'block', width: '100%', height: '100%' }}
                data-ad-client="ca-pub-2649114568233395"
                data-ad-slot="1033173712"
                data-ad-format="auto"
                data-full-width-responsive="true"
              />

              {/* High-Fidelity Melody Sponsor Showcase */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-xl shadow-purple-600/30 mb-3 animate-pulse">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div className="text-base font-extrabold text-white tracking-wide">
                  Melody Master Audio
                </div>
                <div className="text-xs text-white/60 mt-1 max-w-xs text-center">
                  Stream thousands of top tracks in pristine 320 kbps studio sound with zero playback limits.
                </div>
              </div>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="w-full mt-4 bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${((5 - countdown) / 5) * 100}%` }}
            />
          </div>

          {/* Actions Footer */}
          <div className="w-full flex items-center justify-between mt-6 pt-4 border-t border-white/5">
            <span className="text-[11px] text-white/40">Melody Audio Network • 100% Free</span>

            <button
              type="button"
              disabled={!canSkip}
              onClick={onClose}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                canSkip
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 cursor-pointer'
                  : 'bg-white/10 text-white/40 cursor-not-allowed'
              }`}
            >
              <span>{canSkip ? 'Continue to Music' : `Waiting (${countdown}s)`}</span>
              {canSkip && <Play className="w-3.5 h-3.5 fill-current" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
