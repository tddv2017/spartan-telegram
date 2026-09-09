import { authenticate, toErrorResponse } from '@/lib/server/auth';
import { createUserTransaction } from '@/lib/server/ledger';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const actor = authenticate(request);
    const body = await request.json().catch(() => ({}));
    const type = body?.type === 'WITHDRAW' ? 'WITHDRAW' : body?.type === 'DEPOSIT' ? 'DEPOSIT' : null;
    if (!type) {
      return Response.json(
        { success: false, error: 'INVALID_TYPE', message: 'Loại giao dịch phải là DEPOSIT hoặc WITHDRAW.' },
        { status: 400 }
      );
    }

    const tx = await createUserTransaction(actor, {
      type,
      grossAmount: Number(body?.grossAmount),
      recipientAddress: body?.recipientAddress,
      riskAgreement: body?.riskAgreement,
    });

    return Response.json({
      success: true,
      tx,
      message: type === 'DEPOSIT' ? 'Đã tạo đơn nạp thành công.' : 'Đã tạo lệnh rút thành công.',
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
