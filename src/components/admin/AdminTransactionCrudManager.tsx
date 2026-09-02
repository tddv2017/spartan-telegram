'use client';

import React, { useState } from 'react';
import { 
  TransactionData, 
  approveLiveTransaction, 
  rejectLiveTransaction 
} from '@/lib/firebaseService';
import { 
  createManualTransaction, 
  updateTransactionRecord, 
  deleteTransactionRecord,
  clearAllTestTransactions 
} from '@/lib/adminService';
import { 
  FileSpreadsheet, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ShieldCheck, 
  ArrowDown, 
  ArrowUp, 
  Clock, 
  Receipt,
  RefreshCw,
  Save,
  Filter
} from 'lucide-react';

interface AdminTransactionCrudManagerProps {
  transactions: TransactionData[];
  onRefresh: () => void;
}

export const AdminTransactionCrudManager: React.FC<AdminTransactionCrudManagerProps> = ({
  transactions,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'DEPOSIT' | 'WITHDRAW'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<TransactionData | null>(null);
  const [deletingTx, setDeletingTx] = useState<TransactionData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWipeConfirmOpen, setIsWipeConfirmOpen] = useState(false);
  const [isWiping, setIsWiping] = useState(false);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    userId: '',
    username: '',
    type: 'DEPOSIT' as 'DEPOSIT' | 'WITHDRAW',
    grossAmount: 1000,
    status: 'APPROVED' as 'APPROVED' | 'PENDING' | 'REJECTED',
    memoCode: ''
  });

  // Edit Form State
  const [editForm, setEditForm] = useState({
    grossAmount: 0,
    feeAmount: 0,
    netAmount: 0,
    status: 'APPROVED' as 'APPROVED' | 'PENDING' | 'REJECTED',
    memoCode: ''
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  const handleQuickApprove = async (tx: TransactionData) => {
    const txId = tx.id || tx.memoCode;
    setIsSubmitting(true);
    try {
      const res = await approveLiveTransaction(txId, 'tddv2017 (Admin)');
      if (res.success) {
        setStatusMsg(`✅ ĐÃ DUYỆT thành công đơn ${txId} (+${tx.netAmount.toFixed(2)} USDT) cho @${tx.username}!`);
        onRefresh();
      } else {
        setStatusMsg(`⚠️ ${res.message}`);
      }
      setTimeout(() => setStatusMsg(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickReject = async (tx: TransactionData) => {
    const txId = tx.id || tx.memoCode;
    setIsSubmitting(true);
    try {
      const res = await rejectLiveTransaction(txId, 'tddv2017 (Admin)', 'Từ chối bởi Admin');
      if (res.success) {
        setStatusMsg(`🚫 ĐÃ TỪ CHỐI đơn ${txId} của @${tx.username}!`);
        onRefresh();
      } else {
        setStatusMsg(`⚠️ ${res.message}`);
      }
      setTimeout(() => setStatusMsg(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.userId.trim()) {
      alert('Vui lòng nhập Telegram User ID');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await createManualTransaction(createForm);
      if (res.success) {
        setStatusMsg(`✅ ${res.message}`);
        setIsCreateOpen(false);
        setCreateForm({
          userId: '',
          username: '',
          type: 'DEPOSIT',
          grossAmount: 1000,
          status: 'APPROVED',
          memoCode: ''
        });
        onRefresh();
      } else {
        setStatusMsg(`❌ ${res.message}`);
      }
      setTimeout(() => setStatusMsg(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOpen = (tx: TransactionData) => {
    setEditingTx(tx);
    setEditForm({
      grossAmount: tx.grossAmount || 0,
      feeAmount: tx.feeAmount || 0,
      netAmount: tx.netAmount || 0,
      status: tx.status || 'PENDING',
      memoCode: tx.memoCode || ''
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    const txId = editingTx.id || editingTx.memoCode;
    setIsSubmitting(true);
    try {
      const success = await updateTransactionRecord(txId, String(editingTx.userId), editForm);
      if (success) {
        setStatusMsg(`✅ Đã cập nhật hóa đơn ${txId} thành công!`);
        setEditingTx(null);
        onRefresh();
      } else {
        setStatusMsg(`❌ Lỗi cập nhật hóa đơn!`);
      }
      setTimeout(() => setStatusMsg(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deletingTx) return;
    const txId = deletingTx.id || deletingTx.memoCode;
    setIsSubmitting(true);
    try {
      const success = await deleteTransactionRecord(txId, String(deletingTx.userId));
      if (success) {
        setStatusMsg(`🗑️ Đã xóa hóa đơn ${txId} khỏi hệ thống!`);
        setDeletingTx(null);
        onRefresh();
      } else {
        setStatusMsg(`❌ Lỗi khi xóa hóa đơn!`);
      }
      setTimeout(() => setStatusMsg(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWipeAllTestTxs = async () => {
    setIsWiping(true);
    try {
      const res = await clearAllTestTransactions();
      if (res.success) {
        setStatusMsg('🗑️ ' + res.message);
        setIsWipeConfirmOpen(false);
        onRefresh();
      } else {
        setStatusMsg('❌ ' + res.message);
      }
      setTimeout(() => setStatusMsg(null), 5000);
    } finally {
      setIsWiping(false);
    }
  };

  const filteredTxs = transactions.filter((tx) => {
    const matchType = filterType === 'ALL' || tx.type === filterType;
    const matchStatus = filterStatus === 'ALL' || tx.status === filterStatus;
    const matchSearch = !searchTerm.trim() ||
      (tx.username && tx.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tx.userId && String(tx.userId).includes(searchTerm)) ||
      (tx.memoCode && tx.memoCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tx.id && tx.id.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchType && matchStatus && matchSearch;
  });

  return (
    <div className="space-y-4">
      {/* Toast Alert */}
      {statusMsg && (
        <div className="p-3.5 bg-amber-500/20 border border-amber-500 rounded-2xl text-amber-300 text-xs font-bold flex items-center gap-2 animate-bounce shadow-md">
          <ShieldCheck className="w-4 h-4 flex-shrink-0 text-amber-400" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Header & Controls Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0b0e17] p-4 rounded-3xl border border-[#1f293d]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center font-black">
            📑
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              QUẢN LÝ HÓA ĐƠN & GIAO DỊCH NẠP / RÚT (FULL CRUD)
            </h3>
            <span className="text-[10px] text-gray-400 font-mono block">
              Tổng số: {transactions.length} hóa đơn | Hiển thị: {filteredTxs.length} kết quả
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl bg-[#131927] border border-[#1f293d] text-gray-300 hover:text-white transition-all"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <button
            onClick={() => setIsWipeConfirmOpen(true)}
            className="px-3 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/30 border border-red-500/40 text-red-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
            title="Dọn dẹp sạch toàn bộ dữ liệu giao dịch test"
          >
            <Trash2 className="w-4 h-4" />
            <span>XÓA SẠCH TEST</span>
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-[#ff5500] text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 hover:opacity-90 shadow-md transition-all font-sans"
          >
            <Plus className="w-4 h-4" />
            <span>TẠO HÓA ĐƠN MỚI</span>
          </button>
        </div>
      </div>

      {/* Search & Multi-Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo Mã đơn, Username, Telegram ID, hoặc Mã Memo..."
            className="w-full bg-[#0b0e17] border border-[#1f293d] rounded-2xl py-2.5 pl-10 pr-4 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Filter Type */}
        <div className="flex items-center gap-1 bg-[#0b0e17] p-1 rounded-2xl border border-[#1f293d]">
          {([
            { id: 'ALL', label: 'TẤT CẢ' },
            { id: 'DEPOSIT', label: 'NẠP TIỀN' },
            { id: 'WITHDRAW', label: 'RÚT TIỀN' }
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setFilterType(t.id)}
              className={`flex-1 py-1.5 px-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${
                filterType === t.id
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filter Status */}
        <div className="flex items-center gap-1 bg-[#0b0e17] p-1 rounded-2xl border border-[#1f293d]">
          {([
            { id: 'ALL', label: 'TẤT CẢ' },
            { id: 'PENDING', label: 'CHỜ' },
            { id: 'APPROVED', label: 'DUYỆT' },
            { id: 'REJECTED', label: 'TỪ CHỐI' }
          ] as const).map((s) => (
            <button
              key={s.id}
              onClick={() => setFilterStatus(s.id)}
              className={`flex-1 py-1.5 px-1 rounded-xl text-[9px] font-black uppercase whitespace-nowrap transition-all ${
                filterStatus === s.id
                  ? 'bg-amber-500 text-black shadow-sm font-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table (Desktop / Full-Page View) */}
      <div className="spartan-card rounded-3xl border border-[#1f293d] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0b0e17] text-[10px] text-gray-400 uppercase tracking-wider border-b border-[#1f293d]">
              <tr>
                <th className="py-3 px-4">MÃ ĐƠN & MEMO</th>
                <th className="py-3 px-4">THÀNH VIÊN</th>
                <th className="py-3 px-4 text-center">LOẠI</th>
                <th className="py-3 px-4 text-right">YÊU CẦU (GROSS)</th>
                <th className="py-3 px-4 text-right">PHÍ THU</th>
                <th className="py-3 px-4 text-right">THỰC NHẬN (NET)</th>
                <th className="py-3 px-4 text-center">TRẠNG THÁI</th>
                <th className="py-3 px-4 text-center">THAO TÁC (CRUD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f293d]">
              {filteredTxs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500 font-bold">
                    Không tìm thấy bản ghi giao dịch nào phù hợp
                  </td>
                </tr>
              ) : (
                filteredTxs.map((tx) => {
                  const txId = tx.id || tx.memoCode;
                  return (
                    <tr key={txId} className="hover:bg-[#131927]/60 transition-colors">
                      {/* Order & Memo */}
                      <td className="py-3 px-4">
                        <div>
                          <span className="font-bold text-white block truncate max-w-[150px]">{tx.id || 'N/A'}</span>
                          <span className="text-[10px] text-amber-300 block">Memo: {tx.memoCode}</span>
                        </div>
                      </td>

                      {/* User */}
                      <td className="py-3 px-4">
                        <div>
                          <span className="font-extrabold text-white block">@{tx.username || 'user'}</span>
                          <span className="text-[10px] text-gray-500 block">ID: {tx.userId}</span>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase ${
                          tx.type === 'DEPOSIT' 
                            ? 'bg-[#00df89]/15 text-[#00df89] border-[#00df89]/30' 
                            : 'bg-[#ff2d55]/15 text-[#ff2d55] border-[#ff2d55]/30'
                        }`}>
                          {tx.type === 'DEPOSIT' ? 'NẠP' : 'RÚT'}
                        </span>
                      </td>

                      {/* Gross */}
                      <td className="py-3 px-4 text-right font-black text-white">
                        ${tx.grossAmount?.toFixed(2) || '0.00'}
                      </td>

                      {/* Fee */}
                      <td className="py-3 px-4 text-right font-bold text-amber-400">
                        -${tx.feeAmount?.toFixed(2) || '0.00'}
                      </td>

                      {/* Net */}
                      <td className="py-3 px-4 text-right font-black text-[#00df89]">
                        ${tx.netAmount?.toFixed(2) || '0.00'}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black border ${
                          tx.status === 'APPROVED' ? 'bg-[#00df89]/20 text-[#00df89] border-[#00df89]/40' :
                          tx.status === 'PENDING' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse' :
                          'bg-red-500/20 text-red-400 border-red-500/40'
                        }`}>
                          {tx.status === 'APPROVED' ? 'ĐÃ DUYỆT' : tx.status === 'PENDING' ? 'CHỜ DUYỆT' : 'TỪ CHỐI'}
                        </span>
                      </td>

                      {/* CRUD Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {tx.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleQuickApprove(tx)}
                                className="p-1.5 rounded-lg bg-[#00df89]/20 text-[#00df89] hover:bg-[#00df89]/30 border border-[#00df89]/40 transition-all"
                                title="Duyệt lệnh nhanh"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleQuickReject(tx)}
                                className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/40 transition-all"
                                title="Từ chối lệnh"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => handleEditOpen(tx)}
                            className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 transition-all"
                            title="Sửa thông tin hóa đơn"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setDeletingTx(tx)}
                            className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/40 transition-all"
                            title="Xóa hóa đơn"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: TẠO HÓA ĐƠN THỦ CÔNG (CREATE) */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0e17] border border-[#1f293d] rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#1f293d] pb-3">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" /> TẠO HÓA ĐƠN GIAO DỊCH THỦ CÔNG
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">Telegram User ID (*):</label>
                  <input
                    type="text"
                    required
                    value={createForm.userId}
                    onChange={(e) => setCreateForm({ ...createForm, userId: e.target.value })}
                    placeholder="VD: 88889999"
                    className="w-full bg-[#131927] border border-[#1f293d] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">Username:</label>
                  <input
                    type="text"
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    placeholder="VD: alex"
                    className="w-full bg-[#131927] border border-[#1f293d] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">Loại Giao Dịch:</label>
                  <select
                    value={createForm.type}
                    onChange={(e) => setCreateForm({ ...createForm, type: e.target.value as any })}
                    className="w-full bg-[#131927] border border-[#1f293d] rounded-xl px-3 py-2 text-white font-black focus:outline-none focus:border-cyan-400"
                  >
                    <option value="DEPOSIT">NẠP TIỀN (DEPOSIT - Phí 9%+$3)</option>
                    <option value="WITHDRAW">RÚT TIỀN (WITHDRAW - Phí 19%+$5)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">Số Tiền Yêu Cầu ($ USD):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={createForm.grossAmount}
                    onChange={(e) => setCreateForm({ ...createForm, grossAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#131927] border border-[#1f293d] rounded-xl px-3 py-2 text-white font-mono font-black focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">Trạng Thái Ban Đầu:</label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as any })}
                    className="w-full bg-[#131927] border border-[#1f293d] rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-cyan-400"
                  >
                    <option value="APPROVED">APPROVED (Đã duyệt - Tự động cộng/trừ vốn)</option>
                    <option value="PENDING">PENDING (Chờ duyệt)</option>
                    <option value="REJECTED">REJECTED (Từ chối)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">Mã Memo Tùy Chỉnh (Tùy chọn):</label>
                  <input
                    type="text"
                    value={createForm.memoCode}
                    onChange={(e) => setCreateForm({ ...createForm, memoCode: e.target.value })}
                    placeholder="Mặc định tự sinh..."
                    className="w-full bg-[#131927] border border-[#1f293d] rounded-xl px-3 py-2 text-amber-300 font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>TẠO HÓA ĐƠN</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-3 rounded-xl bg-[#131927] text-gray-400 hover:text-white border border-[#1f293d] text-xs font-bold"
                >
                  HỦY
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CHỈNH SỬA HÓA ĐƠN (UPDATE) */}
      {editingTx && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0e17] border border-[#1f293d] rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#1f293d] pb-3">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Edit className="w-4 h-4 text-cyan-400" /> SỬA HÓA ĐƠN #{editingTx.id}
                </h3>
                <span className="text-[10px] text-gray-400 font-mono">Người dùng: @{editingTx.username} (ID: {editingTx.userId})</span>
              </div>
              <button
                onClick={() => setEditingTx(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">Gross ($ USD):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.grossAmount}
                    onChange={(e) => setEditForm({ ...editForm, grossAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#131927] border border-[#1f293d] rounded-xl px-3 py-2 text-white font-mono font-black focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">Phí Thu ($ USD):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.feeAmount}
                    onChange={(e) => setEditForm({ ...editForm, feeAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#131927] border border-[#1f293d] rounded-xl px-3 py-2 text-amber-300 font-mono font-bold focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">Thực Nhận ($ USD):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.netAmount}
                    onChange={(e) => setEditForm({ ...editForm, netAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#131927] border border-[#1f293d] rounded-xl px-3 py-2 text-[#00df89] font-mono font-black focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">Trạng Thái:</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                    className="w-full bg-[#131927] border border-[#1f293d] rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-cyan-400"
                  >
                    <option value="APPROVED">APPROVED (Đã duyệt)</option>
                    <option value="PENDING">PENDING (Chờ duyệt)</option>
                    <option value="REJECTED">REJECTED (Từ chối)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">Mã Memo:</label>
                  <input
                    type="text"
                    value={editForm.memoCode}
                    onChange={(e) => setEditForm({ ...editForm, memoCode: e.target.value })}
                    className="w-full bg-[#131927] border border-[#1f293d] rounded-xl px-3 py-2 text-amber-300 font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>LƯU HÓA ĐƠN</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="px-4 py-3 rounded-xl bg-[#131927] text-gray-400 hover:text-white border border-[#1f293d] text-xs font-bold"
                >
                  HỦY
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: XÁC NHẬN XÓA HÓA ĐƠN (DELETE) */}
      {deletingTx && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0e17] border border-red-500/50 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 flex items-center justify-center font-black">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase">XÁC NHẬN XÓA HÓA ĐƠN</h3>
                <span className="text-[10px] text-red-400 font-mono">Hành động này không thể hoàn tác!</span>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed bg-[#131927] p-3 rounded-2xl border border-[#1f293d]">
              Bạn có chắc chắn muốn xóa vĩnh viễn hóa đơn <strong className="text-white">#{deletingTx.id}</strong> (Số tiền: <strong className="text-[#00df89]">${deletingTx.grossAmount} USD</strong> của <strong className="text-white">@{deletingTx.username}</strong>) khỏi hệ thống không?
            </p>

            <div className="flex items-center gap-2 pt-2 font-sans">
              <button
                onClick={handleDeleteSubmit}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>XÓA HÓA ĐƠN</span>
              </button>
              <button
                onClick={() => setDeletingTx(null)}
                className="px-4 py-3 rounded-xl bg-[#131927] text-gray-400 hover:text-white border border-[#1f293d] text-xs font-bold"
              >
                HỦY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wipe All Test Transactions Modal */}
      {isWipeConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0e17] border border-red-500/50 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 flex items-center justify-center font-black">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase">XÁC NHẬN XÓA SẠCH GIAO DỊCH TEST</h3>
                <span className="text-[10px] text-red-400 font-mono">Dọn dẹp cơ sở dữ liệu về trạng thái sạch</span>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed bg-[#131927] p-3.5 rounded-2xl border border-[#1f293d]">
              Hành động này sẽ <strong>xóa toàn bộ các bản ghi giao dịch Nạp / Rút test</strong> trên toàn hệ thống (bao gồm bảng tổng <code className="text-amber-400">/transactions</code> và lịch sử riêng của từng khách hàng).
            </p>

            <div className="flex items-center gap-2 pt-2 font-sans">
              <button
                onClick={handleWipeAllTestTxs}
                disabled={isWiping}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
              >
                {isWiping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>XÁC NHẬN XÓA SẠCH TEST</span>
              </button>
              <button
                onClick={() => setIsWipeConfirmOpen(false)}
                className="px-4 py-3 rounded-xl bg-[#131927] text-gray-400 hover:text-white border border-[#1f293d] text-xs font-bold"
              >
                HỦY
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
