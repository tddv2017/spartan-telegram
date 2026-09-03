export interface FeeBreakdown {
  grossAmount: number;
  percentageFee: number;
  percentageRate: number; // e.g. 0.15 (15%), 0.09 (9%), 0.04 (4%)
  tierName: string;
  fixedFee: number;
  totalFee: number;
  netAmount: number;
  effectiveRetainedFee?: number; // Operational Reserve allocation
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

export const WITHDRAWAL_TIERS: WithdrawalTierInfo[] = [
  {
    tierId: 'EARLY',
    labelVi: 'Rút Sớm (< 30 Ngày)',
    labelEn: 'Early Exit (< 30 Days)',
    daysRange: '< 30 ngày',
    ratePct: 15,
    badge: 'CHỐNG LƯỚT SÓNG',
    description: 'Bù đắp chi phí thiết lập ban đầu và phân bổ tài nguyên hệ thống.'
  },
  {
    tierId: 'STANDARD',
    labelVi: 'Tiêu Chuẩn (30 - 90 Ngày)',
    labelEn: 'Standard (30 - 90 Days)',
    daysRange: '30 - 90 ngày',
    ratePct: 9,
    badge: 'PHỔ THÔNG',
    description: 'Mức phí cân bằng thanh khoản, tương đương chi phí gia nhập.'
  },
  {
    tierId: 'LOYAL',
    labelVi: 'Trung Thành (> 90 Ngày)',
    labelEn: 'VIP Loyal (> 90 Days)',
    daysRange: '> 90 ngày',
    ratePct: 4,
    badge: 'ƯU ĐÃI ĐỊNH CHẾ',
    description: 'Thưởng nhà đầu tư gắn bó lâu dài, tối đa hóa hiệu suất sinh lời.'
  }
];

/**
 * DEPOSIT FEE CALCULATOR (Mô Hình Phí Nạp)
 * Formula: 9% percentage fee + $3.00 USD fixed network fee
 */
export function calculateDepositFee(grossAmount: number): FeeBreakdown {
  const cleanGross = Math.max(0, grossAmount);
  const percentageFee = cleanGross * 0.09;
  const fixedFee = 3.00;
  const totalFee = percentageFee + fixedFee;
  const netAmount = Math.max(0, cleanGross - totalFee);

  return {
    grossAmount: cleanGross,
    percentageFee,
    percentageRate: 0.09,
    tierName: 'Tiêu chuẩn (9%)',
    fixedFee,
    totalFee,
    netAmount
  };
}

/**
 * WITHDRAWAL FEE CALCULATOR - TIERED HOLDING PERIOD MODEL (Mô Hình Phí Rút Bậc Thang)
 * - Giai đoạn 1 (< 30 ngày): 15% + $5.00
 * - Giai đoạn 2 (30 - 90 ngày): 9% + $5.00
 * - Giai đoạn 3 (> 90 ngày): 4% + $5.00 (Ưu đãi VIP)
 */
export function calculateWithdrawFee(
  grossAmount: number, 
  holdingDays: number = 45 // Default to Standard (30-90 days)
): FeeBreakdown {
  const cleanGross = Math.max(0, grossAmount);
  const fixedFee = 5.00;

  let rate = 0.09;
  let tierName = 'Tiêu chuẩn 30-90 ngày (9%)';

  if (holdingDays < 30) {
    rate = 0.15; // 15% early exit fee
    tierName = 'Rút sớm < 30 ngày (15%)';
  } else if (holdingDays > 90) {
    rate = 0.04; // 4% loyal VIP institutional rate
    tierName = 'Trung thành > 90 ngày (4%)';
  }

  const percentageFee = cleanGross * rate;
  const totalFee = percentageFee + fixedFee;
  const netAmount = Math.max(0, cleanGross - totalFee);
  const effectiveRetainedFee = cleanGross * (rate * 0.5); // 50% of fee goes to Treasury reserve

  return {
    grossAmount: cleanGross,
    percentageFee,
    percentageRate: rate,
    tierName,
    fixedFee,
    totalFee,
    netAmount,
    effectiveRetainedFee
  };
}
