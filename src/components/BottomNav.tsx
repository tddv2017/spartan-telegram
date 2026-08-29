'use client';

import React from 'react';
import { LayoutDashboard, Swords, DollarSign, Users, Shield } from 'lucide-react';

export type TabType = 'home' | 'wallet' | 'analytics' | 'profile' | 'admin';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  isAdmin?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  isAdmin = true,
}) => {
  const tabs = [
    { id: 'home' as TabType, label: 'CHIẾN TRƯỜNG', icon: Swords, badge: 'LIVE' },
    { id: 'wallet' as TabType, label: 'ĐẦU TƯ', icon: DollarSign },
    { id: 'analytics' as TabType, label: 'TỔNG QUAN', icon: LayoutDashboard },
    { id: 'profile' as TabType, label: 'ĐẠI LÝ', icon: Users },
  ];

  if (isAdmin) {
    tabs.push({ id: 'admin' as TabType, label: 'ADMIN', icon: Shield });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#0b0e17]/95 backdrop-blur-lg border-t border-[#1f293d] px-3 py-2 pb-safe z-50 flex items-center justify-between">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 relative ${
              isActive ? 'text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <div className="flex items-center gap-1">
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#ff5500]' : 'text-gray-400'}`} />
              {tab.badge && (
                <span className="text-[7px] font-black px-1 rounded text-white bg-[#ff2d55]">
                  {tab.badge}
                </span>
              )}
            </div>
            <span className={`text-[9px] font-black mt-1 uppercase tracking-tight ${
              isActive ? 'text-[#ff5500]' : 'text-gray-400'
            }`}>
              {tab.label}
            </span>
            {isActive && (
              <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-[#ff5500] rounded-full" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
