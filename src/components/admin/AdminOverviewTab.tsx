'use client';

import React from 'react';
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
  Loader2
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
  // Aggregate Key Metrics
  const totalTVL = users.reduce((sum, u) => sum + (u.tradingBalance || 0), 0);
  const totalResellerPool = users.reduce((sum, u) => sum + (u.referralBalance || 0), 0);
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
