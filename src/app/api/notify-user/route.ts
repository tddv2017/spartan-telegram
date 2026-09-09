import { NextResponse } from 'next/server';
import { authorizeAdmin, toErrorResponse } from '@/lib/server/auth';
import { getBotToken } from '@/lib/server/env';

export const dynamic = 'force-dynamic';

/**
 * Sends a transaction outcome notice to a user.
 *
 * Restricted to administrators: an open endpoint here would let anyone send
 * bot-branded "deposit approved" messages to arbitrary Telegram accounts.
 */
export async function POST(req: Request) {
  try {
    await authorizeAdmin(req);

    const BOT_TOKEN = getBotToken();
    const body = await req.json();
    const { 
      telegramId, 
      type, 
      status, 
      grossAmount, 
      feeAmount, 
      netAmount, 
      newBalance, 
      reason, 
      txId 
    } = body;

    if (!telegramId) {
      return NextResponse.json({ success: false, message: 'Missing telegramId' }, { status: 400 });
    }

    let messageText = '';

    if (status === 'APPROVED') {
      if (type === 'DEPOSIT') {
        messageText = 
          `🎉 *[SPARTAN GIAO DỊCH NẠP TIỀN THÀNH CÔNG]*\n\n` +
          `Đơn nạp *#${txId || 'DEP'}* của bạn đã được phê duyệt và cộng vốn thành công!\n\n` +
          `💵 *Số tiền nạp gốc:* $${Number(grossAmount).toFixed(2)} USDT\n` +
          `📉 *Tổng phí khấu trừ:* -$${Number(feeAmount).toFixed(2)} USDT (9% + $3 on-chain)\n` +
          `🟢 *✓ Thực nhận cộng Vốn Bot:* +$${Number(netAmount).toFixed(2)} USDT\n` +
          (typeof newBalance === 'number' ? `📊 *Tổng Vốn Bot khả dụng:* $${Number(newBalance).toFixed(2)} USDT\n\n` : '\n') +
          `Chúc bạn đầu tư sinh lời bền vững cùng Spartan Quant AI! 🚀`;
      } else {
        messageText = 
          `💸 *[SPARTAN RÚT TIỀN THÀNH CÔNG]*\n\n` +
          `Đơn rút *#${txId || 'WDR'}* của bạn đã được phê duyệt giải ngân!\n\n` +
          `💵 *Số tiền yêu cầu rút:* $${Number(grossAmount).toFixed(2)} USDT\n` +
          `📉 *Tổng phí khấu trừ:* -$${Number(feeAmount).toFixed(2)} USDT\n` +
          `🟢 *✓ Thực nhận giải ngân:* +$${Number(netAmount).toFixed(2)} USDT\n\n` +
          `Tiền đang được chuyển On-Chain về ví cá nhân của bạn. Cảm ơn bạn đã tin tưởng Spartan! 🛡️`;
      }
    } else if (status === 'REJECTED') {
      if (type === 'WITHDRAW') {
        messageText = 
          `⚠️ *[SPARTAN THÔNG BÁO TỪ CHỐI LỆNH RÚT TIỀN]*\n\n` +
          `Lệnh rút *#${txId || 'WDR'}* ($${Number(grossAmount).toFixed(2)} USDT) của bạn đã bị từ chối.\n\n` +
          `📌 *Lý do từ chối:* ${reason || 'Thông tin ví nhận hoặc mạng không hợp lệ'}\n` +
          `💰 *TÌNH TRẠNG TIỀN:* ĐÃ HOÀN TIỀN 100% (+${Number(grossAmount).toFixed(2)} USDT) về lại số dư của bạn!\n` +
          (typeof newBalance === 'number' ? `📊 *Số dư khả dụng hiện tại:* $${Number(newBalance).toFixed(2)} USDT\n\n` : '\n') +
          `Nếu bạn có bất kỳ thắc mắc nào, vui lòng liên hệ Bộ phận Hỗ trợ @tddv2017 để được hỗ trợ tức thì! 🛡️`;
      } else {
        messageText = 
          `⚠️ *[SPARTAN THÔNG BÁO TỪ CHỐI ĐƠN NẠP TIỀN]*\n\n` +
          `Đơn nạp *#${txId || 'DEP'}* ($${Number(grossAmount).toFixed(2)} USDT) của bạn đã bị từ chối.\n\n` +
          `📌 *Lý do:* ${reason || 'Không khớp mã Memo hoặc dữ liệu On-Chain'}\n\n` +
          `👉 *Hướng xử lý:* Bạn có thể mở Mini App để tải ảnh bill chuyển tiền cho AI giám định tự động đối soát, hoặc liên hệ Quản trị viên @tddv2017 để được kiểm tra!`;
      }
    }

    if (!messageText) {
      return NextResponse.json({ success: false, message: 'Invalid notification status' }, { status: 400 });
    }

    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text: messageText,
        parse_mode: 'Markdown'
      })
    });

    const tgData = await tgRes.json();

    return NextResponse.json({
      success: tgData.ok,
      result: tgData
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
