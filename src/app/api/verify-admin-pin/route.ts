import crypto from 'crypto';
import { authorizeAdmin, toErrorResponse } from '@/lib/server/auth';
import { getAdminPinHash, getOtpHashKey } from '@/lib/server/env';
import { consumeAttempt, resetAttempts } from '@/lib/server/rateLimit';

export const dynamic = 'force-dynamic';

/**
 * Verifies the level-1 master PIN.
 *
 * The PIN was previously compared in the browser against a statically salted
 * hash, which makes a six-digit secret recoverable offline in seconds, and a
 * literal default PIN was accepted unconditionally. Comparison now happens
 * here against `ADMIN_PIN_HASH`, behind admin authentication and a lockout.
 */
function computePinHash(pin: string): string {
  return crypto.createHmac('sha256', getOtpHashKey()).update(`admin-pin|${pin.trim()}`).digest('hex');
}

export async function POST(request: Request) {
  try {
    const actor = await authorizeAdmin(request);

    await consumeAttempt('admin-pin', String(actor.telegramId), {
      maxAttempts: 5,
      windowMs: 5 * 60 * 1000,
      blockMs: 5 * 60 * 1000,
    });

    const body = await request.json().catch(() => ({}));
    const pin = String(body?.pin ?? '').trim();

    if (!/^\d{4,8}$/.test(pin)) {
      return Response.json(
        { success: false, error: 'INVALID_FORMAT', message: 'Mã PIN không đúng định dạng.' },
        { status: 400 }
      );
    }

    const expected = Buffer.from(getAdminPinHash(), 'hex');
    const received = Buffer.from(computePinHash(pin), 'hex');
    const isValid =
      expected.length === received.length && crypto.timingSafeEqual(expected, received);

    if (!isValid) {
      console.warn(`[security] Sai Master PIN từ admin ${actor.telegramId}`);
      return Response.json(
        {
          success: false,
          error: 'INVALID_PIN',
          message: '❌ MÃ PIN BẢO MẬT KHÔNG CHÍNH XÁC!',
        },
        { status: 401 }
      );
    }

    await resetAttempts('admin-pin', String(actor.telegramId));

    return Response.json({ success: true, message: '✓ Xác thực Master PIN thành công.' });
  } catch (error) {
    return toErrorResponse(error);
  }
}
