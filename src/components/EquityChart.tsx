'use client';

import React from 'react';

export const EquityChart: React.FC = () => {
  return (
    <div className="w-full bg-[#131927] rounded-3xl p-4 border border-[#1f293d] space-y-2 shadow-md">
      {/* Chart Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-200">
          Account Growth Curve
        </span>
        <span className="text-[11px] font-black text-[#ff5500] bg-[#ff5500]/15 px-2.5 py-0.5 rounded-full border border-[#ff5500]/40">
          +1.85% Today
        </span>
      </div>

      {/* Chart with Left Axis */}
      <div className="flex items-stretch gap-2 pt-2 h-36">
        {/* Left Y-Axis Labels */}
        <div className="flex flex-col justify-between text-[9px] text-gray-500 font-mono py-1">
          <span>128,3</span>
          <span>128,1</span>
          <span>127,9</span>
          <span>127,7</span>
          <span>127,5</span>
          <span>127,3</span>
        </div>

        {/* SVG Curve Line */}
        <div className="flex-1 relative">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 260 90" preserveAspectRatio="none">
            <defs>
              <linearGradient id="growthGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff5500" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#ff5500" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Gradient Fill */}
            <path
              d="M 10 82 C 40 50, 70 75, 100 80 C 130 85, 150 30, 180 32 C 210 34, 230 65, 255 18 L 255 90 L 10 90 Z"
              fill="url(#growthGlow)"
            />

            {/* Smooth Spline Curve */}
            <path
              d="M 10 82 C 40 50, 70 75, 100 80 C 130 85, 150 30, 180 32 C 210 34, 230 65, 255 18"
              fill="none"
              stroke="#ff5500"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Glowing Golden Points */}
            <circle cx="10" cy="82" r="2.5" fill="#facc15" />
            <circle cx="55" cy="62" r="2.5" fill="#facc15" />
            <circle cx="100" cy="80" r="2.5" fill="#facc15" />
            <circle cx="145" cy="55" r="2.5" fill="#facc15" />
            <circle cx="180" cy="32" r="3" fill="#facc15" />
            <circle cx="218" cy="50" r="2.5" fill="#facc15" />
            <circle cx="255" cy="18" r="3.5" fill="#facc15" className="animate-pulse" />
          </svg>
        </div>
      </div>
    </div>
  );
};
