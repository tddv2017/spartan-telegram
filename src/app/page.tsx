'use client';

import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { BalanceCard } from '@/components/BalanceCard';
import { EquityChart } from '@/components/EquityChart';
import { BotStatusCard } from '@/components/BotStatusCard';
import { ActionButtons } from '@/components/ActionButtons';
import { QuantStrategyCard } from '@/components/QuantStrategyCard';
import { BottomNav, TabType } from '@/components/BottomNav';
import { WalletView } from '@/components/WalletView';
import { AnalyticsView } from '@/components/AnalyticsView';
import { ProfileView } from '@/components/ProfileView';
import { TradeHistoryCard } from '@/components/TradeHistoryCard';
import { AdminPanel } from '@/components/AdminPanel';
import { checkIsAdmin } from '@/lib/adminAuth';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [tradingBalance, setTradingBalance] = useState<number>(7462415.57);
  const [referralsIncome, setReferralsIncome] = useState<number>(800.00);
  const [isBotActive, setIsBotActive] = useState<boolean>(true);

  // Configured Admin Telegram User: @tddv2017
  const currentTelegramUser = 'tddv2017';
  const isAdmin = checkIsAdmin(currentTelegramUser);

  const totalCombinedBalance = tradingBalance + referralsIncome;

  const handleUpdateBalance = (newBal: number) => {
    setTradingBalance(newBal);
  };

  const handleStart = () => {
    setIsBotActive(true);
  };

  const handleStop = () => {
    setIsBotActive(false);
  };

  return (
    <main className="flex-1 flex flex-col pb-20">
      {/* Clean App Header */}
      <Header onClose={() => alert('Telegram Mini App Closed')} />

      {/* Dynamic Content based on Active Tab */}
      <div className="flex-1 px-4 pt-3">
        {/* CHIẾN TRƯỜNG (HOME) TAB */}
        {activeTab === 'home' && (
          <div className="space-y-1">
            <BalanceCard
              tradingBalance={tradingBalance}
              referralsIncome={referralsIncome}
              genBadge="SPARTAN 300 AI"
            />
            <EquityChart />
            <BotStatusCard isActive={isBotActive} />
            <ActionButtons
              isActive={isBotActive}
              onStart={handleStart}
              onStop={handleStop}
            />
            <QuantStrategyCard />
          </div>
        )}

        {/* ĐẦU TƯ (WALLET) TAB */}
        {activeTab === 'wallet' && (
          <WalletView
            currentBalance={totalCombinedBalance}
            onUpdateBalance={handleUpdateBalance}
          />
        )}

        {/* TỔNG QUAN (ANALYTICS & TRADE HISTORY) TAB */}
        {activeTab === 'analytics' && (
          <div className="space-y-3">
            <AnalyticsView />
            <TradeHistoryCard />
          </div>
        )}

        {/* ĐẠI LÝ (PROFILE) TAB */}
        {activeTab === 'profile' && <ProfileView />}

        {/* ADMIN CONTROL PANEL TAB (SPECIAL ACCESS FOR @tddv2017) */}
        {activeTab === 'admin' && <AdminPanel />}
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} isAdmin={isAdmin} />
    </main>
  );
}
