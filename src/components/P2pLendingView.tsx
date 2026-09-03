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

  // Dynamic Interest Rate Calculation based on Escrow Ratio (% Ký Quỹ Vốn Thuật Toán)
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
                <span>{lang === 'vi' ? 'TIỆN ÍCH KÝ QUỸ THANH KHOẢN TẠM THỜI (P2P)' : 'P2P MARGIN ESCROW & LIQUIDITY FACILITY'}</span>
              </h2>
              <span className="text-[10px] text-gray-400 font-mono block">
                SPARTAN PEER-TO-PEER LIQUIDITY & MARGIN ESCROW FACILITY
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
            ? 'Cơ chế Ký quỹ Thanh khoản P2P cho phép thành viên lựa chọn 2 phương thức: Ký quỹ tạm thời tối đa 70% vốn thuật toán để nhận thanh khoản tức thời (giữ lại 30% bảo đảm an toàn margin) hoặc Cung cấp thanh khoản P2P từ ví ngoài để nhận tỷ lệ phân bổ định chế.'
            : 'Institutional P2P facility allows members to either escrow active bot equity (up to 70% LTV preserving 30% bot safety buffer) or provide fresh external liquidity to earn institutional fee allocations.'}
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
          {/* Nguồn A: Ký Quỹ Vốn Thuật Toán đang Trade */}
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
                {lang === 'vi' ? 'KÝ QUỸ BẢO ĐẢM VỐN THUẬT TOÁN' : 'ESCROW ACTIVE BOT BALANCE'}
              </span>
            </div>
            <p className="text-[11px] text-gray-300 font-sans leading-normal mb-2">
              {lang === 'vi' 
                ? 'Nhận thanh khoản tức thời mà không cần nạp thêm! Ký quỹ bảo đảm tối đa 70% vốn thuật toán, 30% bộ đệm an toàn tiếp tục vận hành.'
                : 'Instant liquidity without new capital! Escrow up to 70% bot equity while preserving 30% margin buffer.'}
            </p>
            <div className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
              ⚡ Hạn mức thanh khoản: <strong>Max 70% Vốn Thuật Toán</strong> • Phí dịch vụ theo % ký quỹ
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
                ? 'Cung cấp thanh khoản mới độc lập từ ví ngoài vào bể P2P để nhận tỷ lệ phân bổ định chế. Độc lập và không ảnh hưởng đến số dư giao dịch thuật toán.'
                : 'Inject fresh external liquidity to earn institutional fee allocations. Zero impact on bot trading.'}
            </p>
            <div className="text-[10px] font-mono text-[#f5d77f] bg-[#d4af37]/10 p-2 rounded-xl border border-[#d4af37]/20">
              🛡️ Hạn mức: <strong>100% Vốn Cung Cấp</strong> • Tỷ lệ phân bổ dịch vụ 1.8% - 2.5%/tháng
            </div>
          </button>
        </div>
      </div>

      {/* 3. SIMULATION ENGINE BASED ON SELECTED CAPITAL SOURCE */}
      {capitalSource === 'BOT_EQUITY' ? (
        /* CASE A: KÝ QUỸ VỐN THUẬT TOÁN (MAX 70% LTV) */
        <div className="spartan-card rounded-3xl p-5 border border-[#221c10] bg-[#080b12] space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-[#221c10] pb-3">
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'vi' ? 'MÔ PHỎNG KÝ QUỸ VỐN THUẬT TOÁN (TỐI ĐA 70% TÀI SẢN)' : 'BOT MARGIN ESCROW SIMULATOR (MAX 70% LTV)'}</span>
              </h3>
              <span className="text-[10px] text-gray-400 font-mono block pt-0.5">
                {lang === 'vi' ? 'Vốn Thuật Toán hiện có: ' : 'Live Trading Capital: '}
                <strong className="text-white">${displayBotBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT</strong>
                {isDemoBalance && <span className="text-[#d4af37] text-[9px] ml-1">(Minh họa mẫu)</span>}
              </span>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-black">
              LTV: {pledgePercent}%
            </span>
          </div>

          {/* Quy Tắc Ký Quỹ 70% - 30% */}
          <div className="p-3.5 rounded-2xl bg-[#05070c] border border-[#221c10] space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-gray-400">{lang === 'vi' ? 'Tỷ Lệ Ký Quỹ Bảo Đảm Của Thành Viên:' : 'Bot Margin Escrow Ratio:'}</span>
              <span className="text-base font-black font-mono text-[#f5d77f]">{pledgePercent}% Vốn</span>
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
                ■ Ký quỹ: {pledgePercent}% (${currentLoanAmount.toLocaleString('en-US', { minimumFractionDigits: 0 })} USDT)
              </span>
              <span className="text-blue-400">
                ■ Đệm an toàn Thuật Toán: {botSafetyMarginPct}% (${remainingBotMargin.toLocaleString('en-US', { minimumFractionDigits: 0 })} USDT)
              </span>
            </div>
          </div>

          {/* Bảng Tính Phí Dịch Vụ Ký Quỹ Theo % */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-2xl bg-[#05070c] border border-[#221c10] space-y-1">
              <span className="text-[9px] text-gray-400 uppercase font-mono block">
                {lang === 'vi' ? 'Biểu Phí Theo Bậc Ký Quỹ:' : 'Risk-Adjusted Escrow Rate:'}
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
                {lang === 'vi' ? 'Thanh Khoản Giải Ngân (USDT):' : 'Disbursed Liquidity:'}
              </span>
              <span className="text-base font-black font-mono text-emerald-400 block">
                ${currentLoanAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
              </span>
              <span className="text-[8px] font-mono text-gray-400 block">
                (Hạn mức tối đa: ${maxAllowableBorrow.toLocaleString('en-US')} USDT)
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#05070c] border border-[#221c10] space-y-1">
              <span className="text-[9px] text-gray-400 uppercase font-mono block">
                {lang === 'vi' ? 'Ước Tính Phí Dịch Vụ/Tháng:' : 'Est. Monthly Escrow Fee:'}
              </span>
              <span className="text-base font-black font-mono text-[#f5d77f] block">
                ${monthlyInterestUsdt.toFixed(2)} USDT
              </span>
              <span className="text-[8px] font-mono text-gray-400 block">
                Tổng kỳ {selectedTermDays} ngày: ${totalInterestOverTerm.toFixed(2)} USDT
              </span>
            </div>
          </div>

          {/* Giải Thích Minh Bạch Về 3 Mức Phí Ký Quỹ */}
          <div className="p-3 rounded-2xl bg-[#05070c] border border-[#221c10] space-y-2">
            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#f5d77f]" />
              <span>{lang === 'vi' ? 'QUY CHUẨN BIỂU PHÍ DỊCH VỤ THEO TỶ LỆ KÝ QUỸ VỐN THUẬT TOÁN:' : 'TIERED MARGIN ESCROW SERVICE RATES:'}</span>
            </span>

            <div className="space-y-1.5 text-[10px] font-mono">
              <div className={`p-2 rounded-xl border flex items-center justify-between ${
                pledgePercent <= 40 ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold' : 'border-[#141924] text-gray-400'
              }`}>
                <span>• Bậc 1 (Ký quỹ $\le 40\%$ Vốn): Phí dịch vụ 1.5%/tháng</span>
                <span>🟢 Vốn an toàn 60%+ Margin</span>
              </div>

              <div className={`p-2 rounded-xl border flex items-center justify-between ${
                pledgePercent > 40 && pledgePercent <= 60 ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 font-bold' : 'border-[#141924] text-gray-400'
              }`}>
                <span>• Bậc 2 (Ký quỹ $41\% - 60\%$ Vốn): Phí dịch vụ 2.0%/tháng</span>
                <span>🟡 Tiêu chuẩn hệ sinh thái</span>
              </div>

              <div className={`p-2 rounded-xl border flex items-center justify-between ${
                pledgePercent > 60 ? 'bg-[#ff5500]/10 border-[#ff5500]/40 text-[#ff5500] font-bold' : 'border-[#141924] text-gray-400'
              }`}>
                <span>• Bậc 3 (Ký quỹ $61\% - 70\%$ Vốn - TRẦN MAX): Phí dịch vụ 2.6%/tháng</span>
                <span>🔴 Giữ lại 30% đệm bảo toàn danh mục</span>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 font-sans italic pt-1">
              * Hệ thống Spartan Vault khóa cứng giới hạn 70% để bảo đảm 30% tài sản còn lại luôn đủ sức thích ứng các biến động thị trường mà không bao giờ bị dừng chiến lược giao dịch.
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
                <span>{lang === 'vi' ? 'MÔ PHỎNG CUNG CẤP THANH KHOẢN P2P (TỐI ƯU HIỆU QUẢ)' : 'FRESH DEPOSIT P2P LIQUIDITY SIMULATOR'}</span>
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
              <span className="text-xs text-gray-400 font-bold block mb-1.5">{lang === 'vi' ? 'Kỳ hạn cung cấp thanh khoản:' : 'Liquidity Term:'}</span>
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
              Thành viên cần tiếp cận thanh khoản ngay lập tức trong 30 giây không cần chờ người khác khớp lệnh. Quỹ Quản Trị trực tiếp cấp thanh khoản, áp dụng phí dịch vụ ký quỹ 1.5% - 2.6%/tháng và bảo đảm an toàn bằng 70% vốn ký quỹ.
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] font-mono text-gray-300">
              <div className="p-2 rounded-xl bg-[#080b12] border border-[#221c10]">
                <span className="text-gray-500 block">Tốc độ giải ngân:</span>
                <strong className="text-emerald-400">⚡ 30 Giây</strong>
              </div>
              <div className="p-2 rounded-xl bg-[#080b12] border border-[#221c10]">
                <span className="text-gray-500 block">Phí dịch vụ:</span>
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
                <span>BỂ ĐIỀU PHỐI THANH KHOẢN NGANG HÀNG CỘNG ĐỒNG (COMMUNITY POOL)</span>
              </span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-black">
                KHỚP LỆNH TỰ ĐỘNG
              </span>
            </div>
            <p className="text-[11px] text-gray-300 font-sans leading-relaxed">
              Thành viên có nguồn thanh khoản sẵn sàng hỗ trợ thành viên cần ký quỹ tạm thời. Bên cấp thanh khoản nhận tỷ lệ phân bổ 1.8% - 2.2%/tháng, bên nhận trả 2.2% - 2.5%/tháng. Nền tảng điều phối với phí dịch vụ 0.5% - 0.7%/tháng.
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] font-mono text-gray-300">
              <div className="p-2 rounded-xl bg-[#080b12] border border-[#221c10]">
                <span className="text-gray-500 block">Bên cấp nhận:</span>
                <strong className="text-emerald-400">+1.8% - 2.2%/th</strong>
              </div>
              <div className="p-2 rounded-xl bg-[#080b12] border border-[#221c10]">
                <span className="text-gray-500 block">Bên nhận trả:</span>
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
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>{lang === 'vi' ? 'SỔ LỆNH ĐIỀU PHỐI THANH KHOẢN P2P (ORDERBOOK)' : 'LIVE LIQUIDITY ORDERBOOK'}</span>
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
            ? 'Khi Bot Trade AI và Tiện ích Ký Quỹ P2P chạy đồng thời, dòng vốn duy trì trạng thái luân chuyển định lượng liên tục: Vốn khởi tạo trade bot tối ưu hiệu suất, khi cần thanh khoản ký quỹ 70% sang P2P, bot dùng 30% margin còn lại tiếp tục vận hành bù đắp chi phí dịch vụ.'
            : 'When Bot Trading and P2P Escrow operate simultaneously, capital never exits the ecosystem: Bot generates quantitative yields, 70% is escrowed for liquidity, and 30% margin continues trading to offset service fees.'}
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
              50 thành viên khởi tạo bình quân $3,000 USDT vào Bot Trade Vàng XAU/USD, hiệu suất định lượng 8% - 12%/tháng và chiết khấu khối lượng giao dịch ($7/lot).
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-[#05070c] border border-[#221c10] space-y-1">
            <div className="flex items-center justify-between text-blue-400">
              <span className="font-bold flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px]">2</span>
                <span>GIẢI PHÓNG THANH KHOẢN</span>
              </span>
              <span className="text-blue-300 font-bold">+$36,750 USDT</span>
            </div>
            <p className="text-[10px] text-gray-400 font-sans">
              35% thành viên cần tiền mặt ký quỹ 70% vốn bot. Nhận thanh khoản tức thời mà không cần rút vốn, tránh phát sinh phí dịch vụ rút vốn.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-[#05070c] border border-[#221c10] space-y-1">
            <div className="flex items-center justify-between text-purple-400">
              <span className="font-bold flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px]">3</span>
                <span>TỰ ĐỘNG BÙ ĐẮP DỊCH VỤ</span>
              </span>
              <span className="text-purple-300 font-bold">30% Margin Safe</span>
            </div>
            <p className="text-[10px] text-gray-400 font-sans">
              Vốn 30% còn lại ($15,750 USDT) vẫn vận hành bình thường trên sàn. Hiệu suất định lượng sinh ra tự động khấu trừ chi phí dịch vụ hàng tháng.
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
                Mở thị trường điều phối thanh khoản ngang hàng: Thành viên cấp thanh khoản nhận 1.8% - 2.2%/tháng, nền tảng điều phối với phí dịch vụ 0.5% - 0.7%/tháng.
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
              { id: 'LENDER' as const, label: lang === 'vi' ? 'BÊN CẤP VỐN' : 'LIQUIDITY PROVIDER' },
              { id: 'BORROWER' as const, label: lang === 'vi' ? 'BÊN KÝ QUỸ' : 'ESCROW USER' },
              { id: 'BOTH' as const, label: lang === 'vi' ? 'CẢ HAI VAI TRÒ' : 'BOTH' }
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
