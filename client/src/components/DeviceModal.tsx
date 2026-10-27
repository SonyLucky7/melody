import React, { useState, useEffect } from 'react';
import { X, Laptop, Smartphone, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { ActiveDevice } from '../types';
import { fetchDevices, logoutDevice } from '../services/api';

interface DeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  devicesList?: ActiveDevice[];
  onSlotFreed?: () => void;
}

export const DeviceModal: React.FC<DeviceModalProps> = ({
  isOpen,
  onClose,
  devicesList,
  onSlotFreed,
}) => {
  const [devices, setDevices] = useState<ActiveDevice[]>(devicesList || []);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (devicesList && devicesList.length > 0) {
        setDevices(devicesList);
      } else {
        loadDevices();
      }
    }
  }, [isOpen, devicesList]);

  const loadDevices = async () => {
    setLoading(true);
    const devs = await fetchDevices();
    setDevices(devs);
    setLoading(false);
  };

  if (!isOpen) return null;

  const handleLogout = async (deviceId: string) => {
    setLoading(true);
    const ok = await logoutDevice(deviceId);
    if (ok) {
      setStatusMsg(`Device logged out. A slot has been freed!`);
      setDevices((prev) => prev.filter((d) => d.device_id !== deviceId));
      if (onSlotFreed) onSlotFreed();
    } else {
      setStatusMsg('Failed to log out device.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#16161d] border border-[#2a2a38] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Active Devices</h3>
            <p className="text-xs text-neutral-400">5 Devices Max per licence. Log out one to play here.</p>
          </div>
        </div>

        {statusMsg && (
          <div className="mb-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        <div className="space-y-2 max-h-72 overflow-y-auto my-3 pr-1">
          {devices.map((d) => {
            const isMobile = d.device_name.toLowerCase().includes('phone') || d.device_name.toLowerCase().includes('android');
            return (
              <div
                key={d.device_id}
                className="flex items-center justify-between p-3 rounded-xl bg-[#0f0f13] border border-[#242432]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-400">
                    {isMobile ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white">{d.device_name}</span>
                    <span className="text-[11px] text-neutral-500">
                      Last active: {new Date(d.last_active_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleLogout(d.device_id)}
                  disabled={loading}
                  className="px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all hover:scale-105"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Log out</span>
                </button>
              </div>
            );
          })}

          {devices.length === 0 && (
            <div className="py-8 text-center text-sm text-neutral-500">
              No active devices found.
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs rounded-xl transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};
