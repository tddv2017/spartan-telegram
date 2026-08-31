'use client';

import React from 'react';
import { Wallet, TrendingUp, ArrowDownLeft, ArrowUpRight, ShieldCheck } from 'lucide-react';

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
    <div className="w-full spartan-orange-card rounded-3xl p-5 text-white shadow-[0_8px_25px_rgba(255,85,0,0.35)] relative overflow-hidden transition-all duration-300 hover:shadow-[0_12px_30px_rgba(255,85,0,0.45)]">
      {/* Background Decorative Element */}
      <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Info */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-white/90" />
          <span className="text-xs font-black uppercase tracking-wider text-white/90">
            TOTAL BALANCE (INCL. RESELLER REBATES):
          </span>
        </div>
        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-black/25 text-amber-200 border border-amber-300/40 uppercase tracking-wider">
          SPARTAN DEFI
        </span>
      </div>

      {/* Big Balance Number */}
      <div className="mb-4">
        <div className="text-3xl font-black tracking-tight text-white font-mono drop-shadow-md">
          ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span className="text-sm font-bold text-white/80 ml-1.5">USDT</span>
        </div>
      </div>

      {/* Breakdown Cards Grid */}
      <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/20">
        {/* Trading Capital */}
        <div className="bg-black/25 backdrop-blur-md rounded-2xl p-2.5 border border-white/15">
          <span className="text-[10px] text-white/70 font-extrabold uppercase tracking-wider block mb-0.5">
            TRADING CAPITAL
          </span>
          <span className="text-sm font-black font-mono text-white">
            ${tradingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Reseller Rebates */}
        <div className="bg-black/25 backdrop-blur-md rounded-2xl p-2.5 border border-white/15">
          <span className="text-[10px] text-white/70 font-extrabold uppercase tracking-wider block mb-0.5">
            RESELLER REBATES
          </span>
          <span className="text-sm font-black font-mono text-[#00df89]">
            +${referralsIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
};
