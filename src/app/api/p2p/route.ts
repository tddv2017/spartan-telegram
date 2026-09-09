import type { P2pMarginEscrowOrder, P2pWaitlistRecord } from '@/lib/p2pLendingService';
import { calculateP2pCollateralLimits } from '@/lib/p2pLendingService';
import { authenticate, toErrorResponse, AuthError } from '@/lib/server/auth';
import { dbGet, dbSet, dbUpdate, withUserLock } from '@/lib/server/rtdb';
import type { UserData } from '@/lib/firebaseService';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const actor = authenticate(request);
    const userId = String(actor.telegramId);
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || '');

    if (action === 'enroll') {
      const record: P2pWaitlistRecord = {
        userId,
        username: actor.username || `user_${userId.slice(-4)}`,
        registeredAt: new Date().toISOString(),
        requestedRole: body?.role === 'LENDER' || body?.role === 'BORROWER' ? body.role : 'BOTH',
      };
      await dbSet(`p2p_waitlist/${userId}`, record);
      return Response.json({
        success: true,
        message: 'Bạn đã được ghi danh vào danh sách chờ P2P Lending.',
      });
    }

    if (action === 'loan') {
      const requestedAmount = Number(body?.requestedAmount);
      const termDays = Number(body?.termDays) || 90;
      if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
        throw new AuthError(400, 'INVALID_AMOUNT', 'Số tiền ký quỹ không hợp lệ.');
      }

      const loan = await withUserLock(userId, async () => {
        const user = (await dbGet<UserData | null>(`users/${userId}`)) || null;
        const balance = typeof user?.tradingBalance === 'number' ? user.tradingBalance : 0;
        const limits = calculateP2pCollateralLimits(balance, requestedAmount);
        if (!limits.isEligible) {
          throw new AuthError(400, 'LTV_CAP', limits.errorMessage || 'Vượt trần ký quỹ.');
        }

        const loanId = `P2P_ESCROW_${userId}_${Date.now().toString().slice(-6)}`;
        const payload: P2pMarginEscrowOrder = {
          id: loanId,
          userId,
          username: actor.username || user?.username || `user_${userId.slice(-4)}`,
          escrowAmount: requestedAmount,
          collateralPledged: requestedAmount,
          safetyBufferRemaining: limits.safetyMarginBuffer,
          autoStopOutLtvPercent: 85,
          monthlyFeePct: limits.interestRateMonthly,
          monthlyFeeUsdt: limits.monthlyInterestUsdt,
          termDays,
          status: 'PENDING_DISBURSEMENT',
          createdAt: new Date().toISOString(),
        };

        await dbUpdate(`users/${userId}`, {
          lockedCollateral: (Number(user?.lockedCollateral) || 0) + requestedAmount,
          lastP2pLoanId: loanId,
        });
        await dbSet(`p2p_loans/${loanId}`, payload);
        return payload;
      });

      return Response.json({
        success: true,
        loan,
        message: `Đã tạo thỏa thuận ký quỹ #${loan.id}.`,
      });
    }

    throw new AuthError(400, 'INVALID_ACTION', 'Hành động P2P không hợp lệ.');
  } catch (error) {
    return toErrorResponse(error);
  }
}
