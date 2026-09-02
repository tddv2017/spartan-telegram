'use client';

import React, { useState, useEffect } from 'react';
import { History, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Clock, ChevronLeft, ChevronRight, Activity, Radio } from 'lucide-react';
import { subscribeToLiveTrades } from '@/lib/firebaseService';

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

interface TradeHistoryCardProps {
  shareRatio?: number;
  userCapitalJoinedAt?: string | null;
}

export const TradeHistoryCard: React.FC<TradeHistoryCardProps> = ({
  shareRatio = 1,
  userCapitalJoinedAt,
}) => {
  const [trades, setTrades] = useState<TradeOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const userRatio = (typeof shareRatio === 'number' && shareRatio > 0 && shareRatio <= 1) ? shareRatio : 1;

  // Realtime Live Stream Listener for Trades executed on MT5 Exness
  useEffect(() => {
    const unsub = subscribeToLiveTrades((liveTrades) => {
      setTrades(liveTrades || []);
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  const totalPages = Math.max(1, Math.ceil(trades.length / ITEMS_PER_PAGE));
  const validPage = Math.min(currentPage, totalPages);
  const paginatedOrders = trades.slice((validPage - 1) * ITEMS_PER_PAGE, validPage * ITEMS_PER_PAGE);

  return (
    <div className="w-full spartan-card rounded-3xl p-4 border border-[#1f293d] space-y-3 shadow-lg">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#ff5500]" />
          <h3 className="text-xs font-black text-white uppercase tracking-wider">
            EXECUTED ORDER HISTORY (EXNESS MT5 LIVE)
          </h3>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-black text-[#00df89] bg-[#00df89]/10 px-2 py-0.5 rounded-full border border-[#00df89]/20 font-mono">
          <Radio className="w-3 h-3 animate-pulse" />
          <span>LIVE FEED</span>
        </div>
      </div>

      {/* Orders Sub-List or Empty State */}
      {isLoading ? (
        <div className="py-8 text-center text-xs text-gray-500 font-bold flex items-center justify-center gap-2">
          <Activity className="w-4 h-4 animate-spin text-[#ff5500]" />
          <span>Syncing real-time order execution stream from Exness...</span>
        </div>
      ) : trades.length === 0 ? (
        <div className="py-8 px-4 text-center rounded-2xl bg-[#0b0e17] border border-[#1f293d] space-y-2">
          <div className="w-10 h-10 mx-auto rounded-xl bg-[#ff5500]/10 border border-[#ff5500]/20 flex items-center justify-center text-[#ff5500]">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <h4 className="text-xs font-black text-white uppercase tracking-wider">
            NO NEW TRADES EXECUTED
          </h4>
          <p className="text-[11px] text-gray-400 max-w-xs mx-auto leading-relaxed">
            Quant AI is scanning Gold (XAU/USD) markets. Live filled orders from Master Exness accounts will automatically appear here upon position trigger.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {paginatedOrders.map((trade) => {
            const isTradeBeforeJoin = userCapitalJoinedAt 
              ? new Date(trade.timestamp).getTime() < new Date(userCapitalJoinedAt).getTime()
              : false;

            const effectiveLots = isTradeBeforeJoin ? 0 : Math.max(0.01, Number((trade.lots * userRatio).toFixed(2)));
            const effectivePnl = isTradeBeforeJoin ? 0 : trade.pnl * userRatio;

            return (
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
                        {trade.type} {effectiveLots > 0 ? `${effectiveLots} Lot` : `${trade.lots} Lot (Master)`}
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
                  {isTradeBeforeJoin ? (
                    <div>
                      <span className="font-bold text-gray-500 text-xs block">$0.00</span>
                      <span className="text-[8px] font-bold text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 block mt-0.5" title="Lệnh mở trước khi bạn nạp vốn vào Pool">
                        Chưa góp vốn
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span
                        className={`font-black text-xs block ${
                          effectivePnl >= 0 ? 'text-[#00df89]' : 'text-[#ff2d55]'
                        }`}
                      >
                        {effectivePnl >= 0 ? `+$${effectivePnl.toFixed(2)}` : `-$${Math.abs(effectivePnl).toFixed(2)}`}
                      </span>
                      <span
                        className={`text-[9px] font-bold block ${
                          trade.pnlPercentage >= 0 ? 'text-[#00df89]' : 'text-[#ff2d55]'
                        }`}
                      >
                        {trade.pnlPercentage >= 0 ? `+${trade.pnlPercentage.toFixed(2)}%` : `${trade.pnlPercentage.toFixed(2)}%`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PAGINATION CONTROLS BAR */}
      {trades.length > ITEMS_PER_PAGE && (
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
                ? 'border-gray-800 text-gray-600 bg-[#131927]/50 cursor-not-allowed'
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
