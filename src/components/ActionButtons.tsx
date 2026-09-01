'use client';

import React from 'react';
import { Shield, Send, Power } from 'lucide-react';

interface ActionButtonsProps {
  isActive: boolean;
  onStart: () => void;
  onStop: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  isActive,
  onStart,
  onStop,
}) => {
  return (
    <div className="w-full space-y-2.5 my-2">
      {/* Row 1: Engage Bot vs Standby */}
      <div className="grid grid-cols-2 gap-3">
        {/* ENGAGE BOT BUTTON */}
        <button
          onClick={onStart}
          className={`py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            isActive
              ? 'spartan-engage-btn shadow-[0_4px_16px_rgba(255,42,84,0.45)] scale-[1.02]'
              : 'bg-[#141926] border border-[#1e2638] text-gray-400 hover:text-white hover:border-[#ff2a54]/50'
          }`}
        >
          <span className="text-sm">{isActive ? '⚔️' : '🗡️'}</span>
          <span>ENGAGE BOT</span>
        </button>

        {/* STANDBY BUTTON */}
        <button
          onClick={onStop}
          className={`py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            !isActive
              ? 'bg-amber-500/20 border-2 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.35)] scale-[1.02]'
              : 'bg-[#141926] border border-[#1e2638] text-gray-400 hover:text-white hover:border-gray-600'
          }`}
        >
          <Shield className={`w-4 h-4 ${!isActive ? 'text-amber-400 fill-amber-400/30 animate-pulse' : 'text-gray-500'}`} />
          <span>STANDBY</span>
        </button>
      </div>

      {/* Row 2: Spartan AI Chat vs Legion VIP Channel */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => alert('Spartan AI Chat Assistant')}
          className="py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 bg-[#141926] border border-[#1e2638] text-gray-200 hover:border-gray-600 transition-all"
        >
          <span className="text-sm">💬</span>
          <span>Spartan AI Chat</span>
        </button>

        <button
          onClick={() => window.open('https://t.me/spartan_trading_bot', '_blank')}
          className="py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 bg-[#141926] border border-[#1e2638] text-gray-200 hover:border-gray-600 transition-all"
        >
          <Send className="w-3.5 h-3.5 text-[#ff2a54]" />
          <span>Legion VIP Channel</span>
        </button>
      </div>
    </div>
  );
};
