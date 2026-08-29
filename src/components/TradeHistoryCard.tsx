'use client';

import React from 'react';
import { History, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const mockTrades = [
  { id: 1, pair: 'XAUUSD (Gold)', type: 'BUY', lot: '0.10', profit: '+14.50', time: '18:04 Hôm nay', status: 'WIN' },
  { id: 2, pair: 'XAUUSD (Gold)', type: 'SELL', lot: '0.10', profit: '+8.20', time: '16:22 Hôm nay', status: 'WIN' },
  { id: 3, pair: 'XAUUSD (Gold)', type: 'BUY', lot: '0.15', profit: '-6.40', time: '14:10 Hôm nay', status: 'LOSS' },
  { id: 4, pair: 'XAUUSD (Gold)', type: 'BUY', lot: '0.10', profit: '+22.10', time: 'Hôm qua', status: 'WIN' },
  { id: 5, pair: 'XAUUSD (Gold)', type: 'SELL', lot: '0.20', profit: '+31.80', time: 'Hôm qua', status: 'WIN' },
];

export const TradeHistoryCard: React.FC = () => {
  return (
    <div className="w-full spartan-card rounded-2xl p-4 border border-[#1f293d] space-y-3 shadow-lg">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#00df89]/15 border border-[#00df89]/40 flex items-center justify-center text-[#00df89]">
            <History className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-black text-white uppercase tracking-wider">
            LỊCH SỬ GIAO DỊCH (EXNESS ECN)
          </h3>
        </div>
        <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
          <Clock className="w-3 h-3 text-[#00df89]" /> Realtime Sync
        </span>
      </div>

      {/* Trade History Item List */}
      <div className="space-y-2">
        {mockTrades.map((trade) => (
          <div
            key={trade.id}
            className="flex items-center justify-between p-3 rounded-xl bg-[#0b0e17] border border-[#1f293d] hover:border-gray-700 transition-colors text-xs"
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-black ${
                  trade.type === 'BUY'
                    ? 'bg-[#00df89]/15 text-[#00df89] border border-[#00df89]/30'
                    : 'bg-[#ff2d55]/15 text-[#ff2d55] border border-[#ff2d55]/30'
                }`}
              >
                {trade.type === 'BUY' ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-white">{trade.pair}</span>
                  <span
                    className={`font-black text-[9px] px-1.5 py-0.5 rounded ${
                      trade.type === 'BUY'
                        ? 'bg-[#00df89]/20 text-[#00df89]'
                        : 'bg-[#ff2d55]/20 text-[#ff2d55]'
                    }`}
                  >
                    {trade.type} {trade.lot}
                  </span>
                </div>
                <span className="text-[10px] text-gray-500 font-medium block mt-0.5">
                  {trade.time}
                </span>
              </div>
            </div>

            <div
              className={`font-black text-sm ${
                trade.status === 'WIN' ? 'text-[#00df89]' : 'text-[#ff2d55]'
              }`}
            >
              {trade.profit} USDT
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
