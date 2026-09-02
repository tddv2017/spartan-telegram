'use client';

import React from 'react';
import { Shield } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export const QuantStrategyCard: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="w-full bg-[#080b12] rounded-3xl p-5 border border-[#221c10] space-y-2 shadow-md">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-[#d4af37] fill-[#d4af37]/20" />
        <h3 className="text-xs font-black text-[#f5d77f] uppercase tracking-wider">
          {t('strategy_title')}
        </h3>
      </div>

      <p className="text-xs text-gray-400 leading-relaxed font-medium">
        {t('strategy_desc')}
      </p>
    </div>
  );
};
