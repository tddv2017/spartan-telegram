'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  HandCoins, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  Loader2, 
  AlertTriangle,
  Percent,
  Bot,
  Wallet,
  ArrowRightLeft,
  Lock,
  Activity,
  ChevronRight,
  Info,
  Layers
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

type CapitalSourceType = 'BOT_EQUITY' | 'EXTERNAL_DEPOSIT';
type P2pModeType = 'BORROW' | 'LEND';

export const P2pLendingView: React.FC<P2pLendingViewProps> = ({
  currentBalance,
  telegramId = '',
  username = ''
}) => {
  const { lang } = useLanguage();
  
  // 1. Source & Mode Selectors
  const [capitalSource, setCapitalSource] = useState<CapitalSourceType>('BOT_EQUITY');
  const [p2pMode, setP2pMode] = useState<P2pModeType>('BORROW');
  const [liquidityProvider, setLiquidityProvider] = useState<'ADMIN_TREASURY' | 'PEER_COMMUNITY'>('ADMIN_TREASURY');

  // Baseline Bot Capital (fallback to 10,000 demo if balance is 0 for clear illustration)
  const displayBotBalance = currentBalance > 0 ? currentBalance : 10000;
  const isDemoBalance = currentBalance <= 0;

  // 2. Bot Equity Collateral State (Max 70% LTV)
  const [pledgePercent, setPledgePercent] = useState<number>(50); // 10% to 70%
  const [selectedTermDays, setSelectedTermDays] = useState<number>(90); // 30, 90, 180

  // 3. External Capital State
  const [externalAmount, setExternalAmount] = useState<number>(5000);

  // Dynamic Interest Rate Calculation based on Collateral Ratio (% Thế Chấp Vốn Bot)
  // Bậc 1: <= 40% -> 1.5%/tháng (Rủi ro thấp nhất)
  // Bậc 2: 41% - 60% -> 2.0%/tháng (Mức tiêu chuẩn)
  // Bậc 3: 61% - 70% (Trần 70%) -> 2.6%/tháng (Rủi ro cao nhất, áp dụng phí đệm thanh lý)
  const calculateRateByPledge = (pct: number) => {
    if (pct <= 40) return { rate: 1.5, tier: 'TIER 1 (ULTRA-SAFE)', color: 'text-emerald-400', desc: 'An toàn tối ưu, Bot tự do giao dịch Margin 60%+' };
    if (pct <= 60) return { rate: 2.0, tier: 'TIER 2 (BALANCED)', color: 'text-amber-400', desc: 'Cân bằng thị trường, Margin an toàn còn 40% - 59%' };
    return { rate: 2.6, tier: 'TIER 3 (MAX LEVERAGE 70%)', color: 'text-[#ff5500]', desc: 'Chạm trần tối đa 70%, khóa đệm an toàn 30% cho Bot' };
  };

  const dynamicRateInfo = calculateRateByPledge(pledgePercent);

  // Computed Loan Amounts (Dùng vốn Bot)
  const maxAllowableBorrow = displayBotBalance * 0.70; // Hard cap 70%
  const currentLoanAmount = (displayBotBalance * pledgePercent) / 100;
  const remainingBotMargin = displayBotBalance - currentLoanAmount;
  const botSafetyMarginPct = 100 - pledgePercent;
  const monthlyInterestUsdt = (currentLoanAmount * dynamicRateInfo.rate) / 100;
  const totalInterestOverTerm = monthlyInterestUsdt * (selectedTermDays / 30);

  // Computed for External Capital (Nạp vốn mới)
  const externalMonthlyRate = selectedTermDays === 30 ? 2.5 : selectedTermDays === 90 ? 2.2 : 1.8;
  const externalMonthlyYield = (externalAmount * externalMonthlyRate) / 100;
  const externalTotalReturn = externalAmount + (externalMonthlyYield * (selectedTermDays / 30));

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
      
      {/* 1. INSTITUTIONAL HEADER & UNDER DEVELOPMENT ROADMAP */}
      <div className="spartan-card rounded-3xl p-5 border border-[#221c10] bg-[#080b12] space-y-3 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#d4af37]/15 border border-[#d4af37]/40 flex items-center justify-center text-xl text-[#f5d77f] shadow-[0_0_15px_rgba(212,175,55,0.25)]">
              🤝
            </div>
            <div>
              <h2 className="text-sm md:text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>{lang === 'vi' ? 'THỊ TRƯỜNG CHO VAY NGANG HÀNG (P2P)' : 'P2P LENDING & CREDIT FACILITY'}</span>
              </h2>
              <span className="text-[10px] text-gray-400 font-mono block">
                SPARTAN PEER-TO-PEER LIQUIDITY & COLLATERAL MARKET
              </span>
            </div>
          </div>

          <div className="self-start sm:self-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/40 shadow-[0_0_12px_rgba(212,175,55,0.2)]">
            <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-ping" />
            <span className="text-[10px] font-mono font-black text-[#f5d77f] uppercase tracking-wider">
              {lang === 'vi' ? '🚧 ĐANG PHÁT TRIỂN (Q2/2027)' : '🚧 UNDER DEVELOPMENT (Q2/2027)'}
            </span>
          </div>
        </div>

        <p className="text-xs text-gray-300 font-sans leading-relaxed relative z-10 pt-1">
          {lang === 'vi'
            ? 'Mô hình Tín dụng P2P định chế cho phép nhà đầu tư lựa chọn 2 phương thức vốn: Thế chấp trực tiếp vốn Bot đang giao dịch (tối đa 70% để bảo đảm an toàn margin bot) hoặc Nạp vốn mới từ ví ngoài để cho vay sinh lời cố định.'
            : 'Institutional P2P lending allows investors to either collateralize active bot trading equity (up to 70% LTV to preserve bot margin) or deposit fresh external liquidity to earn fixed yields.'}
        </p>
      </div>

      {/* 2. CHỌN NGUỒN VỐN THAM GIA: VỐN BOT TRADE vs VỐN NẠP MỚI */}
      <div className="spartan-card rounded-3xl p-5 border border-[#221c10] bg-[#080b12] space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#221c10] pb-2.5">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-[#f5d77f]" />
            <span>{lang === 'vi' ? 'BƯỚC 1: CHỌN NGUỒN VỐN THỰC HIỆN' : 'STEP 1: SELECT CAPITAL SOURCE'}</span>
          </h3>
          <span className="text-[9px] font-mono text-[#d4af37] font-bold">2 LỰA CHỌN</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Nguồn A: Thế chấp Vốn Bot đang Trade */}
          <button
            type="button"
            onClick={() => setCapitalSource('BOT_EQUITY')}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
              capitalSource === 'BOT_EQUITY'
                ? 'bg-gradient-to-b from-[#0f1422] to-[#080b12] border-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.25)]'
                : 'bg-[#05070c] border-[#221c10] hover:border-gray-700 opacity-75'
            }`}
          >
            {capitalSource === 'BOT_EQUITY' && (
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-[#d4af37]/20 border border-[#d4af37] text-[8px] font-mono font-bold text-[#f5d77f]">
                ĐANG CHỌN ✓
              </div>
            )}
            <div className="flex items-center gap-2.5 mb-2 text-[#f5d77f]">
              <Bot className="w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-wider">
                {lang === 'vi' ? 'THẾ CHẤP VỐN BOT ĐANG TRADE' : 'COLLATERALIZE ACTIVE BOT'}
              </span>
            </div>
            <p className="text-[11px] text-gray-300 font-sans leading-normal mb-2">
              {lang === 'vi' 
                ? 'Không cần nạp thêm tiền! Sử dụng chính vốn bot đang chạy để vay tiền mặt hoặc đòn bẩy. Thế chấp tối đa 70% tài sản bot.'
                : 'No fresh deposit needed! Pledge live bot equity up to 70% LTV while preserving 30% margin.'}
            </p>
            <div className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
              ⚡ Hạn mức vay: <strong>Max 70% Vốn Bot</strong> • Lãi suất theo % thế chấp
            </div>
          </button>

          {/* Nguồn B: Nạp Vốn Mới Từ Ví Ngoài */}
          <button
            type="button"
            onClick={() => setCapitalSource('EXTERNAL_DEPOSIT')}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
              capitalSource === 'EXTERNAL_DEPOSIT'
                ? 'bg-gradient-to-b from-[#0f1422] to-[#080b12] border-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.25)]'
                : 'bg-[#05070c] border-[#221c10] hover:border-gray-700 opacity-75'
            }`}
          >
            {capitalSource === 'EXTERNAL_DEPOSIT' && (
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-[#d4af37]/20 border border-[#d4af37] text-[8px] font-mono font-bold text-[#f5d77f]">
                ĐANG CHỌN ✓
              </div>
            )}
            <div className="flex items-center gap-2.5 mb-2 text-emerald-400">
              <Wallet className="w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-wider">
                {lang === 'vi' ? 'NẠP VỐN MỚI (USDT TRC20)' : 'FRESH USDT DEPOSIT'}
              </span>
            </div>
            <p className="text-[11px] text-gray-300 font-sans leading-normal mb-2">
              {lang === 'vi'
                ? 'Nạp dòng tiền mới độc lập từ ví ngoài vào để cho vay lấy lãi hoặc ký quỹ. Không liên quan và không ảnh hưởng đến số dư Bot.'
                : 'Inject fresh liquidity from external wallet to lend out for fixed yields. Zero impact on bot trading.'}
            </p>
            <div className="text-[10px] font-mono text-[#f5d77f] bg-[#d4af37]/10 p-2 rounded-xl border border-[#d4af37]/20">
              🛡️ Hạn mức: <strong>100% Vốn Nạp</strong> • Lãi suất cố định 1.8% - 2.5%/tháng
            </div>
          </button>
        </div>
      </div>

      {/* 3. SIMULATION ENGINE BASED ON SELECTED CAPITAL SOURCE */}
      {capitalSource === 'BOT_EQUITY' ? (
        /* CASE A: THẾ CHẤP VỐN BOT TRADE (MAX 70% LTV) */
        <div className="spartan-card rounded-3xl p-5 border border-[#221c10] bg-[#080b12] space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-[#221c10] pb-3">
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'vi' ? 'MÔ PHỎNG THẾ CHẤP VỐN BOT (TỐI ĐA 70% TÀI SẢN)' : 'BOT COLLATERAL SIMULATOR (MAX 70% LTV)'}</span>
              </h3>
              <span className="text-[10px] text-gray-400 font-mono block pt-0.5">
                {lang === 'vi' ? 'Vốn Bot hiện có: ' : 'Live Bot Trading Equity: '}
                <strong className="text-white">${displayBotBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT</strong>
                {isDemoBalance && <span className="text-[#d4af37] text-[9px] ml-1">(Minh họa mẫu)</span>}
              </span>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-black">
              LTV: {pledgePercent}%
            </span>
          </div>

          {/* Quy Tắc Thế Chấp 70% - 30% */}
          <div className="p-3.5 rounded-2xl bg-[#05070c] border border-[#221c10] space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-gray-400">{lang === 'vi' ? 'Tỷ Lệ Thế Chấp Vốn Bot Của Khách:' : 'Bot Equity Collateral Ratio:'}</span>
              <span className="text-base font-black font-mono text-[#f5d77f]">{pledgePercent}% Vốn Bot</span>
            </div>

            {/* Interactive Range Slider (Limit strictly to 70%) */}
            <input
              type="range"
              min={10}
              max={70}
              step={5}
              value={pledgePercent}
              onChange={(e) => setPledgePercent(Number(e.target.value))}
              className="w-full accent-[#d4af37] bg-[#141924] h-2.5 rounded-lg cursor-pointer"
            />
            
            <div className="flex justify-between text-[9px] text-gray-500 font-mono">
              <span>10% (Tối thiểu)</span>
              <span>40% (Tiêu chuẩn an toàn)</span>
              <span className="text-[#ff5500] font-bold">70% (TRẦN TỐI ĐA)</span>
            </div>

            {/* Visual LTV Health Bar */}
            <div className="w-full bg-[#141924] h-2 rounded-full overflow-hidden flex mt-2">
              <div 
                style={{ width: `${pledgePercent}%` }} 
                className={`h-full transition-all duration-300 ${
                  pledgePercent <= 40 ? 'bg-emerald-400' : pledgePercent <= 60 ? 'bg-amber-400' : 'bg-[#ff5500]'
                }`}
              />
              <div 
                style={{ width: `${100 - pledgePercent}%` }} 
                className="h-full bg-blue-500/30 border-l border-blue-400/50" 
                title="Vùng đệm an toàn cho Bot" 
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono pt-0.5">
              <span className={dynamicRateInfo.color}>
                ■ Thế chấp: {pledgePercent}% (${currentLoanAmount.toLocaleString('en-US', { minimumFractionDigits: 0 })} USDT)
              </span>
              <span className="text-blue-400">
                ■ Đệm an toàn Bot: {botSafetyMarginPct}% (${remainingBotMargin.toLocaleString('en-US', { minimumFractionDigits: 0 })} USDT)
              </span>
            </div>
          </div>

          {/* Bảng Tính Lãi Suất Tương Ứng Theo % Thế Chấp */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-2xl bg-[#05070c] border border-[#221c10] space-y-1">
              <span className="text-[9px] text-gray-400 uppercase font-mono block">
                {lang === 'vi' ? 'Lãi Suất Theo Bậc Rủi Ro:' : 'Risk-Adjusted Rate:'}
              </span>
              <span className={`text-base font-black font-mono ${dynamicRateInfo.color} block`}>
                {dynamicRateInfo.rate}% / {lang === 'vi' ? 'tháng' : 'mo'}
              </span>
              <span className="text-[8px] font-mono text-gray-400 block">
                {dynamicRateInfo.tier}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#05070c] border border-[#221c10] space-y-1">
              <span className="text-[9px] text-gray-400 uppercase font-mono block">
                {lang === 'vi' ? 'Tiền Được Giải Ngân (USDT):' : 'Disbursed Loan Cash:'}
              </span>
              <span className="text-base font-black font-mono text-emerald-400 block">
                ${currentLoanAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
              </span>
              <span className="text-[8px] font-mono text-gray-400 block">
                (Tối đa cho phép: ${maxAllowableBorrow.toLocaleString('en-US')} USDT)
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#05070c] border border-[#221c10] space-y-1">
              <span className="text-[9px] text-gray-400 uppercase font-mono block">
                {lang === 'vi' ? 'Ước Tính Phí Lãi Vay/Tháng:' : 'Est. Monthly Interest:'}
              </span>
              <span className="text-base font-black font-mono text-[#f5d77f] block">
                ${monthlyInterestUsdt.toFixed(2)} USDT
              </span>
              <span className="text-[8px] font-mono text-gray-400 block">
                Tổng kỳ {selectedTermDays} ngày: ${totalInterestOverTerm.toFixed(2)} USDT
              </span>
            </div>
          </div>

          {/* Giải Thích Minh Bạch Về 3 Mức Lãi Suất Thế Chấp */}
          <div className="p-3 rounded-2xl bg-[#05070c] border border-[#221c10] space-y-2">
            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#f5d77f]" />
              <span>{lang === 'vi' ? 'QUY CHUẨN TÍNH % CHO VAY THEO TỶ LỆ THẾ CHẤP VỐN BOT:' : 'COLLATERAL TIER LENDING RATES:'}</span>
            </span>

            <div className="space-y-1.5 text-[10px] font-mono">
              <div className={`p-2 rounded-xl border flex items-center justify-between ${
                pledgePercent <= 40 ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold' : 'border-[#141924] text-gray-400'
              }`}>
                <span>• Bậc 1 (Vay $\le 40\%$ Vốn Bot): Lãi suất 1.5%/tháng</span>
                <span>🟢 Bot an toàn 60%+ Margin</span>
              </div>

              <div className={`p-2 rounded-xl border flex items-center justify-between ${
                pledgePercent > 40 && pledgePercent <= 60 ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 font-bold' : 'border-[#141924] text-gray-400'
              }`}>
                <span>• Bậc 2 (Vay $41\% - 60\%$ Vốn Bot): Lãi suất 2.0%/tháng</span>
                <span>🟡 Tiêu chuẩn thị trường</span>
              </div>

              <div className={`p-2 rounded-xl border flex items-center justify-between ${
                pledgePercent > 60 ? 'bg-[#ff5500]/10 border-[#ff5500]/40 text-[#ff5500] font-bold' : 'border-[#141924] text-gray-400'
              }`}>
                <span>• Bậc 3 (Vay $61\% - 70\%$ Vốn Bot - TRẦN MAX): Lãi suất 2.6%/tháng</span>
                <span>🔴 Giữ lại 30% đệm chống cháy Bot</span>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 font-sans italic pt-1">
              * Hệ thống Spartan Vault khóa cứng giới hạn 70% để bảo đảm 30% tài sản còn lại luôn đủ sức gồng các đợt sóng Vàng M5/H1 trên sàn Exness ECN mà không bao giờ bị dừng hoạt động bot.
            </p>
          </div>
        </div>
      ) : (
        /* CASE B: NẠP VỐN MỚI TỪ VÍ NGOÀI (EXTERNAL DEPOSIT) */
        <div className="spartan-card rounded-3xl p-5 border border-[#221c10] bg-[#080b12] space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-[#221c10] pb-3">
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'vi' ? 'MÔ PHỎNG NẠP VỐN MỚI CHO VAY (SINH LỜI 100%)' : 'FRESH DEPOSIT P2P YIELD SIMULATOR'}</span>
              </h3>
              <span className="text-[10px] text-gray-400 font-mono block pt-0.5">
                {lang === 'vi' ? 'Nạp USDT TRC20 độc lập • Không ràng buộc vốn bot' : 'Independent USDT TRC20 • Zero impact on bot'}
              </span>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#d4af37]/10 text-[#f5d77f] border border-[#d4af37]/30 font-black">
              100% LIQUIDITY
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                <span className="text-gray-400">{lang === 'vi' ? 'Số tiền vốn mới dự kiến nạp ($ USDT):' : 'Fresh Capital Amount ($ USDT):'}</span>
                <span className="text-[#f5d77f] font-mono text-sm font-black">${externalAmount.toLocaleString('en-US')} USDT</span>
              </div>
              <input
                type="range"
                min={1000}
                max={50000}
                step={1000}
                value={externalAmount}
                onChange={(e) => setExternalAmount(Number(e.target.value))}
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
                    onClick={() => setSelectedTermDays(item.days)}
                    className={`py-2 px-2.5 rounded-2xl border text-center transition-all ${
                      selectedTermDays === item.days
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

            {/* External Return Output */}
            <div className="grid grid-cols-2 gap-2 p-3 bg-[#05070c] rounded-2xl border border-[#221c10] font-mono">
              <div>
                <span className="text-[9px] text-gray-400 block uppercase">{lang === 'vi' ? 'Lợi nhuận nhận về / tháng:' : 'Est. Monthly Profit:'}</span>
                <span className="text-sm font-black text-emerald-400">+${externalMonthlyYield.toFixed(2)} USDT</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-gray-400 block uppercase">{lang === 'vi' ? 'Tổng thu hồi vốn & lãi:' : 'Total Return at Maturity:'}</span>
                <span className="text-sm font-black text-[#f5d77f]">${externalTotalReturn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. MÔ HÌNH VỐN KÉP: VỐN QUỸ ADMIN vs VỐN KHÁCH HÀNG P2P */}
      <div className="spartan-card rounded-3xl p-5 border border-[#221c10] bg-[#080b12] space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#221c10] pb-2.5">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#f5d77f]" />
            <span>{lang === 'vi' ? 'KIẾN TRÚC THANH KHOẢN VỐN KÉP (HYBRID DUAL-POOL)' : 'HYBRID DUAL-POOL LIQUIDITY'}</span>
          </h3>
          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">
            VỐN ADMIN & KHÁCH
          </span>
        </div>

        {/* 2 Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-[#05070c] rounded-2xl border border-[#221c10]">
          <button
            type="button"
            onClick={() => setLiquidityProvider('ADMIN_TREASURY')}
            className={`py-2.5 px-2 rounded-xl text-left transition-all ${
              liquidityProvider === 'ADMIN_TREASURY'
                ? 'bg-[#0f1422] border border-[#d4af37] text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#f5d77f]" />
              <span className="text-[11px] font-black">{lang === 'vi' ? '🏛️ VỐN QUỸ ADMIN' : '🏛️ ADMIN TREASURY'}</span>
            </div>
            <span className="text-[9px] font-mono text-emerald-400 block font-bold">
              ⚡ Giải ngân 30s • Pool $100K
            </span>
          </button>

          <button
            type="button"
            onClick={() => setLiquidityProvider('PEER_COMMUNITY')}
            className={`py-2.5 px-2 rounded-xl text-left transition-all ${
              liquidityProvider === 'PEER_COMMUNITY'
                ? 'bg-[#0f1422] border border-[#d4af37] text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[11px] font-black">{lang === 'vi' ? '👥 VỐN KHÁCH P2P' : '👥 PEER POOL'}</span>
            </div>
            <span className="text-[9px] font-mono text-blue-400 block font-bold">
              🤝 Sổ lệnh khớp • Lãi 1.8% - 2.2%
            </span>
          </button>
        </div>

        {/* Provider Details Card */}
        {liquidityProvider === 'ADMIN_TREASURY' ? (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#d4af37]/10 to-[#05070c] border border-[#d4af37]/30 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-black text-[#f5d77f] flex items-center gap-1.5">
                <span>VỐN TRỰC TIẾP TỪ QUỸ QUẢN TRỊ SPARTAN (MARKET MAKER POOL)</span>
              </span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-black">
                SẴN SÀNG: $100,000 USDT
              </span>
            </div>
            <p className="text-[11px] text-gray-300 font-sans leading-relaxed">
              Khách hàng cần vốn giải ngân ngay lập tức trong 30 giây không cần chờ người khác khớp lệnh. Quỹ Admin trực tiếp cấp thanh khoản, thu lãi suất vay 1.5% - 2.6%/tháng và bảo đảm an toàn tuyệt đối bằng 70% vốn bot thế chấp.
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] font-mono text-gray-300">
              <div className="p-2 rounded-xl bg-[#080b12] border border-[#221c10]">
                <span className="text-gray-500 block">Tốc độ giải ngân:</span>
                <strong className="text-emerald-400">⚡ 30 Giây</strong>
              </div>
              <div className="p-2 rounded-xl bg-[#080b12] border border-[#221c10]">
                <span className="text-gray-500 block">Lãi suất vay:</span>
                <strong className="text-[#f5d77f]">1.5% - 2.6%/th</strong>
              </div>
              <div className="p-2 rounded-xl bg-[#080b12] border border-[#221c10]">
                <span className="text-gray-500 block">Tỷ lệ bảo đảm:</span>
                <strong className="text-blue-400">100% USDT</strong>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/10 to-[#05070c] border border-blue-500/30 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-black text-blue-300 flex items-center gap-1.5">
                <span>THỊ TRƯỜNG CHO VAY NGANG HÀNG GIỮA CÁC KHÁCH HÀNG (COMMUNITY POOL)</span>
              </span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-black">
                KHỚP LỆNH TỰ ĐỘNG
              </span>
            </div>
            <p className="text-[11px] text-gray-300 font-sans leading-relaxed">
              Khách hàng có vốn nhàn rỗi (Lender) cho khách hàng cần vốn (Borrower) vay trực tiếp. Người cho vay nhận lãi cố định 1.8% - 2.2%/tháng, người vay trả 2.2% - 2.5%/tháng. Admin đóng vai trò sàn trọng tài thu chênh lệch lãi suất 0.5% - 0.7%/tháng mà không cần bỏ vốn.
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] font-mono text-gray-300">
              <div className="p-2 rounded-xl bg-[#080b12] border border-[#221c10]">
                <span className="text-gray-500 block">Người cho vay nhận:</span>
                <strong className="text-emerald-400">+1.8% - 2.2%/th</strong>
              </div>
              <div className="p-2 rounded-xl bg-[#080b12] border border-[#221c10]">
                <span className="text-gray-500 block">Người vay trả:</span>
                <strong className="text-[#f5d77f]">2.2% - 2.5%/th</strong>
              </div>
              <div className="p-2 rounded-xl bg-[#080b12] border border-[#221c10]">
                <span className="text-gray-500 block">Phí sàn Admin thu:</span>
                <strong className="text-purple-400">0.5% - 0.7%/th</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. LIVE MARKET ORDERBOOK SHOWCASE (SAMPLE BIDS) */}
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
                  {offer.termDays} {lang === 'vi' ? 'ngày' : 'days'} • {offer.collateralType}
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

      {/* 6. BẢN ĐỒ VÒNG VỐN LƯU ĐỘNG KHÉP KÍN (CAPITAL FLYWHEEL - HỆ SỐ NHÂN 1.71X) */}
      <div className="spartan-card rounded-3xl p-5 border border-[#221c10] bg-[#080b12] space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#221c10] pb-2.5">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#f5d77f]" />
            <span>{lang === 'vi' ? 'VÒNG VỐN LƯU ĐỘNG KHÉP KÍN (HỆ SỐ NHÂN 1.71X)' : 'CLOSED-LOOP CAPITAL FLYWHEEL (1.71X MULTIPLIER)'}</span>
          </h3>
          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">
            DUAL-ENGINE
          </span>
        </div>

        <p className="text-[11px] text-gray-300 font-sans leading-relaxed">
          {lang === 'vi'
            ? 'Khi Bot Trade AI và Tín Dụng P2P chạy đồng thời, dòng vốn của khách hàng không bao giờ bị rút ra ngoài mà luân chuyển sinh lời đa tầng: Vốn nạp trade bot sinh lãi, khi cần tiền mặt thế chấp 70% sang P2P, bot dùng 30% margin còn lại tự trade trả lãi vay thay bạn.'
            : 'When Bot Trading and P2P Credit operate simultaneously, capital never exits the ecosystem: Bot generates yields, 70% is pledged for instant cash, and 30% bot margin continues trading to pay loan interest.'}
        </p>

        {/* 4-Step Flywheel Flow Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
          <div className="p-3 rounded-2xl bg-[#05070c] border border-[#221c10] space-y-1">
            <div className="flex items-center justify-between text-[#f5d77f]">
              <span className="font-bold flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-[#d4af37]/20 flex items-center justify-center text-[10px]">1</span>
                <span>VỐN NẠP BAN ĐẦU</span>
              </span>
              <span className="text-emerald-400 font-bold">$150,000 USDT</span>
            </div>
            <p className="text-[10px] text-gray-400 font-sans">
              50 khách nạp bình quân $3,000 USDT vào Bot Trade Vàng XAU/USD, sinh lãi 8% - 12%/tháng và hoa hồng sàn Exness ($7/lot).
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-[#05070c] border border-[#221c10] space-y-1">
            <div className="flex items-center justify-between text-blue-400">
              <span className="font-bold flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px]">2</span>
                <span>GIẢI PHÓNG TIỀN MẶT</span>
              </span>
              <span className="text-blue-300 font-bold">+$36,750 USDT</span>
            </div>
            <p className="text-[10px] text-gray-400 font-sans">
              35% khách cần tiền mặt thế chấp 70% vốn bot. Nhận tiền mặt tiêu dùng ngay mà không cần rút vốn bot, tránh mất phí rút vốn.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-[#05070c] border border-[#221c10] space-y-1">
            <div className="flex items-center justify-between text-purple-400">
              <span className="font-bold flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px]">3</span>
                <span>BOT TỰ ĐỘNG TRẢ NỢ</span>
              </span>
              <span className="text-purple-300 font-bold">30% Margin Safe</span>
            </div>
            <p className="text-[10px] text-gray-400 font-sans">
              Vốn 30% còn lại ($15,750 USDT) vẫn trade bình thường trên sàn. Tiền lãi bot sinh ra tự động khấu trừ trả lãi vay hàng tháng.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-[#05070c] border border-[#221c10] space-y-1">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="font-bold flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">4</span>
                <span>VÒNG VỐN LƯU ĐỘNG TỔNG</span>
              </span>
              <span className="text-emerald-300 font-bold">~$256,750 USDT</span>
            </div>
            <p className="text-[10px] text-gray-400 font-sans">
              Tổng thanh khoản quay vòng trong hệ thống đạt $256,750 USDT (~6.5 Tỷ VNĐ) với hệ số nhân 1.71x mà tỷ lệ nợ xấu = 0%.
            </p>
          </div>
        </div>
      </div>

      {/* 7. KẾ HOẠCH TRIỂN KHAI CHI TIẾT QUÝ 2/2027 (4 PHASES) */}
      <div className="spartan-card rounded-3xl p-5 border border-[#221c10] bg-[#080b12] space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#221c10] pb-2.5">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#f5d77f]" />
            <span>{lang === 'vi' ? 'LỘ TRÌNH KÍCH HOẠT SẢN PHẨM (Q2/2027 MASTERPLAN)' : 'Q2/2027 MASTERPLAN'}</span>
          </h3>
          <span className="text-[9px] font-mono text-[#f5d77f] bg-[#d4af37]/15 px-2 py-0.5 rounded font-bold border border-[#d4af37]/30">
            ROADMAP
          </span>
        </div>

        <div className="space-y-2.5">
          <div className="p-3 rounded-2xl bg-[#05070c] border border-[#221c10] flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-[#d4af37]/20 border border-[#d4af37] text-xs font-mono font-black text-[#f5d77f] flex items-center justify-center flex-shrink-0 mt-0.5">
              P1
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">PHASE 1: SMART COLLATERAL ESCROW</span>
                <span className="text-[9px] font-mono text-gray-400">Q1/2027</span>
              </div>
              <p className="text-[11px] text-gray-300 font-sans">
                Hoàn thiện cơ chế tự động khóa 70% vốn bot ký quỹ an toàn và liên kết socket bảo vệ 30% margin trên máy chủ Exness.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#05070c] border border-emerald-500/30 flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500 text-xs font-mono font-black text-emerald-300 flex items-center justify-center flex-shrink-0 mt-0.5">
              P2
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400">PHASE 2: BỂ VỐN ADMIN $100K (GIẢI NGÂN 30S)</span>
                <span className="text-[9px] font-mono text-emerald-400 font-bold">THÁNG 4/2027</span>
              </div>
              <p className="text-[11px] text-gray-300 font-sans">
                Mở bể vốn Quỹ Admin giải ngân tiền mặt tức thì trong 30 giây cho 50 nhà đầu tư VIP đầu tiên thuộc Waitlist.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#05070c] border border-[#221c10] flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-blue-500/20 border border-blue-500 text-xs font-mono font-black text-blue-300 flex items-center justify-center flex-shrink-0 mt-0.5">
              P3
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">PHASE 3: SỔ LỆNH P2P CỘNG ĐỒNG KHỚP LỆNH</span>
                <span className="text-[9px] font-mono text-gray-400">THÁNG 5/2027</span>
              </div>
              <p className="text-[11px] text-gray-300 font-sans">
                Mở sàn cho vay ngang hàng tự do: Khách có tiền nhàn rỗi cho vay nhận 1.8% - 2.2%/tháng, Admin thu phí chênh lệch sàn 0.5% - 0.7%/tháng.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#05070c] border border-[#221c10] flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-purple-500/20 border border-purple-500 text-xs font-mono font-black text-purple-300 flex items-center justify-center flex-shrink-0 mt-0.5">
              P4
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">PHASE 4: ĐỘNG CƠ THANH LÝ & KÝ SỐ SHA-256</span>
                <span className="text-[9px] font-mono text-gray-400">THÁNG 6/2027</span>
              </div>
              <p className="text-[11px] text-gray-300 font-sans">
                Kích hoạt hợp đồng điện tử chữ ký số và thuật toán Auto-Liquidation bảo vệ 100% tài sản, duy trì nợ xấu bằng 0%.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 8. EARLY ACCESS VIP WAITLIST ENROLLMENT CTA */}
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
              ? 'Hãy đăng ký ngay để trở thành 1 trong 50 nhà đầu tư đầu tiên được cấp hạn mức tín dụng P2P khi hệ thống kích hoạt vào Q2/2027!'
              : 'Be among the first 50 institutional partners to access the P2P Credit Facility upon launch in Q2/2027!'}
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
