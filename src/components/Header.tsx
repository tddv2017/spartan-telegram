'use client';

import React from 'react';
import { Crown, Activity, MoreHorizontal, Shield, Award } from 'lucide-react';

export interface UserRankInfo {
  rankName: string;
  badgeStyle: string;
  icon: string;
}

export function getUserRankInfo(
  isAdmin: boolean = false,
  username: string = '',
  resellerTier: number = 1,
  role: 'ADMIN' | 'RESELLER' | 'CLIENT' = 'CLIENT'
): UserRankInfo {
  const cleanHandle = username.replace('@', '').toLowerCase();

  // 1. SUPREME LEADER (Exclusive ONLY for Admin @tddv2017 / 494232782)
  if (isAdmin || cleanHandle === 'tddv2017' || cleanHandle === 'spartan_9824029') {
    return {
      rankName: 'SUPREME LEADER',
      badgeStyle: 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]',
      icon: '👑'
    };
  }

  // 2. RESELLER LEVELS 1 TO 10
  if (role === 'RESELLER' || resellerTier > 0) {
    const tierNum = Math.min(10, Math.max(1, resellerTier));
    return {
      rankName: `RESELLER LEVEL ${tierNum}`,
      badgeStyle: 'bg-[#ff5500]/20 text-[#ff5500] border border-[#ff5500]/40 shadow-[0_0_10px_rgba(255,85,0,0.3)]',
      icon: '🎖️'
    };
  }

  // 3. SPARTAN TRADER
  return {
    rankName: 'SPARTAN TRADER',
    badgeStyle: 'bg-[#131927] text-gray-300 border border-[#1f293d]',
    icon: '🛡️'
  };
}

interface HeaderProps {
  onClose?: () => void;
  username?: string;
  isAdmin?: boolean;
  resellerTier?: number;
  tradingBalance?: number;
  isBotActive?: boolean;
  isTechOpsPaused?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  onClose,
  username = 'tddv2017',
  isAdmin = true,
  resellerTier = 1,
  tradingBalance = 0,
  isBotActive = true,
  isTechOpsPaused = false,
}) => {
  const rank = getUserRankInfo(isAdmin, username, resellerTier);

  return (
    <header className="w-full bg-[#0b0e17] sticky top-0 z-50 pt-2 pb-3 px-4 border-b border-[#1f293d]">
      {/* Top Telegram Header Bar */}
      <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
        <button 
          onClick={onClose} 
          className="text-[#ff5500] font-bold text-xs hover:opacity-80 transition-opacity"
        >
          Close
        </button>
        <div className="text-center flex items-center gap-1.5 justify-center">
          <h1 className="font-extrabold text-white text-sm tracking-wide">SPARTAN TRADING SYSTEM</h1>
          <span className="text-[9px] text-[#ff5500] font-black uppercase tracking-widest px-1.5 py-0.5 bg-[#ff5500]/15 rounded border border-[#ff5500]/40">LIVE</span>
        </div>
        <button className="p-1 rounded-full hover:bg-gray-800 text-gray-400">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Brand Header & Supreme Leader / 10-Level Reseller Badge */}
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

            {/* DYNAMIC LEVEL BADGE */}
            <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mt-1 ${rank.badgeStyle}`}>
              <span>{rank.icon}</span>
              <span>{rank.rankName}</span>
            </span>
          </div>
        </div>

        {/* Dynamic Bot Running / Paused Status Indicator Pill */}
        {isTechOpsPaused ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-400 text-[10px] font-black shadow-[0_0_10px_rgba(239,68,68,0.3)] animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span>BOT PAUSED (TECH_OPS)</span>
          </div>
        ) : isBotActive ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ff5500]/10 border border-[#ff5500]/40 text-[#ff5500] text-[11px] font-extrabold shadow-[0_0_10px_rgba(255,85,0,0.2)]">
            <Activity className="w-3.5 h-3.5 text-[#ff5500] animate-pulse" />
            <span>BOT ACTIVE</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-400 text-[11px] font-extrabold">
            <span className="w-2 h-2 rounded-full bg-gray-500"></span>
            <span>STANDBY</span>
          </div>
        )}
      </div>
    </header>
  );
};
