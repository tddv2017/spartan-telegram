'use client';

import React from 'react';

interface BalanceCardProps {
  tradingBalance: number;
  referralsIncome?: number;
  genBadge?: string;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  tradingBalance = 7462415.57,
  referralsIncome = 800.00,
  genBadge = 'SPARTAN 300 AI',
}) => {
  const totalCombinedBalance = tradingBalance + referralsIncome;

  return (
    <div className="w-full spartan-subtle-purple-gradient rounded-3xl p-5 text-white relative overflow-hidden transition-all duration-300 my-2">
      {/* Background subtle violet aura hint */}
      <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-[#7c3aed]/20 rounded-full blur-2xl pointer-events-none" />

      {/* Top row: Label & SPARTAN Badge */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-extrabold text-white/90 tracking-wide">
          Total balance (Gồm Hoa Hồng Đại Lý):
        </span>
        <span className="px-3 py-1 bg-black/25 backdrop-blur-md rounded-full text-[11px] font-black text-white border border-white/20 tracking-wider">
          {genBadge}
        </span>
      </div>

      {/* Main Combined Balance Display */}
      <div className="flex items-baseline gap-2 my-1">
        <span className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-sm">
          ${totalCombinedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className="text-sm font-black text-white/90">USDT</span>
      </div>

      {/* Thin Divider Line */}
      <div className="w-full h-[1px] bg-white/20 my-3" />

      {/* Bottom row: Breakdown of Trading + Referral Income */}
      <div className="flex items-center justify-between text-xs font-bold text-white/90">
        <span>Đầu tư: <strong className="text-white">${tradingBalance.toLocaleString()}</strong></span>
        <span className="font-extrabold text-[#00df89] bg-[#00df89]/20 px-2 py-0.5 rounded border border-[#00df89]/40">
          Hoa hồng Đại lý: +${referralsIncome.toFixed(2)} USDT
        </span>
      </div>
    </div>
  );
};
