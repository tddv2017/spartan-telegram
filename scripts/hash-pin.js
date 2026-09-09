/**
 * Generate ADMIN_PIN_HASH for .env
 *
 * Usage:
 *   OTP_HASH_KEY=your-otp-hash-key node scripts/hash-pin.js 123456
 */
const crypto = require('crypto');

const pin = String(process.argv[2] || '').trim();
const key = String(process.env.OTP_HASH_KEY || '').trim();

if (!pin || !/^\d{4,8}$/.test(pin)) {
  console.error('Usage: OTP_HASH_KEY=<secret> node scripts/hash-pin.js <4-8 digit pin>');
  process.exit(1);
}

if (!key) {
  console.error('OTP_HASH_KEY is required. Set it in the environment before hashing a PIN.');
  process.exit(1);
}

const hash = crypto.createHmac('sha256', key).update(`admin-pin|${pin}`).digest('hex');
console.log(hash);
