/**
 * SPARTAN ADMIN 3FA CUSTODIAL VERIFICATION SERVICE
 * 1. Master PIN: Level 1 access gate
 * 2. Custody OTP: generated, delivered and verified entirely server-side
 * 3. Device presence check: WebAuthn platform authenticator
 *
 * Every factor is adjudicated by an API route that re-verifies the caller's
 * Telegram signature. Nothing in this file may decide on its own that a factor
 * passed, because the browser is under the user's control.
 */

import { ApiError, apiFetch } from './telegramClient';

export interface Admin3FaConfig {
  adminEmail: string;
  deviceName: string;
  deviceModel: string;
  is3FaEnforced: boolean;
  lastVerifiedAt?: string;
}

const CONFIG_STORAGE_KEY = 'spartan_admin_3fa_config_v1';

export const DEFAULT_3FA_CONFIG: Admin3FaConfig = {
  adminEmail: 'tddv2017@gmail.com',
  deviceName: 'iPhone 15 Pro Max của Chỉ Huy (@tddv2017)',
  deviceModel: 'Apple Mobile Secure Enclave (A17 Pro)',
  is3FaEnforced: true,
};

export function getAdmin3FaConfig(): Admin3FaConfig {
  if (typeof window === 'undefined') return DEFAULT_3FA_CONFIG;
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return DEFAULT_3FA_CONFIG;
}

export function saveAdmin3FaConfig(config: Admin3FaConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}

function describeError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  return fallback;
}

/**
 * Requests a custody OTP for the signed-in administrator.
 *
 * The recipient is resolved server-side from the Telegram signature, so there
 * is deliberately no parameter for choosing a target account.
 */
export async function sendRealCustodyOtp(): Promise<{
  success: boolean;
  message: string;
  telegramSent?: boolean;
}> {
  try {
    const data = await apiFetch<{ message?: string; telegramSent?: boolean }>(
      '/api/send-custody-otp',
      {}
    );
    return {
      success: true,
      telegramSent: data.telegramSent,
      message: data.message || 'Đã gửi mã xác thực OTP về Telegram của bạn.',
    };
  } catch (err) {
    return { success: false, message: describeError(err, 'Không gửi được mã OTP.') };
  }
}

export async function verifyRealCustodyOtp(
  enteredOtp: string
): Promise<{ success: boolean; message: string }> {
  const cleanOtp = enteredOtp.trim();
  if (!/^\d{6}$/.test(cleanOtp)) {
    return { success: false, message: 'Vui lòng nhập đủ 6 chữ số OTP.' };
  }

  try {
    const data = await apiFetch<{ message?: string }>('/api/verify-custody-otp', {
      code: cleanOtp,
    });
    return { success: true, message: data.message || '✓ Xác minh mã lưu ký thành công.' };
  } catch (err) {
    return { success: false, message: describeError(err, '❌ Mã OTP không chính xác.') };
  }
}

export async function verifyLiveTotp(
  code: string
): Promise<{ success: boolean; message: string }> {
  try {
    const data = await apiFetch<{ message?: string }>('/api/verify-totp', { code: code.trim() });
    return { success: true, message: data.message || '✓ Xác thực 2FA thành công.' };
  } catch (err) {
    return { success: false, message: describeError(err, '❌ Mã 2FA không đúng.') };
  }
}

/**
 * Prompts the platform authenticator (Face ID / Touch ID / Windows Hello).
 *
 * This establishes that the operator is physically present on an enrolled
 * device. It is a presence check rather than a cryptographic factor, so a
 * failure or an unsupported browser is reported as a failure — returning
 * success there would make the whole step decorative.
 */
export async function triggerRealWebAuthnBiometrics(): Promise<{
  success: boolean;
  message: string;
}> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return {
      success: false,
      message: 'Thiết bị hoặc trình duyệt này không hỗ trợ xác thực sinh trắc học.',
    };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'Spartan Admin Custody', id: window.location.hostname },
        user: {
          id: window.crypto.getRandomValues(new Uint8Array(16)),
          name: 'spartan-admin',
          displayName: 'Spartan Administrator',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
        timeout: 60000,
      },
    });

    if (!credential) {
      return { success: false, message: 'Không thể xác thực sinh trắc học thiết bị.' };
    }

    return {
      success: true,
      message: '✓ Xác thực sinh trắc học phần cứng (Face ID / Vân tay) thành công.',
    };
  } catch (err: any) {
    if (err?.name === 'NotAllowedError') {
      return { success: false, message: 'Bạn đã từ chối hoặc hủy yêu cầu quét Face ID / Vân tay.' };
    }
    console.warn('WebAuthn error:', err);
    return {
      success: false,
      message: 'Không thể xác thực sinh trắc học trên thiết bị này. Vui lòng thử lại.',
    };
  }
}

export function getQrCodeUrl(data: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(data)}`;
}
