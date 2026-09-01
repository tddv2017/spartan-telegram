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
import { AdminPanel } from '@/components/AdminPanel';
import { checkIsAdmin } from '@/lib/adminAuth';
import { forceSyncUserProfile, subscribeToUser, UserData } from '@/lib/firebaseService';
import { startAutoScanWorker } from '@/lib/tronService';
import { CheckCircle2 } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [tradingBalance, setTradingBalance] = useState<number>(0.00);
  const [referralsIncome, setReferralsIncome] = useState<number>(0.00);
  const [resellerTier, setResellerTier] = useState<number>(1);
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

    // SILENT FIREBASE PROFILE SYNC (Zero debug toasts shown on load)
    forceSyncUserProfile(id, handle, firstName, referrerId);

    // Instant Realtime Listener for Balance Updates from Firebase
    const unsubUser = subscribeToUser(id, (userData) => {
      if (userData) {
        if (typeof userData.tradingBalance === 'number') setTradingBalance(userData.tradingBalance);
        if (typeof userData.referralBalance === 'number') setReferralsIncome(userData.referralBalance);
        if (typeof userData.resellerTier === 'number') setResellerTier(userData.resellerTier);
      }
    });

    // START AUTOMATED BACKGROUND TRONSCAN / TRONGRID SCANNER WORKER
    const unsubWorker = startAutoScanWorker((tx, actualAmount) => {
      setSyncStatus(`🎉 BOT AUTOMATION: Detected on-chain TRON transfer of $${actualAmount.toFixed(2)} USDT and auto-approved order ${tx.id} for @${tx.username}!`);
      setTimeout(() => setSyncStatus(null), 10000);
    });

    return () => {
      unsubUser();
      unsubWorker();
    };
  }, []);

  const handleTabChange = (newTab: TabType) => {
    if (!isAdmin && newTab === 'admin') {
      setActiveTab('home');
    } else {
      setActiveTab(newTab);
    }
  };

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
      <Header 
        username={currentTelegramUser}
        isAdmin={isAdmin}
        tradingBalance={tradingBalance}
        resellerTier={resellerTier}
        onClose={() => alert('Telegram Mini App Closed')} 
      />

      {/* Sync Diagnostic Status Toast */}
      {syncStatus && (
        <div className="mx-4 my-2 p-3 rounded-2xl bg-[#00df89]/20 border border-[#00df89] text-[#00df89] text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{syncStatus}</span>
        </div>
      )}

      {/* Dynamic View Router based on active bottom tab */}
      {activeTab === 'home' && (
        <div className="p-4 space-y-4">
          <BalanceCard 
            tradingBalance={tradingBalance} 
            referralsIncome={referralsIncome} 
          />

          <ActionButtons 
            isActive={isBotActive}
            onStart={handleStart}
            onStop={handleStop}
          />

          <BotStatusCard 
            isActive={isBotActive}
          />

          <EquityChart />

          <QuantStrategyCard />
        </div>
      )}

      {activeTab === 'wallet' && (
        <div className="p-4">
          <WalletView 
            currentBalance={tradingBalance} 
            onUpdateBalance={handleUpdateBalance} 
            telegramId={currentTelegramId}
            username={currentTelegramUser}
          />
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="p-4">
          <AnalyticsView />
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="p-4">
          <ProfileView 
            telegramId={currentTelegramId}
            username={currentTelegramUser}
            referralBalance={referralsIncome}
            tradingBalance={tradingBalance}
            resellerTier={resellerTier}
          />
        </div>
      )}

      {activeTab === 'admin' && isAdmin && (
        <div className="p-4">
          <AdminPanel />
        </div>
      )}

      {/* Bottom Navigation Toolbar */}
      <BottomNav 
        activeTab={activeTab} 
        onChangeTab={handleTabChange} 
        isAdmin={isAdmin}
      />
    </main>
  );
}
