'use client';

import React from 'react';

interface BalanceCardProps {
  tradingBalance: number;
  referralsIncome: number;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  tradingBalance = 0.00,
  referralsIncome = 0.00,
}) => {
  const totalBalance = tradingBalance + referralsIncome;

  return (
    <div className="w-full spartan-orange-card rounded-3xl p-5 text-white shadow-[0_10px_30px_rgba(255,85,0,0.45)] relative overflow-hidden transition-all duration-300">
      {/* Background Decorative Glow Bubble */}
      <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Line */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-white/95 tracking-tight">
          Total Balance (Incl. Reseller Rebates):
        </span>
        <span className="text-[10px] font-black px-3 py-1 rounded-full bg-black/40 text-white border border-white/20 uppercase tracking-wider">
          SPARTAN 300 AI
        </span>
      </div>

      {/* Big Balance Display */}
      <div className="my-2">
        <div className="text-4xl font-black tracking-tight text-white font-mono drop-shadow-md flex items-baseline gap-2">
          <span>${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className="text-sm font-bold text-white/90">USDT</span>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-xs font-bold text-white/95">
          Trading Capital: ${tradingBalance.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
        </span>

        <span className="text-xs font-black text-[#00df89] px-3 py-1.5 rounded-xl bg-[#00df89]/15 border border-[#00df89]/60 shadow-[0_0_10px_rgba(0,223,137,0.15)]">
          Reseller Rebate: +${referralsIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
        </span>
      </div>
    </div>
  );
};
