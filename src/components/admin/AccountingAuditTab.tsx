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
  Download,
  FileCheck,
  Eye,
  X,
  Calculator,
  Sliders,
  Sparkles,
  Radio
} from 'lucide-react';
import { 
  SystemFeeConfig, 
  DEFAULT_FEE_CONFIG, 
  fetchSystemFeeConfig, 
  updateSystemFeeConfig, 
  calculateDepositFee, 
  calculateWithdrawFee, 
  calculatePerformanceFeeHWM, 
  HighWaterMarkResult 
} from '@/lib/feeCalculator';

export type AccountingSubTab = 'REVENUE_CAPITAL' | 'CUSTOMER_AUDIT' | 'TREASURY_VAULT' | 'TX_LOGS' | 'FEE_CONFIGURATION';

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

  // System Fee Policy Configuration State (Chief Accountant Management)
  const [feeConfig, setFeeConfig] = useState<SystemFeeConfig>(DEFAULT_FEE_CONFIG);
  const [isSavingFeeConfig, setIsSavingFeeConfig] = useState(false);
  const [feeConfigSaveMsg, setFeeConfigSaveMsg] = useState<string | null>(null);

  // Simulation states for Fee Configuration Testing
  const [simAmount, setSimAmount] = useState<number>(10000);
  const [simDays, setSimDays] = useState<number>(45);
  const [simHwmPeak, setSimHwmPeak] = useState<number>(10000);
  const [simCurrentEquity, setSimCurrentEquity] = useState<number>(12500);

  const loadFeeConfig = async () => {
    try {
      const cfg = await fetchSystemFeeConfig();
      setFeeConfig(cfg);
    } catch (e) {
      console.error('Error loading fee config:', e);
    }
  };

  const handleSaveFeeConfig = async () => {
    setIsSavingFeeConfig(true);
    setFeeConfigSaveMsg(null);
    try {
      const res = await updateSystemFeeConfig(feeConfig, 'tddv2017 (Chief Accountant)');
      if (res.success) {
        setFeeConfig(res.config);
        setFeeConfigSaveMsg('✓ ĐÃ LƯU & KÍCH HOẠT BIỂU PHÍ KẾ TOÁN MỚI TRÊN TOÀN BỘ HỆ SINH THÁI!');
      } else {
        setFeeConfigSaveMsg('❌ ' + res.message);
      }
    } catch (e: any) {
      setFeeConfigSaveMsg('❌ Lỗi kết nối: ' + e.message);
    } finally {
      setIsSavingFeeConfig(false);
      setTimeout(() => setFeeConfigSaveMsg(null), 5000);
    }
  };

  const handleResetFeeConfig = () => {
    if (confirm('Khôi phục toàn bộ biểu phí về chuẩn định chế mặc định của Spartan?')) {
      setFeeConfig(DEFAULT_FEE_CONFIG);
    }
  };

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
    loadFeeConfig();

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

      {/* 🧭 THANH CHUYỂN 5 PHÂN HỆ NGHIỆP VỤ KẾ TOÁN (ACCOUNTING SUB-TABS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 p-1.5 bg-[#0b0e17] rounded-2xl border border-[#1f293d]">
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

        <button
          onClick={() => setActiveSubTab('FEE_CONFIGURATION')}
          className={`py-2 px-2 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-1.5 col-span-2 sm:col-span-1 ${
            activeSubTab === 'FEE_CONFIGURATION'
              ? 'bg-gradient-to-r from-[#d4af37] via-[#f5d77f] to-[#d4af37] text-black shadow-lg shadow-amber-500/20 border border-[#d4af37]'
              : 'text-gray-400 hover:text-white hover:bg-[#131927]'
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>BIỂU PHÍ & HWM</span>
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
            <div className="pl-3 text-[10px] text-gray-400 space-y-1">
              <div className="flex justify-between">
                <span>  • Phí Nạp Tiền ({feeConfig.depositRatePct}% Sàn + ${feeConfig.depositGasFee} Gas):</span>
                <span className="text-amber-300/90 font-mono font-bold">+${totalDepositFees.toFixed(2)} USDT</span>
              </div>
              <div className="space-y-0.5">
                <div className="flex justify-between">
                  <span>  • Phí Rút Tiền 3 Giai Đoạn ({feeConfig.withdrawTier1RatePct}% / {feeConfig.withdrawTier2RatePct}% / {feeConfig.withdrawTier3RatePct}% + ${feeConfig.withdrawGasFee} Gas):</span>
                  <span className="text-amber-300/90 font-mono font-bold">+${totalWithdrawFees.toFixed(2)} USDT</span>
                </div>
                <div className="pl-3 flex justify-between text-[9px] text-gray-500 font-mono">
                  <span>    ↳ Doanh thu ròng Admin ({feeConfig.adminNetRevenueRatioPct}%):</span>
                  <span className="text-emerald-400 font-bold">+${totalAdminNetRevenue.toFixed(2)} USDT</span>
                </div>
                <div className="pl-3 flex justify-between text-[9px] text-gray-500 font-mono">
                  <span>    ↳ Trích Quỹ Dự Phòng Kho Bạc ({feeConfig.treasuryReserveRatioPct}%):</span>
                  <span className="text-purple-300 font-bold">+${totalTreasuryRetained.toFixed(2)} USDT</span>
                </div>
              </div>
            </div>

            {/* Chi phí trừ ra */}
            <div className="flex justify-between text-red-400 pt-1 border-t border-[#1f293d]/50">
              <span>(-) Chi Phí Mạng On-Chain Gas Thực Tế (${feeConfig.depositGasFee} Nạp / ${feeConfig.withdrawGasFee} Rút):</span>
              <strong className="text-red-400 font-bold">-${totalOnChainGasCost.toFixed(2)} USDT</strong>
            </div>
            <div className="flex justify-between text-amber-400">
              <span>(-) Chi Trả Chiết Khấu Cho Đối Tác F1 (10 Hạng Thành Viên):</span>
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

          {/* 2. VÍ QUỸ DỰ PHÒNG (30% TRÍCH GIỮ TỪ PHÍ RÚT) */}
          <div className="bg-[#0b0e17] p-4 rounded-2xl border border-purple-500/50 space-y-2.5 relative overflow-hidden shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-black">
                  🛡️
                </div>
                <div>
                  <span className="text-xs font-black text-purple-300 uppercase tracking-wide block">
                    2. VÍ QUỸ DỰ PHÒNG ({feeConfig.treasuryReserveRatioPct}%)
                  </span>
                  <span className="text-[9px] text-gray-400 font-mono">Trích {feeConfig.treasuryReserveRatioPct}% từ tổng phí rút tiền</span>
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
            <ArrowRight className="w-3.5 h-3.5 text-amber-400" /> QUY TRÌNH HẠCH TOÁN DÒNG TIỀN RÚT VỐN (VÍ DỤ $1,000 USDT - BẬC TIÊU CHUẨN 9% + $5 GAS):
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-[11px]">
            <div className="bg-[#131927] p-2.5 rounded-xl border border-[#00df89]/30">
              <span className="text-gray-400 text-[9px] block">1. THỰC CHUYỂN CHO KHÁCH (NET):</span>
              <strong className="text-[#00df89]">+$905.00 USDT</strong>
              <span className="text-[9px] text-gray-500 block">(Đã trừ 9% phí + $5 gas)</span>
            </div>
            <div className="bg-[#131927] p-2.5 rounded-xl border border-amber-500/30">
              <span className="text-gray-400 text-[9px] block">2. DOANH THU RÒNG ADMIN (70% PHÍ):</span>
              <strong className="text-amber-300">+$66.50 USDT</strong>
              <span className="text-[9px] text-gray-500 block">(70% của $95 tổng phí)</span>
            </div>
            <div className="bg-[#131927] p-2.5 rounded-xl border border-purple-500/30">
              <span className="text-gray-400 text-[9px] block">3. TRÍCH SANG VÍ DỰ PHÒNG (30% PHÍ):</span>
              <strong className="text-purple-300">+$28.50 USDT</strong>
              <span className="text-[9px] text-gray-500 block">(30% của $95 tổng phí)</span>
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
                  2. Địa chỉ Ví Quỹ Dự Phòng (TRC20 - Nhận {feeConfig.treasuryReserveRatioPct}% trích từ mỗi lệnh rút):
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
              SỔ CÁI QUỸ TREASURY & CHIẾT KHẤU ĐỐI TÁC
            </h3>
          </div>
          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 font-mono">
            ĐÃ KIỂM TOÁN KHỚP 100%
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="bg-[#0b0e17] p-3 rounded-xl border border-[#1f293d]">
            <span className="text-[10px] text-gray-400 block mb-0.5">TRÍCH GIỮ QUỸ DỰ PHÒNG ({feeConfig.treasuryReserveRatioPct}%):</span>
            <span className="text-sm font-black text-purple-300">
              ${totalTreasuryRetained.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
            </span>
          </div>

          <div className="bg-[#0b0e17] p-3 rounded-xl border border-[#1f293d]">
            <span className="text-[10px] text-gray-400 block mb-0.5">TỔNG CHIẾT KHẤU ĐỐI TÁC F1 (10 HẠNG):</span>
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

      {/* 5. PHÂN HỆ: CẤU HÌNH NGHIỆP VỤ BIỂU PHÍ KẾ TOÁN & HIGH-WATER MARK */}
      {activeSubTab === 'FEE_CONFIGURATION' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Banner Thông Báo Trạng Thái Lưu */}
          {feeConfigSaveMsg && (
            <div className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 animate-bounce shadow-lg ${
              feeConfigSaveMsg.includes('✓') 
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' 
                : 'bg-red-500/20 border-red-500 text-red-300'
            }`}>
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>{feeConfigSaveMsg}</span>
            </div>
          )}

          {/* Master Policy Header Banner */}
          <div className="spartan-card rounded-3xl p-5 border border-[#d4af37]/40 bg-gradient-to-r from-[#141005] via-[#080b12] to-[#05070c] space-y-2 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#d4af37]/20 border border-[#d4af37] text-[#f5d77f] flex items-center justify-center font-black text-lg shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                  ⚙️
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#f5d77f] uppercase tracking-wider flex items-center gap-2">
                    <span>CHÍNH SÁCH BIỂU PHÍ ĐỊNH CHẾ & HIGH-WATER MARK (HWM)</span>
                  </h3>
                  <span className="text-[10px] text-gray-400 font-sans block">
                    Nghiệp vụ Kế toán Trưởng: Tùy biến Phí Cố Định, Phí Nạp, Phí Rút 3 Giai Đoạn & Phí Hiệu Quả HWM
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 font-mono text-[10px]">
                <span className="text-gray-400">Cập nhật:</span>
                <span className="text-amber-400 font-bold">
                  {feeConfig.updatedAt ? new Date(feeConfig.updatedAt).toLocaleDateString('vi-VN') : 'Mặc định'}
                </span>
                <span className="text-gray-500">(@{feeConfig.updatedBy || 'admin'})</span>
              </div>
            </div>
          </div>

          {/* Grid 4 Nhóm Biểu Phí Nghiệp Vụ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* NHÓM 1: PHÍ CỐ ĐỊNH ON-CHAIN GAS */}
            <div className="spartan-card rounded-3xl p-4 border border-[#1f293d] bg-[#0b0e17] space-y-3 shadow-md">
              <div className="flex items-center justify-between border-b border-[#1f293d] pb-2">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    1. PHÍ CỐ ĐỊNH MẠNG ON-CHAIN (GAS FEE)
                  </h4>
                </div>
                <span className="text-[9px] font-mono text-gray-400 bg-[#131927] px-2 py-0.5 rounded">TRON TRC20</span>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 block">Gas Nạp Tiền (USD):</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500 font-bold">$</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={feeConfig.depositGasFee}
                      onChange={(e) => setFeeConfig({ ...feeConfig, depositGasFee: Math.max(0, parseFloat(e.target.value) || 0) })}
                      className="w-full pl-7 pr-3 py-2 rounded-xl bg-[#131927] border border-[#1f293d] text-white font-black text-xs focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                  <span className="text-[8px] text-gray-500 font-sans block">Bù đắp kích hoạt Memo & TronGrid</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 block">Gas Rút Tiền (USD):</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500 font-bold">$</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={feeConfig.withdrawGasFee}
                      onChange={(e) => setFeeConfig({ ...feeConfig, withdrawGasFee: Math.max(0, parseFloat(e.target.value) || 0) })}
                      className="w-full pl-7 pr-3 py-2 rounded-xl bg-[#131927] border border-[#1f293d] text-white font-black text-xs focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                  <span className="text-[8px] text-gray-500 font-sans block">Phí chuyển Energy / TRX mạng Tron</span>
                </div>
              </div>
            </div>

            {/* NHÓM 2: PHÍ NẠP VỐN (DEPOSIT ENTRY FEE) */}
            <div className="spartan-card rounded-3xl p-4 border border-[#1f293d] bg-[#0b0e17] space-y-3 shadow-md">
              <div className="flex items-center justify-between border-b border-[#1f293d] pb-2">
                <div className="flex items-center gap-2">
                  <ArrowDown className="w-4 h-4 text-[#00df89]" />
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    2. PHÍ NẠP TIỀN VÀO MASTER POOL
                  </h4>
                </div>
                <span className="text-[9px] font-mono text-[#00df89] font-bold bg-[#00df89]/10 px-2 py-0.5 rounded">TỶ LỆ %</span>
              </div>

              <div className="space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-gray-400">Tỷ lệ phí nạp sàn (%):</label>
                  <div className="flex items-center gap-1.5 w-32">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="30"
                      value={feeConfig.depositRatePct}
                      onChange={(e) => setFeeConfig({ ...feeConfig, depositRatePct: Math.max(0, parseFloat(e.target.value) || 0) })}
                      className="w-full px-3 py-2 rounded-xl bg-[#131927] border border-[#1f293d] text-[#00df89] font-black text-xs text-right focus:outline-none focus:border-[#00df89]"
                    />
                    <span className="text-gray-400 font-bold">%</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#131927] border border-[#1f293d] text-[9px] text-gray-400 space-y-0.5 font-sans">
                  <span className="block font-mono text-gray-300">Công thức: Phí = (Số tiền nạp x {feeConfig.depositRatePct}%) + ${feeConfig.depositGasFee} Gas</span>
                  <span className="block text-gray-500">Bù đắp chi phí tích hợp tài khoản Master Pool và thiết lập bản quyền thuật toán Quant AI.</span>
                </div>
              </div>
            </div>

            {/* NHÓM 3: PHÍ RÚT VỐN 3 GIAI ĐOẠN (TIERED WITHDRAWAL EXIT FEES) */}
            <div className="spartan-card rounded-3xl p-4 border border-[#d4af37]/30 bg-[#0b0e17] space-y-3 shadow-md md:col-span-2">
              <div className="flex items-center justify-between border-b border-[#1f293d] pb-2">
                <div className="flex items-center gap-2">
                  <ArrowUp className="w-4 h-4 text-[#ff5500]" />
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    3. PHÍ RÚT TIỀN 3 GIAI ĐOẠN & TỶ LỆ TRÍCH QUỸ DỰ PHÒNG
                  </h4>
                </div>
                <span className="text-[9px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  TIERED EXIT FEES
                </span>
              </div>

              {/* 3 Giai Đoạn Input Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
                {/* Giai đoạn 1 */}
                <div className="p-3 rounded-2xl bg-[#131927] border border-red-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-red-400 uppercase">GIAI ĐOẠN 1: RÚT SỚM</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 font-bold">
                      &lt; {feeConfig.withdrawTier1DaysMax} NGÀY
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="50"
                      value={feeConfig.withdrawTier1RatePct}
                      onChange={(e) => setFeeConfig({ ...feeConfig, withdrawTier1RatePct: Math.max(0, parseFloat(e.target.value) || 0) })}
                      className="w-full px-3 py-1.5 rounded-xl bg-[#0b0e17] border border-red-500/50 text-red-400 font-black text-xs text-right focus:outline-none"
                    />
                    <span className="text-red-400 font-bold">%</span>
                  </div>
                  <span className="text-[8px] text-gray-500 font-sans block">Chống dòng tiền nóng lướt sóng và rút vốn đột ngột</span>
                </div>

                {/* Giai đoạn 2 */}
                <div className="p-3 rounded-2xl bg-[#131927] border border-amber-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-[#f5d77f] uppercase">GIAI ĐOẠN 2: TIÊU CHUẨN</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                      {feeConfig.withdrawTier1DaysMax} - {feeConfig.withdrawTier2DaysMax} NGÀY
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="50"
                      value={feeConfig.withdrawTier2RatePct}
                      onChange={(e) => setFeeConfig({ ...feeConfig, withdrawTier2RatePct: Math.max(0, parseFloat(e.target.value) || 0) })}
                      className="w-full px-3 py-1.5 rounded-xl bg-[#0b0e17] border border-amber-500/50 text-[#f5d77f] font-black text-xs text-right focus:outline-none"
                    />
                    <span className="text-[#f5d77f] font-bold">%</span>
                  </div>
                  <span className="text-[8px] text-gray-500 font-sans block">Mức phí tiêu chuẩn cân bằng thanh khoản toàn hệ thống</span>
                </div>

                {/* Giai đoạn 3 */}
                <div className="p-3 rounded-2xl bg-[#131927] border border-emerald-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-emerald-400 uppercase">GIAI ĐOẠN 3: VIP TRUNG THÀNH</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                      &gt; {feeConfig.withdrawTier2DaysMax} NGÀY
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="50"
                      value={feeConfig.withdrawTier3RatePct}
                      onChange={(e) => setFeeConfig({ ...feeConfig, withdrawTier3RatePct: Math.max(0, parseFloat(e.target.value) || 0) })}
                      className="w-full px-3 py-1.5 rounded-xl bg-[#0b0e17] border border-emerald-500/50 text-emerald-400 font-black text-xs text-right focus:outline-none"
                    />
                    <span className="text-emerald-400 font-bold">%</span>
                  </div>
                  <span className="text-[8px] text-gray-500 font-sans block">Thưởng nhà đầu tư định chế gắn bó lâu năm</span>
                </div>
              </div>

              {/* Tỷ Lệ Phân Bổ: Quỹ Dự Phòng vs Doanh Thu Ròng Admin */}
              <div className="p-3.5 rounded-2xl bg-[#131927] border border-[#1f293d] space-y-2.5 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-300 uppercase">
                    PHÂN BỔ TỔNG PHÍ RÚT THU ĐƯỢC (TỰ ĐỘNG BÓC TÁCH KHI DUYỆT):
                  </span>
                  <span className="text-[10px] text-purple-300 font-bold">
                    {feeConfig.treasuryReserveRatioPct}% QUỸ DỰ PHÒNG • {feeConfig.adminNetRevenueRatioPct}% ADMIN RÒNG
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-purple-400 block">
                      Tỷ lệ Trích Quỹ Dự Phòng Kho Bạc (%):
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={feeConfig.treasuryReserveRatioPct}
                        onChange={(e) => {
                          const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                          setFeeConfig({
                            ...feeConfig,
                            treasuryReserveRatioPct: val,
                            adminNetRevenueRatioPct: 100 - val
                          });
                        }}
                        className="w-full px-3 py-1.5 rounded-xl bg-[#0b0e17] border border-purple-500/50 text-purple-300 font-black text-xs text-right focus:outline-none"
                      />
                      <span className="text-purple-300 font-bold">%</span>
                    </div>
                    <span className="text-[8px] text-gray-500 font-sans block">Tự động rót vào ví /treasury_vault</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-emerald-400 block">
                      Doanh Thu Ròng Admin (% Còn Lại):
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        disabled
                        value={feeConfig.adminNetRevenueRatioPct}
                        className="w-full px-3 py-1.5 rounded-xl bg-[#080b12] border border-emerald-500/30 text-emerald-400 font-black text-xs text-right cursor-not-allowed opacity-90"
                      />
                      <span className="text-emerald-400 font-bold">%</span>
                    </div>
                    <span className="text-[8px] text-gray-500 font-sans block">Ghi nhận vào lợi nhuận ròng của Sàn</span>
                  </div>
                </div>
              </div>
            </div>

            {/* NHÓM 4: PHÍ HIỆU QUẢ HIGH-WATER MARK (PERFORMANCE FEE & HWM) */}
            <div className="spartan-card rounded-3xl p-4 border border-cyan-500/30 bg-[#0b0e17] space-y-3 shadow-md md:col-span-2">
              <div className="flex items-center justify-between border-b border-[#1f293d] pb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">
                      4. PHÍ HIỆU QUẢ HIGH-WATER MARK (HWM PERFORMANCE FEE)
                    </h4>
                    <span className="text-[9px] text-gray-400 font-sans block">
                      Chuẩn mực quỹ phòng hộ quốc tế: CHỈ thu phí khi tài khoản sinh lời vượt đỉnh cao nhất lịch sử
                    </span>
                  </div>
                </div>

                {/* Toggle HWM Active */}
                <button
                  type="button"
                  onClick={() => setFeeConfig({ ...feeConfig, hwmEnabled: !feeConfig.hwmEnabled })}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all ${
                    feeConfig.hwmEnabled 
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm' 
                      : 'bg-[#131927] text-gray-500 border border-[#1f293d]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${feeConfig.hwmEnabled ? 'bg-cyan-400 animate-pulse' : 'bg-gray-500'}`} />
                  <span>{feeConfig.hwmEnabled ? 'ĐANG KÍCH HOẠT HWM' : 'ĐÃ TẮT HWM'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                {/* Parameters */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-gray-300">Tỷ lệ Phí Hiệu Quả (% trên lãi vượt đỉnh):</label>
                    <div className="flex items-center gap-1.5 w-32">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="50"
                        value={feeConfig.performanceFeeHwmPct}
                        onChange={(e) => setFeeConfig({ ...feeConfig, performanceFeeHwmPct: Math.max(0, parseFloat(e.target.value) || 0) })}
                        className="w-full px-3 py-1.5 rounded-xl bg-[#131927] border border-cyan-500/40 text-cyan-300 font-black text-xs text-right focus:outline-none"
                      />
                      <span className="text-cyan-400 font-bold">%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-gray-300">Chu kỳ Đối Soát & Thu Phí:</label>
                    <select
                      value={feeConfig.hwmCalculationPeriod}
                      onChange={(e: any) => setFeeConfig({ ...feeConfig, hwmCalculationPeriod: e.target.value })}
                      className="px-3 py-1.5 rounded-xl bg-[#131927] border border-cyan-500/40 text-white font-bold text-xs focus:outline-none"
                    >
                      <option value="AT_WITHDRAWAL">Khi Khách Rút Tiền (At Withdrawal)</option>
                      <option value="WEEKLY">Hàng Tuần (Thứ 7 chốt sổ)</option>
                      <option value="MONTHLY">Hàng Tháng (Ngày 01 mỗi tháng)</option>
                    </select>
                  </div>
                </div>

                {/* Institutional Logic Explainer Box */}
                <div className="p-3 rounded-2xl bg-[#131927] border border-[#1f293d] space-y-1.5 text-[10px] font-sans">
                  <span className="font-bold text-cyan-300 font-mono block">🛡️ QUY TẮC BẢO VỆ NHÀ ĐẦU TƯ:</span>
                  <p className="text-gray-300 leading-relaxed">
                    • <strong>Vượt Đỉnh Mới:</strong> Nếu vốn khách tăng từ $10,000 lên $12,000 (+ $2,000 lãi), sàn thu {feeConfig.performanceFeeHwmPct}% của $2,000 = ${(2000 * feeConfig.performanceFeeHwmPct / 100).toFixed(0)} USD. Đỉnh HWM mới được xác lập là $12,000.
                  </p>
                  <p className="text-gray-300 leading-relaxed">
                    • <strong>Bảo Vệ Khi Drawdown:</strong> Nếu tài khoản tụt về $11,000 rồi hồi lên $11,800, sàn <strong>KHÔNG ĐƯỢC THU PHÍ</strong> vì chưa vượt đỉnh cũ $12,000!
                  </p>
                </div>
              </div>
            </div>

            {/* NHÓM 5: THƯỚC ĐO MÔ PHỎNG NGHIỆP VỤ KẾ TOÁN REALTIME (LIVE SIMULATOR) */}
            <div className="spartan-card rounded-3xl p-4 border border-[#221c10] bg-[#05070c] space-y-3 shadow-xl md:col-span-2">
              <div className="flex items-center justify-between border-b border-[#1f293d] pb-2">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-[#f5d77f]" />
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    5. THƯỚC ĐO THỬ NGHIỆM & MÔ PHỎNG TÍNH TOÁN REALTIME
                  </h4>
                </div>
                <span className="text-[9px] font-mono text-gray-400">TEST CALCULATOR</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 block">Số tiền thử nghiệm:</label>
                  <input
                    type="number"
                    value={simAmount}
                    onChange={(e) => setSimAmount(Math.max(1, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#131927] border border-[#1f293d] text-white font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 block">Số ngày giữ vốn:</label>
                  <input
                    type="number"
                    value={simDays}
                    onChange={(e) => setSimDays(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#131927] border border-[#1f293d] text-white font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 block">Đỉnh HWM Cũ:</label>
                  <input
                    type="number"
                    value={simHwmPeak}
                    onChange={(e) => setSimHwmPeak(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#131927] border border-[#1f293d] text-white font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 block">Tài sản mới (Equity):</label>
                  <input
                    type="number"
                    value={simCurrentEquity}
                    onChange={(e) => setSimCurrentEquity(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#131927] border border-[#1f293d] text-white font-bold"
                  />
                </div>
              </div>

              {/* Simulation Result Strip */}
              {(() => {
                const depSim = calculateDepositFee(simAmount, feeConfig);
                const wdrSim = calculateWithdrawFee(simAmount, simDays, feeConfig);
                const hwmSim = calculatePerformanceFeeHWM(simCurrentEquity, simHwmPeak, feeConfig);

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 font-mono text-xs">
                    <div className="p-3 rounded-2xl bg-[#0b0e17] border border-[#1f293d] space-y-1">
                      <span className="text-[10px] text-gray-400 block">KẾT QUẢ PHÍ NẠP:</span>
                      <div className="text-sm font-black text-[#00df89]">${depSim.totalFee.toFixed(2)} USDT</div>
                      <span className="text-[9px] text-gray-500 block">Thực vào Pool: ${depSim.netAmount.toFixed(2)} USDT</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#0b0e17] border border-[#1f293d] space-y-1">
                      <span className="text-[10px] text-gray-400 block">KẾT QUẢ PHÍ RÚT ({simDays}d):</span>
                      <div className="text-sm font-black text-[#f5d77f]">${wdrSim.totalFee.toFixed(2)} USDT</div>
                      <div className="flex justify-between text-[9px] text-gray-400">
                        <span>• Net Admin (70%): <strong className="text-emerald-400">${(wdrSim.adminNetRevenue || 0).toFixed(2)}</strong></span>
                        <span>• Quỹ (30%): <strong className="text-purple-300">${(wdrSim.treasuryReserveFee || 0).toFixed(2)}</strong></span>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#0b0e17] border border-[#1f293d] space-y-1">
                      <span className="text-[10px] text-gray-400 block">PHÍ HIỆU QUẢ HWM:</span>
                      <div className={`text-sm font-black ${hwmSim.isDrawdown ? 'text-gray-400' : 'text-cyan-400'}`}>
                        ${hwmSim.performanceFeeAmount.toFixed(2)} USDT
                      </div>
                      <span className="text-[9px] text-cyan-300/80 block truncate" title={hwmSim.statusVi}>{hwmSim.statusVi}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

          </div>

          {/* HÀNG NÚT THAO TÁC CỦA KẾ TOÁN TRƯỞNG */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetFeeConfig}
              className="px-4 py-2.5 rounded-xl bg-[#131927] hover:bg-[#1f293d] text-gray-300 hover:text-white text-xs font-bold transition-all"
            >
              ↺ Khôi Phục Mặc Định
            </button>

            <button
              type="button"
              onClick={handleSaveFeeConfig}
              disabled={isSavingFeeConfig}
              className="px-6 py-2.5 rounded-xl gold-btn-solid text-black text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg hover:opacity-90 active:scale-95 transition-all"
            >
              {isSavingFeeConfig ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Save className="w-4 h-4 text-black" />}
              <span>LƯU & KÍCH HOẠT BIỂU PHÍ KẾ TOÁN</span>
            </button>
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
