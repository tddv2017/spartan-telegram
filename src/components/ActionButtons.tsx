'use client';

import React from 'react';
import { Shield, Send, MessageCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ActionButtonsProps {
  isActive: boolean;
  onStart: () => void;
  onStop: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  isActive,
  onStart,
  onStop,
}) => {
  const { t } = useLanguage();

  const handleOpenSupport = () => {
    const supportUrl = 'https://t.me/tddv2017';
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.openTelegramLink) {
      (window as any).Telegram.WebApp.openTelegramLink(supportUrl);
    } else {
      window.open(supportUrl, '_blank');
    }
  };

  const handleOpenChannel = () => {
    const channelUrl = 'https://t.me/SpartanQuantAIBot';
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.openTelegramLink) {
      (window as any).Telegram.WebApp.openTelegramLink(channelUrl);
    } else {
      window.open(channelUrl, '_blank');
    }
  };

  return (
    <div className="w-full space-y-2.5 my-2">
      {/* Row 1: Engage Bot vs Standby */}
      <div className="grid grid-cols-2 gap-3">
        {/* ENGAGE BOT BUTTON */}
        <button
          onClick={onStart}
          className={`py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.97] ${
            isActive
              ? 'spartan-cta-btn shadow-[0_4px_20px_rgba(255,85,0,0.4)] scale-[1.02]'
              : 'bg-[#080b12] border border-[#221c10] text-gray-400 hover:text-white hover:border-[#d4af37]/40'
          }`}
        >
          <span className="text-sm">{isActive ? '⚔️' : '🗡️'}</span>
          <span>{isActive ? t('bot_running') : t('engage_bot')}</span>
        </button>

        {/* STANDBY BUTTON */}
        <button
          onClick={onStop}
          className={`py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.97] ${
            !isActive
              ? 'bg-[#d4af37]/15 border-2 border-[#d4af37] text-[#f5d77f] shadow-[0_0_15px_rgba(212,175,55,0.3)] scale-[1.02]'
              : 'bg-[#080b12] border border-[#221c10] text-gray-400 hover:text-white hover:border-[#d4af37]/30'
          }`}
        >
          <Shield className={`w-4 h-4 ${!isActive ? 'text-[#f5d77f] fill-[#f5d77f]/30 animate-pulse' : 'text-gray-500'}`} />
          <span>{t('standby')}</span>
        </button>
      </div>

      {/* Row 2: Real Telegram Support vs Official Signal Channel */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleOpenSupport}
          className="py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 bg-[#080b12] border border-[#221c10] text-gray-200 hover:border-[#d4af37]/40 hover:text-[#f5d77f] transition-all shadow-sm active:scale-[0.97]"
        >
          <MessageCircle className="w-4 h-4 text-emerald-400" />
          <span>{t('support_247')}</span>
        </button>

        <button
          onClick={handleOpenChannel}
          className="py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 bg-[#080b12] border border-[#221c10] text-gray-200 hover:border-[#d4af37]/40 hover:text-[#f5d77f] transition-all shadow-sm active:scale-[0.97]"
        >
          <Send className="w-3.5 h-3.5 text-[#f5d77f]" />
          <span>{t('live_signal')}</span>
        </button>
      </div>
    </div>
  );
};
