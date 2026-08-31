'use client';

import React, { useEffect, useState } from 'react';
import { Activity, ShieldCheck, Cpu, Zap, RefreshCw } from 'lucide-react';
import { fetchLiveGoldPrice, GoldPriceData } from '@/lib/goldPriceService';

interface BotStatusCardProps {
  isActive: boolean;
}

export const BotStatusCard: React.FC<BotStatusCardProps> = ({ isActive }) => {
  const [goldData, setGoldData] = useState<GoldPriceData>({
    symbol: 'PAXGUSDT',
    price: 2504.85,
    change24h: 15.20,
    changePercent24h: 0.65,
    high24h: 2515.00,
    low24h: 2488.00,
    updatedAt: 'Live'
  });

  useEffect(() => {
    let isMounted = true;
    const loadPrice = async () => {
      const data = await fetchLiveGoldPrice();
      if (isMounted) setGoldData(data);
    };

    loadPrice();
    const interval = setInterval(loadPrice, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const formattedPrice = `$${goldData.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="w-full spartan-card rounded-3xl p-4 border border-[#1f293d] space-y-3 shadow-lg">
      {/* Bot Status & Live XAUUSD Price Header Ticker */}
      <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-[#ff5500]/15 border border-[#ff5500]/30 flex items-center justify-center text-[#ff5500]">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block">
              ENGINE STATUS
            </span>
            <span className="text-xs font-black text-white flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#00df89] animate-ping' : 'bg-red-500'}`} />
              {isActive ? 'Active (Scanning M5/H1)' : 'Stopped (Standby)'}
            </span>
          </div>
        </div>

        {/* Integrated Realtime XAU/USD Gold Ticker Pill */}
        <div className="flex items-center gap-2 bg-[#0b0e17] px-3 py-1.5 rounded-2xl border border-[#1f293d]">
          <div className="text-right">
            <span className="text-[9px] font-extrabold text-amber-400 uppercase tracking-widest block">
              LIVE XAU/USD
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white font-mono">{formattedPrice}</span>
              <span className={`text-[9px] font-bold ${goldData.changePercent24h >= 0 ? 'text-[#00df89]' : 'text-red-400'}`}>
                {goldData.changePercent24h >= 0 ? `+${goldData.changePercent24h.toFixed(2)}%` : `${goldData.changePercent24h.toFixed(2)}%`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Pills Grid */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-[#0b0e17] p-2 rounded-2xl border border-[#1f293d]">
          <span className="text-[9px] text-gray-500 font-bold uppercase block mb-0.5">SYMBOL</span>
          <span className="font-black text-amber-400">XAUUSD</span>
        </div>
        <div className="bg-[#0b0e17] p-2 rounded-2xl border border-[#1f293d]">
          <span className="text-[9px] text-gray-500 font-bold uppercase block mb-0.5">MAX RISK</span>
          <span className="font-black text-white">1.0% / Trade</span>
        </div>
        <div className="bg-[#0b0e17] p-2 rounded-2xl border border-[#1f293d]">
          <span className="text-[9px] text-gray-500 font-bold uppercase block mb-0.5">RISK:REWARD</span>
          <span className="font-black text-[#00df89]">1 : 2.5</span>
        </div>
      </div>
    </div>
  );
};
