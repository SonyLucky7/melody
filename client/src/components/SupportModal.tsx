import React, { useState } from 'react';
import {
  X,
  MessageCircle,
  Mail,
  Send,
  HelpCircle,
  RefreshCw,
  Check,
  ExternalLink,
  ShieldAlert,
  Headphones,
  CheckCircle2,
  Copy,
} from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResync?: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose, onResync }) => {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [resynced, setResynced] = useState(false);

  if (!isOpen) return null;

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('sonylucky46hac@gmail.com');
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleClearAndResync = () => {
    try {
      localStorage.removeItem('melody_cached_songs');
      localStorage.removeItem('melody_cached_playlists');
    } catch {}
    setResynced(true);
    if (onResync) onResync();
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div
        className="relative w-full max-w-lg bg-[#121218] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-white/5 bg-gradient-to-r from-purple-950/60 via-[#181822] to-neutral-900/60 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">Melody Support & Help</h2>
              <p className="text-xs text-neutral-400">Need help or facing playback issues? We're here for you.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar flex-1">
          {/* Option 1: Telegram Official Support */}
          <a
            href="https://t.me/MelodySongPlayerBot"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#229ED9]/20 text-[#229ED9] flex items-center justify-center flex-shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                  Telegram Instant Support
                </h3>
                <p className="text-xs text-neutral-400">
                  Chat directly with our automated bot & support channel
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-white flex-shrink-0 transition-colors" />
          </a>

          {/* Option 2: Email Direct Support */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.04] border border-white/10">
            <div className="flex items-center gap-3.5 min-w-0 pr-2">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div className="truncate">
                <h3 className="text-sm font-bold text-white truncate">Email Customer Support</h3>
                <p className="text-xs text-neutral-400 truncate">sonylucky46hac@gmail.com</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleCopyEmail}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-xs font-bold text-white transition-all flex items-center gap-1.5"
                title="Copy Email"
              >
                {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedEmail ? 'Copied' : 'Copy'}</span>
              </button>

              <a
                href="mailto:sonylucky46hac@gmail.com?subject=Melody%20Support%20Request"
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-all flex items-center gap-1"
              >
                <span>Write</span>
              </a>
            </div>
          </div>

          {/* Quick Troubleshooting & Cache Resync */}
          <div className="p-4 rounded-2xl bg-neutral-900/80 border border-white/5 space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider">
              <HelpCircle className="w-4 h-4 text-purple-400" />
              Quick Troubleshooting
            </h4>

            <div className="space-y-2 text-xs text-neutral-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Songs taking 2-3s to start?</strong> We run 5 load-balanced high-speed Telegram streaming bots. Once pre-buffered, subsequent tracks play in 0ms!
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Not seeing new tracks or playlists?</strong> Click the button below to clear cached data and pull fresh metadata from our cloud.
                </span>
              </div>
            </div>

            <button
              onClick={handleClearAndResync}
              disabled={resynced}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 active:scale-98 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 border border-white/10"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resynced ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{resynced ? 'Refreshing Melody Cloud...' : 'Clear Cache & Force Resync'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[#0a0a0e] border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-400 flex-shrink-0">
          <span>Melody Support Desk</span>
          <span className="text-purple-300 font-mono">24/7 Available</span>
        </div>
      </div>
    </div>
  );
};
