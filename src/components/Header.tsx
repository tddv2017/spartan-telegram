'use client';

import React from 'react';
import { Activity, MoreHorizontal, Bell } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export interface UserRankInfo {
  rankName: string;
  badgeStyle: string;
  icon: string;
}

export function getUserRankInfo(
  isAdmin: boolean = false,
  username: string = '',
  resellerTier: number = 1,
  role: 'ADMIN' | 'RESELLER' | 'CLIENT' = 'CLIENT',
  lang: 'vi' | 'en' = 'vi'
): UserRankInfo {
  const cleanHandle = username.replace('@', '').toLowerCase();

  // 1. SUPREME LEADER (Exclusive ONLY for Admin @tddv2017 / 494232782)
  if (isAdmin || cleanHandle === 'tddv2017' || cleanHandle === 'spartan_9824029') {
    return {
      rankName: lang === 'vi' ? 'LÃNH ĐẠO TỐI CAO' : 'SUPREME LEADER',
      badgeStyle: 'bg-[#d4af37]/15 text-[#f5d77f] border border-[#d4af37]/40 shadow-[0_0_12px_rgba(212,175,55,0.25)]',
      icon: '👑'
    };
  }

  // 2. RESELLER LEVELS 1 TO 10
  if (role === 'RESELLER' || resellerTier > 0) {
    const tierNum = Math.min(10, Math.max(1, resellerTier));
    return {
      rankName: lang === 'vi' ? `ĐỐI TÁC CẤP ${tierNum}` : `RESELLER TIER ${tierNum}`,
      badgeStyle: 'bg-amber-500/15 text-amber-300 border border-amber-500/35 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
      icon: '🎖️'
    };
  }

  // 3. SPARTAN TRADER
  return {
    rankName: lang === 'vi' ? 'NHÀ ĐẦU TƯ SPARTAN' : 'SPARTAN TRADER',
    badgeStyle: 'bg-[#0e121a] text-gray-300 border border-[#221c10]',
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
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onClose,
  username = 'tddv2017',
  isAdmin = true,
  resellerTier = 1,
  tradingBalance = 0,
  isBotActive = true,
  isTechOpsPaused = false,
  unreadNotificationsCount = 0,
  onOpenNotifications,
}) => {
  const { lang, toggleLang, t } = useLanguage();
  const rank = getUserRankInfo(isAdmin, username, resellerTier, 'CLIENT', lang);

  return (
    <header className="w-full bg-[#05070c] sticky top-0 z-50 pt-2 pb-3 px-4 border-b border-[#221c10]">
      {/* Top Telegram Header Bar */}
      <div className="flex items-center justify-between text-sm text-gray-400 mb-2.5">
        <button 
          onClick={() => {
            if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.close) {
              (window as any).Telegram.WebApp.close();
            } else if (onClose) {
              onClose();
            }
          }} 
          className="text-[#d4af37] font-bold text-xs hover:opacity-80 transition-opacity flex items-center gap-1"
        >
          {t('top_close')}
        </button>

        <div className="text-center flex items-center gap-1.5 justify-center">
          <h1 className="font-extrabold text-[#f5d77f] text-xs tracking-wider uppercase">SPARTAN QUANT 300 AI</h1>
          <span className="text-[8px] text-emerald-400 font-black uppercase tracking-widest px-2 py-0.5 bg-emerald-500/15 rounded-full border border-emerald-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            LIVE MT5
          </span>
        </div>

        {/* Right controls: Language Toggle (VI / EN) */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#0c0f17] hover:bg-[#141924] border border-[#2a2215] text-xs font-bold transition-all shadow-sm group active:scale-95"
            title={lang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
          >
            <span className="text-sm">{lang === 'vi' ? '🇻🇳' : '🇬🇧'}</span>
            <span className="font-mono text-[10px] text-[#f5d77f] font-extrabold uppercase">
              {lang === 'vi' ? 'VI' : 'EN'}
            </span>
          </button>
          
          <button className="p-1 rounded-full hover:bg-gray-800 text-gray-400">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Brand Header & Dynamic Rank Badge */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          {/* Spartan Helmet Logo Avatar with 24K Gold Sheen */}
          <div className="w-11 h-11 rounded-2xl overflow-hidden border border-[#d4af37]/60 shadow-[0_0_16px_rgba(212,175,55,0.3)] bg-[#080b12] relative flex-shrink-0 transition-transform hover:scale-105">
            <img
              src="/assets/spartan_logo_clean.jpg"
              alt="Spartan AI Logo Clean"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-[#f5d77f] tracking-tight uppercase">
                SPARTAN
              </span>
              <span className="text-[10px] font-mono font-bold text-gray-400 tracking-wider">QUANT 300 AI</span>
            </div>

            {/* DYNAMIC LEVEL BADGE */}
            <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mt-0.5 ${rank.badgeStyle}`}>
              <span>{rank.icon}</span>
              <span>{rank.rankName}</span>
            </span>
          </div>
        </div>

        {/* Right Action Group: Notification Bell + Bot Status Pill */}
        <div className="flex items-center gap-2">
          {/* Notification Bell Icon with Live Unread Badge */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2.5 rounded-2xl bg-[#0c0f17] hover:bg-[#141924] border border-[#2a2215] text-gray-300 hover:text-white transition-all shadow-md group active:scale-95"
            title="Xem thông báo hệ thống"
          >
            <Bell className="w-4 h-4 group-hover:text-[#f5d77f] transition-colors" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white font-mono font-black text-[10px] rounded-full flex items-center justify-center shadow-[0_0_8px_#ef4444] animate-bounce">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Dynamic Bot Running / Paused Status Indicator Pill */}
          {isTechOpsPaused ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-400 text-[10px] font-black shadow-[0_0_10px_rgba(239,68,68,0.3)] animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span>{t('bot_stopped')}</span>
            </div>
          ) : isBotActive ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[11px] font-extrabold shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>{t('bot_live')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#11141c] border border-[#221c10] text-gray-400 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-gray-500"></span>
              <span>{t('bot_standby')}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
