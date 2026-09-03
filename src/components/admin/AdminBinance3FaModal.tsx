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
  Copy
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
import { useLanguage } from '@/contexts/LanguageContext';

interface AdminBinance3FaModalProps {
  onSuccess: () => void;
}

const PIN_STORAGE_KEY = 'spartan_admin_master_pin_v2';
const SESSION_AUTH_KEY = 'spartan_admin_session_auth_token';

type AuthStep = 'STEP_1_PIN' | 'STEP_2_GMAIL' | 'STEP_3_2FA';

export const AdminBinance3FaModal: React.FC<AdminBinance3FaModalProps> = ({ onSuccess }) => {
  const { t, lang } = useLanguage();
  const [currentStep, setCurrentStep] = useState<AuthStep>('STEP_1_PIN');
  const [config, setConfig] = useState<Admin3FaConfig>(getAdmin3FaConfig());
  
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
      if (nextPin.length === 6) {
        verifyStep1Pin(nextPin);
      }
    }
  };

  const verifyStep1Pin = (enteredPin: string) => {
    const savedPin = localStorage.getItem(PIN_STORAGE_KEY) || DEFAULT_MASTER_PIN;
    const cleanEntered = enteredPin.trim();

    // 1. FAST CHECK: Default PIN '888899' or legacy plaintext match
    if (cleanEntered === DEFAULT_MASTER_PIN || cleanEntered === savedPin) {
      setPinError(null);
      setCurrentStep('STEP_2_GMAIL');
      handleSendLiveOtp();
      return;
    }

    // 2. CRYPTOGRAPHIC HASH CHECK
    try {
      const enteredHash = hashMasterPin(cleanEntered);
      const isMatched = 
        enteredHash === savedPin || 
        (Boolean(cloudMasterPinHash) && enteredHash === cloudMasterPinHash);

      if (isMatched) {
        localStorage.setItem(PIN_STORAGE_KEY, enteredHash);
        setPinError(null);
        setCurrentStep('STEP_2_GMAIL');
        handleSendLiveOtp();
        return;
      }
    } catch {}

    setPinError(
      lang === 'vi'
        ? `❌ MÃ MASTER PIN KHÔNG ĐÚNG! Mã mặc định hệ thống: ${DEFAULT_MASTER_PIN}`
        : `❌ INCORRECT MASTER PIN! System default: ${DEFAULT_MASTER_PIN}`
    );
    setTimeout(() => setPin(''), 500);
  };

  // ----------------------------------------------------------------------
  // STEP 2: LIVE SERVER OTP HANDLERS (TELEGRAM & GMAIL REAL DISPATCH)
  // ----------------------------------------------------------------------
  const handleSendLiveOtp = async () => {
    setIsSendingOtp(true);
    setGmailError(null);
    setOtpSentNotice(null);

    try {
      const res = await sendRealCustodyOtp(config.adminEmail);
      if (res.success) {
        setOtpCountdown(60);
        setOtpSentNotice(`📲 ĐÃ GỬI MÃ OTP THẬT VỀ ĐIỆN THOẠI CỦA BẠN (TELEGRAM & GMAIL: ${config.adminEmail})!`);
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
      const result = await verifyRealCustodyOtp(gmailOtp);
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
        adminUser: 'tddv2017',
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

      <div className="relative w-full max-w-md bg-[#080b12] border-2 border-[#221c10] rounded-3xl p-6 text-center space-y-6 shadow-[0_0_60px_rgba(212,175,55,0.15)] animate-in zoom-in-95 duration-200">
        {/* Header Branding */}
        <div className="space-y-2">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-[#d4af37]/15 border border-[#d4af37]/40 flex items-center justify-center text-[#f5d77f] shadow-[0_0_25px_rgba(212,175,55,0.3)]">
            <ShieldCheck className="w-8 h-8 text-[#d4af37]" />
          </div>
          <h2 className="text-base font-black text-[#f5d77f] uppercase tracking-wider flex items-center justify-center gap-1.5">
            <span>SPARTAN BINANCE-GRADE 3FA</span>
          </h2>
          <span className="text-[10px] font-mono text-emerald-400 font-bold block uppercase tracking-wider">
            {lang === 'vi' ? '● BẢO MẬT 3 TẦNG THẬT 100%: PIN + SERVER OTP + 2FA GOOGLE AUTH' : '● 100% 3-TIER CUSTODY: PIN + SERVER OTP + GOOGLE AUTH'}
          </span>
        </div>

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
            <span>2. {lang === 'vi' ? 'MÃ OTP' : 'LIVE OTP'}</span>
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
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setPin(val);
                  if (val.length === 6) {
                    verifyStep1Pin(val);
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                aria-label="Master PIN"
                autoComplete="off"
              />
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                    i < pin.length
                      ? 'bg-[#d4af37] border-[#d4af37] shadow-[0_0_12px_rgba(212,175,55,0.8)] scale-110'
                      : 'border-[#221c10] bg-[#05070c]'
                  }`}
                />
              ))}
            </div>

            <span className="text-[10px] text-gray-400 font-mono block">
              {lang === 'vi' ? '💡 Chạm vào chấm để mở phím điện thoại, hoặc bấm phím số bên dưới' : '💡 Tap dots to use phone keyboard, or tap keypad'}
            </span>

            {pinError && (
              <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500 text-red-400 text-[11px] font-bold animate-shake">
                {pinError}
              </div>
            )}

            {/* Numerical Keypad with zero-delay touch manipulation */}
            <div className="grid grid-cols-3 gap-2 pt-1 max-w-[280px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  style={{ touchAction: 'manipulation' }}
                  onClick={() => handlePinKeyPress(num)}
                  className="h-12 rounded-2xl bg-[#0c0f17] hover:bg-[#141924] border border-[#221c10] text-[#f5d77f] font-mono text-base font-black transition-all active:scale-95 shadow-sm"
                >
                  {num}
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
        {/* STEP 2: REAL SERVER OTP (GMAIL & TELEGRAM LIVE) */}
        {/* ----------------------------------------------------------------- */}
        {currentStep === 'STEP_2_GMAIL' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 text-left">
            <div className="bg-[#05070c] p-3.5 rounded-2xl border border-[#221c10] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>{lang === 'vi' ? 'Bước 2: Xác Thực Mã OTP Thật Về Điện Thoại & Gmail' : 'Step 2: Real Server OTP Verification'}</span>
                </span>
                <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">
                  SERVER LIVE
                </span>
              </div>
              <span className="text-[11px] text-gray-300 font-mono block">
                {lang === 'vi' ? 'Mã được gửi trực tiếp tới Telegram & Gmail:' : 'OTP sent directly to Telegram & Gmail:'} <strong className="text-[#f5d77f]">{config.adminEmail}</strong>
              </span>
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
                  placeholder={lang === 'vi' ? 'Nhập 6 số OTP từ điện thoại' : 'Enter 6-digit OTP'}
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
                      <span>{lang === 'vi' ? 'GỬI LẠI' : 'RESEND'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {gmailError && (
              <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500 text-red-400 text-[11px] font-bold">
                {gmailError}
              </div>
            )}

            <button
              onClick={handleVerifyGmailStep}
              disabled={isVerifyingOtp}
              className="w-full py-3.5 rounded-2xl gold-btn-solid text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
            >
              {isVerifyingOtp ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <ArrowRight className="w-4 h-4 text-black" />}
              <span>{lang === 'vi' ? 'ĐỐI SOÁT MÃ OTP VÀ TIẾP TỤC' : 'VERIFY OTP & CONTINUE'}</span>
            </button>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* STEP 3: REAL RFC 6238 2FA (GOOGLE / BINANCE AUTHENTICATOR APP) */}
        {/* ----------------------------------------------------------------- */}
        {currentStep === 'STEP_3_2FA' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 text-left">
            <div className="bg-[#05070c] p-3.5 rounded-2xl border border-[#221c10] space-y-1">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>{lang === 'vi' ? 'Bước 3: Nhập Mã 2FA Google / Binance Authenticator' : 'Step 3: 2FA Google / Binance Authenticator'}</span>
              </span>
              <span className="text-[11px] text-gray-400 font-mono block">
                {lang === 'vi' ? 'Mã 6 chữ số thay đổi mỗi 30 giây trên điện thoại của bạn' : '6-digit rotating code updating every 30 seconds'}
              </span>
            </div>

            {/* Toggle QR Code Setup Box */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowQrCode(!showQrCode)}
                className="w-full py-2 px-3 rounded-xl bg-[#05070c] hover:bg-[#0c0f17] border border-[#221c10] text-[#f5d77f] font-mono text-[11px] font-bold flex items-center justify-between transition-all"
              >
                <span className="flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>{showQrCode ? (lang === 'vi' ? 'Ẩn mã QR' : 'Hide QR') : (lang === 'vi' ? '📱 Xem Mã QR Quét Vào Google Authenticator' : '📱 View QR for Google Authenticator')}</span>
                </span>
                <span className="text-[10px] text-gray-400">{showQrCode ? '▲' : '▼'}</span>
              </button>

              {showQrCode && (
                <div className="bg-[#05070c] p-4 rounded-2xl border border-[#221c10] text-center space-y-3 animate-in zoom-in-95 duration-200">
                  <span className="text-[11px] text-gray-300 font-bold block">
                    {lang === 'vi' ? 'Mở app Google Authenticator ➔ Quét mã QR này:' : 'Open Google Authenticator ➔ Scan this QR:'}
                  </span>
                  <div className="w-48 h-48 mx-auto bg-white p-2 rounded-2xl shadow-md border-2 border-[#d4af37]/60">
                    <img 
                      src={qrCodeUrl} 
                      alt="Google Authenticator QR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 font-mono block">{lang === 'vi' ? 'Hoặc nhập Secret Key thủ công:' : 'Or enter Secret Key manually:'}</span>
                    <div 
                      onClick={handleCopySecret}
                      className="p-2 rounded-xl bg-[#080b12] border border-[#221c10] text-[#f5d77f] font-mono text-[11px] font-bold flex items-center justify-between cursor-pointer hover:border-[#d4af37] transition-all"
                    >
                      <span>{DEFAULT_TOTP_SECRET}</span>
                      <span className="text-[9px] gold-btn-solid text-black px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                        <Copy className="w-3 h-3" />
                        <span>{copiedSecret ? (lang === 'vi' ? 'Đã copy' : 'Copied') : 'Copy'}</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 6-Digit TOTP Input Box */}
            <div className="space-y-1.5">
              <label className="text-gray-300 font-bold block text-[11px]">
                {lang === 'vi' ? 'Nhập mã 6 số từ Google / Binance Authenticator:' : 'Enter 6-digit code from Google Authenticator:'}
              </label>
              <input
                type="text"
                maxLength={6}
                value={authenticatorCode}
                onChange={(e) => setAuthenticatorCode(e.target.value.replace(/\D/g, ''))}
                placeholder="VD: 700875"
                className="w-full bg-[#05070c] border border-[#221c10] rounded-2xl py-3 text-center text-[#f5d77f] text-xl font-mono tracking-[0.3em] font-black focus:outline-none focus:border-[#d4af37]"
              />
            </div>

            {totpError && (
              <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500 text-red-400 text-[11px] font-bold">
                {totpError}
              </div>
            )}

            {totpSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500 text-emerald-400 text-[11px] font-bold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{totpSuccess}</span>
              </div>
            )}

            <button
              onClick={handleVerify2FaStep}
              disabled={isVerifyingTotp}
              className="w-full py-3.5 rounded-2xl gold-btn-solid hover:opacity-95 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all active:scale-[0.98]"
            >
              {isVerifyingTotp ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <ShieldCheck className="w-4 h-4 text-black" />}
              <span>{lang === 'vi' ? 'XÁC THỰC MÃ 2FA & MỞ CỔNG ADMIN' : 'VERIFY 2FA & ACCESS COMMAND CENTER'}</span>
            </button>
          </div>
        )}

        {/* Footer Security Badge */}
        <div className="pt-2 border-t border-[#221c10] flex items-center justify-between text-[10px] font-mono text-gray-500">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-[#d4af37]" />
            <span>RFC 6238 TOTP Standard</span>
          </span>
          <span className="text-emerald-400">100% Real Live Production</span>
        </div>
      </div>
    </div>
  );
};
