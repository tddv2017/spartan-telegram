'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, KeyRound, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { hashMasterPin, DEFAULT_MASTER_PIN } from '@/lib/pinCrypto';

interface AdminPinAuthModalProps {
  onSuccess: () => void;
}

const PIN_STORAGE_KEY = 'spartan_admin_master_pin_v2';
const SESSION_AUTH_KEY = 'spartan_admin_session_auth_token';
const ATTEMPTS_KEY = 'spartan_admin_failed_attempts';
const LOCKOUT_KEY = 'spartan_admin_lockout_until';

export const AdminPinAuthModal: React.FC<AdminPinAuthModalProps> = ({ onSuccess }) => {
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLockedOut, setIsLockedOut] = useState<boolean>(false);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [cloudMasterPinHash, setCloudMasterPinHash] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app/system_config.json')
      .then(res => res.json())
      .then(cfg => {
        if (cfg) {
          if (cfg.master_pin_hash) {
            setCloudMasterPinHash(String(cfg.master_pin_hash).trim());
          } else if (cfg.master_pin) {
            hashMasterPin(String(cfg.master_pin).trim()).then(h => setCloudMasterPinHash(h));
          }
        }
      })
      .catch(() => {});
  }, []);

  // Check existing session or lockout
  useEffect(() => {
    // 1. Check if lockout is active
    const lockoutUntil = localStorage.getItem(LOCKOUT_KEY);
    if (lockoutUntil) {
      const lockTime = parseInt(lockoutUntil, 10);
      const now = Date.now();
      if (now < lockTime) {
        setIsLockedOut(true);
        setRemainingTime(Math.ceil((lockTime - now) / 1000));
        return;
      } else {
        localStorage.removeItem(LOCKOUT_KEY);
        localStorage.removeItem(ATTEMPTS_KEY);
      }
    }

    // 2. Check if valid session exists
    const token = sessionStorage.getItem(SESSION_AUTH_KEY);
    if (token) {
      try {
        const parsed = JSON.parse(token);
        // Valid for 30 minutes
        if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
          onSuccess();
        } else {
          sessionStorage.removeItem(SESSION_AUTH_KEY);
        }
      } catch {
        sessionStorage.removeItem(SESSION_AUTH_KEY);
      }
    }
  }, [onSuccess]);

  // Countdown timer for lockout
  useEffect(() => {
    if (!isLockedOut || remainingTime <= 0) return;
    const timer = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          setIsLockedOut(false);
          localStorage.removeItem(LOCKOUT_KEY);
          localStorage.removeItem(ATTEMPTS_KEY);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isLockedOut, remainingTime]);

  const handleKeyPress = (num: string) => {
    if (isLockedOut) return;
    if (pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 6) {
        verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    if (isLockedOut) return;
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleClear = () => {
    if (isLockedOut) return;
    setPin('');
    setErrorMsg(null);
  };

  const verifyPin = async (enteredPin: string) => {
    const savedPin = localStorage.getItem(PIN_STORAGE_KEY) || DEFAULT_MASTER_PIN;
    const cleanEntered = enteredPin.trim();
    const enteredHash = await hashMasterPin(cleanEntered);

    const isMatched = 
      cleanEntered === DEFAULT_MASTER_PIN || 
      cleanEntered === savedPin || 
      enteredHash === savedPin || 
      (Boolean(cloudMasterPinHash) && enteredHash === cloudMasterPinHash);

    if (isMatched) {
      // Success: Save 30-min session token
      localStorage.setItem(PIN_STORAGE_KEY, enteredHash);
      sessionStorage.setItem(
        SESSION_AUTH_KEY,
        JSON.stringify({
          authorized: true,
          adminUser: 'tddv2017',
          timestamp: Date.now(),
        })
      );
      localStorage.removeItem(ATTEMPTS_KEY);
      onSuccess();
    } else {
      // Failed: Track attempts
      const currentAttempts = parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0', 10) + 1;
      localStorage.setItem(ATTEMPTS_KEY, String(currentAttempts));

      if (currentAttempts >= 5) {
        // Lock out for 5 minutes (300 seconds)
        const lockUntil = Date.now() + 5 * 60 * 1000;
        localStorage.setItem(LOCKOUT_KEY, String(lockUntil));
        setIsLockedOut(true);
        setRemainingTime(300);
        setErrorMsg('🚨 BẠN ĐÃ NHẬP SAI QUÁ 5 LẦN. HỆ THỐNG KHÓA TẠM THỜI TRONG 5 PHÚT!');
      } else {
        setErrorMsg(`❌ MÃ PIN KHÔNG CHÍNH XÁC! (CÒN ${5 - currentAttempts} LẦN THỬ)`);
      }
      setTimeout(() => {
        setPin('');
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#07090e] flex items-center justify-center p-4">
      {/* Background Decorative Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-[#ff5500]/10 rounded-full blur-2xl" />
      </div>

      <div className="relative w-full max-w-sm bg-[#0b0e17] border-2 border-amber-500/40 rounded-3xl p-6 text-center space-y-6 shadow-[0_0_50px_rgba(245,158,11,0.2)] animate-in fade-in zoom-in-95 duration-300">
        {/* Header Icon & Title */}
        <div className="space-y-2">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/15 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-base font-black text-white uppercase tracking-wider">
            SPARTAN MASTER SECURITY
          </h2>
          <span className="text-[10px] font-mono text-amber-400 font-bold block">
            XÁC THỰC MÃ MASTER PIN 6 SỐ QUẢN TRỊ
          </span>
          <p className="text-[11px] text-gray-400 font-sans">
            Cổng quản trị bảo mật dành riêng cho Tổng Chỉ Huy <strong className="text-white">@tddv2017</strong>
          </p>
        </div>

        {/* Error / Lockout Alert Banner */}
        {errorMsg && (
          <div className="p-3 bg-red-500/20 border border-red-500/60 rounded-2xl text-red-400 text-xs font-bold flex items-center justify-center gap-2 animate-bounce">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isLockedOut && (
          <div className="p-3 bg-red-600/30 border border-red-500 rounded-2xl text-red-300 text-xs font-mono font-bold">
            🔒 KHÓA TRUY CẬP: {remainingTime} GIÂY
          </div>
        )}

        {/* 6-Digit PIN Indicators */}
        <div className="flex justify-center items-center gap-3 py-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                pin.length > i
                  ? 'bg-amber-400 border-amber-400 shadow-[0_0_10px_#f59e0b]'
                  : 'bg-transparent border-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Military Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto font-mono">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(String(num))}
              disabled={isLockedOut}
              className="w-full py-3.5 rounded-2xl bg-[#131927] hover:bg-amber-500/20 active:bg-amber-500 border border-[#1f293d] hover:border-amber-500/50 text-white active:text-black font-black text-lg transition-all shadow-sm disabled:opacity-30"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            disabled={isLockedOut}
            className="w-full py-3.5 rounded-2xl bg-[#131927] hover:bg-red-500/20 border border-[#1f293d] text-gray-400 hover:text-red-400 font-bold text-xs uppercase transition-all disabled:opacity-30 flex items-center justify-center"
          >
            XÓA HẾT
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            disabled={isLockedOut}
            className="w-full py-3.5 rounded-2xl bg-[#131927] hover:bg-amber-500/20 active:bg-amber-500 border border-[#1f293d] hover:border-amber-500/50 text-white active:text-black font-black text-lg transition-all shadow-sm disabled:opacity-30"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            disabled={isLockedOut}
            className="w-full py-3.5 rounded-2xl bg-[#131927] hover:bg-gray-700 border border-[#1f293d] text-gray-300 font-bold text-xs transition-all disabled:opacity-30 flex items-center justify-center"
          >
            ⌫
          </button>
        </div>

        {/* Footer Hint */}
        <div className="pt-2 text-[10px] text-gray-500 font-mono border-t border-[#1f293d]">
          <span>MÃ MASTER PIN MẶC ĐỊNH LẦN ĐẦU: </span>
          <code className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">888899</code>
        </div>
      </div>
    </div>
  );
};
