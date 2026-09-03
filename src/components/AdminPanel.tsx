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
import { AdminOverviewTab } from './admin/AdminOverviewTab';
import { AccountingAuditTab } from './admin/AccountingAuditTab';
import { PersonnelHrTab } from './admin/PersonnelHrTab';
import { TechOpsTab } from './admin/TechOpsTab';
import { AiAgentsCommandCenter } from './admin/AiAgentsCommandCenter';
import { AdminBinance3FaModal } from './admin/AdminBinance3FaModal';
import { CeoDirectivesTab } from './admin/CeoDirectivesTab';
import { 
  ShieldCheck, 
  Layers, 
  Receipt, 
  Users, 
  Cpu, 
  RefreshCw,
  Crown,
  Bot,
  Lock
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

type AdminDepartment = 'overview' | 'ceo_directives' | 'accounting' | 'personnel' | 'techops' | 'agents';

const SESSION_AUTH_KEY = 'spartan_admin_session_auth_token';

interface AdminPanelProps {
  telegramId?: string;
  username?: string;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  telegramId = '494232782',
  username = 'tddv2017',
}) => {
  const { t, lang } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeDept, setActiveDept] = useState<AdminDepartment>('overview');
  const [pendingTxs, setPendingTxs] = useState<TransactionData[]>([]);
  const [allTransactions, setAllTransactions] = useState<TransactionData[]>([]);
  const [allUsers, setAllUsers] = useState<UserAuditItem[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    maintenanceMode: false,
    globalBotActive: true
  });
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [adminStatusMsg, setAdminStatusMsg] = useState<string | null>(null);
  const [broadcastMsg, setBroadcastMsg] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check 30-minute institutional session token
  useEffect(() => {
    const token = sessionStorage.getItem(SESSION_AUTH_KEY);
    if (token) {
      try {
        const parsed = JSON.parse(token);
        if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
          setIsAuthenticated(true);
        }
      } catch {}
    }
  }, []);

  const handleLockSession = () => {
    sessionStorage.removeItem(SESSION_AUTH_KEY);
    setIsAuthenticated(false);
  };

  // Load All System Data
  const loadSystemData = async () => {
    setIsRefreshing(true);
    try {
      const [uList, tList, sysCfg] = await Promise.all([
        fetchAllUsers(),
        fetchAllTransactions(),
        fetchSystemConfig()
      ]);
      setAllUsers(uList);
      setAllTransactions(tList);
      setSystemConfig(sysCfg);
    } catch (err) {
      console.error('Lỗi tải dữ liệu quản trị:', err);
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
      const res = await approveLiveTransaction(txId, 'tddv2017');
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
      const res = await rejectLiveTransaction(txId, 'tddv2017', 'Từ chối bởi Quản trị viên');
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

  const departments = [
    { id: 'overview' as AdminDepartment, label: t('admin_dept_overview'), icon: Layers },
    { id: 'ceo_directives' as AdminDepartment, label: lang === 'vi' ? 'CHỈ THỊ CEO' : 'DIRECTIVES', icon: Crown },
    { id: 'accounting' as AdminDepartment, label: t('admin_dept_accounting'), icon: Receipt },
    { id: 'personnel' as AdminDepartment, label: t('admin_dept_personnel'), icon: Users },
    { id: 'techops' as AdminDepartment, label: t('admin_dept_techops'), icon: Cpu },
    { id: 'agents' as AdminDepartment, label: t('admin_dept_agents'), icon: Bot },
  ];

  if (!isAuthenticated) {
    return (
      <AdminBinance3FaModal 
        adminTelegramId={telegramId}
        adminUsername={username}
        onSuccess={() => setIsAuthenticated(true)} 
      />
    );
  }

  return (
    <div className="w-full space-y-4 pb-20">
      {/* Admin Suite Master Banner */}
      <div className="spartan-card rounded-3xl p-5 border border-[#221c10] bg-[#080b12] shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#d4af37]/15 text-[#f5d77f] border border-[#d4af37]/40 flex items-center justify-center font-black text-xl shadow-[0_0_12px_rgba(212,175,55,0.25)]">
              👑
            </div>
            <div>
              <h2 className="text-base font-black text-[#f5d77f] uppercase tracking-wider flex items-center gap-1.5">
                {t('admin_command_center')}
              </h2>
              <span className="text-[10px] text-[#d4af37] font-mono font-bold block">
                {t('admin_supreme_header')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLockSession}
              className="p-2.5 rounded-2xl bg-[#05070c] border border-[#221c10] text-gray-400 hover:text-red-400 transition-colors active:scale-95"
              title={lang === 'vi' ? 'Khóa Cổng Quản Trị' : 'Lock Admin Portal'}
            >
              <Lock className="w-4 h-4" />
            </button>
            <button
              onClick={loadSystemData}
              disabled={isRefreshing}
              className="p-2.5 rounded-2xl bg-[#05070c] border border-[#221c10] text-gray-300 hover:text-white transition-colors active:scale-95"
              title={t('admin_refresh')}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#f5d77f]' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Global Status Toast */}
      {adminStatusMsg && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500 rounded-2xl text-emerald-400 text-xs font-bold flex items-center gap-2 animate-bounce">
          <ShieldCheck className="w-4 h-4 flex-shrink-0 text-emerald-400" />
          <span>{adminStatusMsg}</span>
        </div>
      )}

      {/* 6 Administrative Departments Sub-Nav Bar */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 p-1 bg-[#05070c] rounded-2xl border border-[#221c10]">
        {departments.map((dept) => {
          const Icon = dept.icon;
          const isActive = activeDept === dept.id;
          return (
            <button
              key={dept.id}
              onClick={() => setActiveDept(dept.id)}
              className={`py-2 px-1 rounded-xl text-[9px] font-black uppercase flex flex-col items-center justify-center gap-1 transition-all ${
                isActive
                  ? 'gold-btn-solid text-black shadow-md font-black scale-105'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="truncate">{dept.label}</span>
            </button>
          );
        })}
      </div>

      {/* RENDER ACTIVE DEPARTMENT */}
      {activeDept === 'overview' && (
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

      {activeDept === 'ceo_directives' && (
        <CeoDirectivesTab
          users={allUsers}
          transactions={allTransactions}
        />
      )}

      {activeDept === 'accounting' && (
        <AccountingAuditTab
          transactions={allTransactions}
          users={allUsers}
        />
      )}

      {activeDept === 'personnel' && (
        <PersonnelHrTab
          users={allUsers}
          onRefresh={loadSystemData}
        />
      )}

      {activeDept === 'techops' && (
        <TechOpsTab
          users={allUsers}
          systemConfig={systemConfig}
          onRefresh={loadSystemData}
        />
      )}

      {activeDept === 'agents' && (
        <AiAgentsCommandCenter />
      )}
    </div>
  );
};
