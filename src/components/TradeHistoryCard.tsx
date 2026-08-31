'use client';

import React, { useState } from 'react';
import { History, Clock, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight } from 'lucide-react';

const mockTrades = [
  { id: 1, pair: 'XAUUSD (Gold)', type: 'BUY', lot: '0.10', profit: '+14.50', time: '18:04 Hôm nay', status: 'WIN' },
  { id: 2, pair: 'XAUUSD (Gold)', type: 'SELL', lot: '0.10', profit: '+8.20', time: '16:22 Hôm nay', status: 'WIN' },
  { id: 3, pair: 'XAUUSD (Gold)', type: 'BUY', lot: '0.15', profit: '-6.40', time: '14:10 Hôm nay', status: 'LOSS' },
  { id: 4, pair: 'XAUUSD (Gold)', type: 'BUY', lot: '0.10', profit: '+22.10', time: 'Hôm qua', status: 'WIN' },
  { id: 5, pair: 'XAUUSD (Gold)', type: 'SELL', lot: '0.20', profit: '+31.80', time: 'Hôm qua', status: 'WIN' },
  { id: 6, pair: 'XAUUSD (Gold)', type: 'BUY', lot: '0.10', profit: '+12.30', time: '29/08 19:40', status: 'WIN' },
  { id: 7, pair: 'XAUUSD (Gold)', type: 'SELL', lot: '0.10', profit: '+9.50', time: '29/08 15:10', status: 'WIN' },
  { id: 8, pair: 'XAUUSD (Gold)', type: 'BUY', lot: '0.05', profit: '+5.40', time: '28/08 21:00', status: 'WIN' },
  { id: 9, pair: 'XAUUSD (Gold)', type: 'SELL', lot: '0.15', profit: '-11.20', time: '28/08 18:30', status: 'LOSS' },
  { id: 10, pair: 'XAUUSD (Gold)', type: 'BUY', lot: '0.10', profit: '+18.90', time: '27/08 20:15', status: 'WIN' },
];

export const TradeHistoryCard: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const totalPages = Math.max(1, Math.ceil(mockTrades.length / ITEMS_PER_PAGE));
  const validPage = Math.min(currentPage, totalPages);
  const paginatedTrades = mockTrades.slice((validPage - 1) * ITEMS_PER_PAGE, validPage * ITEMS_PER_PAGE);

  return (
    <div className="w-full spartan-card rounded-2xl p-4 border border-[#1f293d] space-y-3 shadow-lg">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#00df89]/15 border border-[#00df89]/40 flex items-center justify-center text-[#00df89]">
            <History className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-black text-white uppercase tracking-wider">
            LỊCH SỬ GIAO DỊCH TRADING (EXNESS ECN)
          </h3>
        </div>
        <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
          <Clock className="w-3 h-3 text-[#00df89]" /> Total {mockTrades.length} Lệnh
        </span>
      </div>

      {/* Trade History Item List (5 Items Per Page) */}
      <div className="space-y-2">
        {paginatedTrades.map((trade) => (
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
                    {trade.type} {trade.lot} Lot
                  </span>
                </div>
                <span className="text-[10px] text-gray-500 font-mono block mt-0.5">
                  {trade.time}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span
                className={`font-black text-xs block ${
                  trade.status === 'WIN' ? 'text-[#00df89]' : 'text-[#ff2d55]'
                }`}
              >
                {trade.profit} USDT
              </span>
              <span
                className={`text-[9px] font-extrabold ${
                  trade.status === 'WIN' ? 'text-[#00df89]' : 'text-[#ff2d55]'
                }`}
              >
                {trade.status === 'WIN' ? '✓ Thắng' : '✗ Thua'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* PAGINATION CONTROLS BAR (Hiển thị 5 lệnh / trang) */}
      {mockTrades.length > ITEMS_PER_PAGE && (
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
            <span>Trang Trước</span>
          </button>

          <span className="text-gray-400 font-mono text-[11px]">
            Trang <strong className="text-white">{validPage}</strong> / {totalPages}
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
            <span>Trang Sau</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
