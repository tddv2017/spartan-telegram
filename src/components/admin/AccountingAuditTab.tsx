'use client';

import React, { useState, useEffect } from 'react';
import { TransactionData } from '@/lib/firebaseService';
import { UserAuditItem } from '@/lib/adminService';
import { 
  fetchTreasuryVault, 
  updateTreasuryVault, 
  fetchOnChainWalletBalance,
  TreasuryVaultConfig, 
  DEFAULT_TREASURY_VAULT 
} from '@/lib/walletConfig';
import { 
  DollarSign, 
  Receipt, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  ArrowDown, 
  ArrowUp, 
  Clock, 
  Layers, 
  ShieldCheck,
  TrendingUp,
  FileSpreadsheet,
  Wallet,
  Save,
  Loader2,
  Lock,
  Flame,
  QrCode,
  Copy,
  ChevronDown,
  ChevronUp,
  Settings2,
  ExternalLink,
  RefreshCw,
  ArrowRight
} from 'lucide-react';

interface AccountingAuditTabProps {
  transactions: TransactionData[];
  users: UserAuditItem[];
}

export const AccountingAuditTab: React.FC<AccountingAuditTabProps> = ({
  transactions,
  users,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'DEPOSIT' | 'WITHDRAW'>('ALL');
  
  // Treasury 2-Wallet Vault States
  const [vaultConfig, setVaultConfig] = useState<TreasuryVaultConfig>(DEFAULT_TREASURY_VAULT);
  const [isEditingWallets, setIsEditingWallets] = useState(false);
  const [isSavingVault, setIsSavingVault] = useState(false);
  const [vaultSaveStatus, setVaultSaveStatus] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isRefreshingBalances, setIsRefreshingBalances] = useState(false);

  // On-Chain Wallet Balances
  const [walletBalances, setWalletBalances] = useState<Record<string, { usdt: number; trx: number }>>({
    exness: { usdt: 0, trx: 0 },
    reserve: { usdt: 0, trx: 0 }
  });

  const loadVaultAndBalances = async () => {
    setIsRefreshingBalances(true);
    try {
      const cfg = await fetchTreasuryVault();
      setVaultConfig(cfg);

      const [exnBal, resBal] = await Promise.all([
        fetchOnChainWalletBalance(cfg.exnessMasterWallet),
        fetchOnChainWalletBalance(cfg.treasuryReserveWallet),
      ]);

      setWalletBalances({
        exness: exnBal,
        reserve: resBal
      });
    } catch (err) {
      console.error('Error loading 2-wallet balances:', err);
    } finally {
      setIsRefreshingBalances(false);
    }
  };

  useEffect(() => {
    loadVaultAndBalances();
  }, []);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveVault = async () => {
    setIsSavingVault(true);
    try {
      const success = await updateTreasuryVault(vaultConfig);
      if (success) {
        setVaultSaveStatus('✅ ĐÃ LƯU & ĐỒNG BỘ 2 ĐỊA CHỈ VÍ MASTER & DỰ PHÒNG THÀNH CÔNG!');
        loadVaultAndBalances();
        setIsEditingWallets(false); // Auto close edit form on save
      } else {
        setVaultSaveStatus('❌ Lỗi khi lưu cấu hình ví quỹ!');
      }
      setTimeout(() => setVaultSaveStatus(null), 4000);
    } finally {
      setIsSavingVault(false);
    }
  };

  // Compute Cashflow Totals
  const approvedDeposits = transactions.filter(t => t.type === 'DEPOSIT' && t.status === 'APPROVED');
  const approvedWithdrawals = transactions.filter(t => t.type === 'WITHDRAW' && t.status === 'APPROVED');

  const totalGrossDeposit = approvedDeposits.reduce((acc, t) => acc + (t.grossAmount || 0), 0);
  const totalDepositFees = approvedDeposits.reduce((acc, t) => acc + (t.feeAmount || 0), 0);
  const totalNetDeposit = approvedDeposits.reduce((acc, t) => acc + (t.netAmount || 0), 0);

  const totalGrossWithdraw = approvedWithdrawals.reduce((acc, t) => acc + (t.grossAmount || 0), 0);
  const totalWithdrawFees = approvedWithdrawals.reduce((acc, t) => acc + (t.feeAmount || 0), 0);
  const totalNetWithdraw = approvedWithdrawals.reduce((acc, t) => acc + (t.netAmount || 0), 0);

  // 10% Treasury Retention from withdrawals
  const totalTreasuryRetained = totalGrossWithdraw * 0.10;
  const totalNetworkResellerRebates = users.reduce((acc, u) => acc + (u.referralBalance || 0), 0);

  // Total Live TVL on Exness
  const totalTVL = users.reduce((sum, u) => sum + (u.tradingBalance || 0), 0);

  // Filtered transactions for audit
  const filteredTxs = transactions.filter(tx => {
    const matchType = filterType === 'ALL' || tx.type === filterType;
    const matchSearch = !searchTerm.trim() || 
      (tx.username && tx.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tx.userId && String(tx.userId).includes(searchTerm)) ||
      (tx.memoCode && tx.memoCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tx.id && tx.id.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchType && matchSearch;
  });

  return (
    <div className="space-y-4">
      {/* Toast Save Status */}
      {vaultSaveStatus && (
        <div className="p-3 bg-amber-500/20 border border-amber-500 rounded-2xl text-amber-300 text-xs font-bold flex items-center gap-2 animate-bounce">
          <ShieldCheck className="w-4 h-4 flex-shrink-0 text-amber-400" />
          <span>{vaultSaveStatus}</span>
        </div>
      )}

      {/* Financial Executive Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Inflow */}
        <div className="bg-[#0b0e17] p-4 rounded-2xl border border-[#1f293d] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">TỔNG TIỀN NẠP VÀO MASTER (GROSS)</span>
            <ArrowDown className="w-3.5 h-3.5 text-[#00df89]" />
          </div>
          <div className="text-lg font-black text-[#00df89] font-mono">
            ${totalGrossDeposit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-gray-500 font-mono">
            Phí Nạp Đã Thu (9%): <strong className="text-amber-400">+${totalDepositFees.toFixed(2)} USD</strong>
          </div>
        </div>

        {/* Total Outflow */}
        <div className="bg-[#0b0e17] p-4 rounded-2xl border border-[#1f293d] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">TỔNG TIỀN RÚT TỪ MASTER (GROSS)</span>
            <ArrowUp className="w-3.5 h-3.5 text-[#ff2d55]" />
          </div>
          <div className="text-lg font-black text-[#ff2d55] font-mono">
            ${totalGrossWithdraw.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-gray-500 font-mono">
            Phí Rút Đã Thu (19%): <strong className="text-amber-400">+${totalWithdrawFees.toFixed(2)} USD</strong>
          </div>
        </div>
      </div>

      {/* BẢNG QUẢN LÝ 2 VÍ CỐT LÕI: MASTER EXNESS & QUỸ DỰ PHÒNG */}
      <div className="spartan-card rounded-3xl p-5 border border-amber-500/40 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-amber-400" />
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                QUẢN LÝ BỘ 2 VÍ: MASTER EXNESS & QUỸ DỰ PHÒNG
              </h3>
              <span className="text-[9px] text-gray-400 font-mono block">
                Khách nạp thẳng Master $\rightarrow$ Rút trích 10% Quỹ Dự Phòng $\rightarrow$ Trả số còn lại cho khách
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={loadVaultAndBalances}
              disabled={isRefreshingBalances}
              className="p-2 rounded-xl bg-[#0b0e17] border border-[#1f293d] text-gray-300 hover:text-white transition-colors"
              title="Làm mới số dư on-chain"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingBalances ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            <button
              onClick={() => setIsEditingWallets(!isEditingWallets)}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-[10px] font-black uppercase flex items-center gap-1 transition-all"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>{isEditingWallets ? 'Đóng Sửa' : 'Sửa Địa Chỉ 2 Ví'}</span>
            </button>
          </div>
        </div>

        {/* LƯỚI 2 CỘT HIỂN THỊ 2 VÍ CHÍNH */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">

          {/* 1. VÍ MASTER EXNESS ECN (NẠP TRỰC TIẾP & GIAO DỊCH EA) */}
          <div className="bg-[#0b0e17] p-4 rounded-2xl border border-amber-500/50 space-y-2.5 relative overflow-hidden shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
                  🏦
                </div>
                <div>
                  <span className="text-xs font-black text-amber-300 uppercase tracking-wide block">
                    1. VÍ MASTER EXNESS ECN
                  </span>
                  <span className="text-[9px] text-gray-400 font-mono">Khách nạp thẳng & Chạy Bot Scalping</span>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                MASTER POOL
              </span>
            </div>

            {/* Balance Display */}
            <div className="bg-[#131927] p-3 rounded-xl border border-[#1f293d] flex items-center justify-between">
              <div>
                <span className="text-[9px] text-gray-400 font-bold block">TỔNG VỐN GIAO DỊCH (TVL):</span>
                <span className="text-lg font-black text-amber-300 font-mono">
                  ${totalTVL.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-gray-400 font-bold block">SỐ DƯ ON-CHAIN:</span>
                <span className="text-xs font-black text-[#00df89] font-mono block">
                  ${walletBalances.exness.usdt.toFixed(2)} USDT
                </span>
                <span className="text-[9px] text-gray-500 font-mono">{walletBalances.exness.trx.toFixed(1)} TRX</span>
              </div>
            </div>

            {/* Address & Copy */}
            <div className="flex items-center justify-between text-[10px] font-mono pt-1 text-gray-400">
              <span className="truncate max-w-[200px]" title={vaultConfig.exnessMasterWallet}>
                {vaultConfig.exnessMasterWallet.slice(0, 8)}...{vaultConfig.exnessMasterWallet.slice(-6)}
              </span>
              <button
                onClick={() => handleCopy('exness', vaultConfig.exnessMasterWallet)}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-bold"
              >
                {copiedKey === 'exness' ? <CheckCircle2 className="w-3 h-3 text-[#00df89]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'exness' ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>
          </div>

          {/* 2. VÍ QUỸ DỰ PHÒNG (10% TRÍCH GIỮ TỪ LỆNH RÚT) */}
          <div className="bg-[#0b0e17] p-4 rounded-2xl border border-purple-500/50 space-y-2.5 relative overflow-hidden shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-black">
                  🛡️
                </div>
                <div>
                  <span className="text-xs font-black text-purple-300 uppercase tracking-wide block">
                    2. VÍ QUỸ DỰ PHÒNG (10%)
                  </span>
                  <span className="text-[9px] text-gray-400 font-mono">Trích giữ 10% từ mỗi lệnh rút tiền</span>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                TREASURY RESERVE
              </span>
            </div>

            {/* Balance Display */}
            <div className="bg-[#131927] p-3 rounded-xl border border-[#1f293d] flex items-center justify-between">
              <div>
                <span className="text-[9px] text-gray-400 font-bold block">TÍCH LŨY 10% TỪ RÚT VỐN:</span>
                <span className="text-lg font-black text-purple-300 font-mono">
                  ${totalTreasuryRetained.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-gray-400 font-bold block">SỐ DƯ ON-CHAIN:</span>
                <span className="text-xs font-black text-purple-300 font-mono block">
                  ${walletBalances.reserve.usdt.toFixed(2)} USDT
                </span>
                <span className="text-[9px] text-gray-500 font-mono">{walletBalances.reserve.trx.toFixed(1)} TRX</span>
              </div>
            </div>

            {/* Address & Copy */}
            <div className="flex items-center justify-between text-[10px] font-mono pt-1 text-gray-400">
              <span className="truncate max-w-[200px]" title={vaultConfig.treasuryReserveWallet}>
                {vaultConfig.treasuryReserveWallet.slice(0, 8)}...{vaultConfig.treasuryReserveWallet.slice(-6)}
              </span>
              <button
                onClick={() => handleCopy('reserve', vaultConfig.treasuryReserveWallet)}
                className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-bold"
              >
                {copiedKey === 'reserve' ? <CheckCircle2 className="w-3 h-3 text-[#00df89]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'reserve' ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>
          </div>

        </div>

        {/* SƠ ĐỒ LUỒNG RÚT TIỀN TỰ ĐỘNG (CLEAR WITHDRAWAL WORKFLOW) */}
        <div className="bg-[#0b0e17] p-3.5 rounded-2xl border border-[#1f293d] space-y-2 text-xs font-mono">
          <span className="text-[10px] font-black text-gray-300 uppercase tracking-wider block border-b border-[#1f293d] pb-1.5 flex items-center gap-1.5">
            <ArrowRight className="w-3.5 h-3.5 text-amber-400" /> QUY TRÌNH XỬ LÝ DÒNG TIỀN KHI KHÁCH RÚT TIỀN (VÍ DỤ $200 USDT):
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-[11px]">
            <div className="bg-[#131927] p-2.5 rounded-xl border border-purple-500/30">
              <span className="text-gray-400 text-[9px] block">1. TRÍCH SANG VÍ DỰ PHÒNG (10%):</span>
              <strong className="text-purple-300">+$20.00 USDT</strong>
              <span className="text-[9px] text-gray-500 block">(Nằm trong 19% phí rút)</span>
            </div>
            <div className="bg-[#131927] p-2.5 rounded-xl border border-[#00df89]/30">
              <span className="text-gray-400 text-[9px] block">2. THỰC CHUYỂN CHO KHÁCH (NET):</span>
              <strong className="text-[#00df89]">+$157.00 USDT</strong>
              <span className="text-[9px] text-gray-500 block">(Đã trừ 19% phí + $5 gas)</span>
            </div>
            <div className="bg-[#131927] p-2.5 rounded-xl border border-amber-500/30">
              <span className="text-gray-400 text-[9px] block">3. LỢI NHUẬN TẠI MASTER (9%):</span>
              <strong className="text-amber-300">+$18.00 USDT</strong>
              <span className="text-[9px] text-gray-500 block">(Phí vận hành giữ lại)</span>
            </div>
          </div>
        </div>

        {/* PHẦN CHỈNH SỬA ĐỊA CHỈ 2 VÍ (MẶC ĐỊNH ẨN - KHI CẦN BẤM SỬA SẼ BUNG RA) */}
        {isEditingWallets && (
          <div className="pt-3 border-t border-[#1f293d] space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Settings2 className="w-3.5 h-3.5" /> BẢNG CẬP NHẬT 2 ĐỊA CHỈ VÍ MASTER & DỰ PHÒNG
              </span>
              <span className="text-[10px] text-gray-400 font-mono">Đồng bộ tức thì lên mã QR Nạp tiền</span>
            </div>

            <div className="space-y-2.5 text-xs">
              {/* Input 1: Master Exness */}
              <div>
                <label className="text-[10px] font-bold text-amber-400 block mb-1">
                  1. Địa chỉ Ví Master Exness ECN (TRC20 - Khách nạp thẳng vào đây):
                </label>
                <input
                  type="text"
                  value={vaultConfig.exnessMasterWallet}
                  onChange={(e) => setVaultConfig({ ...vaultConfig, exnessMasterWallet: e.target.value })}
                  className="w-full bg-[#0b0e17] border border-amber-500/40 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Input 2: Treasury Reserve */}
              <div>
                <label className="text-[10px] font-bold text-purple-400 block mb-1">
                  2. Địa chỉ Ví Quỹ Dự Phòng (TRC20 - Nhận 10% trích từ mỗi lệnh rút):
                </label>
                <input
                  type="text"
                  value={vaultConfig.treasuryReserveWallet}
                  onChange={(e) => setVaultConfig({ ...vaultConfig, treasuryReserveWallet: e.target.value })}
                  className="w-full bg-[#0b0e17] border border-purple-500/40 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            {/* Nút Lưu Cấu Hình */}
            <div className="flex items-center gap-2 pt-1 font-sans">
              <button
                onClick={handleSaveVault}
                disabled={isSavingVault}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-[#ff5500] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:opacity-90 shadow-md transition-all"
              >
                {isSavingVault ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Save className="w-4 h-4 text-black" />}
                <span>LƯU & ĐỒNG BỘ 2 VÍ TOÀN APP</span>
              </button>

              <button
                onClick={() => setIsEditingWallets(false)}
                className="px-4 py-2.5 rounded-xl bg-[#0b0e17] text-gray-400 hover:text-white border border-[#1f293d] text-xs font-black uppercase"
              >
                HỦY
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sổ cái Thu - Chi & Hoa hồng F1 */}
      <div className="spartan-card rounded-3xl p-4 border border-[#1f293d] space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-2">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#ff5500]" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              SỔ CÁI QUỸ TREASURY & HOA HỒNG ĐẠI LÝ
            </h3>
          </div>
          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 font-mono">
            ĐÃ KIỂM TOÁN KHỚP 100%
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="bg-[#0b0e17] p-3 rounded-xl border border-[#1f293d]">
            <span className="text-[10px] text-gray-400 block mb-0.5">TRÍCH GIỮ QUỸ DỰ PHÒNG (10%):</span>
            <span className="text-sm font-black text-purple-300">
              ${totalTreasuryRetained.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
            </span>
          </div>

          <div className="bg-[#0b0e17] p-3 rounded-xl border border-[#1f293d]">
            <span className="text-[10px] text-gray-400 block mb-0.5">TỔNG HOA HỒNG ĐÃ CHI TRẢ:</span>
            <span className="text-sm font-black text-[#00df89]">
              ${totalNetworkResellerRebates.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
            </span>
          </div>
        </div>
      </div>

      {/* 3-Way Invoice Audit Table */}
      <div className="spartan-card rounded-3xl p-4 border border-[#1f293d] space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              NHẬT KÝ ĐỐI SOÁT HÓA ĐƠN 3 CHIỀU ({filteredTxs.length})
            </h3>
          </div>
          <div className="flex items-center gap-1">
            {([
              { id: 'ALL', label: 'TẤT CẢ' },
              { id: 'DEPOSIT', label: 'NẠP TIỀN' },
              { id: 'WITHDRAW', label: 'RÚT TIỀN' },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setFilterType(t.id as any)}
                className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                  filterType === t.id
                    ? 'bg-[#ff5500] text-white shadow-sm'
                    : 'bg-[#0b0e17] text-gray-400 hover:text-white border border-[#1f293d]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Box */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo Username, Telegram ID, Mã Memo hoặc Mã đơn..."
            className="w-full bg-[#0b0e17] border border-[#1f293d] rounded-xl py-2 pl-9 pr-3 text-white text-xs font-mono focus:outline-none focus:border-[#ff5500]"
          />
        </div>

        {/* Invoices List */}
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {filteredTxs.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-500 font-bold bg-[#0b0e17] rounded-xl">
              Không tìm thấy bản ghi hóa đơn phù hợp
            </div>
          ) : (
            filteredTxs.map((tx) => (
              <div
                key={tx.id || tx.memoCode}
                className="p-3 rounded-xl bg-[#0b0e17] border border-[#1f293d] space-y-1.5 text-xs font-mono"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${
                      tx.type === 'DEPOSIT' ? 'bg-[#00df89]/15 text-[#00df89] border-[#00df89]/30' : 'bg-[#ff2d55]/15 text-[#ff2d55] border-[#ff2d55]/30'
                    }`}>
                      {tx.type === 'DEPOSIT' ? 'NẠP' : 'RÚT'}
                    </span>
                    <span className="font-extrabold text-white">@{tx.username || 'user'}</span>
                    <span className="text-[10px] text-gray-500">ID: {tx.userId}</span>
                  </div>

                  <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${
                    tx.status === 'APPROVED' ? 'bg-[#00df89]/15 text-[#00df89] border-[#00df89]/30' : tx.status === 'PENDING' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'
                  }`}>
                    {tx.status === 'APPROVED' ? 'ĐÃ DUYỆT' : tx.status === 'PENDING' ? 'CHỜ DUYỆT' : 'TỪ CHỐI'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-[#131927] p-2 rounded-lg text-[10px]">
                  <div>
                    <span className="text-gray-400 block text-[8px]">YÊU CẦU (GROSS):</span>
                    <span className="font-black text-white">${tx.grossAmount?.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[8px]">PHÍ ĐÃ KHẤU TRỪ:</span>
                    <span className="font-black text-amber-400">-${tx.feeAmount?.toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-400 block text-[8px]">THỰC NHẬN (NET):</span>
                    <span className={`font-black ${tx.type === 'DEPOSIT' ? 'text-[#00df89]' : 'text-[#ff2d55]'}`}>
                      ${tx.netAmount?.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[9px] text-gray-500 pt-0.5">
                  <span className="truncate">Mã Memo: <strong className="text-gray-300">{tx.memoCode}</strong></span>
                  <span>Mã Đơn: {tx.id}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
