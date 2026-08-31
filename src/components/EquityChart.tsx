'use client';

import React, { useState } from 'react';
import { TrendingUp, BarChart2 } from 'lucide-react';

export const EquityChart: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | 'all'>('7d');

  return (
    <div className="w-full spartan-card rounded-3xl p-4 border border-[#1f293d] space-y-3 shadow-lg">
      {/* Chart Header */}
      <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
        <div>
          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block">
            ACCOUNT GROWTH CURVE
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-lg font-black text-[#00df89] font-mono">+1.85%</span>
            <span className="text-[10px] text-gray-400 font-bold">Today</span>
          </div>
        </div>

        {/* Timeframe Selector Pills */}
        <div className="flex items-center gap-1 p-1 bg-[#0b0e17] rounded-xl border border-[#1f293d]">
          {(['7d', '30d', 'all'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                timeframe === tf
                  ? 'bg-[#ff5500] text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Smooth Growth Curve Graph */}
      <div className="w-full h-32 pt-2 relative">
        <svg className="w-full h-full overflow-visible" viewBox="0 0 300 100">
          <defs>
            <linearGradient id="equityGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff5500" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ff5500" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Fill Area Gradient */}
          <path
            d="M 0 80 Q 75 40, 150 60 T 300 20 L 300 100 L 0 100 Z"
            fill="url(#equityGlow)"
          />

          {/* Stroke Curve Line */}
          <path
            d="M 0 80 Q 75 40, 150 60 T 300 20"
            fill="none"
            stroke="#ff5500"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Data Points */}
          <circle cx="0" cy="80" r="3" fill="#ff5500" />
          <circle cx="75" cy="48" r="3" fill="#ff5500" />
          <circle cx="150" cy="60" r="3" fill="#ff5500" />
          <circle cx="225" cy="35" r="3" fill="#ff5500" />
          <circle cx="300" cy="20" r="4" fill="#00df89" className="animate-pulse" />
        </svg>
      </div>
    </div>
  );
};
