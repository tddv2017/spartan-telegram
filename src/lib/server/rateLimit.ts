import { AuthError } from './auth';
import { dbGet, dbSet } from './rtdb';

/**
 * Database-backed attempt counter.
 *
 * A six-digit OTP is only a million guesses, so brute-force protection has to
 * survive across serverless invocations. An in-memory map would reset on every
 * cold start, which is why the counter lives in the Realtime Database.
 */

interface AttemptRecord {
  count: number;
  windowStartedAt: number;
  blockedUntil?: number;
}

export interface RateLimitOptions {
  /** Attempts allowed inside one window. */
  maxAttempts: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** How long to lock the bucket once the limit is exceeded. */
  blockMs: number;
}

const bucketPath = (scope: string, key: string) =>
  `rate_limits/${scope}/${key.replace(/[.#$/[\]]/g, '_')}`;

/** Throws `AuthError(429)` when the bucket is exhausted, otherwise records the attempt. */
export async function consumeAttempt(
  scope: string,
  key: string,
  options: RateLimitOptions
): Promise<void> {
  const path = bucketPath(scope, key);
  const now = Date.now();

  let record: AttemptRecord | null = null;
  try {
    record = await dbGet<AttemptRecord | null>(path);
  } catch {
    // A read failure must not become an authentication bypass, but it also
    // should not lock out a legitimate admin: fall through and count locally.
    record = null;
  }

  if (record?.blockedUntil && record.blockedUntil > now) {
    const seconds = Math.ceil((record.blockedUntil - now) / 1000);
    throw new AuthError(
      429,
      'RATE_LIMITED',
      `Quá nhiều lần thử sai. Vui lòng đợi ${seconds} giây rồi thử lại.`
    );
  }

  const withinWindow = record && now - record.windowStartedAt < options.windowMs;
  const nextCount = withinWindow ? record!.count + 1 : 1;

  const next: AttemptRecord = {
    count: nextCount,
    windowStartedAt: withinWindow ? record!.windowStartedAt : now,
  };

  if (nextCount > options.maxAttempts) {
    next.blockedUntil = now + options.blockMs;
  }

  try {
    await dbSet(path, next);
  } catch {
    // Non-fatal: the verification below still has to succeed on its own merits.
  }

  if (next.blockedUntil) {
    throw new AuthError(
      429,
      'RATE_LIMITED',
      `Quá nhiều lần thử sai. Tài khoản bị tạm khóa ${Math.ceil(options.blockMs / 1000)} giây.`
    );
  }
}

/** Clears the bucket after a successful verification. */
export async function resetAttempts(scope: string, key: string): Promise<void> {
  try {
    await dbSet(bucketPath(scope, key), null);
  } catch {
    // Ignored: a stale counter only costs the user a short cooldown.
  }
}
