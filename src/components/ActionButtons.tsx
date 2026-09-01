'use client';

import React from 'react';
import { Shield, MessageSquare, Send, Swords } from 'lucide-react';

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
        <button
          onClick={onStart}
          className={`py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_4px_14px_rgba(255,45,85,0.4)] ${
            isActive
              ? 'bg-[#ff2d55] text-white shadow-md'
              : 'bg-[#ff2d55] text-white hover:opacity-95'
          }`}
        >
          <Swords className="w-4 h-4 text-white" />
          <span>ENGAGE BOT</span>
        </button>

        <button
          onClick={onStop}
          className="py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 bg-[#131927] border border-[#1f293d] text-gray-300 hover:text-white hover:border-gray-600 transition-all"
        >
          <Shield className="w-4 h-4 text-gray-400" />
          <span>STANDBY</span>
        </button>
      </div>

      {/* Row 2: Spartan AI Chat vs Legion VIP Channel */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => alert('Spartan AI Chat Assistant')}
          className="py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 bg-[#131927] border border-[#1f293d] text-gray-200 hover:border-gray-600 transition-all"
        >
          <span className="text-sm">💬</span>
          <span>Spartan AI Chat</span>
        </button>

        <button
          onClick={() => window.open('https://t.me/spartan_trading_bot', '_blank')}
          className="py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 bg-[#131927] border border-[#1f293d] text-gray-200 hover:border-gray-600 transition-all"
        >
          <Send className="w-3.5 h-3.5 text-[#ff5500]" />
          <span>Legion VIP Channel</span>
        </button>
      </div>
    </div>
  );
};
