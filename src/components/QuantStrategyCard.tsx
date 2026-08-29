'use client';

import React from 'react';
import { ShieldAlert, ShieldCheck, Cpu } from 'lucide-react';

export const QuantStrategyCard: React.FC = () => {
  return (
    <div className="w-full card-dark rounded-3xl p-4 border border-gray-800 my-4">
      <div className="flex items-center gap-2 mb-2">
        <ShieldAlert className="w-4 h-4 text-[#facc15]" />
        <span className="text-xs font-black tracking-wider text-white uppercase">
          SPARTAN QUANT STRATEGY
        </span>
      </div>

      <p className="text-xs text-gray-400 leading-relaxed font-normal mb-3">
        Running <strong className="text-gray-200">Spartan 300 Multi-TF Pro</strong> on Exness ECN. Ironclad Risk Management, Auto-Breakeven at 1.0R, Hard Stop-Loss on every deal.
      </p>

      <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-gray-800/60 text-gray-400">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#00ff88]" />
          <span>Iron Shield Risk: 1.0%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-[#facc15]" />
          <span>Multi-TF M5 / H1 Confirmation</span>
        </div>
      </div>
    </div>
  );
};
