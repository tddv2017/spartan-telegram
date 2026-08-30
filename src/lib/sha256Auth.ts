import crypto from 'crypto';

const SECRET_KEY = process.env.SPARTAN_HMAC_SECRET || 'SPARTAN_QUANT_AI_SECRET_KEY_2026';

export interface DepositSignaturePayload {
  orderId: string;
  mt5AccountId: string;
  amount: number;
  walletAddress: string;
  timestamp: number;
}

/**
 * Generates an HMAC-SHA256 64-character hexadecimal signature for deposit integrity.
 */
export function generateDepositSignature(payload: DepositSignaturePayload): string {
  const rawString = `${payload.orderId}|${payload.mt5AccountId}|${payload.amount.toFixed(2)}|${payload.walletAddress}|${payload.timestamp}`;
  return crypto.createHmac('sha256', SECRET_KEY).update(rawString).digest('hex');
}

/**
 * Verifies if an incoming HMAC-SHA256 signature matches expected payload.
 */
export function verifyDepositSignature(payload: DepositSignaturePayload, signature: string): boolean {
  try {
    const expectedSig = generateDepositSignature(payload);
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSig, 'hex'));
  } catch (e) {
    return false;
  }
}
