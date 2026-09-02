'use client';

import React from 'react';
import { Shield } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export const QuantStrategyCard: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="w-full bg-[#131927] rounded-3xl p-5 border border-[#1f293d] space-y-2 shadow-md">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-amber-400 fill-amber-400/20" />
        <h3 className="text-xs font-black text-white uppercase tracking-wider">
          {t('strategy_title')}
        </h3>
      </div>

      <p className="text-xs text-gray-400 leading-relaxed font-medium">
        {t('strategy_desc')}
      </p>
    </div>
  );
};
