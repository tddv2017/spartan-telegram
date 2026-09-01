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
    <div className="w-full spartan-orange-card rounded-3xl p-5 text-white shadow-[0_8px_25px_rgba(255,85,0,0.35)] relative overflow-hidden transition-all duration-300">
      {/* Background Decorative Element */}
      <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Info */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-white/95">
          Total balance (Gồm Hoa Hồng Đại Lý):
        </span>
        <span className="text-[10px] font-black px-3 py-1 rounded-full bg-black/35 text-white border border-white/20 uppercase tracking-wider">
          SPARTAN 300 AI
        </span>
      </div>

      {/* Big Balance Number */}
      <div className="my-2">
        <div className="text-4xl font-black tracking-tight text-white font-mono drop-shadow-md flex items-baseline gap-2">
          <span>${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className="text-sm font-black text-white/90">USDT</span>
        </div>
      </div>

      {/* Bottom Sub-balances */}
      <div className="flex items-center justify-between pt-2 text-xs">
        <span className="font-bold text-white/90">
          Đầu tư: ${tradingBalance.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
        </span>

        <span className="font-black text-[#00df89] px-2.5 py-1 rounded-xl bg-black/25 border border-[#00df89]/50 text-[11px]">
          Hoa hồng Đại lý: +${referralsIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
        </span>
      </div>
    </div>
  );
};
