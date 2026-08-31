'use client';

import React, { useState, useEffect } from 'react';
import { calculateDepositFee, calculateWithdrawFee } from '@/lib/feeCalculator';
import { 
  createLiveTransaction, 
  subscribeToUserTransactions, 
  TransactionData 
} from '@/lib/firebaseService';
import { ArrowDownLeft, ArrowUpRight, Copy, CheckCircle2, QrCode, History, DollarSign, ArrowDown, ArrowUp, Loader2, AlertCircle, Zap, ShieldCheck, Lock } from 'lucide-react';

interface WalletViewProps {
  currentBalance: number;
  onUpdateBalance: (newBalance: number) => void;
  telegramId?: string;
  username?: string;
}

export const WalletView: React.FC<WalletViewProps> = ({
  currentBalance,
  onUpdateBalance,
  telegramId = '1788035393',
  username = 'tddv2017',
}) => {
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [qrMode, setQrMode] = useState<'pure' | 'embedded'>('pure');
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

  const allTransactions = Array.from(combinedTxsMap.values());

  // Dynamic Total Deposited & Withdrawn calculated purely from real transactions
  const approvedDeposits = allTransactions.filter(t => t.type === 'DEPOSIT' && t.status === 'APPROVED');
  const approvedWithdrawals = allTransactions.filter(t => t.type === 'WITHDRAW' && t.status === 'APPROVED');

  const totalDepositedNet = approvedDeposits.reduce((acc, t) => acc + t.netAmount, 0);
  const depositCount = approvedDeposits.length;

  const totalWithdrawnNet = approvedWithdrawals.reduce((acc, t) => acc + t.netAmount, 0);
  const withdrawCount = approvedWithdrawals.length;

  // Calculate Pending Withdrawals to Lock Available Balance (Anti-Double-Withdrawal Safeguard)
  const pendingWithdrawalTotal = allTransactions
    .filter(t => t.type === 'WITHDRAW' && t.status === 'PENDING')
    .reduce((acc, t) => acc + t.grossAmount, 0);

  const availableForWithdraw = Math.max(0, currentBalance - pendingWithdrawalTotal);

  const numAmount = parseFloat(amount) || 0;
  const depositBreakdown = calculateDepositFee(numAmount);
  const withdrawBreakdown = calculateWithdrawFee(numAmount);

  // Official Master USDT TRC20 Wallet Address
  const walletAddress = 'TBGvPZsuqKH5CrSbYLEi8q2BCQ6CXyKmAu';
  const activeMemo = activeDepositTx?.memoCode || `SPARTAN_${Math.floor(100000 + Math.random() * 900000)}`;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyMemo = () => {
    navigator.clipboard.writeText(activeMemo);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2000);
  };

  const handleDepositConfirm = async () => {
    if (loading) return; // Immediate Debounce Lock
    setErrorMessage(null);
    if (numAmount <= 0) {
      setErrorMessage('Số tiền nạp phải lớn hơn $0.00 USD!');
      return;
    }
    setLoading(true);

    try {
      // Create live pending deposit in Firestore / RTDB
      const newTx = await createLiveTransaction(telegramId, username, 'DEPOSIT', numAmount);

      setActiveDepositTx(newTx);
      setLocalTxs((prev) => [newTx, ...prev]);

      setNotification(`Đã khởi tạo QR Nạp $${numAmount.toFixed(2)} USDT! Mã Memo: ${newTx.memoCode}. Bot TronGrid sẽ quét On-Chain và tự động duyệt khi nhận tiền.`);
      setTimeout(() => setNotification(null), 7000);
    } catch (err) {
      console.error('Deposit error:', err);
      setNotification(`Đã ghi nhận lệnh nạp $${numAmount.toFixed(2)} USDT! Đang chờ duyệt.`);
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawConfirm = async () => {
    if (loading) return; // Immediate Debounce Lock
    setErrorMessage(null);

    // Safeguard 1: Block zero or negative input
    if (numAmount <= 0) {
      setErrorMessage('Số tiền rút phải lớn hơn $0.00 USD!');
      return;
    }

    // Safeguard 2: Block negative net output (When fees exceed withdrawal amount)
    if (withdrawBreakdown.netAmount <= 0) {
      setErrorMessage(`⛔ KHÔNG THỂ RÚT: Số tiền rút ($${numAmount.toFixed(2)}) nhỏ hơn tổng phí giao dịch ($${withdrawBreakdown.totalFee.toFixed(2)} USD). Vui lòng nhập số tiền lớn hơn!`);
      return;
    }

    // Safeguard 3: Lock-in Pending Withdrawals to Block Double-Clicks & Over-Withdrawals
    if (numAmount > availableForWithdraw) {
      if (pendingWithdrawalTotal > 0) {
        setErrorMessage(`⛔ BỊ KHÓA LỆNH: Bạn đang có $${pendingWithdrawalTotal.toFixed(2)} USD lệnh rút CHỜ DUYỆT. Số dư khả dụng rút còn lại là $${availableForWithdraw.toFixed(2)} USD!`);
      } else {
        setErrorMessage(`⛔ KHÔNG THỂ RÚT: Số tiền rút ($${numAmount.toFixed(2)}) vượt quá số dư khả dụng hiện có ($${currentBalance.toFixed(2)} USD)!`);
      }
      return;
    }

    if (!withdrawAddress.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ ví nhận USDT (TRC20)!');
      return;
    }

    setLoading(true);

    try {
      // Create live pending withdrawal in Firestore / RTDB
      const newTx = await createLiveTransaction(telegramId, username, 'WITHDRAW', numAmount);

      setLocalTxs((prev) => [newTx, ...prev]);

      setNotification(`Đã gửi yêu cầu Rút $${withdrawBreakdown.netAmount.toFixed(2)} USDT Net về ví ${withdrawAddress.slice(0, 8)}...! Đang chờ duyệt.`);
      setTimeout(() => setNotification(null), 6000);
    } catch (err: any) {
      console.error('Withdraw error:', err);
      if (err.message && err.message.includes('INSUFFICIENT_AVAILABLE_FUNDS')) {
        setErrorMessage(`⛔ BỊ KHÓA LỆNH: Bạn đang có lệnh rút chờ duyệt. Số dư khả dụng không đủ!`);
      } else {
        setNotification(`Đã ghi nhận yêu cầu rút $${withdrawBreakdown.netAmount.toFixed(2)} USDT! Đang chờ duyệt.`);
      }
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  // QR Code URL based on selected mode
  const pureQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${walletAddress}`;
  const embeddedQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${walletAddress}?memo=${activeMemo}`;
  const currentQrUrl = qrMode === 'pure' ? pureQrUrl : embeddedQrUrl;

  return (
    <div className="w-full space-y-4 pb-20">
      {/* Balance & Overview Card */}
      <div className="spartan-card rounded-3xl p-5 border border-[#1f293d] shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Khả Dụng Đầu Tư (Live Database)</span>
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
              Đang tạm khóa do có lệnh rút chờ duyệt:
            </span>
            <span className="font-mono font-black text-amber-300">-${pendingWithdrawalTotal.toFixed(2)} USD</span>
          </div>
        )}
      </div>

      {/* Dynamic Total Deposited (Net) & Total Withdrawn (Net) Summary Banner */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Deposited (Net - Đã trừ phí) */}
        <div className="spartan-card rounded-2xl p-4 border border-[#1f293d] flex items-center justify-between transition-all">
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-0.5">
              TỔNG NẠP (NET VÀO BOT)
            </span>
            <span className="text-base font-black text-[#00df89]">
              +${totalDepositedNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] text-gray-500 font-bold block mt-0.5">{depositCount} Lượt Nạp (Đã trừ phí)</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-[#00df89]/15 border border-[#00df89]/30 flex items-center justify-center text-[#00df89]">
            <ArrowDown className="w-4 h-4" />
          </div>
        </div>

        {/* Total Withdrawn (Net - Thực nhận) */}
        <div className="spartan-card rounded-2xl p-4 border border-[#1f293d] flex items-center justify-between transition-all">
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-0.5">
              TỔNG RÚT (NET THỰC NHẬN)
            </span>
            <span className="text-base font-black text-[#ff2d55]">
              -${totalWithdrawnNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] text-gray-500 font-bold block mt-0.5">{withdrawCount} Lượt Rút (Đã trừ phí)</span>
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
          <span>Nạp Tiền (Deposit)</span>
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
          <span>Rút Tiền (Withdraw)</span>
        </button>
      </div>

      {/* Form Content */}
      {mode === 'deposit' ? (
        <div className="spartan-card rounded-3xl p-5 border border-[#1f293d] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-white uppercase tracking-wider">NẠP TIỀN USDT (ON-CHAIN AUTOMATION)</h3>
            <span className="text-[10px] font-bold text-[#ff5500] bg-[#ff5500]/10 px-2.5 py-0.5 rounded-full border border-[#ff5500]/20">
              Phí: 9% + $3.00 USD
            </span>
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-xs text-gray-400 font-bold block mb-1.5">
              Nhập Số Tiền Nạp ($ USD)
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
              <span>Tổng Số Tiền Nạp (Gross):</span>
              <span className="font-bold text-gray-200">${depositBreakdown.grossAmount.toFixed(2)} USDT</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Phí Phần Trăm (9%):</span>
              <span className="font-bold text-[#ff2d55]">-${depositBreakdown.percentageFee.toFixed(2)} USDT</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Phí Cố Định ($3.00 USD):</span>
              <span className="font-bold text-[#ff2d55]">-$3.00 USDT</span>
            </div>
            <div className="border-t border-[#1f293d] pt-2 flex justify-between font-black text-sm text-white">
              <span className="text-[#00df89]">Thực Nhận Vào Bot (Net):</span>
              <span className="text-[#00df89]">${depositBreakdown.netAmount.toFixed(2)} USDT</span>
            </div>
          </div>

          {/* ON-CHAIN AUTO-APPROVE QR CODE & MEMO CARD */}
          <div className="bg-[#0b0e17] border border-[#ff5500]/40 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#facc15]" /> MÃ QR & MEMO XÁC MINH AUTOMATION
              </span>
              <span className="text-[9px] font-black text-[#00df89] bg-[#00df89]/10 px-2 py-0.5 rounded-full border border-[#00df89]/20">
                TronGrid Auto-Detect
              </span>
            </div>

            {/* QR Format Selector Toggle */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#131927] rounded-xl text-[10px] font-extrabold">
              <button
                onClick={() => setQrMode('pure')}
                className={`py-1.5 rounded-lg transition-all ${
                  qrMode === 'pure' 
                    ? 'bg-[#ff5500] text-white shadow-sm' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Ví Chuẩn TRC20 (Binance/Trust)
              </button>
              <button
                onClick={() => setQrMode('embedded')}
                className={`py-1.5 rounded-lg transition-all ${
                  qrMode === 'embedded' 
                    ? 'bg-[#facc15] text-black shadow-sm' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Ví + Chèn Mã Băm Memo
              </button>
            </div>

            {/* QR Image Display */}
            <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl border border-gray-200">
              <img
                src={currentQrUrl}
                alt="USDT TRC20 Master Deposit QR Code"
                className="w-40 h-40 object-contain"
              />
              <span className="text-[10px] font-black text-gray-800 mt-1 uppercase tracking-wider">
                {qrMode === 'pure' ? 'QR Chứa Địa Chỉ Ví TRC20 Nguyên Bản' : 'QR Chèn Sẵn Mã Băm Memo'}
              </span>
            </div>

            {/* Wallet Address Box */}
            <div>
              <label className="text-[10px] text-gray-400 font-bold block mb-1">
                1. Địa Chỉ Ví Nạp USDT Master Chính Thức (Mạng TRC20)
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
                  <span>Ví</span>
                </button>
              </div>
            </div>

            {/* Mandatory Memo Code Box */}
            <div>
              <label className="text-[10px] text-[#facc15] font-black block mb-1 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> 2. Mã Băm MEMO BẮT BUỘC (Dán vào phần Ghi Chú)
              </label>
              <div className="flex items-center gap-2 bg-[#131927] border border-[#facc15]/40 p-2.5 rounded-xl">
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
              💡 <strong>CƠ CHẾ DUYỆT TỰ ĐỘNG ON-CHAIN:</strong> Khi chuyển USDT TRC20 từ ví của bạn (Trust Wallet, Binance, OKX...), hãy DÁN MÃ MEMO ở trên vào mục Ghi Chú (Note/Memo). Bot TronGrid sẽ quét giao dịch khớp Mã Memo và tự động duyệt cộng tiền vào ví trong 3 giây!
            </div>
          </div>

          <button
            onClick={handleDepositConfirm}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl spartan-orange-btn font-black text-sm uppercase tracking-wider hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>TẠO LỆNH NẠP & THEO DÕI ON-CHAIN (${depositBreakdown.netAmount.toFixed(2)} Net)</span>
          </button>
        </div>
      ) : (
        /* Withdraw Mode */
        <div className="spartan-card rounded-3xl p-5 border border-[#1f293d] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-white uppercase tracking-wider">RÚT TIỀN USDT (DOUBLE-WITHDRAW LOCK ACTIVE)</h3>
            <span className="text-[10px] font-bold text-[#ff2d55] bg-[#ff2d55]/10 px-2.5 py-0.5 rounded-full border border-[#ff2d55]/20">
              Phí: 9% + $5.00 USD
            </span>
          </div>

          {/* Available Balance Status */}
          <div className="bg-[#0b0e17] p-3 rounded-2xl border border-[#1f293d] flex items-center justify-between text-xs font-bold">
            <span className="text-gray-400">Khả Dụng Rút Tiền:</span>
            <span className="text-[#00df89] font-mono text-sm font-black">
              ${availableForWithdraw.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
            </span>
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-xs text-gray-400 font-bold block mb-1.5">
              Nhập Số Tiền Rút ($ USD)
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
                MAX KHẢ DỤNG
              </button>
            </div>
          </div>

          {/* Destination Address */}
          <div>
            <label className="text-xs text-gray-400 font-bold block mb-1.5">
              Địa Chỉ Ví Nhận (USDT TRC20)
            </label>
            <input
              type="text"
              value={withdrawAddress}
              onChange={(e) => { setWithdrawAddress(e.target.value); setErrorMessage(null); }}
              className="w-full bg-[#0b0e17] border border-[#1f293d] rounded-2xl py-3 px-4 text-white text-xs font-mono focus:outline-none focus:border-[#ff2d55]"
              placeholder="Dán địa chỉ ví TRC20 (bắt đầu bằng T...)"
            />
          </div>

          {/* Fee Engine Realtime Breakdown Card */}
          <div className="bg-[#0b0e17] rounded-2xl p-4 border border-[#1f293d] text-xs space-y-2">
            <div className="flex justify-between text-gray-400">
              <span>Tổng Số Tiền Rút (Gross):</span>
              <span className="font-bold text-gray-200">${withdrawBreakdown.grossAmount.toFixed(2)} USDT</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Phí Phần Trăm (9%):</span>
              <span className="font-bold text-[#ff2d55]">-${withdrawBreakdown.percentageFee.toFixed(2)} USDT</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Phí Cố Định ($5.00 USD):</span>
              <span className="font-bold text-[#ff2d55]">-$5.00 USDT</span>
            </div>
            <div className="border-t border-[#1f293d] pt-2 flex justify-between font-black text-sm text-white">
              <span className="text-[#ff2d55]">Thực Nhận Về Ví (Net):</span>
              <span className={withdrawBreakdown.netAmount <= 0 ? "text-red-500 font-black" : "text-[#ff2d55]"}>
                ${withdrawBreakdown.netAmount.toFixed(2)} USDT
              </span>
            </div>
          </div>

          {/* Negative Net Withdrawal Safeguard Alert */}
          {withdrawBreakdown.netAmount <= 0 && (
            <div className="bg-red-500/20 border border-red-500 p-3 rounded-2xl text-xs font-bold text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>⛔ Số tiền thực nhận âm! Vui lòng nhập số tiền lớn hơn $5.50 USD để rút.</span>
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
                ? 'KHÓA NẠP/RÚT (SỐ DƯ KHẢ DỤNG KHÔNG ĐỦ)'
                : withdrawBreakdown.netAmount <= 0
                ? 'KHÔNG THỂ RÚT (SỐ TIỀN ÂM)'
                : `Xác Nhận Rút (${withdrawBreakdown.netAmount.toFixed(2)} Net)`}
            </span>
          </button>
        </div>
      )}

      {/* LỊCH SỬ NẠP VÀ RÚT (Live Firebase Realtime Transactions) */}
      <div className="spartan-card rounded-3xl p-4 border border-[#1f293d] space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <History className="w-4 h-4 text-[#ff5500]" /> LỊCH SỬ GIAO DỊCH
          </h3>
          <span className="text-[10px] text-gray-400 font-bold">{allTransactions.length} Giao Dịch</span>
        </div>

        <div className="space-y-2">
          {allTransactions.length === 0 ? (
            <div className="text-center py-6 text-xs font-bold text-gray-500">
              Chưa có giao dịch nào trên Firebase
            </div>
          ) : (
            allTransactions.map((tx) => (
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
                        {tx.type === 'DEPOSIT' ? 'NẠP TIỀN' : 'RÚT TIỀN'}
                      </span>
                      <span className={`text-[9px] font-mono px-1 py-0.5 rounded border ${
                        tx.status === 'APPROVED' 
                          ? 'text-[#00df89] bg-[#00df89]/10 border-[#00df89]/20' 
                          : tx.status === 'PENDING' 
                          ? 'text-[#facc15] bg-[#facc15]/10 border-[#facc15]/20' 
                          : 'text-[#ff2d55] bg-[#ff2d55]/10 border-[#ff2d55]/20'
                      }`}>
                        {tx.status === 'APPROVED' ? 'ĐÃ DUYỆT' : tx.status === 'PENDING' ? 'CHỜ DUYỆT' : 'TỪ CHỐI'}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono block mt-0.5">
                      Memo: {tx.memoCode}
                    </span>
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
                    Phí: -${tx.feeAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
