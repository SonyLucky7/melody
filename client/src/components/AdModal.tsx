import React, { useState, useEffect } from 'react';
import { Volume2, Play, Crown, Sparkles, X, ExternalLink, ShieldCheck } from 'lucide-react';

export type AdReason = 'guest_launch' | 'guest_30m' | 'annual_60m' | 'lifetime_180m';

interface AdModalProps {
  isOpen: boolean;
  reason: AdReason;
  onAdCompleted: () => void;
  onOpenUpgrade?: () => void;
}

export const AdModal: React.FC<AdModalProps> = ({
  isOpen,
  reason,
  onAdCompleted,
  onOpenUpgrade,
}) => {
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

    // Attempt to push Google AdSense ad if adsbygoogle script is loaded
    try {
      if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      }
    } catch (e) {
      // Ignore if AdSense blocked by adblocker
    }

    return () => clearInterval(timer);
  }, [isOpen, reason]);

  if (!isOpen) return null;

  const getReasonInfo = () => {
    switch (reason) {
      case 'guest_launch':
        return {
          badge: 'GUEST FREE PASS',
          badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
          title: 'Welcome to Melody',
          desc: 'Watch this quick sponsor showcase to unlock 30 minutes of free, uninterrupted studio-quality music streaming.',
          rewardText: 'Unlocks 30 Mins Free Music',
        };
      case 'guest_30m':
        return {
          badge: '30-MIN LISTENING BREAK',
          badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
          title: '30 Minutes of Music Completed',
          desc: 'Enjoying your tunes? Complete this quick sponsor message to unlock your next 30 minutes of continuous music.',
          rewardText: 'Unlocks Next 30 Mins',
        };
      case 'annual_60m':
        return {
          badge: 'ANNUAL VIP SPONSOR BREAK',
          badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
          title: '1 Hour of Music Completed',
          desc: 'You have completed 1 hour of listening. Thank you for supporting artists with your Annual VIP membership.',
          rewardText: 'Resets 1-Hour Timer',
        };
      case 'lifetime_180m':
        return {
          badge: 'LIFETIME VIP MILESTONE',
          badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
          title: '3 Hours Cumulative Music Completed',
          desc: 'You have listened to 180 total minutes of music across sessions. Your Lifetime priority access will continue uninterrupted.',
          rewardText: 'Resets 3-Hour Cumulative Period',
        };
    }
  };

  const info = getReasonInfo();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#141419] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${info.badgeColor}`}>
              {info.badge}
            </span>
            <span className="text-xs text-white/50 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Verified Sponsor
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!canSkip ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-semibold">
                <span>Reward in</span>
                <span className="w-4 text-center text-emerald-400 font-bold">{countdown}s</span>
              </div>
            ) : (
              <button
                onClick={onAdCompleted}
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-lg shadow-emerald-500/20"
              >
                <span>Continue</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content Container */}
        <div className="p-6 flex flex-col items-center text-center">
          <h2 className="text-xl font-bold text-white mb-2">{info.title}</h2>
          <p className="text-sm text-white/70 max-w-md mb-6">{info.desc}</p>

          {/* Ad Slot Canvas: Google AdSense or Animated Premium Sponsor Display */}
          <div className="w-full h-56 rounded-xl bg-gradient-to-br from-[#1a1a24] to-[#0d0d12] border border-white/10 relative overflow-hidden flex flex-col items-center justify-center p-6 group">
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-purple-500/10 to-blue-500/10 opacity-70 group-hover:opacity-100 transition-opacity" />

            {/* Google AdSense Responsive Slot (Active when user links their AdSense Publisher ID) */}
            <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
              <ins
                className="adsbygoogle"
                style={{ display: 'block', width: '100%', height: '100%' }}
                data-ad-client="ca-pub-3940256099942544"
                data-ad-slot="1033173712"
                data-ad-format="auto"
                data-full-width-responsive="true"
              />

              {/* High-Fidelity Melody Interactive Creative Showcase */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-xl shadow-emerald-500/20 mb-3 animate-pulse">
                  <Sparkles className="w-8 h-8 text-black" />
                </div>
                <div className="text-base font-extrabold text-white tracking-wide">
                  Experience Melody Studio Lossless
                </div>
                <div className="text-xs text-white/60 mt-1 max-w-xs text-center">
                  Stream in pristine 320 kbps Master Quality with instant sub-second playback and zero buffering.
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
            {onOpenUpgrade && (reason === 'guest_launch' || reason === 'guest_30m') ? (
              <button
                type="button"
                onClick={() => {
                  onAdCompleted();
                  onOpenUpgrade();
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition"
              >
                <Crown className="w-4 h-4" />
                <span>Remove ads with VIP (from ₹49)</span>
              </button>
            ) : (
              <span className="text-[11px] text-white/40">Melody Audio Network</span>
            )}

            <button
              type="button"
              disabled={!canSkip}
              onClick={onAdCompleted}
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
