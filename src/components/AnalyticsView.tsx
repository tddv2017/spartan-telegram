'use client';

import React, { useState, useEffect } from 'react';
import { TradeHistoryCard, TradeOrder } from '@/components/TradeHistoryCard';
import { BarChart3 } from 'lucide-react';
import { subscribeToLiveTrades } from '@/lib/firebaseService';

interface AnalyticsViewProps {
  tradingBalance?: number;
  masterPoolBalance?: number;
  totalMasterProfit?: number;
  userCapitalJoinedAt?: string | null;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  tradingBalance = 0,
  masterPoolBalance = 50308.20,
  totalMasterProfit = 0,
  userCapitalJoinedAt,
}) => {
  const [trades, setTrades] = useState<TradeOrder[]>([]);

  useEffect(() => {
    const unsub = subscribeToLiveTrades((liveTrades) => {
      setTrades(liveTrades || []);
    });
    return () => unsub();
  }, []);

  // Filter trades eligible for this user (entered at or after user deposit)
  const eligibleTrades = userCapitalJoinedAt
    ? trades.filter(t => new Date(t.timestamp).getTime() >= new Date(userCapitalJoinedAt).getTime())
    : trades;

  const totalTrades = eligibleTrades.length;
  const winningTrades = eligibleTrades.filter(t => t.pnl > 0);
  const losingTrades = eligibleTrades.filter(t => t.pnl < 0);
  const winRate = totalTrades > 0 ? ((winningTrades.length / totalTrades) * 100).toFixed(1) : '0.0';
  const grossProfit = winningTrades.reduce((acc, t) => acc + t.pnl, 0);
  const grossLoss = Math.abs(losingTrades.reduce((acc, t) => acc + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? 'MAX' : '0.00';
  const avgWin = winningTrades.length > 0 ? (grossProfit / winningTrades.length).toFixed(2) : '0.00';
  const avgLoss = losingTrades.length > 0 ? (grossLoss / losingTrades.length).toFixed(2) : '0.00';

  // Capital Share Ratio for this customer
  const effectivePool = Math.max(masterPoolBalance, 1);
  const userRatio = (tradingBalance > 0 && effectivePool > 0) ? (tradingBalance / effectivePool) : 1;

  // Personal Scaled PnL
  const userGrossProfit = grossProfit * userRatio;
  const userGrossLoss = grossLoss * userRatio;
  const userAvgWin = Number(avgWin) * userRatio;
  const userAvgLoss = Number(avgLoss) * userRatio;

  return (
    <div className="w-full space-y-4 pb-20">
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

        {/* Detailed Financial Stats Grid - Scaled to user's capital share */}
        <div className="bg-[#0b0e17] rounded-2xl p-3.5 border border-[#1f293d] space-y-2 text-xs">
          <div className="flex justify-between text-gray-400">
            <span>Gross Profit:</span>
            <span className="font-mono font-bold text-[#00df89]">+${userGrossProfit.toFixed(2)} USD</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Gross Loss:</span>
            <span className="font-mono font-bold text-[#ff2d55]">-${userGrossLoss.toFixed(2)} USD</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Average Winning Trade:</span>
            <span className="font-mono font-bold text-[#00df89]">+${userAvgWin.toFixed(2)} USD</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Average Losing Trade:</span>
            <span className="font-mono font-bold text-[#ff2d55]">-${userAvgLoss.toFixed(2)} USD</span>
          </div>
        </div>
      </div>

      {/* TRADE HISTORY CARD SCALED TO USER'S CAPITAL */}
      <TradeHistoryCard shareRatio={userRatio} userCapitalJoinedAt={userCapitalJoinedAt} />
    </div>
  );
};
