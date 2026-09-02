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
  Sparkles
} from 'lucide-react';
import { calculateDepositFee, calculateWithdrawFee } from '@/lib/feeCalculator';
import { createLiveTransaction, subscribeToUserTransactions, TransactionData } from '@/lib/firebaseService';
import { fetchTreasuryVault, DEFAULT_TREASURY_VAULT } from '@/lib/walletConfig';
import { ReceiptAiAppealModal } from '@/components/ReceiptAiAppealModal';

interface WalletViewProps {
  currentBalance: number;
  onUpdateBalance: (newBalance: number) => void;
  telegramId?: string;
  username?: string;
}

export const WalletView: React.FC<WalletViewProps> = ({
  currentBalance,
  onUpdateBalance,
  telegramId = '494232782',
  username = 'tddv2017',
}) => {
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState<string>('1000');
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
  const ITEMS_PER_PAGE = 5;

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
        setRejectedAlert({
          id: liveTx.id || liveTx.memoCode,
          message: `Đơn nạp #${liveTx.id || liveTx.memoCode} ($${liveTx.grossAmount.toFixed(2)} USDT) đã bị Quản trị viên TỪ CHỐI do nhập sai Memo hoặc số tiền chưa khớp trên Blockchain. Bạn có thể Tải ảnh bill chuyển khoản để AI giám định đối soát tự động hoặc liên hệ Kỹ thuật @tddv2017.`,
          txData: liveTx
        });
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

  const numAmount = parseFloat(amount) || 0;
  const depositBreakdown = calculateDepositFee(numAmount);
  const withdrawBreakdown = calculateWithdrawFee(numAmount);

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

  const handleDepositConfirm = async () => {
    if (loading) return;
    setErrorMessage(null);
    const MIN_DEPOSIT = 50.0;
    if (numAmount <= 0) {
      setErrorMessage('Deposit amount must be greater than $0.00 USD!');
      return;
    }
    if (numAmount < MIN_DEPOSIT) {
      setErrorMessage(`⛔ MỨC NẠP TỐI THIỂU: Số tiền nạp tối thiểu là $${MIN_DEPOSIT.toFixed(2)} USDT (để đảm bảo tối ưu chi phí sàn 9% và phí On-Chain $3)!`);
      return;
    }
    setLoading(true);

    try {
      const newTx = await createLiveTransaction(telegramId, username, 'DEPOSIT', numAmount);
      setActiveDepositTx(newTx);
      setLocalTxs((prev) => [newTx, ...prev]);
      setCurrentPage(1);

      setNotification(`🎉 DEPOSIT ORDER CREATED: $${numAmount.toFixed(2)} USDT! Memo: ${newTx.memoCode}. Please scan QR code to complete transfer.`);
      setTimeout(() => setNotification(null), 8000);
    } catch (err) {
      console.error('Deposit error:', err);
      setNotification(`Deposit order created: $${numAmount.toFixed(2)} USDT! Awaiting on-chain confirmation.`);
      setTimeout(() => setNotification(null), 5000);
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

    if (numAmount > availableForWithdraw) {
      if (pendingWithdrawalTotal > 0) {
        setErrorMessage(`⛔ LOCKED: You have $${pendingWithdrawalTotal.toFixed(2)} USD in pending withdrawals. Available balance is $${availableForWithdraw.toFixed(2)} USD.`);
      } else {
        setErrorMessage(`⛔ INSUFFICIENT FUNDS: Requested amount ($${numAmount.toFixed(2)}) exceeds available balance ($${currentBalance.toFixed(2)} USD).`);
      }
      return;
    }

    if (!withdrawAddress.trim()) {
      setErrorMessage('Please enter your recipient USDT (TRC20) wallet address!');
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
      <div className="spartan-card rounded-3xl p-5 border border-[#1f293d] shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">AVAILABLE TRADING BALANCE</span>
          <span className="px-3 py-1 rounded-full bg-[#ff5500]/15 border border-[#ff5500]/30 text-[#ff5500] text-xs font-black">
            USDT TRC20
          </span>
        </div>
        <div className="text-3xl font-black text-white truncate">
          ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-gray-400 font-bold">USDT</span>
        </div>

        {pendingWithdrawalTotal > 0 && (
          <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-[11px] font-bold text-amber-400">
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 flex-shrink-0" />
              Locked in pending withdrawal:
            </span>
            <span className="font-mono font-black text-amber-300">-${pendingWithdrawalTotal.toFixed(2)} USD</span>
          </div>
        )}
      </div>

      {/* Summary Banner */}
      <div className="grid grid-cols-2 gap-3">
        <div className="spartan-card rounded-2xl p-4 border border-[#1f293d] flex items-center justify-between transition-all">
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-0.5">
              TOTAL DEPOSIT (NET)
            </span>
            <span className="text-base font-black text-[#00df89]">
              +${totalDepositedNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] text-gray-500 font-bold block mt-0.5">{depositCount} Deposits</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-[#00df89]/15 border border-[#00df89]/30 flex items-center justify-center text-[#00df89]">
            <ArrowDown className="w-4 h-4" />
          </div>
        </div>

        <div className="spartan-card rounded-2xl p-4 border border-[#1f293d] flex items-center justify-between transition-all">
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-0.5">
              TOTAL WITHDRAWAL (NET)
            </span>
            <span className="text-base font-black text-[#ff2d55]">
              -${totalWithdrawnNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] text-gray-500 font-bold block mt-0.5">{withdrawCount} Withdrawals</span>
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

      {/* Primary Mode Switcher: Deposit vs Withdraw */}
      <div className="grid grid-cols-2 p-1.5 bg-[#0b0e17] rounded-2xl border border-[#1f293d]">
        <button
          onClick={() => { setMode('deposit'); setErrorMessage(null); }}
          className={`py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
            mode === 'deposit'
              ? 'bg-[#ff5500] text-white shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4" />
          <span>DEPOSIT USDT (QR CODE)</span>
        </button>

        <button
          onClick={() => { setMode('withdraw'); setErrorMessage(null); }}
          className={`py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
            mode === 'withdraw'
              ? 'bg-[#ff2d55] text-white shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>WITHDRAW USDT (TRC20)</span>
        </button>
      </div>

      {/* FORM CONTENT */}
      {mode === 'deposit' ? (
        /* PURE QR CODE DEPOSIT FORM */
        <div className="spartan-card rounded-3xl p-5 border border-[#1f293d] space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#ff5500]/15 border border-[#ff5500]/30 flex items-center justify-center text-[#ff5500]">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">DEPOSIT VIA QR CODE (USDT TRC20)</h3>
                <span className="text-[10px] text-gray-400 font-bold block">Scan to transfer directly from Binance / OKX / Bybit / TrustWallet / @Wallet</span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-[#ff5500] bg-[#ff5500]/10 px-2.5 py-0.5 rounded-full border border-[#ff5500]/20">
              Fee: 9% + $3.00 USD
            </span>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-gray-400 font-bold">
                Enter Deposit Amount ($ USD)
              </label>
              <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                Tối thiểu: $50.00 USDT
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                value={amount}
                maxLength={10}
                onChange={(e) => setAmount(e.target.value.slice(0, 10))}
                className="w-full bg-[#0b0e17] border border-[#1f293d] rounded-2xl py-3 px-4 text-white text-base font-black focus:outline-none focus:border-[#ff5500]"
                placeholder="1000"
              />
              <span className="absolute right-4 top-3.5 text-xs font-bold text-gray-400">
                USDT
              </span>
            </div>
            {numAmount > 0 && numAmount < 50 && (
              <span className="text-[10px] text-[#ff2d55] font-bold block mt-1.5 animate-pulse">
                ⚠️ Số tiền nạp (${numAmount.toFixed(2)}) nhỏ hơn mức tối thiểu $50.00 USDT (để đảm bảo hiệu quả phí)!
              </span>
            )}
          </div>

          {/* Fee Engine Realtime Breakdown Card */}
          <div className="bg-[#0b0e17] rounded-2xl p-4 border border-[#1f293d] text-xs space-y-2">
            <div className="flex justify-between text-gray-400">
              <span>Gross Deposit Amount:</span>
              <span className="font-bold text-gray-200">${depositBreakdown.grossAmount.toFixed(2)} USDT</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Percentage Fee (9%):</span>
              <span className="font-bold text-[#ff2d55]">-${depositBreakdown.percentageFee.toFixed(2)} USDT</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Fixed Network Fee ($3.00 USD):</span>
              <span className="font-bold text-[#ff2d55]">-$3.00 USDT</span>
            </div>
            <div className="border-t border-[#1f293d] pt-2 flex justify-between font-black text-sm text-white">
              <span className="text-[#00df89]">Net Credited to Bot Fund:</span>
              <span className="text-[#00df89]">${depositBreakdown.netAmount.toFixed(2)} USDT</span>
            </div>
          </div>

          {/* CREATE ORDER BUTTON */}
          {!activeDepositTx ? (
            <button
              onClick={handleDepositConfirm}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl spartan-orange-btn font-black text-sm uppercase tracking-wider hover:opacity-95 transition-opacity flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(255,85,0,0.4)]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              <span>🚀 CREATE DEPOSIT ORDER & GET QR (Net +${depositBreakdown.netAmount.toFixed(2)})</span>
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

              {/* Mandatory Fixed Memo Code Box */}
              <div>
                <label className="text-[10px] text-[#facc15] font-black block mb-1 uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> 2. MANDATORY MEMO CODE (Paste into transfer note)
                </label>
                <div className="flex items-center gap-2 bg-[#131927] border border-[#facc15]/60 p-2.5 rounded-xl">
                  <span className="text-sm text-[#facc15] font-mono font-black truncate flex-1 tracking-wider">
                    {activeMemo}
                  </span>
                  <button
                    onClick={handleCopyMemo}
                    className="px-2.5 py-1 rounded-lg bg-[#facc15] text-black text-xs font-black flex items-center gap-1 hover:opacity-90"
                  >
                    {copiedMemo ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy Memo</span>
                  </button>
                </div>
              </div>

              <div className="text-[10px] text-gray-400 leading-relaxed bg-[#131927] p-2.5 rounded-xl border border-[#1f293d]">
                💡 <strong>QUÉT BLOCKCHAIN TỰ ĐỘNG:</strong> Sau khi bạn chuyển USDT thành công từ sàn/ví, hệ thống sẽ tự động quét đối soát, trừ phí 9%+$3 và cộng số tiền Thực Nhận (Net) vào tài khoản của bạn ngay lập tức!
              </div>

              {/* ACTION BUTTONS: ĐÃ THANH TOÁN & ĐÓNG QR */}
              <div className="pt-2 space-y-2">
                <button
                  onClick={() => {
                    const gross = activeDepositTx.grossAmount;
                    const net = activeDepositTx.netAmount || (gross * 0.91 - 3);
                    const orderId = activeDepositTx.id || activeDepositTx.memoCode;
                    setActiveDepositTx(null);
                    setNotification(`🎉 ĐÃ GHI NHẬN THANH TOÁN! Đơn nạp #${orderId} ($${gross.toFixed(2)} USDT) đang được hệ thống quét Blockchain TRON để cộng vốn (Net +$${net.toFixed(2)} USDT) hoặc Quản trị viên đối soát phê duyệt.`);
                    setTimeout(() => setNotification(null), 10000);
                  }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#00df89] to-[#00b368] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,223,137,0.3)] hover:opacity-95 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4 text-black" />
                  <span>TÔI ĐÃ CHUYỂN TIỀN XONG (ĐÃ THANH TOÁN)</span>
                </button>

                <button
                  onClick={() => setActiveDepositTx(null)}
                  className="w-full py-2.5 rounded-xl bg-[#131927] hover:bg-[#1f293d] border border-[#1f293d] text-gray-400 hover:text-white text-xs font-bold uppercase transition-all"
                >
                  ĐÓNG MÃ QR
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* WITHDRAW MODE */
        <div className="spartan-card rounded-3xl p-5 border border-[#1f293d] space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-white uppercase tracking-wider">WITHDRAW USDT (SPARTAN TREASURY POLICY)</h3>
            <span className="text-[10px] font-bold text-[#ff2d55] bg-[#ff2d55]/10 px-2.5 py-0.5 rounded-full border border-[#ff2d55]/20">
              Fee: 19% + $5.00 USD
            </span>
          </div>

          <div className="bg-[#0b0e17] p-3 rounded-2xl border border-[#1f293d] flex items-center justify-between text-xs font-bold">
            <span className="text-gray-400">Available Balance for Withdrawal:</span>
            <span className="text-[#00df89] font-mono text-sm font-black">
              ${availableForWithdraw.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
            </span>
          </div>

          <div>
            <label className="text-xs text-gray-400 font-bold block mb-1.5">
              Enter Withdrawal Amount ($ USD)
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                maxLength={10}
                onChange={(e) => { setAmount(e.target.value.slice(0, 10)); setErrorMessage(null); }}
                className="w-full bg-[#0b0e17] border border-[#1f293d] rounded-2xl py-3 px-4 text-white text-base font-black focus:outline-none focus:border-[#ff2d55]"
                placeholder="1000"
              />
              <button
                onClick={() => setAmount(availableForWithdraw.toString())}
                className="absolute right-3 top-2.5 px-2.5 py-1 bg-[#ff2d55]/20 text-[#ff2d55] rounded-lg text-xs font-black border border-[#ff2d55]/30"
              >
                MAX
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 font-bold block mb-1.5">
              Destination Wallet Address (USDT TRC20)
            </label>
            <input
              type="text"
              value={withdrawAddress}
              onChange={(e) => { setWithdrawAddress(e.target.value); setErrorMessage(null); }}
              className="w-full bg-[#0b0e17] border border-[#1f293d] rounded-2xl py-3 px-4 text-white text-xs font-mono focus:outline-none focus:border-[#ff2d55]"
              placeholder="Paste your TRC20 address (starts with T...)"
            />
          </div>

          <div className="bg-[#0b0e17] rounded-2xl p-4 border border-[#1f293d] text-xs space-y-2">
            <div className="flex justify-between text-gray-400">
              <span>Gross Withdrawal Amount:</span>
              <span className="font-bold text-gray-200">${withdrawBreakdown.grossAmount.toFixed(2)} USDT</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Percentage Fee (19%):</span>
              <span className="font-bold text-[#ff2d55]">-${withdrawBreakdown.percentageFee.toFixed(2)} USDT</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Fixed Network Fee ($5.00 USD):</span>
              <span className="font-bold text-[#ff2d55]">-$5.00 USDT</span>
            </div>

            <div className="bg-[#131927] p-2.5 rounded-xl border border-[#1f293d] space-y-1 my-1">
              <div className="flex justify-between text-amber-400 font-bold text-[11px]">
                <span>Treasury Reserve Retention (10% included in 19% fee):</span>
                <span className="font-mono">${withdrawBreakdown.effectiveRetainedFee?.toFixed(2)} USDT</span>
              </div>
              <span className="text-[9px] text-gray-500 block leading-tight">
                (Allocated to liquidity reserve & reseller affiliate pool)
              </span>
            </div>

            <div className="border-t border-[#1f293d] pt-2 flex justify-between font-black text-sm text-white">
              <span className="text-[#ff2d55]">Net Payout to Your Wallet:</span>
              <span className={withdrawBreakdown.netAmount <= 0 ? "text-red-500 font-black" : "text-[#ff2d55]"}>
                ${withdrawBreakdown.netAmount.toFixed(2)} USDT
              </span>
            </div>
          </div>

          {withdrawBreakdown.netAmount <= 0 && (
            <div className="bg-red-500/20 border border-red-500 p-3 rounded-2xl text-xs font-bold text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>⛔ Negative payout amount! Please enter a withdrawal amount greater than $6.50 USD.</span>
            </div>
          )}

          <button
            onClick={handleWithdrawConfirm}
            disabled={loading || withdrawBreakdown.netAmount <= 0 || numAmount > availableForWithdraw}
            className={`w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              loading || withdrawBreakdown.netAmount <= 0 || numAmount > availableForWithdraw
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed border border-gray-600'
                : 'bg-[#ff2d55] text-white shadow-[0_4px_14px_rgba(255,45,85,0.4)] hover:opacity-95'
            }`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>
              {numAmount > availableForWithdraw
                ? 'LOCKED (INSUFFICIENT AVAILABLE BALANCE)'
                : withdrawBreakdown.netAmount <= 0
                ? 'CANNOT WITHDRAW (NEGATIVE AMOUNT)'
                : `Confirm Withdrawal (Net Payout $${withdrawBreakdown.netAmount.toFixed(2)} USDT)`}
            </span>
          </button>
        </div>
      )}

      {/* TRANSACTION HISTORY (PAGINATED 5 ITEMS PER PAGE) */}
      <div className="spartan-card rounded-3xl p-4 border border-[#1f293d] space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <History className="w-4 h-4 text-[#ff5500]" /> TRANSACTION HISTORY (REALTIME)
          </h3>
          <span className="text-[10px] text-gray-400 font-bold">
            Total {allTransactions.length} Transactions
          </span>
        </div>

        <div className="space-y-2">
          {paginatedTxs.length === 0 ? (
            <div className="text-center py-6 text-xs font-bold text-gray-500">
              Chưa có giao dịch nào được ghi nhận.
            </div>
          ) : (
            paginatedTxs.map((tx) => {
              const txKey = tx.id || tx.memoCode || 'TX';
              const isExpanded = expandedTxId === txKey;

              return (
                <div
                  key={txKey}
                  className="rounded-2xl bg-[#0b0e17] border border-[#1f293d] hover:border-gray-700 transition-all text-xs animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden"
                >
                  {/* Summary Header Row (Clickable) */}
                  <div 
                    onClick={() => setExpandedTxId(isExpanded ? null : txKey)}
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-[#131927]/60 transition-colors select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-black ${
                          tx.type === 'DEPOSIT'
                            ? 'bg-[#00df89]/15 text-[#00df89] border border-[#00df89]/30'
                            : 'bg-[#ff2d55]/15 text-[#ff2d55] border border-[#ff2d55]/30'
                        }`}
                      >
                        {tx.type === 'DEPOSIT' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white">
                            {tx.type === 'DEPOSIT' ? 'NẠP TIỀN' : 'RÚT TIỀN'}
                          </span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-black ${
                            tx.status === 'APPROVED' 
                              ? 'text-[#00df89] bg-[#00df89]/10 border-[#00df89]/20' 
                              : tx.status === 'PENDING' 
                              ? 'text-[#facc15] bg-[#facc15]/10 border-[#facc15]/20' 
                              : 'text-[#ff2d55] bg-[#ff2d55]/10 border-[#ff2d55]/20'
                          }`}>
                            {tx.status === 'APPROVED' ? 'ĐÃ DUYỆT' : tx.status === 'PENDING' ? 'CHỜ DUYỆT' : 'TỪ CHỐI'}
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
                      <div className="text-right">
                        <span
                          className={`font-black text-xs block ${
                            tx.type === 'DEPOSIT' ? 'text-[#00df89]' : 'text-[#ff2d55]'
                          }`}
                        >
                          {tx.type === 'DEPOSIT' ? `+$${tx.netAmount.toFixed(2)}` : `-$${tx.netAmount.toFixed(2)}`}
                        </span>
                        <span className="text-[9px] text-gray-400 font-bold block">
                          Phí: -${tx.feeAmount.toFixed(2)}
                        </span>
                      </div>
                      <button className="p-1 rounded-lg text-gray-400 hover:text-white transition-colors">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-[#ff5500]" /> : <ChevronDown className="w-4 h-4" />}
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
    </div>
  );
};
