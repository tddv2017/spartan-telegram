import type { RiskAgreementRecord, TransactionData, UserData } from '@/lib/firebaseService';
import { calculateDepositFee, calculateWithdrawFee, DEFAULT_FEE_CONFIG, type SystemFeeConfig } from '@/lib/feeCalculator';
import { generateMemoCode, generateOrderId, generateOrderReference } from '@/lib/orderReference';
import type { AuthenticatedActor } from './auth';
import { AuthError } from './auth';
import { getBotToken, getMasterWalletAddress } from './env';
import { dbGet, dbSet, dbUpdate, withUserLock } from './rtdb';
import { isValidTronAddress } from './tronAddress';

const MIN_DEPOSIT = 50;
const MIN_WITHDRAW_NET = 1;

async function loadFeeConfig(): Promise<SystemFeeConfig> {
  try {
    const stored = await dbGet<Partial<SystemFeeConfig> | null>('system_config/fee_schedule');
    if (stored && typeof stored === 'object') {
      return { ...DEFAULT_FEE_CONFIG, ...stored };
    }
  } catch {
    // Fall through to defaults rather than blocking a customer request.
  }
  return DEFAULT_FEE_CONFIG;
}

async function notifyUser(payload: {
  telegramId: string;
  type: 'DEPOSIT' | 'WITHDRAW';
  status: 'APPROVED' | 'REJECTED';
  grossAmount: number;
  feeAmount?: number;
  netAmount?: number;
  newBalance?: number;
  reason?: string;
  txId: string;
}): Promise<void> {
  try {
    const { telegramId, type, status, grossAmount, feeAmount, netAmount, newBalance, reason, txId } =
      payload;
    let text = '';
    if (status === 'APPROVED' && type === 'DEPOSIT') {
      text =
        `🎉 *[SPARTAN NẠP TIỀN THÀNH CÔNG]*\n\nĐơn *#${txId}* đã được duyệt.\n` +
        `💵 Gốc: $${Number(grossAmount).toFixed(2)}\n` +
        `📉 Phí: -$${Number(feeAmount || 0).toFixed(2)}\n` +
        `🟢 Thực nhận: +$${Number(netAmount || 0).toFixed(2)} USDT`;
    } else if (status === 'APPROVED') {
      text =
        `💸 *[SPARTAN RÚT TIỀN ĐÃ DUYỆT]*\n\nĐơn *#${txId}* đã được duyệt giải ngân.\n` +
        `💵 Yêu cầu: $${Number(grossAmount).toFixed(2)}\n` +
        `🟢 Thực nhận: +$${Number(netAmount || 0).toFixed(2)} USDT`;
    } else if (type === 'WITHDRAW') {
      text =
        `⚠️ *[SPARTAN TỪ CHỐI LỆNH RÚT]*\n\nLệnh *#${txId}* ($${Number(grossAmount).toFixed(2)}) bị từ chối.\n` +
        `📌 Lý do: ${reason || 'Không đủ điều kiện'}\n` +
        `💰 Đã hoàn 100% về số dư khả dụng.`;
    } else {
      text =
        `⚠️ *[SPARTAN TỪ CHỐI ĐƠN NẠP]*\n\nĐơn *#${txId}* ($${Number(grossAmount).toFixed(2)}) bị từ chối.\n` +
        `📌 Lý do: ${reason || 'Không khớp on-chain'}`;
    }
    if (typeof newBalance === 'number') {
      text += `\n📊 Số dư: $${newBalance.toFixed(2)} USDT`;
    }
    await fetch(`https://api.telegram.org/bot${getBotToken()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: telegramId, text, parse_mode: 'Markdown' }),
    });
  } catch (error) {
    console.warn('[ledger] Telegram notice failed:', error);
  }
}

async function persistTransaction(tx: TransactionData): Promise<void> {
  await Promise.all([
    dbSet(`transactions/${tx.id}`, tx),
    dbSet(`users/${tx.userId}/transactions/${tx.id}`, tx),
  ]);
}

export async function createUserTransaction(
  actor: AuthenticatedActor,
  input: {
    type: 'DEPOSIT' | 'WITHDRAW';
    grossAmount: number;
    recipientAddress?: string;
    riskAgreement?: RiskAgreementRecord;
  }
): Promise<TransactionData> {
  const userId = String(actor.telegramId);
  const type = input.type;
  const grossAmount = Number(input.grossAmount);

  if (type !== 'DEPOSIT' && type !== 'WITHDRAW') {
    throw new AuthError(400, 'INVALID_TYPE', 'Loại giao dịch không hợp lệ.');
  }
  if (!Number.isFinite(grossAmount) || grossAmount <= 0) {
    throw new AuthError(400, 'INVALID_AMOUNT', 'Số tiền không hợp lệ.');
  }

  const config = await dbGet<{ maintenanceMode?: boolean } | null>('system_config').catch(() => null);
  if (config?.maintenanceMode === true) {
    throw new AuthError(503, 'MAINTENANCE', 'Hệ thống đang bảo trì. Giao dịch tạm thời bị tạm dừng.');
  }

  return withUserLock(userId, async () => {
    const user = (await dbGet<UserData | null>(`users/${userId}`)) || null;
    if (user?.isFrozen) {
      throw new AuthError(403, 'ACCOUNT_FROZEN', 'Tài khoản đang bị khóa, không thể tạo giao dịch.');
    }

    const feeConfig = await loadFeeConfig();
    const nowTs = Date.now();
    let holdingDays = 0;

    if (type === 'DEPOSIT' && grossAmount < MIN_DEPOSIT) {
      throw new AuthError(
        400,
        'MIN_DEPOSIT',
        `Số tiền nạp tối thiểu là $${MIN_DEPOSIT.toFixed(2)} USDT.`
      );
    }

    if (type === 'WITHDRAW') {
      const recipient = String(input.recipientAddress || '').trim();
      if (!isValidTronAddress(recipient)) {
        throw new AuthError(
          400,
          'INVALID_ADDRESS',
          'Địa chỉ ví USDT TRC20 không hợp lệ (phải bắt đầu bằng T, 34 ký tự).'
        );
      }

      const txs = (await dbGet<Record<string, TransactionData> | null>(`users/${userId}/transactions`)) || {};
      const pending = Object.values(txs).filter((item) => item?.type === 'WITHDRAW' && item.status === 'PENDING');
      if (pending.length > 0) {
        throw new AuthError(
          409,
          'CONCURRENT_WITHDRAWAL_LOCK',
          'Bạn đang có lệnh rút chờ duyệt. Vui lòng đợi hoàn tất trước khi tạo lệnh mới.'
        );
      }

      const currentBal = Number(user?.tradingBalance) || 0;
      if (grossAmount > currentBal) {
        throw new AuthError(
          400,
          'INSUFFICIENT_AVAILABLE_FUNDS',
          `Số dư khả dụng không đủ ($${currentBal.toFixed(2)} USDT).`
        );
      }

      const joinedTs = user?.capitalJoinedAt
        ? new Date(user.capitalJoinedAt).getTime()
        : user?.createdAt
          ? new Date(user.createdAt).getTime()
          : nowTs;
      holdingDays = Math.max(0, Math.floor((nowTs - joinedTs) / (1000 * 60 * 60 * 24)));
    }

    const feeCalc =
      type === 'DEPOSIT'
        ? calculateDepositFee(grossAmount, feeConfig)
        : calculateWithdrawFee(grossAmount, holdingDays, feeConfig);

    if (type === 'WITHDRAW' && feeCalc.netAmount < MIN_WITHDRAW_NET) {
      throw new AuthError(
        400,
        'FEE_EXCEEDS_AMOUNT',
        `Số tiền rút sau phí phải lớn hơn $${MIN_WITHDRAW_NET.toFixed(2)} USDT.`
      );
    }

    const txId = generateOrderId(type, userId);
    const tx: TransactionData = {
      id: txId,
      userId,
      username: actor.username || user?.username || `user_${userId.slice(-4)}`,
      type,
      grossAmount,
      feeAmount: feeCalc.totalFee,
      netAmount: feeCalc.netAmount,
      holdingDays: type === 'WITHDRAW' ? holdingDays : undefined,
      feeTier: feeCalc.tierName,
      percentageRate: feeCalc.percentageRate,
      fixedFee: feeCalc.fixedFee,
      treasuryReserveFee: type === 'WITHDRAW' ? feeCalc.treasuryReserveFee : undefined,
      adminNetRevenue: type === 'WITHDRAW' ? feeCalc.adminNetRevenue : undefined,
      status: 'PENDING',
      memoCode: generateMemoCode(),
      masterWalletAddress: getMasterWalletAddress(),
      sha256Signature: generateOrderReference(),
      recipientAddress: type === 'WITHDRAW' ? String(input.recipientAddress).trim() : undefined,
      ...(input.riskAgreement ? { riskAgreement: input.riskAgreement } : {}),
      createdAt: new Date(nowTs).toISOString(),
    };

    if (type === 'WITHDRAW') {
      const currentBal = Number(user?.tradingBalance) || 0;
      await dbUpdate(`users/${userId}`, {
        tradingBalance: Number(Math.max(0, currentBal - grossAmount).toFixed(2)),
        updatedAt: tx.createdAt,
      });
    }

    await persistTransaction(tx);
    return tx;
  });
}

export async function approveUserTransaction(
  admin: AuthenticatedActor,
  txId: string,
  actualOnChainAmount?: number
): Promise<{ success: true; message: string }> {
  const resolvedTxId = String(txId || '').trim();
  if (!resolvedTxId) {
    throw new AuthError(400, 'INVALID_TX', 'Thiếu mã giao dịch.');
  }

  const tx = await dbGet<TransactionData | null>(`transactions/${resolvedTxId}`);
  if (!tx) {
    throw new AuthError(404, 'TX_NOT_FOUND', 'Không tìm thấy giao dịch để duyệt.');
  }
  if (tx.status === 'APPROVED') {
    throw new AuthError(409, 'ALREADY_APPROVED', 'Lệnh này đã được phê duyệt trước đó.');
  }
  if (tx.status !== 'PENDING') {
    throw new AuthError(409, 'NOT_PENDING', `Lệnh đang ở trạng thái ${tx.status}, không thể duyệt.`);
  }

  const userId = String(tx.userId);
  const feeConfig = await loadFeeConfig();
  let grossAmount = Number(tx.grossAmount) || 0;
  let feeAmount = Number(tx.feeAmount) || 0;
  let netAmount = Number(tx.netAmount) || 0;

  if (tx.type === 'DEPOSIT' && typeof actualOnChainAmount === 'number' && actualOnChainAmount > 0) {
    const feeCalc = calculateDepositFee(actualOnChainAmount, feeConfig);
    grossAmount = actualOnChainAmount;
    feeAmount = feeCalc.totalFee;
    netAmount = feeCalc.netAmount;
  }

  const approvedAt = new Date().toISOString();
  let finalBalance = 0;

  await withUserLock(userId, async () => {
    const user = await dbGet<UserData | null>(`users/${userId}`);
    const currentBal = Number(user?.tradingBalance) || 0;

    if (tx.type === 'DEPOSIT') {
      finalBalance = Number((currentBal + netAmount).toFixed(2));
      await dbUpdate(`users/${userId}`, {
        tradingBalance: Math.max(0, finalBalance),
        capitalJoinedAt: user?.capitalJoinedAt || approvedAt,
        updatedAt: approvedAt,
      });
    } else {
      // Withdrawal funds were reserved (deducted) at creation. Approval must not
      // re-test available balance or the reservation would be confiscated.
      finalBalance = currentBal;
    }

    const updatePayload: Partial<TransactionData> & { updatedAt: string } = {
      ...tx,
      grossAmount,
      feeAmount,
      netAmount,
      actualOnChainAmount: actualOnChainAmount || grossAmount,
      adjustedOnChain: typeof actualOnChainAmount === 'number' && actualOnChainAmount !== tx.grossAmount,
      status: 'APPROVED',
      approvedBy: admin.username || String(admin.telegramId),
      approvedAt,
      rejectionReason: undefined,
      updatedAt: approvedAt,
    };

    await persistTransaction(updatePayload as TransactionData);

    if (tx.type === 'WITHDRAW' && feeAmount > 0) {
      const reserveAmount = Number(tx.treasuryReserveFee) || feeAmount * 0.3;
      const vault = await dbGet<{ allocatedReserveBalance?: number } | null>('treasury_vault').catch(
        () => null
      );
      await dbUpdate('treasury_vault', {
        allocatedReserveBalance: Number(vault?.allocatedReserveBalance || 0) + reserveAmount,
        lastAllocatedAt: approvedAt,
      });
    }
  });

  await notifyUser({
    telegramId: userId,
    type: tx.type,
    status: 'APPROVED',
    grossAmount,
    feeAmount,
    netAmount,
    newBalance: finalBalance,
    txId: resolvedTxId,
  });

  return { success: true, message: `Phê duyệt giao dịch ${resolvedTxId} thành công.` };
}

export async function rejectUserTransaction(
  admin: AuthenticatedActor,
  txId: string,
  reason: string
): Promise<{ success: true; message: string }> {
  const resolvedTxId = String(txId || '').trim();
  if (!resolvedTxId) {
    throw new AuthError(400, 'INVALID_TX', 'Thiếu mã giao dịch.');
  }

  const tx = await dbGet<TransactionData | null>(`transactions/${resolvedTxId}`);
  if (!tx) {
    throw new AuthError(404, 'TX_NOT_FOUND', 'Không tìm thấy giao dịch để từ chối.');
  }
  if (tx.status === 'APPROVED') {
    throw new AuthError(409, 'ALREADY_APPROVED', 'Lệnh đã duyệt, không thể từ chối.');
  }
  if (tx.status === 'REJECTED') {
    throw new AuthError(409, 'ALREADY_REJECTED', 'Lệnh này đã bị từ chối trước đó.');
  }

  const userId = String(tx.userId);
  let refundedBalance = 0;
  const rejectedAt = new Date().toISOString();

  await withUserLock(userId, async () => {
    const user = await dbGet<UserData | null>(`users/${userId}`);
    if (tx.type === 'WITHDRAW' && user) {
      const isRef =
        resolvedTxId.includes('REF') ||
        String(tx.id || '').includes('REF') ||
        String(tx.memoCode || '').includes('REF');
      if (isRef) {
        refundedBalance = Number(user.referralBalance || 0) + Number(tx.grossAmount);
        await dbUpdate(`users/${userId}`, { referralBalance: refundedBalance, updatedAt: rejectedAt });
      } else {
        refundedBalance = Number(user.tradingBalance || 0) + Number(tx.grossAmount);
        await dbUpdate(`users/${userId}`, { tradingBalance: refundedBalance, updatedAt: rejectedAt });
      }
    }

    const rejectPayload = {
      ...tx,
      status: 'REJECTED' as const,
      approvedBy: admin.username || String(admin.telegramId),
      rejectionReason: reason || 'Từ chối bởi Admin',
      refunded: tx.type === 'WITHDRAW',
      rejectedAt,
      updatedAt: rejectedAt,
    };
    await persistTransaction(rejectPayload as TransactionData);
  });

  await notifyUser({
    telegramId: userId,
    type: tx.type,
    status: 'REJECTED',
    grossAmount: Number(tx.grossAmount) || 0,
    newBalance: refundedBalance,
    reason,
    txId: resolvedTxId,
  });

  return {
    success: true,
    message:
      tx.type === 'WITHDRAW'
        ? `Đã từ chối lệnh rút ${resolvedTxId} và hoàn $${Number(tx.grossAmount).toFixed(2)} USDT.`
        : `Đã từ chối lệnh nạp ${resolvedTxId}.`,
  };
}

export async function reinvestReferral(
  actor: AuthenticatedActor,
  amount: number
): Promise<{ success: true; message: string; newTradingBal: number; newRefBal: number }> {
  const userId = String(actor.telegramId);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AuthError(400, 'INVALID_AMOUNT', 'Số tiền tái đầu tư không hợp lệ.');
  }

  return withUserLock(userId, async () => {
    const user = await dbGet<UserData | null>(`users/${userId}`);
    if (!user) throw new AuthError(404, 'USER_NOT_FOUND', 'Không tìm thấy tài khoản.');
    const currentRefBal = Number(user.referralBalance) || 0;
    const currentTradingBal = Number(user.tradingBalance) || 0;
    if (amount > currentRefBal) {
      throw new AuthError(400, 'INSUFFICIENT_REFERRAL', `Chiết khấu còn $${currentRefBal.toFixed(2)} USDT.`);
    }

    const newRefBal = Number((currentRefBal - amount).toFixed(2));
    const newTradingBal = Number((currentTradingBal + amount).toFixed(2));
    await dbUpdate(`users/${userId}`, {
      referralBalance: newRefBal,
      tradingBalance: newTradingBal,
      updatedAt: new Date().toISOString(),
    });
    return {
      success: true as const,
      message: `Đã chuyển $${amount.toFixed(2)} USDT từ chiết khấu vào vốn giao dịch (0% phí).`,
      newTradingBal,
      newRefBal,
    };
  });
}

export async function withdrawReferral(
  actor: AuthenticatedActor,
  amount: number,
  recipientAddress: string
): Promise<{ success: true; message: string; newRefBal: number; tx: TransactionData }> {
  const userId = String(actor.telegramId);
  const address = recipientAddress.trim();
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AuthError(400, 'INVALID_AMOUNT', 'Số tiền rút chiết khấu không hợp lệ.');
  }
  if (!isValidTronAddress(address)) {
    throw new AuthError(400, 'INVALID_ADDRESS', 'Địa chỉ ví USDT TRC20 không hợp lệ.');
  }

  return withUserLock(userId, async () => {
    const user = await dbGet<UserData | null>(`users/${userId}`);
    if (!user) throw new AuthError(404, 'USER_NOT_FOUND', 'Không tìm thấy tài khoản.');
    const currentRefBal = Number(user.referralBalance) || 0;
    const feeAmount = 5;
    if (amount > currentRefBal) {
      throw new AuthError(400, 'INSUFFICIENT_REFERRAL', `Chiết khấu còn $${currentRefBal.toFixed(2)} USDT.`);
    }
    if (amount <= feeAmount) {
      throw new AuthError(400, 'MIN_WITHDRAW', `Số rút tối thiểu là $${(feeAmount + 1).toFixed(2)} USDT.`);
    }

    const newRefBal = Number((currentRefBal - amount).toFixed(2));
    const txId = generateOrderId('WITHDRAW', `REF${userId}`);
    const tx: TransactionData = {
      id: txId,
      userId,
      username: actor.username || user.username || 'user',
      type: 'WITHDRAW',
      grossAmount: amount,
      feeAmount,
      netAmount: amount - feeAmount,
      status: 'PENDING',
      memoCode: `REF_WITHDRAW_${userId.slice(-4)}`,
      recipientAddress: address,
      createdAt: new Date().toISOString(),
    };

    await dbUpdate(`users/${userId}`, { referralBalance: newRefBal, updatedAt: tx.createdAt });
    await persistTransaction(tx);
    return {
      success: true as const,
      message: `Đã tạo lệnh rút chiết khấu $${amount.toFixed(2)} USDT. Thực nhận $${(amount - feeAmount).toFixed(2)}.`,
      newRefBal,
      tx,
    };
  });
}
