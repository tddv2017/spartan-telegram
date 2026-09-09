import { ADMIN_HANDLES, ADMIN_TELEGRAM_IDS } from '@/lib/adminAuth';
import type { UserData } from '@/lib/firebaseService';
import { authenticate, toErrorResponse } from '@/lib/server/auth';
import { dbGet, dbUpdate } from '@/lib/server/rtdb';

export const dynamic = 'force-dynamic';

/**
 * Upserts the caller's profile from the verified Telegram signature.
 * Balances and roles already stored in the database are never overwritten
 * by the client payload.
 */
export async function POST(request: Request) {
  try {
    const actor = authenticate(request);
    const body = await request.json().catch(() => ({}));
    const userId = String(actor.telegramId);
    const nowIso = new Date().toISOString();
    const existing = await dbGet<UserData | null>(`users/${userId}`);

    const isFoundingAdmin =
      ADMIN_TELEGRAM_IDS.includes(actor.telegramId) ||
      (actor.username && ADMIN_HANDLES.includes(actor.username));

    const existingRole = existing?.role;
    const role: UserData['role'] =
      isFoundingAdmin || existingRole === 'ADMIN' || (existingRole as string) === 'SUPER_ADMIN'
        ? 'ADMIN'
        : existingRole || 'CLIENT';

    const referrerId =
      existing?.referrerId ||
      (typeof body?.referrerId === 'string' && body.referrerId !== userId ? body.referrerId.trim() : undefined);

    const user: UserData = {
      telegramId: userId,
      username: actor.username || existing?.username || `user_${userId.slice(-4)}`,
      firstName: actor.firstName || existing?.firstName || 'Warrior',
      role,
      tradingBalance: typeof existing?.tradingBalance === 'number' ? existing.tradingBalance : 0,
      referralBalance: typeof existing?.referralBalance === 'number' ? existing.referralBalance : 0,
      referralCode: existing?.referralCode || `SPARTAN_${userId}`,
      referrerId,
      resellerTier: typeof existing?.resellerTier === 'number' ? existing.resellerTier : 1,
      botActive: existing?.botActive !== false,
      isFrozen: existing?.isFrozen === true,
      freezeReason: existing?.freezeReason,
      capitalJoinedAt: existing?.capitalJoinedAt,
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    await dbUpdate(`users/${userId}`, user as unknown as Record<string, unknown>);

    if (referrerId && referrerId !== userId && !existing?.referrerId) {
      await dbUpdate(`users/${referrerId}/referrals/${userId}`, {
        telegramId: userId,
        username: user.username,
        firstName: user.firstName,
        joinedAt: nowIso,
      });
    }

    return Response.json({
      success: true,
      user,
      isAdmin: role === 'ADMIN',
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
