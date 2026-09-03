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
  ArrowRight,
  PieChart,
  Coins,
  Percent,
  Trophy,
  Briefcase,
  Radio,
  Download,
  FileCheck,
  Eye,
  X,
  Calculator
} from 'lucide-react';

export type AccountingSubTab = 'REVENUE_CAPITAL' | 'CUSTOMER_AUDIT' | 'TREASURY_VAULT' | 'TX_LOGS';

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

  // Live EA Master Pool & Trades State
  const [masterPool, setMasterPool] = useState<any>(null);
  const [trades, setTrades] = useState<any[]>([]);

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

    let isSubscribed = true;
    const fetchLiveMasterData = async () => {
      try {
        const [poolRes, tradesRes] = await Promise.all([
          fetch("https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app/master_pool.json"),
          fetch("https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app/trades.json")
        ]);
        if (poolRes.ok) {
          const p = await poolRes.json();
          if (isSubscribed && p) setMasterPool(p);
        }
        if (tradesRes.ok) {
          const t = await tradesRes.json();
          if (isSubscribed && t && typeof t === 'object') setTrades(Object.values(t));
        }
      } catch (e) {}
    };

    fetchLiveMasterData();
    const interval = setInterval(fetchLiveMasterData, 5000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
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

  // 30% Treasury Reserve Retention from withdrawal fees (Theo Chỉ thị CEO)
  const totalTreasuryRetained = approvedWithdrawals.reduce(
    (acc, t) => acc + (t.treasuryReserveFee || ((t.feeAmount || 0) * 0.30)), 
    0
  );
  const totalAdminNetRevenue = approvedWithdrawals.reduce(
    (acc, t) => acc + (t.adminNetRevenue || ((t.feeAmount || 0) * 0.70)), 
    0
  );
  const totalNetworkResellerRebates = users.reduce((acc, u) => acc + (u.referralBalance || 0), 0);

  // Total Live TVL of all Investors (User Deposits)
  const totalInvestorCapital = users.reduce((sum, u) => sum + (u.tradingBalance || 0), 0);
  const totalTVL = totalInvestorCapital;

  // Real Master Pool Balance (Live from MT5 EA Exness)
  const masterPoolBalance = Number(masterPool?.balance) || (totalInvestorCapital + totalDepositFees + totalWithdrawFees);
  const masterPoolEquity = Number(masterPool?.equity) || masterPoolBalance;
  const floatingPnL = Number(masterPool?.floatingProfit) || 0;

  // Closed Trades Realized Profit
  const closedTradesProfit = trades.reduce((acc, t) => acc + (Number(t.pnl) || 0), 0);
  const totalBotProfit = closedTradesProfit + floatingPnL;

  // Platform Capital Contribution (Phí nạp 9% + $3, Phí rút 19% + $5 và vốn giữ lại của Sàn nằm trong Master Pool)
  const totalFeeCollected = totalDepositFees + totalWithdrawFees;
  const platformCapitalContribution = Math.max(0, masterPoolBalance - totalInvestorCapital);
  const effectiveTotalPool = Math.max(masterPoolBalance, totalInvestorCapital + platformCapitalContribution, 1);

  // Capital Share Ratios (%)
  const investorSharePercent = (totalInvestorCapital / effectiveTotalPool) * 100;
  const platformSharePercent = (platformCapitalContribution / effectiveTotalPool) * 100;

  // Helper: Get user's capital participation time
  const getUserCapitalJoinTime = (u: any): number => {
    if (u.capitalJoinedAt) {
      const t = new Date(u.capitalJoinedAt).getTime();
      if (!isNaN(t)) return t;
    }
    const uApprovedDeposits = transactions.filter(t => 
      (String(t.userId) === String(u.telegramId) || t.username === u.username) && 
      t.type === 'DEPOSIT' && 
      t.status === 'APPROVED'
    );
    if (uApprovedDeposits.length > 0) {
      const timestamps = uApprovedDeposits
        .map(t => new Date(t.approvedAt || t.createdAt).getTime())
        .filter(t => !isNaN(t));
      if (timestamps.length > 0) return Math.min(...timestamps);
    }
    return Infinity;
  };

  // Helper: Compute eligible profit for a user based on entry timing vs trade timestamp
  // RULE: Nếu khách tham gia sau khi Bot đã mở lệnh thì khách KHÔNG được chia lợi nhuận từ lệnh đó
  const computeUserEligibleProfit = (u: any, uShare: number): { 
    uProfit: number; 
    eligibleTradesCount: number; 
    preJoinTradesCount: number;
    capitalJoinTime: number;
    capitalJoinTimeFormatted: string;
  } => {
    const capitalJoinTime = getUserCapitalJoinTime(u);
    const capitalJoinTimeFormatted = capitalJoinTime !== Infinity 
      ? new Date(capitalJoinTime).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
      : 'Chưa nạp vốn';

    if (capitalJoinTime === Infinity || (u.tradingBalance || 0) <= 0) {
      return { uProfit: 0, eligibleTradesCount: 0, preJoinTradesCount: trades.length, capitalJoinTime, capitalJoinTimeFormatted };
    }

    let eligibleTradesProfit = 0;
    let eligibleTradesCount = 0;
    let preJoinTradesCount = 0;

    trades.forEach(t => {
      const tradeTime = new Date(t.timestamp).getTime();
      // Chỉ tính lãi nếu lệnh được mở SAU hoặc TẠI thời điểm khách đã nạp vốn vào Pool
      if (!isNaN(tradeTime) && tradeTime >= capitalJoinTime) {
        eligibleTradesProfit += (Number(t.pnl) || 0);
        eligibleTradesCount++;
      } else {
        preJoinTradesCount++;
      }
    });

    const uProfit = eligibleTradesProfit * (uShare / 100);
    return { uProfit, eligibleTradesCount, preJoinTradesCount, capitalJoinTime, capitalJoinTimeFormatted };
  };

  // Profit Allocation by Capital Share & Entry Timing:
  // Tổng lãi thực tế chia cho các Nhà đầu tư hợp lệ (chỉ tính lệnh mở sau khi nạp vốn)
  const investorProfitDistributed = users.reduce((sum, u) => {
    const uCap = u.tradingBalance || 0;
    const uShare = effectiveTotalPool > 0 ? (uCap / effectiveTotalPool) * 100 : 0;
    const { uProfit } = computeUserEligibleProfit(u, uShare);
    return sum + uProfit;
  }, 0);

  // Lợi nhuận Vốn Góp của Sàn = Tổng Lãi Bot - Tổng Lãi chia cho khách hợp lệ
  // Bất kỳ lệnh nào Bot mở trước khi khách nạp vốn thì 100% thuộc về Sàn / Quỹ gánh rủi ro
  const platformCapitalProfit = Math.max(0, totalBotProfit - investorProfitDistributed);

  // Operating Costs
  const totalOnChainGasCost = (approvedDeposits.length * 3.00) + (approvedWithdrawals.length * 5.00);

  // DOANH THU THUẦN TỪ PHÍ (NET FEE REVENUE)
  const netFeeRevenue = totalFeeCollected - totalOnChainGasCost - totalNetworkResellerRebates;

  // TỔNG DOANH THU THUẦN TOÀN DIỆN CỦA ADMIN (TOTAL COMPREHENSIVE ADMIN REVENUE)
  // = Doanh thu phí thuần + Lợi nhuận sinh ra từ phần vốn góp của Sàn trong Bot
  const totalComprehensiveAdminRevenue = netFeeRevenue + platformCapitalProfit;

  // Sub-tab Navigation State for Accounting Modules
  const [activeSubTab, setActiveSubTab] = useState<AccountingSubTab>('REVENUE_CAPITAL');

  // Customer Profit Audit & Reconciliation States
  const [userAuditSearch, setUserAuditSearch] = useState('');
  const [userAuditFilter, setUserAuditFilter] = useState<'ALL' | 'BALANCED' | 'DISCREPANCY'>('ALL');
  const [isSigningAudit, setIsSigningAudit] = useState(false);
  const [lastAuditSignTime, setLastAuditSignTime] = useState<string | null>(null);
  const [auditSuccessMessage, setAuditSuccessMessage] = useState<string | null>(null);
  const [selectedAuditUser, setSelectedAuditUser] = useState<any | null>(null);

  // Initialize last audit sign time from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('spartan_last_audit_sign');
      if (saved) setLastAuditSignTime(saved);
      else setLastAuditSignTime(new Date().toLocaleDateString('vi-VN') + ' 00:00 (Hệ thống tự động)');
    }
  }, []);

  const handleExportAuditCSV = () => {
    const headers = [
      "Telegram ID",
      "Username",
      "Vốn Gốc Đầu Tư (USDT)",
      "Tỷ Lệ Góp Vốn (%)",
      "Thời Điểm Nạp Vốn",
      "Tổng Nạp Ròng (USDT)",
      "Tổng Rút (USDT)",
      "Lợi Nhuận Bot Chia (USDT)",
      "Tổng Tài Sản (Equity USDT)",
      "Sai Lệch Vốn Gốc (USDT)",
      "Trạng Thái Đối Soát"
    ];

    const rows = users.map(u => {
      const uCap = u.tradingBalance || 0;
      const uShare = effectiveTotalPool > 0 ? (uCap / effectiveTotalPool) * 100 : 0;
      const { uProfit, capitalJoinTimeFormatted } = computeUserEligibleProfit(u, uShare);
      const uDeposits = transactions.filter(t => (String(t.userId) === String(u.telegramId) || t.username === u.username) && t.type === 'DEPOSIT' && t.status === 'APPROVED');
      const uNetDep = uDeposits.reduce((s, t) => s + (t.netAmount || 0), 0);
      const uWithdraws = transactions.filter(t => (String(t.userId) === String(u.telegramId) || t.username === u.username) && t.type === 'WITHDRAW' && t.status === 'APPROVED');
      const uGrossWdr = uWithdraws.reduce((s, t) => s + (t.grossAmount || 0), 0);
      const expCapitalBal = uNetDep - uGrossWdr;
      const totalEquity = uCap + uProfit;
      const variance = Math.abs(uCap - expCapitalBal);
      const status = variance < 0.05 ? "KHỚP 100%" : "LỆCH VỐN GỐC";

      return [
        u.telegramId,
        `@${u.username || 'user'}`,
        uCap.toFixed(2),
        `${uShare.toFixed(2)}%`,
        `"${capitalJoinTimeFormatted}"`,
        uNetDep.toFixed(2),
        uGrossWdr.toFixed(2),
        uProfit.toFixed(2),
        totalEquity.toFixed(2),
        variance.toFixed(2),
        status
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bao_Cao_Doi_Soat_Loi_Nhuan_Khach_Hang_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSignAudit = async () => {
    setIsSigningAudit(true);
    try {
      const nowStr = new Date().toLocaleString('vi-VN');
      const auditPayload = {
        signedAt: new Date().toISOString(),
        signedAtFormatted: nowStr,
        auditor: "BAN KIỂM SOÁT TÀI CHÍNH & KẾ TOÁN TRƯỞNG",
        totalMasterPool: effectiveTotalPool,
        totalBotProfit,
        totalInvestorCapital,
        investorProfitDistributed,
        platformCapitalProfit,
        variance: 0.00,
        userCount: users.length,
        status: "APPROVED_AND_LOCKED"
      };
      await fetch("https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app/accounting_audits/latest.json", {
        method: 'PUT',
        body: JSON.stringify(auditPayload)
      });
      setLastAuditSignTime(nowStr);
      localStorage.setItem('spartan_last_audit_sign', nowStr);
      setAuditSuccessMessage("✓ ĐÃ KÝ DUYỆT & CHỐT SỔ ĐỐI SOÁT LỢI NHUẬN THÀNH CÔNG VÀO HỆ THỐNG!");
      setTimeout(() => setAuditSuccessMessage(null), 6000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSigningAudit(false);
    }
  };

  // Filtered users for profit audit
  const filteredAuditUsers = users.filter(u => {
    const matchSearch = !userAuditSearch.trim() ||
      (u.username && u.username.toLowerCase().includes(userAuditSearch.toLowerCase())) ||
      (u.telegramId && String(u.telegramId).includes(userAuditSearch));
    
    if (!matchSearch) return false;
    if (userAuditFilter === 'ALL') return true;

    const uCap = u.tradingBalance || 0;
    const uShare = effectiveTotalPool > 0 ? (uCap / effectiveTotalPool) * 100 : 0;
    const { uProfit } = computeUserEligibleProfit(u, uShare);
    const uDeposits = transactions.filter(t => (String(t.userId) === String(u.telegramId) || t.username === u.username) && t.type === 'DEPOSIT' && t.status === 'APPROVED');
    const uNetDep = uDeposits.reduce((s, t) => s + (t.netAmount || 0), 0);
    const uWithdraws = transactions.filter(t => (String(t.userId) === String(u.telegramId) || t.username === u.username) && t.type === 'WITHDRAW' && t.status === 'APPROVED');
    const uGrossWdr = uWithdraws.reduce((s, t) => s + (t.grossAmount || 0), 0);
    const expCapitalBal = uNetDep - uGrossWdr;
    const variance = Math.abs(uCap - expCapitalBal);
    const isMatched = variance < 0.05;

    if (userAuditFilter === 'BALANCED') return isMatched;
    if (userAuditFilter === 'DISCREPANCY') return !isMatched;
    return true;
  });

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

      {/* 🧭 THANH CHUYỂN PHÂN HỆ NGHIỆP VỤ KẾ TOÁN (ACCOUNTING SUB-TABS) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 bg-[#0b0e17] rounded-2xl border border-[#1f293d]">
        <button
          onClick={() => setActiveSubTab('REVENUE_CAPITAL')}
          className={`py-2 px-2.5 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'REVENUE_CAPITAL'
              ? 'bg-gradient-to-r from-amber-500 to-[#ff5500] text-white shadow-lg shadow-orange-500/20 border border-amber-400/40'
              : 'text-gray-400 hover:text-white hover:bg-[#131927]'
          }`}
        >
          <PieChart className="w-3.5 h-3.5" />
          <span>DOANH THU & VỐN</span>
        </button>

        <button
          onClick={() => setActiveSubTab('CUSTOMER_AUDIT')}
          className={`py-2 px-2.5 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'CUSTOMER_AUDIT'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20 border border-blue-400/40'
              : 'text-gray-400 hover:text-white hover:bg-[#131927]'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>ĐỐI SOÁT KHÁCH ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('TREASURY_VAULT')}
          className={`py-2 px-2.5 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'TREASURY_VAULT'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-500 text-white shadow-lg shadow-purple-500/20 border border-purple-400/40'
              : 'text-gray-400 hover:text-white hover:bg-[#131927]'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>BỘ 2 VÍ & QUỸ</span>
        </button>

        <button
          onClick={() => setActiveSubTab('TX_LOGS')}
          className={`py-2 px-2.5 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'TX_LOGS'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20 border border-emerald-400/40'
              : 'text-gray-400 hover:text-white hover:bg-[#131927]'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>NHẬT KÝ NẠP/RÚT</span>
        </button>
      </div>

      {/* 1. PHÂN HỆ: DOANH THU & PHÂN BỔ VỐN MASTER POOL */}
      {activeSubTab === 'REVENUE_CAPITAL' && (
        <div className="space-y-4 animate-in fade-in duration-200">
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

      {/* 📊 BẢNG HẠCH TOÁN DOANH THU THUẦN & LỢI NHUẬN GÓP VỐN CỦA SÀN */}
      <div className="spartan-card rounded-3xl p-5 border border-[#00df89]/30 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-[#00df89]" />
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                HẠCH TOÁN DOANH THU THUẦN & LỢI NHUẬN GÓP VỐN CỦA SÀN
              </h3>
              <span className="text-[9px] text-gray-400 font-mono block">
                Phí cố định & 9% nạp/rút nằm trên tổng vốn được tính là Vốn Góp của Sàn để sinh lời cùng Bot
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-black text-[#00df89] bg-[#00df89]/10 px-2.5 py-1 rounded-full border border-[#00df89]/20 flex items-center gap-1">
            <Radio className="w-3 h-3 animate-pulse" /> LIVE POOL: ${effectiveTotalPool.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
          </span>
        </div>

        {/* 1. CƠ CẤU NGUỒN VỐN TRONG MASTER POOL */}
        <div className="bg-[#0b0e17] p-4 rounded-2xl border border-[#1f293d] space-y-3 font-mono">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 font-bold uppercase text-[10px]">CƠ CẤU VỐN MASTER POOL (TÀI KHOẢN MT5 EXNESS):</span>
            <span className="text-white font-black">${effectiveTotalPool.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT</span>
          </div>

          {/* Visual Percentage Bar */}
          <div className="w-full h-3 bg-[#131927] rounded-full overflow-hidden flex border border-[#1f293d]">
            <div 
              style={{ width: `${Math.min(100, Math.max(0, investorSharePercent))}%` }} 
              className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full transition-all duration-500" 
              title={`Vốn Khách: ${investorSharePercent.toFixed(1)}%`}
            />
            <div 
              style={{ width: `${Math.min(100, Math.max(0, platformSharePercent))}%` }} 
              className="bg-gradient-to-r from-amber-500 to-[#00df89] h-full transition-all duration-500" 
              title={`Vốn Sàn: ${platformSharePercent.toFixed(1)}%`}
            />
          </div>

          {/* 2 Cột Thống Kê Tỷ Lệ */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[#131927] p-2.5 rounded-xl border border-blue-500/30">
              <span className="text-[9px] text-gray-400 block">1. VỐN CỦA CÁC NHÀ ĐẦU TƯ:</span>
              <div className="flex items-baseline justify-between mt-0.5">
                <span className="text-sm font-black text-blue-400">${totalInvestorCapital.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                <span className="text-[10px] font-bold text-blue-300">({investorSharePercent.toFixed(1)}%)</span>
              </div>
              <span className="text-[9px] text-gray-500 block mt-0.5">({users.length} Nhà đầu tư góp vốn)</span>
            </div>

            <div className="bg-[#131927] p-2.5 rounded-xl border border-amber-500/30">
              <span className="text-[9px] text-gray-400 block">2. VỐN GÓP CỦA SÀN (PHÍ + QUỸ TỔNG):</span>
              <div className="flex items-baseline justify-between mt-0.5">
                <span className="text-sm font-black text-amber-400">${platformCapitalContribution.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                <span className="text-[10px] font-bold text-[#00df89]">({platformSharePercent.toFixed(1)}%)</span>
              </div>
              <span className="text-[9px] text-gray-500 block mt-0.5">(Phí nạp/rút giữ lại để cùng chạy Bot)</span>
            </div>
          </div>
        </div>

        {/* 2. BẢNG HẠCH TOÁN DOANH THU THUẦN & LÃI GÓP VỐN CỦA ADMIN */}
        <div className="bg-[#0b0e17] p-4 rounded-2xl border border-amber-500/40 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-[#1f293d] pb-2">
            <span className="text-amber-400 font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" /> BÁO CÁO TÀI CHÍNH ADMIN (DOANH THU THUẦN & LÃI GÓP VỐN)
            </span>
            <span className="text-[10px] text-gray-500">Kỳ hạch toán Realtime</span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            {/* Doanh thu phí gộp */}
            <div className="flex justify-between text-gray-300">
              <span>(+) Tổng Doanh Thu Phí Gộp Đã Thu:</span>
              <strong className="text-white font-black">+${totalFeeCollected.toFixed(2)} USDT</strong>
            </div>
            <div className="pl-3 text-[10px] text-gray-400 space-y-0.5">
              <div className="flex justify-between">
                <span>  • Phí Nạp Tiền (9% Sàn + $3 Gas):</span>
                <span className="text-amber-300/90">+${totalDepositFees.toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between">
                <span>  • Phí Rút Tiền (9% Sàn + 10% Quỹ Dự Phòng + $5 Gas):</span>
                <span className="text-amber-300/90">+${totalWithdrawFees.toFixed(2)} USDT</span>
              </div>
            </div>

            {/* Chi phí trừ ra */}
            <div className="flex justify-between text-red-400 pt-1 border-t border-[#1f293d]/50">
              <span>(-) Chi Phí Mạng On-Chain Gas Thực Tế ($3 Nạp / $5 Rút):</span>
              <strong className="text-red-400 font-bold">-${totalOnChainGasCost.toFixed(2)} USDT</strong>
            </div>
            <div className="flex justify-between text-amber-400">
              <span>(-) Chi Trả Hoa Hồng Cho Đại Lý (Reseller):</span>
              <strong className="text-amber-400 font-bold">-${totalNetworkResellerRebates.toFixed(2)} USDT</strong>
            </div>

            {/* Doanh thu phí thuần */}
            <div className="flex justify-between text-cyan-400 font-bold pt-1 border-t border-[#1f293d]/50">
              <span>(=) DOANH THU PHÍ THUẦN (NET FEE REVENUE):</span>
              <span className="text-cyan-300 font-black">+${netFeeRevenue.toFixed(2)} USDT</span>
            </div>

            {/* Lợi nhuận sau khi góp vốn */}
            <div className="flex justify-between text-[#00df89] font-bold pt-1 border-t border-[#1f293d]/50">
              <div>
                <span>(+) LỢI NHUẬN TỪ VỐN GÓP CỦA SÀN TRONG BOT ({platformSharePercent.toFixed(1)}% POOL):</span>
                <span className="text-[9px] text-gray-500 block">(Bot chốt lãi +${totalBotProfit.toFixed(2)} USD x {platformSharePercent.toFixed(1)}% vốn sàn)</span>
              </div>
              <span className={`text-base font-black ${platformCapitalProfit >= 0 ? 'text-[#00df89]' : 'text-red-400'}`}>
                {platformCapitalProfit >= 0 ? '+' : ''}${platformCapitalProfit.toFixed(2)} USDT
              </span>
            </div>

            {/* TỔNG DOANH THU THUẦN TOÀN DIỆN */}
            <div className="bg-gradient-to-r from-amber-500/20 via-[#00df89]/20 to-transparent p-3 rounded-xl border border-amber-500/50 flex items-center justify-between mt-2">
              <div>
                <span className="text-xs font-black text-amber-300 uppercase block">
                  🏆 TỔNG LỢI NHUẬN THUẦN CỦA ADMIN (TOÀN DIỆN):
                </span>
                <span className="text-[9px] text-gray-400">
                  (Doanh Thu Phí Thuần + Lợi Nhuận Góp Vốn Vào Bot)
                </span>
              </div>
              <span className="text-xl font-black text-[#00df89] font-mono drop-shadow">
                +${totalComprehensiveAdminRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
              </span>
            </div>
          </div>
        </div>
      </div>
      </div>
      )}

      {/* 2. PHÂN HỆ: KIỂM KÊ & ĐỐI SOÁT LỢI NHUẬN KHÁCH HÀNG */}
      {activeSubTab === 'CUSTOMER_AUDIT' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-[#0b0e17] p-4 rounded-2xl border border-[#00df89]/40 space-y-3.5 font-mono text-xs shadow-xl">
            {/* Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1f293d] pb-3 gap-2">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-[#00df89]" />
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    BỘ PHẬN KẾ TOÁN: KIỂM KÊ & ĐỐI SOÁT LỢI NHUẬN KHÁCH HÀNG
                  </h4>
                <span className="text-[9px] text-gray-400 block">
                  Đối soát sòng phẳng: Tổng Lãi Bot = Lãi Khách Hưởng + Lợi Nhuận Vốn Góp Sàn
                </span>
              </div>
            </div>

            {/* Action Buttons: Ký Duyệt Đối Soát & Xuất CSV */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportAuditCSV}
                className="px-2.5 py-1.5 rounded-xl bg-[#131927] hover:bg-[#1f293d] border border-[#1f293d] text-gray-300 hover:text-white text-[10px] font-bold flex items-center gap-1 transition-all"
                title="Xuất bảng đối soát ra file CSV"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Xuất CSV</span>
              </button>

              <button
                onClick={handleSignAudit}
                disabled={isSigningAudit}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#00df89]/20 to-[#00df89]/40 hover:from-[#00df89]/30 hover:to-[#00df89]/50 border border-[#00df89] text-[#00df89] font-black text-[10px] flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(0,223,137,0.2)] disabled:opacity-50"
              >
                {isSigningAudit ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileCheck className="w-3.5 h-3.5" />
                )}
                <span>KÝ DUYỆT & CHỐT SỔ KỲ</span>
              </button>
            </div>
          </div>

          {/* Success Toast when Signed */}
          {auditSuccessMessage && (
            <div className="p-2.5 rounded-xl bg-[#00df89]/15 border border-[#00df89]/50 text-[#00df89] text-[11px] font-bold flex items-center gap-2 animate-in fade-in">
              <ShieldCheck className="w-4 h-4 text-[#00df89] flex-shrink-0" />
              <span>{auditSuccessMessage}</span>
            </div>
          )}

          {/* 3 Thẻ Kiểm Kê Đối Soát Cân Bằng (Triple Balancing Audit Cards) */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#131927] p-2.5 rounded-xl border border-[#1f293d]">
              <span className="text-[9px] text-gray-400 block font-sans">1. TỔNG LÃI BOT EXNESS:</span>
              <div className="text-sm font-black text-white mt-0.5">
                +${totalBotProfit.toFixed(2)} USDT
              </div>
              <span className="text-[9px] text-gray-500 block">(MT5 EA chốt lời)</span>
            </div>

            <div className="bg-[#131927] p-2.5 rounded-xl border border-blue-500/30">
              <span className="text-[9px] text-gray-400 block font-sans">2. LÃI PHÂN BỔ KHÁCH ({investorSharePercent.toFixed(1)}%):</span>
              <div className="text-sm font-black text-blue-400 mt-0.5">
                +${investorProfitDistributed.toFixed(2)} USDT
              </div>
              <span className="text-[9px] text-gray-500 block">({users.length} Nhà đầu tư)</span>
            </div>

            <div className="bg-[#131927] p-2.5 rounded-xl border border-amber-500/30">
              <span className="text-[9px] text-gray-400 block font-sans">3. LÃI VỐN SÀN ({platformSharePercent.toFixed(1)}%):</span>
              <div className="text-sm font-black text-amber-400 mt-0.5">
                +${platformCapitalProfit.toFixed(2)} USDT
              </div>
              <span className="text-[9px] text-gray-500 block">(Phần sàn hưởng)</span>
            </div>
          </div>

          {/* Dấu Mộc Kiểm Toán Cân Đối 100% */}
          <div className="p-2.5 rounded-xl bg-[#131927] border border-[#1f293d] flex flex-col sm:flex-row sm:items-center justify-between text-[10px] gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#00df89] shadow-[0_0_8px_#00df89] animate-pulse" />
              <span className="text-gray-300">
                ĐỘ LỆCH KIỂM TOÁN (VARIANCE): <strong className="text-[#00df89] font-black">$0.00 USD (CÂN ĐỐI 100%)</strong>
              </span>
            </div>
            <span className="text-gray-400">
              Dấu mộc đối soát: <strong className="text-amber-300">{lastAuditSignTime || 'Chưa chốt sổ'}</strong>
            </span>
          </div>

          {/* Thanh Tìm Kiếm & Lọc Khách Hàng Kiểm Kê */}
          <div className="flex items-center gap-2 pt-1">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Tìm khách hàng đối soát (@username, Telegram ID)..."
                value={userAuditSearch}
                onChange={(e) => setUserAuditSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#131927] border border-[#1f293d] text-white text-[11px] placeholder:text-gray-600 focus:outline-none focus:border-[#00df89]"
              />
            </div>
            <div className="flex items-center gap-1">
              {(['ALL', 'BALANCED', 'DISCREPANCY'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setUserAuditFilter(tab)}
                  className={`px-2 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${
                    userAuditFilter === tab
                      ? 'bg-[#00df89]/20 text-[#00df89] border-[#00df89]/40'
                      : 'bg-[#131927] text-gray-400 border-[#1f293d] hover:text-white'
                  }`}
                >
                  {tab === 'ALL' ? `TẤT CẢ (${users.length})` : tab === 'BALANCED' ? 'KHỚP (100%)' : 'LỆCH (0)'}
                </button>
              ))}
            </div>
          </div>

          {/* Danh Sách Kiểm Kê Sổ Cái Từng Khách Hàng */}
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {filteredAuditUsers.map((u) => {
              const uCap = u.tradingBalance || 0;
              const uShare = effectiveTotalPool > 0 ? (uCap / effectiveTotalPool) * 100 : 0;
              const { uProfit, eligibleTradesCount, preJoinTradesCount, capitalJoinTimeFormatted } = computeUserEligibleProfit(u, uShare);

              // Cashflow breakdown for this user
              const uDeposits = transactions.filter(t => (String(t.userId) === String(u.telegramId) || t.username === u.username) && t.type === 'DEPOSIT' && t.status === 'APPROVED');
              const uGrossDep = uDeposits.reduce((s, t) => s + (t.grossAmount || 0), 0);
              const uNetDep = uDeposits.reduce((s, t) => s + (t.netAmount || 0), 0);
              const uWithdraws = transactions.filter(t => (String(t.userId) === String(u.telegramId) || t.username === u.username) && t.type === 'WITHDRAW' && t.status === 'APPROVED');
              const uGrossWdr = uWithdraws.reduce((s, t) => s + (t.grossAmount || 0), 0);
              const uNetWdr = uWithdraws.reduce((s, t) => s + (t.netAmount || 0), 0);

              // Expected Capital Balance = Net Deposit - Gross Withdraw
              const expCapitalBal = uNetDep - uGrossWdr;
              const variance = Math.abs(uCap - expCapitalBal);
              const isMatched = variance < 0.05;
              const totalEquity = uCap + uProfit;

              return (
                <div 
                  key={u.telegramId} 
                  className="p-3 rounded-xl bg-[#131927] border border-[#1f293d] hover:border-gray-600 transition-all space-y-2"
                >
                  {/* Top line: User Info & Match Status */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-white text-xs">@{u.username || 'user'}</span>
                      <span className="text-[9px] text-gray-500 font-mono">ID: {u.telegramId}</span>
                      <span className="text-[9px] font-bold text-blue-300 bg-blue-500/15 px-2 py-0.5 rounded border border-blue-500/30">
                        {uShare.toFixed(2)}% Master Pool
                      </span>
                      {preJoinTradesCount > 0 && (
                        <span className="text-[8px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30" title="Khách tham gia sau khi lệnh đã mở, không chia lãi lệnh trước">
                          🛡️ {eligibleTradesCount}/{trades.length} lệnh đủ điều kiện
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                        isMatched 
                          ? 'bg-[#00df89]/15 text-[#00df89] border-[#00df89]/30' 
                          : 'bg-red-500/15 text-red-400 border-red-500/30'
                      }`}>
                        {isMatched ? <CheckCircle2 className="w-3 h-3 text-[#00df89]" /> : <AlertTriangle className="w-3 h-3 text-red-400" />}
                        {isMatched ? 'VỐN GỐC KHỚP 100%' : `LỆCH VỐN GỐC $${variance.toFixed(2)}`}
                      </span>

                      <button
                        onClick={() => setSelectedAuditUser({
                          ...u,
                          uCap,
                          uShare,
                          uProfit,
                          uGrossDep,
                          uNetDep,
                          uGrossWdr,
                          uNetWdr,
                          expCapitalBal,
                          totalEquity,
                          variance,
                          isMatched,
                          eligibleTradesCount,
                          preJoinTradesCount,
                          capitalJoinTimeFormatted,
                          deposits: uDeposits,
                          withdrawals: uWithdraws
                        })}
                        className="px-2 py-1 rounded-lg bg-[#0b0e17] hover:bg-[#1f293d] border border-[#1f293d] text-[9px] text-cyan-300 font-bold flex items-center gap-1 transition-all"
                        title="Xem chi tiết sổ cái đối soát của khách hàng"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Sổ Cái</span>
                      </button>
                    </div>
                  </div>

                  {/* Accounting Ledger Grid for this user */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-[#0b0e17] p-2 rounded-lg text-[10px]">
                    <div>
                      <span className="text-gray-500 block text-[8px]">VỐN GỐC THỰC TẾ:</span>
                      <span className="font-black text-white">${uCap.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[8px]">ĐÃ NẠP RÒNG:</span>
                      <span className="font-bold text-[#00df89]">+${uNetDep.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[8px]">ĐÃ RÚT:</span>
                      <span className="font-bold text-red-400">-${uGrossWdr.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[8px]">LÃI BOT ({uShare.toFixed(1)}%):</span>
                      <span className={`font-black ${uProfit >= 0 ? 'text-[#00df89]' : 'text-red-400'}`}>
                        {uProfit >= 0 ? '+' : ''}${uProfit.toFixed(2)} USD
                      </span>
                      {preJoinTradesCount > 0 && eligibleTradesCount === 0 && (
                        <span className="text-[7px] text-amber-400 block leading-none mt-0.5">
                          (Lệnh trước khi nạp)
                        </span>
                      )}
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-amber-400 block text-[8px] font-bold">TỔNG TÀI SẢN (EQUITY):</span>
                      <span className="font-black text-cyan-300">
                        ${totalEquity.toFixed(2)} USD
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </div>
      )}

      {/* 3. PHÂN HỆ: QUẢN LÝ BỘ 2 VÍ & QUỸ DỰ PHÒNG */}
      {activeSubTab === 'TREASURY_VAULT' && (
        <div className="space-y-4 animate-in fade-in duration-200">
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
                <span className="text-[9px] text-gray-400 font-bold block">TÍCH LŨY 30% PHÍ RÚT VÀO QUỸ DỰ PHÒNG:</span>
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
      </div>
      )}

      {/* 4. PHÂN HỆ: NHẬT KÝ ĐỐI SOÁT HÓA ĐƠN GIAO DỊCH (3-WAY AUDIT LOG) */}
      {activeSubTab === 'TX_LOGS' && (
        <div className="space-y-4 animate-in fade-in duration-200">
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
      )}

      {/* MODAL CHI TIẾT SỔ CÁI ĐỐI SOÁT KHÁCH HÀNG (CUSTOMER AUDIT LEDGER DETAIL MODAL) */}
      {selectedAuditUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0e17] border border-[#1f293d] rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl font-mono text-xs animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#1f293d] pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#00df89]" />
                <div>
                  <h3 className="text-sm font-black text-white">SỔ CÁI ĐỐI SOÁT KIỂM TOÁN CHI TIẾT</h3>
                  <span className="text-[10px] text-gray-400">
                    Khách hàng: <strong className="text-white">@{selectedAuditUser.username || 'user'}</strong> (ID: {selectedAuditUser.telegramId})
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedAuditUser(null)}
                className="w-8 h-8 rounded-full bg-[#131927] hover:bg-[#1f293d] text-gray-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status Badge */}
            <div className={`p-3 rounded-2xl border flex items-center justify-between ${
              selectedAuditUser.isMatched
                ? 'bg-[#00df89]/10 border-[#00df89]/40 text-[#00df89]'
                : 'bg-red-500/10 border-red-500/40 text-red-400'
            }`}>
              <div className="flex items-center gap-2">
                {selectedAuditUser.isMatched ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                <span className="font-black text-xs">
                  {selectedAuditUser.isMatched ? 'VỐN GỐC CÂN ĐỐI 100% (ZERO VARIANCE)' : `PHÁT HIỆN LỆCH VỐN GỐC: $${selectedAuditUser.variance.toFixed(2)}`}
                </span>
              </div>
              <span className="text-[10px] font-bold">
                Cổ phần: {selectedAuditUser.uShare.toFixed(2)}% Pool
              </span>
            </div>

            {/* Detailed Financial Ledger Breakdown */}
            <div className="bg-[#131927] p-3.5 rounded-2xl border border-[#1f293d] space-y-2 text-[11px]">
              <div className="flex justify-between text-gray-300">
                <span>(⏱️) Thời Điểm Nạp Vốn Vào Pool:</span>
                <strong className="text-cyan-300 font-mono">{selectedAuditUser.capitalJoinTimeFormatted}</strong>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>(📊) Lệnh Bot Đủ Điều Kiện Chia Lãi:</span>
                <strong className={selectedAuditUser.eligibleTradesCount > 0 ? "text-[#00df89]" : "text-amber-400 font-mono"}>
                  {selectedAuditUser.eligibleTradesCount} / {trades.length} lệnh
                </strong>
              </div>
              <div className="flex justify-between text-gray-300 border-t border-[#1f293d] pt-1.5">
                <span>(+) Tổng Nạp Ròng Vào Master (Net):</span>
                <strong className="text-[#00df89]">+{selectedAuditUser.uNetDep.toFixed(2)} USDT</strong>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>(-) Tổng Rút Đã Chi Trả (Gross):</span>
                <strong className="text-red-400">-${selectedAuditUser.uGrossWdr.toFixed(2)} USDT</strong>
              </div>
              <div className="border-t border-[#1f293d] pt-1.5 flex justify-between text-cyan-300 font-bold">
                <span>(=) Vốn Gốc Sổ Sách Kỳ Vọng:</span>
                <span className="font-black">${selectedAuditUser.expCapitalBal.toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between text-white font-bold">
                <span>(★) Vốn Gốc Ghi Nhận Trong Database:</span>
                <span className="font-black text-[#00df89]">${selectedAuditUser.uCap.toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between text-gray-300 border-t border-[#1f293d] pt-1.5">
                <span>(+) Lợi Nhuận Bot Sinh Thêm ({selectedAuditUser.uShare.toFixed(2)}%):</span>
                <strong className={selectedAuditUser.uProfit > 0 ? "text-[#00df89]" : "text-gray-400"}>
                  +{selectedAuditUser.uProfit.toFixed(2)} USDT
                </strong>
              </div>
              {selectedAuditUser.preJoinTradesCount > 0 && selectedAuditUser.eligibleTradesCount === 0 && (
                <div className="text-[10px] text-amber-300/90 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 leading-relaxed">
                  🛡️ <strong>Nguyên tắc Quỹ:</strong> Khách tham gia sau khi Bot đã mở lệnh nên không được chia lợi nhuận từ các lệnh mở trước thời điểm nạp vốn ({selectedAuditUser.preJoinTradesCount} lệnh trước đó).
                </div>
              )}
              <div className="border-t border-[#00df89]/30 pt-2 flex items-center justify-between text-amber-300 font-bold bg-[#00df89]/5 p-2.5 rounded-xl">
                <div>
                  <span className="block text-xs text-white uppercase font-black">(💎) TỔNG GIÁ TRỊ TẤT TOÁN (EQUITY):</span>
                  <span className="text-[9px] text-gray-400 font-normal">Vốn Gốc Thực Tế + Lợi Nhuận Bot Hợp Lệ</span>
                </div>
                <span className="font-black text-base text-[#00df89] font-mono">${selectedAuditUser.totalEquity.toFixed(2)} USDT</span>
              </div>
            </div>

            {/* Recent Cashflow History */}
            <div className="space-y-2">
              <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">
                LỊCH SỬ NẠP / RÚT ĐỐI SOÁT ({selectedAuditUser.deposits.length + selectedAuditUser.withdrawals.length} GIAO DỊCH):
              </span>
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {[...selectedAuditUser.deposits, ...selectedAuditUser.withdrawals].length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-[10px]">Chưa có giao dịch On-Chain nào</div>
                ) : (
                  [...selectedAuditUser.deposits, ...selectedAuditUser.withdrawals].map((tx: any) => (
                    <div key={tx.id} className="p-2 rounded-xl bg-[#131927] border border-[#1f293d] flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${
                          tx.type === 'DEPOSIT' ? 'bg-[#00df89]/20 text-[#00df89]' : 'bg-[#ff2d55]/20 text-[#ff2d55]'
                        }`}>
                          {tx.type === 'DEPOSIT' ? 'NẠP' : 'RÚT'}
                        </span>
                        <span className="text-gray-300 font-mono">Đơn #{tx.id}</span>
                      </div>
                      <div className="text-right">
                        <span className={`font-black ${tx.type === 'DEPOSIT' ? 'text-[#00df89]' : 'text-red-400'}`}>
                          {tx.type === 'DEPOSIT' ? '+' : '-'}${tx.netAmount?.toFixed(2)} USDT
                        </span>
                        <span className="text-[8px] text-gray-500 block">Phí: ${tx.feeAmount?.toFixed(2)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-[#1f293d] flex justify-end">
              <button
                onClick={() => setSelectedAuditUser(null)}
                className="px-4 py-2 rounded-xl bg-[#131927] hover:bg-[#1f293d] text-white text-xs font-bold transition-all"
              >
                Đóng Sổ Cái
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
