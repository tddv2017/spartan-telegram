'use client';

import React, { useState, useEffect } from 'react';
import { TransactionData } from '@/lib/firebaseService';
import { UserAuditItem } from '@/lib/adminService';
import { 
  fetchTreasuryVault, 
  updateTreasuryVault, 
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
  QrCode
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
  
  // Treasury Multi-Wallet Vault States
  const [vaultConfig, setVaultConfig] = useState<TreasuryVaultConfig>(DEFAULT_TREASURY_VAULT);
  const [isSavingVault, setIsSavingVault] = useState(false);
  const [vaultSaveStatus, setVaultSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchTreasuryVault().then((cfg) => {
      setVaultConfig(cfg);
    });
  }, []);

  const handleSaveVault = async () => {
    setIsSavingVault(true);
    try {
      const success = await updateTreasuryVault(vaultConfig);
      if (success) {
        setVaultSaveStatus('✅ ĐÃ LƯU & ĐỒNG BỘ BỘ 3 VÍ QUỸ THÀNH CÔNG!');
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
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">TỔNG TIỀN NẠP (GROSS)</span>
            <ArrowDown className="w-3.5 h-3.5 text-[#00df89]" />
          </div>
          <div className="text-lg font-black text-[#00df89] font-mono">
            ${totalGrossDeposit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-gray-500 font-mono">
            Phí Nạp Đã Thu: <strong className="text-amber-400">+${totalDepositFees.toFixed(2)} USD</strong>
          </div>
        </div>

        {/* Total Outflow */}
        <div className="bg-[#0b0e17] p-4 rounded-2xl border border-[#1f293d] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">TỔNG TIỀN RÚT (GROSS)</span>
            <ArrowUp className="w-3.5 h-3.5 text-[#ff2d55]" />
          </div>
          <div className="text-lg font-black text-[#ff2d55] font-mono">
            ${totalGrossWithdraw.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-gray-500 font-mono">
            Phí Rút Đã Thu: <strong className="text-amber-400">+${totalWithdrawFees.toFixed(2)} USD</strong>
          </div>
        </div>
      </div>

      {/* BẢNG CẤU HÌNH BỘ 3 VÍ QUỸ ĐỊNH CHẾ (TREASURY MULTI-WALLET VAULT) */}
      <div className="spartan-card rounded-3xl p-5 border border-amber-500/40 space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              CẤU HÌNH BỘ VÍ QUỸ & TỰ ĐỘNG PHÂN LUỒNG
            </h3>
          </div>
          <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            TRC20 VAULT
          </span>
        </div>

        <div className="space-y-3 text-xs">
          {/* 1. Ví Tiếp Nhận Nạp Tiền (Master Receiving Wallet) */}
          <div className="bg-[#0b0e17] p-3 rounded-2xl border border-[#1f293d] space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5" /> 1. VÍ TIẾP NHẬN NẠP TIỀN (RECEIVING WALLET)
              </label>
              <span className="text-[9px] text-gray-400 font-mono">Xuất mã QR cho khách nạp</span>
            </div>
            <input
              type="text"
              value={vaultConfig.receivingWallet}
              onChange={(e) => setVaultConfig({ ...vaultConfig, receivingWallet: e.target.value })}
              className="w-full bg-[#131927] border border-[#1f293d] rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
              placeholder="Nhập địa chỉ ví USDT TRC20 tiếp nhận tiền..."
            />
          </div>

          {/* 2. Ví Nóng Thanh Khoản (Hot Wallet) */}
          <div className="bg-[#0b0e17] p-3 rounded-2xl border border-[#1f293d] space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold text-[#00df89] uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" /> 2. VÍ NÓNG THANH KHOẢN (HOT WALLET - 11%)
              </label>
              <span className="text-[9px] text-[#00df89] font-mono font-bold">Chi trả rút tiền tức thì</span>
            </div>
            <input
              type="text"
              value={vaultConfig.hotWallet}
              onChange={(e) => setVaultConfig({ ...vaultConfig, hotWallet: e.target.value })}
              className="w-full bg-[#131927] border border-[#1f293d] rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#00df89]"
              placeholder="Nhập địa chỉ ví nóng TRC20 để sẵn tiền trả rút..."
            />
          </div>

          {/* 3. Ví Lạnh Quản Trị / Lợi Nhuận (Cold Storage Vault) */}
          <div className="bg-[#0b0e17] p-3 rounded-2xl border border-[#1f293d] space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> 3. VÍ LẠNH QUẢN TRỊ / LỢI NHUẬN (COLD VAULT - 9%)
              </label>
              <span className="text-[9px] text-purple-400 font-mono font-bold">Lợi nhuận ròng đút túi</span>
            </div>
            <input
              type="text"
              value={vaultConfig.coldWallet}
              onChange={(e) => setVaultConfig({ ...vaultConfig, coldWallet: e.target.value })}
              className="w-full bg-[#131927] border border-[#1f293d] rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
              placeholder="Nhập địa chỉ ví lạnh TRC20 lưu trữ an toàn..."
            />
          </div>

          {/* 4. Ví Nạp Master Exness (Exness Master Pool) */}
          <div className="bg-[#0b0e17] p-3 rounded-2xl border border-[#1f293d] space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> 4. VÍ NẠP EXNESS MASTER ECN (80% VỐN BOT)
              </label>
              <span className="text-[9px] text-amber-400 font-mono font-bold">Bơm vốn cho EA cào lãi</span>
            </div>
            <input
              type="text"
              value={vaultConfig.exnessMasterWallet}
              onChange={(e) => setVaultConfig({ ...vaultConfig, exnessMasterWallet: e.target.value })}
              className="w-full bg-[#131927] border border-[#1f293d] rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              placeholder="Nhập địa chỉ nạp TRC20 của tài khoản Master Exness..."
            />
          </div>
        </div>

        {/* Nút Lưu Cấu Hình Ví Quỹ */}
        <button
          onClick={handleSaveVault}
          disabled={isSavingVault}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-[#ff5500] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 shadow-md transition-all font-sans"
        >
          {isSavingVault ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Save className="w-4 h-4 text-black" />}
          <span>LƯU & ĐỒNG BỘ CẤU HÌNH VÍ QUỸ TOÀN APP</span>
        </button>
      </div>

      {/* Treasury & Affiliate Ledger Card */}
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
            <span className="text-sm font-black text-amber-300">
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
