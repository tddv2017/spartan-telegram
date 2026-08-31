'use client';

import React from 'react';
import { ShieldCheck, Zap, Layers, Lock } from 'lucide-react';

export const QuantStrategyCard: React.FC = () => {
  return (
    <div className="w-full spartan-card rounded-3xl p-5 border border-[#1f293d] space-y-3 shadow-lg">
      <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-[#ff5500]/15 border border-[#ff5500]/30 flex items-center justify-center text-[#ff5500]">
            <Zap className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-black text-white uppercase tracking-wider">
            SPARTAN QUANT ALGORITHMIC STRATEGY
          </h3>
        </div>
        <span className="text-[10px] font-black text-[#00df89] bg-[#00df89]/10 px-2.5 py-0.5 rounded-full border border-[#00df89]/20 uppercase">
          M5 / H1 MULTI-TF
        </span>
      </div>

      <p className="text-xs text-gray-400 leading-relaxed font-medium">
        Algorithmic high-frequency quant strategy executing on Exness ECN servers. Employs multi-timeframe trend filtering (M5/H1), momentum breakout confirmation, and dynamic trailing stop-loss protection.
      </p>

      {/* Feature Pills */}
      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
        <div className="flex items-center gap-2 bg-[#0b0e17] p-2.5 rounded-2xl border border-[#1f293d]">
          <ShieldCheck className="w-4 h-4 text-[#00df89] flex-shrink-0" />
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase block">HARD STOP LOSS</span>
            <span className="text-xs font-black text-white">1.0% Fixed Risk</span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#0b0e17] p-2.5 rounded-2xl border border-[#1f293d]">
          <Layers className="w-4 h-4 text-[#ff5500] flex-shrink-0" />
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase block">EXECUTION VENUE</span>
            <span className="text-xs font-black text-white">Exness ECN Direct</span>
          </div>
        </div>
      </div>
    </div>
  );
};
