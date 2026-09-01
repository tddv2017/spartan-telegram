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
      console.error('Error loading admin data:', err);
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
        setAdminStatusMsg(`✅ APPROVED order ${txId} (+${tx.netAmount.toFixed(2)} USDT) for @${tx.username}!`);
        loadSystemData();
      } else {
        setAdminStatusMsg(`⚠️ ${res.message}`);
      }
      setTimeout(() => setAdminStatusMsg(null), 5000);
    } catch (err) {
      console.error('Approve error:', err);
      setAdminStatusMsg(`❌ Error approving order ${txId}!`);
    } finally {
      setLoadingMap(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleReject = async (tx: TransactionData) => {
    const key = tx.id || tx.memoCode;
    const txId = tx.id || tx.memoCode;
    setLoadingMap(prev => ({ ...prev, [key]: true }));
    try {
      const res = await rejectLiveTransaction(txId, 'tddv2017', 'Rejected by Admin');
      if (res.success) {
        setAdminStatusMsg(`🚫 REJECTED order ${txId} for user @${tx.username}!`);
        loadSystemData();
      } else {
        setAdminStatusMsg(`⚠️ ${res.message}`);
      }
      setTimeout(() => setAdminStatusMsg(null), 5000);
    } catch (err) {
      console.error('Reject error:', err);
      setAdminStatusMsg(`❌ Error rejecting order ${txId}!`);
    } finally {
      setLoadingMap(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleBroadcast = () => {
    if (!broadcastMsg.trim()) return;
    alert(`📢 DISPATCHED BROADCAST MESSAGE TO ALL USERS:\n\n"${broadcastMsg}"`);
    setBroadcastMsg('');
  };

  const departments = [
    { id: 'overview' as AdminDepartment, label: 'OVERVIEW', icon: Layers },
    { id: 'accounting' as AdminDepartment, label: 'ACCOUNTING', icon: Receipt },
    { id: 'personnel' as AdminDepartment, label: 'HR', icon: Users },
    { id: 'techops' as AdminDepartment, label: 'TECH OPS', icon: Cpu },
    { id: 'agents' as AdminDepartment, label: 'AI AGENTS', icon: Bot },
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
                ADMIN MASTER SUITE
              </h2>
              <span className="text-[10px] text-amber-400 font-mono font-bold block">
                Supreme Executive: @tddv2017 (ID: 494232782)
              </span>
            </div>
          </div>

          <button
            onClick={loadSystemData}
            disabled={isRefreshing}
            className="p-2.5 rounded-2xl bg-[#0b0e17] border border-[#1f293d] text-gray-300 hover:text-white transition-colors"
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
