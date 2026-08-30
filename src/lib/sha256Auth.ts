import crypto from 'crypto';

const SECRET_KEY = process.env.SPARTAN_HMAC_SECRET || 'SPARTAN_QUANT_AI_SECRET_KEY_2026';

export interface DepositSignaturePayload {
  orderId: string;
  trc20WalletAddress: string;
  amount: number;
  masterWalletAddress: string;
  timestamp: number;
}

/**
 * Generates an HMAC-SHA256 64-character hexadecimal signature for TRC20 deposit integrity.
 * Raw String Format: OrderID|TRC20Wallet|Amount|MasterWallet|Timestamp
 */
export function generateDepositSignature(payload: DepositSignaturePayload): string {
  const rawString = `${payload.orderId}|${payload.trc20WalletAddress}|${payload.amount.toFixed(2)}|${payload.masterWalletAddress}|${payload.timestamp}`;
  return crypto.createHmac('sha256', SECRET_KEY).update(rawString).digest('hex');
}

/**
 * Verifies if an incoming HMAC-SHA256 signature matches expected TRC20 payload.
 */
export function verifyDepositSignature(payload: DepositSignaturePayload, signature: string): boolean {
  try {
    const expectedSig = generateDepositSignature(payload);
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSig, 'hex'));
  } catch (e) {
    return false;
  }
}
