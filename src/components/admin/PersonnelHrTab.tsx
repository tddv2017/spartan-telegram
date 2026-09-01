'use client';

import React, { useState } from 'react';
import { UserAuditItem, updateUserRoleAndTier } from '@/lib/adminService';
import { 
  Users, 
  Search, 
  ShieldCheck, 
  Award, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  AlertCircle,
  ChevronDown,
  UserCheck,
  UserX,
  Loader2
} from 'lucide-react';

interface PersonnelHrTabProps {
  users: UserAuditItem[];
  onRefresh: () => void;
}

export const PersonnelHrTab: React.FC<PersonnelHrTabProps> = ({
  users,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleTierChange = async (userId: string, newTier: number) => {
    setUpdatingId(userId);
    const success = await updateUserRoleAndTier(userId, { resellerTier: newTier });
    if (success) {
      setStatusMsg(`✅ Đã cập nhật thành công người dùng ID ${userId} lên CẤP ĐẠI LÝ ${newTier}!`);
      onRefresh();
    } else {
      setStatusMsg(`❌ Không thể cập nhật cấp bậc cho người dùng ${userId}!`);
    }
    setTimeout(() => setStatusMsg(null), 4000);
    setUpdatingId(null);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingId(userId);
    const success = await updateUserRoleAndTier(userId, { role: newRole });
    if (success) {
      setStatusMsg(`✅ Đã cập nhật vai trò người dùng ID ${userId} thành ${newRole}!`);
      onRefresh();
    } else {
      setStatusMsg(`❌ Không thể cập nhật vai trò cho người dùng ${userId}!`);
    }
    setTimeout(() => setStatusMsg(null), 4000);
    setUpdatingId(null);
  };

  const handleFreezeToggle = async (userId: string, currentFrozen: boolean) => {
    setUpdatingId(userId);
    const newFrozen = !currentFrozen;
    const success = await updateUserRoleAndTier(userId, { isFrozen: newFrozen });
    if (success) {
      setStatusMsg(newFrozen ? `🔒 Tài khoản ${userId} ĐÃ BỊ KHÓA / ĐÓNG BĂNG!` : `🔓 Tài khoản ${userId} ĐÃ ĐƯỢC MỞ KHÓA HOẠT ĐỘNG!`);
      onRefresh();
    } else {
      setStatusMsg(`❌ Lỗi khi thay đổi trạng thái khóa cho ${userId}!`);
    }
    setTimeout(() => setStatusMsg(null), 4000);
    setUpdatingId(null);
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
      {/* Toast Banner */}
      {statusMsg && (
        <div className="p-3 bg-amber-500/20 border border-amber-500 rounded-2xl text-amber-300 text-xs font-bold flex items-center gap-2 animate-bounce">
          <ShieldCheck className="w-4 h-4 flex-shrink-0 text-amber-400" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Directory Overview Card */}
      <div className="spartan-card rounded-3xl p-4 border border-[#1f293d] space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#ff5500]" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              DANH BẠ QUẢN LÝ NHÂN SỰ & MẠNG LƯỚI ĐẠI LÝ ({filteredUsers.length})
            </h3>
          </div>
          <span className="text-[10px] font-bold text-gray-400 font-mono">
            Tổng {users.length} thành viên
          </span>
        </div>

        {/* Search & Role Filters */}
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo Username, Tên, hoặc Telegram ID..."
              className="w-full bg-[#0b0e17] border border-[#1f293d] rounded-xl py-2 pl-9 pr-3 text-white text-xs font-mono focus:outline-none focus:border-[#ff5500]"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {([
              { id: 'ALL', label: 'TẤT CẢ' },
              { id: 'ADMIN', label: 'QUẢN TRỊ (ADMIN)' },
              { id: 'ACCOUNTANT', label: 'KẾ TOÁN' },
              { id: 'TECH_OPS', label: 'KỸ THUẬT' },
              { id: 'RESELLER', label: 'ĐẠI LÝ' },
              { id: 'CLIENT', label: 'NHÀ ĐẦU TƯ' }
            ] as const).map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRole(r.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase whitespace-nowrap transition-all ${
                  selectedRole === r.id
                    ? 'bg-[#ff5500] text-white shadow-sm'
                    : 'bg-[#0b0e17] text-gray-400 hover:text-white border border-[#1f293d]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* User Management List */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-500 font-bold bg-[#0b0e17] rounded-xl">
              Không tìm thấy thành viên nào phù hợp
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isUpdating = updatingId === u.telegramId;
              return (
                <div
                  key={u.telegramId}
                  className={`p-3.5 rounded-2xl bg-[#0b0e17] border transition-all text-xs space-y-2.5 ${
                    u.isFrozen ? 'border-red-500/40 bg-red-950/10' : 'border-[#1f293d]'
                  }`}
                >
                  {/* User Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#ff5500]/15 text-[#ff5500] border border-[#ff5500]/30 flex items-center justify-center font-black">
                        {u.username ? u.username.slice(0, 2).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-white">@{u.username || 'user'}</span>
                          {u.isFrozen && (
                            <span className="text-[9px] font-black bg-red-500/20 text-red-400 border border-red-500/40 px-1.5 py-0.2 rounded">
                              ĐÃ KHÓA
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono">ID: {u.telegramId}</span>
                      </div>
                    </div>

                    {/* Freeze / Unfreeze Action Button */}
                    <button
                      onClick={() => handleFreezeToggle(u.telegramId, !!u.isFrozen)}
                      disabled={isUpdating}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-1 border transition-all ${
                        u.isFrozen
                          ? 'bg-[#00df89]/15 border-[#00df89]/40 text-[#00df89] hover:bg-[#00df89]/25'
                          : 'bg-red-500/15 border-red-500/40 text-red-400 hover:bg-red-500/25'
                      }`}
                    >
                      {isUpdating ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : u.isFrozen ? (
                        <Unlock className="w-3 h-3" />
                      ) : (
                        <Lock className="w-3 h-3" />
                      )}
                      <span>{u.isFrozen ? 'Mở Khóa' : 'Khóa Tài Khoản'}</span>
                    </button>
                  </div>

                  {/* Financial Stats & F1 Network Volume */}
                  <div className="grid grid-cols-3 gap-2 bg-[#131927] p-2.5 rounded-xl border border-[#1f293d] font-mono text-[10px]">
                    <div>
                      <span className="text-gray-400 block text-[8px]">VỐN ĐẦU TƯ:</span>
                      <span className="font-black text-white">${u.tradingBalance?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[8px]">HOA HỒNG:</span>
                      <span className="font-black text-[#00df89]">+${u.referralBalance?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-400 block text-[8px]">F1 TRỰC THUỘC:</span>
                      <span className="font-black text-amber-300">{u.f1Count || 0} Thành viên</span>
                    </div>
                  </div>

                  {/* Role & Reseller Tier Selectors */}
                  <div className="grid grid-cols-2 gap-2 pt-1 font-sans">
                    {/* Role Selector */}
                    <div>
                      <label className="text-[9px] text-gray-400 font-bold block mb-1">PHÂN QUYỀN VAI TRÒ</label>
                      <select
                        value={u.role || 'CLIENT'}
                        onChange={(e) => handleRoleChange(u.telegramId, e.target.value)}
                        disabled={isUpdating}
                        className="w-full bg-[#131927] border border-[#1f293d] rounded-xl px-2 py-1.5 text-[11px] font-bold text-gray-200 focus:outline-none focus:border-[#ff5500]"
                      >
                        <option value="CLIENT">NHÀ ĐẦU TƯ (Client)</option>
                        <option value="RESELLER">ĐẠI LÝ (Reseller)</option>
                        <option value="ACCOUNTANT">KẾ TOÁN (Accountant)</option>
                        <option value="TECH_OPS">KỸ THUẬT (TechOps)</option>
                        <option value="ADMIN">QUẢN TRỊ TỐI CAO (Admin)</option>
                      </select>
                    </div>

                    {/* Tier Selector */}
                    <div>
                      <label className="text-[9px] text-gray-400 font-bold block mb-1">CẤP BẬC ĐẠI LÝ</label>
                      <select
                        value={u.resellerTier || 1}
                        onChange={(e) => handleTierChange(u.telegramId, parseInt(e.target.value, 10))}
                        disabled={isUpdating}
                        className="w-full bg-[#131927] border border-[#1f293d] rounded-xl px-2 py-1.5 text-[11px] font-bold text-amber-300 font-mono focus:outline-none focus:border-[#ff5500]"
                      >
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((lvl) => (
                          <option key={lvl} value={lvl}>
                            CẤP ĐỘ {lvl} (Hoàn {lvl * 2}% Phí)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
