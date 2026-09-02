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
      badgeStyle: 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]',
      icon: '👑'
    };
  }

  // 2. RESELLER LEVELS 1 TO 10
  if (role === 'RESELLER' || resellerTier > 0) {
    const tierNum = Math.min(10, Math.max(1, resellerTier));
    return {
      rankName: lang === 'vi' ? `ĐỐI TÁC CẤP ${tierNum}` : `RESELLER TIER ${tierNum}`,
      badgeStyle: 'bg-[#ff5500]/20 text-[#ff5500] border border-[#ff5500]/40 shadow-[0_0_10px_rgba(255,85,0,0.3)]',
      icon: '🎖️'
    };
  }

  // 3. SPARTAN TRADER
  return {
    rankName: lang === 'vi' ? 'NHÀ ĐẦU TƯ SPARTAN' : 'SPARTAN TRADER',
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
    <header className="w-full bg-[#0b0e17] sticky top-0 z-50 pt-2 pb-3 px-4 border-b border-[#1f293d]">
      {/* Top Telegram Header Bar */}
      <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
        <button 
          onClick={() => {
            if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.close) {
              (window as any).Telegram.WebApp.close();
            } else if (onClose) {
              onClose();
            }
          }} 
          className="text-[#ff5500] font-bold text-xs hover:opacity-80 transition-opacity"
        >
          {t('top_close')}
        </button>

        <div className="text-center flex items-center gap-1.5 justify-center">
          <h1 className="font-extrabold text-white text-sm tracking-wide">SPARTAN QUANT 300 AI</h1>
          <span className="text-[9px] text-[#00df89] font-black uppercase tracking-widest px-2 py-0.5 bg-[#00df89]/15 rounded-full border border-[#00df89]/40 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00df89] animate-ping" />
            LIVE MT5
          </span>
        </div>

        {/* Right controls: Language Toggle (VI / EN) */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#131927] hover:bg-[#1f293d] border border-[#1f293d] text-xs font-bold transition-all shadow-sm group"
            title={lang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
          >
            <span className="text-sm">{lang === 'vi' ? '🇻🇳' : '🇬🇧'}</span>
            <span className="font-mono text-[10px] text-amber-400 font-extrabold uppercase">
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
          {/* Spartan Helmet Logo Avatar */}
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
              <span className="text-[10px] font-extrabold text-gray-400 tracking-wider">QUANT AI</span>
            </div>

            {/* DYNAMIC LEVEL BADGE */}
            <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mt-1 ${rank.badgeStyle}`}>
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
            className="relative p-2.5 rounded-2xl bg-[#131927] hover:bg-[#1f293d] border border-[#1f293d] text-gray-300 hover:text-white transition-all shadow-md group"
            title="Xem thông báo hệ thống"
          >
            <Bell className="w-4 h-4 group-hover:text-amber-400 transition-colors" />
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
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00df89]/10 border border-[#00df89]/40 text-[#00df89] text-[11px] font-extrabold shadow-[0_0_10px_rgba(0,223,137,0.2)]">
              <Activity className="w-3.5 h-3.5 text-[#00df89] animate-pulse" />
              <span>{t('bot_live')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-400 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-gray-500"></span>
              <span>{t('bot_standby')}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
