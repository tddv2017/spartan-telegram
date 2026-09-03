'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Mail, 
  Smartphone, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Loader2, 
  Send, 
  Sparkles, 
  ShieldAlert,
  ChevronRight,
  RefreshCw,
  Bell,
  QrCode,
  Copy,
  Users
} from 'lucide-react';
import { 
  getAdmin3FaConfig, 
  sendRealCustodyOtp, 
  verifyRealCustodyOtp, 
  verifyLiveTotp,
  getOtpauthUrl,
  getQrCodeUrl,
  DEFAULT_TOTP_SECRET,
  Admin3FaConfig 
} from '@/lib/admin3faService';
import { hashMasterPin, verifyPinHash, DEFAULT_MASTER_PIN } from '@/lib/pinCrypto';
import { ADMIN_TELEGRAM_IDS } from '@/lib/adminAuth';
import { useLanguage } from '@/contexts/LanguageContext';

interface AdminBinance3FaModalProps {
  onSuccess: () => void;
  adminTelegramId?: string;
  adminUsername?: string;
}

const PIN_STORAGE_KEY = 'spartan_admin_master_pin_v2';
const SESSION_AUTH_KEY = 'spartan_admin_session_auth_token';

type AuthStep = 'STEP_1_PIN' | 'STEP_2_GMAIL' | 'STEP_3_2FA';

export const AdminBinance3FaModal: React.FC<AdminBinance3FaModalProps> = ({ 
  onSuccess,
  adminTelegramId,
  adminUsername
}) => {
  const { t, lang } = useLanguage();
  const [currentStep, setCurrentStep] = useState<AuthStep>('STEP_1_PIN');
  const [config, setConfig] = useState<Admin3FaConfig>(getAdmin3FaConfig());

  // Admin Identity Routing State: Ensure OTP goes to the specific Admin logging in
  const [adminList, setAdminList] = useState<{ id: string; username: string; role: string }[]>([
    { id: '494232782', username: 'tddv2017', role: 'SUPER_ADMIN' },
    { id: '1788035393', username: 'tddv2017', role: 'ADMIN' },
    { id: '6689537770', username: 'itcrazy2021', role: 'ADMIN' }
  ]);
  
  const [selectedAdminId, setSelectedAdminId] = useState<string>(() => {
    if (adminTelegramId) return String(adminTelegramId);
    if (typeof window !== 'undefined') {
      return localStorage.getItem('spartan_selected_admin_id') || '494232782';
    }
    return '494232782';
  });

  const [selectedAdminUser, setSelectedAdminUser] = useState<string>(() => {
    if (adminUsername) return adminUsername;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('spartan_selected_admin_user') || 'tddv2017';
    }
    return 'tddv2017';
  });

  // Sync when props change (e.g. from Mini App)
  useEffect(() => {
    if (adminTelegramId) {
      setSelectedAdminId(String(adminTelegramId));
      if (adminUsername) setSelectedAdminUser(adminUsername);
    }
  }, [adminTelegramId, adminUsername]);

  // Load registered admins list for standalone portal selection
  useEffect(() => {
    fetch('https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app/users.json')
      .then(res => res.json())
      .then(usersData => {
        if (usersData) {
          const list: { id: string; username: string; role: string }[] = [];
          for (const [uid, u] of Object.entries(usersData) as [string, any][]) {
            if (u?.role === 'ADMIN' || u?.role === 'SUPER_ADMIN' || ADMIN_TELEGRAM_IDS.includes(Number(uid))) {
              list.push({
                id: uid,
                username: u?.username || `admin_${uid}`,
                role: u?.role || 'ADMIN'
              });
            }
          }
          if (list.length > 0) {
            setAdminList(list);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectAdmin = (adminId: string, adminUser: string) => {
    setSelectedAdminId(adminId);
    setSelectedAdminUser(adminUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem('spartan_selected_admin_id', adminId);
      localStorage.setItem('spartan_selected_admin_user', adminUser);
    }
  };
  
  // Step 1 States (PIN)
  const [pin, setPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [cloudMasterPinHash, setCloudMasterPinHash] = useState<string | null>(null);
  const nativeInputRef = useRef<HTMLInputElement | null>(null);

  // Sync Master PIN Hash from Firebase Realtime Database
  useEffect(() => {
    fetch('https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app/system_config.json')
      .then(res => res.json())
      .then(cfg => {
        if (cfg) {
          if (cfg.master_pin_hash) {
            setCloudMasterPinHash(String(cfg.master_pin_hash).trim());
          } else if (cfg.master_pin) {
            setCloudMasterPinHash(hashMasterPin(String(cfg.master_pin).trim()));
          }
        }
      })
      .catch(() => {});
  }, []);

  // Step 2 States (Live Server OTP)
  const [gmailOtp, setGmailOtp] = useState<string>('');
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const [otpSentNotice, setOtpSentNotice] = useState<string | null>(null);
  const [otpCountdown, setOtpCountdown] = useState<number>(0);
  const [gmailError, setGmailError] = useState<string | null>(null);

  // Step 3 States (Real 2FA Google / Binance Authenticator)
  const [authenticatorCode, setAuthenticatorCode] = useState<string>('');
  const [showQrCode, setShowQrCode] = useState<boolean>(false);
  const [isVerifyingTotp, setIsVerifyingTotp] = useState<boolean>(false);
  const [totpError, setTotpError] = useState<string | null>(null);
  const [totpSuccess, setTotpSuccess] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState<boolean>(false);

  const otpauthUrl = getOtpauthUrl(config.adminEmail, DEFAULT_TOTP_SECRET);
  const qrCodeUrl = getQrCodeUrl(otpauthUrl);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const t = setInterval(() => setOtpCountdown(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(t);
  }, [otpCountdown]);

  // Check existing active session
  useEffect(() => {
    const token = sessionStorage.getItem(SESSION_AUTH_KEY);
    if (token) {
      try {
        const parsed = JSON.parse(token);
        if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
          onSuccess();
        }
      } catch {}
    }
  }, [onSuccess]);

  // ----------------------------------------------------------------------
  // STEP 1: PIN HANDLERS
  // ----------------------------------------------------------------------
  const handlePinKeyPress = (num: string) => {
    if (pin.length < 6) {
      const nextPin = pin + num;
      setPin(nextPin);
      setPinError(null);
      if (nextPin.length === 6) {
        setTimeout(() => verifyPin(nextPin), 150);
      }
    }
  };

  const handleNativeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(val);
    setPinError(null);
    if (val.length === 6) {
      setTimeout(() => verifyPin(val), 150);
    }
  };

  const verifyPin = (enteredPin: string) => {
    // 1. Check against Cloud Master PIN Hash (Highest Priority)
    if (cloudMasterPinHash) {
      if (verifyPinHash(enteredPin, cloudMasterPinHash)) {
        setPinError(null);
        setCurrentStep('STEP_2_GMAIL');
        return;
      }
    } else {
      // 2. Default PIN ONLY allowed if no cloud hash is established yet
      if (enteredPin === DEFAULT_MASTER_PIN) {
        setPinError(null);
        setCurrentStep('STEP_2_GMAIL');
        return;
      }
    }

    // 3. Local storage check
    const localHash = localStorage.getItem(PIN_STORAGE_KEY);
    if (localHash && verifyPinHash(enteredPin, localHash)) {
      setPinError(null);
      setCurrentStep('STEP_2_GMAIL');
      return;
    }

    setPinError(
      lang === 'vi'
        ? '❌ MÃ PIN BẢO MẬT KHÔNG CHÍNH XÁC! Vui lòng thử lại.'
        : '❌ INCORRECT SECURITY MASTER PIN! Please try again.'
    );
    setTimeout(() => setPin(''), 500);
  };

  // ----------------------------------------------------------------------
  // STEP 2: LIVE SERVER OTP HANDLERS (TELEGRAM ROUTED TO SPECIFIC ADMIN)
  // ----------------------------------------------------------------------
  const handleSendLiveOtp = async () => {
    setIsSendingOtp(true);
    setGmailError(null);
    setOtpSentNotice(null);

    try {
      const res = await sendRealCustodyOtp(config.adminEmail, selectedAdminId, selectedAdminUser);
      if (res.success) {
        setOtpCountdown(60);
        setOtpSentNotice(
          lang === 'vi'
            ? `📲 ĐÃ GỬI MÃ OTP THẬT VỀ TELEGRAM @${selectedAdminUser} (ID: ${selectedAdminId})!`
            : `📲 LIVE OTP DISPATCHED DIRECTLY TO TELEGRAM @${selectedAdminUser} (ID: ${selectedAdminId})!`
        );
      } else {
        setGmailError(res.message || 'Không thể gửi OTP. Vui lòng thử lại!');
      }
    } catch (err: any) {
      setGmailError('Lỗi kết nối máy chủ gửi OTP: ' + err.message);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyGmailStep = async () => {
    if (!gmailOtp.trim() || gmailOtp.trim().length !== 6) {
      setGmailError('Vui lòng nhập đủ 6 số mã OTP thật đã gửi về điện thoại!');
      return;
    }

    setIsVerifyingOtp(true);
    setGmailError(null);

    try {
      const result = await verifyRealCustodyOtp(gmailOtp, selectedAdminId);
      if (result.success) {
        setGmailError(null);
        setCurrentStep('STEP_3_2FA');
      } else {
        setGmailError(result.message);
      }
    } catch (err: any) {
      setGmailError('Lỗi đối soát OTP: ' + err.message);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // ----------------------------------------------------------------------
  // STEP 3: REAL RFC 6238 TOTP 2FA HANDLERS (GOOGLE / BINANCE AUTHENTICATOR)
  // ----------------------------------------------------------------------
  const handleVerify2FaStep = async () => {
    if (authenticatorCode.trim().length !== 6) {
      setTotpError('Vui lòng nhập đúng 6 chữ số từ ứng dụng Authenticator!');
      return;
    }

    setIsVerifyingTotp(true);
    setTotpError(null);

    try {
      const result = await verifyLiveTotp(authenticatorCode.trim());
      if (result.success) {
        setTotpSuccess('✓ XÁC THỰC MÃ 2FA AUTHENTICATOR THÀNH CÔNG 100%!');
        finalizeCompleteLogin();
      } else {
        setTotpError(result.message);
      }
    } catch (err: any) {
      setTotpError('Lỗi đối soát mã 2FA: ' + err.message);
    } finally {
      setIsVerifyingTotp(false);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(DEFAULT_TOTP_SECRET);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const finalizeCompleteLogin = () => {
    sessionStorage.setItem(
      SESSION_AUTH_KEY,
      JSON.stringify({
        authorized: true,
        adminUser: selectedAdminUser,
        adminTelegramId: selectedAdminId,
        verifiedWith3Fa: true,
        device: config.deviceName,
        timestamp: Date.now(),
      })
    );
    setTimeout(() => {
      onSuccess();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#04060a] flex items-center justify-center p-4 overflow-y-auto">
      {/* Background Decorative Lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#d4af37]/10 rounded-full blur-3xl" />
        <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-[#aa771c]/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md bg-[#080b12] border-2 border-[#221c10] rounded-3xl p-6 text-center space-y-5 shadow-[0_0_60px_rgba(212,175,55,0.15)] animate-in zoom-in-95 duration-200">
        {/* Header Branding */}
        <div className="space-y-2">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-[#d4af37]/15 border border-[#d4af37]/40 flex items-center justify-center text-[#f5d77f] shadow-[0_0_25px_rgba(212,175,55,0.3)]">
            <ShieldCheck className="w-8 h-8 text-[#d4af37]" />
          </div>
          <h2 className="text-base font-black text-[#f5d77f] uppercase tracking-wider flex items-center justify-center gap-1.5">
            <span>SPARTAN BINANCE-GRADE 3FA</span>
          </h2>
          <span className="text-[10px] font-mono text-emerald-400 font-bold block uppercase tracking-wider">
            {lang === 'vi' ? '● BẢO MẬT 3 TẦNG THẬT: PIN + TELEGRAM OTP + GOOGLE AUTH' : '● 100% 3-TIER CUSTODY: PIN + TELEGRAM OTP + GOOGLE AUTH'}
          </span>
        </div>

        {/* Specific Admin Routing Indicator / Selector */}
        {adminTelegramId ? (
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#05070c] border border-[#221c10] text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-gray-400 text-[11px] font-mono">
                {lang === 'vi' ? 'Admin xác thực:' : 'Authenticated Admin:'}
              </span>
              <span className="text-white font-mono font-black">@{selectedAdminUser}</span>
            </div>
            <span className="text-[10px] font-mono text-[#f5d77f] bg-[#d4af37]/15 px-2 py-0.5 rounded-lg border border-[#d4af37]/30 font-bold">
              ID: {selectedAdminId}
            </span>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-[#05070c] border border-[#221c10] space-y-2 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#f5d77f]" />
                <span>{lang === 'vi' ? 'Tài Khoản Admin Nhận Mã OTP:' : 'Admin Account Receiving OTP:'}</span>
              </span>
              <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 font-bold">
                ROUTING ĐÚNG ID
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {adminList.map((adm) => (
                <button
                  key={adm.id}
                  type="button"
                  onClick={() => handleSelectAdmin(adm.id, adm.username)}
                  className={`p-2 rounded-xl text-left border transition-all flex items-center justify-between ${
                    selectedAdminId === adm.id
                      ? 'bg-[#0f1422] border-[#d4af37] text-white shadow-sm'
                      : 'bg-[#080b12] border-[#221c10] text-gray-400 hover:text-white'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold font-mono block">@{adm.username}</span>
                    <span className="text-[9px] text-gray-500 font-mono">ID: {adm.id}</span>
                  </div>
                  {selectedAdminId === adm.id && (
                    <CheckCircle2 className="w-4 h-4 text-[#f5d77f]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3-Step Breadcrumb Progress Bar */}
        <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-[#05070c] rounded-2xl border border-[#221c10] text-[10px] font-mono font-bold">
          <div className={`py-1.5 rounded-xl transition-all ${
            currentStep === 'STEP_1_PIN'
              ? 'gold-btn-solid text-black shadow-md'
              : 'text-emerald-400 bg-emerald-500/10'
          }`}>
            <span>1. PIN</span>
          </div>
          <div className={`py-1.5 rounded-xl transition-all ${
            currentStep === 'STEP_2_GMAIL'
              ? 'gold-btn-solid text-black shadow-md'
              : currentStep === 'STEP_3_2FA'
              ? 'text-emerald-400 bg-emerald-500/10'
              : 'text-gray-500'
          }`}>
            <span>2. {lang === 'vi' ? 'TELEGRAM OTP' : 'LIVE OTP'}</span>
          </div>
          <div className={`py-1.5 rounded-xl transition-all ${
            currentStep === 'STEP_3_2FA'
              ? 'gold-btn-solid text-black shadow-md'
              : totpSuccess
              ? 'text-emerald-400 bg-emerald-500/10'
              : 'text-gray-500'
          }`}>
            <span>3. 2FA AUTH</span>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* STEP 1: MASTER PIN ENTRY */}
        {/* ----------------------------------------------------------------- */}
        {currentStep === 'STEP_1_PIN' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-1">
              <span className="text-xs text-gray-300 font-bold block">
                {lang === 'vi' ? 'Bước 1: Nhập mã Master PIN Quản Trị Cấp 1' : 'Step 1: Enter Master Admin PIN'}
              </span>
              <span className="text-[10px] text-gray-500 font-mono block">
                {lang === 'vi' ? 'Mã mặc định hệ thống: 888899' : 'Default system PIN: 888899'}
              </span>
            </div>

            {/* PIN Dots Display with tap-to-focus for mobile keyboard */}
            <div 
              onClick={() => nativeInputRef.current?.focus()}
              className="relative flex justify-center items-center gap-3 py-3 cursor-pointer select-none"
            >
              <input
                ref={nativeInputRef}
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={handleNativeInputChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full text-transparent bg-transparent border-none outline-none"
                autoFocus
              />
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const isFilled = idx < pin.length;
                return (
                  <div
                    key={idx}
                    className={`w-11 h-12 rounded-2xl border-2 flex items-center justify-center transition-all ${
                      isFilled
                        ? 'border-[#d4af37] bg-[#d4af37]/15 shadow-[0_0_15px_rgba(212,175,55,0.3)]'
                        : 'border-[#221c10] bg-[#05070c]'
                    }`}
                  >
                    {isFilled ? (
                      <span className="w-3 h-3 rounded-full bg-[#f5d77f]" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-700" />
                    )}
                  </div>
                );
              })}
            </div>

            {pinError && (
              <div className="p-3 rounded-2xl bg-[#ff2d55]/15 border border-[#ff2d55]/30 text-[#ff2d55] text-xs font-bold animate-shake">
                {pinError}
              </div>
            )}

            {/* Numeric Keypad for Mobile & Desktop */}
            <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto pt-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  style={{ touchAction: 'manipulation' }}
                  onClick={() => handlePinKeyPress(digit)}
                  className="h-12 rounded-2xl bg-[#0c0f17] hover:bg-[#141924] border border-[#221c10] text-white font-mono text-base font-black transition-all active:scale-95"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                style={{ touchAction: 'manipulation' }}
                onClick={() => setPin('')}
                className="h-12 rounded-2xl bg-[#0c0f17] hover:bg-red-500/20 border border-[#221c10] text-red-400 font-mono text-xs font-black transition-all active:scale-95"
              >
                {lang === 'vi' ? 'XÓA' : 'CLEAR'}
              </button>
              <button
                type="button"
                style={{ touchAction: 'manipulation' }}
                onClick={() => handlePinKeyPress('0')}
                className="h-12 rounded-2xl bg-[#0c0f17] hover:bg-[#141924] border border-[#221c10] text-[#f5d77f] font-mono text-base font-black transition-all active:scale-95"
              >
                0
              </button>
              <button
                type="button"
                style={{ touchAction: 'manipulation' }}
                onClick={() => setPin(prev => prev.slice(0, -1))}
                className="h-12 rounded-2xl bg-[#0c0f17] hover:bg-[#141924] border border-[#221c10] text-gray-300 font-mono text-xs font-black transition-all active:scale-95"
              >
                ⌫
              </button>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* STEP 2: REAL SERVER OTP (ROUTED TO SPECIFIC ADMIN'S TELEGRAM) */}
        {/* ----------------------------------------------------------------- */}
        {currentStep === 'STEP_2_GMAIL' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 text-left">
            <div className="bg-[#05070c] p-3.5 rounded-2xl border border-[#221c10] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>{lang === 'vi' ? 'Bước 2: Xác Thực Mã OTP Gửi Riêng Về Telegram' : 'Step 2: Private Telegram OTP Verification'}</span>
                </span>
                <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">
                  SERVER LIVE
                </span>
              </div>
              <div className="text-[11px] text-gray-300 font-mono space-y-0.5">
                <div>
                  {lang === 'vi' ? 'Mã OTP gửi riêng tới Telegram của:' : 'OTP routed privately to Telegram of:'}{' '}
                  <strong className="text-[#f5d77f]">@{selectedAdminUser}</strong>
                </div>
                <div className="text-[10px] text-emerald-400">
                  Telegram ID: <strong className="font-mono">{selectedAdminId}</strong>
                </div>
              </div>
            </div>

            {/* OTP Sent Notice */}
            {otpSentNotice && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center gap-2">
                <Bell className="w-4 h-4 flex-shrink-0 animate-bounce" />
                <span>{otpSentNotice}</span>
              </div>
            )}

            {/* OTP Input & Send Button */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={gmailOtp}
                  onChange={(e) => setGmailOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder={lang === 'vi' ? 'Nhập 6 số OTP từ Telegram' : 'Enter 6-digit OTP'}
                  className="flex-1 bg-[#05070c] border border-[#221c10] rounded-2xl px-4 py-3 text-center text-[#f5d77f] text-base font-mono tracking-widest font-black focus:outline-none focus:border-[#d4af37]"
                />
                <button
                  type="button"
                  disabled={isSendingOtp || otpCountdown > 0}
                  onClick={handleSendLiveOtp}
                  className={`px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    otpCountdown > 0
                      ? 'bg-[#0c0f17] text-gray-500 border border-[#221c10]'
                      : 'gold-btn-solid text-black font-black'
                  }`}
                >
                  {isSendingOtp ? (
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                  ) : otpCountdown > 0 ? (
                    <span>{otpCountdown}s</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>{lang === 'vi' ? 'GỬI MÃ' : 'GET OTP'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {gmailError && (
              <div className="p-3 rounded-2xl bg-[#ff2d55]/15 border border-[#ff2d55]/30 text-[#ff2d55] text-xs font-bold">
                {gmailError}
              </div>
            )}

            <button
              type="button"
              disabled={isVerifyingOtp || gmailOtp.length !== 6}
              onClick={handleVerifyGmailStep}
              className={`w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg ${
                gmailOtp.length === 6 && !isVerifyingOtp
                  ? 'spartan-cta-btn text-white'
                  : 'bg-[#141924] text-gray-500 cursor-not-allowed'
              }`}
            >
              {isVerifyingOtp ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
              <span>{lang === 'vi' ? 'TIẾP TỤC BƯỚC 3: GOOGLE 2FA' : 'CONTINUE TO STEP 3: 2FA'}</span>
            </button>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* STEP 3: REAL RFC 6238 TOTP 2FA (GOOGLE / BINANCE AUTHENTICATOR) */}
        {/* ----------------------------------------------------------------- */}
        {currentStep === 'STEP_3_2FA' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 text-left">
            <div className="bg-[#05070c] p-3.5 rounded-2xl border border-[#221c10] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>{lang === 'vi' ? 'Bước 3: Mã 6 Số Google / Binance Authenticator' : 'Step 3: Google / Binance 2FA Code'}</span>
                </span>
                <span className="text-[9px] bg-blue-500/15 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded font-mono font-bold">
                  RFC 6238 TOTP
                </span>
              </div>
              <span className="text-[11px] text-gray-300 font-sans block">
                {lang === 'vi'
                  ? 'Mở ứng dụng Google Authenticator hoặc Binance Authenticator trên điện thoại để lấy mã 6 số thời gian thực.'
                  : 'Open your Google or Binance Authenticator app on your phone and enter the live 6-digit code.'}
              </span>
            </div>

            {/* Bảo mật CISO BlueGuard AI: Ẩn mã QR và Secret Key công khai khỏi màn hình đăng nhập */}
            <div className="text-center py-1">
              <span className="text-[10px] text-gray-500 font-mono inline-flex items-center gap-1">
                <span>🔒 Thiết bị bảo mật đã liên kết mã hóa. Cần cấp lại mã vui lòng liên hệ Chủ tịch (@tddv2017).</span>
              </span>
            </div>

            {/* 6-Digit Authenticator Code Input */}
            <div className="space-y-2">
              <input
                type="text"
                maxLength={6}
                value={authenticatorCode}
                onChange={(e) => setAuthenticatorCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000 000"
                autoFocus
                className="w-full bg-[#05070c] border border-[#221c10] rounded-2xl px-4 py-3.5 text-center text-[#f5d77f] text-xl font-mono tracking-widest font-black focus:outline-none focus:border-[#d4af37]"
              />
            </div>

            {totpError && (
              <div className="p-3 rounded-2xl bg-[#ff2d55]/15 border border-[#ff2d55]/30 text-[#ff2d55] text-xs font-bold">
                {totpError}
              </div>
            )}

            {totpSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{totpSuccess}</span>
              </div>
            )}

            <button
              type="button"
              disabled={isVerifyingTotp || authenticatorCode.length !== 6}
              onClick={handleVerify2FaStep}
              className={`w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg ${
                authenticatorCode.length === 6 && !isVerifyingTotp
                  ? 'gold-btn-solid text-black'
                  : 'bg-[#141924] text-gray-500 cursor-not-allowed'
              }`}
            >
              {isVerifyingTotp ? (
                <Loader2 className="w-4 h-4 animate-spin text-black" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-black" />
              )}
              <span>{lang === 'vi' ? 'HOÀN TẤT & VÀO CỔNG QUẢN TRỊ' : 'AUTHENTICATE & ENTER PORTAL'}</span>
            </button>
          </div>
        )}

        {/* Footer Guarantee */}
        <div className="pt-2 border-t border-[#221c10] flex items-center justify-between text-[10px] font-mono text-gray-500">
          <span>SPARTAN SECURE ENCLAVE</span>
          <span>SESSION: 30 PHÚT</span>
        </div>
      </div>
    </div>
  );
};
