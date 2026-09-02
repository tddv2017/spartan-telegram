'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface BalanceCardProps {
  tradingBalance: number;
  referralsIncome: number;
  poolSharePercentage?: number;
  estimatedPoolProfit?: number;
  totalMasterProfit?: number;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  tradingBalance = 0.00,
  referralsIncome = 0.00,
  poolSharePercentage = 0.00,
  estimatedPoolProfit = 0.00,
  totalMasterProfit = 0.00,
}) => {
  const { t } = useLanguage();
  const totalBalance = tradingBalance + referralsIncome;

  return (
    <div className="w-full gold-gradient-border shadow-[0_12px_35px_rgba(212,175,55,0.22)] relative transition-all duration-300">
      <div className="w-full rounded-[23px] p-5 bg-gradient-to-br from-[#0a0d16] via-[#070910] to-[#04060a] relative overflow-hidden space-y-3">
        
        {/* Subtle Background Watermark Shield */}
        <div className="absolute -right-6 -bottom-8 opacity-[0.05] text-[130px] font-black pointer-events-none select-none text-[#d4af37]">
          🛡️
        </div>

        {/* Ambient Gold Sheen Glow */}
        <div className="absolute top-0 right-1/4 w-32 h-32 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Line */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black text-[#d4af37] tracking-wider uppercase flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            {t('total_balance')}
          </span>
          <span className="text-[9px] font-mono font-black px-2.5 py-0.5 rounded-full bg-[#d4af37]/15 text-[#f5d77f] border border-[#d4af37]/40 uppercase tracking-wider">
            {poolSharePercentage > 0 ? `POOL SHARE ${(poolSharePercentage * 100).toFixed(1)}%` : 'SPARTAN 300 AI'}
          </span>
        </div>

        {/* Big Balance Display in Shimmering Champagne Gold */}
        <div className="my-1">
          <div className="text-3xl sm:text-4xl font-black tracking-tight font-mono flex items-baseline gap-2">
            <span className="gold-text-metallic drop-shadow-[0_2px_14px_rgba(212,175,55,0.3)]">
              ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-sm font-black text-[#d4af37]">USDT</span>
          </div>

          {/* Realtime Profit Allocation Pill */}
          <div className="flex items-center gap-2 pt-1.5">
            <span className="inline-flex items-center gap-1 text-xs font-mono font-black text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
              {estimatedPoolProfit >= 0 ? '↗ +' : '↘ -'}${Math.abs(estimatedPoolProfit).toFixed(2)} USDT
            </span>
            <span className="text-[10px] font-mono text-gray-400">
              {t('accumulated_profit')}
            </span>
          </div>
        </div>

        {/* Bottom Sub-Bar: Capital & Rebate Breakdown */}
        <div className="pt-3 border-t border-[#221c10] grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[10px] text-gray-400 block font-medium">
              {t('trading_capital')}
            </span>
            <span className="font-mono font-black text-white text-sm">
              ${tradingBalance.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-gray-400 block font-medium">
              {t('rebate')}
            </span>
            <span className="font-mono font-black text-[#f5d77f] text-sm">
              +${referralsIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
