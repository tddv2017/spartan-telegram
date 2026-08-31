'use client';

import React, { useState, useEffect } from 'react';
import { fetchLiveGoldPrice, GoldPriceData } from '@/lib/goldPriceService';
import { TrendingUp, TrendingDown, RefreshCw, Flame, Activity, ShieldCheck } from 'lucide-react';

export const GoldPriceTickerCard: React.FC = () => {
  const [goldData, setGoldData] = useState<GoldPriceData>({
    symbol: 'XAUUSD',
    price: 2514.50,
    change24h: 12.30,
    changePercent24h: 0.49,
    high24h: 2525.00,
    low24h: 2498.00,
    updatedAt: 'Đang tải...'
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);
  const [prevPrice, setPrevPrice] = useState<number>(2514.50);

  const loadGoldPrice = async () => {
    try {
      const fresh = await fetchLiveGoldPrice();

      if (fresh.price > prevPrice) {
        setPriceFlash('up');
        setTimeout(() => setPriceFlash(null), 1000);
      } else if (fresh.price < prevPrice) {
        setPriceFlash('down');
        setTimeout(() => setPriceFlash(null), 1000);
      }

      setPrevPrice(fresh.price);
      setGoldData(fresh);
    } catch (e) {
      console.error('Error fetching live gold price:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoldPrice();
    // Auto refresh every 5 seconds for real-time market ticks
    const interval = setInterval(loadGoldPrice, 5000);
    return () => clearInterval(interval);
  }, []);

  const isPositive = goldData.changePercent24h >= 0;

  return (
    <div className="w-full spartan-card rounded-3xl p-4 border border-[#1f293d] space-y-3 shadow-lg relative overflow-hidden">
      {/* Glow Effect */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#facc15]/10 rounded-full blur-2xl -z-10 pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#facc15]/15 border border-[#facc15]/40 flex items-center justify-center text-[#facc15]">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              GIÁ VÀNG THẾ GIỚI SPOT (XAU/USD LIVE)
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-[#00df89]/10 text-[#00df89] border border-[#00df89]/30">
            <Activity className="w-3 h-3 animate-pulse" /> LIVE TICK 5S
          </span>
          <button 
            onClick={loadGoldPrice}
            className="p-1 rounded-lg bg-[#131927] hover:bg-[#1f293d] text-gray-400 hover:text-white transition-colors"
            title="Làm mới giá vàng"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Spot Price & 24h Stats Grid */}
      <div className="grid grid-cols-2 gap-3 items-center pt-1">
        {/* Left: Huge Live Price Display */}
        <div className="bg-[#0b0e17] rounded-2xl p-3.5 border border-[#1f293d] space-y-1">
          <span className="text-[10px] text-gray-400 font-extrabold uppercase block tracking-wider">
            GIÁ SPOT HIỆN TẠI (EXNESS MARKET)
          </span>

          <div className={`text-2xl font-black font-mono transition-all duration-300 ${
            priceFlash === 'up' 
              ? 'text-[#00df89] scale-105' 
              : priceFlash === 'down' 
              ? 'text-[#ff2d55] scale-105' 
              : 'text-amber-400'
          }`}>
            ${goldData.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>

          <div className="flex items-center gap-1 text-[11px] font-black font-mono mt-1">
            {isPositive ? (
              <span className="text-[#00df89] flex items-center gap-0.5 bg-[#00df89]/10 px-1.5 py-0.5 rounded border border-[#00df89]/20">
                <TrendingUp className="w-3 h-3" />
                +${goldData.change24h.toFixed(2)} (+{goldData.changePercent24h.toFixed(2)}%)
              </span>
            ) : (
              <span className="text-[#ff2d55] flex items-center gap-0.5 bg-[#ff2d55]/10 px-1.5 py-0.5 rounded border border-[#ff2d55]/20">
                <TrendingDown className="w-3 h-3" />
                -${Math.abs(goldData.change24h).toFixed(2)} ({goldData.changePercent24h.toFixed(2)}%)
              </span>
            )}
          </div>
        </div>

        {/* Right: 24h High / Low & Last Update */}
        <div className="space-y-2 text-xs">
          <div className="bg-[#0b0e17] rounded-xl p-2.5 border border-[#1f293d] flex justify-between items-center font-mono">
            <span className="text-[10px] text-gray-400 font-bold">Cao nhất 24h:</span>
            <strong className="text-[#00df89] font-black">${goldData.high24h.toFixed(2)}</strong>
          </div>

          <div className="bg-[#0b0e17] rounded-xl p-2.5 border border-[#1f293d] flex justify-between items-center font-mono">
            <span className="text-[10px] text-gray-400 font-bold">Thấp nhất 24h:</span>
            <strong className="text-[#ff2d55] font-black">${goldData.low24h.toFixed(2)}</strong>
          </div>

          <div className="text-[9px] text-gray-500 font-mono text-right pr-1">
            Cập nhật lúc: {goldData.updatedAt}
          </div>
        </div>
      </div>
    </div>
  );
};
