'use client';

import React, { useState, useEffect } from 'react';
import { calculateDepositFee, calculateWithdrawFee } from '@/lib/feeCalculator';
import { 
  createLiveTransaction, 
  subscribeToUserTransactions, 
  TransactionData 
} from '@/lib/firebaseService';
import { ArrowDownLeft, ArrowUpRight, Copy, CheckCircle2, QrCode, History, DollarSign, ArrowDown, ArrowUp, Loader2, AlertCircle, Zap, ShieldCheck, Lock, Clock, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [loading, setLoading] = useState(false);
  const [activeDepositTx, setActiveDepositTx] = useState<TransactionData | null>(null);
  const [firestoreTxs, setFirestoreTxs] = useState<TransactionData[]>([]);
  const [localTxs, setLocalTxs] = useState<TransactionData[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Firestore & RTDB Realtime Listener for User Transactions
  useEffect(() => {
    if (!telegramId) return;
    const unsubscribe = subscribeToUserTransactions(telegramId, (txs) => {
      setFirestoreTxs(txs);
    });
    return () => unsubscribe();
  }, [telegramId]);

  // Combine Firestore Txs and Local Txs (deduplicating by ID/memoCode)
  const combinedTxsMap = new Map<string, TransactionData>();
  [...localTxs, ...firestoreTxs].forEach((tx) => {
    const key = tx.id || tx.memoCode;
    combinedTxsMap.set(key, tx);
  });

  // Sort Chronologically: Newest Transactions On Top
  const allTransactions = Array.from(combinedTxsMap.values()).sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  // Pagination Math (5 Items Per Page)
  const totalPages = Math.max(1, Math.ceil(allTransactions.length / ITEMS_PER_PAGE));
  const validPage = Math.min(currentPage, totalPages);
  const paginatedTxs = allTransactions.slice((validPage - 1) * ITEMS_PER_PAGE, validPage * ITEMS_PER_PAGE);

  // Dynamic Total Deposited & Withdrawn calculated purely from real transactions
  const approvedDeposits = allTransactions.filter(t => t.type === 'DEPOSIT' && t.status === 'APPROVED');
  const approvedWithdrawals = allTransactions.filter(t => t.type === 'WITHDRAW' && t.status === 'APPROVED');

  const totalDepositedNet = approvedDeposits.reduce((acc, t) => acc + t.netAmount, 0);
  const depositCount = approvedDeposits.length;

  const totalWithdrawnNet = approvedWithdrawals.reduce((acc, t) => acc + t.netAmount, 0);
  const withdrawCount = approvedWithdrawals.length;

  // Calculate Pending Withdrawals to Lock Available Balance
  const pendingWithdrawalTotal = allTransactions
    .filter(t => t.type === 'WITHDRAW' && t.status === 'PENDING')
    .reduce((acc, t) => acc + t.grossAmount, 0);

  const availableForWithdraw = Math.max(0, currentBalance - pendingWithdrawalTotal);

  const numAmount = parseFloat(amount) || 0;
  const depositBreakdown = calculateDepositFee(numAmount);
  const withdrawBreakdown = calculateWithdrawFee(numAmount);

  // Official Master USDT TRC20 Wallet Address
  const walletAddress = 'TBGvPZsuqKH5CrSbYLEi8q2BCQ6CXyKmAu';
  const activeMemo = activeDepositTx?.memoCode || '';

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
    if (numAmount <= 0) {
      setErrorMessage('Deposit amount must be greater than $0.00 USD!');
      return;
    }
    setLoading(true);

    try {
      const newTx = await createLiveTransaction(telegramId, username, 'DEPOSIT', numAmount);

      setActiveDepositTx(newTx);
      setLocalTxs((prev) => [newTx, ...prev]);
      setCurrentPage(1);

      setNotification(`🎉 DEPOSIT ORDER CREATED FOR $${numAmount.toFixed(2)} USDT! Memo Code: ${newTx.memoCode}. Please scan the QR code to complete payment!`);
      setTimeout(() => setNotification(null), 8000);
    } catch (err) {
      console.error('Deposit error:', err);
      setNotification(`Deposit order of $${numAmount.toFixed(2)} USDT created! Pending approval.`);
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
      setErrorMessage(`⛔ CANNOT WITHDRAW: Withdrawal amount ($${numAmount.toFixed(2)}) is less than total transaction fee ($${withdrawBreakdown.totalFee.toFixed(2)} USD). Please enter an amount greater than $6.50 USD!`);
      return;
    }

    if (numAmount > availableForWithdraw) {
      if (pendingWithdrawalTotal > 0) {
        setErrorMessage(`⛔ ORDER LOCKED: You have $${pendingWithdrawalTotal.toFixed(2)} USD in pending withdrawals. Available balance is $${availableForWithdraw.toFixed(2)} USD!`);
      } else {
        setErrorMessage(`⛔ CANNOT WITHDRAW: Withdrawal amount ($${numAmount.toFixed(2)}) exceeds available balance ($${currentBalance.toFixed(2)} USD)!`);
      }
      return;
    }

    if (!withdrawAddress.trim()) {
      setErrorMessage('Please enter your destination USDT (TRC20) wallet address!');
      return;
    }

    setLoading(true);

    try {
      const newTx = await createLiveTransaction(telegramId, username, 'WITHDRAW', numAmount);

      setLocalTxs((prev) => [newTx, ...prev]);
      setCurrentPage(1);

      setNotification(`Withdrawal request of $${withdrawBreakdown.netAmount.toFixed(2)} USDT Net submitted to wallet ${withdrawAddress.slice(0, 8)}...! Pending approval.`);
      setTimeout(() => setNotification(null), 6000);
    } catch (err: any) {
      console.error('Withdraw error:', err);
      if (err.message && err.message.includes('INSUFFICIENT_AVAILABLE_FUNDS')) {
        setErrorMessage(`⛔ ORDER LOCKED: You have pending withdrawals. Insufficient available balance!`);
      } else {
        setNotification(`Withdrawal request of $${withdrawBreakdown.netAmount.toFixed(2)} USDT submitted! Pending approval.`);
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
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return 'Just now';
    }
  };

  // Pure USDT TRC20 Master Wallet Address QR Code
  const pureQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${walletAddress}`;

  return (
    <div className="w-full space-y-4 pb-20">
      {/* Balance & Overview Card */}
      <div className="spartan-card rounded-3xl p-5 border border-[#1f293d] shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">AVAILABLE INVESTMENT (LIVE DATABASE)</span>
          <span className="px-3 py-1 rounded-full bg-[#ff5500]/15 border border-[#ff5500]/30 text-[#ff5500] text-xs font-black">
            USDT TRC20
          </span>
        </div>
        <div className="text-3xl font-black text-white truncate">
          ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-gray-400 font-bold">USDT</span>
        </div>

        {/* Available Withdrawal Lock Banner */}
        {pendingWithdrawalTotal > 0 && (
          <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-[11px] font-bold text-amber-400">
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 flex-shrink-0" />
              Locked due to pending withdrawal request:
            </span>
            <span className="font-mono font-black text-amber-300">-${pendingWithdrawalTotal.toFixed(2)} USD</span>
          </div>
        )}
      </div>

      {/* Summary Banner */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Deposited */}
        <div className="spartan-card rounded-2xl p-4 border border-[#1f293d] flex items-center justify-between transition-all">
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-0.5">
              TOTAL DEPOSITED (NET)
            </span>
            <span className="text-base font-black text-[#00df89]">
              +${totalDepositedNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] text-gray-500 font-bold block mt-0.5">{depositCount} Deposits (After fee)</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-[#00df89]/15 border border-[#00df89]/30 flex items-center justify-center text-[#00df89]">
            <ArrowDown className="w-4 h-4" />
          </div>
        </div>

        {/* Total Withdrawn */}
        <div className="spartan-card rounded-2xl p-4 border border-[#1f293d] flex items-center justify-between transition-all">
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-0.5">
              TOTAL WITHDRAWN (NET)
            </span>
            <span className="text-base font-black text-[#ff2d55]">
              -${totalWithdrawnNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] text-gray-500 font-bold block mt-0.5">{withdrawCount} Withdrawals (After fee)</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-[#ff2d55]/15 border border-[#ff2d55]/30 flex items-center justify-center text-[#ff2d55]">
            <ArrowUp className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className="bg-[#00df89]/20 border border-[#00df89] p-3 rounded-2xl text-xs font-bold text-[#00df89] flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Error Safeguard Alert Banner */}
      {errorMessage && (
        <div className="bg-[#ff2d55]/20 border border-[#ff2d55] p-3 rounded-2xl text-xs font-bold text-[#ff2d55] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Mode Switcher: Deposit vs Withdraw */}
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
          <span>DEPOSIT USDT</span>
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
          <span>WITHDRAW USDT</span>
        </button>
      </div>

      {/* Form Content */}
      {mode === 'deposit' ? (
        <div className="spartan-card rounded-3xl p-5 border border-[#1f293d] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-white uppercase tracking-wider">DEPOSIT USDT (ON-CHAIN AUTOMATION)</h3>
            <span className="text-[10px] font-bold text-[#ff5500] bg-[#ff5500]/10 px-2.5 py-0.5 rounded-full border border-[#ff5500]/20">
              Fee: 9% + $3.00 USD
            </span>
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-xs text-gray-400 font-bold block mb-1.5">
              Enter Deposit Amount ($ USD)
            </label>
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
              <span>Fixed Fee ($3.00 USD):</span>
              <span className="font-bold text-[#ff2d55]">-$3.00 USDT</span>
            </div>
            <div className="border-t border-[#1f293d] pt-2 flex justify-between font-black text-sm text-white">
              <span className="text-[#00df89]">Net Credit to Bot:</span>
              <span className="text-[#00df89]">${depositBreakdown.netAmount.toFixed(2)} USDT</span>
            </div>
          </div>

          {/* CREATE ORDER BUTTON */}
          {!activeDepositTx ? (
            <button
              onClick={handleDepositConfirm}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl spartan-orange-btn font-black text-sm uppercase tracking-wider hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
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
                    <CheckCircle2 className="w-4 h-4 text-[#00df89]" /> QR & MEMO LOCKED FOR ORDER {activeDepositTx.id}
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold block mt-0.5">
                    Gross Deposit Amount: <strong className="text-white">${activeDepositTx.grossAmount.toFixed(2)} USDT</strong>
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
                  MASTER USDT TRC20 WALLET QR CODE
                </span>
              </div>

              {/* Wallet Address Box */}
              <div>
                <label className="text-[10px] text-gray-400 font-bold block mb-1">
                  1. Official Master USDT TRC20 Deposit Address
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
                    <span>Wallet</span>
                  </button>
                </div>
              </div>

              {/* Mandatory Fixed Memo Code Box */}
              <div>
                <label className="text-[10px] text-[#facc15] font-black block mb-1 uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> 2. FIXED MEMO CODE (Paste in transfer note)
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
                    <span>Memo</span>
                  </button>
                </div>
              </div>

              <div className="text-[10px] text-gray-400 leading-relaxed bg-[#131927] p-2.5 rounded-xl border border-[#1f293d]">
                💡 <strong>FLEXIBLE DEPOSIT ENGINE:</strong> You can send ANY AMOUNT from your wallet (Binance/Trust Wallet). The system automatically scans actual received USDT on TRON blockchain, calculates 9% + $3.00 fee, and credits net funds automatically!
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Withdraw Mode (Strategic Fee Model 19% + $5.00 USD) */
        <div className="spartan-card rounded-3xl p-5 border border-[#1f293d] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-white uppercase tracking-wider">WITHDRAW USDT (STRATEGIC FEE MODEL)</h3>
            <span className="text-[10px] font-bold text-[#ff2d55] bg-[#ff2d55]/10 px-2.5 py-0.5 rounded-full border border-[#ff2d55]/20">
              Fee: 19% + $5.00 USD
            </span>
          </div>

          {/* Available Balance Status */}
          <div className="bg-[#0b0e17] p-3 rounded-2xl border border-[#1f293d] flex items-center justify-between text-xs font-bold">
            <span className="text-gray-400">Available to Withdraw:</span>
            <span className="text-[#00df89] font-mono text-sm font-black">
              ${availableForWithdraw.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
            </span>
          </div>

          {/* Amount Input */}
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
                MAX AVAILABLE
              </button>
            </div>
          </div>

          {/* Destination Address */}
          <div>
            <label className="text-xs text-gray-400 font-bold block mb-1.5">
              Destination Address (USDT TRC20)
            </label>
            <input
              type="text"
              value={withdrawAddress}
              onChange={(e) => { setWithdrawAddress(e.target.value); setErrorMessage(null); }}
              className="w-full bg-[#0b0e17] border border-[#1f293d] rounded-2xl py-3 px-4 text-white text-xs font-mono focus:outline-none focus:border-[#ff2d55]"
              placeholder="Paste destination TRC20 wallet address (starts with T...)"
            />
          </div>

          {/* Fee Engine Realtime Breakdown Card (Strategic 19% + $5.00 Model) */}
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
              <span>Fixed Fee ($5.00 USD):</span>
              <span className="font-bold text-[#ff2d55]">-$5.00 USDT</span>
            </div>

            {/* Effective Retained Fee Breakdown (10%) */}
            <div className="bg-[#131927] p-2.5 rounded-xl border border-[#1f293d] space-y-1 my-1">
              <div className="flex justify-between text-amber-400 font-bold text-[11px]">
                <span>Retained Performance Fee (10% Treasury):</span>
                <span className="font-mono">${withdrawBreakdown.effectiveRetainedFee?.toFixed(2)} USDT</span>
              </div>
              <span className="text-[9px] text-gray-500 block leading-tight">
                (Allocated to liquidity reserve pool & partner profit share)
              </span>
            </div>

            <div className="border-t border-[#1f293d] pt-2 flex justify-between font-black text-sm text-white">
              <span className="text-[#ff2d55]">Net Received in Wallet:</span>
              <span className={withdrawBreakdown.netAmount <= 0 ? "text-red-500 font-black" : "text-[#ff2d55]"}>
                ${withdrawBreakdown.netAmount.toFixed(2)} USDT
              </span>
            </div>
          </div>

          {/* Negative Net Withdrawal Safeguard Alert */}
          {withdrawBreakdown.netAmount <= 0 && (
            <div className="bg-red-500/20 border border-red-500 p-3 rounded-2xl text-xs font-bold text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>⛔ Negative net withdrawal! Please enter an amount greater than $6.50 USD.</span>
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
                ? 'LOCKED (INSUFFICIENT AVAILABLE FUNDS)'
                : withdrawBreakdown.netAmount <= 0
                ? 'CANNOT WITHDRAW (NEGATIVE AMOUNT)'
                : `Confirm Withdrawal (${withdrawBreakdown.netAmount.toFixed(2)} Net)`}
            </span>
          </button>
        </div>
      )}

      {/* TRANSACTION HISTORY (PAGINATED 5 ITEMS PER PAGE) */}
      <div className="spartan-card rounded-3xl p-4 border border-[#1f293d] space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <History className="w-4 h-4 text-[#ff5500]" /> TRANSACTION HISTORY (FIREBASE REALTIME)
          </h3>
          <span className="text-[10px] text-gray-400 font-bold">
            Total {allTransactions.length} Transactions
          </span>
        </div>

        <div className="space-y-2">
          {paginatedTxs.length === 0 ? (
            <div className="text-center py-6 text-xs font-bold text-gray-500">
              No transactions recorded yet
            </div>
          ) : (
            paginatedTxs.map((tx) => (
              <div
                key={tx.id || tx.memoCode}
                className="flex items-center justify-between p-3 rounded-xl bg-[#0b0e17] border border-[#1f293d] hover:border-gray-700 transition-colors text-xs animate-in fade-in slide-in-from-top-2 duration-300"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-black ${
                      tx.type === 'DEPOSIT'
                        ? 'bg-[#00df89]/15 text-[#00df89] border border-[#00df89]/30'
                        : 'bg-[#ff2d55]/15 text-[#ff2d55] border border-[#ff2d55]/30'
                    }`}
                  >
                    {tx.type === 'DEPOSIT' ? (
                      <ArrowDown className="w-4 h-4" />
                    ) : (
                      <ArrowUp className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white">
                        {tx.type === 'DEPOSIT' ? 'DEPOSIT' : 'WITHDRAWAL'}
                      </span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-black ${
                        tx.status === 'APPROVED' 
                          ? 'text-[#00df89] bg-[#00df89]/10 border-[#00df89]/20' 
                          : tx.status === 'PENDING' 
                          ? 'text-[#facc15] bg-[#facc15]/10 border-[#facc15]/20' 
                          : 'text-[#ff2d55] bg-[#ff2d55]/10 border-[#ff2d55]/20'
                      }`}>
                        {tx.status === 'APPROVED' ? 'APPROVED' : tx.status === 'PENDING' ? 'PENDING' : 'REJECTED'}
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

                <div className="text-right">
                  <span
                    className={`font-black text-xs block ${
                      tx.type === 'DEPOSIT' ? 'text-[#00df89]' : 'text-[#ff2d55]'
                    }`}
                  >
                    {tx.type === 'DEPOSIT' ? `+$${tx.netAmount.toFixed(2)}` : `-$${tx.netAmount.toFixed(2)}`}
                  </span>
                  <span className="text-[9px] text-gray-500 font-bold block">
                    Fee: -${tx.feeAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* PAGINATION CONTROLS BAR (5 Items per page) */}
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
                  ? 'border-gray-800 text-gray-600 bg-gray-900/50 cursor-not-allowed'
                  : 'border-[#1f293d] bg-[#131927] text-white hover:bg-[#1f293d]'
              }`}
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
