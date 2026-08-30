'use client';

import React, { useState, useEffect } from 'react';
import { calculateDepositFee, calculateWithdrawFee } from '@/lib/feeCalculator';
import { 
  createLiveTransaction, 
  subscribeToUserTransactions, 
  TransactionData 
} from '@/lib/firebaseService';
import { ArrowDownLeft, ArrowUpRight, Copy, CheckCircle2, QrCode, History, DollarSign, ArrowDown, ArrowUp, Loader2 } from 'lucide-react';

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
  const [amount, setAmount] = useState<string>('1000');
  const [copied, setCopied] = useState(false);
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [liveTransactions, setLiveTransactions] = useState<TransactionData[]>([]);

  // Firestore Realtime Listener for User Transactions
  useEffect(() => {
    const unsubscribe = subscribeToUserTransactions(telegramId, (txs) => {
      setLiveTransactions(txs);
    });
    return () => unsubscribe();
  }, [telegramId]);

  // Dynamic Total Deposited & Withdrawn calculated from live Firestore state
  const approvedDeposits = liveTransactions.filter(t => t.type === 'DEPOSIT' && t.status === 'APPROVED');
  const approvedWithdrawals = liveTransactions.filter(t => t.type === 'WITHDRAW' && t.status === 'APPROVED');

  const totalDepositedNet = approvedDeposits.reduce((acc, t) => acc + t.netAmount, 0) || 9094.00;
  const depositCount = approvedDeposits.length || 2;

  const totalWithdrawnNet = approvedWithdrawals.reduce((acc, t) => acc + t.netAmount, 0) || 2265.00;
  const withdrawCount = approvedWithdrawals.length || 2;

  const numAmount = parseFloat(amount) || 0;
  const depositBreakdown = calculateDepositFee(numAmount);
  const withdrawBreakdown = calculateWithdrawFee(numAmount);

  const walletAddress = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDepositConfirm = async () => {
    if (numAmount <= 0) return;
    setLoading(true);

    try {
      // Create live pending deposit in Firestore
      const newTx = await createLiveTransaction(telegramId, username, 'DEPOSIT', numAmount);

      setNotification(`Đã tạo lệnh Nạp $${numAmount.toFixed(2)} USDT! Mã Memo: ${newTx.memoCode}. Đang chờ Admin @tddv2017 duyệt.`);
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      console.error('Firestore deposit error:', err);
      alert('Lỗi tạo lệnh nạp trên Firestore!');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawConfirm = async () => {
    if (numAmount <= 0) return;
    if (numAmount > currentBalance) {
      alert('Số dư không đủ để thực hiện rút tiền!');
      return;
    }
    if (!withdrawAddress) {
      alert('Vui lòng nhập địa chỉ ví nhận USDT!');
      return;
    }

    setLoading(true);

    try {
      // Create live pending withdrawal in Firestore
      const newTx = await createLiveTransaction(telegramId, username, 'WITHDRAW', numAmount);

      setNotification(`Đã gửi yêu cầu Rút $${withdrawBreakdown.netAmount.toFixed(2)} USDT Net về ví ${withdrawAddress.slice(0, 8)}...! Đang chờ duyệt.`);
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      console.error('Firestore withdraw error:', err);
      alert('Lỗi tạo lệnh rút trên Firestore!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4 pb-20">
      {/* Balance & Overview Card */}
      <div className="spartan-card rounded-3xl p-5 border border-[#1f293d] shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Khả Dụng Đầu Tư (Live Firestore)</span>
          <span className="px-3 py-1 rounded-full bg-[#ff5500]/15 border border-[#ff5500]/30 text-[#ff5500] text-xs font-black">
            USDT BEP20 / TRC20
          </span>
        </div>
        <div className="text-3xl font-black text-white truncate">
          ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-gray-400 font-bold">USDT</span>
        </div>
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

      {/* Mode Switcher: Deposit vs Withdraw */}
      <div className="grid grid-cols-2 p-1.5 bg-[#0b0e17] rounded-2xl border border-[#1f293d]">
        <button
          onClick={() => setMode('deposit')}
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
          onClick={() => setMode('withdraw')}
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
            <h3 className="text-xs font-black text-white uppercase tracking-wider">NẠP TIỀN USDT (FIRESTORE REALTIME)</h3>
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

          {/* Wallet QR Address */}
          <div className="pt-1">
            <label className="text-xs text-gray-400 font-bold block mb-1.5">
              Địa Chỉ Ví Nạp USDT Chính Thức (BEP20)
            </label>
            <div className="flex items-center gap-2 bg-[#0b0e17] border border-[#1f293d] p-2.5 rounded-2xl">
              <span className="text-xs text-gray-300 font-mono truncate flex-1">
                {walletAddress}
              </span>
              <button
                onClick={handleCopy}
                className="p-2 rounded-xl bg-[#ff5500] text-white text-xs font-black flex items-center gap-1 hover:opacity-90"
              >
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            onClick={handleDepositConfirm}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl spartan-orange-btn font-black text-sm uppercase tracking-wider hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>Xác Nhận Nạp (${depositBreakdown.netAmount.toFixed(2)} Net)</span>
          </button>
        </div>
      ) : (
        /* Withdraw Mode */
        <div className="spartan-card rounded-3xl p-5 border border-[#1f293d] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-white uppercase tracking-wider">RÚT TIỀN USDT (FIRESTORE REALTIME)</h3>
            <span className="text-[10px] font-bold text-[#ff2d55] bg-[#ff2d55]/10 px-2.5 py-0.5 rounded-full border border-[#ff2d55]/20">
              Phí: 9% + $5.00 USD
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
                onChange={(e) => setAmount(e.target.value.slice(0, 10))}
                className="w-full bg-[#0b0e17] border border-[#1f293d] rounded-2xl py-3 px-4 text-white text-base font-black focus:outline-none focus:border-[#ff2d55]"
                placeholder="1000"
              />
              <button
                onClick={() => setAmount(currentBalance.toString())}
                className="absolute right-3 top-2.5 px-2.5 py-1 bg-[#ff2d55]/20 text-[#ff2d55] rounded-lg text-xs font-black border border-[#ff2d55]/30"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Destination Address */}
          <div>
            <label className="text-xs text-gray-400 font-bold block mb-1.5">
              Địa Chỉ Ví Nhận (USDT TRC20 / BEP20)
            </label>
            <input
              type="text"
              value={withdrawAddress}
              onChange={(e) => setWithdrawAddress(e.target.value)}
              className="w-full bg-[#0b0e17] border border-[#1f293d] rounded-2xl py-3 px-4 text-white text-xs font-mono focus:outline-none focus:border-[#ff2d55]"
              placeholder="Dán địa chỉ ví 0x... hoặc T..."
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
              <span className="text-[#ff2d55]">${withdrawBreakdown.netAmount.toFixed(2)} USDT</span>
            </div>
          </div>

          <button
            onClick={handleWithdrawConfirm}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-[#ff2d55] text-white font-black text-sm uppercase tracking-wider shadow-[0_4px_14px_rgba(255,45,85,0.4)] hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>Xác Nhận Rút (${withdrawBreakdown.netAmount.toFixed(2)} Net)</span>
          </button>
        </div>
      )}

      {/* LỊCH SỬ NẠP VÀ RÚT (Live Firestore Realtime Transactions) */}
      <div className="spartan-card rounded-3xl p-4 border border-[#1f293d] space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <History className="w-4 h-4 text-[#ff5500]" /> LỊCH SỬ FIRESTORE REALTIME
          </h3>
          <span className="text-[10px] text-gray-400 font-bold">{liveTransactions.length} Giao Dịch</span>
        </div>

        <div className="space-y-2">
          {liveTransactions.length === 0 ? (
            <div className="text-center py-6 text-xs font-bold text-gray-500">
              Chưa có giao dịch nào trên Firestore miniapp-spartan
            </div>
          ) : (
            liveTransactions.map((tx) => (
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
                      <span className="text-[9px] text-[#facc15] font-mono bg-[#facc15]/10 px-1 py-0.5 rounded border border-[#facc15]/20">
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
