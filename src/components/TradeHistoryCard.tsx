'use client';

import React, { useState } from 'react';
import { History, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

export interface TradeOrder {
  id: string;
  type: 'BUY' | 'SELL';
  symbol: string;
  lots: number;
  openPrice: number;
  closePrice: number;
  pnl: number;
  pnlPercentage: number;
  timestamp: string;
}

// Mock Trading Execution History (EXNESS ECN Live Sync)
const mockTradeOrders: TradeOrder[] = [
  { id: 'ORD-9821', type: 'BUY', symbol: 'XAUUSD', lots: 0.15, openPrice: 2501.20, closePrice: 2508.80, pnl: 114.00, pnlPercentage: 3.04, timestamp: '10 mins ago' },
  { id: 'ORD-9820', type: 'SELL', symbol: 'XAUUSD', lots: 0.10, openPrice: 2512.40, closePrice: 2506.10, pnl: 63.00, pnlPercentage: 2.51, timestamp: '45 mins ago' },
  { id: 'ORD-9819', type: 'BUY', symbol: 'XAUUSD', lots: 0.20, openPrice: 2498.50, closePrice: 2504.20, pnl: 114.00, pnlPercentage: 2.28, timestamp: '2 hours ago' },
  { id: 'ORD-9818', type: 'SELL', symbol: 'XAUUSD', lots: 0.10, openPrice: 2503.00, closePrice: 2507.50, pnl: -45.00, pnlPercentage: -1.80, timestamp: '4 hours ago' },
  { id: 'ORD-9817', type: 'BUY', symbol: 'XAUUSD', lots: 0.25, openPrice: 2492.10, closePrice: 2501.40, pnl: 232.50, pnlPercentage: 3.73, timestamp: '6 hours ago' },
  { id: 'ORD-9816', type: 'BUY', symbol: 'XAUUSD', lots: 0.10, openPrice: 2489.30, closePrice: 2495.20, pnl: 59.00, pnlPercentage: 2.36, timestamp: 'Yesterday 18:30' },
  { id: 'ORD-9815', type: 'SELL', symbol: 'XAUUSD', lots: 0.15, openPrice: 2496.00, closePrice: 2490.50, pnl: 82.50, pnlPercentage: 2.20, timestamp: 'Yesterday 14:15' },
  { id: 'ORD-9814', type: 'BUY', symbol: 'XAUUSD', lots: 0.10, openPrice: 2485.00, closePrice: 2482.10, pnl: -29.00, pnlPercentage: -1.16, timestamp: 'Yesterday 10:05' },
];

export const TradeHistoryCard: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const totalPages = Math.max(1, Math.ceil(mockTradeOrders.length / ITEMS_PER_PAGE));
  const validPage = Math.min(currentPage, totalPages);
  const paginatedOrders = mockTradeOrders.slice((validPage - 1) * ITEMS_PER_PAGE, validPage * ITEMS_PER_PAGE);

  return (
    <div className="w-full spartan-card rounded-3xl p-4 border border-[#1f293d] space-y-3 shadow-lg">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#ff5500]" />
          <h3 className="text-xs font-black text-white uppercase tracking-wider">
            TRADING HISTORY (EXNESS ECN REALTIME)
          </h3>
        </div>
        <span className="text-[10px] text-gray-400 font-bold font-mono">
          Total {mockTradeOrders.length} Orders
        </span>
      </div>

      {/* Orders Sub-List (5 items per page) */}
      <div className="space-y-2">
        {paginatedOrders.map((trade) => (
          <div
            key={trade.id}
            className="flex items-center justify-between p-3 rounded-2xl bg-[#0b0e17] border border-[#1f293d] hover:border-gray-700 transition-colors text-xs"
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center font-black ${
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
                  <span className="font-black text-white">{trade.symbol}</span>
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                      trade.type === 'BUY'
                        ? 'bg-[#00df89]/20 text-[#00df89]'
                        : 'bg-[#ff2d55]/20 text-[#ff2d55]'
                    }`}
                  >
                    {trade.type} {trade.lots} Lot
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono mt-0.5">
                  <span>{trade.openPrice} ➔ {trade.closePrice}</span>
                  <span>•</span>
                  <span className="flex items-center gap-0.5 text-gray-400">
                    <Clock className="w-3 h-3 text-gray-500" />
                    {trade.timestamp}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right font-mono">
              <span
                className={`font-black text-xs block ${
                  trade.pnl >= 0 ? 'text-[#00df89]' : 'text-[#ff2d55]'
                }`}
              >
                {trade.pnl >= 0 ? `+$${trade.pnl.toFixed(2)}` : `-$${Math.abs(trade.pnl).toFixed(2)}`}
              </span>
              <span
                className={`text-[9px] font-bold block ${
                  trade.pnlPercentage >= 0 ? 'text-[#00df89]' : 'text-[#ff2d55]'
                }`}
              >
                {trade.pnlPercentage >= 0 ? `+${trade.pnlPercentage.toFixed(2)}%` : `${trade.pnlPercentage.toFixed(2)}%`}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* PAGINATION CONTROLS BAR (5 Orders per page) */}
      {mockTradeOrders.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between border-t border-[#1f293d] pt-3 text-xs font-bold">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={validPage === 1}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1 transition-all ${
              validPage === 1
                ? 'border-gray-800 text-gray-600 bg-gray-900/50 cursor-not-allowed'
                : 'border-[#1f293d] bg-[#131927] text-white hover:bg-[#1f293d]'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <span className="text-gray-400 font-mono text-[11px]">
            Page <strong className="text-white">{validPage}</strong> of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={validPage >= totalPages}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1 transition-all ${
              validPage >= totalPages
                ? 'border-gray-800 text-gray-600 bg-gray-900/50 cursor-not-allowed'
                : 'border-[#1f293d] bg-[#131927] text-white hover:bg-[#1f293d]'
            }`}
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
