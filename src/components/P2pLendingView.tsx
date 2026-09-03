'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  HandCoins, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  AlertCircle,
  Percent,
  BadgeAlert
} from 'lucide-react';
import { 
  SAMPLE_P2P_OFFERS, 
  enrollP2pWaitlist, 
  checkP2pWaitlistStatus, 
  P2pOfferItem 
} from '@/lib/p2pLendingService';
import { useLanguage } from '@/contexts/LanguageContext';

interface P2pLendingViewProps {
  currentBalance: number;
  telegramId?: string;
  username?: string;
}

export const P2pLendingView: React.FC<P2pLendingViewProps> = ({
  currentBalance,
  telegramId = '',
  username = ''
}) => {
  const { lang } = useLanguage();
  
  // Interactive Calculator State
  const [calcAmount, setCalcAmount] = useState<number>(5000);
  const [calcTermDays, setCalcTermDays] = useState<number>(90);
  const monthlyRatePct = calcTermDays === 30 ? 2.5 : calcTermDays === 90 ? 2.2 : 1.8;
  const estimatedMonthlyYield = (calcAmount * monthlyRatePct) / 100;
  const totalReturn = calcAmount + (estimatedMonthlyYield * (calcTermDays / 30));

  // Waitlist State
  const [isEnrolled, setIsEnrolled] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [enrollRole, setEnrollRole] = useState<'LENDER' | 'BORROWER' | 'BOTH'>('BOTH');
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  useEffect(() => {
    if (telegramId) {
      checkP2pWaitlistStatus(telegramId).then(enrolled => {
        setIsEnrolled(enrolled);
      });
    }
  }, [telegramId]);

  const handleEnroll = async () => {
    setIsSubmitting(true);
    setNoticeMsg(null);
    try {
      const res = await enrollP2pWaitlist(telegramId, username, enrollRole);
      if (res.success) {
        setIsEnrolled(true);
        setNoticeMsg(res.message);
      } else {
        setNoticeMsg(res.message);
      }
    } catch {
      setNoticeMsg('Không thể kết nối máy chủ. Vui lòng thử lại sau!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      
      {/* 1. INSTITUTIONAL HEADER & UNDER DEVELOPMENT BADGE */}
      <div className="spartan-card rounded-3xl p-5 border border-[#221c10] bg-[#080b12] space-y-3 shadow-lg relative overflow-hidden">
        {/* Background Ambient Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#d4af37]/15 border border-[#d4af37]/40 flex items-center justify-center text-xl text-[#f5d77f] shadow-[0_0_15px_rgba(212,175,55,0.25)]">
              🤝
            </div>
            <div>
              <h2 className="text-sm md:text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>{lang === 'vi' ? 'THỊ TRƯỜNG CHO VAY NGANG HÀNG' : 'P2P LENDING & CREDIT FACILITY'}</span>
              </h2>
              <span className="text-[10px] text-gray-400 font-mono block">
                PEER-TO-PEER INSTITUTIONAL LIQUIDITY POOL
              </span>
            </div>
          </div>

          {/* Under Development Status Pill */}
          <div className="self-start sm:self-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/40 shadow-[0_0_12px_rgba(212,175,55,0.2)]">
            <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-ping" />
            <span className="text-[10px] font-mono font-black text-[#f5d77f] uppercase tracking-wider">
              {lang === 'vi' ? '🚧 ĐANG PHÁT TRIỂN (Q4/2026)' : '🚧 UNDER DEVELOPMENT (Q4/2026)'}
            </span>
          </div>
        </div>

        <p className="text-xs text-gray-300 font-sans leading-relaxed relative z-10 pt-1">
          {lang === 'vi'
            ? 'Tính năng Cho Vay Ngang Hàng (P2P Lending) cho phép các nhà đầu tư Spartan kết nối dòng vốn trực tiếp với nhau: Người có vốn nhàn rỗi nhận lãi suất cố định, người cần đòn bẩy vay vốn mở rộng bot giao dịch Vàng XAU/USD. Toàn bộ khoản vay được bảo chứng 100% bằng Hợp đồng Ký quỹ Quỹ Lạnh Spartan Cold Vault.'
            : 'The Spartan P2P Lending Market enables investors to lend and borrow liquidity directly. Lenders earn predictable fixed monthly yield, while borrowers unlock margin to scale algorithmic trading bot positions. Backed 100% by Spartan Cold Vault Escrow.'}
        </p>
      </div>

      {/* 2. THREE CORE PILLARS OF P2P LENDING */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-[#05070c] p-3.5 rounded-2xl border border-[#221c10] space-y-1.5">
          <div className="flex items-center gap-2 text-[#f5d77f]">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-wider">{lang === 'vi' ? 'LÃI SUẤT HẤP DẪN' : 'ATTRACTIVE YIELD'}</span>
          </div>
          <p className="text-[11px] text-gray-400 font-mono">
            {lang === 'vi' ? 'Lợi nhuận cố định từ 1.8% - 2.8%/tháng (tương đương 21.6% - 33.6%/năm), thanh toán định kỳ theo chu kỳ lựa chọn.' : 'Fixed returns from 1.8% - 2.8%/month (21.6% - 33.6% APR), paid out periodically.'}
          </p>
        </div>

        <div className="bg-[#05070c] p-3.5 rounded-2xl border border-[#221c10] space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-wider">{lang === 'vi' ? 'BẢO CHỨNG QUỸ LẠNH' : 'COLD VAULT ESCROW'}</span>
          </div>
          <p className="text-[11px] text-gray-400 font-mono">
            {lang === 'vi' ? 'Người vay phải ký quỹ bằng vốn bot thực tế. Quỹ dự phòng 10% Cold Vault đảm bảo thu hồi nợ 100% khi đến hạn.' : 'Borrowers pledge live bot equity. The 10% Cold Vault Treasury guarantees 100% principal repayment.'}
          </p>
        </div>

        <div className="bg-[#05070c] p-3.5 rounded-2xl border border-[#221c10] space-y-1.5">
          <div className="flex items-center gap-2 text-blue-400">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-wider">{lang === 'vi' ? 'KỲ HẠN LINH HOẠT' : 'FLEXIBLE TERMS'}</span>
          </div>
          <p className="text-[11px] text-gray-400 font-mono">
            {lang === 'vi' ? 'Đa dạng các gói kỳ hạn 30 ngày, 90 ngày hoặc 180 ngày. Hỗ trợ tự động tất toán gốc và lãi về ví USDT.' : 'Support for 30-day, 90-day, or 180-day contracts. Automatic principal + profit settlement.'}
          </p>
        </div>
      </div>

      {/* 3. INTERACTIVE P2P INTEREST CALCULATOR */}
      <div className="spartan-card rounded-3xl p-5 border border-[#221c10] bg-[#080b12] space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#221c10] pb-3">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Percent className="w-4 h-4 text-[#f5d77f]" />
            <span>{lang === 'vi' ? 'MÔ PHỎNG LỢI NHUẬN CHO VAY P2P' : 'P2P YIELD SIMULATOR'}</span>
          </h3>
          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
            INTERACTIVE PREVIEW
          </span>
        </div>

        <div className="space-y-3">
          {/* Amount Selector */}
          <div>
            <div className="flex justify-between items-center text-xs font-bold mb-1.5">
              <span className="text-gray-400">{lang === 'vi' ? 'Số vốn dự kiến cho vay ($ USDT):' : 'Lending Capital ($ USDT):'}</span>
              <span className="text-[#f5d77f] font-mono text-sm font-black">${calcAmount.toLocaleString('en-US')} USDT</span>
            </div>
            <input
              type="range"
              min={1000}
              max={50000}
              step={1000}
              value={calcAmount}
              onChange={(e) => setCalcAmount(Number(e.target.value))}
              className="w-full accent-[#d4af37] bg-[#05070c] h-2 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-gray-500 font-mono mt-1">
              <span>$1,000 USDT</span>
              <span>$25,000 USDT</span>
              <span>$50,000 USDT</span>
            </div>
          </div>

          {/* Term Selector */}
          <div>
            <span className="text-xs text-gray-400 font-bold block mb-1.5">{lang === 'vi' ? 'Kỳ hạn cho vay:' : 'Lending Term:'}</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { days: 30, rate: '2.5%/tháng' },
                { days: 90, rate: '2.2%/tháng' },
                { days: 180, rate: '1.8%/tháng' }
              ].map(item => (
                <button
                  key={item.days}
                  type="button"
                  onClick={() => setCalcTermDays(item.days)}
                  className={`py-2 px-2.5 rounded-2xl border text-center transition-all ${
                    calcTermDays === item.days
                      ? 'bg-[#0f1422] border-[#d4af37] text-white shadow-[0_0_12px_rgba(212,175,55,0.2)]'
                      : 'bg-[#05070c] border-[#221c10] text-gray-400 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-black block font-mono">{item.days} {lang === 'vi' ? 'Ngày' : 'Days'}</span>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">{item.rate}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Calculator Output Card */}
          <div className="grid grid-cols-2 gap-2 p-3 bg-[#05070c] rounded-2xl border border-[#221c10] font-mono">
            <div>
              <span className="text-[9px] text-gray-400 block uppercase">{lang === 'vi' ? 'Lãi suất hàng tháng:' : 'Est. Monthly Profit:'}</span>
              <span className="text-sm font-black text-emerald-400">+${estimatedMonthlyYield.toFixed(2)} USDT</span>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-gray-400 block uppercase">{lang === 'vi' ? 'Tổng thu hồi sau kỳ hạn:' : 'Total Return at Maturity:'}</span>
              <span className="text-sm font-black text-[#f5d77f]">${totalReturn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. LIVE MARKET ORDERBOOK SHOWCASE (SAMPLE BIDS) */}
      <div className="spartan-card rounded-3xl p-5 border border-[#221c10] bg-[#080b12] space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#221c10] pb-2.5">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
            <HandCoins className="w-4 h-4 text-[#f5d77f]" />
            <span>{lang === 'vi' ? 'SỔ LỆNH CHO VAY ĐANG CHỜ KHỚP (ORDERBOOK)' : 'LIVE LENDING ORDERBOOK'}</span>
          </h3>
          <span className="text-[9px] font-mono text-gray-400">{SAMPLE_P2P_OFFERS.length} Bids</span>
        </div>

        <div className="space-y-2">
          {SAMPLE_P2P_OFFERS.map((offer) => (
            <div
              key={offer.id}
              className="p-3 rounded-2xl bg-[#05070c] border border-[#221c10] flex items-center justify-between font-mono"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white">@{offer.lenderUsername}</span>
                  <span className="text-[8px] bg-[#d4af37]/15 text-[#f5d77f] px-1.5 py-0.2 rounded font-bold border border-[#d4af37]/30">
                    {offer.lenderRank}
                  </span>
                </div>
                <span className="text-[9px] text-gray-400 block">
                  {offer.termDays} {lang === 'vi' ? 'ngày' : 'days'} • {lang === 'vi' ? 'Bảo đảm 100% Quỹ Lạnh' : '100% Escrow Protected'}
                </span>
              </div>

              <div className="text-right">
                <span className="text-xs font-black text-emerald-400 block">
                  ${offer.amountUsdt.toLocaleString('en-US')} USDT
                </span>
                <span className="text-[9px] text-[#f5d77f] font-bold">
                  {offer.monthlyInterestPct}% / {lang === 'vi' ? 'tháng' : 'mo'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. EARLY ACCESS VIP WAITLIST ENROLLMENT CTA */}
      <div className="spartan-card rounded-3xl p-5 border-2 border-[#d4af37]/50 bg-gradient-to-b from-[#0f1422] to-[#080b12] space-y-4 shadow-[0_0_30px_rgba(212,175,55,0.15)] text-center">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-[#d4af37]/20 border border-[#d4af37] flex items-center justify-center text-xl shadow-[0_0_15px_rgba(212,175,55,0.3)]">
          ⚡
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-black text-[#f5d77f] uppercase tracking-wider">
            {lang === 'vi' ? 'ĐĂNG KÝ SUẤT TRẢI NGHIỆM SỚM (VIP WAITLIST)' : 'JOIN EARLY ACCESS VIP WAITLIST'}
          </h3>
          <p className="text-xs text-gray-300 font-sans">
            {lang === 'vi'
              ? 'Hãy đăng ký ngay để trở thành 1 trong 50 nhà đầu tư đầu tiên được cấp hạn mức tín dụng P2P khi hệ thống kích hoạt chính thức!'
              : 'Be among the first 50 institutional partners to access the P2P Credit Facility upon official launch!'}
          </p>
        </div>

        {/* Role Selector */}
        {!isEnrolled && (
          <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
            {[
              { id: 'LENDER' as const, label: lang === 'vi' ? 'NGƯỜI CHO VAY' : 'LENDER' },
              { id: 'BORROWER' as const, label: lang === 'vi' ? 'NGƯỜI CẦN VAY' : 'BORROWER' },
              { id: 'BOTH' as const, label: lang === 'vi' ? 'CẢ HAI NHU CẦU' : 'BOTH' }
            ].map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => setEnrollRole(role.id)}
                className={`py-2 px-1 rounded-xl text-[10px] font-mono font-bold border transition-all ${
                  enrollRole === role.id
                    ? 'gold-btn-solid text-black shadow-md'
                    : 'bg-[#05070c] border-[#221c10] text-gray-400 hover:text-white'
                }`}
              >
                {role.label}
              </button>
            ))}
          </div>
        )}

        {/* Notice Message */}
        {noticeMsg && (
          <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
            {noticeMsg}
          </div>
        )}

        {/* Enroll Button */}
        {isEnrolled ? (
          <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{lang === 'vi' ? 'BẠN ĐÃ Ở TRONG HÀNG CHỜ ƯU TIÊN P2P VIP!' : 'YOU ARE ENROLLED IN THE VIP WAITLIST!'}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleEnroll}
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl gold-btn-solid text-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg hover:opacity-90 active:scale-[0.98] transition-all"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Sparkles className="w-4 h-4 text-black" />}
            <span>{lang === 'vi' ? 'ĐĂNG KÝ VÀO DANH SÁCH CHỜ SỚM (0% PHÍ)' : 'ENROLL IN VIP WAITLIST (0% FEE)'}</span>
          </button>
        )}
      </div>

    </div>
  );
};
