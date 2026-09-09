import crypto from 'crypto';
import { ADMIN_HANDLES, ADMIN_TELEGRAM_IDS } from '@/lib/adminAuth';
import { verifyTelegramWebAppData } from '@/lib/telegramAuth';
import { getBotToken, getOtpHashKey } from './env';
import { dbGet } from './rtdb';

/**
 * Request gate for every privileged API route.
 *
 * Identity comes exclusively from the Telegram `initData` signature, never from
 * a body field or a query parameter. Anything the browser can type is treated
 * as untrusted input.
 */

export const INIT_DATA_HEADER = 'x-telegram-init-data';

export interface AuthenticatedActor {
  telegramId: number;
  username: string;
  firstName: string;
}

export class AuthError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
    this.code = code;
  }
}

function extractInitData(request: Request): string {
  const header = request.headers.get(INIT_DATA_HEADER);
  if (header && header.trim()) return header.trim();

  // Telegram's own convention for server calls, accepted as an alias.
  const authorization = request.headers.get('authorization');
  if (authorization?.startsWith('tma ')) {
    return authorization.slice(4).trim();
  }

  throw new AuthError(
    401,
    'MISSING_INIT_DATA',
    'Yêu cầu thiếu chữ ký Telegram initData. Vui lòng mở lại ứng dụng từ Telegram.'
  );
}

/** Resolves the caller's verified Telegram identity, or throws. */
export function authenticate(request: Request): AuthenticatedActor {
  const initData = extractInitData(request);
  const result = verifyTelegramWebAppData(initData, getBotToken());

  if (!result.isValid) {
    throw new AuthError(401, 'INVALID_INIT_DATA', result.error || 'Chữ ký Telegram không hợp lệ');
  }
  if (!result.user?.id) {
    throw new AuthError(401, 'MISSING_USER', 'Chữ ký hợp lệ nhưng không chứa thông tin người dùng');
  }

  return {
    telegramId: result.user.id,
    username: (result.user.username || '').replace('@', '').toLowerCase(),
    firstName: result.user.first_name || '',
  };
}

/**
 * Resolves the caller and asserts they hold an administrative role.
 *
 * The role is read from the database using the *verified* Telegram id. The
 * allow-list only bootstraps founding admins; it is never sourced from the
 * request payload.
 */
export async function authorizeAdmin(request: Request): Promise<AuthenticatedActor> {
  const actor = authenticate(request);

  if (ADMIN_TELEGRAM_IDS.includes(actor.telegramId)) return actor;
  if (actor.username && ADMIN_HANDLES.includes(actor.username)) return actor;

  let storedRole: string | null = null;
  try {
    storedRole = await dbGet<string | null>(`users/${actor.telegramId}/role`);
  } catch {
    storedRole = null;
  }

  if (storedRole === 'ADMIN' || storedRole === 'SUPER_ADMIN') return actor;

  throw new AuthError(
    403,
    'FORBIDDEN',
    'Tài khoản của bạn không có quyền quản trị cho hành động này.'
  );
}

export const ADMIN_SESSION_COOKIE = 'spartan_admin_3fa';
const ADMIN_SESSION_TTL_SECONDS = 30 * 60;

function signAdminSession(telegramId: number, expiresAt: number): string {
  return crypto
    .createHmac('sha256', getOtpHashKey())
    .update(`${telegramId}.${expiresAt}`)
    .digest('hex');
}

/** Signed 3FA session cookie, issued only after PIN + OTP + TOTP succeed. */
export function buildAdminSessionCookie(telegramId: number): string {
  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS;
  const signature = signAdminSession(telegramId, expiresAt);
  const value = `${telegramId}.${expiresAt}.${signature}`;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${ADMIN_SESSION_COOKIE}=${value}; HttpOnly; Path=/; Max-Age=${ADMIN_SESSION_TTL_SECONDS}; SameSite=Strict${secure}`;
}

function readAdminSessionTelegramId(request: Request): number | null {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`));
  if (!match) return null;

  const value = match.slice(ADMIN_SESSION_COOKIE.length + 1);
  const [idPart, expPart, signature] = value.split('.');
  const telegramId = Number(idPart);
  const expiresAt = Number(expPart);
  if (!Number.isFinite(telegramId) || !Number.isFinite(expiresAt) || !signature) return null;
  if (expiresAt < Math.floor(Date.now() / 1000)) return null;

  const expected = Buffer.from(signAdminSession(telegramId, expiresAt), 'hex');
  let received: Buffer;
  try {
    received = Buffer.from(signature, 'hex');
  } catch {
    return null;
  }
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return null;
  }
  return telegramId;
}

/**
 * Admin identity plus a live 3FA session cookie.
 * UI flags and sessionStorage are not accepted as proof of elevation.
 */
export async function authorizeElevatedAdmin(request: Request): Promise<AuthenticatedActor> {
  const actor = await authorizeAdmin(request);
  const sessionId = readAdminSessionTelegramId(request);
  if (sessionId !== actor.telegramId) {
    throw new AuthError(
      401,
      'ADMIN_3FA_REQUIRED',
      'Phiên 3FA đã hết hạn hoặc chưa hoàn tất. Vui lòng xác thực lại PIN + OTP + Authenticator.'
    );
  }
  return actor;
}

/** Maps a thrown error to a JSON response, hiding internals from the client. */
export function toErrorResponse(error: unknown): Response {
  if (error instanceof AuthError) {
    return Response.json(
      { success: false, error: error.code, message: error.message },
      { status: error.status }
    );
  }

  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith('MISSING_CONFIG')) {
    console.error('[security] Route rejected due to missing configuration:', message);
    return Response.json(
      {
        success: false,
        error: 'SERVER_MISCONFIGURED',
        message: 'Dịch vụ chưa được cấu hình đầy đủ. Vui lòng liên hệ quản trị viên.',
      },
      { status: 503 }
    );
  }

  console.error('[security] Unhandled route error:', message);
  return Response.json(
    { success: false, error: 'INTERNAL_ERROR', message: 'Đã xảy ra lỗi khi xử lý yêu cầu.' },
    { status: 500 }
  );
}
