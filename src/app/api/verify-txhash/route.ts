import crypto from 'crypto';
import { authenticate, toErrorResponse } from '@/lib/server/auth';
import { getBotToken, getHmacSecret, getMasterWalletAddress } from '@/lib/server/env';
import { consumeAttempt } from '@/lib/server/rateLimit';
import { claimIfAbsent, dbGet, dbRemove, dbUpdate, withUserLock } from '@/lib/server/rtdb';
import { decodeTransferAmount, decodeTransferRecipient } from '@/lib/server/tronAddress';

export const dynamic = 'force-dynamic';

const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const DEPOSIT_FEE_RATE = 0.09;
const DEPOSIT_FEE_FLAT = 3.0;

interface OnChainTransfer {
  amount: number;
  fromAddress: string;
}

/** Immutable receipt binding the credited amount to the hash and the owner. */
function generateHashSeal(
  txHash: string,
  userId: string,
  amount: number,
  masterWallet: string,
  timestamp: number
): string {
  const payload = `${txHash}|${userId}|${amount.toFixed(2)}|${masterWallet}|${timestamp}`;
  return crypto.createHmac('sha256', getHmacSecret()).update(payload).digest('hex');
}

/**
 * Resolves a transfer only if it actually moved USDT into the treasury wallet.
 *
 * Both lookups assert the token contract and the recipient. Without those
 * checks any successful TRC20 transfer on TRON — including the treasury's own
 * outgoing withdrawals — could be presented as an inbound deposit.
 */
async function resolveInboundTransfer(
  txHash: string,
  masterWallet: string
): Promise<OnChainTransfer | null> {
  try {
    const listResponse = await fetch(
      `https://api.trongrid.io/v1/accounts/${masterWallet}/transactions/trc20?only_confirmed=true&limit=100`,
      { headers: { Accept: 'application/json' }, cache: 'no-store' }
    );

    if (listResponse.ok) {
      const payload = await listResponse.json();
      const match = Array.isArray(payload?.data)
        ? payload.data.find((entry: any) => entry?.transaction_id?.toLowerCase() === txHash)
        : null;

      if (match) {
        const isUsdt = match.token_info?.address === USDT_CONTRACT;
        const isInbound = match.to === masterWallet;
        if (!isUsdt || !isInbound) return null;

        const decimals = Number(match.token_info?.decimals ?? 6);
        const amount = Number(match.value || '0') / 10 ** decimals;
        if (!Number.isFinite(amount) || amount <= 0) return null;

        return { amount, fromAddress: match.from || 'ON_CHAIN_SENDER' };
      }
    }
  } catch (error) {
    console.warn('[deposit] TronGrid list lookup failed:', error);
  }

  try {
    const rpcResponse = await fetch('https://api.trongrid.io/wallet/gettransactionbyid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ value: txHash }),
    });

    if (!rpcResponse.ok) return null;
    const rpc = await rpcResponse.json();

    if (rpc?.ret?.[0]?.contractRet !== 'SUCCESS') return null;

    const contract = rpc.raw_data?.contract?.[0];
    if (contract?.type !== 'TriggerSmartContract') return null;

    const parameter = contract.parameter?.value;
    const { hexToTronAddress } = await import('@/lib/server/tronAddress');

    if (hexToTronAddress(String(parameter?.contract_address || '')) !== USDT_CONTRACT) return null;

    const data = String(parameter?.data || '');
    if (decodeTransferRecipient(data) !== masterWallet) return null;

    const amount = decodeTransferAmount(data);
    if (amount === null) return null;

    const sender = hexToTronAddress(String(parameter?.owner_address || ''));
    return { amount, fromAddress: sender || 'ON_CHAIN_SENDER' };
  } catch (error) {
    console.warn('[deposit] Tron RPC lookup failed:', error);
    return null;
  }
}

/**
 * Credits a USDT deposit after verifying it on-chain.
 *
 * The credited account is taken from the verified Telegram signature, never
 * from the request body, and the hash is claimed atomically before any money
 * moves so parallel submissions cannot double-credit.
 */
export async function POST(request: Request) {
  try {
    const actor = authenticate(request);
    const userId = String(actor.telegramId);
    const masterWallet = getMasterWalletAddress();

    await consumeAttempt('verify-txhash', userId, {
      maxAttempts: 12,
      windowMs: 10 * 60 * 1000,
      blockMs: 10 * 60 * 1000,
    });

    const body = await request.json().catch(() => ({}));
    const orderId = String(body?.orderId ?? '').trim();
    const rawTxHash = String(body?.txHash ?? '').trim().toLowerCase();

    if (!/^[a-f0-9]{64}$/.test(rawTxHash)) {
      return Response.json(
        {
          success: false,
          error: 'INVALID_TX_HASH',
          message:
            '⛔ MÃ BĂM KHÔNG HỢP LỆ: TxID trên mạng TRON phải là chuỗi SHA-256 gồm đúng 64 ký tự hex.',
        },
        { status: 400 }
      );
    }

    if (!orderId || !/^[A-Za-z0-9_-]{1,64}$/.test(orderId)) {
      return Response.json(
        {
          success: false,
          error: 'INVALID_ORDER',
          message: '⛔ Thiếu mã đơn nạp hợp lệ. Vui lòng tạo lại lệnh nạp trong ứng dụng.',
        },
        { status: 400 }
      );
    }

    // The order must exist, be a pending deposit, and belong to the caller.
    const order = await dbGet<any>(`transactions/${orderId}`);
    if (!order) {
      return Response.json(
        { success: false, error: 'ORDER_NOT_FOUND', message: '⛔ Không tìm thấy đơn nạp này.' },
        { status: 404 }
      );
    }
    if (String(order.telegramId ?? order.userId ?? '') !== userId) {
      console.warn(`[security] User ${userId} cố truy cập đơn nạp ${orderId} của người khác`);
      return Response.json(
        { success: false, error: 'ORDER_FORBIDDEN', message: '⛔ Đơn nạp này không thuộc về bạn.' },
        { status: 403 }
      );
    }
    if (order.type !== 'DEPOSIT') {
      return Response.json(
        { success: false, error: 'ORDER_TYPE', message: '⛔ Đơn này không phải lệnh nạp tiền.' },
        { status: 400 }
      );
    }
    if (order.status !== 'PENDING') {
      return Response.json(
        {
          success: false,
          error: 'ORDER_NOT_PENDING',
          message: `⛔ Đơn nạp này đang ở trạng thái ${order.status}, không thể xác thực lại.`,
        },
        { status: 409 }
      );
    }

    // Claim the hash before any credit happens. `if-none-match` makes this
    // atomic, so only one request can ever proceed with a given hash.
    const claimPath = `used_tx_hashes/${rawTxHash}`;
    const claimed = await claimIfAbsent(claimPath, {
      userId,
      username: actor.username,
      orderId,
      status: 'VERIFYING',
      claimedAt: new Date().toISOString(),
    });

    if (!claimed) {
      const existing = await dbGet<any>(claimPath).catch(() => null);
      return Response.json(
        {
          success: false,
          error: 'TX_HASH_ALREADY_USED',
          message: `⛔ CẢNH BÁO BẢO MẬT: Mã băm TxID này đã được sử dụng${
            existing?.claimedAt ? ` lúc ${new Date(existing.claimedAt).toLocaleString('vi-VN')}` : ''
          }. Hệ thống đã khóa mã băm để chống nạp trùng.`,
        },
        { status: 409 }
      );
    }

    try {
      const transfer = await resolveInboundTransfer(rawTxHash, masterWallet);

      if (!transfer) {
        // Release the claim so the user can retry once the block confirms.
        await dbRemove(claimPath).catch(() => {});
        return Response.json(
          {
            success: false,
            error: 'NOT_CONFIRMED_ON_CHAIN',
            message:
              '⚠️ CHƯA KHỚP ON-CHAIN: Không tìm thấy giao dịch USDT (TRC20) chuyển vào ví Master với mã băm này. Nếu bạn vừa chuyển từ sàn, hãy đợi 1-2 phút để mạng TRON xác nhận rồi bấm lại.',
          },
          { status: 400 }
        );
      }

      const grossAmount = Number(transfer.amount.toFixed(6));
      const feeAmount = Number((grossAmount * DEPOSIT_FEE_RATE + DEPOSIT_FEE_FLAT).toFixed(2));
      const netAmount = Number(Math.max(0, grossAmount - feeAmount).toFixed(2));
      const approvedAtIso = new Date().toISOString();
      const timestampNow = Date.now();
      const sha256Signature = generateHashSeal(
        rawTxHash,
        userId,
        grossAmount,
        masterWallet,
        timestampNow
      );

      const updatePayload = {
        status: 'APPROVED',
        grossAmount,
        feeAmount,
        netAmount,
        actualOnChainAmount: grossAmount,
        onChainTxHash: rawTxHash,
        sha256Signature,
        approvedBy: 'AI_SENTINEL_SHA256_HASH_VALIDATOR',
        approvedAt: approvedAtIso,
        fromAddress: transfer.fromAddress,
      };

      let newTradingBalance: number;
      try {
        newTradingBalance = await withUserLock(userId, async () => {
          const user = await dbGet<any>(`users/${userId}`);
          const currentBalance = Number(user?.tradingBalance) || 0;
          const nextBalance = Number((currentBalance + netAmount).toFixed(2));

          await dbUpdate(`users/${userId}`, {
            tradingBalance: nextBalance,
            capitalJoinedAt: user?.capitalJoinedAt || approvedAtIso,
            updatedAt: approvedAtIso,
          });

          return nextBalance;
        });
      } catch (lockError) {
        // The lock is taken before any credit, so releasing the hash here is
        // safe and lets the user retry rather than losing the deposit.
        if (lockError instanceof Error && lockError.message === 'USER_LOCK_BUSY') {
          await dbRemove(claimPath).catch(() => {});
          return Response.json(
            {
              success: false,
              error: 'BUSY',
              message:
                'Hệ thống đang xử lý một giao dịch khác của bạn. Vui lòng thử lại sau vài giây.',
            },
            { status: 409 }
          );
        }
        throw lockError;
      }

      await Promise.all([
        dbUpdate(`transactions/${orderId}`, updatePayload),
        dbUpdate(`users/${userId}/transactions/${orderId}`, updatePayload),
        dbUpdate(claimPath, {
          status: 'APPROVED',
          grossAmount,
          netAmount,
          sha256Signature,
          approvedAt: approvedAtIso,
        }),
      ]);

      const messageText =
        `🎉 *[SPARTAN XÁC THỰC MÃ BĂM TXID THÀNH CÔNG]*\n\n` +
        `Đơn nạp *#${orderId}* đã được xác thực On-Chain và duyệt tự động!\n\n` +
        `⛓ *Mã băm SHA-256 On-Chain (TxID):*\n\`${rawTxHash}\`\n\n` +
        `💵 *Số tiền nạp gốc (Gross):* $${grossAmount.toFixed(2)} USDT\n` +
        `📉 *Phí nạp & mạng (9% + $3):* -$${feeAmount.toFixed(2)} USDT\n` +
        `🟢 *✓ Thực nhận cộng vốn:* *+$${netAmount.toFixed(2)} USDT*\n` +
        `📊 *Tổng Vốn Bot khả dụng:* *$${newTradingBalance.toFixed(2)} USDT*\n` +
        `🛡 *Chữ ký bảo mật HMAC-SHA256:* \`${sha256Signature.slice(0, 16)}...\``;

      fetch(`https://api.telegram.org/bot${getBotToken()}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: userId, text: messageText, parse_mode: 'Markdown' }),
      }).catch(() => {});

      return Response.json({
        success: true,
        message: `🎉 XÁC THỰC THÀNH CÔNG! Đã khớp on-chain $${grossAmount.toFixed(
          2
        )} USDT và cộng +$${netAmount.toFixed(2)} USDT vào vốn của bạn.`,
        txHash: rawTxHash,
        grossAmount,
        netAmount,
        newTradingBalance,
        sha256Signature,
      });
    } catch (error) {
      // Never leave a hash claimed for a deposit that was not credited.
      await dbUpdate(claimPath, { status: 'FAILED', failedAt: new Date().toISOString() }).catch(
        () => {}
      );
      throw error;
    }
  } catch (error) {
    return toErrorResponse(error);
  }
}
