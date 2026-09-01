'use client';

import React from 'react';
import { Shield } from 'lucide-react';

export const QuantStrategyCard: React.FC = () => {
  return (
    <div className="w-full bg-[#131927] rounded-3xl p-5 border border-[#1f293d] space-y-2 shadow-md">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-amber-400 fill-amber-400/20" />
        <h3 className="text-xs font-black text-white uppercase tracking-wider">
          SPARTAN QUANT STRATEGY
        </h3>
      </div>

      <p className="text-xs text-gray-400 leading-relaxed font-medium">
        Running <strong className="text-gray-200">Spartan 300 Multi-TF Pro</strong> on Exness ECN. Ironclad Risk Management, Auto-Breakeven at 1.0R, Hard Stop-Loss on every deal.
      </p>
    </div>
  );
};
