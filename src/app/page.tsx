'use client';

import React, { useState, useEffect } from 'react';
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
import { getOrCreateUser, subscribeToUser, UserData } from '@/lib/firebaseService';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [tradingBalance, setTradingBalance] = useState<number>(0.00);
  const [referralsIncome, setReferralsIncome] = useState<number>(0.00);
  const [isBotActive, setIsBotActive] = useState<boolean>(true);
  const [currentTelegramUser, setCurrentTelegramUser] = useState<string>('tddv2017');
  const [currentTelegramId, setCurrentTelegramId] = useState<string>('1788035393');
  const [isAdmin, setIsAdmin] = useState<boolean>(true);

  // 1. One-time Telegram WebApp user detection on mount
  useEffect(() => {
    let userHandle = '';
    let userId = '';
    let userFirstName = '';

    if (typeof window !== 'undefined') {
      const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      if (tgUser) {
        if (tgUser.username) userHandle = tgUser.username;
        if (tgUser.id) userId = String(tgUser.id);
        if (tgUser.first_name) userFirstName = tgUser.first_name;
      }

      if (!userId || !userHandle) {
        const params = new URLSearchParams(window.location.search);
        userHandle = params.get('user') || localStorage.getItem('spartan_username') || 'tddv2017';
        userId = params.get('id') || localStorage.getItem('spartan_userid') || '1788035393';
      }

      localStorage.setItem('spartan_username', userHandle);
      localStorage.setItem('spartan_userid', userId);
    }

    if (!userHandle) userHandle = 'tddv2017';
    if (!userId) userId = '1788035393';
    if (!userFirstName) userFirstName = 'Admin';

    setCurrentTelegramUser(userHandle);
    setCurrentTelegramId(userId);

    const adminStatus = checkIsAdmin(userHandle);
    setIsAdmin(adminStatus);

    // Synchronize user profile with Firebase
    getOrCreateUser(userId, userHandle, userFirstName).then((profile) => {
      if (profile && typeof profile.tradingBalance === 'number') {
        setTradingBalance(profile.tradingBalance);
      }
      if (profile && typeof profile.referralBalance === 'number') {
        setReferralsIncome(profile.referralBalance);
      }
    });

    // Instant Realtime Listener for Balance Updates from Firebase (RTDB & Firestore)
    const unsub = subscribeToUser(userId, (userData) => {
      if (userData) {
        if (typeof userData.tradingBalance === 'number') {
          setTradingBalance(userData.tradingBalance);
        }
        if (typeof userData.referralBalance === 'number') {
          setReferralsIncome(userData.referralBalance);
        }
      }
    });

    return () => unsub();
  }, []);

  // Security guard on tab change
  const handleTabChange = (newTab: TabType) => {
    if (!isAdmin && newTab === 'admin') {
      setActiveTab('home');
    } else {
      setActiveTab(newTab);
    }
  };

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
            telegramId={currentTelegramId}
            username={currentTelegramUser}
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
        {activeTab === 'profile' && (
          <ProfileView 
            telegramId={currentTelegramId}
            username={currentTelegramUser}
            referralBalance={referralsIncome}
          />
        )}

        {/* ADMIN CONTROL PANEL TAB (RESTRICTED FOR @tddv2017 ONLY) */}
        {activeTab === 'admin' && isAdmin && <AdminPanel />}
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onChangeTab={handleTabChange} isAdmin={isAdmin} />
    </main>
  );
}
