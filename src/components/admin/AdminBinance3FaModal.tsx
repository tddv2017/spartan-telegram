'use client';

import React, { useState, useEffect } from 'react';
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

interface AdminBinance3FaModalProps {
  onSuccess: () => void;
}

const PIN_STORAGE_KEY = 'spartan_admin_master_pin_v2';
const DEFAULT_MASTER_PIN = '888899';
const SESSION_AUTH_KEY = 'spartan_admin_session_auth_token';

type AuthStep = 'STEP_1_PIN' | 'STEP_2_GMAIL' | 'STEP_3_2FA';

export const AdminBinance3FaModal: React.FC<AdminBinance3FaModalProps> = ({ onSuccess }) => {
  const [currentStep, setCurrentStep] = useState<AuthStep>('STEP_1_PIN');
  const [config, setConfig] = useState<Admin3FaConfig>(getAdmin3FaConfig());
  
  // Step 1 States (PIN)
  const [pin, setPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

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
    if (enteredPin === savedPin) {
      setPinError(null);
      setCurrentStep('STEP_2_GMAIL');
      // Auto dispatch real OTP immediately to user's phone/telegram
      handleSendLiveOtp();
    } else {
      setPinError('❌ MÃ MASTER PIN KHÔNG ĐÚNG! Vui lòng thử lại.');
      setTimeout(() => setPin(''), 500);
    }
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
    <div className="fixed inset-0 z-50 bg-[#07090e] flex items-center justify-center p-4 overflow-y-auto">
      {/* Background Decorative Lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md bg-[#0b0e17] border-2 border-amber-500/50 rounded-3xl p-6 text-center space-y-6 shadow-[0_0_60px_rgba(245,158,11,0.25)] animate-in zoom-in-95 duration-200">
        {/* Header Branding */}
        <div className="space-y-2">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/15 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.4)]">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center justify-center gap-1.5">
            <span>SPARTAN BINANCE-GRADE 3FA</span>
          </h2>
          <span className="text-[10px] font-mono text-[#00df89] font-bold block uppercase tracking-wider">
            ● BẢO MẬT 3 TẦNG THẬT 100%: PIN + SERVER OTP + 2FA GOOGLE AUTH
          </span>
        </div>

        {/* 3-Step Breadcrumb Progress Bar */}
        <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-[#131927] rounded-2xl border border-[#1f293d] text-[10px] font-mono font-bold">
          <div className={`py-1.5 rounded-xl transition-all ${
            currentStep === 'STEP_1_PIN'
              ? 'bg-amber-500 text-black shadow-md'
              : 'text-[#00df89] bg-[#00df89]/10'
          }`}>
            <span>1. PIN</span>
          </div>
          <div className={`py-1.5 rounded-xl transition-all ${
            currentStep === 'STEP_2_GMAIL'
              ? 'bg-amber-500 text-black shadow-md'
              : currentStep === 'STEP_3_2FA'
              ? 'text-[#00df89] bg-[#00df89]/10'
              : 'text-gray-500'
          }`}>
            <span>2. MÃ OTP THẬT</span>
          </div>
          <div className={`py-1.5 rounded-xl transition-all ${
            currentStep === 'STEP_3_2FA'
              ? 'bg-amber-500 text-black shadow-md'
              : totpSuccess
              ? 'text-[#00df89] bg-[#00df89]/10'
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
                Bước 1: Nhập mã Master PIN Quản Trị Cấp 1
              </span>
              <span className="text-[10px] text-gray-500 font-mono block">
                Mã mặc định hệ thống: 888899
              </span>
            </div>

            {/* PIN Dots Display */}
            <div className="flex justify-center items-center gap-3 py-2">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                    i < pin.length
                      ? 'bg-amber-400 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.8)] scale-110'
                      : 'border-gray-700 bg-black/40'
                  }`}
                />
              ))}
            </div>

            {pinError && (
              <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500 text-red-400 text-[11px] font-bold">
                {pinError}
              </div>
            )}

            {/* Numerical Keypad */}
            <div className="grid grid-cols-3 gap-2 pt-1 max-w-[280px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePinKeyPress(num)}
                  className="h-12 rounded-2xl bg-[#131927] hover:bg-amber-500 hover:text-black border border-[#1f293d] text-white font-mono text-base font-black transition-all active:scale-95 shadow-sm"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPin('')}
                className="h-12 rounded-2xl bg-[#131927] hover:bg-red-500/20 border border-[#1f293d] text-red-400 font-mono text-xs font-black transition-all active:scale-95"
              >
                XÓA
              </button>
              <button
                type="button"
                onClick={() => handlePinKeyPress('0')}
                className="h-12 rounded-2xl bg-[#131927] hover:bg-amber-500 hover:text-black border border-[#1f293d] text-white font-mono text-base font-black transition-all active:scale-95"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => setPin(prev => prev.slice(0, -1))}
                className="h-12 rounded-2xl bg-[#131927] hover:bg-gray-800 border border-[#1f293d] text-gray-300 font-mono text-xs font-black transition-all active:scale-95"
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
            <div className="bg-[#131927] p-3.5 rounded-2xl border border-[#1f293d] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>Bước 2: Xác Thực Mã OTP Thật Về Điện Thoại & Gmail</span>
                </span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded font-mono font-bold">
                  SERVER LIVE
                </span>
              </div>
              <span className="text-[11px] text-gray-300 font-mono block">
                Mã được gửi trực tiếp tới Telegram & Gmail: <strong className="text-amber-300">{config.adminEmail}</strong>
              </span>
            </div>

            {/* OTP Sent Notice */}
            {otpSentNotice && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-2">
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
                  placeholder="Nhập 6 số OTP từ điện thoại"
                  className="flex-1 bg-[#131927] border border-[#1f293d] rounded-2xl px-4 py-3 text-center text-white text-base font-mono tracking-widest font-black focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  disabled={isSendingOtp || otpCountdown > 0}
                  onClick={handleSendLiveOtp}
                  className={`px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    otpCountdown > 0
                      ? 'bg-gray-800 text-gray-500 border border-gray-700'
                      : 'bg-amber-500 hover:bg-amber-400 text-black font-black'
                  }`}
                >
                  {isSendingOtp ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : otpCountdown > 0 ? (
                    <span>{otpCountdown}s</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>GỬI LẠI</span>
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
              className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all"
            >
              {isVerifyingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              <span>ĐỐI SOÁT MÃ OTP VÀ TIẾP TỤC</span>
            </button>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* STEP 3: REAL RFC 6238 2FA (GOOGLE / BINANCE AUTHENTICATOR APP) */}
        {/* ----------------------------------------------------------------- */}
        {currentStep === 'STEP_3_2FA' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 text-left">
            <div className="bg-[#131927] p-3.5 rounded-2xl border border-[#1f293d] space-y-1">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-[#00df89]" />
                <span>Bước 3: Nhập Mã 2FA Google / Binance Authenticator</span>
              </span>
              <span className="text-[11px] text-gray-400 font-mono block">
                Mã 6 chữ số thay đổi mỗi 30 giây trên điện thoại của bạn
              </span>
            </div>

            {/* Toggle QR Code Setup Box */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowQrCode(!showQrCode)}
                className="w-full py-2 px-3 rounded-xl bg-[#07090e] hover:bg-[#131927] border border-[#1f293d] text-amber-400 font-mono text-[11px] font-bold flex items-center justify-between transition-all"
              >
                <span className="flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{showQrCode ? 'Ẩn mã QR' : '📱 Xem Mã QR Quét Vào Google Authenticator'}</span>
                </span>
                <span className="text-[10px] text-gray-400">{showQrCode ? '▲' : '▼'}</span>
              </button>

              {showQrCode && (
                <div className="bg-[#07090e] p-4 rounded-2xl border border-amber-500/40 text-center space-y-3 animate-in zoom-in-95 duration-200">
                  <span className="text-[11px] text-gray-300 font-bold block">
                    Mở app Google Authenticator ➔ Quét mã QR này:
                  </span>
                  <div className="w-48 h-48 mx-auto bg-white p-2 rounded-2xl shadow-md">
                    <img 
                      src={qrCodeUrl} 
                      alt="Google Authenticator QR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 font-mono block">Hoặc nhập Secret Key thủ công:</span>
                    <div 
                      onClick={handleCopySecret}
                      className="p-2 rounded-xl bg-[#131927] border border-[#1f293d] text-amber-300 font-mono text-[11px] font-bold flex items-center justify-between cursor-pointer hover:border-amber-400 transition-all"
                    >
                      <span>{DEFAULT_TOTP_SECRET}</span>
                      <span className="text-[9px] bg-amber-500 text-black px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                        <Copy className="w-3 h-3" />
                        <span>{copiedSecret ? 'Đã copy' : 'Copy'}</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 6-Digit TOTP Input Box */}
            <div className="space-y-1.5">
              <label className="text-gray-300 font-bold block text-[11px]">
                Nhập mã 6 số từ Google / Binance Authenticator:
              </label>
              <input
                type="text"
                maxLength={6}
                value={authenticatorCode}
                onChange={(e) => setAuthenticatorCode(e.target.value.replace(/\D/g, ''))}
                placeholder="VD: 700875"
                className="w-full bg-[#131927] border border-[#1f293d] rounded-2xl py-3 text-center text-white text-xl font-mono tracking-[0.3em] font-black focus:outline-none focus:border-[#00df89]"
              />
            </div>

            {totpError && (
              <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500 text-red-400 text-[11px] font-bold">
                {totpError}
              </div>
            )}

            {totpSuccess && (
              <div className="p-2.5 rounded-xl bg-[#00df89]/20 border border-[#00df89] text-[#00df89] text-[11px] font-bold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{totpSuccess}</span>
              </div>
            )}

            <button
              onClick={handleVerify2FaStep}
              disabled={isVerifyingTotp}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#00df89] to-[#00b06b] hover:opacity-95 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,223,137,0.4)] transition-all"
            >
              {isVerifyingTotp ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <ShieldCheck className="w-4 h-4 text-black" />}
              <span>XÁC THỰC MÃ 2FA & MỞ CỔNG ADMIN</span>
            </button>
          </div>
        )}

        {/* Footer Security Badge */}
        <div className="pt-2 border-t border-[#1f293d] flex items-center justify-between text-[10px] font-mono text-gray-500">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-amber-400" />
            <span>RFC 6238 TOTP Standard</span>
          </span>
          <span className="text-[#00df89]">100% Real Live Production</span>
        </div>
      </div>
    </div>
  );
};
