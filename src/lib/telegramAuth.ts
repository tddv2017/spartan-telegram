import crypto from 'crypto';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface VerificationResult {
  isValid: boolean;
  user?: TelegramUser;
  authDate?: number;
  error?: string;
}

/**
 * Validates the raw Telegram WebApp initData string using HMAC-SHA256
 * according to official Telegram Core API specifications.
 * 
 * Reference: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyTelegramWebAppData(
  initData: string, 
  botToken: string = process.env.BOT_TOKEN || ''
): VerificationResult {
  if (!initData || !botToken) {
    return { isValid: false, error: 'MISSING_DATA: initData hoặc BOT_TOKEN không tồn tại' };
  }

  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');

    if (!hash) {
      return { isValid: false, error: 'MISSING_HASH: Không tìm thấy chữ ký mã băm hash' };
    }

    // Filter out 'hash' and sort keys alphabetically
    const dataCheckArr: string[] = [];
    urlParams.delete('hash');
    
    // Sort keys alphabetically
    const sortedKeys = Array.from(urlParams.keys()).sort();
    for (const key of sortedKeys) {
      dataCheckArr.push(`${key}=${urlParams.get(key)}`);
    }
    const dataCheckString = dataCheckArr.join('\n');

    // 1. Calculate secret key: HMAC_SHA256("WebAppData", botToken)
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // 2. Calculate data hash: HMAC_SHA256(secretKey, dataCheckString)
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // 3. Timing-safe comparison to prevent timing attacks
    const calculatedBuffer = Buffer.from(calculatedHash, 'hex');
    const receivedBuffer = Buffer.from(hash, 'hex');

    if (calculatedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(calculatedBuffer, receivedBuffer)) {
      return { isValid: false, error: 'INVALID_SIGNATURE: Chữ ký HMAC-SHA256 không hợp lệ (Dữ liệu bị can thiệp)' };
    }

    // 4. Validate auth_date: prevent replay attacks older than 24 hours (86400s)
    const authDateStr = urlParams.get('auth_date');
    const authDate = authDateStr ? parseInt(authDateStr, 10) : 0;
    const now = Math.floor(Date.now() / 1000);

    if (now - authDate > 86400) {
      return { isValid: false, error: 'EXPIRED_SESSION: Phiên đăng nhập đã quá hạn 24 giờ' };
    }

    // 5. Parse Telegram user object
    const userStr = urlParams.get('user');
    let user: TelegramUser | undefined;
    if (userStr) {
      try {
        user = JSON.parse(userStr);
      } catch (e) {
        // Ignored
      }
    }

    return {
      isValid: true,
      user,
      authDate
    };
  } catch (err: any) {
    return {
      isValid: false,
      error: `VERIFICATION_EXCEPTION: ${err?.message || 'Lỗi không xác định'}`
    };
  }
}
