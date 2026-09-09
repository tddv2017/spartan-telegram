import { authorizeElevatedAdmin, toErrorResponse } from '@/lib/server/auth';
import { approveUserTransaction } from '@/lib/server/ledger';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const admin = await authorizeElevatedAdmin(request);
    const body = await request.json().catch(() => ({}));
    const result = await approveUserTransaction(
      admin,
      String(body?.txId || ''),
      typeof body?.actualOnChainAmount === 'number' ? body.actualOnChainAmount : undefined
    );
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
