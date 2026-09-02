'use client';

import React from 'react';
import { Home, Wallet, BarChart2, ShieldAlert, Award } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export type TabType = 'home' | 'wallet' | 'analytics' | 'profile' | 'admin';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  isAdmin?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  isAdmin = false,
}) => {
  const { t } = useLanguage();

  const navItems = [
    { id: 'home' as TabType, label: t('nav_overview'), icon: Home },
    { id: 'wallet' as TabType, label: t('nav_wallet'), icon: Wallet },
    { id: 'analytics' as TabType, label: t('nav_analytics'), icon: BarChart2 },
    { id: 'profile' as TabType, label: t('nav_reseller'), icon: Award },
    ...(isAdmin ? [{ id: 'admin' as TabType, label: t('nav_admin'), icon: ShieldAlert }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#05070c]/95 backdrop-blur-md border-t border-[#221c10] max-w-md mx-auto px-2 py-1.5">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onChangeTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'text-[#f5d77f] scale-105 font-black'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-colors ${
                  isActive ? 'bg-[#d4af37]/15 border border-[#d4af37]/40 shadow-[0_0_12px_rgba(212,175,55,0.3)] text-[#f5d77f]' : ''
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              </div>
              <span className={`text-[9px] mt-0.5 tracking-wider uppercase ${isActive ? 'font-black' : 'font-semibold'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
