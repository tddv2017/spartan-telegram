'use client';

import React, { useState, useEffect } from 'react';
import { 
  subscribeToPendingTransactions, 
  approveLiveTransaction, 
  TransactionData 
} from '@/lib/firebaseService';
import { ShieldAlert, CheckCircle2, XCircle, Users, DollarSign, ArrowUpRight, Radio, AlertTriangle, Send, Search, Eye, Edit3, Filter, X, ArrowDown, Clock, ShieldCheck, Loader2 } from 'lucide-react';

interface ClientUser {
  id: number;
  telegramId: string;
  name: string;
  handle: string;
  balance: string;
  totalDeposit: string;
  totalWithdraw: string;
  netPnl: string;
  botStatus: 'ACTIVE' | 'STOPPED';
  joinedDate: string;
}

export const AdminPanel: React.FC = () => {
  const [livePendingList, setLivePendingList] = useState<TransactionData[]>([]);
  const [clients, setClients] = useState<ClientUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'STOPPED'>('ALL');
  const [masterActive, setMasterActive] = useState(true);
  const [broadcastText, setBroadcastText] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientUser | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Firestore & RTDB Realtime Listener for Pending Queue
  useEffect(() => {
    const unsubscribe = subscribeToPendingTransactions((txs) => {
      setLivePendingList(txs);
    });
    return () => unsubscribe();
  }, []);

  const filteredClients = clients.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.telegramId.includes(searchQuery);
    const matchesStatus = statusFilter === 'ALL' || c.botStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleApproveLive = async (tx: TransactionData) => {
    if (!tx.id) return;
    setProcessingId(tx.id);

    try {
      // Execute live approval in Firestore and RTDB
      await approveLiveTransaction(tx.id, 'tddv2017');

      setNotification(`Đã PHÊ DUYỆT thành công lệnh ${tx.type} $${tx.netAmount.toFixed(2)} USDT cho user ${tx.username}! Số dư đã được cập nhật tự động!`);
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      console.error('Approval error:', err);
      alert('Lỗi phê duyệt giao dịch trên Firebase!');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSendBroadcast = () => {
    if (!broadcastText.trim()) return;
    setNotification(`Đã gửi thông báo Broadcast khẩn cấp tới tất cả Telegram clients!`);
    setBroadcastText('');
    setTimeout(() => setNotification(null), 4000);
  };

  const handleToggleClientStatus = (clientId: number) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId
          ? { ...c, botStatus: c.botStatus === 'ACTIVE' ? 'STOPPED' : 'ACTIVE' }
          : c
      )
    );
    if (selectedClient && selectedClient.id === clientId) {
      setSelectedClient((prev) =>
        prev
          ? { ...prev, botStatus: prev.botStatus === 'ACTIVE' ? 'STOPPED' : 'ACTIVE' }
          : null
      );
    }
    setNotification(`Đã thay đổi trạng thái Bot cho khách hàng!`);
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="w-full space-y-4 pb-20">
      {/* Admin Privilege Header */}
      <div className="spartan-purple-gradient rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-black/40 border border-white/30 flex items-center justify-center font-black text-[#facc15] text-lg">
              🛡️
            </div>
            <div>
              <span className="text-[10px] font-black text-amber-300 uppercase tracking-widest block leading-none">
                BẢNG QUẢN TRỊ ADMIN (FIREBASE REALTIME)
              </span>
              <h2 className="text-base font-black text-white tracking-tight flex items-center gap-1.5 mt-0.5">
                ADMIN ACCESS: <span className="text-[#facc15] font-mono">@tddv2017</span>
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Notification Banner */}
      {notification && (
        <div className="bg-[#00df89]/20 border border-[#00df89] p-3 rounded-2xl text-xs font-bold text-[#00df89] flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* PENDING WITHDRAWAL & DEPOSIT APPROVAL QUEUE (Duyệt Lệnh Live Firebase) */}
      <div className="spartan-card rounded-3xl p-4 border border-[#1f293d] space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <ArrowUpRight className="w-4 h-4 text-[#facc15]" /> HÀNG ĐỢI DUYỆT FIREBASE (REALTIME QUEUE)
          </h3>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#facc15]/15 text-[#facc15] border border-[#facc15]/30">
            {livePendingList.length} Yêu Cầu Chờ Duyệt
          </span>
        </div>

        {livePendingList.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-500 font-medium bg-[#0b0e17] rounded-2xl">
            🎉 Không có yêu cầu nạp/rút nào đang chờ duyệt trên Firebase!
          </div>
        ) : (
          <div className="space-y-3">
            {livePendingList.map((item) => (
              <div
                key={item.id}
                className="bg-[#0b0e17] rounded-2xl p-3.5 border border-[#1f293d] space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-white text-sm">@{item.username}</span>
                    <span className="text-[9px] text-[#facc15] font-mono bg-[#facc15]/10 px-1.5 py-0.5 rounded border border-[#facc15]/20">
                      Memo: {item.memoCode}
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-[#00df89]">
                    {item.type === 'DEPOSIT' ? 'YÊU CẦU NẠP TIỀN' : 'YÊU CẦU RÚT TIỀN'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-[#131927] p-2 rounded-xl text-[11px] font-mono">
                  <div>
                    <span className="text-[9px] text-gray-400 block">Số tiền Gross:</span>
                    <strong className="text-white">${item.grossAmount.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-red-400 block">Phí Khấu Trừ:</span>
                    <strong className="text-red-400">-${item.feeAmount.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#00df89] block">Số tiền Net:</span>
                    <strong className="text-[#00df89]">${item.netAmount.toFixed(2)}</strong>
                  </div>
                </div>

                {/* Approve Action Button */}
                <div className="pt-1">
                  <button
                    onClick={() => handleApproveLive(item)}
                    disabled={processingId === item.id}
                    className="w-full py-2.5 rounded-xl bg-[#00df89] text-black font-black text-xs flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
                  >
                    {processingId === item.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>XÁC NHẬN PHÊ DUYỆT & CỘNG VỐN FIREBASE</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MASTER SYSTEM CONTROLS (Công Tắc Khẩn Cấp) */}
      <div className="spartan-card rounded-3xl p-4 border border-[#1f293d] space-y-3 shadow-lg">
        <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
          <Radio className="w-4 h-4 text-[#ff5500]" /> CÔNG TẮC ĐIỀU HÀNH KHẨN CẤP (SYSTEM MASTER SWITCH)
        </h3>

        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0b0e17] border border-[#1f293d]">
          <div>
            <span className="text-xs font-extrabold text-white block">Trạng Thái Master Copy Trade</span>
            <span className="text-[10px] text-gray-400">
              {masterActive ? 'Tất cả Client đang nhận lệnh Copy' : 'Đã TẠM DỪNG phát lệnh Copy'}
            </span>
          </div>
          <button
            onClick={() => setMasterActive(!masterActive)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              masterActive
                ? 'bg-[#00df89] text-black shadow-[0_0_10px_rgba(0,223,137,0.4)]'
                : 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]'
            }`}
          >
            {masterActive ? 'BẬT (ACTIVE)' : 'TẮT (PAUSED)'}
          </button>
        </div>

        {/* Broadcast System Input */}
        <div className="pt-2">
          <label className="text-xs font-bold text-gray-300 block mb-1.5">
            Bắn Thông Báo Khẩn Cấp Tới Telegram Clients (Telegram Broadcast)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              className="flex-1 bg-[#0b0e17] border border-[#1f293d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5500]"
              placeholder="Nhập nội dung thông báo cho tất cả người dùng..."
            />
            <button
              onClick={handleSendBroadcast}
              className="px-4 py-2 bg-[#ff5500] text-[#ffffff] font-black text-xs rounded-xl flex items-center gap-1 hover:opacity-90"
            >
              <Send className="w-3.5 h-3.5" /> GỬI
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
