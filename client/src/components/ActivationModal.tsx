import React, { useState } from 'react';
import {
  X,
  Key,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  MessageCircle,
  Send,
  Mail,
  Sparkles,
  Check,
} from 'lucide-react';
import { activateLicence } from '../services/api';

interface ActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivated: () => void;
  onDeviceLimitReached?: (devices: any[]) => void;
  initialTab?: string;
  onOpenHelp?: () => void;
}

export const ActivationModal: React.FC<ActivationModalProps> = ({
  isOpen,
  onClose,
  onActivated,
  onDeviceLimitReached,
}) => {
  const [loginKey, setLoginKey] = useState('');
  const [deviceName, setDeviceName] = useState(() => {
    if (typeof window !== 'undefined' && navigator.userAgent) {
      if (/Android/i.test(navigator.userAgent)) return 'Android Device';
      if (/iPhone|iPad/i.test(navigator.userAgent)) return 'iOS Device';
      if (/Mac/i.test(navigator.userAgent)) return 'Mac Web Player';
      if (/Windows/i.test(navigator.userAgent)) return 'Windows Web Player';
    }
    return 'Web Player';
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedDiscord, setCopiedDiscord] = useState(false);

  if (!isOpen) return null;

  const handleCopyDiscord = () => {
    navigator.clipboard.writeText('karmaa_07');
    setCopiedDiscord(true);
    setTimeout(() => setCopiedDiscord(false), 2000);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const clean = loginKey.trim().replace(/[\s-]/g, '').toUpperCase();
    if (clean.length < 6) {
      setErrorMsg('Please enter a valid Licence Key.');
      return;
    }

    setLoading(true);
    try {
      const res = await activateLicence(clean, deviceName.trim());
      if (res.success) {
        setSuccessMsg(res.message || 'Logged in successfully! Your playlists and liked songs are synced.');
        setTimeout(() => {
          onActivated();
          onClose();
        }, 1200);
      } else {
        if (res.error === 'DEVICE_LIMIT_REACHED' && res.devices) {
          if (onDeviceLimitReached) {
            onDeviceLimitReached(res.devices);
            onClose();
            return;
          }
        }
        setErrorMsg(res.message || 'Failed to authenticate key.');
      }
    } catch (err: any) {
      const resp = err.response?.data;
      if (resp?.error === 'DEVICE_LIMIT_REACHED' && resp?.devices) {
        if (onDeviceLimitReached) {
          onDeviceLimitReached(resp.devices);
          onClose();
          return;
        }
      }
      setErrorMsg(resp?.message || 'Network error connecting to Melody Cloud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#121218] border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30 flex-shrink-0">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">
              Melody Account & Cloud Sync
            </h3>
            <p className="text-xs text-neutral-400">
              Restore your custom playlists, liked songs & profile
            </p>
          </div>
        </div>

        {/* Global Feedback Banners */}
        {errorMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Content */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
              Licence Key (Format: RAHS-HA98-7654)
            </label>
            <input
              type="text"
              placeholder="e.g. RAHS-HA98-7654"
              value={loginKey}
              onChange={(e) => setLoginKey(e.target.value.toUpperCase())}
              className="w-full bg-[#0a0a0f] border border-white/10 focus:border-purple-500 rounded-xl px-3 py-2.5 text-sm font-mono text-white tracking-widest placeholder:text-neutral-600 outline-none transition-colors"
              maxLength={16}
              required
              autoFocus
            />
            <p className="text-[10px] text-neutral-500 mt-1">
              Your personal key connects your cloud database across all devices.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
              Device Name
            </label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              className="w-full bg-[#0a0a0f] border border-white/10 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600 outline-none transition-colors"
              maxLength={30}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
              loading
                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                : 'bg-white text-black hover:bg-neutral-200 shadow-white/10 cursor-pointer hover:scale-[1.01]'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>{loading ? 'Authenticating...' : 'Log In & Sync Cloud Profile'}</span>
          </button>
        </form>

        {/* Free Cloud Perks Banner */}
        <div className="mt-4 p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs text-neutral-300 space-y-1.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
            <span className="font-semibold text-white">100% Free Forever</span>
          </div>
          <p className="text-[11px] text-neutral-400">
            All music, 320 kbps streaming, custom playlists, and offline downloads are completely free for everyone.
          </p>
        </div>

        {/* Support & Key Retrieval */}
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-400">
          <span>Need your key or support?</span>
          <button
            type="button"
            onClick={handleCopyDiscord}
            className="text-purple-400 hover:text-purple-300 font-semibold"
          >
            {copiedDiscord ? 'Copied Discord Handle!' : 'Discord: karmaa_07'}
          </button>
        </div>
      </div>
    </div>
  );
};
