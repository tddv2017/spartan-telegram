'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

const mockData = [
  { time: '09:00', equity: 127.3 },
  { time: '11:00', equity: 127.6 },
  { time: '13:00', equity: 127.4 },
  { time: '15:00', equity: 127.8 },
  { time: '17:00', equity: 128.2 },
  { time: '19:00', equity: 127.9 },
  { time: '21:00', equity: 128.3 },
];

export const EquityChart: React.FC = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="w-full spartan-card rounded-3xl p-4 border border-[#1f293d] my-3">
      {/* Header (Matching Screenshot Layout with Spartan Colors) */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-gray-400">
          Account Growth Curve
        </span>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#ff5500]/15 text-[#ff5500] border border-[#ff5500]/30">
          +1.85% Today
        </span>
      </div>

      {/* Recharts Container */}
      <div className="w-full h-40">
        {isMounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="spartanOrangeCurveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff5500" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ff5500" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <YAxis 
                domain={[127.2, 128.4]} 
                ticks={[127.3, 127.5, 127.7, 127.9, 128.1, 128.3]} 
                tickFormatter={(val) => val.toFixed(1).replace('.', ',')}
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <XAxis dataKey="time" hide />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length && payload[0]?.value) {
                    const val = Number(payload[0].value);
                    return (
                      <div className="bg-[#131927] border border-[#ff5500] px-2.5 py-1 rounded-xl text-xs text-[#ff5500] font-black shadow-xl">
                        {val.toFixed(1).replace('.', ',')}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="equity"
                stroke="#ff5500"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#spartanOrangeCurveGradient)"
                dot={{ r: 3.5, fill: '#facc15', stroke: '#0b0e17', strokeWidth: 2 }}
                activeDot={{ r: 5.5, fill: '#ffffff', stroke: '#ff5500', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
            Loading chart...
          </div>
        )}
      </div>
    </div>
  );
};
