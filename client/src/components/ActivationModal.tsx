import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Crown,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  QrCode,
  Smartphone,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';
import {
  activateLicence,
  fetchPaymentConfig,
  submitUpiPayment,
  PaymentPlan,
  PaymentConfigResponse,
} from '../services/api';

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

  // Payment State
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfigResponse | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<'annual' | 'lifetime'>('annual');
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [upiUtrRef, setUpiUtrRef] = useState('');
  const [step, setStep] = useState<'details' | 'pay' | 'success'>('details');
  const [issuedKey, setIssuedKey] = useState<{ formatted: string; raw: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

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

  // Fetch payment plans on mount/open
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      fetchPaymentConfig().then((cfg) => {
        if (cfg) setPaymentConfig(cfg);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPlan: PaymentPlan | undefined = paymentConfig?.plans.find((p) => p.id === selectedPlanId);

  // Live preview of Option 1 Key
  const previewKey = () => {
    const f = firstName.trim().replace(/[^a-zA-Z]/g, '').toUpperCase().padEnd(3, 'X').slice(0, 3);
    const s = surname.trim().replace(/[^a-zA-Z]/g, '').toUpperCase().padEnd(3, 'X').slice(0, 3);
    const m = mobile.trim().replace(/\D/g, '').slice(-6).padStart(6, '0');
    const raw = `${f}${s}${m}`;
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!firstName.trim() || !surname.trim()) {
      setErrorMsg('Please enter your First Name and Surname.');
      return;
    }

    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    setStep('pay');
  };

  const handleVerifyUpiPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanUtr = upiUtrRef.trim().replace(/[^a-zA-Z0-9]/g, '');
    if (cleanUtr.length < 6) {
      setErrorMsg('Please enter the 12-digit UPI transaction reference / UTR from your payment app.');
      return;
    }

    setLoading(true);

    try {
      const res = await submitUpiPayment({
        firstName: firstName.trim(),
        surname: surname.trim(),
        mobile: mobile.replace(/\D/g, ''),
        email: email.trim() || undefined,
        plan: selectedPlanId,
        upiUtrRef: cleanUtr,
        deviceName,
      });

      if (res.ok && res.data.success) {
        setIssuedKey({
          formatted: res.data.data.formattedKey,
          raw: res.data.data.licenceKey,
        });
        setStep('success');
        setSuccessMsg(res.data.message || 'Payment verified! Welcome to VIP.');
      } else {
        setErrorMsg(res.data.message || 'Failed to verify payment reference. Please check your UTR.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error verifying payment.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginKey.trim()) return;

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { status, data } = await activateLicence(loginKey.trim(), deviceName);

      if (status === 200 && data.success) {
        setSuccessMsg(data.message || 'Device activated successfully!');
        setTimeout(() => {
          onActivated();
          onClose();
        }, 1000);
      } else if (status === 403 && data.error === 'DEVICE_LIMIT_REACHED') {
        onClose();
        if (onDeviceLimitReached) onDeviceLimitReached(data.devices || []);
      } else {
        setErrorMsg(data.message || 'Invalid licence key. Please check your 12-character key.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKey = () => {
    if (!issuedKey) return;
    navigator.clipboard.writeText(issuedKey.formatted);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-[#14141c] border border-purple-500/20 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Top Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
            {tab === 'vip' ? <Crown className="w-6 h-6 fill-white/20" /> : <Key className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              {tab === 'vip' ? 'Melody VIP Membership' : 'Log In with Licence Key'}
              {tab === 'vip' && (
                <span className="text-[10px] font-black uppercase tracking-wider bg-purple-500/20 border border-purple-500/40 text-purple-300 px-2 py-0.5 rounded-full">
                  Zero Fees UPI
                </span>
              )}
            </h3>
            <p className="text-xs text-neutral-400">
              {tab === 'vip'
                ? 'High-res 320kbps audio, 5 concurrent devices & zero ads'
                : 'Enter your 12-character Option 1 Licence Key'}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#0a0a0f] p-1 rounded-xl mb-5 border border-white/5">
          <button
            onClick={() => {
              setTab('vip');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === 'vip'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/20'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Crown className="w-4 h-4 text-yellow-400" />
            <span>Get VIP Access</span>
          </button>
          <button
            onClick={() => {
              setTab('login');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === 'login'
                ? 'bg-[#282836] text-white shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Key className="w-4 h-4 text-purple-400" />
            <span>Already Have a Key?</span>
          </button>
        </div>

        {/* Global Feedback Banners */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: VIP PAYMENT FLOW */}
        {tab === 'vip' && (
          <div>
            {step === 'details' && (
              <form onSubmit={handleProceedToPayment} className="space-y-4">
                {/* Plan Selection Cards */}
                <div className="grid grid-cols-2 gap-3 mb-2">
                  {/* Annual Plan (₹49) */}
                  <div
                    onClick={() => setSelectedPlanId('annual')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all relative ${
                      selectedPlanId === 'annual'
                        ? 'bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/30'
                        : 'bg-[#0f0f15] border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-neutral-300">Annual VIP</span>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">
                        ₹4/mo
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="text-2xl font-black text-white">₹49</span>
                      <span className="text-xs text-neutral-500 line-through">₹199</span>
                      <span className="text-[11px] text-neutral-400 font-medium">/ 1 Year</span>
                    </div>
                    <p className="text-[11px] text-neutral-400">Full year 320kbps access</p>
                  </div>

                  {/* Lifetime Plan (₹99) */}
                  <div
                    onClick={() => setSelectedPlanId('lifetime')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all relative ${
                      selectedPlanId === 'lifetime'
                        ? 'bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/30'
                        : 'bg-[#0f0f15] border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-neutral-300">Lifetime VIP</span>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                        BEST VALUE
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="text-2xl font-black text-white">₹99</span>
                      <span className="text-xs text-neutral-500 line-through">₹499</span>
                      <span className="text-[11px] text-amber-400 font-medium">Forever</span>
                    </div>
                    <p className="text-[11px] text-neutral-400">Pay once, listen for life</p>
                  </div>
                </div>

                {/* User Information */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        placeholder="Rahul"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full bg-[#0a0a0f] border border-white/10 focus:border-purple-500 rounded-xl px-3.5 py-2 text-sm text-white placeholder:text-neutral-600 outline-none transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                        Surname *
                      </label>
                      <input
                        type="text"
                        placeholder="Sharma"
                        value={surname}
                        onChange={(e) => setSurname(e.target.value)}
                        className="w-full bg-[#0a0a0f] border border-white/10 focus:border-purple-500 rounded-xl px-3.5 py-2 text-sm text-white placeholder:text-neutral-600 outline-none transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                      10-Digit Mobile Number *
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-white/10 bg-white/5 text-xs text-neutral-400 font-mono">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="9876543210"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        className="w-full bg-[#0a0a0f] border border-white/10 focus:border-purple-500 rounded-r-xl px-3.5 py-2 text-sm text-white font-mono placeholder:text-neutral-600 outline-none transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="rahul@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#0a0a0f] border border-white/10 focus:border-purple-500 rounded-xl px-3.5 py-2 text-sm text-white placeholder:text-neutral-600 outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Option 1 Key Preview Badge */}
                {(firstName || surname || mobile) && (
                  <div className="p-3 bg-purple-950/20 border border-purple-500/20 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
                        Your Custom Licence Key
                      </div>
                      <div className="font-mono text-xs font-black text-white tracking-widest mt-0.5">
                        {previewKey()}
                      </div>
                    </div>
                    <span className="text-[10px] text-neutral-400 font-medium">Valid on 5 devices</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 group"
                >
                  <span>Continue to Direct UPI Payment</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </form>
            )}

            {/* STEP 2: DIRECT ZERO-FEES UPI QR SCAN */}
            {step === 'pay' && currentPlan && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-xs text-neutral-400">
                    Pay exactly <span className="font-black text-white text-sm">₹{currentPlan.price}</span> for{' '}
                    <span className="font-bold text-purple-400">{currentPlan.name}</span>
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">
                    Scan with any UPI app (Google Pay, PhonePe, Paytm, BHIM, Cred)
                  </div>
                </div>

                {/* Dynamic QR Code Display */}
                <div className="p-3 bg-white rounded-2xl w-fit mx-auto shadow-2xl shadow-purple-900/30 border-2 border-purple-400/40">
                  <img
                    src={currentPlan.qrCodeUrl}
                    alt="Scan UPI QR Code"
                    className="w-52 h-52 object-contain block mx-auto"
                  />
                  <div className="text-center text-[11px] font-bold text-neutral-900 mt-2 flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified Zero-Fee Direct UPI</span>
                  </div>
                </div>

                {/* Mobile Direct UPI Pay Button */}
                <div className="flex gap-2">
                  <a
                    href={currentPlan.upiPayUri}
                    className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-purple-600/25"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Pay with UPI App</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setStep('details')}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-bold rounded-xl transition-colors"
                  >
                    Back
                  </button>
                </div>

                {/* UPI ID Details */}
                <div className="p-3 bg-[#0a0a0f] border border-white/5 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-neutral-500 text-[10px] uppercase font-bold block">UPI ID</span>
                    <span className="font-mono font-bold text-white tracking-wider">
                      {paymentConfig?.upiIdMasked || 'an****7@axl'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-neutral-500 text-[10px] uppercase font-bold block">Payee</span>
                    <span className="text-white font-medium">{paymentConfig?.upiName || 'Melody Music VIP'}</span>
                  </div>
                </div>

                {/* 12-Digit UTR Form */}
                <form onSubmit={handleVerifyUpiPayment} className="space-y-3 pt-2 border-t border-white/5">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1">
                      Enter 12-Digit UPI Reference / UTR Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 429812345678"
                      value={upiUtrRef}
                      onChange={(e) => setUpiUtrRef(e.target.value)}
                      className="w-full bg-[#0a0a0f] border border-purple-500/40 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-sm font-mono tracking-widest text-white placeholder:text-neutral-600 outline-none transition-colors"
                      maxLength={20}
                      required
                    />
                    <p className="text-[10px] text-neutral-500 mt-1">
                      Found in your payment app under "UPI Ref No." or "UTR" immediately after payment.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <span>Verifying Payment...</span>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Verify & Activate VIP</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* STEP 3: PAYMENT SUCCESS & OPTION 1 KEY DISPLAY */}
            {step === 'success' && issuedKey && (
              <div className="text-center space-y-4 py-2">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
                  <CheckCircle className="w-8 h-8" />
                </div>

                <div>
                  <h4 className="text-xl font-black text-white">Payment Verified!</h4>
                  <p className="text-xs text-neutral-400 mt-1">
                    Welcome to Melody VIP. Your account is now active on this device.
                  </p>
                </div>

                {/* Key Card with Copy */}
                <div className="p-4 bg-[#0a0a0f] border border-purple-500/30 rounded-2xl relative group">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-1">
                    Your Permanent Option 1 Licence Key
                  </div>
                  <div className="font-mono text-xl font-black text-white tracking-widest py-1">
                    {issuedKey.formatted}
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Keep this key safe! You can use it to log in on up to 5 devices (Phone, PC, Web, Tablet).
                  </p>

                  <button
                    type="button"
                    onClick={handleCopyKey}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-purple-600/30"
                  >
                    {copiedKey ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Licence Key</span>
                      </>
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onActivated();
                    onClose();
                  }}
                  className="w-full py-3 bg-white text-neutral-900 hover:bg-neutral-200 font-bold text-sm rounded-xl transition-all shadow-lg"
                >
                  Start Listening Now
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LOGIN WITH EXISTING LICENCE KEY */}
        {tab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                Licence Key (Format: RAHS-HA98-7654)
              </label>
              <input
                type="text"
                placeholder="e.g. RAHS-HA98-7654"
                value={loginKey}
                onChange={(e) => setLoginKey(e.target.value.toUpperCase())}
                className="w-full bg-[#0a0a0f] border border-white/10 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white tracking-widest placeholder:text-neutral-600 outline-none transition-colors"
                maxLength={16}
                required
              />
              <p className="text-[10px] text-neutral-500 mt-1">
                Option 1 Key: First 3 letters of your first name + first 3 letters of surname + last 6 digits of mobile.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                Device Name
              </label>
              <input
                type="text"
                placeholder="e.g. Windows Chrome, Pixel 9"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                className="w-full bg-[#0a0a0f] border border-white/10 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-neutral-600 outline-none transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Logging In...</span>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  <span>Log In & Activate Device</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Support Link */}
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-400">
          <span>Need assistance or having payment issues?</span>
          {onOpenHelp ? (
            <button
              onClick={() => {
                onClose();
                onOpenHelp();
              }}
              className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Help & Discord</span>
            </button>
          ) : (
            <a
              href="https://discord.gg/melody"
              target="_blank"
              rel="noreferrer"
              className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Discord</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
