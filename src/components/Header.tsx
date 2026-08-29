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
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff5500] via-[#ea580c] to-[#7c3aed] flex items-center justify-center font-black text-white text-lg shadow-[0_4px_12px_rgba(255,85,0,0.4)]">
            S
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-white tracking-tight">
                SPARTAN
              </span>
              <span className="text-[9px] font-bold text-gray-400 tracking-wider">TRADING SYSTEM</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full spartan-gold-badge uppercase tracking-wider mt-0.5">
              <Crown className="w-2.5 h-2.5 text-[#fbbf24]" /> SUPREME LEADER
            </span>
          </div>
        </div>

        {/* Bot Running Status Indicator Pill (Synced Orange with 15% Violet Glow) */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ff5500]/10 border border-[#ff5500]/30 text-[#ff5500] text-[11px] font-extrabold shadow-[0_0_10px_rgba(124,58,237,0.15)]">
          <Activity className="w-3.5 h-3.5 text-[#ff5500] animate-pulse" />
          <span>BOT ĐANG CHẠY</span>
        </div>
      </div>
    </header>
  );
};
