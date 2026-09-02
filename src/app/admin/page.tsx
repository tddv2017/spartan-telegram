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
  TrendingUp
} from 'lucide-react';

type AdminNavSection = 
  | 'overview' 
  | 'users_crud' 
  | 'txs_crud' 
  | 'accounting' 
  | 'techops' 
  | 'agents';

export default function StandaloneAdminPortalPage() {
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
    loadSystemData();
    const unsub = subscribeToPendingTransactions((txs) => {
      setPendingTxs(txs);
    });
    return () => unsub();
  }, []);

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
      const res = await rejectLiveTransaction(txId, 'tddv2017 (Admin)', 'Từ chối bởi Quản trị viên');
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

  const navItems = [
    { id: 'overview' as AdminNavSection, label: 'TỔNG QUAN', icon: Layers, badge: pendingTxs.length > 0 ? `${pendingTxs.length} Chờ` : undefined },
    { id: 'users_crud' as AdminNavSection, label: 'QUẢN LÝ NGƯỜI DÙNG', icon: Users, badge: `${allUsers.length}` },
    { id: 'txs_crud' as AdminNavSection, label: 'QUẢN LÝ HÓA ĐƠN', icon: FileSpreadsheet, badge: `${allTransactions.length}` },
    { id: 'accounting' as AdminNavSection, label: 'KẾ TOÁN & 2 VÍ QUỸ', icon: Receipt },
    { id: 'techops' as AdminNavSection, label: 'KỸ THUẬT & BOT', icon: Cpu },
    { id: 'agents' as AdminNavSection, label: 'AI AGENTS (3 BỘ PHẬN)', icon: Bot },
  ];

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col font-sans">
      {/* Top Universal Institutional Header Bar */}
      <header className="bg-[#0b0e17] border-b border-[#1f293d] px-4 md:px-8 py-3.5 sticky top-0 z-40 flex items-center justify-between shadow-md">
        {/* Brand & Supreme Leader */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-[#ff5500] text-black font-black text-xl flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            👑
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm md:text-base font-black text-white uppercase tracking-wider">
                SPARTAN MASTER ADMIN SUITE
              </h1>
              <span className="text-[9px] font-black bg-amber-500 text-black px-2 py-0.5 rounded uppercase">
                PORTAL V2.0
              </span>
            </div>
            <span className="text-[10px] text-amber-400 font-mono font-bold block">
              Tổng Chỉ Huy Tối Cao: @tddv2017 (ID: 494232782)
            </span>
          </div>
        </div>

        {/* Live Gold Ticker & Quick Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Gold Ticker */}
          <div className="hidden lg:flex items-center gap-2 bg-[#131927] border border-[#1f293d] px-3 py-1.5 rounded-xl font-mono text-xs">
            <span className="text-gray-400 text-[10px]">XAUUSD:</span>
            <span className="font-black text-[#facc15]">${goldPrice.price.toFixed(2)}</span>
            <span className={`text-[10px] font-bold ${goldPrice.changePercent24h >= 0 ? 'text-[#00df89]' : 'text-red-400'}`}>
              {goldPrice.changePercent24h >= 0 ? '+' : ''}{goldPrice.changePercent24h.toFixed(2)}%
            </span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={loadSystemData}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl bg-[#131927] border border-[#1f293d] text-gray-300 hover:text-white transition-all"
            title="Làm mới toàn bộ dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          {/* Link back to Mini App */}
          <a
            href="/"
            className="px-3 py-2 rounded-xl bg-[#131927] hover:bg-[#1f293d] border border-[#1f293d] text-gray-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Mở giao diện Telegram Mini App"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mini App</span>
          </a>
        </div>
      </header>

      {/* Main Dashboard Layout (Sidebar + Content Workspace) */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left Navigation Sidebar */}
        <aside className="w-full md:w-64 bg-[#0b0e17] border-r border-[#1f293d] p-3 md:p-4 flex md:flex-col gap-1.5 md:sticky md:top-[65px] md:h-[calc(100vh-65px)] overflow-x-auto md:overflow-y-auto">
          <div className="hidden md:block pb-2 mb-1 border-b border-[#1f293d]">
            <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider block">
              BỘ ĐIỀU HÀNH CHUYÊN TRÁCH
            </span>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full py-2.5 px-3 rounded-2xl text-xs font-black uppercase flex items-center justify-between transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 to-[#ff5500] text-black shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                    : 'text-gray-400 hover:text-white hover:bg-[#131927]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-black text-amber-300' : 'bg-[#131927] text-gray-300 border border-[#1f293d]'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Sidebar Footer Stats (Desktop Only) */}
          <div className="hidden md:block mt-auto pt-4 border-t border-[#1f293d] space-y-2 text-xs font-mono">
            <div className="bg-[#131927] p-2.5 rounded-xl border border-[#1f293d]">
              <span className="text-[9px] text-gray-400 block mb-0.5">TỔNG VỐN TVL HỆ THỐNG:</span>
              <span className="text-sm font-black text-[#00df89]">
                ${totalTVL.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-400 px-1">
              <span>HẠ TẦNG:</span>
              <span className="text-[#00df89] font-black flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#00df89] shadow-[0_0_6px_#00df89] animate-pulse" />
                ONLINE
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
        </main>
      </div>
    </div>
  );
}
