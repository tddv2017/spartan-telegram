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
  const [tradingBalance, setTradingBalance] = useState<number>(7462415.57);
  const [referralsIncome, setReferralsIncome] = useState<number>(800.00);
  const [isBotActive, setIsBotActive] = useState<boolean>(true);
  const [currentTelegramUser, setCurrentTelegramUser] = useState<string>('tddv2017');
  const [currentTelegramId, setCurrentTelegramId] = useState<string>('1788035393');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Dynamic Telegram WebApp user detection & Automatic Firebase Profile Sync
  useEffect(() => {
    let userHandle = '';
    let userId = '1788035393';
    let userFirstName = 'Warrior';

    if (typeof window !== 'undefined') {
      // 1. Try reading from Telegram WebApp SDK
      const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      if (tgUser?.username) {
        userHandle = tgUser.username;
      }
      if (tgUser?.id) {
        userId = String(tgUser.id);
      }
      if (tgUser?.first_name) {
        userFirstName = tgUser.first_name;
      }

      if (!userHandle && !tgUser?.id) {
        // 2. Check URL search params for testing (e.g. ?user=tddv2017)
        const params = new URLSearchParams(window.location.search);
        userHandle = params.get('user') || 'tddv2017';
        userId = params.get('id') || '1788035393';
      }
    }

    if (!userHandle) userHandle = 'user_' + userId.slice(-4);

    setCurrentTelegramUser(userHandle);
    setCurrentTelegramId(userId);

    const adminStatus = checkIsAdmin(userHandle);
    setIsAdmin(adminStatus);

    // Sync Account Profile to Firebase Firestore & RTDB on app launch
    getOrCreateUser(userId, userHandle, userFirstName).then((profile) => {
      if (profile && profile.tradingBalance) {
        setTradingBalance(profile.tradingBalance);
      }
    });

    // Realtime Listener for Balance Updates from Firebase
    const unsub = subscribeToUser(userId, (userData) => {
      if (userData && typeof userData.tradingBalance === 'number') {
        setTradingBalance(userData.tradingBalance);
      }
      if (userData && typeof userData.referralBalance === 'number') {
        setReferralsIncome(userData.referralBalance);
      }
    });

    // Security guard: If normal user tries to access admin tab, fallback to home
    if (!adminStatus && activeTab === 'admin') {
      setActiveTab('home');
    }

    return () => unsub();
  }, [activeTab]);

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
        {activeTab === 'profile' && <ProfileView />}

        {/* ADMIN CONTROL PANEL TAB (RESTRICTED FOR @tddv2017 ONLY) */}
        {activeTab === 'admin' && isAdmin && <AdminPanel />}
      </div>

      {/* Bottom Navigation: Admin tab only renders when isAdmin is true */}
      <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} isAdmin={isAdmin} />
    </main>
  );
}
