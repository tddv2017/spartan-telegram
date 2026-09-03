'use client';

import React, { useState } from 'react';
import { 
  UserAuditItem, 
  createAdminUser, 
  updateUserDetails, 
  deleteUserFromSystem 
} from '@/lib/adminService';
import { 
  Users, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Lock, 
  Unlock, 
  Power, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ShieldCheck, 
  DollarSign, 
  Award,
  RefreshCw,
  Save
} from 'lucide-react';

interface AdminUserCrudManagerProps {
  users: UserAuditItem[];
  onRefresh: () => void;
}

export const AdminUserCrudManager: React.FC<AdminUserCrudManagerProps> = ({
  users,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAuditItem | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserAuditItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    telegramId: '',
    username: '',
    firstName: '',
    tradingBalance: 0,
    referralBalance: 0,
    role: 'CLIENT',
    resellerTier: 1
  });

  // Edit Form State
  const [editForm, setEditForm] = useState({
    username: '',
    firstName: '',
    tradingBalance: 0,
    referralBalance: 0,
    role: 'CLIENT',
    resellerTier: 1,
    isFrozen: false,
    botActive: true
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.telegramId.trim()) {
      alert('Vui lòng nhập Telegram ID');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await createAdminUser(createForm);
      if (res.success) {
        setStatusMsg(`✅ ${res.message}`);
        setIsCreateOpen(false);
        setCreateForm({
          telegramId: '',
          username: '',
          firstName: '',
          tradingBalance: 0,
          referralBalance: 0,
          role: 'CLIENT',
          resellerTier: 1
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

  const handleEditOpen = (user: UserAuditItem) => {
    setEditingUser(user);
    setEditForm({
      username: user.username || '',
      firstName: user.firstName || '',
      tradingBalance: user.tradingBalance || 0,
      referralBalance: user.referralBalance || 0,
      role: user.role || 'CLIENT',
      resellerTier: user.resellerTier || 1,
      isFrozen: !!user.isFrozen,
      botActive: user.botActive !== false
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSubmitting(true);
    try {
      const success = await updateUserDetails(editingUser.telegramId, editForm as any);
      if (success) {
        setStatusMsg(`✅ Đã cập nhật thành công tài khoản @${editForm.username} (ID: ${editingUser.telegramId})!`);
        setEditingUser(null);
        onRefresh();
      } else {
        setStatusMsg(`❌ Lỗi cập nhật tài khoản!`);
      }
      setTimeout(() => setStatusMsg(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deletingUser) return;
    setIsSubmitting(true);
    try {
      const success = await deleteUserFromSystem(deletingUser.telegramId);
      if (success) {
        setStatusMsg(`🗑️ Đã xóa vĩnh viễn người dùng @${deletingUser.username} khỏi hệ thống!`);
        setDeletingUser(null);
        onRefresh();
      } else {
        setStatusMsg(`❌ Lỗi khi xóa người dùng!`);
      }
      setTimeout(() => setStatusMsg(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchRole = selectedRole === 'ALL' || u.role === selectedRole;
    const matchSearch = !searchTerm.trim() ||
      (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.firstName && u.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.telegramId && String(u.telegramId).includes(searchTerm));
    return matchRole && matchSearch;
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
          <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center font-black">
            👥
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              QUẢN LÝ TÀI KHOẢN & ĐỐI TÁC F1 (FULL CRUD)
            </h3>
            <span className="text-[10px] text-gray-400 font-mono block">
              Tổng số: {users.length} thành viên | Hiển thị: {filteredUsers.length} kết quả
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
            onClick={() => setIsCreateOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-[#ff5500] text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 hover:opacity-90 shadow-md transition-all font-sans"
          >
            <Plus className="w-4 h-4" />
            <span>THÊM THÀNH VIÊN MỚI</span>
          </button>
        </div>
      </div>

      {/* Search & Role Filter Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm theo Username, Tên hiển thị, hoặc Telegram ID..."
            className="w-full bg-[#0b0e17] border border-[#1f293d] rounded-2xl py-2.5 pl-10 pr-4 text-white text-xs font-mono focus:outline-none focus:border-[#ff5500]"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto bg-[#0b0e17] p-1 rounded-2xl border border-[#1f293d]">
          {([
            { id: 'ALL', label: 'TẤT CẢ' },
            { id: 'CLIENT', label: 'CLIENT' },
            { id: 'RESELLER', label: 'ĐỐI TÁC' },
            { id: 'ACCOUNTANT', label: 'KẾ TOÁN' },
            { id: 'TECH_OPS', label: 'KỸ THUẬT' },
            { id: 'ADMIN', label: 'ADMIN' },
          ] as const).map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRole(r.id)}
              className={`flex-1 py-1.5 px-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${
                selectedRole === r.id
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table (Desktop / Full-Page View) */}
      <div className="spartan-card rounded-3xl border border-[#1f293d] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0b0e17] text-[10px] text-gray-400 uppercase tracking-wider border-b border-[#1f293d]">
              <tr>
                <th className="py-3 px-4">THÀNH VIÊN</th>
                <th className="py-3 px-4">TELEGRAM ID</th>
                <th className="py-3 px-4">VAI TRÒ</th>
                <th className="py-3 px-4">HẠNG ĐỐI TÁC</th>
                <th className="py-3 px-4 text-right">VỐN THUẬT TOÁN (USD)</th>
                <th className="py-3 px-4 text-right">CHIẾT KHẤU (USD)</th>
                <th className="py-3 px-4 text-center">TRẠNG THÁI</th>
                <th className="py-3 px-4 text-center">THAO TÁC (CRUD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f293d]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500 font-bold">
                    Không tìm thấy thành viên nào phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.telegramId} className="hover:bg-[#131927]/60 transition-colors">
                    {/* User */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center font-black">
                          {u.username ? u.username.slice(0, 2).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <span className="font-extrabold text-white block">@{u.username || 'user'}</span>
                          <span className="text-[10px] text-gray-500 block">{u.firstName || 'Spartan Member'}</span>
                        </div>
                      </div>
                    </td>

                    {/* ID */}
                    <td className="py-3 px-4 font-bold text-gray-300">
                      {u.telegramId}
                    </td>

                    {/* Role */}
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border uppercase ${
                        u.role === 'ADMIN' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                        u.role === 'ACCOUNTANT' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' :
                        u.role === 'TECH_OPS' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                        u.role === 'RESELLER' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' :
                        'bg-gray-700/30 text-gray-300 border-gray-600'
                      }`}>
                        {u.role || 'CLIENT'}
                      </span>
                    </td>

                    {/* Tier & F1 Count */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-amber-300 font-black text-[11px]">
                          CẤP {u.resellerTier || 1}
                        </span>
                        <span className="text-[10px] text-gray-400">({u.f1Count || 0} F1)</span>
                      </div>
                    </td>

                    {/* Trading Capital */}
                    <td className="py-3 px-4 text-right font-black text-white">
                      ${u.tradingBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                    </td>

                    {/* Referral Balance */}
                    <td className="py-3 px-4 text-right font-black text-[#00df89]">
                      +${u.referralBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                    </td>

                    {/* Status Indicators */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {u.isFrozen ? (
                          <span className="px-2 py-0.5 rounded text-[9px] font-black bg-red-500/20 text-red-400 border border-red-500/40">
                            ĐÃ KHÓA
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[9px] font-black bg-[#00df89]/20 text-[#00df89] border border-[#00df89]/40">
                            HOẠT ĐỘNG
                          </span>
                        )}

                        {u.botActive !== false ? (
                          <span className="w-2 h-2 rounded-full bg-[#00df89] shadow-[0_0_6px_#00df89]" title="Bot đang chạy" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-amber-400" title="Bot tạm dừng" />
                        )}
                      </div>
                    </td>

                    {/* Actions CRUD */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleEditOpen(u)}
                          className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 transition-all"
                          title="Chỉnh sửa thông tin & số dư"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setDeletingUser(u)}
                          className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/40 transition-all"
                          title="Xóa tài khoản vĩnh viễn"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: TẠO THÀNH VIÊN MỚI (CREATE) */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0e17] border border-[#1f293d] rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#1f293d] pb-3">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" /> THÊM TÀI KHOẢN THÀNH VIÊN MỚI
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
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">Telegram ID (*Bắt buộc):</label>
                  <input
                    type="text"
                    required
                    value={createForm.telegramId}
                    onChange={(e) => setCreateForm({ ...createForm, telegramId: e.target.value })}
                    placeholder="VD: 88889999"
                    className="w-full bg-[#131927] border border-[#1f293d] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">Username Telegram:</label>
                  <input
                    type="text"
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    placeholder="VD: alex_spartan"
                    className="w-full bg-[#131927] border border-[#1f293d] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1">Tên Hiển Thị (Họ & Tên):</label>
                <input
                  type="text"
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                  placeholder="VD: Alex Nguyen"
                  className="w-full bg-[#131927] border border-[#1f293d] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">Vốn Đầu Tư Ban Đầu ($ USD):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={createForm.tradingBalance}
                    onChange={(e) => setCreateForm({ ...createForm, tradingBalance: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#131927] border border-[#1f293d] rounded-xl px-3 py-2 text-white font-mono font-black focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">Chiết Khấu Khởi Tạo ($ USD):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={createForm.referralBalance}
                    onChange={(e) => setCreateForm({ ...createForm, referralBalance: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#131927] border border-[#1f293d] rounded-xl px-3 py-2 text-white font-mono font-black focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">Phân Quyền Vai Trò:</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    className="w-full bg-[#131927] border border-[#1f293d] rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-purple-400"
                  >
                    <option value="CLIENT">CLIENT (Nhà đầu tư)</option>
                    <option value="RESELLER">RESELLER (Đối tác)</option>
                    <option value="ACCOUNTANT">ACCOUNTANT (Kế toán)</option>
                    <option value="TECH_OPS">TECH_OPS (Kỹ thuật)</option>
                    <option value="ADMIN">ADMIN (Quản trị tối cao)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">Hạng Thành Viên Đối Tác (1-10):</label>
                  <select
                    value={createForm.resellerTier}
                    onChange={(e) => setCreateForm({ ...createForm, resellerTier: parseInt(e.target.value, 10) })}
                    className="w-full bg-[#131927] border border-[#1f293d] rounded-xl px-3 py-2 text-amber-300 font-mono font-bold focus:outline-none focus:border-purple-400"
                  >
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((lvl) => (
                      <option key={lvl} value={lvl}>HẠNG {lvl} (Tier {lvl})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>TẠO THÀNH VIÊN</span>
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

      {/* MODAL 2: CHỈNH SỬA THÀNH VIÊN (UPDATE) */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0e17] border border-[#1f293d] rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#1f293d] pb-3">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Edit className="w-4 h-4 text-cyan-400" /> SỬA TÀI KHOẢN @{editingUser.username}
                </h3>
                <span className="text-[10px] text-gray-400 font-mono">Telegram ID: {editingUser.telegramId}</span>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">Username Telegram:</label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className="w-full bg-[#131927] border border-[#1f293d] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">Tên Hiển Thị:</label>
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="w-full bg-[#131927] border border-[#1f293d] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">Vốn Đầu Tư ($ USD):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.tradingBalance}
                    onChange={(e) => setEditForm({ ...editForm, tradingBalance: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#131927] border border-[#1f293d] rounded-xl px-3 py-2 text-white font-mono font-black focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">Chiết Khấu Khả Dụng ($ USD):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.referralBalance}
                    onChange={(e) => setEditForm({ ...editForm, referralBalance: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#131927] border border-[#1f293d] rounded-xl px-3 py-2 text-white font-mono font-black focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">Phân Quyền Vai Trò:</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full bg-[#131927] border border-[#1f293d] rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-cyan-400"
                  >
                    <option value="CLIENT">CLIENT (Nhà đầu tư)</option>
                    <option value="RESELLER">RESELLER (Đối tác)</option>
                    <option value="ACCOUNTANT">ACCOUNTANT (Kế toán)</option>
                    <option value="TECH_OPS">TECH_OPS (Kỹ thuật)</option>
                    <option value="ADMIN">ADMIN (Quản trị tối cao)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">Hạng Thành Viên Đối Tác (1-10):</label>
                  <select
                    value={editForm.resellerTier}
                    onChange={(e) => setEditForm({ ...editForm, resellerTier: parseInt(e.target.value, 10) })}
                    className="w-full bg-[#131927] border border-[#1f293d] rounded-xl px-3 py-2 text-amber-300 font-mono font-bold focus:outline-none focus:border-cyan-400"
                  >
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((lvl) => (
                      <option key={lvl} value={lvl}>HẠNG {lvl} (Tier {lvl})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 bg-[#131927] p-3 rounded-2xl border border-[#1f293d]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isFrozen}
                    onChange={(e) => setEditForm({ ...editForm, isFrozen: e.target.checked })}
                    className="rounded border-gray-700 text-red-500 focus:ring-0"
                  />
                  <span className="font-black text-red-400 text-xs">🔒 KHÓA TÀI KHOẢN</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.botActive}
                    onChange={(e) => setEditForm({ ...editForm, botActive: e.target.checked })}
                    className="rounded border-gray-700 text-[#00df89] focus:ring-0"
                  />
                  <span className="font-black text-[#00df89] text-xs">⚡ BOT ĐANG CHẠY</span>
                </label>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>LƯU THAY ĐỔI</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-3 rounded-xl bg-[#131927] text-gray-400 hover:text-white border border-[#1f293d] text-xs font-bold"
                >
                  HỦY
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: XÁC NHẬN XÓA THÀNH VIÊN (DELETE) */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0e17] border border-red-500/50 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 flex items-center justify-center font-black">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase">XÁC NHẬN XÓA TÀI KHOẢN</h3>
                <span className="text-[10px] text-red-400 font-mono">Hành động này không thể hoàn tác!</span>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed bg-[#131927] p-3 rounded-2xl border border-[#1f293d]">
              Bạn có chắc chắn muốn xóa vĩnh viễn người dùng <strong className="text-white">@{deletingUser.username}</strong> (Telegram ID: <code className="text-amber-400">{deletingUser.telegramId}</code>) khỏi cơ sở dữ liệu Firebase không?
            </p>

            <div className="flex items-center gap-2 pt-2 font-sans">
              <button
                onClick={handleDeleteSubmit}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>XÓA VĨNH VIỄN</span>
              </button>
              <button
                onClick={() => setDeletingUser(null)}
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
