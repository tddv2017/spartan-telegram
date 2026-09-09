import crypto from 'crypto';
import { authorizeAdmin, toErrorResponse } from '@/lib/server/auth';
import { getBotToken } from '@/lib/server/env';
import { hashOtp, OTP_TTL_MS } from '@/lib/server/otp';
import { consumeAttempt } from '@/lib/server/rateLimit';
import { dbSet } from '@/lib/server/rtdb';

export const dynamic = 'force-dynamic';

/**
 * Issues a custody OTP to the authenticated administrator.
 *
 * Two properties matter here. The recipient is derived from the verified
 * Telegram signature rather than a request field, so an OTP can never be
 * routed to an account the caller does not own. And only a keyed hash of the
 * code is persisted, so reading the session record does not reveal the code.
 */
export async function POST(request: Request) {
  try {
    const actor = await authorizeAdmin(request);

    await consumeAttempt('otp-send', String(actor.telegramId), {
      maxAttempts: 5,
      windowMs: 10 * 60 * 1000,
      blockMs: 10 * 60 * 1000,
    });

    const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    const issuedAt = Date.now();
    const adminDisplay = actor.username ? `@${actor.username}` : `Admin #${actor.telegramId}`;

    await dbSet(`admin_custody_session/${actor.telegramId}`, {
      otpHash: hashOtp(otp, actor.telegramId),
      telegramId: String(actor.telegramId),
      adminDisplay,
      issuedAt,
      expiresAt: issuedAt + OTP_TTL_MS,
    });

    const messageText =
      `🔐 *[SPARTAN CUSTODY 3FA XÁC THỰC QUẢN TRỊ]*\n\n` +
      `Xin chào *${adminDisplay}*!\n` +
      `Mã bảo mật OTP đăng nhập Cổng Quản Trị của bạn là:\n` +
      `👉 *${otp}*\n\n` +
      `⏰ *Hiệu lực:* ${OTP_TTL_MS / 60000} phút\n` +
      `⚠️ *Cảnh báo an ninh:* Tuyệt đối không chia sẻ mã này cho bất kỳ ai!`;

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${getBotToken()}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: actor.telegramId,
          text: messageText,
          parse_mode: 'Markdown',
        }),
      }
    );

    const telegramResult = await telegramResponse.json().catch(() => ({ ok: false }));

    if (!telegramResult.ok) {
      console.warn(
        `[security] Không gửi được OTP tới ${actor.telegramId}:`,
        telegramResult.description
      );
      return Response.json({
        success: true,
        telegramSent: false,
        message:
          'Đã tạo mã OTP. Nếu chưa nhận được tin nhắn, hãy mở Bot Telegram và bấm /start rồi thử lại.',
      });
    }

    return Response.json({
      success: true,
      telegramSent: true,
      message: `Đã gửi mã xác thực OTP về Telegram của ${adminDisplay}.`,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
