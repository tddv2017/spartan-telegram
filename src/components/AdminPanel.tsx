'use client';

import React, { useState, useEffect } from 'react';
import { 
  createLiveTransaction, 
  approveLiveTransaction, 
  rejectLiveTransaction, 
  subscribeToPendingTransactions,
  TransactionData
} from '@/lib/firebaseService';
import { checkIsAdmin } from '@/lib/adminAuth';
import { ShieldCheck, CheckCircle2, XCircle, RefreshCw, Zap, AlertTriangle, Send, Activity, Lock, Unlock, Database } from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const [pendingTxs, setPendingTxs] = useState<TransactionData[]>([]);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [adminStatusMsg, setAdminStatusMsg] = useState<string | null>(null);
  const [masterSwitch, setMasterSwitch] = useState<boolean>(true);
  const [broadcastMsg, setBroadcastMsg] = useState<string>('');

  // Realtime subscription for pending deposits/withdrawals across all users
  useEffect(() => {
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

  return (
    <div className="w-full space-y-4 pb-20">
      {/* Admin Panel Header */}
      <div className="spartan-card rounded-3xl p-5 border border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-black">
              👑
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider">
                ADMIN MASTER CONTROL CONSOLE
              </h2>
              <span className="text-[10px] text-amber-400 font-mono font-bold block">
                Exclusive Authorization: @tddv2017 (ID: 494232782)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Toast Status Banner */}
      {adminStatusMsg && (
        <div className="p-3 bg-amber-500/20 border border-amber-500 rounded-2xl text-amber-300 text-xs font-bold flex items-center gap-2 animate-bounce">
          <ShieldCheck className="w-4 h-4 flex-shrink-0 text-amber-400" />
          <span>{adminStatusMsg}</span>
        </div>
      )}

      {/* System Emergency Master Switch Card */}
      <div className="spartan-card rounded-3xl p-5 border border-[#1f293d] space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
          <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-[#ff5500]" /> SYSTEM MASTER SWITCH (EMERGENCY BOT STOP)
          </span>
          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
            masterSwitch ? 'bg-[#00df89]/15 text-[#00df89] border-[#00df89]/30' : 'bg-red-500/15 text-red-400 border-red-500/30'
          }`}>
            {masterSwitch ? 'SYSTEM ONLINE' : 'SYSTEM PAUSED'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 font-bold">
            Master CopyTrade Execution Engine:
          </span>
          <button
            onClick={() => setMasterSwitch(!masterSwitch)}
            className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all ${
              masterSwitch 
                ? 'bg-[#00df89] text-black shadow-[0_0_15px_rgba(0,223,137,0.4)]' 
                : 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]'
            }`}
          >
            {masterSwitch ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            <span>{masterSwitch ? 'RUNNING ONLINE' : 'EMERGENCY PAUSE'}</span>
          </button>
        </div>
      </div>

      {/* Pending Transactions Realtime Approval Queue */}
      <div className="spartan-card rounded-3xl p-5 border border-[#1f293d] space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <Database className="w-4 h-4 text-amber-400" /> PENDING TRANSACTION QUEUE ({pendingTxs.length})
          </h3>
          <span className="text-[10px] text-gray-400 font-mono font-bold">
            Firebase Realtime Sync
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
                  className="p-3.5 rounded-2xl bg-[#0b0e17] border border-[#1f293d] space-y-2.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${
                        tx.type === 'DEPOSIT' ? 'bg-[#00df89]/15 text-[#00df89] border-[#00df89]/30' : 'bg-[#ff2d55]/15 text-[#ff2d55] border-[#ff2d55]/30'
                      }`}>
                        {tx.type}
                      </span>
                      <span className="font-extrabold text-white">@{tx.username}</span>
                      <span className="text-[10px] font-mono text-gray-500">(ID: {tx.userId})</span>
                    </div>
                    <span className="font-mono font-black text-[#facc15] text-[10px] bg-[#facc15]/10 px-2 py-0.5 rounded border border-[#facc15]/20">
                      PENDING
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#131927] p-2.5 rounded-xl border border-[#1f293d] font-mono">
                    <div>
                      <span className="text-gray-400 block text-[9px]">GROSS AMOUNT:</span>
                      <span className="font-black text-white">${tx.grossAmount.toFixed(2)} USD</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[9px]">NET CREDIT/DEBIT:</span>
                      <span className="font-black text-[#00df89]">${tx.netAmount.toFixed(2)} USD</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                    <span>Memo: <strong className="text-amber-300">{tx.memoCode}</strong></span>
                    <span>Order: {tx.id}</span>
                  </div>

                  {/* Action Buttons: Approve vs Reject */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => handleApprove(tx)}
                      disabled={isProcessing}
                      className="py-2 rounded-xl bg-[#00df89] text-black font-black text-xs uppercase flex items-center justify-center gap-1 hover:opacity-90 transition-opacity"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>APPROVE ORDER</span>
                    </button>

                    <button
                      onClick={() => handleReject(tx)}
                      disabled={isProcessing}
                      className="py-2 rounded-xl bg-[#ff2d55] text-white font-black text-xs uppercase flex items-center justify-center gap-1 hover:opacity-90 transition-opacity"
                    >
                      <XCircle className="w-3.5 h-3.5" />
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
            placeholder="Type notification text to dispatch to all active Telegram Mini App users..."
          />
        </div>

        <button
          onClick={handleBroadcast}
          className="w-full py-3 rounded-2xl spartan-orange-btn font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          <span>DISPATCH BROADCAST NOTIFICATION</span>
        </button>
      </div>
    </div>
  );
};
