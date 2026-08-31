'use client';

import React from 'react';
import { TradeHistoryCard } from '@/components/TradeHistoryCard';
import { BarChart3, TrendingUp, PieChart, Activity, DollarSign, Percent, ShieldCheck } from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  return (
    <div className="w-full space-y-4 pb-20">
      {/* Overview Analytics Header Card */}
      <div className="spartan-card rounded-3xl p-5 border border-[#1f293d] space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#ff5500]" />
            <h2 className="text-xs font-black text-white uppercase tracking-wider">
              QUANT PERFORMANCE METRICS (LIVE REALTIME)
            </h2>
          </div>
          <span className="text-[10px] font-black text-[#00df89] bg-[#00df89]/10 px-2.5 py-0.5 rounded-full border border-[#00df89]/20 uppercase">
            EXNESS ECN AUDITED
          </span>
        </div>

        {/* Top 4 Performance KPI Cards */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Win Rate */}
          <div className="bg-[#0b0e17] p-3.5 rounded-2xl border border-[#1f293d]">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">WIN RATE</span>
            <div className="text-xl font-black text-[#00df89] font-mono">
              78.5%
            </div>
            <span className="text-[9px] text-gray-500 font-bold block mt-0.5">142 Trades (111 Wins / 31 Losses)</span>
          </div>

          {/* Profit Factor */}
          <div className="bg-[#0b0e17] p-3.5 rounded-2xl border border-[#1f293d]">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">PROFIT FACTOR</span>
            <div className="text-xl font-black text-amber-400 font-mono">
              2.45
            </div>
            <span className="text-[9px] text-gray-500 font-bold block mt-0.5">High Performance</span>
          </div>

          {/* Sharpe Ratio */}
          <div className="bg-[#0b0e17] p-3.5 rounded-2xl border border-[#1f293d]">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">SHARPE RATIO</span>
            <div className="text-xl font-black text-[#ff5500] font-mono">
              2.18
            </div>
            <span className="text-[9px] text-gray-500 font-bold block mt-0.5">Low Risk Exposure</span>
          </div>

          {/* Max Drawdown */}
          <div className="bg-[#0b0e17] p-3.5 rounded-2xl border border-[#1f293d]">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">MAX DRAWDOWN</span>
            <div className="text-xl font-black text-emerald-400 font-mono">
              -4.2%
            </div>
            <span className="text-[9px] text-gray-500 font-bold block mt-0.5">Strict Risk Control</span>
          </div>
        </div>

        {/* Detailed Financial Stats Grid */}
        <div className="bg-[#0b0e17] rounded-2xl p-3.5 border border-[#1f293d] space-y-2 text-xs">
          <div className="flex justify-between text-gray-400">
            <span>Gross Profit:</span>
            <span className="font-mono font-bold text-[#00df89]">+$14,250.00 USD</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Gross Loss:</span>
            <span className="font-mono font-bold text-[#ff2d55]">-$5,816.30 USD</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Average Win Trade:</span>
            <span className="font-mono font-bold text-[#00df89]">+$128.38 USD</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Average Loss Trade:</span>
            <span className="font-mono font-bold text-[#ff2d55]">-$187.62 USD</span>
          </div>
        </div>
      </div>

      {/* TRADE HISTORY CARD INSIDE ANALYTICS TAB */}
      <TradeHistoryCard />
    </div>
  );
};
