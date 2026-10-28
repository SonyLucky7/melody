import React from 'react';
import { X, HelpCircle, MessageSquare, Send, Mail, ShieldCheck, ChevronRight, Key, Laptop, Smartphone, ExternalLink } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenActivation?: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, onOpenActivation }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-[#14141c] border border-purple-500/20 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              Help & Support
            </h3>
            <p className="text-xs text-neutral-400">
              Community, payment verification & account assistance
            </p>
          </div>
        </div>

        {/* Support Channels Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* Discord Community */}
          <a
            href="https://discord.gg/melody"
            target="_blank"
            rel="noreferrer"
            className="p-3.5 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/30 hover:bg-[#5865F2]/20 transition-all flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <MessageSquare className="w-5 h-5 text-[#5865F2]" />
              <ExternalLink className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition-colors" />
            </div>
            <div>
              <div className="font-bold text-white text-xs">Discord Server</div>
              <div className="text-[10px] text-neutral-400 mt-0.5">24/7 Community & Support</div>
            </div>
          </a>

          {/* Telegram Channel */}
          <a
            href="https://t.me/melody_music_app"
            target="_blank"
            rel="noreferrer"
            className="p-3.5 rounded-xl bg-[#229ED9]/10 border border-[#229ED9]/30 hover:bg-[#229ED9]/20 transition-all flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <Send className="w-5 h-5 text-[#229ED9]" />
              <ExternalLink className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition-colors" />
            </div>
            <div>
              <div className="font-bold text-white text-xs">Telegram Support</div>
              <div className="text-[10px] text-neutral-400 mt-0.5">Music requests & updates</div>
            </div>
          </a>
        </div>

        {/* Email Support Card */}
        <div className="p-3 bg-[#0a0a0f] border border-white/5 rounded-xl flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <Mail className="w-4 h-4 text-purple-400" />
            <div>
              <span className="text-[10px] text-neutral-400 uppercase font-bold block">Official Email</span>
              <span className="text-xs font-mono font-medium text-white">sonylucky46hac@gmail.com</span>
            </div>
          </div>
          <a
            href="mailto:sonylucky46hac@gmail.com?subject=Melody%20Support%20Request"
            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Email Us
          </a>
        </div>

        {/* Frequently Asked Questions */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Frequently Asked Questions
          </h4>

          {/* FAQ Item 1: Option 1 Key */}
          <div className="p-3 rounded-xl bg-[#0a0a0f] border border-white/5 space-y-1">
            <div className="font-bold text-xs text-white flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-purple-400" />
              <span>How does my Licence Key work?</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Your 12-character key is created from your name and mobile number: <br />
              <span className="font-mono text-purple-300">First 3 of First Name + First 3 of Surname + Last 6 of Mobile</span>.
              Example: Rahul Sharma (9876543210) ➔ <span className="font-mono font-bold text-white">RAHS-HA54-3210</span>.
            </p>
          </div>

          {/* FAQ Item 2: UPI Payment & UTR */}
          <div className="p-3 rounded-xl bg-[#0a0a0f] border border-white/5 space-y-1">
            <div className="font-bold text-xs text-white flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>How to verify my UPI Payment?</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Scan the dynamic UPI QR code with any UPI app (GPay, PhonePe, Paytm, BHIM). After paying ₹49 (Annual) or ₹99 (Lifetime), find the <span className="font-bold text-white">12-digit UTR / UPI Ref No.</span> in your payment app and submit it to activate VIP instantly.
            </p>
          </div>

          {/* FAQ Item 3: 5 Devices */}
          <div className="p-3 rounded-xl bg-[#0a0a0f] border border-white/5 space-y-1">
            <div className="font-bold text-xs text-white flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-blue-400" />
              <span>How many devices can I use?</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              You can listen simultaneously on up to <span className="font-bold text-white">5 active devices</span> (Android, iPhone, Windows, Mac, Web). You can log out inactive devices anytime from the Manage Devices menu.
            </p>
          </div>
        </div>

        {/* Bottom Action */}
        <div className="mt-5 pt-3 border-t border-white/5 flex gap-2">
          {onOpenActivation && (
            <button
              onClick={() => {
                onClose();
                onOpenActivation();
              }}
              className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 transition-all"
            >
              Get VIP / Enter Key
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-neutral-300 font-bold text-xs rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
