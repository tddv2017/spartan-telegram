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
import { forceSyncUserProfile, subscribeToUser, UserData } from '@/lib/firebaseService';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [tradingBalance, setTradingBalance] = useState<number>(0.00);
  const [referralsIncome, setReferralsIncome] = useState<number>(0.00);
  const [isBotActive, setIsBotActive] = useState<boolean>(true);
  const [currentTelegramUser, setCurrentTelegramUser] = useState<string>('');
  const [currentTelegramId, setCurrentTelegramId] = useState<string>('');
  const [userFirstName, setUserFirstName] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Dynamic Real Telegram SDK User Detection & Force Firebase Profile Write
  useEffect(() => {
    let handle = '';
    let id = '';
    let firstName = '';
    let referrerId = '';

    if (typeof window !== 'undefined') {
      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        tg.ready();
        const tgUser = tg.initDataUnsafe?.user;
        if (tgUser) {
          id = String(tgUser.id);
          handle = tgUser.username || `user_${id.slice(-4)}`;
          firstName = tgUser.first_name || 'Warrior';
        }

        const startParam = tg.initDataUnsafe?.start_param;
        if (startParam && startParam.startsWith('ref_')) {
          referrerId = startParam.replace('ref_', '');
        }
      }

      if (!id || !handle) {
        const params = new URLSearchParams(window.location.search);
        id = params.get('id') || '';
        handle = params.get('user') || '';
        firstName = params.get('name') || '';

        const refParam = params.get('ref') || params.get('start');
        if (refParam) {
          referrerId = refParam.replace('ref_', '');
        }
      }

      if (!id && !handle) {
        handle = localStorage.getItem('spartan_username') || 'tddv2017';
        id = localStorage.getItem('spartan_userid') || '494232782';
        firstName = 'Dung';
      }
    }

    if (!handle) handle = 'user_' + id.slice(-4);
    if (!id) id = '494232782';
    if (!firstName) firstName = 'Dung';

    setCurrentTelegramUser(handle);
    setCurrentTelegramId(id);
    setUserFirstName(firstName);

    const adminStatus = checkIsAdmin(handle) || checkIsAdmin(id);
    setIsAdmin(adminStatus);

    // FORCE IMMEDIATE UNCONDITIONAL WRITE TO FIREBASE (users/<id>)
    forceSyncUserProfile(id, handle, firstName, referrerId).then((res) => {
      if (res.success) {
        setSyncStatus(`🔥 Đã ghi nhận Profile User -> users/${id} (@${handle}) trên Firebase!`);
        setTimeout(() => setSyncStatus(null), 5000);
      }
    });

    // Instant Realtime Listener for Balance Updates from Firebase
    const unsub = subscribeToUser(id, (userData) => {
      if (userData) {
        if (typeof userData.tradingBalance === 'number') setTradingBalance(userData.tradingBalance);
        if (typeof userData.referralBalance === 'number') setReferralsIncome(userData.referralBalance);
      }
    });

    return () => unsub();
  }, []);

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

      {/* Sync Diagnostic Status Toast */}
      {syncStatus && (
        <div className="mx-4 mt-2 p-2 bg-[#00df89]/20 border border-[#00df89] rounded-xl text-[11px] font-bold text-[#00df89] text-center animate-pulse">
          {syncStatus}
        </div>
      )}

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
