import React, { useState, useEffect } from 'react';
import {
  X,
  Crown,
  Copy,
  Check,
  Laptop,
  Smartphone,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Heart,
  Music,
  Share2,
  ExternalLink,
} from 'lucide-react';
import { UserProfile, ActiveDevice, fetchDevices, logoutDevice, clearUserProfile } from '../services/api';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onLogout: () => void;
  likedCount: number;
  playlistsCount: number;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onLogout,
  likedCount,
  playlistsCount,
}) => {
  const [devices, setDevices] = useState<ActiveDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [loggingOutDeviceId, setLoggingOutDeviceId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDevices();
    }
  }, [isOpen]);

  const loadDevices = async () => {
    setLoadingDevices(true);
    try {
      const res = await fetchDevices();
      setDevices(res.devices || []);
    } catch {
      setDevices([]);
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleCopyKey = () => {
    if (!userProfile?.formattedKey) return;
    navigator.clipboard.writeText(userProfile.formattedKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyLoginLink = () => {
    if (!userProfile?.licenceKey) return;
    const link = `${window.location.origin}/?activate_key=${userProfile.licenceKey}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleLogoutDevice = async (deviceId: string) => {
    setLoggingOutDeviceId(deviceId);
    try {
      const ok = await logoutDevice(deviceId);
      if (ok) {
        setDevices((prev) => prev.filter((d) => d.device_id !== deviceId));
      }
    } catch {}
    setLoggingOutDeviceId(null);
  };

  if (!isOpen || !userProfile) return null;

  const initials = `${userProfile.firstName?.[0] || 'V'}${userProfile.surname?.[0] || 'P'}`.toUpperCase();
  const isLifetime = userProfile.plan === 'lifetime';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-[#12121a] border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header Banner */}
        <div className="relative p-6 pb-5 bg-gradient-to-br from-purple-900/60 via-[#181824] to-[#12121a] border-b border-white/5">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 shadow-xl shadow-purple-500/20 text-white font-black text-2xl tracking-wider border-2 border-white/20">
              {initials}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-md">
                <Crown className="w-3.5 h-3.5 fill-black" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center gap-1">
                  <Crown className="w-3 h-3 fill-amber-300" />
                  {isLifetime ? 'Lifetime VIP Access' : 'Annual VIP'}
                </span>
                <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Active
                </span>
              </div>
              <h2 className="text-xl font-bold text-white truncate">
                {userProfile.firstName} {userProfile.surname}
              </h2>
              <p className="text-xs text-neutral-400 font-mono">
                {userProfile.mobile ? `+91 ${userProfile.mobile}` : ''}
                {userProfile.email ? ` • ${userProfile.email}` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm custom-scrollbar">
          {/* Cloud Sync Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
              <Heart className="w-5 h-5 text-pink-400 mx-auto mb-1" />
              <div className="text-lg font-black text-white">{likedCount}</div>
              <div className="text-[11px] text-neutral-400 font-medium">Liked Songs</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
              <Music className="w-5 h-5 text-purple-400 mx-auto mb-1" />
              <div className="text-lg font-black text-white">{playlistsCount}</div>
              <div className="text-[11px] text-neutral-400 font-medium">Playlists</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
              <Laptop className="w-5 h-5 text-indigo-400 mx-auto mb-1" />
              <div className="text-lg font-black text-white">{devices.length} / 5</div>
              <div className="text-[11px] text-neutral-400 font-medium">Devices Active</div>
            </div>
          </div>

          {/* Licence Key Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/30 via-indigo-900/20 to-transparent border border-purple-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">
                Option 1 VIP Licence Key
              </span>
              <span className="text-[11px] text-neutral-400">
                {isLifetime ? 'Never Expires' : userProfile.expiresAt ? `Valid till ${new Date(userProfile.expiresAt).toLocaleDateString()}` : 'Active'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10 font-mono text-base font-bold text-white tracking-widest">
              <span>{userProfile.formattedKey}</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopyKey}
                  className="px-2.5 py-1 text-xs font-sans rounded-lg bg-white/10 hover:bg-white/20 text-neutral-200 transition-colors flex items-center gap-1.5"
                  title="Copy Key"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleCopyLoginLink}
                  className="px-2.5 py-1 text-xs font-sans rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/30 transition-colors flex items-center gap-1.5"
                  title="Copy Auto-Login Link"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Link Copied' : 'Share Link'}</span>
                </button>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-neutral-400">
              💡 Use this key on your phone, laptop, or Android app to instantly sync all your playlists and liked songs!
            </p>
          </div>

          {/* Active Connected Devices Section */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Connected Devices ({devices.length} / 5)
              </h3>
              <button
                onClick={loadDevices}
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                Refresh
              </button>
            </div>

            <div className="space-y-2">
              {loadingDevices ? (
                <div className="py-4 text-center text-xs text-neutral-500">Loading devices...</div>
              ) : devices.length === 0 ? (
                <div className="py-3 text-center text-xs text-neutral-500">No active devices found.</div>
              ) : (
                devices.map((device) => {
                  const isMobile = /Android|iPhone|iOS/i.test(device.device_name);
                  return (
                    <div
                      key={device.device_id}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-white/5 text-purple-300">
                          {isMobile ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-semibold text-white text-xs">{device.device_name}</div>
                          <div className="text-[10px] text-neutral-500 font-mono">
                            ID: {device.device_id.substring(0, 16)}... • {new Date(device.last_active_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleLogoutDevice(device.device_id)}
                        disabled={loggingOutDeviceId === device.device_id}
                        className="px-2.5 py-1 text-xs text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Remove device"
                      >
                        {loggingOutDeviceId === device.device_id ? 'Removing...' : 'Log Out'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-black/40 border-t border-white/5 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out on this Device</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
