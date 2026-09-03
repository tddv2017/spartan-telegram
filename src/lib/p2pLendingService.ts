/**
 * Spartan Institutional P2P Lending & Credit Facility Service
 * Manages peer-to-peer credit orders, interest calculation, and VIP Waitlist enrollment.
 */

export interface P2pOfferItem {
  id: string;
  lenderUsername: string;
  lenderRank: string;
  amountUsdt: number;
  termDays: number;
  monthlyInterestPct: number;
  collateralType: string;
  guaranteeFundPct: number;
  status: 'ACTIVE_BID' | 'FUNDED' | 'COMING_SOON';
}

export interface P2pWaitlistRecord {
  userId: string;
  username: string;
  registeredAt: string;
  requestedRole: 'LENDER' | 'BORROWER' | 'BOTH';
  preferredCapitalUsdt?: number;
}

// Institutional Sample Offers for Visual Demonstration
export const SAMPLE_P2P_OFFERS: P2pOfferItem[] = [
  {
    id: 'P2P-XAU-001',
    lenderUsername: 'spartan_whale_sg',
    lenderRank: '👑 Tier 10 Supreme',
    amountUsdt: 25000,
    termDays: 90,
    monthlyInterestPct: 2.2,
    collateralType: 'Bot Trading Equity + 10% Cold Vault',
    guaranteeFundPct: 100,
    status: 'ACTIVE_BID'
  },
  {
    id: 'P2P-XAU-002',
    lenderUsername: 'geneva_quant_fund',
    lenderRank: '💎 Tier 9 Emperor',
    amountUsdt: 50000,
    termDays: 180,
    monthlyInterestPct: 1.8,
    collateralType: 'Exness ECN Master Vault',
    guaranteeFundPct: 100,
    status: 'ACTIVE_BID'
  },
  {
    id: 'P2P-XAU-003',
    lenderUsername: 'viet_gold_trader',
    lenderRank: '🥇 Tier 8 Commander',
    amountUsdt: 10000,
    termDays: 30,
    monthlyInterestPct: 2.5,
    collateralType: 'Bot Trading Equity',
    guaranteeFundPct: 100,
    status: 'ACTIVE_BID'
  }
];

/**
 * Enrolls a user into the Spartan P2P Lending Early Access VIP Waitlist.
 */
export async function enrollP2pWaitlist(
  userId: string,
  username: string,
  role: 'LENDER' | 'BORROWER' | 'BOTH' = 'BOTH'
): Promise<{ success: boolean; message: string }> {
  try {
    const cleanId = String(userId || '494232782').trim();
    const cleanUser = String(username || 'tddv2017').trim();

    const record: P2pWaitlistRecord = {
      userId: cleanId,
      username: cleanUser,
      registeredAt: new Date().toISOString(),
      requestedRole: role
    };

    const res = await fetch(
      `https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app/p2p_waitlist/${cleanId}.json`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      }
    );

    if (res.ok) {
      return {
        success: true,
        message: '🎉 Bạn đã được ghi danh thành công vào Danh Sách Chờ Ưu Tiên P2P Lending!'
      };
    }
    return { success: false, message: 'Không thể ghi danh vào hàng chờ lúc này. Vui lòng thử lại sau!' };
  } catch (err: any) {
    return { success: false, message: 'Lỗi kết nối máy chủ: ' + err.message };
  }
}

/**
 * Checks if user is already enrolled in the VIP Waitlist.
 */
export async function checkP2pWaitlistStatus(userId: string): Promise<boolean> {
  try {
    const cleanId = String(userId || '').trim();
    if (!cleanId) return false;
    const res = await fetch(
      `https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app/p2p_waitlist/${cleanId}.json`
    );
    const data = await res.json();
    return Boolean(data && data.userId);
  } catch {
    return false;
  }
}

export interface P2pCollateralLimitResult {
  tradingBalance: number;
  maxCollateralAllowed: number; // 70% max
  safetyMarginBuffer: number;   // 30% min
  requestedAmount: number;
  ltvPercent: number;
  isEligible: boolean;
  interestRateMonthly: number; // 1.5% (<=40%), 2.0% (41-60%), 2.6% (61-70%)
  interestRateAnnual: number;
  monthlyInterestUsdt: number;
  tierName: string;
  errorMessage?: string;
}

/**
 * Enforces the 70% Collateral Hard-Cap & 30% Safety Margin Buffer
 */
export function calculateP2pCollateralLimits(
  tradingBalance: number,
  requestedLoanAmount: number
): P2pCollateralLimitResult {
  const cleanBalance = Math.max(0, tradingBalance);
  const cleanRequested = Math.max(0, requestedLoanAmount);
  const maxCollateralAllowed = cleanBalance * 0.70;
  const safetyMarginBuffer = cleanBalance * 0.30;

  const ltvPercent = cleanBalance > 0 ? (cleanRequested / cleanBalance) * 100 : 0;
  const isEligible = cleanRequested > 0 && cleanRequested <= maxCollateralAllowed;

  let interestRateMonthly = 2.0;
  let tierName = 'Cân Bằng (Balanced)';
  if (ltvPercent <= 40) {
    interestRateMonthly = 1.5;
    tierName = 'Siêu An Toàn (Ultra-Safe)';
  } else if (ltvPercent <= 60) {
    interestRateMonthly = 2.0;
    tierName = 'Tiêu Chuẩn (Standard)';
  } else {
    interestRateMonthly = 2.6;
    tierName = 'Chạm Trần An Toàn (Hard-Cap 70%)';
  }

  const interestRateAnnual = interestRateMonthly * 12;
  const monthlyInterestUsdt = (cleanRequested * interestRateMonthly) / 100;

  return {
    tradingBalance: cleanBalance,
    maxCollateralAllowed,
    safetyMarginBuffer,
    requestedAmount: cleanRequested,
    ltvPercent,
    isEligible,
    interestRateMonthly,
    interestRateAnnual,
    monthlyInterestUsdt,
    tierName,
    errorMessage: !isEligible && cleanRequested > maxCollateralAllowed
      ? `⛔ VƯỢT TRẦN THẾ CHẤP 70%: Số tiền vay tối đa là $${maxCollateralAllowed.toFixed(2)} USDT (bắt buộc giữ lại $${safetyMarginBuffer.toFixed(2)} USDT đệm an toàn cho Bot)!`
      : undefined
  };
}

export interface P2pMarginLoanOrder {
  id: string;
  userId: string;
  username: string;
  loanAmount: number;
  collateralPledged: number;
  safetyBufferRemaining: number;
  monthlyInterestPct: number;
  monthlyInterestUsdt: number;
  termDays: number;
  status: 'PENDING_DISBURSEMENT' | 'ACTIVE' | 'SETTLED' | 'REJECTED';
  createdAt: string;
}

/**
 * Creates an institutional P2P Collateral Loan Order locking 70% max equity
 */
export async function requestP2pMarginLoan(
  userId: string,
  username: string,
  requestedAmount: number,
  termDays: number = 90
): Promise<{ success: boolean; message: string; loan?: P2pMarginLoanOrder }> {
  try {
    const cleanId = String(userId || '').trim();
    if (!cleanId) return { success: false, message: 'Định danh người dùng không hợp lệ!' };

    // Fetch live user balance
    const uRes = await fetch(`https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app/users/${cleanId}.json`);
    if (!uRes.ok) return { success: false, message: 'Không thể xác thực số dư tài khoản!' };
    const uData = await uRes.json();
    const balance = (uData && typeof uData.tradingBalance === 'number') ? uData.tradingBalance : 0;

    const limits = calculateP2pCollateralLimits(balance, requestedAmount);
    if (!limits.isEligible) {
      return { success: false, message: limits.errorMessage || 'Số tiền vay không hợp lệ!' };
    }

    const loanId = `P2P_LOAN_${cleanId}_${Date.now().toString().slice(-6)}`;
    const loanPayload: P2pMarginLoanOrder = {
      id: loanId,
      userId: cleanId,
      username: username || 'user_' + cleanId.slice(-4),
      loanAmount: requestedAmount,
      collateralPledged: requestedAmount,
      safetyBufferRemaining: limits.safetyMarginBuffer,
      monthlyInterestPct: limits.interestRateMonthly,
      monthlyInterestUsdt: limits.monthlyInterestUsdt,
      termDays,
      status: 'PENDING_DISBURSEMENT',
      createdAt: new Date().toISOString()
    };

    // Lock collateral in user profile
    await fetch(
      `https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app/users/${cleanId}.json`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lockedCollateral: (uData.lockedCollateral || 0) + requestedAmount,
          lastP2pLoanId: loanId
        })
      }
    );

    // Save loan in /p2p_loans
    const saveRes = await fetch(
      `https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app/p2p_loans/${loanId}.json`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loanPayload)
      }
    );

    if (saveRes.ok) {
      return {
        success: true,
        message: `🎉 Đã tạo hợp đồng vay ký quỹ #${loanId} ($${requestedAmount.toFixed(2)} USDT) thành công! Quỹ Spartan Treasury đang chuẩn bị giải ngân.`,
        loan: loanPayload
      };
    }
    return { success: false, message: 'Lỗi lưu trữ hợp đồng vay!' };
  } catch (err: any) {
    return { success: false, message: 'Lỗi hệ thống: ' + err.message };
  }
}
