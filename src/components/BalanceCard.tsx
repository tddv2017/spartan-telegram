'use client';

import React from 'react';

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

      {/* Realtime Capital Share & Profit Allocation Row */}
      <div className="mt-3 pt-2.5 border-t border-white/20 space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-white/80 uppercase font-bold">Cổ phần góp vốn:</span>
            <span className="font-mono font-black text-amber-300 bg-black/30 px-2 py-0.5 rounded-lg border border-amber-300/30">
              {poolSharePercentage.toFixed(2)}% Master Pool
            </span>
          </div>
          <div className="text-right flex items-center gap-1.5">
            <span className="text-[10px] text-white/80 uppercase font-bold">Lãi phân bổ:</span>
            <span className={`font-mono font-black ${estimatedPoolProfit >= 0 ? 'text-[#00df89]' : 'text-red-300'}`}>
              {estimatedPoolProfit >= 0 ? '+' : ''}${estimatedPoolProfit.toFixed(2)} USD
            </span>
          </div>
        </div>

        {/* Explicit Multiplication Formula */}
        <div className="bg-black/35 px-3 py-1.5 rounded-xl border border-white/10 flex items-center justify-between text-[10px] font-mono text-white/90">
          <span className="text-gray-300">Phép tính:</span>
          <span className="text-amber-300 font-bold">
            ${totalMasterProfit.toFixed(2)} (Lãi Bot) × {poolSharePercentage.toFixed(2)}% = <strong className="text-[#00df89]">{estimatedPoolProfit >= 0 ? '+' : ''}${estimatedPoolProfit.toFixed(2)} USD</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
