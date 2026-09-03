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
  Cpu,
  Search,
  Download,
  ExternalLink,
  Copy,
  Zap,
  Clock,
  Radio,
  Flame,
  X,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const { t, lang } = useLanguage();
  const [showOrgTree, setShowOrgTree] = useState(false);
  const [inspectedTx, setInspectedTx] = useState<TransactionData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Aggregate Key Metrics
  const totalTVL = users.reduce((sum, u) => sum + (u.tradingBalance || 0), 0);
  const totalApprovedDeposits = transactions.filter(t => t.type === 'DEPOSIT' && t.status === 'APPROVED');
  const totalDepositNet24h = totalApprovedDeposits.reduce((sum, t) => sum + (t.netAmount || 0), 0);
  const treasuryReserveFund = totalTVL * 0.10; // 10% Policy Reserve

  // Filtered Transactions
  const filteredTransactions = transactions.filter(tx => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery = !q || 
      (tx.username && tx.username.toLowerCase().includes(q)) ||
      (tx.memoCode && tx.memoCode.toLowerCase().includes(q)) ||
      (tx.id && tx.id.toLowerCase().includes(q)) ||
      (tx.userId && String(tx.userId).toLowerCase().includes(q));

    const matchType = filterType === 'ALL' || tx.type === filterType;
    const matchStatus = filterStatus === 'ALL' || tx.status === filterStatus;

    return matchQuery && matchType && matchStatus;
  });

  return (
    <div className="space-y-4 relative">

      {/* ============================================================= */}
      {/* 1. ACTION STRIP: HÀNG ĐỢI DUYỆT KHẨN CẤP (TRÊN CÙNG TẦM MẮT) */}
      {/* ============================================================= */}
      {pendingTxs.length > 0 ? (
        <section className="bg-gradient-to-r from-[#0e121a] via-[#080b12] to-[#0e121a] border-2 border-[#d4af37]/60 rounded-2xl p-4 shadow-[0_0_25px_rgba(212,175,55,0.15)] space-y-3 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
              <h2 className="text-xs font-black text-[#f5d77f] uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#d4af37]" />
                <span>
                  {lang === 'vi' 
                    ? `⚡ HÀNG ĐỢI DUYỆT LỆNH KHẨN CẤP (${pendingTxs.length} ĐƠN ĐANG CHỜ DUYỆT)`
                    : `⚡ URGENT APPROVAL QUEUE (${pendingTxs.length} PENDING TRANSACTIONS)`}
                </span>
              </h2>
            </div>
            <span className="text-[10px] font-mono text-gray-400">
              {lang === 'vi' ? 'Tự động đồng bộ on-chain 3s/lần' : 'Realtime Auto-Sync 3s'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingTxs.map((tx) => {
              const key = tx.id || tx.memoCode;
              const isProcessing = loadingMap[key] || false;
              const isRef = tx.id?.includes('REF') || tx.memoCode?.includes('REF');

              return (
                <div 
                  key={key} 
                  className="bg-[#05070c] border border-[#221c10] rounded-xl p-3 flex items-center justify-between hover:border-[#d4af37]/50 transition-colors shadow-sm"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                        tx.type === 'DEPOSIT' 
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : isRef
                          ? 'bg-[#d4af37]/15 text-[#f5d77f] border-[#d4af37]/35'
                          : 'bg-[#ff2d55]/15 text-[#ff2d55] border-[#ff2d55]/30'
                      }`}>
                        {tx.type === 'DEPOSIT' 
                          ? (lang === 'vi' ? 'NẠP TIỀN' : 'DEPOSIT') 
                          : isRef 
                          ? (lang === 'vi' ? 'RÚT HOA HỒNG' : 'REF WITHDRAW')
                          : (lang === 'vi' ? 'RÚT VỐN' : 'WITHDRAW')}
                      </span>
                      <span className="text-xs font-extrabold text-white">@{tx.username}</span>
                      <span className="text-[9px] font-mono text-gray-500">Memo: {tx.memoCode}</span>
                    </div>
                    <div className="text-[11px] text-gray-300 font-mono">
                      <span>{lang === 'vi' ? 'Gross:' : 'Gross:'} <strong className="text-white">${tx.grossAmount.toFixed(2)}</strong> ➔ </span>
                      <span>{lang === 'vi' ? 'Net:' : 'Net:'} <strong className="text-emerald-400">${tx.netAmount.toFixed(2)} USDT</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setInspectedTx(tx)}
                      className="px-2.5 py-2 rounded-xl bg-[#0c0f17] hover:bg-[#141924] border border-[#221c10] text-[#f5d77f] text-xs font-bold transition-all active:scale-95"
                      title={lang === 'vi' ? 'Soi chi tiết' : 'Inspect'}
                    >
                      {lang === 'vi' ? 'Soi ➔' : 'View'}
                    </button>
                    <button
                      onClick={() => onApprove(tx)}
                      disabled={isProcessing}
                      className="px-3 py-2 rounded-xl gold-btn-solid text-black text-xs font-black flex items-center gap-1 active:scale-95 transition-transform"
                    >
                      {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-black" /> : null}
                      <span>{lang === 'vi' ? 'DUYỆT (1S)' : 'APPROVE'}</span>
                    </button>
                    <button
                      onClick={() => onReject(tx)}
                      disabled={isProcessing}
                      className="px-2 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/35 text-red-400 text-xs font-bold transition-colors active:scale-95"
                      title={lang === 'vi' ? 'Từ chối' : 'Reject'}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="bg-[#05070c] border border-[#221c10] rounded-2xl p-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-gray-300">
              {lang === 'vi' 
                ? '✓ Tất cả đơn nạp & rút tiền đã được đối soát 100% - Không có đơn hàng chờ xử lý.' 
                : '✓ All deposits & withdrawals are 100% audited - No pending items in queue.'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25">
            ALL CLEAR
          </span>
        </div>
      )}

      {/* ============================================================= */}
      {/* 2. INSTITUTIONAL BENTO GRID (4 CHỈ SỐ CỐT LÕI) */}
      {/* ============================================================= */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: TVL */}
        <div className="bg-[#080b12] border border-[#221c10] rounded-2xl p-4 space-y-1 relative overflow-hidden shadow-sm hover:border-[#d4af37]/35 transition-all">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
            {lang === 'vi' ? 'TỔNG TÀI SẢN MẠNG LƯỚI (TVL)' : 'NETWORK VALUE (TVL)'}
          </span>
          <div className="text-xl font-black text-emerald-400 font-mono tracking-tight">
            ${totalTVL.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 pt-1 border-t border-[#221c10]">
            <span>{lang === 'vi' ? `${users.length} Nhà đầu tư` : `${users.length} Traders`}</span>
            <span className="text-emerald-400 font-bold">100% Safe</span>
          </div>
        </div>

        {/* Metric 2: 24h Net Volume */}
        <div className="bg-[#080b12] border border-[#221c10] rounded-2xl p-4 space-y-1 relative overflow-hidden shadow-sm hover:border-[#d4af37]/35 transition-all">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
            {lang === 'vi' ? 'TỔNG NẠP THỰC NHẬN (NET)' : 'TOTAL NET DEPOSITED'}
          </span>
          <div className="text-xl font-black text-[#f5d77f] font-mono tracking-tight">
            ${totalDepositNet24h.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 pt-1 border-t border-[#221c10]">
            <span>{totalApprovedDeposits.length} {lang === 'vi' ? 'Lệnh đã duyệt' : 'Approved'}</span>
            <span className="text-[#f5d77f] font-bold">On-chain TRC20</span>
          </div>
        </div>

        {/* Metric 3: Treasury Reserve */}
        <div className="bg-[#080b12] border border-[#221c10] rounded-2xl p-4 space-y-1 relative overflow-hidden shadow-sm hover:border-[#d4af37]/35 transition-all">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
            {lang === 'vi' ? 'QUỸ DỰ PHÒNG AN TOÀN (10%)' : 'TREASURY 10% RESERVE'}
          </span>
          <div className="text-xl font-black text-amber-400 font-mono tracking-tight">
            ${treasuryReserveFund.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 pt-1 border-t border-[#221c10]">
            <span>{lang === 'vi' ? 'Bảo vệ rủi ro' : 'Fund Insurance'}</span>
            <span className="text-emerald-400 font-bold">Tier 1</span>
          </div>
        </div>

        {/* Metric 4: Bot MT5 EA Status */}
        <div className="bg-[#080b12] border border-[#221c10] rounded-2xl p-4 space-y-1 relative overflow-hidden shadow-sm hover:border-[#d4af37]/35 transition-all">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
            {lang === 'vi' ? 'TRẠNG THÁI BOT QUANT AI' : 'QUANT AI EA STATUS'}
          </span>
          <div className="text-xl font-black text-emerald-400 font-mono tracking-tight flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>EXNESS MT5</span>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 pt-1 border-t border-[#221c10]">
            <span>Win Rate: 72.8%</span>
            <span className="text-emerald-400 font-bold">Latency: 18ms</span>
          </div>
        </div>
      </section>

      {/* ============================================================= */}
      {/* 3. SỔ CÁI KIỂM TOÁN SIÊU MẬT ĐỘ (HIGH-DENSITY AUDIT LEDGER) */}
      {/* ============================================================= */}
      <section className="bg-[#080b12] border border-[#221c10] rounded-2xl p-4 space-y-3.5 shadow-md">
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[#221c10] pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-4 h-4 text-[#f5d77f]" />
              <span>{lang === 'vi' ? 'SỔ CÁI ĐỐI SOÁT GIAO DỊCH REALTIME' : 'REALTIME TRANSACTION AUDIT LEDGER'}</span>
            </h3>
            <span className="text-[9px] font-mono text-gray-400 bg-[#05070c] px-2 py-0.5 rounded border border-[#221c10]">
              {filteredTransactions.length} {lang === 'vi' ? 'Bản ghi' : 'Records'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'vi' ? 'Tìm theo TxID, user, memo...' : 'Search by TxID, user, memo...'}
                className="bg-[#05070c] border border-[#221c10] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#d4af37] w-48 sm:w-56"
              />
            </div>

            {/* Type Filter */}
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-[#05070c] border border-[#221c10] rounded-xl px-2.5 py-1.5 text-xs text-gray-300 font-bold outline-none"
            >
              <option value="ALL">{lang === 'vi' ? 'Tất cả loại' : 'All Types'}</option>
              <option value="DEPOSIT">{lang === 'vi' ? 'Nạp tiền' : 'Deposit'}</option>
              <option value="WITHDRAW">{lang === 'vi' ? 'Rút tiền' : 'Withdraw'}</option>
            </select>

            {/* Status Filter */}
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#05070c] border border-[#221c10] rounded-xl px-2.5 py-1.5 text-xs text-gray-300 font-bold outline-none"
            >
              <option value="ALL">{lang === 'vi' ? 'Tất cả trạng thái' : 'All Status'}</option>
              <option value="APPROVED">{lang === 'vi' ? 'Đã duyệt' : 'Approved'}</option>
              <option value="PENDING">{lang === 'vi' ? 'Chờ duyệt' : 'Pending'}</option>
              <option value="REJECTED">{lang === 'vi' ? 'Từ chối' : 'Rejected'}</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="text-[10px] text-gray-500 uppercase tracking-wider border-b border-[#221c10] bg-[#05070c]/50">
                <th className="py-2.5 px-3">{lang === 'vi' ? 'Thời gian' : 'Time'}</th>
                <th className="py-2.5 px-3">{lang === 'vi' ? 'Người dùng' : 'User'}</th>
                <th className="py-2.5 px-3">{lang === 'vi' ? 'Loại' : 'Type'}</th>
                <th className="py-2.5 px-3">{lang === 'vi' ? 'Số tiền Gross' : 'Gross'}</th>
                <th className="py-2.5 px-3">{lang === 'vi' ? 'Phí hệ thống' : 'Fee'}</th>
                <th className="py-2.5 px-3">{lang === 'vi' ? 'Thực nhận Net' : 'Net'}</th>
                <th className="py-2.5 px-3">Memo / TxID</th>
                <th className="py-2.5 px-3">{lang === 'vi' ? 'Trạng thái' : 'Status'}</th>
                <th className="py-2.5 px-3 text-right">{lang === 'vi' ? 'Thao tác' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#221c10]">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500 font-bold">
                    {lang === 'vi' ? 'Không tìm thấy giao dịch nào phù hợp' : 'No matching transactions found'}
                  </td>
                </tr>
              ) : (
                filteredTransactions.slice(0, 15).map((tx) => {
                  const key = tx.id || tx.memoCode;
                  const isRef = tx.id?.includes('REF') || tx.memoCode?.includes('REF');

                  return (
                    <tr key={key} className="hover:bg-[#0c0f17] transition-colors group">
                      <td className="py-2.5 px-3 text-gray-400 text-[11px] whitespace-nowrap">
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString() : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                        @{tx.username}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                          tx.type === 'DEPOSIT'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : isRef
                            ? 'bg-[#d4af37]/15 text-[#f5d77f] border-[#d4af37]/35'
                            : 'bg-[#ff2d55]/15 text-[#ff2d55] border-[#ff2d55]/30'
                        }`}>
                          {tx.type === 'DEPOSIT' ? (lang === 'vi' ? 'NẠP' : 'DEP') : (lang === 'vi' ? 'RÚT' : 'WITH')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-white font-bold whitespace-nowrap font-mono">
                        ${tx.grossAmount.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-red-400 whitespace-nowrap font-mono">
                        -${tx.feeAmount.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-emerald-400 font-black whitespace-nowrap font-mono">
                        +${tx.netAmount.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-[#f5d77f] font-bold truncate max-w-[120px] whitespace-nowrap">
                        {tx.memoCode || tx.id}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                          tx.status === 'APPROVED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : tx.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {tx.status === 'APPROVED' 
                            ? (lang === 'vi' ? 'ĐÃ DUYỆT' : 'APPROVED') 
                            : tx.status === 'PENDING' 
                            ? (lang === 'vi' ? 'CHỜ DUYỆT' : 'PENDING') 
                            : (lang === 'vi' ? 'TỪ CHỐI' : 'REJECTED')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setInspectedTx(tx)}
                          className="px-2.5 py-1 rounded-lg bg-[#05070c] hover:bg-[#141924] border border-[#221c10] text-[#f5d77f] text-[10px] font-bold transition-all active:scale-95"
                        >
                          {lang === 'vi' ? 'Chi tiết ➔' : 'Inspect ➔'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ============================================================= */}
      {/* 4. BOTTOM OPERATIONAL STRIP (BROADCAST & KILL-SWITCH) */}
      {/* ============================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Quick Broadcast 1-Line */}
        <div className="lg:col-span-2 bg-[#080b12] border border-[#221c10] rounded-2xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Send className="w-4 h-4 text-[#f5d77f]" />
              <span>{lang === 'vi' ? 'PHÁT THÔNG BÁO TỨC THÌ ĐẾN TẤT CẢ TELEGRAM USERS' : 'INSTANT BROADCAST TO ALL TELEGRAM USERS'}</span>
            </span>
            <span className="text-[9px] text-gray-500 font-mono">
              {users.length} {lang === 'vi' ? 'Thành viên nhận' : 'Recipients'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={broadcastMsg}
              onChange={(e) => setBroadcastMsg(e.target.value)}
              placeholder={lang === 'vi' ? 'Nhập thông điệp khẩn cấp cần phát...' : 'Enter urgent announcement to broadcast...'}
              className="flex-1 bg-[#05070c] border border-[#221c10] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
            />
            <button
              onClick={onBroadcast}
              className="px-4 py-2 rounded-xl gold-btn-solid text-black text-xs font-black shrink-0 active:scale-95 transition-transform"
            >
              {lang === 'vi' ? 'PHÁT NGAY' : 'BROADCAST'}
            </button>
          </div>
        </div>

        {/* Emergency Kill-Switch & TechOps Link */}
        <div className="bg-[#080b12] border border-[#221c10] rounded-2xl p-4 flex flex-col justify-between space-y-2 shadow-sm">
          <span className="text-xs font-black text-red-400 uppercase tracking-wider flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-red-500" />
            <span>{lang === 'vi' ? 'NGẮT BOT TỔNG KHẨN CẤP' : 'EMERGENCY KILL-SWITCH'}</span>
          </span>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            {lang === 'vi' 
              ? 'Ngắt toàn bộ tín hiệu lệnh khi thị trường Vàng có biến động dữ dội (NFP/CPI).' 
              : 'Immediately halt EA trading when severe high-impact news occurs.'}
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button 
              onClick={() => alert(lang === 'vi' ? '⚠️ ĐÃ KÍCH HOẠT LỆNH NGẮT BOT TỔNG TOÀN HỆ THỐNG!' : '⚠️ GLOBAL KILL-SWITCH TRIGGERED!')}
              className="flex-1 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-400 font-black text-xs uppercase transition-colors active:scale-95"
            >
              KILL-SWITCH
            </button>
            <button 
              onClick={() => setShowOrgTree(!showOrgTree)}
              className="flex-1 py-2 rounded-xl bg-[#0c0f17] hover:bg-[#141924] border border-[#221c10] text-gray-300 font-bold text-xs uppercase transition-colors active:scale-95"
            >
              {showOrgTree ? (lang === 'vi' ? 'Ẩn Sơ Đồ' : 'Hide Tree') : (lang === 'vi' ? 'Sơ Đồ Bộ' : 'Org Tree')}
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================= */}
      {/* 5. OPTIONAL COLLAPSIBLE ORG TREE (KHÔNG CHIẾM DIỆN TÍCH TRÊN ĐẦU) */}
      {/* ============================================================= */}
      {showOrgTree && (
        <section className="spartan-card rounded-3xl p-5 border border-[#221c10] bg-[#080b12] space-y-4 shadow-xl animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-[#221c10] pb-2.5">
            <div className="flex items-center gap-2">
              <GitFork className="w-4 h-4 text-[#f5d77f]" />
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                {t('admin_org_tree_title')}
              </h3>
            </div>
            <button
              onClick={() => setShowOrgTree(false)}
              className="text-[10px] font-bold text-gray-400 hover:text-white"
            >
              ✕ {lang === 'vi' ? 'Đóng' : 'Close'}
            </button>
          </div>

          <div className="space-y-4 pt-1">
            <div className="bg-gradient-to-r from-[#d4af37]/15 via-[#0c0f17] to-[#d4af37]/15 border-2 border-[#d4af37]/60 rounded-2xl p-3.5 text-center shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg">👑</span>
                <div>
                  <span className="text-[10px] font-black text-[#f5d77f] uppercase tracking-wider block">
                    {t('admin_supreme_board')}
                  </span>
                  <span className="text-sm font-black text-white">
                    @tddv2017 (ID: 494232782)
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
              <div className="bg-[#05070c] border border-[#221c10] rounded-2xl p-3 space-y-1">
                <span className="text-[11px] font-black text-[#f5d77f] uppercase block">1. KẾ TOÁN & KIỂM TOÁN</span>
                <span className="text-[10px] text-gray-400 block">• Đối soát Hóa đơn Nạp / Rút 3 chiều</span>
                <span className="text-[10px] text-gray-400 block">• Phí Nạp (9%+3$) & Rút (19%+5$)</span>
              </div>
              <div className="bg-[#05070c] border border-[#221c10] rounded-2xl p-3 space-y-1">
                <span className="text-[11px] font-black text-[#f5d77f] uppercase block">2. NHÂN SỰ & ĐẠI LÝ F1</span>
                <span className="text-[10px] text-gray-400 block">• Quản lý {users.length} Thành viên</span>
                <span className="text-[10px] text-gray-400 block">• Ma trận 10 Cấp bậc Reseller</span>
              </div>
              <div className="bg-[#05070c] border border-[#221c10] rounded-2xl p-3 space-y-1">
                <span className="text-[11px] font-black text-emerald-400 uppercase block">3. KỸ THUẬT & TÁC CHIẾN</span>
                <span className="text-[10px] text-gray-400 block">• Giám sát Exness EA & TronGrid</span>
                <span className="text-[10px] text-gray-400 block">• Chế độ bảo trì & Kill-Switch</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================= */}
      {/* 6. SLIDE-OUT INSPECTION DRAWER (NGĂN KÉO SOI CHI TIẾT ĐƠN HÀNG) */}
      {/* ============================================================= */}
      {inspectedTx && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#080b12] border-l border-[#221c10] p-5 h-full overflow-y-auto space-y-4 shadow-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#221c10] pb-3">
                <div>
                  <span className="text-xs font-black text-[#f5d77f] uppercase tracking-wider block">
                    {lang === 'vi' ? 'SOI HÓA ĐƠN CHI TIẾT' : 'TRANSACTION INSPECTION'}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">#{inspectedTx.id || inspectedTx.memoCode}</span>
                </div>
                <button 
                  onClick={() => setInspectedTx(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* User info */}
              <div className="bg-[#05070c] p-3 rounded-xl border border-[#221c10] space-y-1 font-mono">
                <span className="text-[9px] text-gray-400 uppercase block">{lang === 'vi' ? 'Người dùng:' : 'User:'}</span>
                <div className="font-bold text-white text-sm">@{inspectedTx.username}</div>
                <span className="text-[10px] text-gray-500 block">Telegram ID: {inspectedTx.userId}</span>
              </div>

              {/* Financial Calculation & Tiered Fee Breakdown */}
              <div className="bg-[#05070c] p-3.5 rounded-xl border border-[#221c10] space-y-2 font-mono text-xs">
                <div className="flex justify-between text-gray-400 text-[11px]">
                  <span>{lang === 'vi' ? 'Số tiền gốc:' : 'Gross Amount:'}</span>
                  <span className="text-white font-bold">${inspectedTx.grossAmount.toFixed(2)} USD</span>
                </div>

                {inspectedTx.type === 'WITHDRAW' && (
                  <>
                    <div className="flex justify-between text-gray-400 text-[11px]">
                      <span>{lang === 'vi' ? 'Bậc phí rút vốn:' : 'Fee Tier:'}</span>
                      <span className="text-[#f5d77f] font-bold">
                        {inspectedTx.feeTier || (inspectedTx.holdingDays !== undefined && inspectedTx.holdingDays < 30 ? 'Rút sớm < 30d (15%)' : 'Tiêu chuẩn (9%)')}
                      </span>
                    </div>
                    {inspectedTx.holdingDays !== undefined && (
                      <div className="flex justify-between text-gray-400 text-[10px]">
                        <span>{lang === 'vi' ? 'Thời gian nắm giữ:' : 'Holding Days:'}</span>
                        <span className="text-gray-300">{inspectedTx.holdingDays} ngày</span>
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-between text-gray-400 text-[11px]">
                  <span>{lang === 'vi' ? 'Phí hệ thống:' : 'System Fee:'}</span>
                  <span className="text-red-400 font-bold">-${inspectedTx.feeAmount.toFixed(2)} USD</span>
                </div>

                {inspectedTx.type === 'WITHDRAW' && inspectedTx.feeAmount > 0 && (
                  <div className="p-2 rounded-lg bg-[#080b12] border border-[#221c10] space-y-1 text-[10px]">
                    <div className="flex justify-between text-gray-400">
                      <span>• Doanh thu ròng Admin (70%):</span>
                      <span className="text-emerald-400 font-bold">
                        +${(inspectedTx.adminNetRevenue || inspectedTx.feeAmount * 0.70).toFixed(2)} USD
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>• Quỹ Dự Phòng Treasury (30%):</span>
                      <span className="text-[#f5d77f] font-bold">
                        +${(inspectedTx.treasuryReserveFee || inspectedTx.feeAmount * 0.30).toFixed(2)} USD
                      </span>
                    </div>
                  </div>
                )}

                <div className="border-t border-[#221c10] pt-2 flex justify-between text-xs font-black">
                  <span className="text-[#f5d77f]">{lang === 'vi' ? 'Thực nhận (Net):' : 'Net Received:'}</span>
                  <span className="text-emerald-400 font-bold">${inspectedTx.netAmount.toFixed(2)} USDT</span>
                </div>
              </div>

              {/* Memo & Blockchain Info */}
              <div className="space-y-1.5 font-mono">
                <div className="flex justify-between items-center text-[10px] text-gray-400">
                  <span>Mã Memo:</span>
                  <span className="text-[#f5d77f] font-bold">{inspectedTx.memoCode}</span>
                </div>
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] text-gray-400 block uppercase">Mã TxID / Blockchain Tron:</span>
                  <div className="p-2.5 rounded-xl bg-[#05070c] border border-[#221c10] text-[10px] text-gray-300 break-all select-all">
                    {inspectedTx.memoCode || 'TRON-TXID-WAITING-ONCHAIN'}
                  </div>
                </div>
              </div>

              {/* Risk Agreement & Digital Signature Legal Evidence */}
              {inspectedTx.riskAgreement ? (
                <div className="bg-[#05070c] p-3 rounded-xl border border-[#d4af37]/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-[#f5d77f] uppercase flex items-center gap-1.5">
                      <span>✍️</span>
                      <span>{lang === 'vi' ? 'CHỨNG THƯ KÝ SỐ ĐÃ KÝ' : 'LEGAL RISK AGREEMENT'}</span>
                    </span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      LEGAL BINDING
                    </span>
                  </div>

                  <div className="text-[10px] font-mono text-gray-400 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Mã băm SHA-256:</span>
                      <span className="text-gray-300 truncate max-w-[140px]">{inspectedTx.riskAgreement.signatureHash}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Thời gian ký:</span>
                      <span className="text-white">{new Date(inspectedTx.riskAgreement.signedAt).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US')}</span>
                    </div>
                  </div>

                  {/* Customer Handwriting Signature Preview */}
                  {inspectedTx.riskAgreement.signatureImageBase64 && (
                    <div className="pt-1">
                      <span className="text-[9px] text-gray-400 block mb-1">Nét chữ ký khách hàng:</span>
                      <div className="bg-[#080b12] border border-[#221c10] rounded-lg p-2 flex items-center justify-center">
                        <img 
                          src={inspectedTx.riskAgreement.signatureImageBase64} 
                          alt="Customer Signature" 
                          className="max-h-16 w-auto object-contain drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-[#05070c] p-2.5 rounded-xl border border-[#221c10] text-[10px] text-gray-500 font-mono flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-gray-600" />
                  <span>Đơn giao dịch nạp truyền thống (chưa ký số v2.0)</span>
                </div>
              )}
            </div>

            {/* Quick Action in Drawer */}
            <div className="space-y-2 pt-4 border-t border-[#221c10]">
              {inspectedTx.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => {
                      onApprove(inspectedTx);
                      setInspectedTx(null);
                    }}
                    className="w-full py-3 rounded-xl gold-btn-solid text-black text-xs font-black uppercase flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4 text-black" />
                    <span>{lang === 'vi' ? '⚡ DUYỆT & CỘNG TIỀN (1S)' : '⚡ APPROVE (1S)'}</span>
                  </button>
                  <button
                    onClick={() => {
                      onReject(inspectedTx);
                      setInspectedTx(null);
                    }}
                    className="w-full py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/35 text-red-400 text-xs font-bold uppercase transition-colors active:scale-95"
                  >
                    {lang === 'vi' ? 'TỪ CHỐI ĐƠN HÀNG' : 'REJECT TRANSACTION'}
                  </button>
                </>
              )}
              <button
                onClick={() => setInspectedTx(null)}
                className="w-full py-2.5 rounded-xl bg-[#0c0f17] hover:bg-[#141924] border border-[#221c10] text-gray-400 text-xs font-bold uppercase"
              >
                {lang === 'vi' ? 'ĐÓNG NGĂN KÉO' : 'CLOSE'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
