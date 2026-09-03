export interface FeeBreakdown {
  grossAmount: number;
  percentageFee: number;
  percentageRate: number; // e.g. 0.15 (15%), 0.09 (9%), 0.04 (4%)
  tierName: string;
  fixedFee: number;
  totalFee: number;
  netAmount: number;
  effectiveRetainedFee?: number; // Treasury Reserve allocation
  treasuryReserveFee?: number;
  adminNetRevenue?: number;
}

export interface WithdrawalTierInfo {
  tierId: 'EARLY' | 'STANDARD' | 'LOYAL';
  labelVi: string;
  labelEn: string;
  daysRange: string;
  ratePct: number;
  badge: string;
  description: string;
}

export interface SystemFeeConfig {
  // 1. Phí cố định On-Chain Gas
  depositGasFee: number; // Default: 3.00 USD
  withdrawGasFee: number; // Default: 5.00 USD

  // 2. Phí nạp tiền
  depositRatePct: number; // Default: 9.0%

  // 3. Phí rút tiền 3 giai đoạn
  withdrawTier1RatePct: number; // Giai đoạn 1: < 30 ngày (Rút sớm) - Default: 15.0%
  withdrawTier1DaysMax: number; // 30
  withdrawTier2RatePct: number; // Giai đoạn 2: 30-90 ngày (Tiêu chuẩn) - Default: 9.0%
  withdrawTier2DaysMax: number; // 90
  withdrawTier3RatePct: number; // Giai đoạn 3: > 90 ngày (VIP Trung thành) - Default: 4.0%

  // Tỷ lệ phân bổ phí rút tiền
  treasuryReserveRatioPct: number; // Default: 30.0% vào Quỹ Dự Phòng Kho Bạc
  adminNetRevenueRatioPct: number; // Default: 70.0% vào Doanh thu ròng Admin

  // 4. Phí hiệu quả High-Water Mark (HWM Performance Fee)
  performanceFeeHwmPct: number; // Default: 20.0% trên lợi nhuận ròng vượt đỉnh HWM
  hwmCalculationPeriod: 'AT_WITHDRAWAL' | 'WEEKLY' | 'MONTHLY'; // Default: 'AT_WITHDRAWAL'
  hwmEnabled: boolean; // Default: true

  // Audit metadata
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_FEE_CONFIG: SystemFeeConfig = {
  depositGasFee: 3.00,
  withdrawGasFee: 5.00,
  depositRatePct: 9.0,
  withdrawTier1RatePct: 15.0,
  withdrawTier1DaysMax: 30,
  withdrawTier2RatePct: 9.0,
  withdrawTier2DaysMax: 90,
  withdrawTier3RatePct: 4.0,
  treasuryReserveRatioPct: 30.0,
  adminNetRevenueRatioPct: 70.0,
  performanceFeeHwmPct: 20.0,
  hwmCalculationPeriod: 'AT_WITHDRAWAL',
  hwmEnabled: true,
  updatedAt: new Date().toISOString(),
  updatedBy: 'SPARTAN_CHIEF_ACCOUNTANT'
};

const RTDB_BASE_URL = "https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app";

/**
 * Fetch dynamic System Fee Configuration from Firebase RTDB
 */
export async function fetchSystemFeeConfig(): Promise<SystemFeeConfig> {
  try {
    const res = await fetch(`${RTDB_BASE_URL}/system_config/fee_schedule.json`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        return { ...DEFAULT_FEE_CONFIG, ...data };
      }
    }
  } catch (err) {
    console.warn('Could not fetch fee_schedule from RTDB, falling back to default:', err);
  }
  return DEFAULT_FEE_CONFIG;
}

/**
 * Update System Fee Configuration in Firebase RTDB (For Chief Accountant / Admin)
 */
export async function updateSystemFeeConfig(
  newConfig: Partial<SystemFeeConfig>,
  adminUsername: string = 'tddv2017'
): Promise<{ success: boolean; message: string; config: SystemFeeConfig }> {
  try {
    const mergedConfig: SystemFeeConfig = {
      ...DEFAULT_FEE_CONFIG,
      ...newConfig,
      updatedAt: new Date().toISOString(),
      updatedBy: adminUsername
    };

    const res = await fetch(`${RTDB_BASE_URL}/system_config/fee_schedule.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mergedConfig)
    });

    if (res.ok) {
      return {
        success: true,
        message: '✓ Đã cập nhật thành công Biểu phí Kế toán & Cơ chế High-Water Mark!',
        config: mergedConfig
      };
    }
    return {
      success: false,
      message: 'Không thể lưu biểu phí vào cơ sở dữ liệu!',
      config: mergedConfig
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Lỗi lưu trữ biểu phí: ' + err.message,
      config: DEFAULT_FEE_CONFIG
    };
  }
}

export const WITHDRAWAL_TIERS: WithdrawalTierInfo[] = [
  {
    tierId: 'EARLY',
    labelVi: 'Giai đoạn 1: Rút Sớm (< 30 Ngày)',
    labelEn: 'Stage 1: Early Exit (< 30 Days)',
    daysRange: '< 30 ngày',
    ratePct: 15,
    badge: 'CHỐNG LƯỚT SÓNG',
    description: 'Bù đắp chi phí thiết lập ban đầu và phân bổ tài nguyên hệ thống.'
  },
  {
    tierId: 'STANDARD',
    labelVi: 'Giai đoạn 2: Tiêu Chuẩn (30 - 90 Ngày)',
    labelEn: 'Stage 2: Standard (30 - 90 Days)',
    daysRange: '30 - 90 ngày',
    ratePct: 9,
    badge: 'PHỔ THÔNG',
    description: 'Mức phí cân bằng thanh khoản, tương đương chi phí gia nhập.'
  },
  {
    tierId: 'LOYAL',
    labelVi: 'Giai đoạn 3: VIP Trung Thành (> 90 Ngày)',
    labelEn: 'Stage 3: VIP Loyal (> 90 Days)',
    daysRange: '> 90 ngày',
    ratePct: 4,
    badge: 'ƯU ĐÃI ĐỊNH CHẾ',
    description: 'Thưởng nhà đầu tư gắn bó lâu dài, tối đa hóa hiệu suất sinh lời.'
  }
];

/**
 * DEPOSIT FEE CALCULATOR (Mô Hình Phí Nạp)
 * Formula: Dynamic depositRatePct + depositGasFee
 */
export function calculateDepositFee(
  grossAmount: number,
  config: SystemFeeConfig = DEFAULT_FEE_CONFIG
): FeeBreakdown {
  const cleanGross = Math.max(0, grossAmount);
  const rate = (config.depositRatePct || 9.0) / 100;
  const fixedFee = config.depositGasFee ?? 3.00;
  const percentageFee = cleanGross * rate;
  const totalFee = percentageFee + fixedFee;
  const netAmount = Math.max(0, cleanGross - totalFee);

  return {
    grossAmount: cleanGross,
    percentageFee,
    percentageRate: rate,
    tierName: `Tiêu chuẩn (${(rate * 100).toFixed(0)}%)`,
    fixedFee,
    totalFee,
    netAmount
  };
}

/**
 * WITHDRAWAL FEE CALCULATOR - 3-STAGE TIERED MODEL (Mô Hình Phí Rút 3 Giai Đoạn)
 * - Giai đoạn 1 (< 30 ngày): withdrawTier1RatePct (default 15%) + withdrawGasFee
 * - Giai đoạn 2 (30 - 90 ngày): withdrawTier2RatePct (default 9%) + withdrawGasFee
 * - Giai đoạn 3 (> 90 ngày): withdrawTier3RatePct (default 4%) + withdrawGasFee
 * Phân bổ tự động: treasuryReserveRatioPct (30%) & adminNetRevenueRatioPct (70%)
 */
export function calculateWithdrawFee(
  grossAmount: number, 
  holdingDays: number = 45, // Default to Standard (30-90 days)
  config: SystemFeeConfig = DEFAULT_FEE_CONFIG
): FeeBreakdown {
  const cleanGross = Math.max(0, grossAmount);
  const fixedFee = config.withdrawGasFee ?? 5.00;

  const t1Rate = (config.withdrawTier1RatePct || 15.0) / 100;
  const t2Rate = (config.withdrawTier2RatePct || 9.0) / 100;
  const t3Rate = (config.withdrawTier3RatePct || 4.0) / 100;
  const t1Days = config.withdrawTier1DaysMax || 30;
  const t2Days = config.withdrawTier2DaysMax || 90;

  let rate = t2Rate;
  let tierName = `Giai đoạn 2: Tiêu chuẩn ${t1Days}-${t2Days} ngày (${(t2Rate * 100).toFixed(0)}%)`;

  if (holdingDays < t1Days) {
    rate = t1Rate;
    tierName = `Giai đoạn 1: Rút sớm < ${t1Days} ngày (${(t1Rate * 100).toFixed(0)}%)`;
  } else if (holdingDays > t2Days) {
    rate = t3Rate;
    tierName = `Giai đoạn 3: VIP Trung thành > ${t2Days} ngày (${(t3Rate * 100).toFixed(0)}%)`;
  }

  const percentageFee = cleanGross * rate;
  const totalFee = percentageFee + fixedFee;
  const netAmount = Math.max(0, cleanGross - totalFee);

  const reserveRatio = (config.treasuryReserveRatioPct || 30.0) / 100;
  const adminRatio = (config.adminNetRevenueRatioPct || 70.0) / 100;

  const treasuryReserveFee = totalFee * reserveRatio;
  const adminNetRevenue = totalFee * adminRatio;

  return {
    grossAmount: cleanGross,
    percentageFee,
    percentageRate: rate,
    tierName,
    fixedFee,
    totalFee,
    netAmount,
    effectiveRetainedFee: treasuryReserveFee,
    treasuryReserveFee,
    adminNetRevenue
  };
}

export interface HighWaterMarkResult {
  currentEquity: number;
  hwmPeak: number;
  eligibleProfitAboveHwm: number;
  performanceFeeRatePct: number;
  performanceFeeAmount: number;
  netProfitToInvestor: number;
  newHwmPeak: number;
  isDrawdown: boolean;
  statusVi: string;
}

/**
 * HIGH-WATER MARK (HWM) PERFORMANCE FEE CALCULATOR
 * Standard Institutional Hedge Fund Principle:
 * Sàn CHỈ thu phí hiệu quả trên phần lợi nhuận MỚI vượt đỉnh HWM cao nhất lịch sử.
 * Nếu tài khoản sụt giảm (Drawdown), phí hiệu quả = $0.00!
 */
export function calculatePerformanceFeeHWM(
  currentEquity: number,
  currentHwmPeak: number,
  config: SystemFeeConfig = DEFAULT_FEE_CONFIG
): HighWaterMarkResult {
  const cleanEquity = Math.max(0, currentEquity);
  const cleanPeak = Math.max(0, currentHwmPeak);

  const feeRatePct = config.performanceFeeHwmPct || 20.0;
  const isDrawdown = cleanEquity <= cleanPeak;

  if (isDrawdown || !config.hwmEnabled) {
    return {
      currentEquity: cleanEquity,
      hwmPeak: cleanPeak,
      eligibleProfitAboveHwm: 0,
      performanceFeeRatePct: feeRatePct,
      performanceFeeAmount: 0,
      netProfitToInvestor: 0,
      newHwmPeak: cleanPeak,
      isDrawdown: true,
      statusVi: cleanEquity < cleanPeak 
        ? '⚠️ ĐANG TRONG DRAWDOWN (DƯỚI ĐỈNH HWM) - KHÔNG THU PHÍ HIỆU QUẢ' 
        : '✓ ĐẠT ĐỈNH HWM CŨ - KHÔNG PHÁT SINH PHÍ VƯỢT TRẦN'
    };
  }

  const eligibleProfitAboveHwm = cleanEquity - cleanPeak;
  const performanceFeeAmount = (eligibleProfitAboveHwm * feeRatePct) / 100;
  const netProfitToInvestor = eligibleProfitAboveHwm - performanceFeeAmount;
  const newHwmPeak = cleanEquity;

  return {
    currentEquity: cleanEquity,
    hwmPeak: cleanPeak,
    eligibleProfitAboveHwm,
    performanceFeeRatePct: feeRatePct,
    performanceFeeAmount,
    netProfitToInvestor,
    newHwmPeak,
    isDrawdown: false,
    statusVi: `🎯 VƯỢT ĐỈNH HWM +$${eligibleProfitAboveHwm.toFixed(2)} USDT! Thu phí hiệu quả ${feeRatePct}%`
  };
}
