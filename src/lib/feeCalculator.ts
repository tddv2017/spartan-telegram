export interface FeeBreakdown {
  grossAmount: number;
  percentageFee: number;
  fixedFee: number;
  totalFee: number;
  netAmount: number;
  effectiveRetainedFee?: number; // 10% effective retained fee allocation
}

/**
 * DEPOSIT FEE CALCULATOR (Mô Hình Phí Nạp)
 * Formula: 9% percentage fee + $3.00 USD fixed fee
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
    fixedFee,
    totalFee,
    netAmount
  };
}

/**
 * WITHDRAWAL FEE CALCULATOR (Mô Hình Phí Rút Chiến Lược Mới)
 * Formula: 19% percentage fee + $5.00 USD fixed fee
 * Effective Retained Fee: 10% allocated for Treasury / Operational Reserve
 */
export function calculateWithdrawFee(grossAmount: number): FeeBreakdown {
  const cleanGross = Math.max(0, grossAmount);
  const percentageFee = cleanGross * 0.19; // 19% strategic withdrawal fee
  const fixedFee = 5.00;                   // $5.00 USD fixed fee
  const totalFee = percentageFee + fixedFee;
  const netAmount = Math.max(0, cleanGross - totalFee);
  const effectiveRetainedFee = cleanGross * 0.10; // 10% effective retained fee

  return {
    grossAmount: cleanGross,
    percentageFee,
    fixedFee,
    totalFee,
    netAmount,
    effectiveRetainedFee
  };
}
