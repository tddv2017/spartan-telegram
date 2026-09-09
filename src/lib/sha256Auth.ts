import crypto from 'crypto';
import { getHmacSecret } from './server/env';

/**
 * Server-only deposit integrity seal.
 *
 * This module reads `SPARTAN_HMAC_SECRET` and must never be imported from a
 * component or any module that reaches the browser bundle: doing so would ship
 * the signing key to every client. Client code should use
 * `@/lib/orderReference` instead.
 */

export interface DepositSignaturePayload {
  orderId: string;
  masterWalletAddress: string;
  timestamp: number;
}

/** HMAC-SHA256 over `OrderID|MasterWalletAddress|Timestamp`. */
export function generateDepositSignature(payload: DepositSignaturePayload): string {
  const rawString = `${payload.orderId}|${payload.masterWalletAddress}|${payload.timestamp}`;
  return crypto.createHmac('sha256', getHmacSecret()).update(rawString).digest('hex');
}

export function verifyDepositSignature(
  payload: DepositSignaturePayload,
  signature: string
): boolean {
  try {
    const expected = Buffer.from(generateDepositSignature(payload), 'hex');
    const received = Buffer.from(signature, 'hex');
    return expected.length === received.length && crypto.timingSafeEqual(expected, received);
  } catch (e) {
    return false;
  }
}
