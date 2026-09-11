'use client';

import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Zap, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Power, 
  Activity, 
  Lock,
  ChevronDown
} from 'lucide-react';
import { apiFetch } from '@/lib/telegramClient';

interface Mt5DirectConnectCardProps {
  onConnectionSuccess?: () => void;
}

const SERVER_PRESETS = [
  'Exness-Real21',
  'Exness-Real1',
  'Exness-MT5Trial14',
  'ICMarketsSC-MT5-2',
  'XMGlobal-MT5',
];

export const Mt5DirectConnectCard: React.FC<Mt5DirectConnectCardProps> = ({
  onConnectionSuccess
}) => {
  const [accountNumber, setAccountNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [server, setServer] = useState('Exness-Real21');
  const [customServer, setCustomServer] = useState('');
  const [symbol, setSymbol] = useState('XAUUSD');
  const [riskMultiplier, setRiskMultiplier] = useState<number>(1.0);
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [connectionState, setConnectionState] = useState<any>(null);

  // Poll connection state
  const loadConnectionState = async () => {
    try {
      const res = await apiFetch<{ success: boolean; connection?: any }>('/api/ea/connect-mt5', {
        action: 'STATUS_CHECK'
      });
      if (res?.connection) {
        setConnectionState(res.connection);
        if (res.connection.accountNumber && !accountNumber) {
          setAccountNumber(res.connection.accountNumber);
        }
        if (res.connection.server && !server) {
          setServer(res.connection.server);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadConnectionState();
    const interval = setInterval(loadConnectionState, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setIsConnecting(true);

    const targetServer = server === 'CUSTOM' ? customServer.trim() : server;

    try {
      const data = await apiFetch<{ success: boolean; message?: string; connection?: any }>('/api/ea/connect-mt5', {
        action: 'CONNECT',
        accountNumber: accountNumber.trim(),
        password: password.trim(),
        server: targetServer,
        symbol: symbol.trim().toUpperCase(),
        riskMultiplier
      });

      if (data.success) {
        setStatusMsg({
          type: 'success',
          text: data.message || '🎉 Kết nối trực tiếp MT5 thành công!'
        });
        setConnectionState(data.connection);
        setPassword('');
        if (onConnectionSuccess) onConnectionSuccess();
      } else {
        setStatusMsg({
          type: 'error',
          text: (data as any).error || '❌ Kết nối thất bại. Vui lòng kiểm tra lại tài khoản và mật khẩu.'
        });
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || '❌ Lỗi kết nối máy chủ MT5.'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsConnecting(true);
    try {
      const data = await apiFetch<{ success: boolean; message?: string }>('/api/ea/connect-mt5', {
        action: 'DISCONNECT'
      });
      if (data.success) {
        setStatusMsg({
          type: 'success',
          text: '✓ Đã ngắt kết nối trực tiếp MT5.'
        });
        setConnectionState({ status: 'DISCONNECTED' });
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: '❌ Lỗi khi ngắt kết nối.'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const isConnected = connectionState?.status === 'CONNECTED';

  return (
    <div className="spartan-card rounded-3xl p-5 border border-[#221c10] bg-[#080b12] shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#221c10] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#d4af37]/15 text-[#f5d77f] border border-[#d4af37]/30 flex items-center justify-center font-black">
            <Zap className="w-5 h-5 text-[#f5d77f]" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              KẾT NỐI MT5 TRỰC TIẾP (DIRECT MT5 BRIDGE)
            </h3>
            <span className="text-[10px] text-[#d4af37] font-mono font-bold block">
              Tự động kết nối MT5 qua UI • Zero EA Installation
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold">
          <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-[#00df89] animate-pulse shadow-[0_0_8px_#00df89]' : 'bg-gray-500'}`} />
          <span className={isConnected ? 'text-[#00df89]' : 'text-gray-400'}>
            {isConnected ? 'LIVE CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>
      </div>

      {/* Connection Status Banner if Connected */}
      {isConnected && (
        <div className="bg-[#04060a] border border-[#d4af37]/40 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-[#d4af37] tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00df89]" />
              TÀI KHOẢN MT5 ĐANG TRỰC TUYẾN
            </span>
            <button
              onClick={handleDisconnect}
              disabled={isConnecting}
              className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 text-[10px] font-black uppercase flex items-center gap-1 transition-all"
            >
              <Power className="w-3 h-3" />
              <span>Ngắt Kết Nối</span>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 font-mono text-xs pt-1">
            <div className="bg-[#080b12] p-2.5 rounded-xl border border-[#221c10]">
              <span className="text-[9px] text-gray-400 block uppercase">MT5 LOGIN ID</span>
              <span className="font-black text-white">{connectionState.accountNumber}</span>
              <span className="text-[9px] text-gray-500 block truncate">{connectionState.server}</span>
            </div>

            <div className="bg-[#080b12] p-2.5 rounded-xl border border-[#221c10]">
              <span className="text-[9px] text-gray-400 block uppercase">SỐ DƯ (BALANCE)</span>
              <span className="font-black text-[#00df89]">${Number(connectionState.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="bg-[#080b12] p-2.5 rounded-xl border border-[#221c10]">
              <span className="text-[9px] text-gray-400 block uppercase">EQUITY RÒNG</span>
              <span className="font-black text-[#f5d77f]">${Number(connectionState.equity || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="bg-[#080b12] p-2.5 rounded-xl border border-[#221c10]">
              <span className="text-[9px] text-gray-400 block uppercase">HỆ SỐ RỦI RO</span>
              <span className="font-black text-cyan-400">{connectionState.riskMultiplier || 1.0}x ({connectionState.symbol || 'XAUUSD'})</span>
            </div>
          </div>
        </div>
      )}

      {/* Direct Credentials Form */}
      <form onSubmit={handleConnect} className="space-y-3.5">
        {/* Status Toast Message */}
        {statusMsg && (
          <div className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-[#00df89]/20 text-[#00df89] border border-[#00df89]/40'
              : 'bg-red-500/20 text-red-300 border border-red-500/40'
          }`}>
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* MT5 Account Number */}
          <div>
            <label className="text-[11px] font-bold text-gray-300 block mb-1">
              SỐ TÀI KHOẢN MT5 (ACCOUNT ID):
            </label>
            <input
              type="text"
              required
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Ví dụ: 98240291"
              className="w-full bg-[#04060a] border border-[#221c10] focus:border-[#d4af37] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none"
            />
          </div>

          {/* MT5 Trading Password */}
          <div>
            <label className="text-[11px] font-bold text-gray-300 block mb-1">
              MẬT KHẨU GIAO DỊCH MT5:
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu MT5..."
                className="w-full bg-[#04060a] border border-[#221c10] focus:border-[#d4af37] rounded-xl px-3.5 py-2.5 pr-10 text-xs text-white font-mono outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Server & Symbol Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Broker Server */}
          <div>
            <label className="text-[11px] font-bold text-gray-300 block mb-1">
              MÁY CHỦ SÀN (BROKER SERVER):
            </label>
            <select
              value={server}
              onChange={(e) => setServer(e.target.value)}
              className="w-full bg-[#04060a] border border-[#221c10] focus:border-[#d4af37] rounded-xl px-3 py-2.5 text-xs text-white font-mono outline-none cursor-pointer"
            >
              {SERVER_PRESETS.map((srv) => (
                <option key={srv} value={srv} className="bg-[#080b12] text-white">
                  {srv}
                </option>
              ))}
              <option value="CUSTOM" className="bg-[#080b12] text-amber-300">
                + Máy chủ tùy chỉnh khác...
              </option>
            </select>

            {server === 'CUSTOM' && (
              <input
                type="text"
                required
                value={customServer}
                onChange={(e) => setCustomServer(e.target.value)}
                placeholder="Nhập tên server (vd: Exness-Real25)"
                className="w-full bg-[#04060a] border border-[#221c10] focus:border-[#d4af37] rounded-xl px-3.5 py-2 mt-2 text-xs text-white font-mono outline-none"
              />
            )}
          </div>

          {/* Symbol & Risk Multiplier */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-gray-300 block mb-1">
                TÀI SẢN (SYMBOL):
              </label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full bg-[#04060a] border border-[#221c10] focus:border-[#d4af37] rounded-xl px-2.5 py-2.5 text-xs text-[#f5d77f] font-mono font-bold outline-none cursor-pointer"
              >
                <option value="XAUUSD" className="bg-[#080b12]">XAUUSD (Vàng)</option>
                <option value="BTCUSD" className="bg-[#080b12]">BTCUSD (Bitcoin)</option>
                <option value="EURUSD" className="bg-[#080b12]">EURUSD (Forex)</option>
                <option value="GBPUSD" className="bg-[#080b12]">GBPUSD (Forex)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-300 block mb-1">
                MỨC RỦI RO (RISK):
              </label>
              <select
                value={riskMultiplier}
                onChange={(e) => setRiskMultiplier(Number(e.target.value))}
                className="w-full bg-[#04060a] border border-[#221c10] focus:border-[#d4af37] rounded-xl px-2 py-2.5 text-xs text-cyan-300 font-mono font-bold outline-none cursor-pointer"
              >
                <option value={0.5} className="bg-[#080b12]">0.5x (Phòng thủ)</option>
                <option value={1.0} className="bg-[#080b12]">1.0x (Tiêu chuẩn)</option>
                <option value={1.5} className="bg-[#080b12]">1.5x (Tăng trưởng)</option>
                <option value={2.0} className="bg-[#080b12]">2.0x (Tốc chiến)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Connect Action Button */}
        <button
          type="submit"
          disabled={isConnecting}
          className="w-full py-3 rounded-2xl gold-btn-solid font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.98]"
        >
          {isConnecting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-black" />
              <span>ĐANG THẨM ĐỊNH KẾT NỐI METATRADER 5...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 text-black fill-black" />
              <span>{isConnected ? 'CẬP NHẬT KẾT NỐI MT5 TRỰC TIẾP' : 'KẾT NỐI MT5 TRỰC TIẾP (NO EA)'}</span>
            </>
          )}
        </button>
      </form>

      {/* Security Footnote */}
      <div className="bg-[#04060a] p-3 rounded-2xl border border-[#221c10] text-[10px] text-gray-400 leading-relaxed flex items-start gap-2">
        <Lock className="w-4 h-4 text-[#d4af37] flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white block">BẢO MẬT ĐỊNH CHẾ (INSTITUTIONAL ZERO-TRUST ENCRYPTION):</span>
          <span>
            Thông tin đăng nhập MT5 được mã hóa AES-256 trên cổng Gateway của Spartan Quant. Hệ thống chỉ đọc dữ liệu tài sản & gửi lệnh giao dịch tự động, không có quyền rút tiền hay can thiệp số dư cá nhân.
          </span>
        </div>
      </div>
    </div>
  );
};
