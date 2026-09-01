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
import { 
  ShieldCheck, 
  Layers, 
  Receipt, 
  Users, 
  Cpu, 
  RefreshCw,
  Crown,
  Bot
} from 'lucide-react';

type AdminDepartment = 'overview' | 'accounting' | 'personnel' | 'techops' | 'agents';

export const AdminPanel: React.FC = () => {
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
    { id: 'overview' as AdminDepartment, label: 'TỔNG QUAN', icon: Layers },
    { id: 'accounting' as AdminDepartment, label: 'KẾ TOÁN', icon: Receipt },
    { id: 'personnel' as AdminDepartment, label: 'NHÂN SỰ & F1', icon: Users },
    { id: 'techops' as AdminDepartment, label: 'KỸ THUẬT', icon: Cpu },
    { id: 'agents' as AdminDepartment, label: 'AI AGENT', icon: Bot },
  ];

  return (
    <div className="w-full space-y-4 pb-20">
      {/* Admin Suite Master Banner */}
      <div className="spartan-card rounded-3xl p-5 border border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-black text-xl shadow-md">
              👑
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                TRUNG TÂM ĐIỀU HÀNH QUẢN TRỊ
              </h2>
              <span className="text-[10px] text-amber-400 font-mono font-bold block">
                Ban Quản Trị Tối Cao: @tddv2017 (ID: 494232782)
              </span>
            </div>
          </div>

          <button
            onClick={loadSystemData}
            disabled={isRefreshing}
            className="p-2.5 rounded-2xl bg-[#0b0e17] border border-[#1f293d] text-gray-300 hover:text-white transition-colors"
            title="Làm mới dữ liệu hệ thống"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Global Status Toast */}
      {adminStatusMsg && (
        <div className="p-3 bg-amber-500/20 border border-amber-500 rounded-2xl text-amber-300 text-xs font-bold flex items-center gap-2 animate-bounce">
          <ShieldCheck className="w-4 h-4 flex-shrink-0 text-amber-400" />
          <span>{adminStatusMsg}</span>
        </div>
      )}

      {/* 5 Administrative Departments Sub-Nav Bar */}
      <div className="grid grid-cols-5 p-1 bg-[#0b0e17] rounded-2xl border border-[#1f293d]">
        {departments.map((dept) => {
          const Icon = dept.icon;
          const isActive = activeDept === dept.id;
          return (
            <button
              key={dept.id}
              onClick={() => setActiveDept(dept.id)}
              className={`py-2 px-1 rounded-xl text-[9px] font-black uppercase flex flex-col items-center justify-center gap-1 transition-all ${
                isActive
                  ? 'bg-amber-500 text-black shadow-md font-black'
                  : 'text-gray-400 hover:text-white'
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
