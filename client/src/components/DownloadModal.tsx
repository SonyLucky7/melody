import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Tv,
  Monitor,
  Apple,
  Download,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Zap,
  Sparkles,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PlatformTab = 'android' | 'tv' | 'windows' | 'mac' | 'ios';

export const DownloadModal: React.FC<DownloadModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<PlatformTab>('android');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const apkUrl = '/Melody-v1.0.8.apk';

  const copyUrl = () => {
    const fullUrl = `${window.location.origin}${apkUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div
        className="relative w-full max-w-2xl bg-[#121218] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative px-5 py-4 sm:px-6 sm:py-5 border-b border-white/5 bg-gradient-to-r from-purple-950/60 via-[#181822] to-neutral-900/60 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="/Melody-AppIcon-1024.png"
              alt="Melody Icon"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl shadow-lg border border-white/10 object-cover"
            />
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                Download Melody
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  v1.0.8
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Experience studio lossless music across all your devices
              </p>
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

        {/* Platform Selector Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 px-4 pt-3 pb-2 bg-[#0d0d12] border-b border-white/5 overflow-x-auto custom-scrollbar flex-shrink-0">
          <button
            onClick={() => setActiveTab('android')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'android'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Android</span>
          </button>

          <button
            onClick={() => setActiveTab('tv')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'tv'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>Google & Android TV</span>
          </button>

          <button
            onClick={() => setActiveTab('windows')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'windows'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>Windows PC</span>
          </button>

          <button
            onClick={() => setActiveTab('mac')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'mac'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Apple className="w-4 h-4" />
            <span>macOS</span>
          </button>

          <button
            onClick={() => setActiveTab('ios')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'ios'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Apple className="w-4 h-4" />
            <span>iOS (iPhone / iPad)</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
          {/* 1. ANDROID */}
          {activeTab === 'android' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">Melody for Android</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Official APK
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300">
                    Android 8.0 to Android 15 • 12 MB • 320k FLAC Audio
                  </p>
                </div>

                <a
                  href={apkUrl}
                  download="Melody-v1.0.8.apk"
                  className="w-full sm:w-auto px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 active:scale-95 text-white font-black text-sm shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download APK (v1.0.8)</span>
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Lossless Offline Storage</h4>
                    <p className="text-[11px] text-neutral-400">
                      Save tracks directly to your app library for 0-data playback.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Lock Screen & Widgets</h4>
                    <p className="text-[11px] text-neutral-400">
                      Home screen widget, Bluetooth auto-resume, lock screen controls.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white">0ms Hardware Back Nav</h4>
                    <p className="text-[11px] text-neutral-400">
                      Smooth navigation stack that never quits unexpectedly.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Equalizer & Visualizers</h4>
                    <p className="text-[11px] text-neutral-400">
                      6-band parametric EQ, Vinyl Turntable & Radial spectrum modes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center pt-1">
                <button
                  onClick={copyUrl}
                  className="text-xs text-neutral-400 hover:text-white underline transition-colors"
                >
                  {copied ? 'Direct link copied!' : 'Copy direct download link to clipboard'}
                </button>
              </div>
            </div>
          )}

          {/* 2. GOOGLE & ANDROID TV */}
          {activeTab === 'tv' && (
            <div className="space-y-4">
              {/* Living Room TV Mockup Banner */}
              <div className="relative w-full h-44 sm:h-52 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                <img
                  src="/Melody-Android-TV-Preview.jpg"
                  alt="Melody on Google TV and Android TV"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/20 pointer-events-none" />
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-purple-600/80 text-white">
                      10-Foot Leanback Experience
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1">Melody for Smart TVs</h3>
                  </div>
                  <span className="text-xs font-mono text-purple-300 bg-black/60 px-2 py-1 rounded border border-white/10">
                    4K HDR 320k
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">Melody for Android TV & Google TV</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      Leanback Supported
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300">
                    Supports Sony Bravia, Mi TV, TCL, OnePlus TV, Chromecast with Google TV & Fire TV
                  </p>
                </div>

                <a
                  href={apkUrl}
                  download="Melody-v1.0.8.apk"
                  className="w-full sm:w-auto px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:brightness-110 active:scale-95 text-white font-black text-sm shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download TV APK</span>
                </a>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <Tv className="w-4 h-4 text-purple-400" />
                  How to Install on Your Smart TV
                </h4>
                <ol className="text-xs text-neutral-300 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>
                    Download the <strong className="text-white">Melody TV APK</strong> on your phone or PC.
                  </li>
                  <li>
                    Install the free app <strong className="text-purple-300">"Send Files to TV"</strong> (SFTV) from Google Play Store on both your phone and TV.
                  </li>
                  <li>
                    Send the downloaded APK from your phone to your TV and click <strong className="text-white">Install</strong>.
                  </li>
                  <li>
                    Open <strong className="text-white">Melody</strong> from your TV Apps row and enjoy lossless 320k sound with your home theater / soundbar!
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* 3. WINDOWS */}
          {activeTab === 'windows' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">Melody for Windows (10 & 11)</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Standalone App
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300">
                    Keyboard Media Keys • Hardware Equalizer • Taskbar Controls
                  </p>
                </div>

                <button
                  onClick={() => {
                    const prompt = (window as any).deferredPrompt;
                    if (prompt) {
                      prompt.prompt();
                    } else {
                      alert('To install on Windows: Open this website in Microsoft Edge or Google Chrome, click the "Install Melody" icon in the URL address bar or Settings menu!');
                    }
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 active:scale-95 text-white font-black text-sm shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Monitor className="w-4 h-4" />
                  <span>Install for Windows</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5 space-y-2.5">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <Zap className="w-4 h-4 text-purple-400" />
                  Instant 1-Click Windows App Setup
                </h4>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  In your browser's address bar (Edge or Chrome), click the{' '}
                  <strong className="text-white">"Install app" icon</strong> (or press{' '}
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">
                    Menu → Apps → Install Melody
                  </kbd>
                  ). Melody installs as an isolated native desktop program with zero window lag and media key control!
                </p>
              </div>
            </div>
          )}

          {/* 4. MACOS */}
          {activeTab === 'mac' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-white">Melody for macOS</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-neutral-700 text-neutral-200">
                    Sonoma / Ventura / Sequoia
                  </span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Install Melody into your Mac Applications folder with full Touch Bar, Control Center, and Lock Screen media support.
                </p>

                <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-white/5 space-y-2 text-xs text-neutral-300">
                  <p className="font-bold text-white">Safari Instructions (macOS Sonoma+):</p>
                  <p>1. Open this page in Safari</p>
                  <p>2. Click <strong className="text-white">File</strong> in the top menu bar</p>
                  <p>3. Select <strong className="text-purple-300">"Add to Dock..."</strong></p>
                  <p>4. Launch Melody directly from your Mac Dock like Spotify!</p>
                </div>
              </div>
            </div>
          )}

          {/* 5. IOS */}
          {activeTab === 'ios' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-white">Melody for iPhone & iPad</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-neutral-700 text-neutral-200">
                    iOS Web App
                  </span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Install Melody directly onto your iOS Home Screen for a 100% full-screen native app experience without Safari address bars:
                </p>

                <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-white/5 space-y-2.5 text-xs text-neutral-300">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-300 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Open <strong className="text-white">melody-chi-nine.vercel.app</strong> in{' '}
                      <strong className="text-white">Safari</strong>.
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-300 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Tap the <strong className="text-purple-300">Share button</strong> (the square with an arrow pointing up at the bottom).
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-300 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      Scroll down and tap <strong className="text-white">"Add to Home Screen"</strong>.
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-300 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                      4
                    </span>
                    <span>
                      Tap <strong className="text-purple-300">Add</strong> in top right. Melody appears on your iPhone Home Screen with high-res icon!
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 sm:px-6 bg-[#0a0a0e] border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-400 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-purple-300">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>100% Verified Safe & Virus-Free</span>
          </div>
          <span>Melody Free Studio Audio</span>
        </div>
      </div>
    </div>
  );
};
