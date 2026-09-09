import crypto from 'crypto';
import { getOtpHashKey } from './env';

/** Custody OTPs are stored as keyed hashes so the session record leaks nothing. */

export const OTP_TTL_MS = 5 * 60 * 1000;

export interface CustodyOtpSession {
  otpHash?: string;
  expiresAt?: number;
}

/** Binds the hash to the owning admin so a record cannot be replayed elsewhere. */
export function hashOtp(otp: string, telegramId: string | number): string {
  return crypto
    .createHmac('sha256', getOtpHashKey())
    .update(`${telegramId}|${otp.trim()}`)
    .digest('hex');
}

export function matchesOtp(
  candidate: string,
  telegramId: string | number,
  storedHash: string
): boolean {
  const expected = Buffer.from(hashOtp(candidate, telegramId), 'hex');
  let received: Buffer;
  try {
    received = Buffer.from(storedHash, 'hex');
  } catch {
    return false;
  }
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}
