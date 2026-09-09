import { authenticate, toErrorResponse } from '@/lib/server/auth';
import { reinvestReferral, withdrawReferral } from '@/lib/server/ledger';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const actor = authenticate(request);
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || '');

    if (action === 'reinvest') {
      const result = await reinvestReferral(actor, Number(body?.amount));
      return Response.json(result);
    }

    if (action === 'withdraw') {
      const result = await withdrawReferral(actor, Number(body?.amount), String(body?.recipientAddress || ''));
      return Response.json(result);
    }

    return Response.json(
      { success: false, error: 'INVALID_ACTION', message: 'Hành động chiết khấu không hợp lệ.' },
      { status: 400 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
