import { authorizeAdmin, buildAdminSessionCookie, toErrorResponse } from '@/lib/server/auth';
import { getTotpSecret } from '@/lib/server/env';
import { consumeAttempt, resetAttempts } from '@/lib/server/rateLimit';
import { verifyTotpToken } from '@/lib/server/totp';

export const dynamic = 'force-dynamic';

/**
 * Verifies the admin authenticator code.
 *
 * The seed is read from `ADMIN_TOTP_SECRET` on the server. It used to be
 * accepted from the request body, which let a caller present a secret they
 * controlled together with a matching code and pass the check outright.
 */
export async function POST(request: Request) {
  try {
    const actor = await authorizeAdmin(request);

    await consumeAttempt('totp', String(actor.telegramId), {
      maxAttempts: 5,
      windowMs: 5 * 60 * 1000,
      blockMs: 15 * 60 * 1000,
    });

    const body = await request.json().catch(() => ({}));
    const isValid = verifyTotpToken(body?.code, getTotpSecret());

    if (!isValid) {
      console.warn(`[security] Sai mã TOTP từ admin ${actor.telegramId}`);
      return Response.json(
        {
          success: false,
          error: 'INVALID_TOTP',
          message: '❌ Mã 2FA không chính xác hoặc đã hết hạn. Vui lòng lấy mã mới trên điện thoại.',
        },
        { status: 400 }
      );
    }

    await resetAttempts('totp', String(actor.telegramId));

    const response = Response.json({
      success: true,
      message: '✓ Xác thực mã 2FA Google Authenticator thành công.',
    });
    response.headers.append('Set-Cookie', buildAdminSessionCookie(actor.telegramId));
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
