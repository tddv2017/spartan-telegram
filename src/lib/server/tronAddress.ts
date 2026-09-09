import crypto from 'crypto';

/**
 * TRON address decoding.
 *
 * The node RPC returns addresses as 21-byte hex (`41` + 20-byte body), while
 * wallets and our configuration use base58check. Comparing a transfer's
 * recipient against the treasury wallet requires converting between the two,
 * otherwise the recipient check cannot be enforced at all.
 */

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Encode(buffer: Buffer): string {
  let value = BigInt('0x' + buffer.toString('hex'));
  const base = BigInt(58);
  let encoded = '';

  while (value > BigInt(0)) {
    const remainder = value % base;
    value /= base;
    encoded = BASE58_ALPHABET[Number(remainder)] + encoded;
  }

  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] !== 0) break;
    encoded = BASE58_ALPHABET[0] + encoded;
  }

  return encoded;
}

const sha256 = (data: Buffer) => crypto.createHash('sha256').update(data).digest();

/** True when `address` is a 34-character mainnet TRON base58check address. */
export function isValidTronAddress(address: string): boolean {
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address.trim());
}

/** Converts a 21-byte hex TRON address (with or without `0x`) to base58check. */
export function hexToTronAddress(hex: string): string | null {
  const clean = hex.replace(/^0x/i, '').toLowerCase();
  if (!/^41[a-f0-9]{40}$/.test(clean)) return null;

  const payload = Buffer.from(clean, 'hex');
  const checksum = sha256(sha256(payload)).subarray(0, 4);
  return base58Encode(Buffer.concat([payload, checksum]));
}

/**
 * Reads the recipient out of a TRC20 `transfer(address,uint256)` calldata blob.
 *
 * Layout: 8 hex chars of selector, then the address left-padded to 32 bytes,
 * then the amount. The address body is the last 40 chars of the first word.
 */
export function decodeTransferRecipient(data: string): string | null {
  const clean = data.replace(/^0x/i, '').toLowerCase();
  if (!clean.startsWith('a9059cbb') || clean.length < 8 + 64) return null;

  const addressWord = clean.slice(8, 72);
  return hexToTronAddress(`41${addressWord.slice(24)}`);
}

/** Reads the amount out of a TRC20 `transfer(address,uint256)` calldata blob. */
export function decodeTransferAmount(data: string, decimals = 6): number | null {
  const clean = data.replace(/^0x/i, '').toLowerCase();
  if (!clean.startsWith('a9059cbb') || clean.length < 8 + 128) return null;

  try {
    const raw = BigInt('0x' + clean.slice(72, 136));
    if (raw <= BigInt(0)) return null;
    return Number(raw) / 10 ** decimals;
  } catch {
    return null;
  }
}
