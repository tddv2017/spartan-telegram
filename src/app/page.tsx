'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { NotificationModal } from '@/components/NotificationModal';
import { checkIsAdmin } from '@/lib/adminAuth';
import { 
  forceSyncUserProfile, 
  subscribeToUser, 
  subscribeToSystemConfig, 
  subscribeToUserTransactions,
  TransactionData 
} from '@/lib/firebaseService';
import { generateUserNotifications, AppNotification } from '@/lib/notificationService';
import { startAutoScanWorker } from '@/lib/tronService';
import { CheckCircle2, Lock, Wrench, ShieldAlert, AlertTriangle, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Home() {
  const { t, lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [tradingBalance, setTradingBalance] = useState<number>(0.00);
  const [referralsIncome, setReferralsIncome] = useState<number>(0.00);
  const [resellerTier, setResellerTier] = useState<number>(1);
  const [isBotActive, setIsBotActive] = useState<boolean>(true);
  const [isAccountFrozen, setIsAccountFrozen] = useState<boolean>(false);
  const [freezeReason, setFreezeReason] = useState<string>('');
  const [isMaintenanceMode, setIsMaintenanceMode] = useState<boolean>(false);
  const [maintenanceNotice, setMaintenanceNotice] = useState<string>('');
  const [isGlobalBotActive, setIsGlobalBotActive] = useState<boolean>(true);
  const [currentTelegramUser, setCurrentTelegramUser] = useState<string>('');
  const [currentTelegramId, setCurrentTelegramId] = useState<string>('');
  const [userFirstName, setUserFirstName] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [walletInitialMode, setWalletInitialMode] = useState<'deposit' | 'withdraw' | 'p2p_lending'>('deposit');

  // Notification Modal & Transactions state
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [userTransactions, setUserTransactions] = useState<TransactionData[]>([]);
  const [refreshNotifCount, setRefreshNotifCount] = useState(0);

  // Live Master Pool & Bot Profit State for Capital Share Allocation
  const [masterPoolBalance, setMasterPoolBalance] = useState<number>(49790.3);
  const [masterPoolEquity, setMasterPoolEquity] = useState<number>(49969.52);
  const [masterPoolProfit, setMasterPoolProfit] = useState<number>(0);
  const [userCapitalJoinedAt, setUserCapitalJoinedAt] = useState<string | null>(null);
  const [tradesList, setTradesList] = useState<any[]>([]);

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

    // SILENT FIREBASE PROFILE SYNC
    forceSyncUserProfile(id, handle, firstName, referrerId);

    // Realtime Listener for User Profile (Balance, Frozen State, Bot status)
    const unsubUser = subscribeToUser(id, (userData) => {
      if (userData) {
        if (typeof userData.tradingBalance === 'number') setTradingBalance(userData.tradingBalance);
        if (typeof userData.referralBalance === 'number') setReferralsIncome(userData.referralBalance);
        if (typeof userData.resellerTier === 'number') setResellerTier(userData.resellerTier);
        if (typeof userData.isFrozen === 'boolean') setIsAccountFrozen(userData.isFrozen);
        if (typeof userData.freezeReason === 'string') setFreezeReason(userData.freezeReason);
        if (typeof userData.botActive === 'boolean') setIsBotActive(userData.botActive);
        if (userData.capitalJoinedAt) setUserCapitalJoinedAt(userData.capitalJoinedAt);
        // DYNAMIC ADMIN PRIVILEGE: Update isAdmin if user is granted ADMIN in database
        if (userData.role === 'ADMIN' || (userData as any).role === 'SUPER_ADMIN' || checkIsAdmin(handle, userData.role) || checkIsAdmin(id, userData.role)) {
          setIsAdmin(true);
        }
      }
    });

    // Realtime Listener for User Transactions
    const unsubTxs = subscribeToUserTransactions(id, (txs) => {
      setUserTransactions(txs);
      const approvedDeps = txs.filter(t => t.type === 'DEPOSIT' && t.status === 'APPROVED');
      if (approvedDeps.length > 0) {
        const earliest = approvedDeps[0].approvedAt || approvedDeps[0].createdAt;
        if (earliest) setUserCapitalJoinedAt(prev => prev || earliest);
      }
    });

    // Realtime Listener for System Maintenance & Global Bot
    const unsubSystem = subscribeToSystemConfig((config) => {
      setIsMaintenanceMode(config.maintenanceMode);
      setMaintenanceNotice(config.broadcastNotice || '');
      setIsGlobalBotActive(config.globalBotActive);
    });

    // START AUTOMATED BACKGROUND TRONSCAN / TRONGRID SCANNER WORKER
    const unsubWorker = startAutoScanWorker(
      (tx, actualAmount) => {
        setSyncStatus(`🎉 BOT AUTOMATION: Đã khớp lệnh On-Chain TRON $${actualAmount.toFixed(2)} USDT và tự động duyệt nạp cho @${tx.username}!`);
        setTimeout(() => setSyncStatus(null), 10000);
      },
      (tx, reason) => {
        setSyncStatus(`⚠️ AI SENTINEL: Đơn nạp #${tx.id} bị từ chối do sai Memo! Đã mở cổng nộp bill đối soát tự động.`);
        setTimeout(() => setSyncStatus(null), 10000);
      }
    );

    // Realtime Listener for Master Pool & Trades Profit
    const fetchMasterPoolLive = async () => {
      try {
        const [poolRes, tradesRes] = await Promise.all([
          fetch("https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app/master_pool.json"),
          fetch("https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app/trades.json")
        ]);
        if (poolRes.ok) {
          const p = await poolRes.json();
          if (p?.balance) setMasterPoolBalance(Number(p.balance));
          if (p?.equity) setMasterPoolEquity(Number(p.equity));
        }
        if (tradesRes.ok) {
          const t = await tradesRes.json();
          if (t && typeof t === 'object') {
            const list = Object.values(t);
            setTradesList(list);
            const sumPnl = list.reduce((acc: number, item: any) => acc + (Number(item.pnl) || 0), 0);
            setMasterPoolProfit(sumPnl);
          }
        }
      } catch (e) {}
    };
    fetchMasterPoolLive();
    const poolInterval = setInterval(fetchMasterPoolLive, 5000);

    return () => {
      unsubUser();
      unsubTxs();
      unsubSystem();
      unsubWorker();
      clearInterval(poolInterval);
    };
  }, []);

  // Only share profit from trades opened AT OR AFTER user's capital entered the pool
  const eligibleUserProfit = useMemo(() => {
    if (!userCapitalJoinedAt || tradingBalance <= 0 || masterPoolBalance <= 0) return 0;
    const joinTimestamp = new Date(userCapitalJoinedAt).getTime();
    if (isNaN(joinTimestamp)) return 0;

    const eligibleTrades = tradesList.filter(trade => {
      const tradeTime = new Date(trade.timestamp).getTime();
      return !isNaN(tradeTime) && tradeTime >= joinTimestamp;
    });

    const eligibleSumPnl = eligibleTrades.reduce((acc: number, item: any) => acc + (Number(item.pnl) || 0), 0);
    const userRatio = tradingBalance / masterPoolBalance;
    return eligibleSumPnl * userRatio;
  }, [userCapitalJoinedAt, tradingBalance, masterPoolBalance, tradesList]);

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

  const handleStart = async () => {
    if (!isGlobalBotActive) {
      alert('⚠️ Global Bot Engine is currently paused by TechOps administrator.');
      return;
    }
    setIsBotActive(true);
    setSyncStatus('⚔️ SPARTAN BOT ENGAGED: Actively hunting M5/H1 Gold setups on Exness ECN!');
    setTimeout(() => setSyncStatus(null), 5000);
    if (currentTelegramId) {
      fetch(`https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app/users/${currentTelegramId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botActive: true })
      }).catch(() => {});
    }
  };

  const handleStop = async () => {
    setIsBotActive(false);
    setSyncStatus('🛡️ SPARTAN BOT STANDBY: Trading algorithm paused. Existing capital protected.');
    setTimeout(() => setSyncStatus(null), 5000);
    if (currentTelegramId) {
      fetch(`https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app/users/${currentTelegramId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botActive: false })
      }).catch(() => {});
    }
  };

  const effectiveBotActive = isBotActive && isGlobalBotActive && !isAccountFrozen;

  // Compute Notifications List and Unread Count
  const notifications = generateUserNotifications(
    currentTelegramId,
    currentTelegramUser,
    userTransactions,
    maintenanceNotice,
    tradingBalance,
    referralsIncome
  );
  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

  return (
    <main className="max-w-md mx-auto w-full min-h-screen flex flex-col bg-[#080c14] relative shadow-2xl pb-20">
      {/* Clean App Header with Notification Bell */}
      <Header 
        username={currentTelegramUser}
        isAdmin={isAdmin}
        tradingBalance={tradingBalance}
        resellerTier={resellerTier}
        isBotActive={effectiveBotActive}
        isTechOpsPaused={!isGlobalBotActive}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenNotifications={() => setIsNotificationOpen(true)}
        onClose={() => alert('Telegram Mini App Closed')} 
      />

      {/* Sync Diagnostic Status Toast */}
      {syncStatus && (
        <div className="mx-4 my-2 p-3 rounded-2xl bg-[#00df89]/20 border border-[#00df89] text-[#00df89] text-xs font-bold flex items-center gap-2 animate-in fade-in slide-from-top-2 duration-300">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{syncStatus}</span>
        </div>
      )}

      {/* ⚠️ SYSTEM MAINTENANCE NOTICE BANNER */}
      {isMaintenanceMode && !isAdmin && (
        <div className="mx-4 my-2 p-3.5 rounded-2xl bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-bold space-y-1 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
          <div className="flex items-center gap-2 font-black tracking-wider uppercase">
            <Wrench className="w-4 h-4 text-amber-400 animate-spin" />
            <span>SYSTEM SCHEDULED MAINTENANCE</span>
          </div>
          <p className="text-[11px] text-amber-200/90 font-medium">
            {maintenanceNotice || 'Institutional core infrastructure upgrade in progress. Deposits and withdrawals are temporarily queued.'}
          </p>
        </div>
      )}

      {/* 🛑 INDIVIDUAL BOT PAUSED NOTICE */}
      {!isGlobalBotActive && (
        <div className="mx-4 my-2 p-3 rounded-2xl bg-red-500/20 border border-red-500/50 text-red-300 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>GLOBAL BOT ENGINE PAUSED: Market risk control protocol active.</span>
        </div>
      )}

      {/* 🔒 ACCOUNT FROZEN FULL OVERLAY MODAL */}
      {isAccountFrozen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-5">
          <div className="w-full max-w-sm bg-[#0c101c] border-2 border-red-500/80 rounded-3xl p-6 text-center space-y-4 shadow-[0_0_30px_rgba(239,68,68,0.5)] animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-red-500/20 border border-red-500/60 flex items-center justify-center text-red-400 shadow-lg">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-black text-red-400 tracking-widest uppercase block">
                SECURITY COMPLIANCE ENFORCEMENT
              </span>
              <h2 className="text-lg font-black text-white uppercase tracking-tight">
                ACCOUNT SUSPENDED
              </h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                Your account (@{currentTelegramUser}) has been temporarily suspended by Spartan Risk Management & Compliance for identity or transaction verification.
              </p>
            </div>

            <div className="bg-[#131927] p-3 rounded-2xl border border-[#1f293d] text-left text-xs font-mono space-y-1">
              <div className="flex justify-between text-gray-400">
                <span>Telegram ID:</span>
                <span className="text-white font-bold">{currentTelegramId}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Trading Capital:</span>
                <span className="text-[#00df89] font-bold">${tradingBalance.toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Status:</span>
                <span className="text-red-400 font-bold">LOCKED / FROZEN</span>
              </div>
            </div>

            <a
              href="https://t.me/tddv2017"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg hover:opacity-95 transition-opacity block"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Contact Supreme Support (@tddv2017)</span>
            </a>
          </div>
        </div>
      )}


      {/* Dynamic View Router based on active bottom tab */}
      {activeTab === 'home' && (
        <div className="p-4 space-y-4">
          <BalanceCard 
            tradingBalance={tradingBalance} 
            referralsIncome={referralsIncome} 
            poolSharePercentage={masterPoolBalance > 0 ? (tradingBalance / masterPoolBalance) * 100 : 0}
            estimatedPoolProfit={eligibleUserProfit}
            totalMasterProfit={masterPoolProfit}
          />

          <ActionButtons 
            isActive={effectiveBotActive}
            onStart={handleStart}
            onStop={handleStop}
          />

          <BotStatusCard 
            isActive={effectiveBotActive}
          />

          <EquityChart 
            userTradingBalance={tradingBalance}
            userCapitalJoinedAt={userCapitalJoinedAt}
            masterPoolBalance={masterPoolBalance} 
            masterPoolEquity={masterPoolEquity} 
            trades={tradesList} 
          />

          <QuantStrategyCard />

          {/* Institutional P2P Lending Teaser Card */}
          <div 
            onClick={() => {
              setWalletInitialMode('p2p_lending');
              setActiveTab('wallet');
            }}
            className="spartan-card rounded-3xl p-4 border border-[#221c10] bg-gradient-to-r from-[#080b12] to-[#141b2a] flex items-center justify-between cursor-pointer hover:border-[#d4af37]/60 active:scale-[0.98] transition-all shadow-md group"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#d4af37]/15 border border-[#d4af37]/40 flex items-center justify-center text-xl text-[#f5d77f] group-hover:scale-110 transition-transform">
                🤝
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    {lang === 'vi' ? 'THANH KHOẢN KÝ QUỸ P2P' : 'P2P MARGIN ESCROW FACILITY'}
                  </h4>
                  <span className="px-1.5 py-0.2 rounded-full bg-[#ff5500]/20 text-[#ff5500] text-[8px] font-mono font-black border border-[#ff5500]/40 animate-pulse">
                    DEV
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 font-sans block pt-0.5">
                  {lang === 'vi' ? 'Ký quỹ bảo đảm 1.5% - 2.6%/tháng • Bảo chứng 100% Quỹ Lạnh' : 'Escrow Facility 1.5% - 2.6%/month • 100% Cold Vault Protected'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-[#f5d77f] text-xs font-bold font-mono group-hover:translate-x-1 transition-transform">
              <span className="hidden sm:inline">{lang === 'vi' ? 'XEM NGAY' : 'EXPLORE'}</span>
              <span>→</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'wallet' && (
        <div className="p-4">
          <WalletView 
            currentBalance={tradingBalance} 
            referralBalance={referralsIncome}
            onUpdateBalance={handleUpdateBalance} 
            telegramId={currentTelegramId}
            username={currentTelegramUser}
            initialMode={walletInitialMode}
          />
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="p-4">
          <AnalyticsView 
            tradingBalance={tradingBalance}
            masterPoolBalance={masterPoolBalance}
            totalMasterProfit={masterPoolProfit}
            userCapitalJoinedAt={userCapitalJoinedAt}
            username={currentTelegramUser}
            telegramId={currentTelegramId}
          />
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
          <AdminPanel 
            telegramId={currentTelegramId}
            username={currentTelegramUser}
          />
        </div>
      )}

      {/* Bottom Navigation Toolbar */}
      <BottomNav 
        activeTab={activeTab} 
        onChangeTab={handleTabChange} 
        isAdmin={isAdmin}
      />

      {/* Notification Center Modal */}
      <NotificationModal 
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        notifications={notifications}
        telegramId={currentTelegramId}
        onRefreshNotifications={() => setRefreshNotifCount(c => c + 1)}
      />
    </main>
  );
}
