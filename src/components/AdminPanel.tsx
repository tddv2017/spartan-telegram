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

const mockClientsList: ClientUser[] = [
  { id: 1, telegramId: '9824029', name: 'Alex Trader', handle: '@alex_trader', balance: '$10,547.00', totalDeposit: '$10,000.00', totalWithdraw: '$0.00', netPnl: '+$547.00', botStatus: 'ACTIVE', joinedDate: '28/08/2026' },
  { id: 2, telegramId: '9824030', name: 'Crypto King', handle: '@crypto_king', balance: '$25,815.00', totalDeposit: '$20,000.00', totalWithdraw: '$1,500.00', netPnl: '+$7,315.00', botStatus: 'ACTIVE', joinedDate: '24/08/2026' },
  { id: 3, telegramId: '9824031', name: 'Bình Investor', handle: '@binh_investor', balance: '$5,200.00', totalDeposit: '$5,000.00', totalWithdraw: '$0.00', netPnl: '+$200.00', botStatus: 'ACTIVE', joinedDate: '27/08/2026' },
  { id: 4, telegramId: '9824032', name: 'Hoàng Gold', handle: '@hoang_gold', balance: '$8,400.00', totalDeposit: '$8,000.00', totalWithdraw: '$500.00', netPnl: '+$900.00', botStatus: 'STOPPED', joinedDate: '25/08/2026' },
  { id: 5, telegramId: '9824033', name: 'Minh Quân', handle: '@minh_quan', balance: '$2,100.00', totalDeposit: '$2,000.00', totalWithdraw: '$0.00', netPnl: '+$100.00', botStatus: 'ACTIVE', joinedDate: '22/08/2026' },
];

export const AdminPanel: React.FC = () => {
  const [livePendingList, setLivePendingList] = useState<TransactionData[]>([]);
  const [clients, setClients] = useState<ClientUser[]>(mockClientsList);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'STOPPED'>('ALL');
  const [masterActive, setMasterActive] = useState(true);
  const [broadcastText, setBroadcastText] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientUser | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Firestore Realtime Listener for Pending Queue
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
      // Execute live approval in Firestore
      await approveLiveTransaction(tx.id, 'tddv2017');

      setNotification(`Đã PHÊ DUYỆT thành công lệnh ${tx.type} $${tx.netAmount.toFixed(2)} USDT cho user ${tx.username}! Số dư trên Firestore đã được cập nhật tự động!`);
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      console.error('Firestore approval error:', err);
      alert('Lỗi phê duyệt giao dịch trên Firestore!');
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
                BẢNG QUẢN TRỊ ADMIN (FIRESTORE REALTIME)
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

      {/* Admin KPI Overview Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Master Pool Balance */}
        <div className="spartan-card rounded-2xl p-4 border border-[#1f293d]">
          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-0.5">
            TỔNG VỐN QUỸ MASTER EXNESS
          </span>
          <div className="text-lg font-black text-white">$7,463,215.57</div>
          <span className="text-[9px] text-[#00df89] font-bold block mt-0.5">Firestore Live Database</span>
        </div>

        {/* Total Revenue from Fees (9% + $3/$5) */}
        <div className="spartan-card rounded-2xl p-4 border border-[#1f293d]">
          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-0.5">
            DOANH THU THU PHÍ (9%+$3/$5)
          </span>
          <div className="text-lg font-black text-[#facc15]">+$18,800.00</div>
          <span className="text-[9px] text-amber-400 font-bold block mt-0.5">Đút Túi Ròng Admin</span>
        </div>
      </div>

      {/* PENDING WITHDRAWAL & DEPOSIT APPROVAL QUEUE (Duyệt Lệnh Live Firestore) */}
      <div className="spartan-card rounded-3xl p-4 border border-[#1f293d] space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <ArrowUpRight className="w-4 h-4 text-[#facc15]" /> HÀNG ĐỢI DUYỆT FIRESTORE (REALTIME QUEUE)
          </h3>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#facc15]/15 text-[#facc15] border border-[#facc15]/30">
            {livePendingList.length} Yêu Cầu Chờ Duyệt
          </span>
        </div>

        {livePendingList.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-500 font-medium bg-[#0b0e17] rounded-2xl">
            🎉 Không có yêu cầu nạp/rút nào đang chờ duyệt trên Firestore miniapp-spartan!
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
                    <span>XÁC NHẬN PHÊ DUYỆT & CỘNG VỐN FIRESTORE</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CLIENT MANAGEMENT TABLE (DANH SÁCH KHÁCH HÀNG) */}
      <div className="spartan-card rounded-3xl p-4 border border-[#1f293d] space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#ff5500]" /> QUẢN LÝ DANH SÁCH KHÁCH HÀNG
          </h3>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#00df89]/15 text-[#00df89] border border-[#00df89]/30">
            {filteredClients.length} Khách Hàng
          </span>
        </div>

        {/* Search & Status Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0b0e17] border border-[#1f293d] rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#ff5500]"
              placeholder="Tìm kiếm tên, @username, Telegram ID..."
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
          </div>

          <div className="flex gap-1 text-[10px] font-bold">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-xl transition-colors ${
                statusFilter === 'ALL' ? 'bg-[#ff5500] text-white' : 'bg-[#0b0e17] text-gray-400 border border-[#1f293d]'
              }`}
            >
              Tất Cả
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-2.5 py-1 rounded-xl transition-colors ${
                statusFilter === 'ACTIVE' ? 'bg-[#00df89] text-black' : 'bg-[#0b0e17] text-gray-400 border border-[#1f293d]'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('STOPPED')}
              className={`px-2.5 py-1 rounded-xl transition-colors ${
                statusFilter === 'STOPPED' ? 'bg-red-500 text-white' : 'bg-[#0b0e17] text-gray-400 border border-[#1f293d]'
              }`}
            >
              Stopped
            </button>
          </div>
        </div>

        {/* Clients Directory List */}
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="bg-[#0b0e17] rounded-2xl p-3 border border-[#1f293d] hover:border-gray-700 transition-colors space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#ff5500]/15 border border-[#ff5500]/30 flex items-center justify-center font-black text-[#ff5500] text-xs">
                    #{client.id}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-white">{client.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{client.handle}</span>
                    </div>
                    <span className="text-[9px] text-gray-500 font-mono block">
                      ID: {client.telegramId} • Ngày tham gia: {client.joinedDate}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-black text-xs text-white block">
                    {client.balance}
                  </span>
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.5 rounded inline-block mt-0.5 ${
                      client.botStatus === 'ACTIVE'
                        ? 'bg-[#00df89]/20 text-[#00df89] border border-[#00df89]/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {client.botStatus}
                  </span>
                </div>
              </div>

              {/* Client Details Footer & Admin Controls */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-900 text-[10px]">
                <span className="text-gray-400">
                  Tổng Nạp: <strong className="text-[#00df89]">{client.totalDeposit}</strong>
                </span>
                <div className="flex gap-1.5">
                  <button 
                    onClick={() => setSelectedClient(client)}
                    className="px-2.5 py-1 rounded-lg bg-[#ff5500]/20 hover:bg-[#ff5500]/30 text-[#ff5500] font-bold flex items-center gap-1 border border-[#ff5500]/30 transition-colors"
                  >
                    <Eye className="w-3 h-3" /> Chi Tiết
                  </button>
                  <button 
                    onClick={() => handleToggleClientStatus(client.id)}
                    className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold flex items-center gap-1 transition-colors"
                  >
                    <Edit3 className="w-3 h-3" /> Đổi Trạng Thái
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
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
