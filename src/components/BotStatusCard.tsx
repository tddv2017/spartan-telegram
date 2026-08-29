'use client';

import React, { useState, useEffect } from 'react';

interface BotStatusCardProps {
  isActive: boolean;
}

export const BotStatusCard: React.FC<BotStatusCardProps> = ({ isActive }) => {
  const [goldPrice, setGoldPrice] = useState(2514.24);

  // Fluctuate gold price slightly to simulate live feed
  useEffect(() => {
    const interval = setInterval(() => {
      const delta = (Math.random() - 0.48) * 0.4;
      setGoldPrice((prev) => parseFloat((prev + delta).toFixed(2)));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full card-dark rounded-2xl p-4 border border-gray-800 flex items-center justify-between my-3">
      <div>
        <span className="text-[11px] font-semibold text-gray-400 block mb-1">
          Bot status
        </span>
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isActive
                ? 'bg-[#00ff88] animate-pulse shadow-[0_0_8px_#00ff88]'
                : 'bg-red-500'
            }`}
          />
          <span className="text-xs font-bold text-white tracking-wide">
            {isActive ? 'Active (Hunting M5/H1)' : 'Stopped (Standby)'}
          </span>
        </div>
      </div>

      <div className="text-right">
        <span className="text-[11px] font-semibold text-gray-400 block mb-1">
          Live Gold Price
        </span>
        <div className="flex items-center justify-end gap-1.5">
          <span className="text-sm font-extrabold text-[#facc15] tracking-tight">
            {goldPrice.toFixed(2)}
          </span>
          <span className="text-[10px] font-bold text-gray-400">XAUUSD</span>
        </div>
      </div>
    </div>
  );
};
