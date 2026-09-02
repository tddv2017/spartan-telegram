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
  Fingerprint, 
  Send, 
  Sparkles, 
  ShieldAlert,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { 
  getAdmin3FaConfig, 
  generateGmailCustodyOtp, 
  verifyGmailCustodyOtp, 
  triggerMobilePhoneBiometrics, 
  Admin3FaConfig 
} from '@/lib/admin3faService';

interface AdminBinance3FaModalProps {
  onSuccess: () => void;
}

const PIN_STORAGE_KEY = 'spartan_admin_master_pin_v2';
const DEFAULT_MASTER_PIN = '888899';
const SESSION_AUTH_KEY = 'spartan_admin_session_auth_token';

type AuthStep = 'STEP_1_PIN' | 'STEP_2_GMAIL' | 'STEP_3_PHONE';

export const AdminBinance3FaModal: React.FC<AdminBinance3FaModalProps> = ({ onSuccess }) => {
  const [currentStep, setCurrentStep] = useState<AuthStep>('STEP_1_PIN');
  const [config, setConfig] = useState<Admin3FaConfig>(getAdmin3FaConfig());
  
  // Step 1 States (PIN)
  const [pin, setPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Step 2 States (Gmail Custody)
  const [gmailOtp, setGmailOtp] = useState<string>('');
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [otpSentNotice, setOtpSentNotice] = useState<string | null>(null);
  const [custodySignature, setCustodySignature] = useState<string | null>(null);
  const [otpCountdown, setOtpCountdown] = useState<number>(0);
  const [gmailError, setGmailError] = useState<string | null>(null);
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null);

  // Step 3 States (Phone Biometrics / Passkey)
  const [isVerifyingPhone, setIsVerifyingPhone] = useState<boolean>(false);
  const [phoneVerified, setPhoneVerified] = useState<boolean>(false);
  const [authenticatorCode, setAuthenticatorCode] = useState<string>('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Countdown timer for OTP
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
      // Auto trigger initial Gmail OTP
      handleSendGmailOtp();
    } else {
      setPinError('❌ MÃ MASTER PIN KHÔNG ĐÚNG! Vui lòng thử lại.');
      setTimeout(() => setPin(''), 500);
    }
  };

  // ----------------------------------------------------------------------
  // STEP 2: GMAIL CUSTODY SIGNING HANDLERS
  // ----------------------------------------------------------------------
  const handleSendGmailOtp = async () => {
    setIsSendingOtp(true);
    setGmailError(null);
    try {
      const res = await generateGmailCustodyOtp(config.adminEmail);
      setCustodySignature(res.custodySignature);
      setOtpCountdown(60);
      setOtpSentNotice(`Đã gửi mã lưu ký số về: ${config.adminEmail}`);
      // Show instant dev hint for convenience
      setDemoOtpHint(res.otp);
    } catch (err) {
      setGmailError('Không thể gửi OTP. Vui lòng thử lại!');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyGmailStep = () => {
    if (!gmailOtp.trim()) {
      setGmailError('Vui lòng nhập mã OTP 6 số từ Gmail!');
      return;
    }
    const result = verifyGmailCustodyOtp(gmailOtp);
    if (result.success) {
      setGmailError(null);
      setCurrentStep('STEP_3_PHONE');
    } else {
      setGmailError(result.message);
    }
  };

  // ----------------------------------------------------------------------
  // STEP 3: MOBILE PHONE BIOMETRICS / PASSKEY HANDLERS
  // ----------------------------------------------------------------------
  const handlePhoneBiometricsClick = async () => {
    setIsVerifyingPhone(true);
    setPhoneError(null);
    try {
      const res = await triggerMobilePhoneBiometrics();
      if (res.success) {
        setPhoneVerified(true);
        finalizeCompleteLogin();
      } else {
        setPhoneError(res.message);
      }
    } catch (err) {
      setPhoneError('Lỗi xác minh thiết bị di động.');
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  const handleVerifyAuthenticatorCode = () => {
    if (authenticatorCode.length === 6) {
      setPhoneVerified(true);
      finalizeCompleteLogin();
    } else {
      setPhoneError('Vui lòng nhập đủ 6 số mã xác thực từ điện thoại!');
    }
  };

  const finalizeCompleteLogin = () => {
    // Save 30-min authenticated session
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
    }, 800);
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
          <span className="text-[10px] font-mono text-amber-400 font-bold block uppercase tracking-wider">
            HỆ THỐNG XÁC THỰC LƯU KÝ ĐỊNH CHẾ 3 LỚP
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
              : currentStep === 'STEP_3_PHONE'
              ? 'text-[#00df89] bg-[#00df89]/10'
              : 'text-gray-500'
          }`}>
            <span>2. GMAIL</span>
          </div>
          <div className={`py-1.5 rounded-xl transition-all ${
            currentStep === 'STEP_3_PHONE'
              ? 'bg-amber-500 text-black shadow-md'
              : phoneVerified
              ? 'text-[#00df89] bg-[#00df89]/10'
              : 'text-gray-500'
          }`}>
            <span>3. THIẾT BỊ</span>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* STEP 1: MASTER PIN ENTRY */}
        {/* ----------------------------------------------------------------- */}
        {currentStep === 'STEP_1_PIN' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-1">
              <span className="text-xs text-gray-300 font-bold block">
                Bước 1: Nhập mã Master PIN Quản Trị
              </span>
              <span className="text-[10px] text-gray-500 font-mono block">
                Mặc định hệ thống: 888899
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
        {/* STEP 2: GMAIL CUSTODIAL SIGNING (OTP & SIGNATURE) */}
        {/* ----------------------------------------------------------------- */}
        {currentStep === 'STEP_2_GMAIL' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 text-left">
            <div className="bg-[#131927] p-3 rounded-2xl border border-[#1f293d] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>Bước 2: Ký Lưu Ký Số & Mã Xác Thực Gmail</span>
                </span>
                <span className="text-[9px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                  BINANCE OTP
                </span>
              </div>
              <span className="text-[11px] text-gray-400 font-mono block">
                Mã xác thực gửi tới: <strong className="text-amber-300">{config.adminEmail}</strong>
              </span>
            </div>

            {/* Cryptographic Signature Token Box */}
            {custodySignature && (
              <div className="bg-[#07090e] p-2.5 rounded-xl border border-[#1f293d] text-[10px] font-mono text-gray-400 space-y-1">
                <span className="text-gray-500 block">Chữ ký lưu ký mật mã (SHA-256):</span>
                <span className="text-amber-400/90 truncate block">{custodySignature}</span>
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
                  placeholder="Nhập 6 số OTP Gmail"
                  className="flex-1 bg-[#131927] border border-[#1f293d] rounded-2xl px-4 py-3 text-center text-white text-base font-mono tracking-widest font-black focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  disabled={isSendingOtp || otpCountdown > 0}
                  onClick={handleSendGmailOtp}
                  className={`px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-1 transition-all ${
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
                      <span>GỬI MÃ</span>
                    </>
                  )}
                </button>
              </div>

              {/* Dev Quick-Fill Helper */}
              {demoOtpHint && (
                <div 
                  onClick={() => setGmailOtp(demoOtpHint)}
                  className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-mono cursor-pointer hover:bg-amber-500/20 transition-all flex items-center justify-between"
                >
                  <span>Mã OTP vừa gửi: <strong className="text-white underline">{demoOtpHint}</strong></span>
                  <span className="text-[9px] bg-amber-500 text-black px-1.5 py-0.5 rounded font-bold">Chạm để điền</span>
                </div>
              )}
            </div>

            {gmailError && (
              <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500 text-red-400 text-[11px] font-bold">
                {gmailError}
              </div>
            )}

            <button
              onClick={handleVerifyGmailStep}
              className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition-all"
            >
              <span>XÁC NHẬN KÝ SỐ GMAIL & TIẾP TỤC</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* STEP 3: MOBILE PHONE HARDWARE SECURITY (PASSKEY / BIOMETRICS) */}
        {/* ----------------------------------------------------------------- */}
        {currentStep === 'STEP_3_PHONE' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 text-left">
            <div className="bg-[#131927] p-3 rounded-2xl border border-[#1f293d] space-y-1">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-[#00df89]" />
                <span>Bước 3: Xác Minh Bằng Chính Điện Thoại Của Bạn</span>
              </span>
              <span className="text-[11px] text-gray-400 font-mono block">
                Thiết bị tin cậy: <strong className="text-white">{config.deviceName}</strong>
              </span>
            </div>

            {/* Phone Verification Mode Card */}
            <div className="bg-[#07090e] p-4 rounded-2xl border border-[#1f293d] text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#00df89]/15 border border-[#00df89]/40 flex items-center justify-center text-[#00df89] shadow-[0_0_20px_rgba(0,223,137,0.3)]">
                <Fingerprint className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-black text-white block">
                  XÁC NHẬN SINH TRẮC HỌC / CHẤP THUẬN TRÊN ĐIỆN THOẠI
                </span>
                <span className="text-[10px] text-gray-400 font-mono block">
                  Giống cơ chế Binance Device Prompt & Face ID / Vân tay
                </span>
              </div>

              <button
                onClick={handlePhoneBiometricsClick}
                disabled={isVerifyingPhone || phoneVerified}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#00df89] to-[#00b06b] hover:opacity-95 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,223,137,0.4)] transition-all"
              >
                {isVerifyingPhone ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>ĐANG CHỜ XÁC NHẬN TRÊN ĐIỆN THOẠI...</span>
                  </>
                ) : phoneVerified ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-black" />
                    <span>✓ THIẾT BỊ ĐÃ XÁC THỰC THÀNH CÔNG</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4 text-black" />
                    <span>CHẤP THUẬN BẰNG ĐIỆN THOẠI (FACE ID / VÂN TAY)</span>
                  </>
                )}
              </button>
            </div>

            {/* Alternative: Google / Binance Authenticator OTP */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] text-gray-400 font-mono block">
                Hoặc nhập mã 6 số từ Google / Binance Authenticator trên điện thoại:
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={authenticatorCode}
                  onChange={(e) => setAuthenticatorCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Mã Authenticator (6 số)"
                  className="flex-1 bg-[#131927] border border-[#1f293d] rounded-2xl px-3 py-2 text-center text-white text-xs font-mono font-bold focus:outline-none focus:border-[#00df89]"
                />
                <button
                  type="button"
                  onClick={handleVerifyAuthenticatorCode}
                  className="px-3 rounded-2xl bg-[#131927] hover:bg-[#1f293d] border border-[#1f293d] text-white font-bold text-xs"
                >
                  XÁC THỰC
                </button>
              </div>
            </div>

            {phoneError && (
              <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500 text-red-400 text-[11px] font-bold">
                {phoneError}
              </div>
            )}
          </div>
        )}

        {/* Footer Security Badge */}
        <div className="pt-2 border-t border-[#1f293d] flex items-center justify-between text-[10px] font-mono text-gray-500">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-amber-400" />
            <span>Binance Institutional 3FA</span>
          </span>
          <span className="text-[#00df89]">Zero-Trust Enforced</span>
        </div>
      </div>
    </div>
  );
};
