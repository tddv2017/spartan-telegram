import { getDatabaseSecret } from './env';

/**
 * Minimal server-side Realtime Database client over the REST API.
 *
 * Requests carry `FIREBASE_DB_SECRET` when it is configured, so this module
 * keeps working after the database rules are switched to default-deny. Route
 * handlers must go through here instead of touching the browser SDK, which has
 * no way to prove it is the server.
 */

const DB_BASE_URL = (
  process.env.FIREBASE_DATABASE_URL ||
  'https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app'
).replace(/\/+$/, '');

function buildUrl(path: string, params: Record<string, string> = {}): string {
  const normalized = path.replace(/^\/+|\/+$/g, '');
  const url = new URL(`${DB_BASE_URL}/${normalized}.json`);

  const secret = getDatabaseSecret();
  if (secret) {
    url.searchParams.set('auth', secret);
  }
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

async function send<T>(
  method: 'GET' | 'PUT' | 'PATCH' | 'POST' | 'DELETE',
  path: string,
  body?: unknown,
  params?: Record<string, string>
): Promise<T> {
  const response = await fetch(buildUrl(path, params), {
    method,
    cache: 'no-store',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`RTDB_${method}_FAILED ${response.status} ${path} ${detail.slice(0, 200)}`);
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

export const dbGet = <T>(path: string, params?: Record<string, string>) =>
  send<T>('GET', path, undefined, params);

export const dbSet = <T>(path: string, value: unknown) => send<T>('PUT', path, value);

export const dbUpdate = <T>(path: string, value: Record<string, unknown>) =>
  send<T>('PATCH', path, value);

export const dbRemove = (path: string) => send<null>('DELETE', path);

/**
 * Claims `path` for the caller if and only if it is currently empty.
 *
 * Realtime Database applies `if-none-match: *` atomically, which makes this the
 * primitive for single-use resources: a transaction hash may only ever be
 * credited once, no matter how many requests arrive in parallel.
 */
export async function claimIfAbsent(path: string, value: unknown): Promise<boolean> {
  const response = await fetch(buildUrl(path), {
    method: 'PUT',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'if-none-match': '*',
    },
    body: JSON.stringify(value),
  });

  if (response.ok) return true;
  if (response.status === 412) return false;

  const detail = await response.text().catch(() => '');
  throw new Error(`RTDB_CLAIM_FAILED ${response.status} ${path} ${detail.slice(0, 200)}`);
}

/**
 * Serialises balance mutations for one user.
 *
 * The REST API has no compare-and-set, so a read-modify-write on a balance can
 * lose an update when two requests interleave. The lock turns those into a
 * queue; stale locks expire so a crashed request cannot freeze an account.
 */
export async function withUserLock<T>(userId: string | number, work: () => Promise<T>): Promise<T> {
  const path = `locks/user_balance/${userId}`;
  const LOCK_TTL_MS = 15_000;

  let acquired = await claimIfAbsent(path, { lockedAt: Date.now() });

  if (!acquired) {
    const existing = await dbGet<{ lockedAt?: number } | null>(path).catch(() => null);
    const isStale = !existing?.lockedAt || Date.now() - existing.lockedAt > LOCK_TTL_MS;
    if (!isStale) {
      throw new Error('USER_LOCK_BUSY');
    }
    await dbRemove(path);
    acquired = await claimIfAbsent(path, { lockedAt: Date.now() });
    if (!acquired) throw new Error('USER_LOCK_BUSY');
  }

  try {
    return await work();
  } finally {
    await dbRemove(path).catch(() => {});
  }
}
