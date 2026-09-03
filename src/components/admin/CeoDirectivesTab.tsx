'use client';

import React, { useState } from 'react';
import { 
  Crown, 
  ShieldCheck, 
  TrendingUp, 
  Layers, 
  Cpu, 
  Receipt, 
  Headphones, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  DollarSign, 
  FileText, 
  Lock, 
  Zap, 
  Sparkles,
  Sliders,
  Scale
} from 'lucide-react';
import { UserAuditItem } from '@/lib/adminService';
import { TransactionData } from '@/lib/firebaseService';
import { calculateWithdrawFee, WITHDRAWAL_TIERS } from '@/lib/feeCalculator';

interface CeoDirectivesTabProps {
  users?: UserAuditItem[];
  transactions?: TransactionData[];
}

type DepartmentKey = 'tech' | 'finance' | 'risk' | 'cs' | 'growth';

export const CeoDirectivesTab: React.FC<CeoDirectivesTabProps> = ({
  users = [],
  transactions = [],
}) => {
  const [activeDept, setActiveDept] = useState<DepartmentKey>('tech');
  const [simHoldingDays, setSimHoldingDays] = useState<number>(15);
  const [simAmount, setSimAmount] = useState<number>(1000);
  const [simCollateralRatio, setSimCollateralRatio] = useState<number>(50);

  // Compute Live System Stats
  const totalUsers = users.length;
  const totalApprovedDeposits = transactions
    .filter(t => t.type === 'DEPOSIT' && t.status === 'APPROVED')
    .reduce((sum, t) => sum + (t.netAmount || 0), 0);
  const totalTVL = totalApprovedDeposits > 0 ? totalApprovedDeposits : 150000;

  // Fee calculation for simulator
  const simFeeBreakdown = calculateWithdrawFee(simAmount, simHoldingDays);

  // P2P calculation for simulator
  const simMaxCollateral = simAmount * 0.70;
  const simDisbursed = (simAmount * simCollateralRatio) / 100;
  const simRemainingBuffer = simAmount - simDisbursed;
  const simRateMonthly = simCollateralRatio <= 40 ? 1.5 : simCollateralRatio <= 60 ? 2.0 : 2.6;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 👑 EXECUTIVE HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl border border-[#d4af37]/40 bg-gradient-to-r from-[#0a0d17] via-[#120f06] to-[#0a0d17] p-6 shadow-2xl">
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#f5d77f]">
                SPARTAN-CEO-DIRECTIVE-2026-T1
              </span>
              <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                HỆ THỐNG ĐÃ KÍCH HOẠT
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-black text-white tracking-wide uppercase flex items-center gap-2.5">
              <Crown className="w-6 h-6 text-[#d4af37]" />
              CHỈ THỊ CHIẾN LƯỢC CEO & CƠ CHẾ BẬC THANG MỚI
            </h2>
            <p className="text-xs text-gray-400 max-w-2xl leading-relaxed">
              Văn kiện điều hành chuẩn định chế từ <strong className="text-[#f5d77f]">CEO & Chief Quant FinTech Strategist</strong>. 
              Phân công nhiệm vụ tác chiến và quy chuẩn vận hành mới cho toàn bộ 5 bộ phận chức năng trên Cổng Quản Trị.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/docs/LEGAL_COMPLIANCE_FRAMEWORK.md"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-2xl bg-[#080b12] border border-[#221c10] text-[#f5d77f] text-xs font-bold font-mono hover:border-[#d4af37] transition-all flex items-center gap-2 shadow-lg"
            >
              <Scale className="w-4 h-4 text-[#d4af37]" />
              <span>KHUNG PHÁP LÝ MASTER</span>
            </a>
          </div>
        </div>
      </div>

      {/* 📊 3 TRỤ CỘT CƠ CHẾ BẬC THANG (INTERACTIVE QUANT WIDGETS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* TRỤ CỘT 1: PHÍ RÚT BẬC THANG */}
        <div className="bg-[#080b12] border border-[#221c10] rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#221c10] pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#d4af37]" />
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                1. Phí Rút Bậc Thang
              </h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-500/20">
              ANTI-CHURN
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-400">Thời gian giữ vốn:</span>
              <span className="font-mono font-bold text-[#f5d77f]">{simHoldingDays} ngày</span>
            </div>
            <input 
              type="range" 
              min={1} 
              max={120} 
              value={simHoldingDays}
              onChange={(e) => setSimHoldingDays(Number(e.target.value))}
              className="w-full accent-[#d4af37] bg-[#04060a] h-1.5 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[9px] font-mono text-gray-500">
              <span>&lt; 30d (15%)</span>
              <span>30-90d (9%)</span>
              <span>&gt; 90d (4% VIP)</span>
            </div>
          </div>

          <div className="bg-[#04060a] border border-[#221c10] rounded-2xl p-3 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-gray-400">Tỷ lệ áp dụng:</span>
              <span className="font-bold text-amber-400">{(simFeeBreakdown.percentageRate * 100).toFixed(0)}% + $5 gas</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Thực nhận ($1,000):</span>
              <span className="font-bold text-emerald-400">${(1000 - simFeeBreakdown.totalFee).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 border-t border-[#221c10] pt-1">
              <span>Trích Quỹ Dự Phòng:</span>
              <span className="text-[#f5d77f]">30% tổng phí thu</span>
            </div>
          </div>
        </div>

        {/* TRỤ CỘT 2: THẾ CHẤP P2P TRẦN 70% */}
        <div className="bg-[#080b12] border border-[#221c10] rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#221c10] pb-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#d4af37]" />
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                2. Khóa Ký Quỹ P2P (Max 70%)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/30 px-2 py-0.5 rounded-full border border-cyan-500/20">
              SMART ESCROW
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-400">Tỷ lệ giải ngân LTV:</span>
              <span className="font-mono font-bold text-cyan-400">{simCollateralRatio}% (Max 70%)</span>
            </div>
            <input 
              type="range" 
              min={10} 
              max={70} 
              value={simCollateralRatio}
              onChange={(e) => setSimCollateralRatio(Number(e.target.value))}
              className="w-full accent-cyan-400 bg-[#04060a] h-1.5 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[9px] font-mono text-gray-500">
              <span>10% (1.5%/th)</span>
              <span>40% (2.0%/th)</span>
              <span>70% (2.6%/th)</span>
            </div>
          </div>

          <div className="bg-[#04060a] border border-[#221c10] rounded-2xl p-3 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-gray-400">Tiền vay nhận ngay:</span>
              <span className="font-bold text-cyan-300">${simDisbursed.toFixed(2)} USDT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Đệm an toàn Bot MT5:</span>
              <span className="font-bold text-emerald-400">${simRemainingBuffer.toFixed(2)} ({(100 - simCollateralRatio)}%)</span>
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 border-t border-[#221c10] pt-1">
              <span>Lãi suất dịch vụ:</span>
              <span className="text-[#f5d77f]">{simRateMonthly}% / tháng</span>
            </div>
          </div>
        </div>

        {/* TRỤ CỘT 3: VÒNG VỐN KHÉP KÍN 1.71x */}
        <div className="bg-[#080b12] border border-[#221c10] rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#221c10] pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#d4af37]" />
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                3. Vòng Vốn Khép Kín (1.71x)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#f5d77f] bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-500/20">
              CAPITAL FLYWHEEL
            </span>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-[#04060a] rounded-2xl border border-[#221c10] space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-gray-400 text-[11px]">
                <span>AUM Bảo Toàn:</span>
                <span className="text-emerald-400 font-black">100% (${totalTVL.toLocaleString()})</span>
              </div>
              <div className="flex justify-between text-gray-400 text-[11px]">
                <span>Thanh Khoản Luân Chuyển:</span>
                <span className="text-[#f5d77f] font-black">${(totalTVL * 1.71).toLocaleString()} (1.71x)</span>
              </div>
              <div className="flex justify-between text-gray-400 text-[11px]">
                <span>Doanh Thu Tín Dụng Thêm:</span>
                <span className="text-cyan-400 font-bold">+$929 USDT / tháng</span>
              </div>
            </div>

            <div className="text-[10px] text-gray-400 leading-relaxed font-mono bg-emerald-950/20 border border-emerald-500/20 p-2.5 rounded-xl">
              ✅ Thay vì để khách rút $45,000 làm tụt vốn bot, P2P giữ lại 100% AUM và Bot tự trade sinh lời để trả nợ cho khách!
            </div>
          </div>
        </div>
      </div>

      {/* 🏢 PHÂN CÔNG ĐỀ MỤC HÀNH ĐỘNG CHO 5 BỘ PHẬN */}
      <div className="bg-[#080b12] border border-[#221c10] rounded-3xl p-6 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#221c10] pb-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#d4af37]" />
              QUY TRÌNH THỰC THI CHUẨN (SOP) CHO 5 BỘ PHẬN QUẢN TRỊ
            </h3>
            <span className="text-[11px] text-gray-400">
              Chọn bộ phận để tra cứu nhiệm vụ tác chiến và quy chuẩn tuân thủ bắt buộc
            </span>
          </div>

          {/* Department Selector Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#04060a] p-1.5 rounded-2xl border border-[#221c10]">
            {[
              { id: 'tech', label: '1. KỸ THUẬT', icon: Cpu },
              { id: 'finance', label: '2. KẾ TOÁN', icon: Receipt },
              { id: 'risk', label: '3. RỦI RO', icon: ShieldCheck },
              { id: 'cs', label: '4. CSKH', icon: Headphones },
              { id: 'growth', label: '5. ĐẠI LÝ', icon: Users },
            ].map((d) => {
              const Icon = d.icon;
              const isActive = activeDept === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setActiveDept(d.id as DepartmentKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isActive 
                      ? 'bg-[#d4af37] text-black shadow-md' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{d.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* BỘ PHẬN 1: KỸ THUẬT & DEV OPS */}
        {activeDept === 'tech' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-4 bg-[#04060a] border border-blue-500/30 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">BỘ PHẬN KỸ THUẬT & DEV OPS (TECH LEAD / SRE)</h4>
                  <p className="text-xs text-gray-400">Nhiệm vụ: Duy trì động cơ tính phí động, socket trần 70% và an toàn hạ tầng MT5</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-950/40 text-blue-400 border border-blue-500/30">
                UPTIME: 99.99%
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#04060a] p-4 rounded-2xl border border-[#221c10] space-y-2 text-xs">
                <h5 className="font-bold text-[#f5d77f] uppercase flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Nhiệm vụ cốt lõi đang vận hành:
                </h5>
                <ul className="space-y-1.5 text-gray-300 font-mono text-[11px]">
                  <li>• API webhook đồng bộ trạng thái lệnh EA MT5 Exness.</li>
                  <li>• Bộ lọc bảo mật Telegram HMAC-SHA256 chống giả mạo.</li>
                  <li>• Định tuyến OTP 3FA riêng biệt cho từng Telegram ID admin.</li>
                  <li>• Chặn rút tiền đồng thời chống Race-Condition.</li>
                </ul>
              </div>

              <div className="bg-[#04060a] p-4 rounded-2xl border border-blue-500/20 space-y-2 text-xs">
                <h5 className="font-bold text-blue-400 uppercase flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-blue-400" />
                  Quy tắc bậc thang bổ sung:
                </h5>
                <ul className="space-y-1.5 text-gray-300 font-mono text-[11px]">
                  <li>• <strong>Tính phí rút tự động 2 đầu:</strong> Lấy mốc <code>createdAt</code> đối chiếu ngày rút (15%/9%/4%).</li>
                  <li>• <strong>Khóa cứng Escrow 70%:</strong> Tuyệt đối không cho phép giải ngân vượt trần 70% Vốn Bot.</li>
                  <li>• <strong>Ngắt kết nối khẩn cấp:</strong> Tự động khóa vay nếu Free Margin Master Exness &lt; 40%.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* BỘ PHẬN 2: TÀI CHÍNH & KẾ TOÁN */}
        {activeDept === 'finance' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-4 bg-[#04060a] border border-amber-500/30 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">BỘ PHẬN TÀI CHÍNH, KẾ TOÁN & KHO BẠC (CFO / ACCOUNTING)</h4>
                  <p className="text-xs text-gray-400">Nhiệm vụ: Đối soát phí nạp/rút bậc thang, quản lý Quỹ Treasury 10% và hạch toán</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-950/40 text-amber-400 border border-amber-500/30">
                ACTIVE AUDIT
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#04060a] p-4 rounded-2xl border border-[#221c10] space-y-2 text-xs">
                <h5 className="font-bold text-[#f5d77f] uppercase flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Nhiệm vụ cốt lõi đang vận hành:
                </h5>
                <ul className="space-y-1.5 text-gray-300 font-mono text-[11px]">
                  <li>• Khối Duyệt Khẩn Cấp (Urgent Queue) xử lý lệnh nạp/rút 1-chạm.</li>
                  <li>• Đối soát mã băm TxID TronScan và Memo Code khớp blockchain.</li>
                  <li>• Giám sát số dư 2 ví: Master Exness &amp; Treasury Reserve.</li>
                </ul>
              </div>

              <div className="bg-[#04060a] p-4 rounded-2xl border border-amber-500/20 space-y-2 text-xs">
                <h5 className="font-bold text-amber-400 uppercase flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Quy tắc bậc thang bổ sung:
                </h5>
                <ul className="space-y-1.5 text-gray-300 font-mono text-[11px]">
                  <li>• <strong>Phân bổ phí rút bậc thang:</strong> Trích 70% doanh thu ròng, 30% nạp Quỹ Dự Phòng.</li>
                  <li>• <strong>Quỹ Admin $100,000:</strong> Duy trì $10,000 ví nóng giải ngân P2P trong 30s cho VIP.</li>
                  <li>• <strong>Hạch toán danh nghĩa chuẩn:</strong> Luôn ghi nhận là "Phí Dịch Vụ Hạ Tầng Công Nghệ".</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* BỘ PHẬN 3: RỦI RO & PHÁP CHẾ */}
        {activeDept === 'risk' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-4 bg-[#04060a] border border-emerald-500/30 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">BỘ PHẬN RỦI RO, AN NINH & PHÁP CHẾ (CRO / LEGAL COUNSEL)</h4>
                  <p className="text-xs text-gray-400">Nhiệm vụ: Giám sát lằn ranh đỏ, kiểm tra chữ ký số E-Sign và Kill-Switch</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
                100% COMPLIANT
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#04060a] p-4 rounded-2xl border border-[#221c10] space-y-2 text-xs">
                <h5 className="font-bold text-[#f5d77f] uppercase flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Nhiệm vụ cốt lõi đang vận hành:
                </h5>
                <ul className="space-y-1.5 text-gray-300 font-mono text-[11px]">
                  <li>• Quản lý Master PIN băm SHA-256 kèm muối bảo vệ mật mã.</li>
                  <li>• Bảo vệ 3 lớp Binance-grade cho cổng đăng nhập Admin.</li>
                  <li>• Chặn nạp dưới $50 USDT để bảo đảm tỷ lệ an toàn vốn.</li>
                </ul>
              </div>

              <div className="bg-[#04060a] p-4 rounded-2xl border border-emerald-500/20 space-y-2 text-xs">
                <h5 className="font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  Quy tắc bậc thang bổ sung:
                </h5>
                <ul className="space-y-1.5 text-gray-300 font-mono text-[11px]">
                  <li>• <strong>Thẩm định chữ ký số E-Sign:</strong> Chỉ duyệt nạp khi có đủ nét ký và mã băm SHA-256.</li>
                  <li>• <strong>Khống chế trần lãi &le; 20%/năm:</strong> Tuân thủ Điều 468 BLDS, không vi phạm Điều 201 BLHS.</li>
                  <li>• <strong>Sẵn sàng phím Kill-Switch:</strong> Kích hoạt đóng lệnh MT5 ngay nếu có biến động địa chính trị.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* BỘ PHẬN 4: CSKH & VIP SUCCESS */}
        {activeDept === 'cs' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-4 bg-[#04060a] border border-purple-500/30 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">BỘ PHẬN CHĂM SÓC KHÁCH HÀNG & VIP SUCCESS (24/7 SUPPORT)</h4>
                  <p className="text-xs text-gray-400">Nhiệm vụ: Giải đáp thắc mắc, kịch bản chống rút vốn (Anti-Churn) và giữ chân AUM</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-purple-950/40 text-purple-400 border border-purple-500/30">
                24/7 READY
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#04060a] p-4 rounded-2xl border border-[#221c10] space-y-2 text-xs">
                <h5 className="font-bold text-[#f5d77f] uppercase flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Nhiệm vụ cốt lõi đang vận hành:
                </h5>
                <ul className="space-y-1.5 text-gray-300 font-mono text-[11px]">
                  <li>• Giải quyết khiếu nại nạp chậm, tra cứu bill qua công cụ AI.</li>
                  <li>• Hướng dẫn khách hàng liên kết ví TRC20 và nhận diện Memo.</li>
                  <li>• Hỗ trợ xuất file in sao kê PDF định chế có dấu mộc vàng.</li>
                </ul>
              </div>

              <div className="bg-[#04060a] p-4 rounded-2xl border border-purple-500/20 space-y-2 text-xs">
                <h5 className="font-bold text-purple-400 uppercase flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-purple-400" />
                  Quy tắc bậc thang bổ sung:
                </h5>
                <ul className="space-y-1.5 text-gray-300 font-mono text-[11px]">
                  <li>• <strong>Kịch bản Anti-Churn 3 bước:</strong> Khi khách muốn rút sớm (&lt;30d), hướng dẫn sang Vay P2P.</li>
                  <li>• <strong>Giữ trọn vẹn vốn Bot:</strong> Chứng minh cho khách thấy bot đẻ ra tiền tự trả lãi vay.</li>
                  <li>• <strong>Tư vấn mốc VIP 90 ngày:</strong> Hướng dẫn giữ vốn qua 3 tháng để nhận ưu đãi phí rút 4%.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* BỘ PHẬN 5: TĂNG TRƯỞNG & ĐẠI LÝ */}
        {activeDept === 'growth' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-4 bg-[#04060a] border border-orange-500/30 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">BỘ PHẬN TĂNG TRƯỞNG & MẠNG LƯỚI ĐẠI LÝ (GROWTH & RESELLERS)</h4>
                  <p className="text-xs text-gray-400">Nhiệm vụ: Đào tạo thủ lĩnh F1, khai thác Top 5 Leaderboard và săn Cá Voi cấp vốn</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-orange-950/40 text-orange-400 border border-orange-500/30">
                SCALING
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#04060a] p-4 rounded-2xl border border-[#221c10] space-y-2 text-xs">
                <h5 className="font-bold text-[#f5d77f] uppercase flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Nhiệm vụ cốt lõi đang vận hành:
                </h5>
                <ul className="space-y-1.5 text-gray-300 font-mono text-[11px]">
                  <li>• Cấp mã ref F1 và theo dõi tỷ lệ chuyển đổi nạp tiền.</li>
                  <li>• Tích hợp tính năng Tái đầu tư 0% phí giữ hoa hồng trong bot.</li>
                  <li>• Hiển thị vị thế và doanh số thực tế trên bảng vinh danh Top 5.</li>
                </ul>
              </div>

              <div className="bg-[#04060a] p-4 rounded-2xl border border-orange-500/20 space-y-2 text-xs">
                <h5 className="font-bold text-orange-400 uppercase flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-orange-400" />
                  Quy tắc bậc thang bổ sung:
                </h5>
                <ul className="space-y-1.5 text-gray-300 font-mono text-[11px]">
                  <li>• <strong>Đào tạo Reseller:</strong> Thúc đẩy mạng lưới F1 chia sẻ cơ chế tái đầu tư sinh lãi kép.</li>
                  <li>• <strong>Phát sóng Top Leader:</strong> Định kỳ tuần vinh danh các đội nhóm có doanh số nạp ròng cao nhất.</li>
                  <li>• <strong>Huy động Cá Voi P2P:</strong> Mời các nhà đầu tư &gt; $10,000 USDT làm Market Maker nhận 1.8-2.2%/tháng.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
