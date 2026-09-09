/**
 * Client-safe identifiers for deposit and withdrawal orders.
 *
 * These run in the browser, so they must not involve a shared secret. The
 * authoritative HMAC seal for a deposit is produced server-side once the
 * transfer is confirmed on-chain; the value generated here is an opaque
 * reference the user can quote to support.
 */

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);

  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** 64-character opaque order reference, matching the shape of a SHA-256 digest. */
export const generateOrderReference = (): string => randomHex(32);

/**
 * Unique order id.
 *
 * The previous scheme appended four random digits, which collides after a few
 * thousand orders and would let one transaction overwrite another.
 */
export function generateOrderId(type: 'DEPOSIT' | 'WITHDRAW', telegramId: string): string {
  const prefix = type === 'DEPOSIT' ? 'DEP' : 'WDR';
  return `${prefix}_${telegramId}_${Date.now().toString(36)}_${randomHex(4)}`;
}

/** Deposit memo code, unpredictable so it cannot be guessed and reused. */
export const generateMemoCode = (): string => `SPARTAN_${randomHex(4).toUpperCase()}`;
