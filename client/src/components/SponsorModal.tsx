import React, { useState } from 'react';
import { X, Heart, ExternalLink, Copy, Check, ShieldCheck, Sparkles } from 'lucide-react';

interface SponsorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GITHUB_SPONSORS_URL = 'https://github.com/sponsors/SonyLucky7';
const BINANCE_USDT_ADDRESS = '0x992de9de5b80e98272e64a6f4cc3a49f4ec80198';

export const SponsorModal: React.FC<SponsorModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(BINANCE_USDT_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-[#121218] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-white/5 bg-gradient-to-r from-pink-950/50 via-[#181822] to-purple-950/50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-900/40">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                Sponsor Melody
                <Sparkles className="w-4 h-4 text-pink-400" />
              </h2>
              <p className="text-xs text-neutral-400">
                Support open-source development &amp; 24/7 high-speed servers
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar">
          {/* 1. GitHub Sponsors */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-transparent border border-pink-500/25 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  GitHub Sponsors
                </span>
                <h3 className="text-sm font-bold text-white mt-1.5">
                  Sponsor @SonyLucky7 on GitHub
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  One-time or monthly sponsorship directly via GitHub.
                </p>
              </div>
            </div>

            <a
              href={GITHUB_SPONSORS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:brightness-110 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-pink-900/30 flex items-center justify-center gap-2 transition-all"
            >
              <Heart className="w-4 h-4 fill-white" />
              <span>Sponsor on GitHub</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
          </div>

          {/* 2. Binance USDT (BEP20) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-[#181822] to-transparent border border-amber-500/25 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Binance Crypto
                </span>
                <h3 className="text-sm font-bold text-white mt-1.5">
                  Deposit USDT to Binance (BEP20)
                </h3>
              </div>
              <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30">
                BSC · BEP20
              </span>
            </div>

            {/* Crisp White QR Container */}
            <div className="flex flex-col items-center gap-2.5">
              <div className="p-3 bg-white rounded-2xl shadow-xl border-2 border-amber-400/30">
                <img
                  src="/binance-usdt-qr-compact.png"
                  alt="Binance USDT BEP20 QR Code"
                  className="w-44 h-44 sm:w-48 sm:h-48 object-contain"
                />
              </div>
              <span className="text-[11px] text-neutral-400">
                Scan with Binance or any BNB Smart Chain (BEP20) wallet
              </span>
            </div>

            {/* Network + Copyable Wallet Address */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-black/40 border border-white/5">
                <span className="text-neutral-400">Network</span>
                <span className="font-bold text-amber-300">BNB Smart Chain (BEP20)</span>
              </div>

              <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                    USDT Wallet Address
                  </span>
                  <button
                    onClick={handleCopyAddress}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      copied
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30'
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <p className="font-mono text-xs text-white break-all select-text bg-white/5 px-2.5 py-2 rounded-lg border border-white/5">
                  {BINANCE_USDT_ADDRESS}
                </p>
              </div>

              <p className="text-[11px] text-amber-200/70 text-center">
                Only send USDT via BNB Smart Chain (BEP20). Don&apos;t send NFTs to this address.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#0a0a0e] border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-400 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-pink-300">
            <ShieldCheck className="w-4 h-4 text-pink-400" />
            <span>100% Voluntary Open-Source Support</span>
          </div>
          <span>Thank you for supporting Melody!</span>
        </div>
      </div>
    </div>
  );
};
