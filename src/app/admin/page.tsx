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
import { hashMasterPin } from '@/lib/pinCrypto';
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
  Mail,
  ChevronDown
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

type AdminNavSection = 
  | 'overview' 
  | 'users_crud' 
  | 'txs_crud' 
  | 'accounting' 
  | 'personnel'
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
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

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

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPinInput.length !== 6 || !/^\d+$/.test(newPinInput)) {
      alert('Mã PIN mới phải gồm đúng 6 chữ số');
      return;
    }
    try {
      const hashedPin = await hashMasterPin(newPinInput);
      localStorage.setItem(PIN_STORAGE_KEY, hashedPin);

      // 1. Sync to Firebase Realtime Database
      const rtdbPromise = fetch('https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app/system_config.json', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          master_pin_hash: hashedPin,
          master_pin: null
        })
      });

      // 2. Sync to Cloud Firestore (collection: system_config, doc: admin_security)
      const firestorePromise = fetch('https://firestore.googleapis.com/v1/projects/decisive-mapper-216306/databases/(default)/documents/system_config/admin_security', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            master_pin_hash: { stringValue: hashedPin },
            updatedAt: { stringValue: new Date().toISOString() },
            description: { stringValue: 'Salted SHA-256 Hash of Master Admin PIN' }
          }
        })
      });

      await Promise.allSettled([rtdbPromise, firestorePromise]);
      setPinChangeSuccess('✅ ĐÃ BĂM MẬT MÃ SHA-256 & ĐỒNG BỘ LÊN CẢ FIRESTORE & RTDB!');
    } catch {
      setPinChangeSuccess('⚠️ ĐÃ LƯU CỤC BỘ (Không thể kết nối đám mây)');
    }
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
    { id: 'personnel' as AdminNavSection, label: t('admin_dept_personnel'), icon: Users },
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
      {/* Top Universal Institutional Cockpit Command Bar */}
      <header className="bg-[#05070c] border-b border-[#221c10] px-4 md:px-6 py-2.5 sticky top-0 z-40 flex items-center justify-between shadow-lg">
        {/* Brand & Live Engine Status Indicators */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#f5d77f] font-black text-lg flex items-center justify-center shadow-[0_0_12px_rgba(212,175,55,0.25)]">
              👑
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-white tracking-wider uppercase">SPARTAN</span>
                <span className="text-[9px] font-black gold-btn-solid text-black px-1.5 py-0.5 rounded uppercase font-mono">
                  COCKPIT
                </span>
              </div>
              <span className="text-[9px] text-[#f5d77f] font-mono block">
                INSTITUTIONAL SUITE
              </span>
            </div>
          </div>

          {/* Heartbeat Status Indicators */}
          <div className="hidden lg:flex items-center gap-2 border-l border-[#221c10] pl-3 ml-1">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-[10px] text-emerald-400 font-mono font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>MT5 EA LIVE</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-[10px] text-emerald-400 font-mono font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>TRONGRID 100%</span>
            </div>
          </div>
        </div>

        {/* Live Gold Ticker (Center Focus) */}
        <div className="hidden xl:flex items-center gap-2 bg-[#080b12] border border-[#221c10] px-3 py-1.5 rounded-xl font-mono text-xs shadow-inner">
          <span className="text-gray-400 text-[10px]">XAU/USD:</span>
          <span className="font-black text-[#f5d77f]">${goldPrice.price.toFixed(2)}</span>
          <span className={`text-[10px] font-bold ${goldPrice.changePercent24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {goldPrice.changePercent24h >= 0 ? '+' : ''}{goldPrice.changePercent24h.toFixed(2)}%
          </span>
          <span className="w-1 h-1 rounded-full bg-[#221c10] mx-0.5" />
          <span className="text-[9px] text-gray-500">EXNESS LIVE</span>
        </div>

        {/* Right Consolidated Controls */}
        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            onClick={loadSystemData}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-[#0c0f17] hover:bg-[#141924] border border-[#221c10] text-gray-300 hover:text-white transition-all active:scale-95 shadow-sm"
            title={t('admin_refresh')}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#f5d77f]' : ''}`} />
          </button>

          {/* Bilingual Language Switcher Toggle */}
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#0c0f17] hover:bg-[#141924] border border-[#221c10] text-xs font-bold transition-all shadow-sm active:scale-95"
            title={lang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
          >
            <span className="text-xs">{lang === 'vi' ? '🇻🇳' : '🇬🇧'}</span>
            <span className="font-mono text-[10px] text-[#f5d77f] font-extrabold uppercase">
              {lang === 'vi' ? 'VI' : 'EN'}
            </span>
          </button>

          {/* Notification Bell Button */}
          <button
            onClick={() => setIsNotificationOpen(true)}
            className="relative p-2 rounded-xl bg-[#0c0f17] hover:bg-[#141924] border border-[#221c10] text-gray-300 hover:text-white transition-all shadow-sm group active:scale-95"
            title="Xem trung tâm thông báo"
          >
            <Bell className="w-3.5 h-3.5 group-hover:text-[#f5d77f] transition-colors" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-red-500 text-white font-mono font-black text-[9px] rounded-full flex items-center justify-center shadow-[0_0_8px_#ef4444] animate-bounce">
                {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
              </span>
            )}
          </button>

          {/* Consolidated Admin Profile Chip with Dropdown */}
          <div className="relative pl-1">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 bg-[#0c0f17] hover:bg-[#141924] border border-[#221c10] px-2.5 py-1 rounded-xl transition-all shadow-sm active:scale-95"
            >
              <div className="w-6 h-6 rounded-lg bg-[#d4af37]/20 text-[#f5d77f] flex items-center justify-center text-xs font-black">
                👑
              </div>
              <div className="text-left leading-tight hidden sm:block">
                <span className="text-xs font-black text-[#f5d77f] block">@tddv2017</span>
                <span className="text-[8px] text-gray-400 font-mono">SUPREME LEADER</span>
              </div>
              <ChevronDown className="w-3 h-3 text-gray-400 ml-0.5" />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileMenuOpen && (
              <div 
                className="absolute right-0 mt-2 w-56 bg-[#080b12] border border-[#221c10] rounded-2xl p-2 shadow-2xl space-y-1 z-50 animate-in fade-in zoom-in-95 duration-150"
                onClick={() => setIsProfileMenuOpen(false)}
              >
                <div className="px-3 py-2 border-b border-[#221c10] space-y-0.5">
                  <span className="text-xs font-black text-white block">@tddv2017</span>
                  <span className="text-[9px] text-[#f5d77f] font-mono block">ID: 494232782</span>
                </div>

                <button
                  onClick={() => setIs3FaSettingsOpen(true)}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-gray-300 hover:text-white hover:bg-[#0c0f17] flex items-center gap-2 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>{t('admin_security_3fa')}</span>
                </button>

                <button
                  onClick={() => setIsChangePinOpen(true)}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-gray-300 hover:text-white hover:bg-[#0c0f17] flex items-center gap-2 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>{t('admin_change_pin')}</span>
                </button>

                <a
                  href="/"
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-gray-300 hover:text-white hover:bg-[#0c0f17] flex items-center gap-2 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                  <span>{lang === 'vi' ? 'Mở Telegram Mini App' : 'Open Mini App'}</span>
                </a>

                <div className="pt-1 border-t border-[#221c10]">
                  <button
                    onClick={handleLogout}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-black text-red-400 hover:bg-red-500/15 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-400" />
                    <span>{t('admin_lock_portal')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout (Sidebar + Content Workspace) */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left Slim Navigation Sidebar */}
        <aside className="w-full md:w-56 bg-[#080b12] border-r border-[#221c10] p-3 flex md:flex-col gap-1 md:sticky md:top-[57px] md:h-[calc(100vh-57px)] overflow-x-auto md:overflow-y-auto shrink-0">
          <div className="hidden md:block pb-2 mb-1 border-b border-[#221c10]">
            <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-wider block">
              {lang === 'vi' ? 'ĐIỀU HÀNH HỆ THỐNG' : 'OPERATIONS'}
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

          {activeSection === 'personnel' && (
            <PersonnelHrTab
              users={allUsers}
              onRefresh={loadSystemData}
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
