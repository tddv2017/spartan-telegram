'use client';

import React from 'react';
import { Home, Wallet, BarChart2, ShieldAlert, Award } from 'lucide-react';

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
  const navItems = [
    { id: 'home' as TabType, label: 'BATTLEGROUND', icon: Home },
    { id: 'wallet' as TabType, label: 'INVEST', icon: Wallet },
    { id: 'analytics' as TabType, label: 'ANALYTICS', icon: BarChart2 },
    { id: 'profile' as TabType, label: 'RESELLER', icon: Award },
    ...(isAdmin ? [{ id: 'admin' as TabType, label: 'ADMIN', icon: ShieldAlert }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0b0e17]/95 backdrop-blur-md border-t border-[#1f293d] max-w-md mx-auto px-2 py-1.5">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onChangeTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'text-[#ff5500] scale-105 font-black'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-colors ${
                  isActive ? 'bg-[#ff5500]/15 border border-[#ff5500]/30 shadow-[0_0_12px_rgba(255,85,0,0.3)]' : ''
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
