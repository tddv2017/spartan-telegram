'use client';

import React from 'react';
import { Swords, ShieldAlert, MessageSquareText, Send } from 'lucide-react';

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
    <div className="w-full space-y-3 my-4">
      {/* Row 1: Start / Stop Controls */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onStart}
          className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 uppercase tracking-wider ${
            isActive
              ? 'bg-[#dc2626] text-white shadow-[0_0_20px_rgba(220,38,38,0.5)] border border-red-500'
              : 'bg-red-950/40 text-red-400 border border-red-800 hover:bg-red-900/40'
          }`}
        >
          <Swords className="w-4 h-4 text-[#facc15]" />
          <span>Engage Bot</span>
        </button>

        <button
          onClick={onStop}
          className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 border transition-all duration-200 active:scale-95 uppercase tracking-wider ${
            !isActive
              ? 'bg-gray-800 text-gray-200 border-gray-600 shadow-[0_0_15px_rgba(156,163,175,0.2)]'
              : 'bg-[#0f172a] text-gray-400 border-gray-800 hover:border-gray-700'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-amber-500" />
          <span>Standby</span>
        </button>
      </div>

      {/* Row 2: Secondary Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        <button className="w-full py-3 px-3 rounded-2xl bg-[#0f172a] border border-red-900/30 text-gray-300 text-xs font-bold flex items-center justify-center gap-2 hover:bg-gray-800/80 transition-colors">
          <MessageSquareText className="w-4 h-4 text-[#facc15]" />
          <span>Spartan AI Chat</span>
        </button>

        <button className="w-full py-3 px-3 rounded-2xl bg-[#0f172a] border border-red-900/30 text-gray-300 text-xs font-bold flex items-center justify-center gap-2 hover:bg-gray-800/80 transition-colors">
          <Send className="w-4 h-4 text-red-500" />
          <span>Legion VIP Channel</span>
        </button>
      </div>
    </div>
  );
};
