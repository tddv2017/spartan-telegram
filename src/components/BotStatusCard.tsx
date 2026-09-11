'use client';

import React, { useEffect, useState } from 'react';
import { fetchLiveGoldPrice, GoldPriceData } from '@/lib/goldPriceService';
import { Zap, ShieldCheck, X } from 'lucide-react';
import { Mt5DirectConnectCard } from './Mt5DirectConnectCard';

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
  const [showDirectModal, setShowDirectModal] = useState(false);

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
    <>
      <div className="w-full bg-[#131927] rounded-3xl p-4 border border-[#1f293d] flex items-center justify-between shadow-md transition-all">
        {/* Dynamic Bot Status */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] text-gray-400 font-bold block">
              Bot status
            </span>
            <button
              onClick={() => setShowDirectModal(true)}
              className="px-2 py-0.5 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#f5d77f] text-[9px] font-mono font-bold flex items-center gap-1 hover:bg-[#d4af37]/30 transition-all"
            >
              <Zap className="w-2.5 h-2.5" />
              <span>MT5 DIRECT</span>
            </button>
          </div>
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

      {/* MT5 Direct Connection Modal */}
      {showDirectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowDirectModal(false)}
              className="absolute right-4 top-4 z-10 w-8 h-8 rounded-full bg-[#131927] border border-[#1f293d] text-gray-400 hover:text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
            <Mt5DirectConnectCard onConnectionSuccess={() => setShowDirectModal(false)} />
          </div>
        </div>
      )}
    </>
  );
};

