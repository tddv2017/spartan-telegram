'use client';

import React, { useState } from 'react';
import { TransactionData } from '@/lib/firebaseService';
import { UserAuditItem } from '@/lib/adminService';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Send, 
  Database, 
  Activity, 
  DollarSign, 
  Users, 
  Receipt,
  Loader2,
  GitFork,
  ChevronDown,
  ChevronUp,
  Cpu
} from 'lucide-react';

interface AdminOverviewTabProps {
  pendingTxs: TransactionData[];
  transactions: TransactionData[];
  users: UserAuditItem[];
  loadingMap: Record<string, boolean>;
  onApprove: (tx: TransactionData) => void;
  onReject: (tx: TransactionData) => void;
  broadcastMsg: string;
  setBroadcastMsg: (val: string) => void;
  onBroadcast: () => void;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  pendingTxs,
  transactions,
  users,
  loadingMap,
  onApprove,
  onReject,
  broadcastMsg,
  setBroadcastMsg,
  onBroadcast,
}) => {
  const [showOrgTree, setShowOrgTree] = useState(true);

  // Aggregate Key Metrics
  const totalTVL = users.reduce((sum, u) => sum + (u.tradingBalance || 0), 0);
  const totalApprovedDeposits = transactions.filter(t => t.type === 'DEPOSIT' && t.status === 'APPROVED').length;

  return (
    <div className="space-y-4">
      {/* KPI Top Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#0b0e17] p-3.5 rounded-2xl border border-[#1f293d] space-y-1">
          <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">
            TOTAL NETWORK TVL
          </span>
          <div className="text-lg font-black text-[#00df89] font-mono">
            ${totalTVL.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
          </div>
          <span className="text-[9px] text-gray-500 font-mono block">
            Across {users.length} registered investors
          </span>
        </div>

        <div className="bg-[#0b0e17] p-3.5 rounded-2xl border border-[#1f293d] space-y-1">
          <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">
            PENDING QUEUE
          </span>
          <div className="text-lg font-black text-amber-400 font-mono">
            {pendingTxs.length} Orders
          </div>
          <span className="text-[9px] text-gray-500 font-mono block">
            {totalApprovedDeposits} completed on-chain
          </span>
        </div>
      </div>

      {/* SƠ ĐỒ CƠ CẤU TỔ CHỨC ĐƠN VỊ HÀNH CHÍNH (ORGANIZATION HIERARCHY TREE) */}
      <div className="spartan-card rounded-3xl p-5 border border-amber-500/30 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
          <div className="flex items-center gap-2">
            <GitFork className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              ORGANIZATION HIERARCHY TREE
            </h3>
          </div>
          <button
            onClick={() => setShowOrgTree(!showOrgTree)}
            className="text-[10px] font-bold text-amber-400 flex items-center gap-1 hover:opacity-80"
          >
            <span>{showOrgTree ? 'Collapse' : 'Expand View'}</span>
            {showOrgTree ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {showOrgTree && (
          <div className="space-y-4 pt-1 animate-in fade-in duration-300">
            {/* Top Node: Supreme Leader */}
            <div className="bg-gradient-to-r from-amber-500/20 via-[#131927] to-amber-500/20 border-2 border-amber-400/80 rounded-2xl p-3.5 text-center shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg">👑</span>
                <div>
                  <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider block">
                    SUPREME EXECUTIVE LEADERSHIP
                  </span>
                  <span className="text-sm font-black text-white">
                    @tddv2017 (ID: 494232782)
                  </span>
                </div>
              </div>
            </div>

            {/* Tree Branch Connector */}
            <div className="flex flex-col items-center -my-2">
              <div className="w-0.5 h-4 bg-amber-400/80"></div>
              <div className="w-4/5 h-0.5 bg-gray-700"></div>
            </div>

            {/* 3 Department Sub-Branches */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
              {/* Branch 1: Accounting */}
              <div className="bg-[#0b0e17] border border-cyan-500/40 rounded-2xl p-3 space-y-1.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-sm">💰</span>
                  <span className="text-[11px] font-black text-cyan-400 uppercase">
                    1. ACCOUNTING & AUDIT
                  </span>
                </div>
                <ul className="text-[10px] text-gray-400 space-y-1 font-medium pl-1">
                  <li>• 3-Way Invoice Reconciliation</li>
                  <li>• Deposit (9%+3$) & Withdraw (19%+5$)</li>
                  <li>• 10% Treasury Retention Fund</li>
                  <li>• F1 Reseller Commission Ledger</li>
                </ul>
              </div>

              {/* Branch 2: HR & Reseller */}
              <div className="bg-[#0b0e17] border border-purple-500/40 rounded-2xl p-3 space-y-1.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-sm">👥</span>
                  <span className="text-[11px] font-black text-purple-400 uppercase">
                    2. HR & RESELLER NETWORK
                  </span>
                </div>
                <ul className="text-[10px] text-gray-400 space-y-1 font-medium pl-1">
                  <li>• Personnel Directory (All Users)</li>
                  <li>• 10-Level Reseller Tier Matrix</li>
                  <li>• RBAC Role Assignment & Freeze</li>
                  <li>• F1 Affiliate Hierarchy Downlines</li>
                </ul>
              </div>

              {/* Branch 3: TechOps */}
              <div className="bg-[#0b0e17] border border-emerald-500/40 rounded-2xl p-3 space-y-1.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-sm">⚡</span>
                  <span className="text-[11px] font-black text-emerald-400 uppercase">
                    3. TECHOPS & BOT ENGINE
                  </span>
                </div>
                <ul className="text-[10px] text-gray-400 space-y-1 font-medium pl-1">
                  <li>• System Maintenance Mode</li>
                  <li>• Global Emergency Kill-Switch</li>
                  <li>• Per-User Individual Bot Toggle</li>
                  <li>• Exness MT5 EA & Cloud Health</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pending Transactions Realtime Approval Queue */}
      <div className="spartan-card rounded-3xl p-5 border border-[#1f293d] space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <Database className="w-4 h-4 text-amber-400" /> PENDING TRANSACTION QUEUE ({pendingTxs.length})
          </h3>
          <span className="text-[10px] text-gray-400 font-mono font-bold">
            Realtime Auto-Sync
          </span>
        </div>

        {pendingTxs.length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-500 font-bold bg-[#0b0e17] rounded-2xl border border-[#1f293d]">
            No pending transactions in queue
          </div>
        ) : (
          <div className="space-y-3">
            {pendingTxs.map((tx) => {
              const key = tx.id || tx.memoCode;
              const isProcessing = loadingMap[key] || false;
              return (
                <div
                  key={key}
                  className="p-3.5 rounded-2xl bg-[#0b0e17] border border-[#1f293d] space-y-2.5 text-xs font-mono"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${
                        tx.type === 'DEPOSIT' ? 'bg-[#00df89]/15 text-[#00df89] border-[#00df89]/30' : 'bg-[#ff2d55]/15 text-[#ff2d55] border-[#ff2d55]/30'
                      }`}>
                        {tx.type}
                      </span>
                      <span className="font-extrabold text-white">@{tx.username}</span>
                      <span className="text-[10px] text-gray-500">(ID: {tx.userId})</span>
                    </div>
                    <span className="font-black text-[#facc15] text-[10px] bg-[#facc15]/10 px-2 py-0.5 rounded border border-[#facc15]/20">
                      PENDING
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#131927] p-2.5 rounded-xl border border-[#1f293d]">
                    <div>
                      <span className="text-gray-400 block text-[9px]">GROSS AMOUNT:</span>
                      <span className="font-black text-white">${tx.grossAmount.toFixed(2)} USD</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[9px]">NET AMOUNT:</span>
                      <span className="font-black text-[#00df89]">${tx.netAmount.toFixed(2)} USD</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span>Memo: <strong className="text-amber-300">{tx.memoCode}</strong></span>
                    <span>Order: {tx.id}</span>
                  </div>

                  {/* Action Buttons: Approve vs Reject */}
                  <div className="grid grid-cols-2 gap-2 pt-1 font-sans">
                    <button
                      onClick={() => onApprove(tx)}
                      disabled={isProcessing}
                      className="py-2 rounded-xl bg-[#00df89] text-black font-black text-xs uppercase flex items-center justify-center gap-1 hover:opacity-90 transition-opacity"
                    >
                      {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>APPROVE ORDER</span>
                    </button>

                    <button
                      onClick={() => onReject(tx)}
                      disabled={isProcessing}
                      className="py-2 rounded-xl bg-[#ff2d55] text-white font-black text-xs uppercase flex items-center justify-center gap-1 hover:opacity-90 transition-opacity"
                    >
                      {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      <span>REJECT ORDER</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Emergency Broadcast Dispatcher */}
      <div className="spartan-card rounded-3xl p-5 border border-[#1f293d] space-y-3 shadow-lg">
        <div className="flex items-center gap-2 border-b border-[#1f293d] pb-2.5">
          <Send className="w-4 h-4 text-[#ff5500]" />
          <h3 className="text-xs font-black text-white uppercase tracking-wider">
            SYSTEM-WIDE BROADCAST DISPATCHER
          </h3>
        </div>

        <div>
          <textarea
            value={broadcastMsg}
            onChange={(e) => setBroadcastMsg(e.target.value)}
            rows={3}
            className="w-full bg-[#0b0e17] border border-[#1f293d] rounded-2xl p-3 text-white text-xs font-medium focus:outline-none focus:border-[#ff5500]"
            placeholder="Type announcement message to broadcast to all Telegram Mini App users..."
          />
        </div>

        <button
          onClick={onBroadcast}
          className="w-full py-3 rounded-2xl spartan-orange-btn font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          <span>DISPATCH BROADCAST NOTIFICATION</span>
        </button>
      </div>
    </div>
  );
};
