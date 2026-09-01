'use client';

import React, { useEffect, useState } from 'react';
import { fetchLiveGoldPrice, GoldPriceData } from '@/lib/goldPriceService';

interface BotStatusCardProps {
  isActive?: boolean;
}

export const BotStatusCard: React.FC<BotStatusCardProps> = ({
  isActive = true,
}) => {
  const [goldData, setGoldData] = useState<GoldPriceData>({
    symbol: 'XAUUSD',
    price: 4450.31,
    change24h: 15.20,
    changePercent24h: 0.65,
    high24h: 4465.00,
    low24h: 4428.00,
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

  return (
    <div className="w-full bg-[#131927] rounded-3xl p-4 border border-[#1f293d] flex items-center justify-between shadow-md transition-all">
      {/* Dynamic Bot Status */}
      <div>
        <span className="text-[11px] text-gray-400 font-bold block mb-1">
          Bot status
        </span>
        <div className="flex items-center gap-1.5 font-black text-xs">
          {isActive ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-[#00df89] inline-block shadow-[0_0_8px_#00df89] animate-pulse" />
              <span className="text-[#00df89]">Active (Hunting M5/H1)</span>
            </>
          ) : (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
              <span className="text-amber-300">Standby (Idle/Paused)</span>
            </>
          )}
        </div>
      </div>

      {/* Live Gold Price */}
      <div className="text-right">
        <span className="text-[11px] text-gray-400 font-bold block mb-1">
          Live Gold Price
        </span>
        <div className="font-mono font-black text-[#facc15] text-sm flex items-center justify-end gap-1">
          <span>{goldData.price.toFixed(2)}</span>
          <span className="text-[11px] text-[#facc15]/80 font-bold">XAUUSD</span>
        </div>
      </div>
    </div>
  );
};
