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
  ArrowRight,
  FileText,
  TrendingUp,
  Coins,
  Flame,
  Sparkles,
  Target,
  Gift
} from 'lucide-react';
import { subscribeToReferredUsers, reinvestReferralBalance, withdrawReferralBalance } from '@/lib/firebaseService';
import { getUserRankInfo } from './Header';
import { checkIsAdmin } from '@/lib/adminAuth';
import { calculateResellerTier, RESELLER_TIERS_MATRIX, ResellerTierInfo } from '@/lib/resellerEngine';
import { useLanguage } from '@/contexts/LanguageContext';
import { InvestorStatementModal } from '@/components/InvestorStatementModal';
import { AffiliateLeaderboardCard } from '@/components/AffiliateLeaderboardCard';

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
  const { t, lang } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [referredUsers, setReferredUsers] = useState<any[]>([]);

  const dynamicTier = calculateResellerTier(referredUsers.length, 0);
  const effectiveTier = referredUsers.length > 0 ? dynamicTier.tier : (resellerTier || 1);

  const isAdmin = checkIsAdmin(username) || checkIsAdmin(telegramId);
  const rank = getUserRankInfo(isAdmin, username, effectiveTier, 'CLIENT', lang);

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
  const [showTierMatrix, setShowTierMatrix] = useState(true);
  const [selectedGoalF1s, setSelectedGoalF1s] = useState<number>(10);
  const [isStatementOpen, setIsStatementOpen] = useState(false);

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
      setWithdrawError(`Số tiền rút vượt quá số dư chiết khấu ($${localRefBal.toFixed(2)} USDT)!`);
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
      setWithdrawError('Lỗi rút chiết khấu: ' + err.message);
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
      setReinvestError(`Số tiền tái đầu tư vượt quá số dư chiết khấu ($${localRefBal.toFixed(2)} USDT)!`);
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


  return (
    <div className="w-full space-y-4 pb-20">
      {/* Profile Header Card */}
      <div className="spartan-card rounded-3xl p-5 border border-[#221c10] bg-[#080b12] flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#d4af37] to-[#8a6d1c] border border-[#facc15] flex items-center justify-center font-black text-black text-xl shadow-[0_4px_14px_rgba(212,175,55,0.3)]">
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

        {/* Export PDF Performance Statement Button */}
        <button
          onClick={() => setIsStatementOpen(true)}
          className="px-3.5 py-2 rounded-2xl gold-btn-solid text-black text-xs font-black uppercase flex items-center gap-1.5 shadow-[0_0_12px_rgba(212,175,55,0.3)] hover:opacity-95 active:scale-95 transition-all"
          title="Xuất bản sao kê lợi nhuận định chế"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{lang === 'vi' ? 'SAO KÊ PDF' : 'PDF AUDIT'}</span>
        </button>
      </div>

      {/* 1. Referral Program Overview Card (PRIMARY ACTIONS AT THE TOP) */}
      <div className="spartan-card rounded-3xl p-5 border border-[#221c10] bg-[#080b12] space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#221c10] pb-3">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#f5d77f]" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              {t('reseller_title')}
            </h3>
          </div>
          <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
            {t('reseller_rebate_badge')}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#05070c] p-3 rounded-2xl border border-[#221c10]">
            <span className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">{t('total_rebate')}</span>
            <div className="text-lg font-black text-[#f5d77f] font-mono">
              ${localRefBal.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
            </div>
          </div>

          <div className="bg-[#05070c] p-3 rounded-2xl border border-[#221c10]">
            <span className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">{t('direct_clients')}</span>
            <div className="text-lg font-black text-white flex items-center gap-1 font-mono">
              <Users className="w-4 h-4 text-[#f5d77f]" />
              <span>{referredUsers.length}</span>
              <span className="text-xs text-gray-500 font-bold">{t('direct_clients_count')}</span>
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
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:opacity-90 text-black font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('reinvest_btn')}</span>
            </button>
            <button
              onClick={() => {
                setIsWithdrawOpen(true);
                setWithdrawAmount(String(localRefBal));
                setWithdrawError(null);
                setWithdrawSuccess(null);
              }}
              className="py-2.5 px-3 rounded-xl bg-[#0c0f17] hover:bg-[#141924] border border-[#221c10] text-gray-300 font-bold text-[11px] uppercase flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-[#ff2d55]" />
              <span>{t('withdraw_rebate_btn')}</span>
            </button>
          </div>
        )}

        {/* Exclusive Referral Link Box */}
        <div>
          <label className="text-xs text-gray-400 font-bold block mb-1.5">
            {t('ref_link_label')}
          </label>
          <div className="flex items-center gap-2 bg-[#05070c] border border-[#221c10] p-2.5 rounded-2xl">
            <span className="text-xs text-[#f5d77f] font-mono font-bold truncate flex-1">
              {refLink}
            </span>
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-xl gold-btn-solid text-xs font-black flex items-center gap-1 hover:opacity-90 transition-opacity active:scale-95"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-black" /> : <Copy className="w-3.5 h-3.5 text-black" />}
              <span>{copied ? t('btn_copied') : t('btn_copy')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. BẢNG GIỚI THIỆU CHÍNH SÁCH ĐỐI TÁC LIÊN KẾT F1 (10 HẠNG THÀNH VIÊN) */}
      <div className="spartan-card rounded-3xl p-5 border border-[#221c10] bg-[#080b12] space-y-4 shadow-xl">
        {/* Header & Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#221c10] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#d4af37]/20 to-amber-500/10 border border-[#d4af37]/40 flex items-center justify-center shadow-[0_0_12px_rgba(212,175,55,0.2)]">
              <Trophy className="w-5 h-5 text-[#f5d77f]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  {lang === 'vi' ? 'CHÍNH SÁCH ĐỐI TÁC LIÊN KẾT F1 & QUYỀN LỢI ĐỊNH CHẾ' : 'F1 AFFILIATE PARTNER POLICY & INCENTIVE HUB'}
                </h3>
                <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {lang === 'vi' ? 'HỢP TÁC DOANH THU 10 HẠNG' : '10-TIER REVENUE SHARE'}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {lang === 'vi'
                  ? 'Cơ chế phân bổ quyền lợi định chế: Chiết khấu phí khởi tạo (15% - 50%) + Thưởng hiệu quả định lượng HWM (10% - 35%)'
                  : 'Institutional revenue sharing: Portfolio initiation rebate (15% - 50%) + Quantitative HWM performance royalty (10% - 35%)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-[10px] font-black text-[#f5d77f] bg-[#d4af37]/15 px-3 py-1 rounded-full border border-[#d4af37]/35 shadow-[0_0_10px_rgba(212,175,55,0.2)]">
              {isAdmin ? '👑 SUPREME LEADER' : `${t('ref_current_tier')}: HẠNG ${effectiveTier}`}
            </span>
            <button
              type="button"
              onClick={() => setShowTierMatrix(!showTierMatrix)}
              className="px-2.5 py-1 rounded-xl bg-[#0e131f] border border-[#221c10] text-xs text-gray-400 hover:text-white font-bold transition-all"
            >
              {showTierMatrix ? '▲ Thu gọn' : '▼ Xem chi tiết'}
            </button>
          </div>
        </div>

        {/* 3 Trụ Cột Quyền Lợi Phân Bổ Doanh Thu Định Chế */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <div className="bg-[#05070c] p-3.5 rounded-2xl border border-emerald-500/20 space-y-1 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-400 font-black text-xs">
              <Coins className="w-4 h-4" />
              <span>1. CHIẾT KHẤU PHÍ KHỞI TẠO</span>
            </div>
            <div className="text-base font-black text-white font-mono">
              15.0% - 50.0% <span className="text-[10px] text-emerald-400 font-sans font-bold">(Tỷ lệ phân bổ sàn)</span>
            </div>
            <p className="text-[10px] text-gray-400">
              Kết chuyển tức thời tương đương <strong className="text-emerald-300 font-mono">+$13.50 đến +$45.00 USDT</strong> khi thành viên F1 kết nối quy mô $1,000U.
            </p>
          </div>

          <div className="bg-[#05070c] p-3.5 rounded-2xl border border-cyan-500/20 space-y-1 shadow-sm">
            <div className="flex items-center gap-2 text-cyan-400 font-black text-xs">
              <TrendingUp className="w-4 h-4" />
              <span>2. THƯỞNG HIỆU QUẢ ĐỊNH LƯỢNG HWM</span>
            </div>
            <div className="text-base font-black text-white font-mono">
              10.0% - 35.0% <span className="text-[10px] text-cyan-400 font-sans font-bold">Hiệu Quả Vượt Đỉnh</span>
            </div>
            <p className="text-[10px] text-gray-400">
              Trích từ phí hiệu quả khi danh mục đầu tư đạt mức tăng trưởng vượt đỉnh (High-Water Mark) theo kỳ đối soát.
            </p>
          </div>

          <div className="bg-[#05070c] p-3.5 rounded-2xl border border-amber-500/20 space-y-1 shadow-sm">
            <div className="flex items-center gap-2 text-amber-400 font-black text-xs">
              <Sparkles className="w-4 h-4" />
              <span>3. THANH KHOẢN P2P & KÝ QUỸ TẠM THỜI</span>
            </div>
            <div className="text-base font-black text-white font-mono">
              35.0% <span className="text-[10px] text-amber-400 font-sans font-bold">Phí Dịch Vụ Sàn</span>
            </div>
            <p className="text-[10px] text-gray-400">
              Nhận 35% phí giao dịch khớp lệnh P2P và 10% phí tiện ích ký quỹ tạm thời của thành viên F1 trong hệ thống.
            </p>
          </div>
        </div>

        {/* Thước Đo Mục Tiêu Phát Triển (Interactive Goal Simulator) */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#0d121f] to-[#080b12] border border-[#d4af37]/30 space-y-2.5 shadow-inner">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[#f5d77f]" />
              <span className="text-xs font-black text-white uppercase tracking-wider">
                {lang === 'vi' ? '🎯 MỤC TIÊU PHÁT TRIỂN & DỰ PHÓNG THU NHẬP' : '🎯 PARTNER GOAL & INCOME PROJECTION'}
              </span>
            </div>
            <span className="text-[10px] text-gray-400 font-medium">Chọn quy mô thành viên:</span>
          </div>

          {/* Quick Selectors */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { f1s: 5, label: '5 Thành viên (Hạng 2)', total: '150 - 300' },
              { f1s: 10, label: '10 Thành viên (Hạng 3)', total: '300 - 600' },
              { f1s: 25, label: '25 Thành viên (Hạng 5)', total: '1,000 - 1,500' },
              { f1s: 50, label: '50 Thành viên (Hạng 10 Master)', total: '5,500 - 12,000+' }
            ].map((goal) => {
              const isSelected = selectedGoalF1s === goal.f1s;
              return (
                <button
                  key={goal.f1s}
                  type="button"
                  onClick={() => setSelectedGoalF1s(goal.f1s)}
                  className={`p-2 rounded-xl text-left border transition-all ${
                    isSelected
                      ? 'bg-[#d4af37]/15 border-[#d4af37] text-white shadow-[0_0_10px_rgba(212,175,55,0.3)]'
                      : 'bg-[#05070c] border-[#1f293d] text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <div className="text-[11px] font-black text-white">{goal.label}</div>
                  <div className="text-[10px] font-mono text-[#f5d77f] font-bold mt-0.5">
                    ~${goal.total} U/tháng
                  </div>
                </button>
              );
            })}
          </div>

          {/* Dynamic Projection Result */}
          {(() => {
            const goalData = [
              { f1s: 5, tierName: 'HẠNG 2', depRebate: 90, hwmMonthly: 80, totalMonthly: '150 - 300' },
              { f1s: 10, tierName: 'HẠNG 3 (SPARTAN)', depRebate: 225, hwmMonthly: 200, totalMonthly: '300 - 600' },
              { f1s: 25, tierName: 'HẠNG 5 (LEADER)', depRebate: 787, hwmMonthly: 670, totalMonthly: '1,000 - 1,500' },
              { f1s: 50, tierName: 'HẠNG 10 (MASTER VIP)', depRebate: 2250, hwmMonthly: 2330, totalMonthly: '5,500 - 12,000+' }
            ].find(g => g.f1s === selectedGoalF1s) || { f1s: 10, tierName: 'HẠNG 3', depRebate: 225, hwmMonthly: 200, totalMonthly: '300 - 600' };

            return (
              <div className="bg-[#05070c] p-3 rounded-xl border border-[#221c10] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono">
                <div>
                  <span className="text-gray-400 block text-[10px]">ƯỚC TÍNH VỚI QUY MÔ {selectedGoalF1s} THÀNH VIÊN ({goalData.tierName}):</span>
                  <div className="flex items-center gap-3 text-gray-300 text-[11px] mt-0.5">
                    <span>💵 Phí khởi tạo: <strong className="text-emerald-400">+${goalData.depRebate} USDT</strong></span>
                    <span>📈 Thưởng HWM: <strong className="text-cyan-400">+${goalData.hwmMonthly} USDT/tháng</strong></span>
                  </div>
                </div>
                <div className="text-right self-end sm:self-auto">
                  <span className="text-[10px] text-amber-400 block uppercase font-bold">Dự phóng thu nhập:</span>
                  <span className="text-sm font-black text-[#f5d77f]">
                    ${goalData.totalMonthly} USDT/tháng
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Danh Sách 10 Hạng Thành Viên Ma Trận (Hiển Thị Đầy Đủ) */}
        {showTierMatrix && (
          <div className="space-y-2 pt-2 border-t border-[#221c10] animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase px-1">
              <span>HẠNG THÀNH VIÊN & TIÊU CHUẨN ĐẠT HẠNG</span>
              <span>PHÂN BỔ KHỞI TẠO & HIỆU QUẢ HWM</span>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-[#d4af37]/40 scrollbar-track-[#05070c]">
              {RESELLER_TIERS_MATRIX.map((item) => {
                const isCurrent = !isAdmin && effectiveTier === item.tier;
                return (
                  <div
                    key={item.tier}
                    className={`p-3 rounded-2xl border transition-all ${
                      isCurrent
                        ? 'bg-[#0f1422] border-[#d4af37] shadow-[0_0_18px_rgba(212,175,55,0.3)] ring-1 ring-[#d4af37]/60'
                        : 'bg-[#05070c] border-[#221c10] hover:border-gray-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#0b0e17] border border-[#221c10] flex items-center justify-center font-mono font-black text-amber-400 text-xs">
                          T{item.tier}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-black uppercase tracking-wider ${item.badgeStyle.split(' ')[1]}`}>
                              {item.rankName}
                            </span>
                            {isCurrent && (
                              <span className="text-[9px] font-black px-2 py-0.5 bg-[#d4af37] text-black rounded-full uppercase shadow-[0_0_8px_rgba(212,175,55,0.4)]">
                                {t('ref_your_tier')}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 block mt-0.5">{item.requirementText}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-[#1f293d]/40">
                        <div className="text-left sm:text-right">
                          <span className="text-xs font-mono font-black text-emerald-400 block">
                            {item.depositRebatePct}% Phí Khởi Tạo ({item.depositPer1k})
                          </span>
                          <span className="text-[10px] font-mono text-cyan-400 font-bold block">
                            +{item.hwmRebatePct}% Hiệu Quả HWM
                          </span>
                        </div>
                        <div className="pl-2 border-l border-[#1f293d]/60 text-right">
                          <span className="text-[9px] text-gray-500 block uppercase">Thu nhập ước tính:</span>
                          <span className="text-[11px] font-mono font-black text-[#f5d77f] whitespace-nowrap block">
                            {item.estimatedMonthlyIncome}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bản Ghi Chú Tuân Thủ Pháp Lý & Khuyến Cáo Rủi Ro */}
            <div className="p-3 rounded-2xl bg-[#05070c] border border-[#221c10] text-[9px] text-gray-500 leading-relaxed space-y-1 mt-2">
              <div className="flex items-center gap-1.5 font-bold text-gray-400">
                <ShieldCheck className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>BẢN GHI CHÚ PHÁP LÝ & KHUYẾN CÁO TUÂN THỦ (REGULATORY COMPLIANCE NOTE):</span>
              </div>
              <p>
                • Spartan vận hành theo mô hình Đối tác Liên kết Trực tiếp F1 độc lập (Single-Tier Direct Referral), không áp dụng cơ chế phân nhánh đa cấp kim tự tháp.
              </p>
              <p>
                • Các khoản chiết khấu khởi tạo và thưởng hiệu quả được trích từ nguồn thu dịch vụ thực tế của nền tảng và kết chuyển tự động vào số dư khả dụng khi đủ điều kiện đối soát.
              </p>
              <p>
                • Toàn bộ số liệu mô phỏng thu nhập mang tính chất tham khảo dựa trên mô hình thuật toán định lượng, không cấu thành cam kết lợi nhuận tài chính cố định hoặc bảo đảm mức thu nhập tương lai.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. AFFILIATE & INVESTOR LEADERBOARD */}
      <AffiliateLeaderboardCard
        currentUsername={username}
        currentUserId={telegramId}
        userF1Count={referredUsers.length}
        userVolume={localTradingBal}
      />

      {/* Referred Clients Sub-List */}
      <div className="spartan-card rounded-3xl p-5 border border-[#221c10] bg-[#080b12] space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#221c10] pb-2.5">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#f5d77f]" /> {t('direct_clients_title')} ({referredUsers.length})
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
          <div className="bg-[#080b12] border border-[#221c10] rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-[0_0_30px_rgba(212,175,55,0.2)] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#221c10] pb-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  {lang === 'vi' ? 'TÁI ĐẦU TƯ VÀO VỐN BOT' : 'REINVEST INTO BOT CAPITAL'}
                </h3>
              </div>
              <button
                onClick={() => setIsReinvestOpen(false)}
                className="text-gray-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#05070c] p-3 rounded-2xl border border-[#221c10] space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">{lang === 'vi' ? 'Chiết khấu hiện có:' : 'Available Rebate:'}</span>
                <span className="font-bold text-[#f5d77f] font-mono">${localRefBal.toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">{lang === 'vi' ? 'Phí tái đầu tư:' : 'Reinvestment Fee:'}</span>
                <span className="font-bold text-emerald-400">{lang === 'vi' ? '0% (MIỄN PHÍ 100%)' : '0% (100% FREE)'}</span>
              </div>
            </div>

            {reinvestSuccess && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500 rounded-2xl text-emerald-400 text-xs font-bold text-center">
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
                  {lang === 'vi' ? 'Nhập số tiền muốn chuyển vào Vốn Thuật Toán ($ USDT):' : 'Enter amount to transfer to Trading Capital ($ USDT):'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    required
                    value={reinvestAmount}
                    onChange={(e) => setReinvestAmount(e.target.value)}
                    className="w-full bg-[#05070c] border border-[#221c10] rounded-2xl py-3 px-4 text-white text-base font-black font-mono focus:outline-none focus:border-[#d4af37]"
                    placeholder="VD: 50"
                  />
                  <button
                    type="button"
                    onClick={() => setReinvestAmount(String(localRefBal))}
                    className="absolute right-3 top-2.5 px-2 py-1 bg-[#d4af37]/20 text-[#f5d77f] hover:bg-[#d4af37]/30 text-[10px] font-bold rounded-lg transition-all"
                  >
                    {lang === 'vi' ? 'TẤT CẢ' : 'ALL'}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={reinvestLoading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:opacity-90 text-black font-black text-xs uppercase shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  {reinvestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  <span>{lang === 'vi' ? 'XÁC NHẬN CHUYỂN VỐN' : 'CONFIRM REINVESTMENT'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsReinvestOpen(false)}
                  className="px-4 py-3 rounded-xl bg-[#05070c] text-gray-400 hover:text-white border border-[#221c10] text-xs font-bold"
                >
                  {lang === 'vi' ? 'Đóng' : 'Close'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Referral Commission Modal */}
      {isWithdrawOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#080b12] border border-[#221c10] rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-[0_0_30px_rgba(212,175,55,0.2)] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#221c10] pb-3">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-[#ff2d55]" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  {lang === 'vi' ? 'RÚT CHIẾT KHẤU VỀ VÍ USDT TRC20' : 'WITHDRAW REBATE (USDT TRC20)'}
                </h3>
              </div>
              <button
                onClick={() => setIsWithdrawOpen(false)}
                className="text-gray-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#05070c] p-3 rounded-2xl border border-[#221c10] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">{lang === 'vi' ? 'Chiết khấu khả dụng:' : 'Available Rebate:'}</span>
                <span className="font-bold text-[#f5d77f] font-mono">${localRefBal.toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{lang === 'vi' ? 'Phí sàn:' : 'Management Fee:'}</span>
                <span className="font-bold text-emerald-400">0% ({lang === 'vi' ? 'MIỄN PHÍ' : 'FREE'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{lang === 'vi' ? 'Phí mạng On-chain TRC20 Gas:' : 'On-chain TRC20 Gas Fee:'}</span>
                <span className="font-bold text-amber-400">-$5.00 USDT</span>
              </div>
              <div className="border-t border-[#221c10] pt-2 flex justify-between font-black text-sm">
                <span className="text-white">{lang === 'vi' ? 'Thực nhận về ví:' : 'Net Received:'}</span>
                <span className="text-emerald-400 font-mono">
                  ${Math.max(0, (parseFloat(withdrawAmount) || 0) - 5).toFixed(2)} USDT
                </span>
              </div>
            </div>

            {withdrawSuccess && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500 rounded-2xl text-emerald-400 text-xs font-bold text-center">
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
                  {lang === 'vi' ? 'Số tiền chiết khấu muốn rút ($ USDT):' : 'Rebate amount to withdraw ($ USDT):'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    required
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full bg-[#05070c] border border-[#221c10] rounded-2xl py-3 px-4 text-white text-base font-black font-mono focus:outline-none focus:border-[#d4af37]"
                    placeholder="VD: 50"
                  />
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(String(localRefBal))}
                    className="absolute right-3 top-2.5 px-2 py-1 bg-[#141924] text-gray-300 hover:text-white text-[10px] font-bold rounded-lg transition-all"
                  >
                    {lang === 'vi' ? 'TẤT CẢ' : 'ALL'}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-bold block">
                  {lang === 'vi' ? 'Địa chỉ ví USDT (TRC20) nhận tiền:' : 'Destination USDT (TRC20) Address:'}
                </label>
                <input
                  type="text"
                  required
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  className="w-full bg-[#05070c] border border-[#221c10] rounded-2xl py-2.5 px-3 text-white text-xs font-mono focus:outline-none focus:border-[#d4af37]"
                  placeholder="VD: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={withdrawLoading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#ff2d55] to-[#ff5500] hover:opacity-90 text-white font-black text-xs uppercase shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  {withdrawLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
                  <span>{lang === 'vi' ? 'XÁC NHẬN RÚT CHIẾT KHẤU' : 'CONFIRM WITHDRAWAL'}</span>
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

      {/* INVESTOR PERFORMANCE STATEMENT & CERTIFICATE MODAL */}
      <InvestorStatementModal
        isOpen={isStatementOpen}
        onClose={() => setIsStatementOpen(false)}
        username={username}
        telegramId={telegramId}
        tradingBalance={localTradingBal}
        referralBalance={localRefBal}
        effectiveTier={effectiveTier}
      />
    </div>
  );
};
