import React, { useState } from 'react';
import {
  X,
  Key,
  Crown,
  CheckCircle,
  AlertCircle,
  Smartphone,
  ShieldCheck,
  ExternalLink,
  MessageCircle,
  Send,
  Mail,
  ShoppingBag,
  Sparkles,
  Check,
} from 'lucide-react';
import { activateLicence } from '../services/api';

interface ActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivated: () => void;
  onDeviceLimitReached?: (devices: any[]) => void;
  initialTab?: 'vip' | 'login';
  onOpenHelp?: () => void;
}

export const ActivationModal: React.FC<ActivationModalProps> = ({
  isOpen,
  onClose,
  onActivated,
  onDeviceLimitReached,
  initialTab = 'vip',
  onOpenHelp,
}) => {
  const [tab, setTab] = useState<'vip' | 'login'>(initialTab);
  const [selectedPlanId, setSelectedPlanId] = useState<'annual' | 'lifetime'>('annual');

  // Login with Key State
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
    if (clean.length !== 12) {
      setErrorMsg('Please enter a valid 12-character Option 1 Licence Key (e.g. RAHS-HA98-7654).');
      return;
    }

    setLoading(true);
    try {
      const res = await activateLicence(clean, deviceName.trim());
      if (res.status === 200 && res.data.token) {
        setSuccessMsg('🎉 Key verified! VIP activated on this device.');
        setTimeout(() => {
          onActivated();
          onClose();
        }, 800);
      } else if (res.data.status === 'DEVICE_LIMIT_REACHED') {
        setErrorMsg('Device limit reached (max 5 active devices). You can remove an older device to continue.');
        if (onDeviceLimitReached && res.data.devices) {
          onDeviceLimitReached(res.data.devices);
        }
      } else {
        setErrorMsg(res.data.message || 'Invalid licence key. Please check your key or buy on digitalbros.qzz.io');
      }
    } catch {
      setErrorMsg('Failed to connect to authentication server. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-[#14141c] border border-purple-500/20 rounded-2xl w-full max-w-md p-5 shadow-2xl relative my-auto max-h-[94vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Top Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30 flex-shrink-0">
            {tab === 'vip' ? <Crown className="w-5 h-5 fill-white/20" /> : <Key className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">
              {tab === 'vip' ? 'Melody VIP Membership' : 'Log In with Licence Key'}
            </h3>
            <p className="text-xs text-neutral-400">
              {tab === 'vip'
                ? 'High-res 320kbps audio & 5 device playback'
                : 'Enter your 12-character Licence Key'}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#0a0a0f] p-1 rounded-xl mb-4 border border-white/5">
          <button
            onClick={() => {
              setTab('vip');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === 'vip'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/20'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-yellow-400" />
            <span>Get VIP Access</span>
          </button>
          <button
            onClick={() => {
              setTab('login');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === 'login'
                ? 'bg-[#282836] text-white shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-purple-400" />
            <span>Already Have a Key?</span>
          </button>
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

        {/* Body Content */}
        <div className="overflow-y-auto pr-0.5 flex-1 space-y-3.5">
          {/* TAB 1: GET VIP ACCESS (Buy on Store & Contact) */}
          {tab === 'vip' && (
            <div className="space-y-3.5">
              {/* Plan Selection Cards */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Annual Plan (₹49) */}
                <div
                  onClick={() => setSelectedPlanId('annual')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedPlanId === 'annual'
                      ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500/40'
                      : 'bg-[#0f0f15] border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-neutral-300">Annual VIP</span>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 px-1 py-0.5 rounded">
                      POPULAR
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-white">₹49</span>
                    <span className="text-xs text-neutral-500 line-through">₹199</span>
                    <span className="text-[11px] text-neutral-400 font-medium">/ 1 Year</span>
                  </div>
                </div>

                {/* Lifetime Plan (₹99) */}
                <div
                  onClick={() => setSelectedPlanId('lifetime')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedPlanId === 'lifetime'
                      ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500/40'
                      : 'bg-[#0f0f15] border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-neutral-300">Lifetime VIP</span>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded">
                      BEST
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-white">₹99</span>
                    <span className="text-xs text-neutral-500 line-through">₹499</span>
                    <span className="text-[11px] text-amber-400 font-medium">Forever</span>
                  </div>
                </div>
              </div>

              {/* VIP Benefits Checklist */}
              <div className="bg-[#0a0a0f] border border-white/5 rounded-xl p-3 space-y-1.5 text-xs text-neutral-300">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                  <span>Full Studio 320kbps High-Res Audio</span>
                </div>
                <div className="flex items-center gap-2">
                  <Smartphone className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                  <span>Listen on up to 5 Devices at the same time</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Personalized Option 1 Licence Key (Forever Access)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                  <span>Unlimited Offline Downloads on Phone & PC</span>
                </div>
              </div>

              {/* Primary Action Button: Buy on Official Store */}
              <a
                href="https://digitalbros.qzz.io/"
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 shadow-xl shadow-purple-600/30 transition-all group"
              >
                <ShoppingBag className="w-4 h-4 text-yellow-300 group-hover:scale-110 transition-transform" />
                <span>Buy Key on Official Store (digitalbros.qzz.io)</span>
                <ExternalLink className="w-4 h-4 opacity-75 group-hover:translate-x-0.5 transition-transform" />
              </a>

              {/* Contact for Key Section */}
              <div className="p-3 bg-gradient-to-r from-purple-900/15 to-indigo-900/15 border border-purple-500/20 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-purple-400" />
                    <span>Or Contact Directly for Instant Key:</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    1-Min Reply
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href="https://t.me/xO_HaC"
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-2.5 bg-[#0088cc]/20 hover:bg-[#0088cc]/30 border border-[#0088cc]/30 rounded-lg text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5 text-[#0088cc]" />
                    <span>Telegram: @xO_HaC</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyDiscord}
                    className="py-2 px-2.5 bg-[#5865F2]/20 hover:bg-[#5865F2]/30 border border-[#5865F2]/30 rounded-lg text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    title="Click to copy Discord handle"
                  >
                    {copiedDiscord ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <MessageCircle className="w-3.5 h-3.5 text-[#5865F2]" />}
                    <span>{copiedDiscord ? 'Copied!' : 'Discord: karmaa_07'}</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                  <a
                    href="mailto:sonylucky46hac@gmail.com?subject=Melody%20VIP%20Licence%20Key%20Request"
                    className="text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <Mail className="w-3 h-3 text-purple-400" />
                    <span>sonylucky46hac@gmail.com</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setTab('login')}
                    className="text-purple-400 hover:underline font-bold text-[11px]"
                  >
                    Enter Key &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LOGIN WITH LICENCE KEY */}
          {tab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
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
                  First 3 of First Name + First 3 of Surname + Last 6 digits of Mobile.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                  Device Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Windows Chrome, Pixel 9"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="w-full bg-[#0a0a0f] border border-white/10 focus:border-purple-500 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 outline-none transition-colors"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>Verifying Key...</span>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>Log In & Activate VIP</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <span className="text-xs text-neutral-500">Don't have a key yet? </span>
                <button
                  type="button"
                  onClick={() => setTab('vip')}
                  className="text-xs text-purple-400 font-bold hover:underline"
                >
                  Buy Key on digitalbros.qzz.io
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Support Link */}
        <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-400">
          <span>Need help or having issues?</span>
          {onOpenHelp ? (
            <button
              onClick={() => {
                onClose();
                onOpenHelp();
              }}
              className="text-purple-400 hover:underline font-bold"
            >
              Support Center
            </button>
          ) : (
            <a href="https://t.me/xO_HaC" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">
              @xO_HaC
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
