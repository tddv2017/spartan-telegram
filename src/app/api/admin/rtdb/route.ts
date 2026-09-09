import { authorizeElevatedAdmin, toErrorResponse, AuthError } from '@/lib/server/auth';
import { dbGet, dbRemove, dbSet, dbUpdate } from '@/lib/server/rtdb';

export const dynamic = 'force-dynamic';

const ALLOWED_PATH = /^(users\/[A-Za-z0-9_]+(?:\/transactions\/[A-Za-z0-9_-]+)?|transactions\/[A-Za-z0-9_-]+|system_config|fraud_alerts(?:\/[A-Za-z0-9_-]+)?|p2p_waitlist\/[A-Za-z0-9_]+)$/;

function assertSafePath(path: string): string {
  const normalized = String(path || '').replace(/^\/+|\/+$/g, '').replace(/\.json$/i, '');
  if (!ALLOWED_PATH.test(normalized)) {
    throw new AuthError(403, 'PATH_FORBIDDEN', 'Đường dẫn dữ liệu này không được phép ghi từ bảng quản trị.');
  }
  if (normalized.includes('..') || normalized.includes('used_tx_hashes') || normalized.includes('admin_custody')) {
    throw new AuthError(403, 'PATH_FORBIDDEN', 'Đường dẫn dữ liệu này không được phép ghi từ bảng quản trị.');
  }
  return normalized;
}

export async function POST(request: Request) {
  try {
    await authorizeElevatedAdmin(request);
    const body = await request.json().catch(() => ({}));
    const method = String(body?.method || 'PATCH').toUpperCase();
    const path = assertSafePath(String(body?.path || ''));
    const data = body?.data;

    if (method === 'DELETE') {
      await dbRemove(path);
      return Response.json({ success: true });
    }

    if (method === 'PUT') {
      await dbSet(path, data ?? null);
      return Response.json({ success: true });
    }

    if (method === 'PATCH') {
      if (!data || typeof data !== 'object') {
        throw new AuthError(400, 'INVALID_PAYLOAD', 'Dữ liệu PATCH không hợp lệ.');
      }
      await dbUpdate(path, data as Record<string, unknown>);
      return Response.json({ success: true });
    }

    throw new AuthError(400, 'INVALID_METHOD', 'Phương thức ghi không được hỗ trợ.');
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function GET(request: Request) {
  try {
    await authorizeElevatedAdmin(request);
    const resource = new URL(request.url).searchParams.get('resource');
    if (resource === 'users' || resource === 'transactions') {
      const data = await dbGet(resource);
      return Response.json({ success: true, data });
    }
    throw new AuthError(400, 'INVALID_RESOURCE', 'Tài nguyên không hợp lệ.');
  } catch (error) {
    return toErrorResponse(error);
  }
}
