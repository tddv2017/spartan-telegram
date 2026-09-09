import crypto from 'crypto';

/** RFC 6238 TOTP verification. The seed is server-side only, never client-supplied. */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TIME_STEP_SECONDS = 30;
/** Accept the previous, current and next step to absorb clock drift. */
const ALLOWED_WINDOWS = [-1, 0, 1];

function base32Decode(base32: string): Buffer {
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  const clean = base32.toUpperCase().replace(/=+$/, '');

  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

export function generateTotpToken(secretBase32: string, windowOffset = 0): string {
  const key = base32Decode(secretBase32);
  const timeStep = Math.floor(Date.now() / 1000 / TIME_STEP_SECONDS) + windowOffset;

  const counter = Buffer.alloc(8);
  counter.writeBigInt64BE(BigInt(timeStep));

  const digest = crypto.createHmac('sha1', key).update(counter).digest();
  const offset = digest[digest.length - 1] & 0xf;
  const code =
    (((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff)) %
    1_000_000;

  return code.toString().padStart(6, '0');
}

function equals(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function verifyTotpToken(token: unknown, secretBase32: string): boolean {
  if (typeof token !== 'string') return false;
  const clean = token.trim();
  if (!/^\d{6}$/.test(clean)) return false;

  return ALLOWED_WINDOWS.some((window) => equals(generateTotpToken(secretBase32, window), clean));
}
