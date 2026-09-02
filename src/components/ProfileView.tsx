'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Share2, 
  Copy, 
  CheckCircle2, 
  ShieldCheck, 
  Users, 
  Trophy, 
  DollarSign, 
  ArrowUpRight, 
  Crown, 
  Award, 
  ChevronRight,
  RefreshCw,
  Loader2,
  Zap,
  ArrowRight
} from 'lucide-react';
import { subscribeToReferredUsers, reinvestReferralBalance, withdrawReferralBalance } from '@/lib/firebaseService';
import { getUserRankInfo } from './Header';
import { checkIsAdmin } from '@/lib/adminAuth';
import { calculateResellerTier } from '@/lib/resellerEngine';

interface ProfileViewProps {
  telegramId?: string;
  username?: string;
  referralBalance?: number;
  resellerTier?: number;
  tradingBalance?: number;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  telegramId = '',
  username = '',
  referralBalance = 0.00,
  resellerTier = 1,
  tradingBalance = 0.00,
}) => {
  const [copied, setCopied] = useState(false);
  const [referredUsers, setReferredUsers] = useState<any[]>([]);

  const dynamicTier = calculateResellerTier(referredUsers.length, 0);
  const effectiveTier = referredUsers.length > 0 ? dynamicTier.tier : (resellerTier || 1);

  const isAdmin = checkIsAdmin(username) || checkIsAdmin(telegramId);
  const rank = getUserRankInfo(isAdmin, username, effectiveTier);

  const [localRefBal, setLocalRefBal] = useState<number>(referralBalance);
  const [localTradingBal, setLocalTradingBal] = useState<number>(tradingBalance);

  // Reinvest States
  const [isReinvestOpen, setIsReinvestOpen] = useState(false);
  const [reinvestAmount, setReinvestAmount] = useState('');
  const [reinvestLoading, setReinvestLoading] = useState(false);
  const [reinvestSuccess, setReinvestSuccess] = useState<string | null>(null);
  const [reinvestError, setReinvestError] = useState<string | null>(null);

  // Withdraw Referral States
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [showTierMatrix, setShowTierMatrix] = useState(false);

  useEffect(() => {
    setLocalRefBal(referralBalance);
  }, [referralBalance]);

  useEffect(() => {
    setLocalTradingBal(tradingBalance);
  }, [tradingBalance]);

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(withdrawAmount);
    if (isNaN(val) || val <= 0) {
      setWithdrawError('Vui lòng nhập số tiền rút hợp lệ!');
      return;
    }
    if (val > localRefBal) {
      setWithdrawError(`Số tiền rút vượt quá số dư hoa hồng ($${localRefBal.toFixed(2)} USDT)!`);
      return;
    }
    if (!withdrawAddress.trim() || !withdrawAddress.trim().startsWith('T') || withdrawAddress.trim().length < 30) {
      setWithdrawError('Vui lòng nhập đúng địa chỉ ví USDT TRC20 (bắt đầu bằng chữ T, 34 ký tự)!');
      return;
    }

    setWithdrawLoading(true);
    setWithdrawError(null);
    try {
      const res = await withdrawReferralBalance(telegramId, val, withdrawAddress.trim());
      if (res.success) {
        setWithdrawSuccess(res.message);
        if (typeof res.newRefBal === 'number') setLocalRefBal(res.newRefBal);
        setTimeout(() => {
          setIsWithdrawOpen(false);
          setWithdrawSuccess(null);
          setWithdrawAddress('');
        }, 3000);
      } else {
        setWithdrawError(res.message);
      }
    } catch (err: any) {
      setWithdrawError('Lỗi rút hoa hồng: ' + err.message);
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleReinvestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(reinvestAmount);
    if (isNaN(val) || val <= 0) {
      setReinvestError('Vui lòng nhập số tiền tái đầu tư hợp lệ!');
      return;
    }
    if (val > localRefBal) {
      setReinvestError(`Số tiền tái đầu tư vượt quá số dư hoa hồng ($${localRefBal.toFixed(2)} USDT)!`);
      return;
    }

    setReinvestLoading(true);
    setReinvestError(null);
    try {
      const res = await reinvestReferralBalance(telegramId, val);
      if (res.success) {
        setReinvestSuccess(res.message);
        if (typeof res.newRefBal === 'number') setLocalRefBal(res.newRefBal);
        if (typeof res.newTradingBal === 'number') setLocalTradingBal(res.newTradingBal);
        setTimeout(() => {
          setIsReinvestOpen(false);
          setReinvestSuccess(null);
        }, 2000);
      } else {
        setReinvestError(res.message);
      }
    } catch (err: any) {
      setReinvestError('Lỗi tái đầu tư: ' + err.message);
    } finally {
      setReinvestLoading(false);
    }
  };

  // Realtime subscription for Referred Users under this Reseller's account
  useEffect(() => {
    if (!telegramId) return;
    const unsub = subscribeToReferredUsers(telegramId, (users) => {
      setReferredUsers(users);
    });
    return () => unsub();
  }, [telegramId]);

  const refLink = `https://t.me/SpartanQuantAIBot?start=ref_${telegramId || '494232782'}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 10-LEVEL RESELLER SYSTEM SPECIFICATION (LEVEL 1 BASE TO LEVEL 10 MASTER 20%)
  const resellerLevelsList = [
    { level: 10, title: 'LEVEL 10 (TOP MASTER)', share: '20% FEE REBATE', req: 'Master Reseller ($100kU Volume)', badge: 'bg-[#ff5500]/20 text-[#ff5500] border-[#ff5500]/40' },
    { level: 9, title: 'LEVEL 9', share: '18% FEE REBATE', req: '$75,000U Volume Requirement', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
    { level: 8, title: 'LEVEL 8', share: '16% FEE REBATE', req: '$50,000U Volume Requirement', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
    { level: 7, title: 'LEVEL 7', share: '14% FEE REBATE', req: '$35,000U Volume Requirement', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
    { level: 6, title: 'LEVEL 6', share: '12% FEE REBATE', req: '$20,000U Volume Requirement', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    { level: 5, title: 'LEVEL 5', share: '10% FEE REBATE', req: '$10,000U Volume Requirement', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
    { level: 4, title: 'LEVEL 4', share: '8% FEE REBATE', req: '$5,000U Volume Requirement', badge: 'bg-teal-500/20 text-teal-300 border-teal-500/40' },
    { level: 3, title: 'LEVEL 3', share: '6% FEE REBATE', req: '10 Active F1s (6% Fee Rebate)', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
    { level: 2, title: 'LEVEL 2', share: '4% FEE REBATE', req: '5 Active F1s (4% Fee Rebate)', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
    { level: 1, title: 'LEVEL 1 (STARTING)', share: '2% FEE REBATE', req: 'Starting Reseller Tier', badge: 'bg-gray-800 text-gray-300 border-gray-700' },
  ];

  return (
    <div className="w-full space-y-4 pb-20">
      {/* Profile Header Card */}
      <div className="spartan-card rounded-3xl p-5 border border-[#1f293d] flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ff5500] to-[#7c3aed] border border-[#facc15] flex items-center justify-center font-black text-white text-xl shadow-[0_4px_14px_rgba(255,85,0,0.4)]">
            {username.slice(0, 2).toUpperCase() || 'SP'}
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-tight">Account @{username}</h2>
            <p className="text-xs text-gray-400 font-mono">Telegram ID: {telegramId}</p>

            {/* DYNAMIC LEVEL BADGE */}
            <span className={`inline-flex items-center gap-1.5 mt-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${rank.badgeStyle}`}>
              <span>{rank.icon}</span>
              <span>{rank.rankName}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 1. Referral Program Overview Card (PRIMARY ACTIONS AT THE TOP) */}
      <div className="spartan-card rounded-3xl p-5 border border-[#1f293d] space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-3">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#ff5500]" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              CHƯƠNG TRÌNH ĐỐI TÁC RESELLER
            </h3>
          </div>
          <span className="text-[10px] font-extrabold text-[#00df89] bg-[#00df89]/10 px-2.5 py-0.5 rounded-full border border-[#00df89]/20">
            Hoa hồng tới 20%
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#0b0e17] p-3 rounded-2xl border border-[#1f293d]">
            <span className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">TỔNG HOA HỒNG CỦA BẠN</span>
            <div className="text-lg font-black text-[#00df89]">
              ${localRefBal.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
            </div>
          </div>

          <div className="bg-[#0b0e17] p-3 rounded-2xl border border-[#1f293d]">
            <span className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">KHÁCH TRỰC TIẾP (F1)</span>
            <div className="text-lg font-black text-white flex items-center gap-1">
              <Users className="w-4 h-4 text-[#ff5500]" />
              <span>{referredUsers.length}</span>
              <span className="text-xs text-gray-500 font-bold">Thành viên</span>
            </div>
          </div>
        </div>

        {/* Action Buttons for Referral Earnings */}
        {localRefBal > 0 && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => {
                setIsReinvestOpen(true);
                setReinvestAmount(String(localRefBal));
                setReinvestError(null);
              }}
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#00df89] to-[#00b06b] hover:opacity-90 text-black font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>TÁI ĐẦU TƯ (0% PHÍ)</span>
            </button>
            <button
              onClick={() => {
                setIsWithdrawOpen(true);
                setWithdrawAmount(String(localRefBal));
                setWithdrawError(null);
                setWithdrawSuccess(null);
              }}
              className="py-2.5 px-3 rounded-xl bg-[#131927] hover:bg-[#1f293d] border border-[#1f293d] text-gray-300 font-bold text-[11px] uppercase flex items-center justify-center gap-1.5 transition-all"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-[#ff2d55]" />
              <span>RÚT HOA HỒNG</span>
            </button>
          </div>
        )}

        {/* Exclusive Referral Link Box */}
        <div>
          <label className="text-xs text-gray-400 font-bold block mb-1.5">
            LINK GIỚI THIỆU CỦA BẠN (GỬI BẠN BÈ ĐỂ NHẬN HOA HỒNG):
          </label>
          <div className="flex items-center gap-2 bg-[#0b0e17] border border-[#1f293d] p-2.5 rounded-2xl">
            <span className="text-xs text-[#ff5500] font-mono font-bold truncate flex-1">
              {refLink}
            </span>
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-xl spartan-orange-btn text-xs font-black flex items-center gap-1 hover:opacity-90 transition-opacity"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. COLLAPSIBLE 10 RESELLER TIERS SPECIFICATION ACCORDION */}
      <div className="spartan-card rounded-3xl p-4 border border-[#1f293d] space-y-3 shadow-md">
        <button
          type="button"
          onClick={() => setShowTierMatrix(!showTierMatrix)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#ff5500]" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              BẢNG 10 CẤP ĐỘ HOA HỒNG RESELLER
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-[#ff5500] bg-[#ff5500]/10 px-2 py-0.5 rounded-full border border-[#ff5500]/30">
              {isAdmin ? '👑 SUPREME LEADER' : `Cấp hiện tại: ${effectiveTier}`}
            </span>
            <span className="text-xs text-gray-400 font-bold">
              {showTierMatrix ? '▲' : '▼'}
            </span>
          </div>
        </button>

        {showTierMatrix && (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1.5 pt-2 border-t border-[#1f293d] scrollbar-thin scrollbar-thumb-[#ff5500]/40 scrollbar-track-[#0b0e17] animate-in fade-in duration-200">
            {resellerLevelsList.map((item) => {
              const isCurrent = !isAdmin && effectiveTier === item.level;
              return (
                <div
                  key={item.level}
                  className={`p-2.5 rounded-2xl border flex items-center justify-between transition-all ${
                    isCurrent
                      ? 'bg-[#131927] border-[#ff5500] shadow-[0_0_15px_rgba(255,85,0,0.3)]'
                      : 'bg-[#0b0e17] border-[#1f293d]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-black text-[#ff5500]">🎖️</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black uppercase tracking-wider ${item.badge.split(' ')[1]}`}>
                          {item.title}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 bg-[#ff5500] text-white rounded uppercase">
                            CẤP CỦA BẠN
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 block mt-0.5">{item.req}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono font-black text-[#00df89] block">
                      {item.share}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Referred Clients Sub-List */}
      <div className="spartan-card rounded-3xl p-5 border border-[#1f293d] space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#ff5500]" /> DIRECT F1 CLIENTS ({referredUsers.length})
          </h3>
        </div>

        {referredUsers.length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-500 font-bold bg-[#0b0e17] rounded-2xl">
            No direct F1 clients referred yet via your link.
          </div>
        ) : (
          <div className="space-y-2">
            {referredUsers.map((refUser, idx) => (
              <div
                key={refUser.telegramId || idx}
                className="flex items-center justify-between p-3 rounded-xl bg-[#0b0e17] border border-[#1f293d] text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#ff5500]/15 text-[#ff5500] border border-[#ff5500]/30 flex items-center justify-center font-black">
                    #{idx + 1}
                  </div>
                  <div>
                    <span className="font-extrabold text-white block">@{refUser.username || 'user'}</span>
                    <span className="text-[10px] text-gray-500 font-mono">ID: {refUser.telegramId}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-[#00df89] bg-[#00df89]/10 px-2 py-0.5 rounded border border-[#00df89]/20 block">
                    ACTIVE F1
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reinvest Modal Dialog */}
      {isReinvestOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0e17] border border-[#1f293d] rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-[0_0_30px_rgba(0,223,137,0.2)] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#1f293d] pb-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-[#00df89]" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  TÁI ĐẦU TƯ VÀO VỐN BOT
                </h3>
              </div>
              <button
                onClick={() => setIsReinvestOpen(false)}
                className="text-gray-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#131927] p-3 rounded-2xl border border-[#1f293d] space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Hoa hồng hiện có:</span>
                <span className="font-bold text-[#00df89]">${localRefBal.toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Phí tái đầu tư:</span>
                <span className="font-bold text-[#00df89]">0% (MIỄN PHÍ 100%)</span>
              </div>
            </div>

            {reinvestSuccess && (
              <div className="p-3 bg-[#00df89]/20 border border-[#00df89] rounded-2xl text-[#00df89] text-xs font-bold text-center">
                {reinvestSuccess}
              </div>
            )}

            {reinvestError && (
              <div className="p-3 bg-red-500/20 border border-red-500 rounded-2xl text-red-400 text-xs font-bold text-center">
                {reinvestError}
              </div>
            )}

            <form onSubmit={handleReinvestSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-bold block">
                  Nhập số tiền muốn chuyển vào Vốn Bot ($ USDT):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    required
                    value={reinvestAmount}
                    onChange={(e) => setReinvestAmount(e.target.value)}
                    className="w-full bg-[#131927] border border-[#1f293d] rounded-2xl py-3 px-4 text-white text-base font-black focus:outline-none focus:border-[#00df89]"
                    placeholder="VD: 50"
                  />
                  <button
                    type="button"
                    onClick={() => setReinvestAmount(String(localRefBal))}
                    className="absolute right-3 top-2.5 px-2 py-1 bg-[#00df89]/20 text-[#00df89] hover:bg-[#00df89]/30 text-[10px] font-bold rounded-lg transition-all"
                  >
                    TẤT CẢ
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={reinvestLoading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#00df89] to-[#00b06b] hover:opacity-90 text-black font-black text-xs uppercase shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  {reinvestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  <span>XÁC NHẬN CHUYỂN VỐN</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsReinvestOpen(false)}
                  className="px-4 py-3 rounded-xl bg-[#131927] text-gray-400 hover:text-white border border-[#1f293d] text-xs font-bold"
                >
                  HỦY
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Referral Commission Modal Dialog */}
      {isWithdrawOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0e17] border border-[#1f293d] rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-[0_0_30px_rgba(255,45,85,0.2)] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#1f293d] pb-3">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-[#ff2d55]" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  RÚT HOA HỒNG VỀ VÍ TRC20
                </h3>
              </div>
              <button
                onClick={() => setIsWithdrawOpen(false)}
                className="text-gray-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#131927] p-3.5 rounded-2xl border border-[#1f293d] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Hoa hồng khả dụng:</span>
                <span className="font-bold text-[#00df89]">${localRefBal.toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Phí sàn (Treasury Policy):</span>
                <span className="font-bold text-[#00df89]">0% (MIỄN PHÍ - KHÔNG MẤT 19%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Phí mạng On-chain TRC20 Gas:</span>
                <span className="font-bold text-amber-400">-$5.00 USDT</span>
              </div>
              <div className="border-t border-[#1f293d] pt-2 flex justify-between font-black text-sm">
                <span className="text-white">Thực nhận về ví:</span>
                <span className="text-[#00df89]">
                  ${Math.max(0, (parseFloat(withdrawAmount) || 0) - 5).toFixed(2)} USDT
                </span>
              </div>
              <div className="bg-[#0b0e17] p-2 rounded-xl text-[10px] text-gray-400 leading-relaxed border border-[#1f293d]">
                🛡️ <strong className="text-white">BẢO TOÀN DOANH THU ĐẠI LÝ:</strong> Hoa hồng là doanh thu của Reseller nên được miễn 100% phí sàn (hoàn toàn không chịu phí 19% chính sách Treasury), chỉ chi trả $5.00 phí truyền mạng On-chain TRC20.
              </div>
            </div>

            {withdrawSuccess && (
              <div className="p-3 bg-[#00df89]/20 border border-[#00df89] rounded-2xl text-[#00df89] text-xs font-bold text-center">
                {withdrawSuccess}
              </div>
            )}

            {withdrawError && (
              <div className="p-3 bg-red-500/20 border border-red-500 rounded-2xl text-red-400 text-xs font-bold text-center">
                {withdrawError}
              </div>
            )}

            <form onSubmit={handleWithdrawSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-bold block">
                  Số tiền hoa hồng muốn rút ($ USDT):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    required
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full bg-[#131927] border border-[#1f293d] rounded-2xl py-3 px-4 text-white text-base font-black focus:outline-none focus:border-[#ff2d55]"
                    placeholder="VD: 50"
                  />
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(String(localRefBal))}
                    className="absolute right-3 top-2.5 px-2 py-1 bg-gray-800 text-gray-300 hover:text-white text-[10px] font-bold rounded-lg transition-all"
                  >
                    TẤT CẢ
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-bold block">
                  Địa chỉ ví USDT (TRC20) nhận tiền:
                </label>
                <input
                  type="text"
                  required
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  className="w-full bg-[#131927] border border-[#1f293d] rounded-2xl py-2.5 px-3 text-white text-xs font-mono focus:outline-none focus:border-[#ff2d55]"
                  placeholder="VD: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={withdrawLoading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#ff2d55] to-[#ff5500] hover:opacity-90 text-white font-black text-xs uppercase shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  {withdrawLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
                  <span>GỬI LỆNH RÚT HOA HỒNG</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsWithdrawOpen(false)}
                  className="px-4 py-3 rounded-xl bg-[#131927] text-gray-400 hover:text-white border border-[#1f293d] text-xs font-bold"
                >
                  HỦY
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
