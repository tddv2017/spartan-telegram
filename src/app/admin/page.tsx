'use client';

import React, { useState, useEffect } from 'react';
import { 
  approveLiveTransaction, 
  rejectLiveTransaction, 
  subscribeToPendingTransactions,
  TransactionData
} from '@/lib/firebaseService';
import { 
  fetchAllUsers, 
  fetchAllTransactions, 
  fetchSystemConfig, 
  UserAuditItem, 
  SystemConfig 
} from '@/lib/adminService';
import { fetchLiveGoldPrice, GoldPriceData } from '@/lib/goldPriceService';
import { AdminOverviewTab } from '@/components/admin/AdminOverviewTab';
import { AccountingAuditTab } from '@/components/admin/AccountingAuditTab';
import { PersonnelHrTab } from '@/components/admin/PersonnelHrTab';
import { TechOpsTab } from '@/components/admin/TechOpsTab';
import { AiAgentsCommandCenter } from '@/components/admin/AiAgentsCommandCenter';
import { AdminUserCrudManager } from '@/components/admin/AdminUserCrudManager';
import { AdminTransactionCrudManager } from '@/components/admin/AdminTransactionCrudManager';
import { AdminBinance3FaModal } from '@/components/admin/AdminBinance3FaModal';
import { SecurityPenTestLab } from '@/components/admin/SecurityPenTestLab';
import { NotificationModal } from '@/components/NotificationModal';
import { generateUserNotifications } from '@/lib/notificationService';
import { getAdmin3FaConfig, saveAdmin3FaConfig, Admin3FaConfig } from '@/lib/admin3faService';
import { 
  ShieldCheck, 
  Layers, 
  Receipt, 
  Users, 
  Cpu, 
  RefreshCw, 
  Crown, 
  Bot, 
  ExternalLink,
  FileSpreadsheet,
  Wallet,
  Activity,
  ArrowRight,
  TrendingUp,
  Lock,
  LogOut,
  KeyRound,
  ShieldAlert,
  Bell,
  Smartphone,
  Mail
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

type AdminNavSection = 
  | 'overview' 
  | 'users_crud' 
  | 'txs_crud' 
  | 'accounting' 
  | 'techops' 
  | 'agents'
  | 'security_lab';

const PIN_STORAGE_KEY = 'spartan_admin_master_pin_v2';
const SESSION_AUTH_KEY = 'spartan_admin_session_auth_token';

export default function StandaloneAdminPortalPage() {
  const { t, lang, toggleLang } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<AdminNavSection>('overview');
  const [pendingTxs, setPendingTxs] = useState<TransactionData[]>([]);
  const [allTransactions, setAllTransactions] = useState<TransactionData[]>([]);
  const [allUsers, setAllUsers] = useState<UserAuditItem[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    maintenanceMode: false,
    globalBotActive: true
  });
  const [goldPrice, setGoldPrice] = useState<GoldPriceData>({
    symbol: 'XAUUSD',
    price: 4450.31,
    change24h: 15.20,
    changePercent24h: 0.65,
    high24h: 4465.00,
    low24h: 4428.00,
    updatedAt: 'Live'
  });
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [adminStatusMsg, setAdminStatusMsg] = useState<string | null>(null);
  const [broadcastMsg, setBroadcastMsg] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Notification Modal State
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifRefreshTrigger, setNotifRefreshTrigger] = useState(0);

  // Change PIN Modal State
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);
  const [newPinInput, setNewPinInput] = useState('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState<string | null>(null);

  // 3FA Custody Settings Modal State
  const [is3FaSettingsOpen, setIs3FaSettingsOpen] = useState(false);
  const [threeFaConfig, setThreeFaConfig] = useState<Admin3FaConfig>(getAdmin3FaConfig());
  const [threeFaSaveSuccess, setThreeFaSaveSuccess] = useState<string | null>(null);

  const handleSave3FaConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveAdmin3FaConfig(threeFaConfig);
    setThreeFaSaveSuccess('✓ Đã cập nhật thành công cấu hình Gmail Lưu Ký và Thiết Bị Di Động!');
    setTimeout(() => {
      setThreeFaSaveSuccess(null);
      setIs3FaSettingsOpen(false);
    }, 2000);
  };

  // Load All System Data
  const loadSystemData = async () => {
    setIsRefreshing(true);
    try {
      const [uList, tList, sysCfg, gp] = await Promise.all([
        fetchAllUsers(),
        fetchAllTransactions(),
        fetchSystemConfig(),
        fetchLiveGoldPrice()
      ]);
      setAllUsers(uList);
      setAllTransactions(tList);
      setSystemConfig(sysCfg);
      setGoldPrice(gp);
    } catch (err) {
      console.error('Lỗi tải dữ liệu cổng quản trị:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadSystemData();
      const unsub = subscribeToPendingTransactions((txs) => {
        setPendingTxs(txs);
      });
      return () => unsub();
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_AUTH_KEY);
    setIsAuthenticated(false);
  };

  const handleChangePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPinInput.length !== 6 || !/^\d+$/.test(newPinInput)) {
      alert('Mã PIN mới phải gồm đúng 6 chữ số');
      return;
    }
    localStorage.setItem(PIN_STORAGE_KEY, newPinInput);
    setPinChangeSuccess('✅ ĐÃ ĐỔI MÃ MASTER PIN THÀNH CÔNG!');
    setTimeout(() => {
      setPinChangeSuccess(null);
      setIsChangePinOpen(false);
      setNewPinInput('');
    }, 2000);
  };

  const handleApprove = async (tx: TransactionData) => {
    const key = tx.id || tx.memoCode;
    const txId = tx.id || tx.memoCode;
    setLoadingMap(prev => ({ ...prev, [key]: true }));
    try {
      const res = await approveLiveTransaction(txId, 'tddv2017 (Admin)');
      if (res.success) {
        setAdminStatusMsg(`✅ ĐÃ DUYỆT thành công đơn ${txId} (+${tx.netAmount.toFixed(2)} USDT) cho @${tx.username}!`);
        loadSystemData();
      } else {
        setAdminStatusMsg(`⚠️ ${res.message}`);
      }
      setTimeout(() => setAdminStatusMsg(null), 5000);
    } catch (err) {
      console.error('Lỗi duyệt đơn:', err);
      setAdminStatusMsg(`❌ Lỗi khi duyệt đơn ${txId}!`);
    } finally {
      setLoadingMap(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleReject = async (tx: TransactionData) => {
    const key = tx.id || tx.memoCode;
    const txId = tx.id || tx.memoCode;
    setLoadingMap(prev => ({ ...prev, [key]: true }));
    try {
      const res = await rejectLiveTransaction(txId, 'tddv2017 (Admin)', 'Từ chối bởi Quản trị viên do sai Memo hoặc số tiền');
      if (res.success) {
        setAdminStatusMsg(`🚫 ĐÃ TỪ CHỐI đơn ${txId} của người dùng @${tx.username}!`);
        loadSystemData();
      } else {
        setAdminStatusMsg(`⚠️ ${res.message}`);
      }
      setTimeout(() => setAdminStatusMsg(null), 5000);
    } catch (err) {
      console.error('Lỗi từ chối đơn:', err);
      setAdminStatusMsg(`❌ Lỗi khi từ chối đơn ${txId}!`);
    } finally {
      setLoadingMap(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleBroadcast = () => {
    if (!broadcastMsg.trim()) return;
    alert(`📢 ĐÃ PHÁT THÔNG BÁO TỚI TOÀN BỘ NGƯỜI DÙNG:\n\n"${broadcastMsg}"`);
    setBroadcastMsg('');
  };

  const totalTVL = allUsers.reduce((sum, u) => sum + (u.tradingBalance || 0), 0);

  // Compute Notifications for Admin
  const adminNotifications = generateUserNotifications(
    '494232782',
    'tddv2017',
    allTransactions,
    systemConfig.broadcastNotice,
    totalTVL,
    0
  );
  const unreadNotifsCount = adminNotifications.filter(n => !n.isRead).length + pendingTxs.length;

  const navItems = [
    { id: 'overview' as AdminNavSection, label: t('admin_dept_overview'), icon: Layers, badge: pendingTxs.length > 0 ? `${pendingTxs.length} ${lang === 'vi' ? 'Chờ' : 'Pending'}` : undefined },
    { id: 'users_crud' as AdminNavSection, label: t('admin_dept_users'), icon: Users, badge: `${allUsers.length}` },
    { id: 'txs_crud' as AdminNavSection, label: t('admin_dept_txs'), icon: FileSpreadsheet, badge: `${allTransactions.length}` },
    { id: 'accounting' as AdminNavSection, label: t('admin_dept_accounting'), icon: Receipt },
    { id: 'techops' as AdminNavSection, label: t('admin_dept_techops'), icon: Cpu },
    { id: 'agents' as AdminNavSection, label: t('admin_dept_agents'), icon: Bot },
    { id: 'security_lab' as AdminNavSection, label: t('admin_dept_pentest'), icon: ShieldAlert, badge: 'LAB' },
  ];

  // If not authenticated, render Binance-Grade 3FA Institutional Security Suite (Master PIN + Gmail Custody + Phone Biometrics)
  if (!isAuthenticated) {
    return <AdminBinance3FaModal onSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#04060a] text-white flex flex-col font-sans">
      {/* Top Universal Institutional Header Bar */}
      <header className="bg-[#05070c] border-b border-[#221c10] px-4 md:px-8 py-3.5 sticky top-0 z-40 flex items-center justify-between shadow-md">
        {/* Brand & Supreme Leader */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#f5d77f] font-black text-xl flex items-center justify-center shadow-[0_0_12px_rgba(212,175,55,0.25)]">
            👑
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm md:text-base font-black text-[#f5d77f] uppercase tracking-wider">
                {t('admin_suite_title')}
              </h1>
              <span className="text-[9px] font-black gold-btn-solid text-black px-2 py-0.5 rounded uppercase font-mono">
                {t('admin_portal_badge')}
              </span>
            </div>
            <span className="text-[10px] text-[#d4af37] font-mono font-bold block">
              {t('admin_supreme_header')}
            </span>
          </div>
        </div>

        {/* Live Gold Ticker & Security Controls */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Gold Ticker */}
          <div className="hidden lg:flex items-center gap-2 bg-[#080b12] border border-[#221c10] px-3 py-1.5 rounded-xl font-mono text-xs">
            <span className="text-gray-400 text-[10px]">XAUUSD:</span>
            <span className="font-black text-[#f5d77f]">${goldPrice.price.toFixed(2)}</span>
            <span className={`text-[10px] font-bold ${goldPrice.changePercent24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {goldPrice.changePercent24h >= 0 ? '+' : ''}{goldPrice.changePercent24h.toFixed(2)}%
            </span>
          </div>

          {/* Bilingual Language Switcher Toggle */}
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#0c0f17] hover:bg-[#141924] border border-[#2a2215] text-xs font-bold transition-all shadow-sm active:scale-95"
            title={lang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
          >
            <span className="text-sm">{lang === 'vi' ? '🇻🇳' : '🇬🇧'}</span>
            <span className="font-mono text-[10px] text-[#f5d77f] font-extrabold uppercase">
              {lang === 'vi' ? 'VI' : 'EN'}
            </span>
          </button>

          {/* Notification Bell Button */}
          <button
            onClick={() => setIsNotificationOpen(true)}
            className="relative p-2.5 rounded-xl bg-[#0c0f17] hover:bg-[#141924] border border-[#221c10] text-gray-300 hover:text-white transition-all shadow-md group active:scale-95"
            title="Xem trung tâm thông báo"
          >
            <Bell className="w-4 h-4 group-hover:text-[#f5d77f] transition-colors" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white font-mono font-black text-[10px] rounded-full flex items-center justify-center shadow-[0_0_8px_#ef4444] animate-bounce">
                {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
              </span>
            )}
          </button>

          {/* Refresh Button */}
          <button
            onClick={loadSystemData}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl bg-[#0c0f17] border border-[#221c10] text-gray-300 hover:text-white transition-all active:scale-95"
            title={t('admin_refresh')}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#f5d77f]' : ''}`} />
          </button>

          {/* Binance 3FA Custody Settings Button */}
          <button
            onClick={() => setIs3FaSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#d4af37]/15 hover:bg-[#d4af37]/25 border border-[#d4af37]/40 text-[#f5d77f] text-xs font-bold transition-all shadow-sm active:scale-95"
            title="Cấu hình bảo mật 3 lớp Gmail & Thiết bị di động"
          >
            <ShieldCheck className="w-4 h-4 text-[#d4af37]" />
            <span className="hidden md:inline">{t('admin_security_3fa')}</span>
          </button>

          {/* Change PIN Button */}
          <button
            onClick={() => setIsChangePinOpen(true)}
            className="p-2.5 rounded-xl bg-[#0c0f17] hover:bg-[#141924] border border-[#221c10] text-[#f5d77f] text-xs font-bold transition-all active:scale-95"
            title={t('admin_change_pin')}
          >
            <KeyRound className="w-4 h-4" />
          </button>

          {/* Link back to Mini App */}
          <a
            href="/"
            className="px-3 py-2 rounded-xl bg-[#0c0f17] hover:bg-[#141924] border border-[#221c10] text-gray-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
            title="Mở giao diện Telegram Mini App"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mini App</span>
          </a>

          {/* Emergency Lock / Logout Button */}
          <button
            onClick={handleLogout}
            className="px-3 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/35 text-red-400 hover:text-red-300 text-xs font-black uppercase flex items-center gap-1.5 transition-all active:scale-95"
            title={t('admin_lock_portal')}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('admin_lock_portal')}</span>
          </button>
        </div>
      </header>

      {/* Main Dashboard Layout (Sidebar + Content Workspace) */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left Navigation Sidebar */}
        <aside className="w-full md:w-64 bg-[#080b12] border-r border-[#221c10] p-3 md:p-4 flex md:flex-col gap-1.5 md:sticky md:top-[65px] md:h-[calc(100vh-65px)] overflow-x-auto md:overflow-y-auto">
          <div className="hidden md:block pb-2 mb-1 border-b border-[#221c10]">
            <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider block">
              {lang === 'vi' ? 'BỘ ĐIỀU HÀNH CHUYÊN TRÁCH' : 'EXECUTIVE DEPARTMENTS'}
            </span>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full py-2.5 px-3 rounded-2xl text-xs font-black uppercase flex items-center justify-between transition-all whitespace-nowrap active:scale-[0.99] ${
                  isActive
                    ? 'gold-btn-solid text-black shadow-[0_0_15px_rgba(212,175,55,0.3)]'
                    : 'text-gray-400 hover:text-white hover:bg-[#0c0f17]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-black text-[#f5d77f]' : 'bg-[#05070c] text-gray-300 border border-[#221c10]'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Sidebar Footer Stats (Desktop Only) */}
          <div className="hidden md:block mt-auto pt-4 border-t border-[#221c10] space-y-2 text-xs font-mono">
            <div className="bg-[#05070c] p-2.5 rounded-xl border border-[#221c10]">
              <span className="text-[9px] text-gray-400 block mb-0.5">
                {lang === 'vi' ? 'TỔNG VỐN TVL HỆ THỐNG:' : 'SYSTEM TVL CAPITAL:'}
              </span>
              <span className="text-sm font-black text-emerald-400">
                ${totalTVL.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-400 px-1">
              <span>{lang === 'vi' ? 'HẠ TẦNG AN NINH:' : 'SECURITY SHIELD:'}</span>
              <span className="text-emerald-400 font-black flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981] animate-pulse" />
                PROTECTED
              </span>
            </div>
          </div>
        </aside>

        {/* Right Content Workspace (100% Full Width Desktop Screen) */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full space-y-6">
          {/* Status Toast Banner */}
          {adminStatusMsg && (
            <div className="p-4 bg-amber-500/20 border border-amber-500 rounded-3xl text-amber-300 text-xs font-bold flex items-center gap-2 animate-bounce shadow-lg">
              <ShieldCheck className="w-4 h-4 flex-shrink-0 text-amber-400" />
              <span>{adminStatusMsg}</span>
            </div>
          )}

          {/* ACTIVE SECTION ROUTER */}
          {activeSection === 'overview' && (
            <AdminOverviewTab
              pendingTxs={pendingTxs}
              transactions={allTransactions}
              users={allUsers}
              loadingMap={loadingMap}
              onApprove={handleApprove}
              onReject={handleReject}
              broadcastMsg={broadcastMsg}
              setBroadcastMsg={setBroadcastMsg}
              onBroadcast={handleBroadcast}
            />
          )}

          {activeSection === 'users_crud' && (
            <AdminUserCrudManager
              users={allUsers}
              onRefresh={loadSystemData}
            />
          )}

          {activeSection === 'txs_crud' && (
            <AdminTransactionCrudManager
              transactions={allTransactions}
              onRefresh={loadSystemData}
            />
          )}

          {activeSection === 'accounting' && (
            <AccountingAuditTab
              transactions={allTransactions}
              users={allUsers}
            />
          )}

          {activeSection === 'techops' && (
            <TechOpsTab
              users={allUsers}
              systemConfig={systemConfig}
              onRefresh={loadSystemData}
            />
          )}

          {activeSection === 'agents' && (
            <AiAgentsCommandCenter />
          )}

          {activeSection === 'security_lab' && (
            <SecurityPenTestLab onRefreshData={loadSystemData} />
          )}
        </main>
      </div>

      {/* Notification Center Modal */}
      <NotificationModal 
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        notifications={adminNotifications}
        telegramId="494232782"
        onRefreshNotifications={() => setNotifRefreshTrigger(c => c + 1)}
      />

      {/* MODAL ĐỔI MÃ MASTER PIN */}
      {isChangePinOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#080b12] border border-[#221c10] rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#d4af37]/15 border border-[#d4af37]/40 flex items-center justify-center text-[#f5d77f] font-black shadow-[0_0_12px_rgba(212,175,55,0.25)]">
              <KeyRound className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-sm font-black text-[#f5d77f] uppercase tracking-wider">
                {lang === 'vi' ? 'THIẾT LẬP MÃ MASTER PIN MỚI' : 'SET NEW MASTER PIN'}
              </h3>
              <span className="text-[10px] text-gray-400 font-mono block">
                {lang === 'vi' ? 'Nhập 6 chữ số bí mật để khóa cổng Admin' : 'Enter 6 secret digits to secure Admin Portal'}
              </span>
            </div>

            {pinChangeSuccess && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500 rounded-2xl text-emerald-400 text-xs font-bold">
                {pinChangeSuccess}
              </div>
            )}

            <form onSubmit={handleChangePinSubmit} className="space-y-3">
              <input
                type="password"
                maxLength={6}
                required
                value={newPinInput}
                onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="VD: 998877"
                className="w-full bg-[#05070c] border border-[#221c10] rounded-2xl py-3 text-center text-xl font-mono tracking-[0.4em] text-[#f5d77f] focus:outline-none focus:border-[#d4af37]"
              />

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl gold-btn-solid text-black font-black text-xs uppercase shadow-md hover:opacity-90 transition-all active:scale-95"
                >
                  {lang === 'vi' ? 'LƯU MÃ PIN MỚI' : 'SAVE NEW PIN'}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsChangePinOpen(false); setNewPinInput(''); }}
                  className="px-4 py-3 rounded-xl bg-[#0c0f17] text-gray-400 hover:text-white border border-[#221c10] text-xs font-bold active:scale-95"
                >
                  {lang === 'vi' ? 'HỦY' : 'CANCEL'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3FA Custody Settings Modal */}
      {is3FaSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#080b12] border border-[#221c10] rounded-3xl p-6 max-w-md w-full space-y-4 shadow-[0_0_40px_rgba(212,175,55,0.2)] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#221c10] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#d4af37]" />
                <h3 className="text-sm font-black text-[#f5d77f] uppercase tracking-wider">
                  {lang === 'vi' ? 'CẤU HÌNH BẢO MẬT 3FA BINANCE' : 'BINANCE-GRADE 3FA CONFIG'}
                </h3>
              </div>
              <button
                onClick={() => setIs3FaSettingsOpen(false)}
                className="text-gray-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {threeFaSaveSuccess && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500 rounded-2xl text-emerald-400 text-xs font-bold">
                {threeFaSaveSuccess}
              </div>
            )}

            <form onSubmit={handleSave3FaConfig} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-gray-300 font-bold flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>{lang === 'vi' ? 'Gmail Ký Lưu Ký Số (Nhận OTP):' : 'Custody Signing Gmail (OTP):'}</span>
                </label>
                <input
                  type="email"
                  required
                  value={threeFaConfig.adminEmail}
                  onChange={(e) => setThreeFaConfig({ ...threeFaConfig, adminEmail: e.target.value })}
                  placeholder="admin@spartan.trade hoặc yourname@gmail.com"
                  className="w-full bg-[#05070c] border border-[#221c10] rounded-xl py-2.5 px-3 text-white text-xs font-mono focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-300 font-bold flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{lang === 'vi' ? 'Thiết Bị Di Động Tin Cậy (Chấp Thuận / Passkey):' : 'Trusted Mobile Device (Biometrics / Passkey):'}</span>
                </label>
                <input
                  type="text"
                  required
                  value={threeFaConfig.deviceName}
                  onChange={(e) => setThreeFaConfig({ ...threeFaConfig, deviceName: e.target.value })}
                  placeholder="VD: iPhone 15 Pro Max của Chỉ Huy"
                  className="w-full bg-[#05070c] border border-[#221c10] rounded-xl py-2.5 px-3 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="p-3 bg-[#05070c] rounded-xl border border-[#221c10] text-[10px] text-gray-400 font-mono space-y-1">
                <span className="text-[#f5d77f] font-bold block uppercase">{lang === 'vi' ? 'Cơ chế bảo vệ 3 lớp:' : '3-Layer Protection Mechanism:'}</span>
                <span>• {lang === 'vi' ? 'Lớp 1: Mã Master PIN 6 số.' : 'Layer 1: 6-digit Master PIN.'}</span>
                <span>• {lang === 'vi' ? 'Lớp 2: Ký mật mã số & OTP gửi về Gmail.' : 'Layer 2: Digital cryptographic signing & Gmail OTP.'}</span>
                <span>• {lang === 'vi' ? 'Lớp 3: Chấp thuận trực tiếp trên phần cứng điện thoại (Biometrics / Authenticator).' : 'Layer 3: Hardware biometrics / Google Authenticator.'}</span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl gold-btn-solid text-black font-black text-xs uppercase shadow-md hover:opacity-90 transition-all active:scale-95"
                >
                  {lang === 'vi' ? 'LƯU CẤU HÌNH 3FA' : 'SAVE 3FA SETTINGS'}
                </button>
                <button
                  type="button"
                  onClick={() => setIs3FaSettingsOpen(false)}
                  className="px-4 py-3 rounded-xl bg-[#0c0f17] text-gray-400 hover:text-white border border-[#221c10] text-xs font-bold active:scale-95"
                >
                  {lang === 'vi' ? 'ĐÓNG' : 'CLOSE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
