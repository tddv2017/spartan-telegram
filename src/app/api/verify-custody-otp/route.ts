import { authorizeAdmin, toErrorResponse } from '@/lib/server/auth';
import { CustodyOtpSession, matchesOtp } from '@/lib/server/otp';
import { consumeAttempt, resetAttempts } from '@/lib/server/rateLimit';
import { dbGet, dbRemove } from '@/lib/server/rtdb';

export const dynamic = 'force-dynamic';

/**
 * Verifies a custody OTP server-side.
 *
 * The browser previously fetched the session record straight from the Realtime
 * Database and compared the code itself, which meant the code was readable by
 * anyone who could reach the database. Verification now happens here and the
 * session is consumed on success so a code cannot be replayed.
 */
export async function POST(request: Request) {
  try {
    const actor = await authorizeAdmin(request);

    await consumeAttempt('otp-verify', String(actor.telegramId), {
      maxAttempts: 5,
      windowMs: 5 * 60 * 1000,
      blockMs: 15 * 60 * 1000,
    });

    const body = await request.json().catch(() => ({}));
    const code = String(body?.code ?? '').trim();

    if (!/^\d{6}$/.test(code)) {
      return Response.json(
        { success: false, error: 'INVALID_FORMAT', message: 'Vui lòng nhập đủ 6 chữ số OTP.' },
        { status: 400 }
      );
    }

    const sessionPath = `admin_custody_session/${actor.telegramId}`;
    const session = await dbGet<CustodyOtpSession | null>(sessionPath);

    if (!session?.otpHash) {
      return Response.json(
        {
          success: false,
          error: 'NO_ACTIVE_OTP',
          message: 'Chưa có mã OTP nào được gửi. Vui lòng bấm [GỬI MÃ].',
        },
        { status: 400 }
      );
    }

    if (!session.expiresAt || Date.now() > session.expiresAt) {
      await dbRemove(sessionPath);
      return Response.json(
        {
          success: false,
          error: 'OTP_EXPIRED',
          message: 'Mã OTP đã hết hạn. Vui lòng bấm gửi lại mã mới.',
        },
        { status: 400 }
      );
    }

    if (!matchesOtp(code, actor.telegramId, session.otpHash)) {
      console.warn(`[security] Sai mã OTP custody từ admin ${actor.telegramId}`);
      return Response.json(
        {
          success: false,
          error: 'INVALID_OTP',
          message: '❌ Mã OTP không chính xác. Vui lòng kiểm tra tin nhắn trên Telegram.',
        },
        { status: 400 }
      );
    }

    await dbRemove(sessionPath);
    await resetAttempts('otp-verify', String(actor.telegramId));

    return Response.json({ success: true, message: '✓ Xác minh mã ký lưu ký thành công.' });
  } catch (error) {
    return toErrorResponse(error);
  }
}
