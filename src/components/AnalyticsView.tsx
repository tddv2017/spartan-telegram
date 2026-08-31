'use client';

import React from 'react';
import { BarChart3, TrendingUp, ShieldAlert, Award, Percent, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { TradeHistoryCard } from './TradeHistoryCard';

export const AnalyticsView: React.FC = () => {
  return (
    <div className="w-full space-y-4">
      {/* PERFORMANCE ANALYTICS Banner */}
      <div className="spartan-card rounded-2xl p-4 border border-[#1f293d] space-y-3 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#ff5500]/15 border border-[#ff5500]/40 flex items-center justify-center text-[#ff5500]">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              HIỆU SUẤT ĐẦU TƯ (PERFORMANCE)
            </h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00df89]/10 text-[#00df89] border border-[#00df89]/30">
            50 Lệnh • Net +$666.15
          </span>
        </div>

        {/* 4 Core KPI Cards Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* WIN RATE */}
          <div className="bg-[#0b0e17] rounded-xl p-3 border border-[#1f293d] hover:border-gray-700 transition-colors">
            <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold mb-1">
              <span>TỶ LỆ THẮNG</span>
              <Percent className="w-3.5 h-3.5 text-[#00df89]" />
            </div>
            <div className="text-xl font-black text-[#00df89]">78.0%</div>
            <span className="text-[9px] text-gray-500 font-bold block mt-0.5">39 Thắng / 11 Thua</span>
          </div>

          {/* PROFIT FACTOR */}
          <div className="bg-[#0b0e17] rounded-xl p-3 border border-[#1f293d] hover:border-gray-700 transition-colors">
            <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold mb-1">
              <span>PROFIT FACTOR</span>
              <TrendingUp className="w-3.5 h-3.5 text-[#00df89]" />
            </div>
            <div className="text-xl font-black text-[#00df89]">8.34</div>
            <span className="text-[9px] text-emerald-400 font-bold block mt-0.5">Xuất sắc</span>
          </div>

          {/* SHARPE RATIO */}
          <div className="bg-[#0b0e17] rounded-xl p-3 border border-[#1f293d] hover:border-gray-700 transition-colors">
            <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold mb-1">
              <span>SHARPE RATIO</span>
              <Award className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-xl font-black text-sky-400">8.23</div>
            <span className="text-[9px] text-sky-400 font-bold block mt-0.5">Tốt</span>
          </div>

          {/* MAX DRAWDOWN */}
          <div className="bg-[#0b0e17] rounded-xl p-3 border border-[#1f293d] hover:border-gray-700 transition-colors">
            <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold mb-1">
              <span>MAX DRAWDOWN</span>
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-black text-amber-400">1.2%</div>
            <span className="text-[9px] text-amber-400 font-bold block mt-0.5">Cực kỳ an toàn</span>
          </div>
        </div>

        {/* Breakdown Stats */}
        <div className="space-y-1.5 pt-1 text-[11px]">
          <div className="flex justify-between p-2 rounded-lg bg-[#0b0e17] border border-[#1f293d]">
            <span className="text-gray-400">Tổng Lãi (Gross Profit):</span>
            <span className="font-mono font-bold text-[#00df89]">+$757.10</span>
          </div>
          <div className="flex justify-between p-2 rounded-lg bg-[#0b0e17] border border-[#1f293d]">
            <span className="text-gray-400">Tổng Lỗ (Gross Loss):</span>
            <span className="font-mono font-bold text-[#ff2d55]">-$90.95</span>
          </div>
          <div className="flex justify-between p-2 rounded-lg bg-[#0b0e17] border border-[#1f293d]">
            <span className="text-gray-400">Lệnh Thắng Trung Bình:</span>
            <span className="font-mono font-bold text-[#00df89]">+$19.41</span>
          </div>
          <div className="flex justify-between p-2 rounded-lg bg-[#0b0e17] border border-[#1f293d]">
            <span className="text-gray-400">Lệnh Thua Trung Bình:</span>
            <span className="font-mono font-bold text-[#ff2d55]">-$8.27</span>
          </div>
        </div>
      </div>

      {/* LỊCH SỬ GIAO DỊCH TRADING (TRADE HISTORY CARD) */}
      <TradeHistoryCard />
    </div>
  );
};
