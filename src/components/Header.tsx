'use client';

import React from 'react';
import { Crown, Activity, MoreHorizontal, ShieldCheck, Swords, Zap, Award } from 'lucide-react';

export interface UserRankInfo {
  rankName: string;
  badgeStyle: string;
  icon: string;
}

export function getUserRankInfo(
  isAdmin: boolean = false,
  username: string = '',
  tradingBalance: number = 0
): UserRankInfo {
  const cleanHandle = username.replace('@', '').toLowerCase();

  // 1. SUPREME LEADER (Admin or Top Account $5,000+)
  if (isAdmin || cleanHandle === 'tddv2017' || cleanHandle === 'spartan_9824029' || tradingBalance >= 5000) {
    return {
      rankName: 'SUPREME LEADER',
      badgeStyle: 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]',
      icon: '👑'
    };
  }

  // 2. ELITE WARRIOR ($2,500+ balance)
  if (tradingBalance >= 2500) {
    return {
      rankName: 'ELITE WARRIOR',
      badgeStyle: 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.3)]',
      icon: '⚔️'
    };
  }

  // 3. SPARTAN COMMANDER ($1,000+ balance)
  if (tradingBalance >= 1000) {
    return {
      rankName: 'SPARTAN COMMANDER',
      badgeStyle: 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.3)]',
      icon: '🛡️'
    };
  }

  // 4. VANGUARD TITAN ($500+ balance)
  if (tradingBalance >= 500) {
    return {
      rankName: 'VANGUARD TITAN',
      badgeStyle: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]',
      icon: '⚡'
    };
  }

  // 5. SPARTAN RECRUIT (Base tier < $500)
  return {
    rankName: 'SPARTAN RECRUIT',
    badgeStyle: 'bg-gray-800 text-gray-300 border border-gray-700',
    icon: '🔰'
  };
}

interface HeaderProps {
  onClose?: () => void;
  username?: string;
  isAdmin?: boolean;
  tradingBalance?: number;
}

export const Header: React.FC<HeaderProps> = ({ 
  onClose,
  username = 'tddv2017',
  isAdmin = true,
  tradingBalance = 0
}) => {
  const rank = getUserRankInfo(isAdmin, username, tradingBalance);

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

      {/* Brand Header & Dynamic Leader Level Badge */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          {/* Prominent Spartan High-Tech Helmet Logo Avatar */}
          <div className="w-12 h-12 rounded-2xl overflow-hidden border border-[#ff5500]/60 shadow-[0_4px_16px_rgba(255,85,0,0.5)] bg-[#0b0e17] relative flex-shrink-0 transition-transform hover:scale-105">
            <img
              src="/assets/spartan_logo_clean.jpg"
              alt="Spartan AI Logo Clean"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black text-white tracking-tight uppercase">
                SPARTAN
              </span>
              <span className="text-[10px] font-extrabold text-gray-400 tracking-wider">TRADING SYSTEM</span>
            </div>

            {/* DYNAMIC LEADER LEVEL BADGE (👑 SUPREME LEADER / ⚔️ ELITE WARRIOR / etc.) */}
            <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mt-1 ${rank.badgeStyle}`}>
              <span>{rank.icon}</span>
              <span>{rank.rankName}</span>
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
