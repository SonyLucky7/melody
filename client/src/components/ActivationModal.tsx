import React, { useState } from 'react';
import { X, Key, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import { activateLicence, requestFreeLicence } from '../services/api';

interface ActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivated: () => void;
  onDeviceLimitReached?: (devices: any[]) => void;
}

export const ActivationModal: React.FC<ActivationModalProps> = ({
  isOpen,
  onClose,
  onActivated,
  onDeviceLimitReached,
}) => {
  const [tab, setTab] = useState<'activate' | 'generate'>('activate');

  // Activation Tab
  const [keyInput, setKeyInput] = useState('');
  const [deviceName, setDeviceName] = useState('My Device');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Free Generation Tab
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [mobile, setMobile] = useState('');

  if (!isOpen) return null;

  const handleActivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) return;

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { status, data } = await activateLicence(keyInput.trim(), deviceName);

      if (status === 200 && data.success) {
        setSuccessMsg(data.message || 'Device activated successfully!');
        setTimeout(() => {
          onActivated();
          onClose();
        }, 1200);
      } else if (status === 403 && data.error === 'DEVICE_LIMIT_REACHED') {
        onClose();
        if (onDeviceLimitReached) onDeviceLimitReached(data.devices || []);
      } else {
        setErrorMsg(data.message || 'Activation failed. Please check your key.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Server connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !surname.trim() || !mobile.trim()) {
      setErrorMsg('Please fill in First Name, Surname and Mobile.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await requestFreeLicence(firstName, surname, mobile);
      if (res.success && res.data?.formattedKey) {
        setKeyInput(res.data.formattedKey);
        setTab('activate');
        setSuccessMsg(`Generated key: ${res.data.formattedKey}. Click Activate!`);
      } else {
        setErrorMsg(res.message || 'Failed to issue free key.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#16161d] border border-[#2a2a38] rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-sm">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Licence Key Activation</h3>
            <p className="text-xs text-neutral-400">12-character device licence key</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#0f0f13] p-1 rounded-xl mb-4 border border-[#242432]">
          <button
            onClick={() => { setTab('activate'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              tab === 'activate' ? 'bg-blue-600 text-white shadow' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Activate Key
          </button>
          <button
            onClick={() => { setTab('generate'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === 'generate' ? 'bg-blue-600 text-white shadow' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            Get Free Key
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {tab === 'activate' ? (
          <form onSubmit={handleActivateSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                Licence Key (Format: RAHS-HA98-7654)
              </label>
              <input
                type="text"
                placeholder="e.g. RAHS-HA98-7654"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value.toUpperCase())}
                className="w-full bg-[#0f0f13] border border-[#2a2a38] focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white tracking-widest placeholder:text-neutral-600 outline-none transition-colors"
                maxLength={14}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                Device Name
              </label>
              <input
                type="text"
                placeholder="e.g. Chrome on Windows, Pixel 9"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                className="w-full bg-[#0f0f13] border border-[#2a2a38] focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-neutral-600 outline-none transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50"
            >
              {loading ? 'Activating Device...' : 'Activate Device'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleGenerateSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">First Name</label>
              <input
                type="text"
                placeholder="e.g. Rahul"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-[#0f0f13] border border-[#2a2a38] focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Surname</label>
              <input
                type="text"
                placeholder="e.g. Sharma"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                className="w-full bg-[#0f0f13] border border-[#2a2a38] focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Mobile Number</label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full bg-[#0f0f13] border border-[#2a2a38] focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Free Licence Key'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
