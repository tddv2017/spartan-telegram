import { authorizeElevatedAdmin, toErrorResponse } from '@/lib/server/auth';
import { rejectUserTransaction } from '@/lib/server/ledger';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const admin = await authorizeElevatedAdmin(request);
    const body = await request.json().catch(() => ({}));
    const result = await rejectUserTransaction(
      admin,
      String(body?.txId || ''),
      String(body?.reason || 'Từ chối bởi Admin')
    );
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
