import { NextResponse } from 'next/server';

const BOT_TOKEN = process.env.BOT_TOKEN || '8897704483:AAFRtOHaF4UdH25pgf_IffQUNpCAy0YFp_Q';
const RTDB_BASE_URL = 'https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      channelId: inputChannelId, 
      symbol = 'XAUUSD', 
      type = 'BUY', 
      lots = 0.5, 
      pnl = 365.00, 
      pnlPercentage = 1.46,
      openPrice = 2498.50,
      closePrice = 2505.80,
      isTest = false 
    } = body;

    // Get Channel ID from request or Firebase config
    let targetChannel = inputChannelId;
    if (!targetChannel) {
      const cfgRes = await fetch(`${RTDB_BASE_URL}/system_config.json`);
      if (cfgRes.ok) {
        const cfg = await cfgRes.json();
        if (cfg?.signalChannelId) targetChannel = cfg.signalChannelId;
      }
    }

    if (!targetChannel) {
      return NextResponse.json({ 
        success: false, 
        message: 'Chưa cấu hình Telegram Channel ID! Vui lòng nhập Username Kênh (vd: @SpartanQuant_Signals) hoặc ID nhóm (-100...)' 
      }, { status: 400 });
    }

    const isWin = Number(pnl) >= 0;
    const cleanPnl = Number(pnl) || 0;
    const cleanPct = Number(pnlPercentage) || 0;

    const testTag = isTest ? '⚡ [TÍN HIỆU THỬ NGHIỆM TỪ ADMIN]\n\n' : '';
    const statusHeader = isWin 
      ? '🎯 *[SPARTAN QUANT 300 AI • CHỐT LỜI THÀNH CÔNG]*' 
      : '🛡️ *[SPARTAN QUANT 300 AI • BẢO TOÀN RỦI RO STOPLOSS]*';

    const messageText = 
      `${testTag}${statusHeader}\n\n` +
      `📊 *Cặp giao dịch:* #${symbol} (Gold Scalp M5)\n` +
      `📌 *Vị thế:* ${type} ${lots} Lot\n` +
      `💵 *Lợi nhuận Master Pool:* *${isWin ? '+' : ''}$${cleanPnl.toFixed(2)} USD* (${isWin ? '+' : ''}${cleanPct.toFixed(2)}%)\n` +
      `⏱ *Khớp lệnh:* ${openPrice} ➔ ${closePrice}\n` +
      `👥 *Phân bổ vốn:* Toàn bộ nhà đầu tư đã được tự động chia lãi vào tài khoản theo đúng % cổ phần!\n\n` +
      `🚀 *Tham gia góp vốn & nhận chia sẻ lợi nhuận 24/7 cùng Bot tại:*`;

    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChannel,
        text: messageText,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🚀 VÀO MINI APP NHẬN LÃI NGAY",
                url: "https://t.me/SpartanQuantAIBot"
              }
            ]
          ]
        }
      })
    });

    const tgData = await tgRes.json();

    if (!tgData.ok) {
      return NextResponse.json({
        success: false,
        message: `Lỗi gửi tin nhắn đến Telegram: ${tgData.description || 'Vui lòng kiểm tra Bot đã được thêm làm Quản trị viên (Admin) của Kênh chưa!'}`,
        telegramError: tgData
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `✓ Đã bắn tín hiệu thành công vào Kênh ${targetChannel}!`,
      data: tgData.result
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: 'Lỗi máy chủ phát tín hiệu: ' + err.message
    }, { status: 500 });
  }
}
