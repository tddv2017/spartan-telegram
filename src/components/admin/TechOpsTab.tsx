'use client';

import React, { useState, useEffect } from 'react';
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
  Wifi, 
  Download, 
  Copy, 
  CheckCircle2, 
  ExternalLink,
  Zap
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
  const [signalChannel, setSignalChannel] = useState(systemConfig.signalChannelId || '');
  const [testingSignal, setTestingSignal] = useState(false);
  const [signalResult, setSignalResult] = useState<string | null>(null);
  const [savingChannel, setSavingChannel] = useState(false);

  // Live EA Master Pool State
  const [masterPool, setMasterPool] = useState<any>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    let isSubscribed = true;
    const fetchMasterPool = async () => {
      try {
        const res = await fetch("https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app/master_pool.json");
        if (res.ok) {
          const data = await res.json();
          if (isSubscribed && data) setMasterPool(data);
        }
      } catch (e) {}
    };

    fetchMasterPool();
    const interval = setInterval(fetchMasterPool, 5000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, []);

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

      {/* 🚀 CẦU NỐI EA METATRADER 4/5 (EXNESS BRIDGE) */}
      <div className="spartan-card rounded-3xl p-5 border border-amber-500/30 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              CẦU NỐI METATRADER 4/5 EA (EXNESS REALTIME BRIDGE)
            </h3>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold">
            <span className={`w-2 h-2 rounded-full ${masterPool?.status === 'ONLINE' ? 'bg-[#00df89] animate-ping' : 'bg-gray-500'}`} />
            <span className={masterPool?.status === 'ONLINE' ? 'text-[#00df89]' : 'text-gray-400'}>
              {masterPool?.status === 'ONLINE' ? 'EA ONLINE (KẾT NỐI)' : 'CHƯA CÓ KẾT NỐI'}
            </span>
          </div>
        </div>

        {/* Master Pool Live Stats */}
        {masterPool ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 bg-[#0b0e17] p-3.5 rounded-2xl border border-[#1f293d] font-mono text-xs">
            <div>
              <span className="text-[9px] text-gray-500 block uppercase">TÀI KHOẢN MASTER</span>
              <span className="font-black text-white">{masterPool.accountNumber || '98240291'}</span>
              <span className="text-[9px] text-gray-400 block">{masterPool.broker || 'Exness'}</span>
            </div>
            <div>
              <span className="text-[9px] text-gray-500 block uppercase">SỐ DƯ (BALANCE)</span>
              <span className="font-black text-[#00df89]">${Number(masterPool.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-[9px] text-gray-500 block uppercase">TÀI SẢN RÒNG (EQUITY)</span>
              <span className="font-black text-amber-300">${Number(masterPool.equity || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-[9px] text-gray-500 block uppercase">LÃI TẠM TÍNH (FLOAT PNL)</span>
              <span className={`font-black ${Number(masterPool.floatingProfit || 0) >= 0 ? 'text-[#00df89]' : 'text-red-400'}`}>
                {Number(masterPool.floatingProfit || 0) >= 0 ? '+' : ''}${Number(masterPool.floatingProfit || 0).toFixed(2)}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-[#0b0e17] border border-[#1f293d] text-center text-xs text-gray-400 font-mono">
            Chưa nhận được tín hiệu Heartbeat từ EA MT5. Vui lòng cài đặt EA vào MT5 Exness bên dưới.
          </div>
        )}

        {/* Webhook & API Key Copy Boxes */}
        <div className="space-y-2 text-xs font-mono">
          <div>
            <label className="text-[10px] text-gray-400 font-bold block mb-1">
              1. WEBHOOK API URL (Điền vào EA hoặc cho phép trong MT5 WebRequest):
            </label>
            <div className="flex items-center gap-2 bg-[#0b0e17] border border-[#1f293d] p-2 rounded-xl">
              <span className="text-amber-300 text-[11px] truncate flex-1 select-all">
                https://spartan-telegram.vercel.app/api/ea/webhook
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText("https://spartan-telegram.vercel.app/api/ea/webhook");
                  setCopiedUrl(true);
                  setTimeout(() => setCopiedUrl(false), 2000);
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-[10px] font-bold flex items-center gap-1"
              >
                {copiedUrl ? <CheckCircle2 className="w-3 h-3 text-[#00df89]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedUrl ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-400 font-bold block mb-1">
              2. KHÓA BẢO MẬT EA (API SECRET KEY):
            </label>
            <div className="flex items-center gap-2 bg-[#0b0e17] border border-[#1f293d] p-2 rounded-xl">
              <span className="text-[#00df89] text-[11px] font-bold truncate flex-1 select-all">
                SPARTAN_EA_LIVE_2026
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText("SPARTAN_EA_LIVE_2026");
                  setCopiedKey(true);
                  setTimeout(() => setCopiedKey(false), 2000);
                }}
                className="px-2.5 py-1 rounded-lg bg-[#00df89]/20 text-[#00df89] hover:bg-[#00df89]/30 text-[10px] font-bold flex items-center gap-1"
              >
                {copiedKey ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Download Buttons for MQL5 and MQL4 */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <a
            href="/ea/SpartanBridgeEA.mq5"
            download="SpartanBridgeEA.mq5"
            className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-[#ff5500] hover:opacity-90 text-black font-black text-xs uppercase flex items-center justify-center gap-2 shadow-md transition-all text-center"
          >
            <Download className="w-4 h-4" />
            <span>TẢI EA CHO MT5 (.MQ5)</span>
          </a>

          <a
            href="/ea/SpartanBridgeEA.mq4"
            download="SpartanBridgeEA.mq4"
            className="py-2.5 px-3 rounded-xl bg-[#131927] hover:bg-[#1f293d] border border-[#1f293d] text-white font-black text-xs uppercase flex items-center justify-center gap-2 transition-all text-center"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>TẢI EA CHO MT4 (.MQ4)</span>
          </a>
        </div>

        {/* Quick Instructions */}
        <div className="bg-[#0b0e17] p-3 rounded-2xl border border-[#1f293d] text-[10px] text-gray-400 leading-relaxed space-y-1">
          <span className="font-bold text-white block">📖 HƯỚNG DẪN CÀI ĐẶT NHANH VÀO METATRADER:</span>
          <div>1. Mở MT5/MT4 -&gt; Bấm <strong className="text-white">Ctrl + O</strong> -&gt; Tab <strong className="text-white">Expert Advisors</strong> -&gt; Tích chọn <strong className="text-amber-300">Allow WebRequest for listed URL</strong> -&gt; Thêm URL: <strong className="text-amber-300">https://spartan-telegram.vercel.app</strong></div>
          <div>2. Tải file <strong className="text-white">SpartanBridgeEA.mq5</strong> ở trên -&gt; Bỏ vào thư mục <strong className="text-white">MQL5/Experts</strong> (hoặc MQL4/Experts) -&gt; Biên dịch (F7) -&gt; Kéo thả vào bất kỳ biểu đồ nào (VD: XAUUSD).</div>
          <div>3. Điền Khóa API: <strong className="text-[#00df89]">SPARTAN_EA_LIVE_2026</strong> -&gt; Bấm OK. Mọi lệnh đóng và số dư sẽ tự động nhảy lên Mini App realtime 0.01s!</div>
        </div>
      </div>

      {/* Telegram Live Signal Broadcast Channel Card */}
      <div className="spartan-card rounded-3xl p-5 border border-[#1f293d] space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#ff5500] animate-pulse" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              KÊNH TELEGRAM BẮN TÍN HIỆU LIVE (SIGNAL BROADCAST)
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold text-[#00df89] bg-[#00df89]/10 px-2 py-0.5 rounded-full border border-[#00df89]/20">
            AUTO BROADCAST
          </span>
        </div>

        <p className="text-xs text-gray-400 leading-relaxed">
          Mỗi khi EA trên MetaTrader 5 chốt lời thành công, hệ thống sẽ tự động phát tín hiệu kèm nút bấm mở Mini App vào Channel hoặc Group Telegram của bạn để thu hút nhà đầu tư mới!
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-300 block mb-1">
              TELEGRAM CHANNEL / GROUP USERNAME HOẶC CHAT ID:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={signalChannel}
                onChange={(e) => setSignalChannel(e.target.value)}
                placeholder="Ví dụ: @SpartanQuant_Signals hoặc -100xxxxxxxxxx"
                className="flex-1 bg-[#0b0e17] border border-[#1f293d] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-[#ff5500] outline-none"
              />
              <button
                type="button"
                onClick={async () => {
                  setSavingChannel(true);
                  try {
                    await updateSystemConfig({ signalChannelId: signalChannel.trim() });
                    setSignalResult(`✓ Đã lưu cấu hình Kênh tín hiệu: ${signalChannel.trim()}`);
                    onRefresh();
                  } catch (e: any) {
                    setSignalResult(`Lỗi lưu kênh: ${e.message}`);
                  } finally {
                    setSavingChannel(false);
                  }
                }}
                disabled={savingChannel}
                className="px-4 py-2.5 rounded-xl spartan-orange-btn font-black text-xs uppercase"
              >
                {savingChannel ? 'Đang lưu...' : 'Lưu Kênh'}
              </button>
            </div>
          </div>

          {/* Test Signal Button */}
          <div className="pt-1 flex items-center gap-2">
            <button
              type="button"
              disabled={testingSignal || !signalChannel}
              onClick={async () => {
                setTestingSignal(true);
                setSignalResult(null);
                try {
                  const res = await fetch('/api/broadcast-signal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      channelId: signalChannel.trim(),
                      symbol: 'XAUUSD',
                      type: 'BUY',
                      lots: 0.5,
                      pnl: 365.00,
                      pnlPercentage: 1.46,
                      openPrice: 2498.50,
                      closePrice: 2505.80,
                      isTest: true
                    })
                  });
                  const data = await res.json();
                  if (data.success) {
                    setSignalResult(`🎉 THÀNH CÔNG: ${data.message}`);
                  } else {
                    setSignalResult(`⚠️ LỖI: ${data.message}`);
                  }
                } catch (err: any) {
                  setSignalResult(`⚠️ Lỗi kết nối: ${err.message}`);
                } finally {
                  setTestingSignal(false);
                }
              }}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 hover:opacity-90 text-white font-black text-xs uppercase flex items-center gap-1.5 shadow-md transition-all"
            >
              {testingSignal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              <span>⚡ BẮN THỬ TÍN HIỆU VÀO KÊNH (TEST SIGNAL)</span>
            </button>
          </div>

          {signalResult && (
            <div className={`p-3 rounded-xl text-xs font-bold ${
              signalResult.includes('THÀNH CÔNG') || signalResult.includes('✓')
                ? 'bg-[#00df89]/20 text-[#00df89] border border-[#00df89]/40'
                : 'bg-red-500/20 text-red-300 border border-red-500/40'
            }`}>
              {signalResult}
            </div>
          )}

          <div className="bg-[#0b0e17] p-3 rounded-2xl border border-[#1f293d] text-[10px] text-gray-400 leading-relaxed space-y-1">
            <span className="font-bold text-amber-300 block">💡 HƯỚNG DẪN KẾT NỐI KÊNH TELEGRAM:</span>
            <div>1. Tạo 1 Kênh (Channel) hoặc Nhóm Telegram mới (hoặc dùng kênh hiện có).</div>
            <div>2. Thêm con bot <strong className="text-white">@SpartanQuantAIBot</strong> vào Kênh đó.</div>
            <div>3. Cấp quyền <strong className="text-white">Quản trị viên (Admin)</strong> kèm quyền <strong className="text-[#00df89]">Đăng tin nhắn (Post Messages)</strong> cho bot.</div>
            <div>4. Điền Username kênh (vd: <strong className="text-cyan-300">@SpartanQuant_Signals</strong>) vào ô trên rồi bấm <strong className="text-white">Bắn Thử Tín Hiệu</strong> để kiểm tra!</div>
          </div>
        </div>
      </div>

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
