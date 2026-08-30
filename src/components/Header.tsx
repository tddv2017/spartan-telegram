'use client';

import React from 'react';
import { Crown, Activity, MoreHorizontal } from 'lucide-react';

interface HeaderProps {
  onClose?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onClose }) => {
  return (
    <header className="w-full bg-[#0b0e17] sticky top-0 z-50 pt-2 pb-3 px-4 border-b border-[#1f293d]">
      {/* Top Telegram Header Bar */}
      <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
        <button 
          onClick={onClose} 
          className="text-[#ff5500] font-bold text-xs hover:opacity-80 transition-opacity"
        >
          Đóng
        </button>
        <div className="text-center flex items-center gap-1.5 justify-center">
          <h1 className="font-extrabold text-white text-sm tracking-wide">SPARTAN TRADING SYSTEM</h1>
          <span className="text-[9px] text-[#ff5500] font-black uppercase tracking-widest px-1.5 py-0.5 bg-[#ff5500]/15 rounded border border-[#ff5500]/30">LIVE</span>
        </div>
        <button className="p-1 rounded-full hover:bg-gray-800 text-gray-400">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Brand Header & Supreme Leader Badge */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          {/* Prominent Clean Spartan High-Tech Helmet Logo Avatar (w-12 h-12 / 48px) */}
          <div className="w-12 h-12 rounded-2xl overflow-hidden border border-[#ff5500]/60 shadow-[0_4px_16px_rgba(255,85,0,0.5)] bg-[#0b0e17] relative flex-shrink-0 transition-transform hover:scale-105">
            <img
              src="/assets/spartan_logo_clean.jpg"
              alt="Spartan AI Logo Clean"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black text-white tracking-tight">
                SPARTAN
              </span>
              <span className="text-[10px] font-extrabold text-gray-400 tracking-wider">TRADING SYSTEM</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2.5 py-0.5 rounded-full spartan-gold-badge uppercase tracking-wider mt-1">
              <Crown className="w-2.5 h-2.5 text-[#fbbf24]" /> SUPREME LEADER
            </span>
          </div>
        </div>

        {/* Bot Running Status Indicator Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ff5500]/10 border border-[#ff5500]/30 text-[#ff5500] text-[11px] font-extrabold shadow-[0_0_10px_rgba(124,58,237,0.15)]">
          <Activity className="w-3.5 h-3.5 text-[#ff5500] animate-pulse" />
          <span>BOT ĐANG CHẠY</span>
        </div>
      </div>
    </header>
  );
};
