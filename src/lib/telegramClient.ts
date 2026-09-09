/**
 * Browser-side Telegram identity helpers.
 *
 * `initData` is the signed blob Telegram hands to the Mini App. It is the only
 * identity the server accepts, so every privileged call must carry it. The
 * fields in `initDataUnsafe` are fine for rendering a name, but must never be
 * used to decide what a user is allowed to do.
 */

export interface TelegramIdentity {
  telegramId: string;
  username: string;
  firstName: string;
  referrerId: string;
}

/** True when the app is running inside a real Telegram WebView with a signature. */
export function hasTelegramSignature(): boolean {
  return getInitData().length > 0;
}

export function getInitData(): string {
  if (typeof window === 'undefined') return '';
  const initData = (window as any).Telegram?.WebApp?.initData;
  return typeof initData === 'string' ? initData : '';
}

/**
 * Reads the identity Telegram supplied.
 *
 * Returns `null` outside Telegram. Development builds may fall back to URL
 * parameters so the app stays testable in a plain browser; production never
 * does, because that fallback would let anyone claim any account.
 */
export function getTelegramIdentity(): TelegramIdentity | null {
  if (typeof window === 'undefined') return null;

  const webApp = (window as any).Telegram?.WebApp;
  const user = webApp?.initDataUnsafe?.user;

  if (user?.id && getInitData()) {
    const telegramId = String(user.id);
    const startParam = String(webApp?.initDataUnsafe?.start_param || '');
    return {
      telegramId,
      username: user.username || `user_${telegramId.slice(-4)}`,
      firstName: user.first_name || 'Warrior',
      referrerId: startParam.startsWith('ref_') ? startParam.replace('ref_', '') : '',
    };
  }

  if (process.env.NODE_ENV === 'development') {
    const params = new URLSearchParams(window.location.search);
    const telegramId = params.get('id');
    if (telegramId) {
      const referrer = params.get('ref') || params.get('start') || '';
      return {
        telegramId,
        username: params.get('user') || `user_${telegramId.slice(-4)}`,
        firstName: params.get('name') || 'Warrior',
        referrerId: referrer.replace('ref_', ''),
      };
    }
  }

  return null;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Calls an internal API route with the Telegram signature attached.
 *
 * Throws `ApiError` on a non-2xx response so callers cannot mistake a rejected
 * request for a successful one.
 */
export async function apiFetch<T>(path: string, body?: unknown): Promise<T> {
  const initData = getInitData();
  if (!initData) {
    throw new ApiError(
      401,
      'MISSING_INIT_DATA',
      'Không tìm thấy chữ ký Telegram. Vui lòng mở ứng dụng từ trong Telegram.'
    );
  }

  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-telegram-init-data': initData,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload?.success === false) {
    throw new ApiError(
      response.status,
      payload?.error || 'REQUEST_FAILED',
      payload?.message || payload?.error || `Yêu cầu thất bại (HTTP ${response.status})`
    );
  }

  return payload as T;
}
