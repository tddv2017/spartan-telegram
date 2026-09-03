/**
 * Spartan Vault Cryptographic PIN Security Service
 * Implements salted SHA-256 cryptographic hashing for Master PIN
 * Enforces Zero-Trust: Plaintext PIN is NEVER stored on Firebase RTDB.
 */

const PIN_SALT = 'SPARTAN_VAULT_MASTER_SALT_2026_@TDDV2017';
export const DEFAULT_MASTER_PIN = '888899';

/**
 * Computes a salted SHA-256 hash of a 6-digit PIN.
 */
export async function hashMasterPin(pin: string): Promise<string> {
  const cleanPin = pin.trim();
  const data = new TextEncoder().encode(`${PIN_SALT}:${cleanPin}:${PIN_SALT}`);
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    // Node.js fallback (server-side / tests)
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

/**
 * Verifies if entered PIN matches any valid target (hashed or legacy fallback).
 */
export async function verifyPinHash(enteredPin: string, targetHashOrPin: string): Promise<boolean> {
  if (!enteredPin || !targetHashOrPin) return false;
  const cleanEntered = enteredPin.trim();
  const cleanTarget = targetHashOrPin.trim();

  // 1. Direct match with plaintext (legacy local storage or default fallback)
  if (cleanEntered === cleanTarget) return true;

  // 2. Hash match
  const enteredHash = await hashMasterPin(cleanEntered);
  if (enteredHash === cleanTarget) return true;

  return false;
}
