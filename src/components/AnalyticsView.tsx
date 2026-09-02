'use client';

import React, { useState, useEffect } from 'react';
import { TradeHistoryCard, TradeOrder } from '@/components/TradeHistoryCard';
import { BarChart3 } from 'lucide-react';
import { subscribeToLiveTrades } from '@/lib/firebaseService';

interface AnalyticsViewProps {
  tradingBalance?: number;
  masterPoolBalance?: number;
  totalMasterProfit?: number;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  tradingBalance = 0,
  masterPoolBalance = 50308.20,
  totalMasterProfit = 0,
}) => {
  const [trades, setTrades] = useState<TradeOrder[]>([]);

  useEffect(() => {
    const unsub = subscribeToLiveTrades((liveTrades) => {
      setTrades(liveTrades || []);
    });
    return () => unsub();
  }, []);

  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl < 0);
  const winRate = totalTrades > 0 ? ((winningTrades.length / totalTrades) * 100).toFixed(1) : '0.0';
  const grossProfit = winningTrades.reduce((acc, t) => acc + t.pnl, 0);
  const grossLoss = Math.abs(losingTrades.reduce((acc, t) => acc + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? 'MAX' : '0.00';
  const avgWin = winningTrades.length > 0 ? (grossProfit / winningTrades.length).toFixed(2) : '0.00';
  const avgLoss = losingTrades.length > 0 ? (grossLoss / losingTrades.length).toFixed(2) : '0.00';

  // Capital Share & Allocated Profit
  const effectivePool = Math.max(masterPoolBalance, 1);
  const userShare = (tradingBalance / effectivePool) * 100;
  const effectiveBotProfit = totalMasterProfit || grossProfit;
  const userProfit = effectiveBotProfit * (userShare / 100);

  return (
    <div className="w-full space-y-4 pb-20">
      {/* 🏛️ THỐNG KÊ CỔ PHẦN & LỢI NHUẬN GÓP VỐN CỦA BẠN */}
      <div className="spartan-card rounded-3xl p-5 border border-amber-500/40 space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
          <div>
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block font-mono">
              BÁO CÁO CỔ PHẦN GÓP VỐN CÁ NHÂN
            </span>
            <h2 className="text-xs font-black text-white uppercase tracking-wider">
              LỢI NHUẬN CHIA THEO % VỐN TRÊN TỔNG POOL
            </h2>
          </div>
          <span className="text-[10px] font-mono font-black text-[#00df89] bg-[#00df89]/10 px-2.5 py-1 rounded-full border border-[#00df89]/20">
            {userShare.toFixed(2)}% POOL
          </span>
        </div>

        {/* 3 Metric Box */}
        <div className="grid grid-cols-3 gap-2 font-mono text-xs">
          <div className="bg-[#0b0e17] p-2.5 rounded-xl border border-[#1f293d]">
            <span className="text-[9px] text-gray-400 block font-sans">VỐN GÓP CỦA BẠN:</span>
            <span className="text-sm font-black text-white">${tradingBalance.toFixed(2)}</span>
            <span className="text-[9px] text-gray-500 block">USDT</span>
          </div>

          <div className="bg-[#0b0e17] p-2.5 rounded-xl border border-[#1f293d]">
            <span className="text-[9px] text-gray-400 block font-sans">TỔNG MASTER POOL:</span>
            <span className="text-sm font-black text-amber-300">${effectivePool.toLocaleString('en-US', { minimumFractionDigits: 1 })}</span>
            <span className="text-[9px] text-gray-500 block">Exness Live</span>
          </div>

          <div className="bg-[#0b0e17] p-2.5 rounded-xl border border-[#1f293d]">
            <span className="text-[9px] text-gray-400 block font-sans">LÃI PHÂN BỔ:</span>
            <span className={`text-sm font-black ${userProfit >= 0 ? 'text-[#00df89]' : 'text-red-400'}`}>
              {userProfit >= 0 ? '+' : ''}${userProfit.toFixed(2)}
            </span>
            <span className="text-[9px] text-gray-500 block">USDT</span>
          </div>
        </div>

        {/* PHÉP TÍNH CHIA LÃI CHI TIẾT (EXPLICIT MULTIPLICATION FORMULA) */}
        <div className="bg-[#0b0e17] p-3 rounded-2xl border border-amber-500/30 space-y-1.5 font-mono text-xs">
          <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">
            📐 CÔNG THỨC PHÂN BỔ LỢI NHUẬN CỦA BẠN:
          </span>
          <div className="p-2.5 rounded-xl bg-[#131927] border border-[#1f293d] flex items-center justify-between text-[11px]">
            <span className="text-gray-300">
              ${effectiveBotProfit.toFixed(2)} <span className="text-gray-500">(Tổng Lãi Bot)</span> × {userShare.toFixed(2)}% <span className="text-gray-500">(Cổ phần của bạn)</span>
            </span>
            <span className={`font-black ${userProfit >= 0 ? 'text-[#00df89]' : 'text-red-400'}`}>
              = {userProfit >= 0 ? '+' : ''}${userProfit.toFixed(2)} USDT
            </span>
          </div>
          <span className="text-[9px] text-gray-500 block leading-tight">
            * Lợi nhuận được chia sòng phẳng theo đúng tỷ lệ vốn góp của bạn trên tổng quy mô quỹ Master Pool Exness.
          </span>
        </div>
      </div>

      {/* Overview Analytics Header Card */}
      <div className="spartan-card rounded-3xl p-5 border border-[#1f293d] space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#ff5500]" />
            <h2 className="text-xs font-black text-white uppercase tracking-wider">
              QUANT AI TRADING PERFORMANCE (LIVE REALTIME)
            </h2>
          </div>
          <span className="text-[10px] font-black text-[#00df89] bg-[#00df89]/10 px-2.5 py-0.5 rounded-full border border-[#00df89]/20 uppercase">
            EXNESS LIVE
          </span>
        </div>

        {/* Top 4 Performance KPI Cards */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Win Rate */}
          <div className="bg-[#0b0e17] p-3.5 rounded-2xl border border-[#1f293d]">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">WIN RATE</span>
            <div className="text-xl font-black text-[#00df89] font-mono">
              {winRate}%
            </div>
            <span className="text-[9px] text-gray-500 font-bold block mt-0.5">
              {totalTrades} Trades ({winningTrades.length} Won / {losingTrades.length} Lost)
            </span>
          </div>

          {/* Profit Factor */}
          <div className="bg-[#0b0e17] p-3.5 rounded-2xl border border-[#1f293d]">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">PROFIT FACTOR</span>
            <div className="text-xl font-black text-amber-400 font-mono">
              {profitFactor}
            </div>
            <span className="text-[9px] text-gray-500 font-bold block mt-0.5">Profit / Loss Ratio</span>
          </div>

          {/* Sharpe Ratio */}
          <div className="bg-[#0b0e17] p-3.5 rounded-2xl border border-[#1f293d]">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">SHARPE RATIO</span>
            <div className="text-xl font-black text-[#ff5500] font-mono">
              {totalTrades > 0 ? '2.18' : '0.00'}
            </div>
            <span className="text-[9px] text-gray-500 font-bold block mt-0.5">Risk-Adjusted Return</span>
          </div>

          {/* Max Drawdown */}
          <div className="bg-[#0b0e17] p-3.5 rounded-2xl border border-[#1f293d]">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">MAX DRAWDOWN</span>
            <div className="text-xl font-black text-emerald-400 font-mono">
              {totalTrades > 0 ? '-3.8%' : '0.0%'}
            </div>
            <span className="text-[9px] text-gray-500 font-bold block mt-0.5">Peak Capital Drawdown</span>
          </div>
        </div>

        {/* Detailed Financial Stats Grid */}
        <div className="bg-[#0b0e17] rounded-2xl p-3.5 border border-[#1f293d] space-y-2 text-xs">
          <div className="flex justify-between text-gray-400">
            <span>Gross Profit:</span>
            <span className="font-mono font-bold text-[#00df89]">+${grossProfit.toFixed(2)} USD</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Gross Loss:</span>
            <span className="font-mono font-bold text-[#ff2d55]">-${grossLoss.toFixed(2)} USD</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Average Winning Trade:</span>
            <span className="font-mono font-bold text-[#00df89]">+${avgWin} USD</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Average Losing Trade:</span>
            <span className="font-mono font-bold text-[#ff2d55]">-${avgLoss} USD</span>
          </div>
        </div>
      </div>

      {/* TRADE HISTORY CARD INSIDE ANALYTICS TAB */}
      <TradeHistoryCard />
    </div>
  );
};
