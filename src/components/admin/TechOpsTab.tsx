'use client';

import React, { useState } from 'react';
import { UserAuditItem, setUserBotStatus, SystemConfig, updateSystemConfig } from '@/lib/adminService';
import { 
  Activity, 
  Cpu, 
  Lock, 
  Unlock, 
  Power, 
  Server, 
  Radio, 
  Search, 
  AlertTriangle, 
  ShieldCheck, 
  Loader2,
  Wrench,
  Wifi
} from 'lucide-react';

interface TechOpsTabProps {
  users: UserAuditItem[];
  systemConfig: SystemConfig;
  onRefresh: () => void;
}

export const TechOpsTab: React.FC<TechOpsTabProps> = ({
  users,
  systemConfig,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [updatingSystem, setUpdatingSystem] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [maintenanceNotice, setMaintenanceNotice] = useState(systemConfig.broadcastNotice || '');

  // Toggle Global Bot Kill Switch
  const handleToggleGlobalBot = async () => {
    setUpdatingSystem(true);
    const nextState = !systemConfig.globalBotActive;
    const success = await updateSystemConfig({ globalBotActive: nextState });
    if (success) {
      setStatusMsg(nextState ? '🚀 ĐÃ KÍCH HOẠT LẠI BOT TỔNG TOÀN HỆ THỐNG!' : '🛑 ĐÃ BẬT CÔNG TẮC NGẮT BOT TỔNG KHẨN CẤP!');
      onRefresh();
    } else {
      setStatusMsg('❌ Không thể cập nhật trạng thái bot tổng!');
    }
    setTimeout(() => setStatusMsg(null), 4000);
    setUpdatingSystem(false);
  };

  // Toggle System Maintenance Mode
  const handleToggleMaintenance = async () => {
    setUpdatingSystem(true);
    const nextState = !systemConfig.maintenanceMode;
    const success = await updateSystemConfig({ 
      maintenanceMode: nextState,
      broadcastNotice: maintenanceNotice || 'Hệ thống đang tiến hành nâng cấp bảo trì hạ tầng định chế.'
    });
    if (success) {
      setStatusMsg(nextState ? '⚠️ ĐÃ BẬT CHẾ ĐỘ BẢO TRÌ TOÀN HỆ THỐNG!' : '✅ ĐÃ TẮT BẢO TRÌ - HỆ THỐNG TRỰC TUYẾN BÌNH THƯỜNG!');
      onRefresh();
    } else {
      setStatusMsg('❌ Không thể cập nhật chế độ bảo trì!');
    }
    setTimeout(() => setStatusMsg(null), 4000);
    setUpdatingSystem(false);
  };

  // Toggle Granular Bot Status for Single User
  const handleToggleUserBot = async (userId: string, currentActive: boolean) => {
    setUpdatingUserId(userId);
    const nextState = !currentActive;
    const success = await setUserBotStatus(userId, nextState);
    if (success) {
      setStatusMsg(nextState ? `🟢 ĐÃ BẬT BOT cho người dùng ID ${userId}` : `🔴 ĐÃ TẠM DỪNG BOT cho người dùng ID ${userId}`);
      onRefresh();
    } else {
      setStatusMsg(`❌ Lỗi khi đổi trạng thái bot cho người dùng ${userId}`);
    }
    setTimeout(() => setStatusMsg(null), 4000);
    setUpdatingUserId(null);
  };

  const filteredUsers = users.filter((u) => {
    return !searchTerm.trim() ||
      (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.telegramId && String(u.telegramId).includes(searchTerm));
  });

  return (
    <div className="space-y-4">
      {/* Toast Alert */}
      {statusMsg && (
        <div className="p-3 bg-amber-500/20 border border-amber-500 rounded-2xl text-amber-300 text-xs font-bold flex items-center gap-2 animate-bounce">
          <ShieldCheck className="w-4 h-4 flex-shrink-0 text-amber-400" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Global Infrastructure Control Switches */}
      <div className="spartan-card rounded-3xl p-5 border border-[#1f293d] space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#ff5500]" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              CÔNG TẮC ĐIỀU KHIỂN & NGẮT KHẨN CẤP
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold text-[#00df89] flex items-center gap-1">
            <Radio className="w-3 h-3 animate-pulse" /> ĐỒNG BỘ ĐÁM MÂY
          </span>
        </div>

        {/* Global Bot Kill Switch */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0b0e17] border border-[#1f293d]">
          <div>
            <span className="text-xs font-extrabold text-white block">
              BOT TỔNG TOÀN HỆ THỐNG
            </span>
            <span className="text-[10px] text-gray-400 block mt-0.5">
              Bật hoặc Dừng khẩn cấp copytrade của toàn bộ người dùng.
            </span>
          </div>

          <button
            onClick={handleToggleGlobalBot}
            disabled={updatingSystem}
            className={`px-3 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all ${
              systemConfig.globalBotActive
                ? 'bg-[#00df89] text-black shadow-[0_0_12px_rgba(0,223,137,0.3)] hover:opacity-90'
                : 'bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.4)] hover:opacity-90'
            }`}
          >
            {updatingSystem ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
            <span>{systemConfig.globalBotActive ? 'BOT ĐANG CHẠY' : 'ĐÃ DỪNG TỔNG'}</span>
          </button>
        </div>

        {/* Maintenance Mode Switch */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0b0e17] border border-[#1f293d]">
          <div>
            <span className="text-xs font-extrabold text-white block">
              CHẾ ĐỘ BẢO TRÌ HỆ THỐNG
            </span>
            <span className="text-[10px] text-gray-400 block mt-0.5">
              Tạm khóa nạp/rút và hiển thị banner thông báo bảo trì.
            </span>
          </div>

          <button
            onClick={handleToggleMaintenance}
            disabled={updatingSystem}
            className={`px-3 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all ${
              systemConfig.maintenanceMode
                ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.4)] hover:opacity-90'
                : 'bg-[#131927] text-gray-300 border border-[#1f293d] hover:text-white'
            }`}
          >
            {updatingSystem ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wrench className="w-3.5 h-3.5" />}
            <span>{systemConfig.maintenanceMode ? 'ĐANG BẢO TRÌ' : 'TRỰC TUYẾN'}</span>
          </button>
        </div>
      </div>

      {/* Granular Per-User Bot Controls */}
      <div className="spartan-card rounded-3xl p-5 border border-[#1f293d] space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
          <div className="flex items-center gap-2">
            <Power className="w-4 h-4 text-[#ff5500]" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              ĐIỀU KHIỂN BOT TỪNG CÁ NHÂN ({filteredUsers.length})
            </h3>
          </div>
          <span className="text-[10px] text-gray-400 font-mono">Tác chiến riêng lẻ</span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm tài khoản để bật / tắt bot..."
            className="w-full bg-[#0b0e17] border border-[#1f293d] rounded-xl py-2 pl-9 pr-3 text-white text-xs font-mono focus:outline-none focus:border-[#ff5500]"
          />
        </div>

        {/* User Bot Status List */}
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {filteredUsers.map((u) => {
            const isToggling = updatingUserId === u.telegramId;
            const isBotActive = u.botActive !== false;
            return (
              <div
                key={u.telegramId}
                className="flex items-center justify-between p-3 rounded-xl bg-[#0b0e17] border border-[#1f293d] text-xs font-mono"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white">@{u.username || 'user'}</span>
                    <span className="text-[10px] text-gray-500">ID: {u.telegramId}</span>
                  </div>
                  <span className="text-[10px] text-gray-400">
                    Vốn: ${u.tradingBalance?.toFixed(2) || '0.00'} USDT
                  </span>
                </div>

                <button
                  onClick={() => handleToggleUserBot(u.telegramId, isBotActive)}
                  disabled={isToggling}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 transition-all ${
                    isBotActive
                      ? 'bg-[#00df89]/20 text-[#00df89] border border-[#00df89]/40 hover:bg-[#00df89]/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                  }`}
                >
                  {isToggling ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <span className={`w-2 h-2 rounded-full ${isBotActive ? 'bg-[#00df89] shadow-[0_0_6px_#00df89]' : 'bg-red-500'}`} />
                  )}
                  <span>{isBotActive ? 'BOT ĐANG CHẠY' : 'BOT ĐÃ TẮT'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* System Health Status Monitor */}
      <div className="spartan-card rounded-3xl p-4 border border-[#1f293d] space-y-2 shadow-lg">
        <div className="flex items-center gap-2 border-b border-[#1f293d] pb-2">
          <Server className="w-4 h-4 text-[#ff5500]" />
          <h3 className="text-xs font-black text-white uppercase tracking-wider">
            SỨC KHỎE HẠ TẦNG MÁY CHỦ
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-1">
          <div className="bg-[#0b0e17] p-2.5 rounded-xl border border-[#1f293d]">
            <span className="text-[9px] text-gray-400 block mb-1">EXNESS MT5 EA</span>
            <span className="text-[10px] font-black text-[#00df89] bg-[#00df89]/10 px-2 py-0.5 rounded border border-[#00df89]/20">
              KẾT NỐI TỐT
            </span>
          </div>

          <div className="bg-[#0b0e17] p-2.5 rounded-xl border border-[#1f293d]">
            <span className="text-[9px] text-gray-400 block mb-1">TRONGRID SCAN</span>
            <span className="text-[10px] font-black text-[#00df89] bg-[#00df89]/10 px-2 py-0.5 rounded border border-[#00df89]/20">
              QUÉT 3S/LẦN
            </span>
          </div>

          <div className="bg-[#0b0e17] p-2.5 rounded-xl border border-[#1f293d]">
            <span className="text-[9px] text-gray-400 block mb-1">FIREBASE RTDB</span>
            <span className="text-[10px] font-black text-[#00df89] bg-[#00df89]/10 px-2 py-0.5 rounded border border-[#00df89]/20">
              TRỰC TUYẾN
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
