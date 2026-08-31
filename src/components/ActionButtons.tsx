'use client';

import React from 'react';
import { Play, Square, Activity, Shield } from 'lucide-react';

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
    <div className="w-full grid grid-cols-2 gap-3 my-2">
      {/* START BOT BUTTON */}
      <button
        onClick={onStart}
        disabled={isActive}
        className={`py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
          isActive
            ? 'bg-[#00df89]/20 text-[#00df89] border border-[#00df89]/40 cursor-not-allowed opacity-80'
            : 'bg-[#00df89] text-black shadow-[0_4px_14px_rgba(0,223,137,0.4)] hover:opacity-95'
        }`}
      >
        <Play className="w-4 h-4 fill-current" />
        <span>{isActive ? 'QUANT BOT ACTIVE' : 'START QUANT BOT'}</span>
      </button>

      {/* PAUSE BOT BUTTON */}
      <button
        onClick={onStop}
        disabled={!isActive}
        className={`py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
          !isActive
            ? 'bg-[#ff2d55]/20 text-[#ff2d55] border border-[#ff2d55]/40 cursor-not-allowed opacity-80'
            : 'bg-[#ff2d55] text-white shadow-[0_4px_14px_rgba(255,45,85,0.4)] hover:opacity-95'
        }`}
      >
        <Square className="w-4 h-4 fill-current" />
        <span>{!isActive ? 'BOT PAUSED' : 'PAUSE QUANT BOT'}</span>
      </button>
    </div>
  );
};
