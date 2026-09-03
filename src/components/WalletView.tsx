'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Copy, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  ShieldCheck, 
  Clock, 
  ArrowDown, 
  ArrowUp, 
  History,
  QrCode,
  RefreshCw,
  Lock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Receipt,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Camera,
  Sparkles,
  Users
} from 'lucide-react';
import { 
  calculateDepositFee, 
  calculateWithdrawFee, 
  fetchSystemFeeConfig, 
  SystemFeeConfig, 
  DEFAULT_FEE_CONFIG 
} from '@/lib/feeCalculator';
import { createLiveTransaction, withdrawReferralBalance, subscribeToUserTransactions, TransactionData, RiskAgreementRecord } from '@/lib/firebaseService';
import { fetchTreasuryVault, DEFAULT_TREASURY_VAULT } from '@/lib/walletConfig';
import { ReceiptAiAppealModal } from '@/components/ReceiptAiAppealModal';
import { RiskDisclosureModal } from '@/components/RiskDisclosureModal';
import { P2pLendingView } from '@/components/P2pLendingView';
import { useLanguage } from '@/contexts/LanguageContext';

interface WalletViewProps {
  currentBalance: number;
  referralBalance?: number;
  onUpdateBalance: (newBalance: number) => void;
  telegramId?: string;
  username?: string;
  initialMode?: 'deposit' | 'withdraw' | 'history' | 'p2p_lending';
}

export const WalletView: React.FC<WalletViewProps> = ({
  currentBalance,
  referralBalance = 0,
  onUpdateBalance,
  telegramId = '494232782',
  username = 'tddv2017',
  initialMode = 'deposit',
}) => {
  const { t, lang } = useLanguage();
  const [mode, setMode] = useState<'deposit' | 'withdraw' | 'history' | 'p2p_lending'>(initialMode);
  const [withdrawSource, setWithdrawSource] = useState<'trading' | 'referral'>('trading');
  const [amount, setAmount] = useState<string>('100');
  const [copied, setCopied] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rejectedAlert, setRejectedAlert] = useState<{ id: string; message: string; txData?: TransactionData } | null>(null);
  const [aiAppealTx, setAiAppealTx] = useState<TransactionData | null>(null);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeDepositTx, setActiveDepositTx] = useState<TransactionData | null>(null);
  const [firestoreTxs, setFirestoreTxs] = useState<TransactionData[]>([]);
  const [localTxs, setLocalTxs] = useState<TransactionData[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [receivingWallet, setReceivingWallet] = useState<string>(DEFAULT_TREASURY_VAULT.exnessMasterWallet);
  const [txHashInput, setTxHashInput] = useState('');
  const [verifyingHash, setVerifyingHash] = useState(false);
  const [hashVerifyError, setHashVerifyError] = useState<string | null>(null);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [feeConfig, setFeeConfig] = useState<SystemFeeConfig>(DEFAULT_FEE_CONFIG);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    fetchSystemFeeConfig().then(cfg => {
      if (cfg) setFeeConfig(cfg);
    });
  }, []);

  const handleVerifyTxHash = async () => {
    if (!activeDepositTx || !txHashInput.trim()) return;
    setVerifyingHash(true);
    setHashVerifyError(null);

    try {
      const orderId = activeDepositTx.id || activeDepositTx.memoCode;
      const res = await fetch('/api/verify-txhash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          txHash: txHashInput.trim(),
          userId: telegramId,
          username: username
        })
      });

      const data = await res.json();
      if (data.success) {
        setActiveDepositTx(null);
        setTxHashInput('');
        if (typeof data.newTradingBalance === 'number') {
          onUpdateBalance(data.newTradingBalance);
        }
        setNotification(`🎉 XÁC THỰC MÃ BĂM THÀNH CÔNG! Đã khớp On-Chain +$${data.netAmount.toFixed(2)} USDT vào vốn Bot của bạn! Mã băm: ${data.txHash.slice(0, 12)}...`);
        setTimeout(() => setNotification(null), 10000);
      } else {
        setHashVerifyError(data.message || 'Xác thực mã băm thất bại');
      }
    } catch (err: any) {
      setHashVerifyError('Lỗi kết nối kiểm tra mã băm: ' + err.message);
    } finally {
      setVerifyingHash(false);
    }
  };

  // Realtime Listener for User Transactions & Treasury Wallet
  useEffect(() => {
    fetchTreasuryVault().then(cfg => {
      if (cfg.exnessMasterWallet) setReceivingWallet(cfg.exnessMasterWallet);
    });

    if (!telegramId) return;
    const unsubscribe = subscribeToUserTransactions(telegramId, (txs) => {
      setFirestoreTxs(txs);
    });
    return () => unsubscribe();
  }, [telegramId]);

  // Realtime Active Deposit Order Status Watcher (Auto-close QR & Alert on Reject)
  useEffect(() => {
    if (!activeDepositTx) return;
    const activeKey = activeDepositTx.id || activeDepositTx.memoCode;
    const liveTx = firestoreTxs.find(t => (t.id && t.id === activeKey) || (t.memoCode && t.memoCode === activeKey));

    if (liveTx) {
      if (liveTx.status === 'APPROVED') {
        setActiveDepositTx(null);
        setNotification(`🎉 NẠP TIỀN THÀNH CÔNG! Đơn nạp #${liveTx.id || liveTx.memoCode} đã được duyệt! Đã cộng chính xác +$${liveTx.netAmount.toFixed(2)} USDT vào vốn Bot của bạn.`);
        setTimeout(() => setNotification(null), 10000);
      } else if (liveTx.status === 'REJECTED') {
        setActiveDepositTx(null);
        if (liveTx.type === 'WITHDRAW') {
          setNotification(`⚠️ LỆNH RÚT #${liveTx.id || liveTx.memoCode} ($${liveTx.grossAmount.toFixed(2)} USDT) ĐÃ BỊ TỪ CHỐI! Lý do: ${liveTx.rejectionReason || 'Thông tin ví không hợp lệ'}. Toàn bộ số tiền đã được HOÀN TRẢ 100% (+${liveTx.grossAmount.toFixed(2)} USDT) về lại tài khoản của bạn.`);
          setTimeout(() => setNotification(null), 10000);
        } else {
          setRejectedAlert({
            id: liveTx.id || liveTx.memoCode,
            message: `Đơn nạp #${liveTx.id || liveTx.memoCode} ($${liveTx.grossAmount.toFixed(2)} USDT) đã bị Quản trị viên TỪ CHỐI do nhập sai Memo hoặc số tiền chưa khớp trên Blockchain. Bạn có thể Tải ảnh bill chuyển khoản để AI giám định đối soát tự động hoặc liên hệ Kỹ thuật @tddv2017.`,
            txData: liveTx
          });
        }
      }
    }
  }, [firestoreTxs, activeDepositTx]);

  // Combine Firestore Txs and Local Txs
  const combinedTxsMap = new Map<string, TransactionData>();
  [...localTxs, ...firestoreTxs].forEach((tx) => {
    const key = tx.id || tx.memoCode;
    combinedTxsMap.set(key, tx);
  });

  const allTransactions = Array.from(combinedTxsMap.values()).sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  // Calculate Pending Withdrawal Locks
  const pendingWithdrawalTotal = allTransactions
    .filter(t => t.type === 'WITHDRAW' && t.status === 'PENDING')
    .reduce((sum, t) => sum + (t.grossAmount || 0), 0);

  const availableForWithdraw = Math.max(0, currentBalance - pendingWithdrawalTotal);

  // Compute Net Totals
  const totalDepositedNet = allTransactions
    .filter(t => t.type === 'DEPOSIT' && t.status === 'APPROVED')
    .reduce((sum, t) => sum + (t.netAmount || 0), 0);

  const totalWithdrawnNet = allTransactions
    .filter(t => t.type === 'WITHDRAW' && t.status === 'APPROVED')
    .reduce((sum, t) => sum + (t.netAmount || 0), 0);

  const depositCount = allTransactions.filter(t => t.type === 'DEPOSIT').length;
  const withdrawCount = allTransactions.filter(t => t.type === 'WITHDRAW').length;

  // Auto-calculate real user holding days from earliest approved deposit
  const approvedDeposits = allTransactions.filter(t => t.type === 'DEPOSIT' && t.status === 'APPROVED');
  const earliestDeposit = approvedDeposits.length > 0
    ? approvedDeposits.reduce((earliest, t) => {
        const tTime = t.createdAt ? new Date(t.createdAt).getTime() : Date.now();
        const eTime = earliest.createdAt ? new Date(earliest.createdAt).getTime() : Date.now();
        return tTime < eTime ? t : earliest;
      })
    : null;

  const actualHoldingDays = earliestDeposit && earliestDeposit.createdAt
    ? Math.max(0, Math.floor((Date.now() - new Date(earliestDeposit.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
    : 15;

  const numAmount = parseFloat(amount) || 0;
  const depositBreakdown = calculateDepositFee(numAmount, feeConfig);

  const isRefSource = withdrawSource === 'referral';
  const currentRefBalance = Number(referralBalance) || 0;
  const currentAvailableWithdraw = isRefSource ? currentRefBalance : availableForWithdraw;

  const withdrawBreakdown = isRefSource
    ? {
        grossAmount: numAmount,
        percentageFee: 0,
        percentageRate: 0,
        tierName: 'Chiết Khấu Đối Tác (0% Miễn Phí)',
        fixedFee: feeConfig.withdrawGasFee || 5.00,
        totalFee: feeConfig.withdrawGasFee || 5.00,
        netAmount: Math.max(0, numAmount - (feeConfig.withdrawGasFee || 5.00)),
        effectiveRetainedFee: 0
      }
    : calculateWithdrawFee(numAmount, actualHoldingDays, feeConfig);

  // Master Receiving Deposit Address
  const walletAddress = receivingWallet;
  const activeMemo = activeDepositTx?.memoCode || `SPARTAN_${telegramId}_${Math.floor(Date.now() / 1000).toString().slice(-4)}`;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyMemo = () => {
    if (!activeMemo) return;
    navigator.clipboard.writeText(activeMemo);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2000);
  };

  const handleDepositConfirm = () => {
    if (loading) return;
    setErrorMessage(null);
    const MIN_DEPOSIT = 50.0;
    if (numAmount <= 0) {
      setErrorMessage(lang === 'vi' ? 'Số tiền nạp phải lớn hơn $0.00 USD!' : 'Deposit amount must be greater than $0.00 USD!');
      return;
    }
    if (numAmount < MIN_DEPOSIT) {
      setErrorMessage(`⛔ MỨC NẠP TỐI THIỂU: Số tiền nạp tối thiểu là $${MIN_DEPOSIT.toFixed(2)} USDT (để đảm bảo tối ưu chi phí sàn 9% và phí On-Chain $3)!`);
      return;
    }
    // Mở popup ký số tuyên bố miễn trừ trách nhiệm & rủi ro trước khi tạo hóa đơn
    setIsRiskModalOpen(true);
  };

  const handleDepositAfterSigned = async (agreement: RiskAgreementRecord) => {
    setIsRiskModalOpen(false);
    setLoading(true);
    setErrorMessage(null);

    try {
      const newTx = await createLiveTransaction(telegramId, username, 'DEPOSIT', numAmount, agreement);
      setActiveDepositTx(newTx);
      setLocalTxs((prev) => [newTx, ...prev]);
      setCurrentPage(1);

      setNotification(
        lang === 'vi'
          ? `🎉 ĐÃ KÝ SỐ THÀNH CÔNG & TẠO ĐƠN NẠP: $${numAmount.toFixed(2)} USDT! Mã Memo: ${newTx.memoCode}. Quý khách vui lòng quét mã QR chuyển tiền.`
          : `🎉 DIGITALLY SIGNED & DEPOSIT CREATED: $${numAmount.toFixed(2)} USDT! Memo: ${newTx.memoCode}. Please scan QR code to complete transfer.`
      );
      setTimeout(() => setNotification(null), 8000);
    } catch (err: any) {
      console.error('Deposit error:', err);
      setErrorMessage(err?.message || 'Lỗi tạo đơn nạp.');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawConfirm = async () => {
    if (loading) return;
    setErrorMessage(null);

    if (numAmount <= 0) {
      setErrorMessage('Withdrawal amount must be greater than $0.00 USD!');
      return;
    }

    if (withdrawBreakdown.netAmount <= 0) {
      setErrorMessage(`⛔ CANNOT WITHDRAW: Amount ($${numAmount.toFixed(2)}) is less than transaction fees ($${withdrawBreakdown.totalFee.toFixed(2)} USD). Minimum withdrawal is $6.50 USD.`);
      return;
    }

    if (!withdrawAddress.trim() || !withdrawAddress.trim().startsWith('T') || withdrawAddress.trim().length < 30) {
      setErrorMessage('Vui lòng nhập đúng địa chỉ ví USDT TRC20 (bắt đầu bằng T, 34 ký tự)!');
      return;
    }

    if (isRefSource) {
      if (numAmount > currentRefBalance) {
        setErrorMessage(`⛔ VƯỢT QUÁ CHIẾT KHẤU: Số tiền rút vượt quá số dư chiết khấu khả dụng ($${currentRefBalance.toFixed(2)} USDT).`);
        return;
      }

      setLoading(true);
      try {
        const res = await withdrawReferralBalance(telegramId, numAmount, withdrawAddress.trim());
        if (res.success) {
          if (res.tx) setLocalTxs((prev) => [res.tx!, ...prev]);
          setNotification(res.message);
          setTimeout(() => setNotification(null), 8000);
        } else {
          setErrorMessage(res.message);
        }
      } catch (err: any) {
        setErrorMessage('Lỗi rút chiết khấu: ' + err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (numAmount > availableForWithdraw) {
      if (pendingWithdrawalTotal > 0) {
        setErrorMessage(`⛔ LOCKED: You have $${pendingWithdrawalTotal.toFixed(2)} USD in pending withdrawals. Available balance is $${availableForWithdraw.toFixed(2)} USD.`);
      } else {
        setErrorMessage(`⛔ INSUFFICIENT FUNDS: Requested amount ($${numAmount.toFixed(2)}) exceeds available balance ($${currentBalance.toFixed(2)} USD).`);
      }
      return;
    }

    setLoading(true);

    try {
      const newTx = await createLiveTransaction(telegramId, username, 'WITHDRAW', numAmount);
      setLocalTxs((prev) => [newTx, ...prev]);
      setCurrentPage(1);

      setNotification(`Withdrawal request for $${withdrawBreakdown.netAmount.toFixed(2)} USDT sent to ${withdrawAddress.slice(0, 8)}...! Pending processing.`);
      setTimeout(() => setNotification(null), 6000);
    } catch (err: any) {
      console.error('Withdraw error:', err);
      if (err.message && err.message.includes('INSUFFICIENT_AVAILABLE_FUNDS')) {
        setErrorMessage(`⛔ LOCKED: Insufficient available balance due to pending withdrawals.`);
      } else {
        setNotification(`Withdrawal request created: $${withdrawBreakdown.netAmount.toFixed(2)} USDT! Awaiting approval.`);
      }
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const formatTxTime = (isoString?: string) => {
    if (!isoString) return 'Just now';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return 'Just now';
    }
  };

  const pureQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${walletAddress}`;

  // Pagination Math
  const totalPages = Math.max(1, Math.ceil(allTransactions.length / ITEMS_PER_PAGE));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * ITEMS_PER_PAGE;
  const paginatedTxs = allTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="w-full space-y-4 pb-20">
      {/* Balance & Overview Card */}
      <div className="spartan-card rounded-3xl p-5 border border-[#221c10] bg-[#080b12] shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t('wallet_available_balance')}</span>
          <span className="px-3 py-1 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/35 text-[#f5d77f] text-xs font-black">
            USDT TRC20
          </span>
        </div>
        <div className="text-3xl font-black text-white truncate font-mono">
          <span className="gold-text-metallic">${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> <span className="text-xs text-gray-400 font-bold">USDT</span>
        </div>

        {pendingWithdrawalTotal > 0 && (
          <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-[11px] font-bold text-amber-400">
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 flex-shrink-0" />
              {t('wallet_withdraw_locked_hint')}
            </span>
            <span className="font-mono font-black text-amber-300">-${pendingWithdrawalTotal.toFixed(2)} USD</span>
          </div>
        )}
      </div>

      {/* Summary Banner */}
      <div className="grid grid-cols-2 gap-3">
        <div className="spartan-card rounded-2xl p-4 border border-[#221c10] bg-[#080b12] flex items-center justify-between transition-all">
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-0.5">
              {t('net_deposited')}
            </span>
            <span className="text-base font-black text-emerald-400 font-mono">
              +${totalDepositedNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] text-gray-500 font-bold block mt-0.5 font-mono">{depositCount} {lang === 'vi' ? 'Lệnh Nạp' : 'Deposits'}</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ArrowDown className="w-4 h-4" />
          </div>
        </div>

        <div className="spartan-card rounded-2xl p-4 border border-[#221c10] bg-[#080b12] flex items-center justify-between transition-all">
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-0.5">
              {t('net_withdrawn')}
            </span>
            <span className="text-base font-black text-[#ff2d55] font-mono">
              -${totalWithdrawnNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] text-gray-500 font-bold block mt-0.5 font-mono">{withdrawCount} {lang === 'vi' ? 'Lệnh Rút' : 'Withdrawals'}</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-[#ff2d55]/15 border border-[#ff2d55]/30 flex items-center justify-center text-[#ff2d55]">
            <ArrowUp className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className="bg-[#00df89]/20 border border-[#00df89] p-3.5 rounded-2xl text-xs font-bold text-[#00df89] flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Admin Rejected Alert Banner with Support Button */}
      {rejectedAlert && (
        <div className="bg-red-500/20 border-2 border-red-500 p-4 rounded-3xl text-xs space-y-2.5 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-black uppercase text-red-400">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 animate-pulse" />
              <span>ĐƠN NẠP BỊ TỪ CHỐI BỞI QUẢN TRỊ VIÊN</span>
            </div>
            <button
              onClick={() => setRejectedAlert(null)}
              className="text-gray-400 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-gray-200">
            {rejectedAlert.message}
          </p>
          <div className="pt-1 space-y-2">
            <button
              onClick={() => {
                if (rejectedAlert.txData) {
                  setAiAppealTx(rejectedAlert.txData);
                } else {
                  setAiAppealTx({
                    id: rejectedAlert.id,
                    memoCode: rejectedAlert.id,
                    type: 'DEPOSIT',
                    grossAmount: 1000,
                    netAmount: 907,
                    feeAmount: 93,
                    status: 'REJECTED',
                    userId: telegramId,
                    username: username
                  });
                }
              }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-[#ff5500] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:opacity-95 transition-opacity"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>📸 TẢI ẢNH BILL & KHỞI CHẠY AI ĐỐI SOÁT TỰ ĐỘNG</span>
            </button>

            <a
              href="https://t.me/tddv2017"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 rounded-xl bg-[#131927] hover:bg-[#1f293d] border border-[#1f293d] text-gray-300 hover:text-white font-bold text-[11px] uppercase flex items-center justify-center gap-1.5 transition-all block text-center"
            >
              <ExternalLink className="w-3 h-3 text-amber-400" />
              <span>LIÊN HỆ BỘ PHẬN KỸ THUẬT / HỖ TRỢ (@tddv2017)</span>
            </a>
          </div>
        </div>
      )}

      {/* Error Safeguard Alert Banner */}
      {errorMessage && (
        <div className="bg-[#ff2d55]/20 border border-[#ff2d55] p-3 rounded-2xl text-xs font-bold text-[#ff2d55] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Primary Sub-Nav Switcher: Nạp | Rút | Lịch Sử | Vay P2P */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-[#05070c] rounded-2xl border border-[#221c10]">
        <button
          onClick={() => { setMode('deposit'); setErrorMessage(null); }}
          className={`py-2 px-1 rounded-xl text-[11px] font-black flex flex-col items-center justify-center gap-1 transition-all ${
            mode === 'deposit'
              ? 'spartan-cta-btn text-white shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <ArrowDownLeft className="w-3.5 h-3.5" />
          <span>{lang === 'vi' ? 'NẠP' : 'DEPOSIT'}</span>
        </button>

        <button
          onClick={() => { setMode('withdraw'); setErrorMessage(null); }}
          className={`py-2 px-1 rounded-xl text-[11px] font-black flex flex-col items-center justify-center gap-1 transition-all ${
            mode === 'withdraw'
              ? 'spartan-cta-btn text-white shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>{lang === 'vi' ? 'RÚT' : 'WITHDRAW'}</span>
        </button>

        <button
          onClick={() => { setMode('history'); setErrorMessage(null); }}
          className={`py-2 px-1 rounded-xl text-[11px] font-black flex flex-col items-center justify-center gap-1 transition-all relative ${
            mode === 'history'
              ? 'spartan-cta-btn text-white shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span className="flex items-center gap-1">
            <span>{lang === 'vi' ? 'LỊCH SỬ' : 'HISTORY'}</span>
            {allTransactions.length > 0 && (
              <span className="text-[8px] font-mono px-1 py-0.2 rounded-full bg-white/20 text-white font-bold">
                {allTransactions.length}
              </span>
            )}
          </span>
        </button>

        <button
          onClick={() => { setMode('p2p_lending'); setErrorMessage(null); }}
          className={`py-2 px-1 rounded-xl text-[11px] font-black flex flex-col items-center justify-center gap-1 transition-all relative ${
            mode === 'p2p_lending'
              ? 'gold-btn-solid text-black shadow-md'
              : 'text-[#f5d77f] hover:text-white bg-[#d4af37]/10 border border-[#d4af37]/30'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>{lang === 'vi' ? 'VAY P2P' : 'P2P LEND'}</span>
          <span className="absolute -top-1 -right-0.5 px-1 py-0.2 rounded bg-[#ff5500] text-white text-[7px] font-black uppercase tracking-tighter">
            DEV
          </span>
        </button>
      </div>

      {/* FORM CONTENT */}
      {mode === 'deposit' && (
        /* PURE QR CODE DEPOSIT FORM */
        <div className="spartan-card rounded-3xl p-5 border border-[#221c10] bg-[#080b12] space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/30 flex items-center justify-center text-[#f5d77f]">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">{t('deposit_qr_title')}</h3>
                <span className="text-[10px] text-gray-400 font-bold block">{t('deposit_qr_sub')}</span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-[#f5d77f] bg-[#d4af37]/10 px-2.5 py-0.5 rounded-full border border-[#d4af37]/30">
              {t('deposit_fee_badge')}
            </span>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-gray-400 font-bold">
                {t('deposit_amount_label')}
              </label>
              <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                {t('deposit_min_badge')}
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                value={amount}
                maxLength={10}
                onChange={(e) => setAmount(e.target.value.slice(0, 10))}
                className="w-full bg-[#05070c] border border-[#221c10] rounded-2xl py-3 px-4 text-white text-base font-black font-mono focus:outline-none focus:border-[#d4af37]"
                placeholder="100"
              />
              <span className="absolute right-4 top-3.5 text-xs font-bold text-gray-400">
                USDT
              </span>
            </div>

            {/* Quick Amount Preset Chips */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
              {[50, 100, 200, 500, 1000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset.toString())}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                    amount === preset.toString()
                      ? 'gold-btn-solid text-black shadow-md'
                      : 'bg-[#05070c] hover:bg-[#141924] text-gray-300 border border-[#221c10]'
                  }`}
                >
                  ${preset}
                </button>
              ))}
            </div>

            {numAmount > 0 && numAmount < 50 && (
              <span className="text-[10px] text-[#ff2d55] font-bold block mt-1.5 animate-pulse">
                ⚠️ {lang === 'vi' ? `Số tiền nạp ($${numAmount.toFixed(2)}) nhỏ hơn mức tối thiểu $50.00 USDT!` : `Deposit amount ($${numAmount.toFixed(2)}) is less than min $50.00 USDT!`}
              </span>
            )}
          </div>

          {/* Fee Engine Realtime Breakdown Card */}
          <div className="bg-[#05070c] rounded-2xl p-4 border border-[#221c10] text-xs space-y-2">
            <div className="flex justify-between text-gray-400">
              <span>{t('gross_deposit')}</span>
              <span className="font-bold text-gray-200 font-mono">${depositBreakdown.grossAmount.toFixed(2)} USDT</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>{t('fee_percentage')}</span>
              <span className="font-bold text-[#ff2d55] font-mono">-${depositBreakdown.percentageFee.toFixed(2)} USDT</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>{t('fee_network')}</span>
              <span className="font-bold text-[#ff2d55] font-mono">-$3.00 USDT</span>
            </div>
            <div className="border-t border-[#221c10] pt-2 flex justify-between font-black text-sm text-white">
              <span className="text-emerald-400">{t('net_credited')}</span>
              <span className="text-emerald-400 font-mono">${depositBreakdown.netAmount.toFixed(2)} USDT</span>
            </div>
          </div>

          {/* CREATE ORDER BUTTON */}
          {!activeDepositTx ? (
            <button
              onClick={handleDepositConfirm}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl spartan-cta-btn font-black text-xs uppercase tracking-wider hover:opacity-95 transition-opacity flex items-center justify-center gap-2 shadow-[0_4px_18px_rgba(255,69,0,0.4)] active:scale-[0.98]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              <span>{t('btn_create_order')} (+${depositBreakdown.netAmount.toFixed(2)} USDT)</span>
            </button>
          ) : (
            /* ON-CHAIN AUTO-APPROVE CLEAN QR CODE & FIXED MEMO CARD */
            <div className="bg-[#0b0e17] border border-[#ff5500] rounded-2xl p-4 space-y-3 animate-in fade-in slide-in-from-top-3 duration-500 shadow-[0_0_20px_rgba(255,85,0,0.2)]">
              <div className="flex items-center justify-between border-b border-[#1f293d] pb-2">
                <div>
                  <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00df89]" /> QR CODE & MEMO FOR ORDER #{activeDepositTx.id}
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold block mt-0.5">
                    Deposit Amount: <strong className="text-white">${activeDepositTx.grossAmount.toFixed(2)} USDT</strong>
                  </span>
                </div>
                <button
                  onClick={() => setActiveDepositTx(null)}
                  className="px-2.5 py-1 rounded-xl bg-[#131927] text-gray-400 hover:text-white text-[10px] font-bold border border-[#1f293d] flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Change Amount
                </button>
              </div>

              {/* Pure USDT TRC20 Wallet QR Image Display */}
              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-gray-200">
                <img
                  src={pureQrUrl}
                  alt="USDT TRC20 Master Deposit QR Code"
                  className="w-44 h-44 object-contain"
                />
                <span className="text-[10px] font-black text-gray-800 mt-2 uppercase tracking-wider">
                  MASTER EXNESS WALLET QR CODE (USDT TRC20)
                </span>
              </div>

              {/* Wallet Address Box */}
              <div>
                <label className="text-[10px] text-gray-400 font-bold block mb-1">
                  1. Master Exness Recipient Address (TRC20)
                </label>
                <div className="flex items-center gap-2 bg-[#131927] border border-[#1f293d] p-2.5 rounded-xl">
                  <span className="text-xs text-[#00df89] font-mono font-bold truncate flex-1">
                    {walletAddress}
                  </span>
                  <button
                    onClick={handleCopyAddress}
                    className="px-2.5 py-1 rounded-lg bg-[#ff5500] text-white text-xs font-black flex items-center gap-1 hover:opacity-90"
                  >
                    {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy Address</span>
                  </button>
                </div>
              </div>

              {/* PHƯƠNG THỨC XÁC THỰC MÃ BĂM TXID ON-CHAIN (KHÔNG CẦN MEMO - CHUYỂN TIỀN TRÒN) */}
              <div className="bg-[#05070c] border border-[#221c10] rounded-2xl p-3.5 space-y-2.5 shadow-[0_0_20px_rgba(212,175,55,0.15)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-black text-xs text-[#f5d77f] uppercase tracking-wider">
                    <Zap className="w-4 h-4 text-[#d4af37] animate-pulse" />
                    <span>{t('txid_verify_title')}</span>
                  </div>
                  <span className="text-[9px] font-mono font-bold text-[#f5d77f] bg-[#d4af37]/15 px-2 py-0.5 rounded border border-[#d4af37]/35">
                    SHA-256 HASH
                  </span>
                </div>

                <p className="text-[11px] text-gray-300 leading-relaxed">
                  {t('txid_verify_desc')}
                </p>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={txHashInput}
                      onChange={(e) => setTxHashInput(e.target.value)}
                      placeholder="Dán mã băm TxID SHA-256 (64 ký tự hex)..."
                      className="flex-1 bg-[#080b12] border border-[#221c10] rounded-xl px-3 py-2.5 text-xs text-[#f5d77f] font-mono focus:border-[#d4af37] outline-none"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText();
                          if (text) setTxHashInput(text.trim());
                        } catch (e) {}
                      }}
                      className="px-3 py-2.5 rounded-xl bg-[#0c0f17] hover:bg-[#141924] border border-[#221c10] text-gray-300 text-xs font-bold shrink-0 transition-colors"
                    >
                      {t('btn_paste')}
                    </button>
                  </div>

                  {hashVerifyError && (
                    <div className="bg-red-500/20 border border-red-500/40 p-2.5 rounded-xl text-xs text-red-300 font-bold leading-relaxed">
                      {hashVerifyError}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={verifyingHash || !txHashInput.trim()}
                    onClick={handleVerifyTxHash}
                    className="w-full py-3 rounded-xl gold-btn-solid hover:opacity-95 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(212,175,55,0.3)] transition-all active:scale-[0.98]"
                  >
                    {verifyingHash ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <ShieldCheck className="w-4 h-4 text-black" />}
                    <span>{verifyingHash ? (lang === 'vi' ? 'Đang giải mã băm on-chain...' : 'Verifying on-chain hash...') : t('btn_verify_txid')}</span>
                  </button>
                </div>
              </div>

              {/* Optional Memo Code Box */}
              <div>
                <label className="text-[10px] text-gray-400 font-bold block mb-1 uppercase tracking-wider flex items-center gap-1">
                  <span>2. {lang === 'vi' ? 'Mã Memo (Tùy chọn - Nếu ví của bạn có hỗ trợ)' : 'Memo Code (Optional - If your wallet supports memo)'}</span>
                </label>
                <div className="flex items-center gap-2 bg-[#05070c] border border-[#221c10] p-2 rounded-xl">
                  <span className="text-xs text-[#f5d77f] font-mono font-bold truncate flex-1 tracking-wider">
                    {activeMemo}
                  </span>
                  <button
                    onClick={handleCopyMemo}
                    className="px-2.5 py-1 rounded-lg gold-btn-solid text-black text-xs font-black flex items-center gap-1 hover:opacity-90 active:scale-95"
                  >
                    {copiedMemo ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy Memo</span>
                  </button>
                </div>
              </div>

              {/* ACTION BUTTONS: ĐÃ THANH TOÁN & ĐÓNG QR */}
              <div className="pt-2 space-y-2">
                <button
                  onClick={() => {
                    const gross = activeDepositTx.grossAmount;
                    const net = activeDepositTx.netAmount || (gross * 0.91 - 3);
                    const orderId = activeDepositTx.id || activeDepositTx.memoCode;
                    setActiveDepositTx(null);
                    setNotification(lang === 'vi' 
                      ? `🎉 ĐÃ GHI NHẬN THANH TOÁN! Đơn nạp #${orderId} ($${gross.toFixed(2)} USDT) đang được hệ thống quét Blockchain TRON để cộng vốn (Net +$${net.toFixed(2)} USDT).`
                      : `🎉 PAYMENT CONFIRMED! Order #${orderId} ($${gross.toFixed(2)} USDT) is being verified on TRON Blockchain to credit Net +$${net.toFixed(2)} USDT.`
                    );
                    setTimeout(() => setNotification(null), 10000);
                  }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:opacity-95 transition-all active:scale-[0.98]"
                >
                  <CheckCircle2 className="w-4 h-4 text-black" />
                  <span>{t('btn_paid')}</span>
                </button>

                <button
                  onClick={() => setActiveDepositTx(null)}
                  className="w-full py-2.5 rounded-xl bg-[#05070c] hover:bg-[#141924] border border-[#221c10] text-gray-400 hover:text-white text-xs font-bold uppercase transition-all active:scale-95"
                >
                  {t('btn_close_qr')}
                </button>
              </div>
            </div>
          )}

          {/* Quick Link to Transaction History */}
          <div className="pt-2 text-center border-t border-[#221c10]/60">
            <button
              type="button"
              onClick={() => setMode('history')}
              className="text-[11px] text-gray-400 hover:text-[#f5d77f] font-mono inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              <History className="w-3.5 h-3.5 text-[#f5d77f]" />
              <span>{lang === 'vi' ? 'Xem lịch sử các đơn nạp tiền →' : 'View deposit transaction history →'}</span>
            </button>
          </div>
        </div>
      )}

      {/* WITHDRAW MODE */}
      {mode === 'withdraw' && (
        <div className="spartan-card rounded-3xl p-5 border border-[#221c10] bg-[#080b12] space-y-4 shadow-lg">
          {/* NGUỒN TIỀN RÚT (SOURCE SELECTOR) */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 font-bold block">{t('wallet_withdraw_source_label')}</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#05070c] rounded-2xl border border-[#221c10]">
              <button
                type="button"
                onClick={() => { setWithdrawSource('trading'); setErrorMessage(null); }}
                className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex flex-col items-center gap-0.5 ${
                  withdrawSource === 'trading'
                    ? 'spartan-cta-btn text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>{lang === 'vi' ? 'VỐN BOT ĐẦU TƯ' : 'TRADING CAPITAL'}</span>
                <span className="text-[10px] font-mono opacity-90">${availableForWithdraw.toFixed(2)} USDT</span>
              </button>
              <button
                type="button"
                onClick={() => { setWithdrawSource('referral'); setErrorMessage(null); }}
                className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex flex-col items-center gap-0.5 ${
                  withdrawSource === 'referral'
                    ? 'gold-btn-solid text-black shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>{lang === 'vi' ? 'CHIẾT KHẤU ĐỐI TÁC' : 'PARTNER REBATE'}</span>
                <span className="text-[10px] font-mono opacity-90">${currentRefBalance.toFixed(2)} USDT</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              {isRefSource ? (lang === 'vi' ? 'RÚT CHIẾT KHẤU ĐỐI TÁC' : 'WITHDRAW PARTNER REBATE') : (lang === 'vi' ? 'RÚT VỐN THUẬT TOÁN (CHÍNH SÁCH SPARTAN TREASURY)' : 'WITHDRAW PORTFOLIO CAPITAL (TREASURY POLICY)')}
            </h3>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
              isRefSource 
                ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' 
                : 'text-[#f5d77f] bg-[#d4af37]/15 border-[#d4af37]/35'
            }`}>
              {isRefSource 
                ? (lang === 'vi' ? '0% Phí Sàn (Miễn phí)' : '0% Fee (Free)') 
                : `${lang === 'vi' ? 'Phí Bậc Thang:' : 'Tiered Fee:'} ${(withdrawBreakdown.percentageRate * 100).toFixed(0)}% + $5`}
            </span>
          </div>

          <div className="bg-[#05070c] p-3 rounded-2xl border border-[#221c10] flex items-center justify-between text-xs font-bold">
            <span className="text-gray-400">
              {isRefSource ? (lang === 'vi' ? 'Chiết Khấu Khả Dụng Để Rút:' : 'Available Rebate for Withdrawal:') : (lang === 'vi' ? 'Số Dư Khả Dụng Để Rút:' : 'Available Balance for Withdrawal:')}
            </span>
            <span className="text-emerald-400 font-mono text-sm font-black">
              ${currentAvailableWithdraw.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
            </span>
          </div>

          <div>
            <label className="text-xs text-gray-400 font-bold block mb-1.5">
              {isRefSource ? (lang === 'vi' ? 'Số Tiền Chiết Khấu Muốn Rút ($ USD):' : 'Rebate Withdrawal Amount ($ USD):') : (lang === 'vi' ? 'Nhập Số Tiền Muốn Rút ($ USD):' : 'Enter Withdrawal Amount ($ USD):')}
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                maxLength={10}
                onChange={(e) => { setAmount(e.target.value.slice(0, 10)); setErrorMessage(null); }}
                className="w-full bg-[#05070c] border border-[#221c10] rounded-2xl py-3 px-4 text-white text-base font-black font-mono focus:outline-none focus:border-[#d4af37]"
                placeholder="1000"
              />
              <button
                onClick={() => setAmount(currentAvailableWithdraw.toString())}
                className="absolute right-3 top-2.5 px-2.5 py-1 rounded-lg text-xs font-black border bg-[#d4af37]/20 text-[#f5d77f] border-[#d4af37]/40 active:scale-95"
              >
                MAX
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 font-bold block mb-1.5">
              {t('wallet_withdraw_addr_label')}
            </label>
            <input
              type="text"
              value={withdrawAddress}
              onChange={(e) => { setWithdrawAddress(e.target.value); setErrorMessage(null); }}
              placeholder="VD: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
              className="w-full bg-[#05070c] border border-[#221c10] rounded-2xl py-3 px-4 text-white text-xs font-mono focus:outline-none focus:border-[#d4af37]"
            />
          </div>

          {/* TIERED WITHDRAWAL FEE VERIFICATION CARD */}
          {!isRefSource && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400 font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>{lang === 'vi' ? 'Thời Gian Nắm Giữ Vốn Thực Tế:' : 'Verified Holding Period:'}</span>
                </label>
                <span className="text-[11px] font-mono text-[#f5d77f] font-bold">
                  {actualHoldingDays} {lang === 'vi' ? 'ngày' : 'days'}
                </span>
              </div>

              {/* Verified Tier Progress Strip */}
              <div className="p-3 bg-[#05070c] rounded-2xl border border-[#221c10] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      actualHoldingDays < 30 ? 'bg-red-400 animate-pulse shadow-[0_0_8px_#ef4444]' :
                      actualHoldingDays <= 90 ? 'bg-amber-400' : 'bg-emerald-400'
                    }`} />
                    <span className="font-bold text-white uppercase text-[11px]">
                      {withdrawBreakdown.tierName}
                    </span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    actualHoldingDays < 30 
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40' 
                      : actualHoldingDays <= 90 
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' 
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  }`}>
                    {lang === 'vi' ? 'PHÍ' : 'FEE'}: {(withdrawBreakdown.percentageRate * 100).toFixed(0)}% + $5
                  </span>
                </div>

                {/* Next Tier Upgrade Milestone Hint */}
                {actualHoldingDays < 30 && (
                  <div className="text-[10px] font-mono text-gray-400 flex items-center justify-between border-t border-[#221c10] pt-1.5">
                    <span>{lang === 'vi' ? 'Lên Bậc Tiêu Chuẩn (9%):' : 'Upgrade to Standard (9%):'}</span>
                    <span className="text-amber-400 font-bold">
                      {lang === 'vi' ? `Còn ${30 - actualHoldingDays} ngày (tiết kiệm 6%)` : `${30 - actualHoldingDays} days left (save 6%)`}
                    </span>
                  </div>
                )}
                {actualHoldingDays >= 30 && actualHoldingDays <= 90 && (
                  <div className="text-[10px] font-mono text-gray-400 flex items-center justify-between border-t border-[#221c10] pt-1.5">
                    <span>{lang === 'vi' ? 'Lên Bậc VIP Trung Thành (4%):' : 'Upgrade to VIP Loyal (4%):'}</span>
                    <span className="text-emerald-400 font-bold">
                      {lang === 'vi' ? `Còn ${91 - actualHoldingDays} ngày (tiết kiệm thêm 5%)` : `${91 - actualHoldingDays} days left (save 5%)`}
                    </span>
                  </div>
                )}
                {actualHoldingDays > 90 && (
                  <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 border-t border-[#221c10] pt-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    <span>{lang === 'vi' ? '👑 Bạn đang hưởng mức phí ưu đãi định chế VIP thấp nhất hệ sinh thái!' : '👑 You have unlocked the institutional lowest VIP tier!'}</span>
                  </div>
                )}
              </div>

              {/* P2P Retention Upsell */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-[#d4af37]/15 to-[#080b12] border border-[#d4af37]/40 flex items-center justify-between text-xs">
                <div className="space-y-0.5 pr-2">
                  <span className="text-white font-bold block flex items-center gap-1.5 text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-[#f5d77f] flex-shrink-0" />
                    <span>{lang === 'vi' ? 'Cần tiền mặt gấp? Tránh mất phí rút vốn!' : 'Need emergency cash? Avoid exit fee!'}</span>
                  </span>
                  <span className="text-[10px] text-gray-400 font-sans block">
                    {lang === 'vi' ? 'Ký quỹ bảo đảm 70% tại [KÝ QUỸ P2P] nhận thanh khoản tạm thời, 30% bộ đệm còn lại tiếp tục trade định lượng.' : 'Pledge 70% equity in [P2P ESCROW] for temporary liquidity while 30% margin maintains quant trading.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMode('p2p_lending')}
                  className="px-2.5 py-1.5 rounded-xl gold-btn-solid text-black text-[10px] font-mono font-black flex-shrink-0 active:scale-95 shadow-md"
                >
                  {lang === 'vi' ? 'KÝ QUỸ P2P →' : 'P2P ESCROW →'}
                </button>
              </div>
            </div>
          )}

          {/* Fee Engine Realtime Breakdown Card */}
          <div className="bg-[#05070c] rounded-2xl p-4 border border-[#221c10] text-xs space-y-2">
            <div className="flex justify-between text-gray-400">
              <span>{lang === 'vi' ? 'Số Tiền Rút Gốc:' : 'Gross Withdrawal Amount:'}</span>
              <span className="font-bold text-gray-200 font-mono">${withdrawBreakdown.grossAmount.toFixed(2)} USDT</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>{isRefSource ? (lang === 'vi' ? 'Phí Sàn (Treasury Policy):' : 'Treasury Fee:') : `${lang === 'vi' ? 'Phí Rút Bậc Thang' : 'Tiered Exit Fee'} (${(withdrawBreakdown.percentageRate * 100).toFixed(0)}%):`}</span>
              <span className={isRefSource ? "font-bold text-emerald-400 font-mono" : "font-bold text-[#ff2d55] font-mono"}>
                {isRefSource ? (lang === 'vi' ? '0% (MIỄN PHÍ)' : '0% (FREE)') : `-$${withdrawBreakdown.percentageFee.toFixed(2)} USDT`}
              </span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>{lang === 'vi' ? 'Phí Mạng On-chain ($5.00 USD):' : 'Fixed On-Chain Network Fee ($5.00 USD):'}</span>
              <span className="font-bold text-amber-400 font-mono">-$5.00 USDT</span>
            </div>

            <div className="border-t border-[#221c10] pt-2 flex justify-between font-black text-sm text-white">
              <span className={isRefSource ? "text-emerald-400" : "text-[#f5d77f]"}>{lang === 'vi' ? 'Thực Nhận Về Ví:' : 'Net Received:'}</span>
              <span className={withdrawBreakdown.netAmount <= 0 ? "text-red-500 font-black font-mono" : (isRefSource ? "text-emerald-400 font-mono" : "text-[#f5d77f] font-mono")}>
                ${withdrawBreakdown.netAmount.toFixed(2)} USDT
              </span>
            </div>
          </div>

          {withdrawBreakdown.netAmount <= 0 && (
            <div className="bg-red-500/20 border border-red-500 p-3 rounded-2xl text-xs font-bold text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>⛔ {lang === 'vi' ? 'Số tiền thực nhận nhỏ hơn $0! Vui lòng nhập số tiền rút tối thiểu $6.50 USD.' : 'Negative payout amount! Please enter a withdrawal amount greater than $6.50 USD.'}</span>
            </div>
          )}

          <button
            onClick={handleWithdrawConfirm}
            disabled={loading || withdrawBreakdown.netAmount <= 0 || numAmount > currentAvailableWithdraw}
            className={`w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
              loading || withdrawBreakdown.netAmount <= 0 || numAmount > currentAvailableWithdraw
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                : isRefSource
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-black shadow-[0_4px_14px_rgba(16,185,129,0.3)] hover:opacity-95'
                : 'spartan-cta-btn text-white shadow-[0_4px_18px_rgba(255,69,0,0.4)] hover:opacity-95'
            }`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>
              {numAmount > currentAvailableWithdraw
                ? (isRefSource ? (lang === 'vi' ? 'KHÓA (VƯỢT QUÁ CHIẾT KHẤU KHẢ DỤNG)' : 'LOCKED (EXCEEDS AVAILABLE REBATE)') : (lang === 'vi' ? 'KHÓA (SỐ DƯ KHÔNG ĐỦ)' : 'LOCKED (INSUFFICIENT BALANCE)'))
                : withdrawBreakdown.netAmount <= 0
                ? (lang === 'vi' ? 'KHÔNG THỂ RÚT (SỐ TIỀN ÂM)' : 'CANNOT WITHDRAW (NEGATIVE AMOUNT)')
                : isRefSource
                ? (lang === 'vi' ? `XÁC NHẬN RÚT CHIẾT KHẤU (THỰC NHẬN $${withdrawBreakdown.netAmount.toFixed(2)} USDT)` : `CONFIRM REBATE WITHDRAWAL (NET $${withdrawBreakdown.netAmount.toFixed(2)} USDT)`)
                : (lang === 'vi' ? `XÁC NHẬN RÚT VỐN (THỰC NHẬN $${withdrawBreakdown.netAmount.toFixed(2)} USDT)` : `CONFIRM WITHDRAWAL (NET $${withdrawBreakdown.netAmount.toFixed(2)} USDT)`)}
            </span>
          </button>

          {/* Quick Link to Transaction History */}
          <div className="pt-2 text-center border-t border-[#221c10]/60">
            <button
              type="button"
              onClick={() => setMode('history')}
              className="text-[11px] text-gray-400 hover:text-[#f5d77f] font-mono inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              <History className="w-3.5 h-3.5 text-[#f5d77f]" />
              <span>{lang === 'vi' ? 'Xem lịch sử các đơn rút tiền →' : 'View withdrawal transaction history →'}</span>
            </button>
          </div>
        </div>
      )}

      {/* P2P LENDING VIEW */}
      {mode === 'p2p_lending' && (
        <P2pLendingView
          currentBalance={currentBalance}
          telegramId={telegramId}
          username={username}
        />
      )}

      {/* DEDICATED TRANSACTION HISTORY SUB-TAB */}
      {mode === 'history' && (
        <div className="spartan-card rounded-3xl p-4 border border-[#221c10] bg-[#080b12] space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#221c10] pb-2.5">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <History className="w-4 h-4 text-[#f5d77f]" /> {t('wallet_ledger_title')}
          </h3>
          <span className="text-[10px] text-gray-400 font-bold font-mono">
            {lang === 'vi' ? `Tổng ${allTransactions.length} giao dịch` : `Total ${allTransactions.length} Transactions`}
          </span>
        </div>

        <div className="space-y-2">
          {paginatedTxs.length === 0 ? (
            <div className="text-center py-6 text-xs font-bold text-gray-500 bg-[#05070c] rounded-2xl border border-[#221c10]">
              {lang === 'vi' ? 'Chưa có giao dịch nào được ghi nhận.' : 'No transactions recorded yet.'}
            </div>
          ) : (
            paginatedTxs.map((tx) => {
              const txKey = tx.id || tx.memoCode || 'TX';
              const isExpanded = expandedTxId === txKey;

              return (
                <div
                  key={txKey}
                  className="rounded-2xl bg-[#05070c] border border-[#221c10] hover:border-[#d4af37]/30 transition-all text-xs animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden"
                >
                  {/* Summary Header Row (Clickable) */}
                  <div 
                    onClick={() => setExpandedTxId(isExpanded ? null : txKey)}
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-[#0c0f17] transition-colors select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-black ${
                          tx.type === 'DEPOSIT'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-[#ff2d55]/15 text-[#ff2d55] border border-[#ff2d55]/30'
                        }`}
                      >
                        {tx.type === 'DEPOSIT' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white">
                            {tx.type === 'DEPOSIT' ? (lang === 'vi' ? 'NẠP TIỀN' : 'DEPOSIT') : (lang === 'vi' ? 'RÚT TIỀN' : 'WITHDRAW')}
                          </span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-black ${
                            tx.status === 'APPROVED' 
                              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                              : tx.status === 'PENDING' 
                              ? 'text-[#f5d77f] bg-[#d4af37]/10 border-[#d4af37]/30' 
                              : 'text-[#ff2d55] bg-[#ff2d55]/10 border-[#ff2d55]/20'
                          }`}>
                            {tx.status === 'APPROVED' ? (lang === 'vi' ? 'ĐÃ DUYỆT' : 'APPROVED') : tx.status === 'PENDING' ? (lang === 'vi' ? 'CHỜ DUYỆT' : 'PENDING') : (lang === 'vi' ? 'TỪ CHỐI' : 'REJECTED')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono mt-0.5">
                          <span>Memo: {tx.memoCode}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5 text-gray-400">
                            <Clock className="w-3 h-3 text-gray-500" />
                            {formatTxTime(tx.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right font-mono">
                        <span
                          className={`font-black text-xs block ${
                            tx.type === 'DEPOSIT' ? 'text-emerald-400' : 'text-[#ff2d55]'
                          }`}
                        >
                          {tx.type === 'DEPOSIT' ? `+$${tx.netAmount.toFixed(2)}` : `-$${tx.netAmount.toFixed(2)}`}
                        </span>
                        <span className="text-[9px] text-gray-400 font-bold block">
                          {lang === 'vi' ? 'Phí:' : 'Fee:'} -${tx.feeAmount.toFixed(2)}
                        </span>
                      </div>
                      <button className="p-1 rounded-lg text-gray-400 hover:text-white transition-colors">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-[#f5d77f]" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Button to Appeal AI Scanner if Rejected */}
                  {tx.type === 'DEPOSIT' && tx.status === 'REJECTED' && (
                    <div className="px-3 pb-2.5 pt-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); setAiAppealTx(tx); }}
                        className="w-full py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 text-purple-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                      >
                        <Camera className="w-3.5 h-3.5 text-purple-400" />
                        <span>📸 Gửi Bill AI Quét & Duyệt Lại</span>
                      </button>
                    </div>
                  )}

                  {/* EXPANDED FEE & ON-CHAIN DETAIL BREAKDOWN */}
                  {isExpanded && (
                    <div className="p-3.5 bg-[#131927]/90 border-t border-[#1f293d] space-y-2.5 text-[11px] animate-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between text-gray-400 font-mono">
                        <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                          <Receipt className="w-3.5 h-3.5 text-amber-400" />
                          <span>CHI TIẾT BẢNG KÊ KHẤU TRỪ PHÍ:</span>
                        </span>
                        <span className="text-[10px] text-gray-500">Mã đơn: #{tx.id || tx.memoCode}</span>
                      </div>

                      <div className="space-y-1.5 bg-[#07090e] p-3 rounded-2xl border border-[#1f293d] font-mono text-[11px]">
                        <div className="flex justify-between text-gray-300 pb-1 border-b border-[#1f293d]/50">
                          <span>• Số tiền gốc ({tx.type === 'DEPOSIT' ? 'Nạp vào' : 'Yêu cầu rút'}):</span>
                          <span className="text-white font-bold">${tx.grossAmount.toFixed(2)} USDT</span>
                        </div>

                        {tx.type === 'DEPOSIT' ? (
                          <>
                            <div className="flex justify-between text-amber-300/90 text-[10px] pl-2">
                              <span>  - Phí quản trị & nền tảng (9%):</span>
                              <span>-${(tx.grossAmount * 0.09).toFixed(2)} USDT</span>
                            </div>
                            <div className="flex justify-between text-amber-300/90 text-[10px] pl-2">
                              <span>  - Phí On-Chain Gas & Đối soát:</span>
                              <span>-$3.00 USDT</span>
                            </div>
                          </>
                        ) : (String(tx.id || '').includes('REF') || String(tx.memoCode || '').includes('REF') || tx.feeAmount <= 5.0) ? (
                          <>
                            <div className="flex justify-between text-[#00df89] text-[10px] pl-2">
                              <span>  - Phí sàn (Treasury Policy):</span>
                              <span>0% ($0.00 USDT - MIỄN PHÍ ĐỐI TÁC)</span>
                            </div>
                            <div className="flex justify-between text-amber-300/90 text-[10px] pl-2">
                              <span>  - Phí On-Chain Gas chuyển tiền (TRC20):</span>
                              <span>-${tx.feeAmount.toFixed(2)} USDT</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between text-blue-300/90 text-[10px] pl-2">
                              <span>  - Trích giữ Quỹ Dự Phòng (10% Retention):</span>
                              <span>-${(tx.grossAmount * 0.10).toFixed(2)} USDT</span>
                            </div>
                            <div className="flex justify-between text-amber-300/90 text-[10px] pl-2">
                              <span>  - Phí cổng thanh toán & xử lý (9%):</span>
                              <span>-${(tx.grossAmount * 0.09).toFixed(2)} USDT</span>
                            </div>
                            <div className="flex justify-between text-amber-300/90 text-[10px] pl-2">
                              <span>  - Phí On-Chain Gas chuyển tiền:</span>
                              <span>-$5.00 USDT</span>
                            </div>
                          </>
                        )}

                        <div className="border-t border-[#1f293d] pt-1.5 flex justify-between text-[#ff2d55] font-bold">
                          <span>Tổng các khoản phí đã trừ:</span>
                          <span>-${tx.feeAmount.toFixed(2)} USDT</span>
                        </div>

                        <div className="border-t border-[#1f293d] pt-1.5 flex justify-between text-[#00df89] font-black text-xs">
                          <span>{tx.type === 'DEPOSIT' ? '✓ Thực nhận vào Vốn Bot:' : '✓ Thực chuyển về ví:'}</span>
                          <span>+${tx.netAmount.toFixed(2)} USDT</span>
                        </div>
                      </div>

                      {/* Mechanism & Approved Info */}
                      <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono px-1">
                        <span>Duyệt bởi: <strong className="text-white">{tx.approvedBy || (tx.status === 'PENDING' ? 'Đang chờ duyệt' : 'Hệ thống')}</strong></span>
                        {tx.rejectionReason && <span className="text-red-400 truncate max-w-[180px]">Lý do: {tx.rejectionReason}</span>}
                      </div>

                      {tx.status === 'REJECTED' && tx.type === 'WITHDRAW' && (
                        <div className="bg-[#00df89]/10 border border-[#00df89]/30 p-2 rounded-xl text-[10px] text-[#00df89] font-bold text-center">
                          ✓ ĐÃ HOÀN TRẢ 100% (+${tx.grossAmount.toFixed(2)} USDT) VỀ LẠI SỐ DƯ TÀI KHOẢN
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {allTransactions.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between border-t border-[#1f293d] pt-3 text-xs font-bold">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={validPage === 1}
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-1 transition-all ${
                validPage === 1
                  ? 'border-gray-800 text-gray-600 bg-gray-900/50 cursor-not-allowed'
                  : 'border-[#1f293d] bg-[#131927] text-white hover:bg-[#1f293d]'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <span className="text-gray-400 font-mono text-[11px]">
              Page <strong className="text-white">{validPage}</strong> of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={validPage >= totalPages}
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-1 transition-all ${
                validPage >= totalPages
                  ? 'border-gray-800 text-gray-600 bg-[#131927]/50 cursor-not-allowed'
                  : 'border-[#1f293d] bg-[#131927] text-white hover:bg-[#1f293d]'
              }`}
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      )}

      {/* AI RECEIPT FORENSICS & SCANNER APPEAL MODAL */}
      <ReceiptAiAppealModal
        isOpen={!!aiAppealTx}
        onClose={() => setAiAppealTx(null)}
        orderId={aiAppealTx?.id || aiAppealTx?.memoCode}
        expectedGrossAmount={aiAppealTx?.grossAmount}
        userId={telegramId}
        username={username}
        onSuccessApproved={() => {
          setAiAppealTx(null);
          setRejectedAlert(null);
          setNotification('🎉 AI ĐÃ ĐỐI SOÁT VÀ TỰ ĐỘNG DUYỆT NẠP TIỀN THÀNH CÔNG!');
          setTimeout(() => setNotification(null), 8000);
          if (telegramId) {
            fetch(`https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app/users/${telegramId}.json`)
              .then(r => r.json())
              .then(data => {
                if (data && typeof data.tradingBalance === 'number') {
                  onUpdateBalance(data.tradingBalance);
                }
              })
              .catch(() => {});
          }
        }}
      />

      {/* INSTITUTIONAL RISK DISCLOSURE & DIGITAL SIGNATURE AGREEMENT MODAL */}
      <RiskDisclosureModal
        isOpen={isRiskModalOpen}
        onClose={() => setIsRiskModalOpen(false)}
        depositAmount={numAmount}
        userId={telegramId}
        username={username}
        onConfirm={handleDepositAfterSigned}
      />
    </div>
  );
};
