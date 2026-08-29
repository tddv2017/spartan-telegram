/**
 * Fee Engine for Telegram Quant Trading Bot
 * Deposit Fee: 9% percentage fee + $3.00 USD fixed fee
 * Withdrawal Fee: 9% percentage fee + $5.00 USD fixed fee
 */

export interface FeeBreakdown {
  grossAmount: number;
  percentageFee: number;
  fixedFee: number;
  totalFee: number;
  netAmount: number;
  feePercentageEffective: number;
}

export function calculateDepositFee(amount: number): FeeBreakdown {
  const validAmount = Math.max(0, amount || 0);
  const percentageFee = validAmount * 0.09;
  const fixedFee = validAmount > 0 ? 3.0 : 0.0;
  const totalFee = percentageFee + fixedFee;
  const netAmount = Math.max(0, validAmount - totalFee);
  const feePercentageEffective = validAmount > 0 ? (totalFee / validAmount) * 100 : 0;

  return {
    grossAmount: validAmount,
    percentageFee,
    fixedFee,
    totalFee,
    netAmount,
    feePercentageEffective,
  };
}

export function calculateWithdrawFee(amount: number): FeeBreakdown {
  const validAmount = Math.max(0, amount || 0);
  const percentageFee = validAmount * 0.09;
  const fixedFee = validAmount > 0 ? 5.0 : 0.0;
  const totalFee = percentageFee + fixedFee;
  const netAmount = Math.max(0, validAmount - totalFee);
  const feePercentageEffective = validAmount > 0 ? (totalFee / validAmount) * 100 : 0;

  return {
    grossAmount: validAmount,
    percentageFee,
    fixedFee,
    totalFee,
    netAmount,
    feePercentageEffective,
  };
}
