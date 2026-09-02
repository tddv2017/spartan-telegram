import { NextResponse } from 'next/server';

const RTDB_BASE_URL = "https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app";
const EA_SECRET_KEY = process.env.EA_SECRET_KEY || 'SPARTAN_EA_LIVE_2026';

export async function POST(req: Request) {
  try {
    // 1. API Security Gate Check
    const authHeader = req.headers.get('x-ea-key') || req.headers.get('authorization');
    const body = await req.json().catch(() => ({}));
    const providedKey = authHeader?.replace('Bearer ', '').trim() || body.apiKey;

    if (providedKey !== EA_SECRET_KEY) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED: Khóa API EA không chính xác hoặc không có quyền truy cập!' },
        { status: 401 }
      );
    }

    const { action, event } = body;
    const resolvedAction = action || event || 'HEARTBEAT';

    // 2. Action: TRADE_CLOSED / DEAL_ADD (MQL5 EA chốt lệnh Vàng XAUUSD)
    if (resolvedAction === 'TRADE_CLOSED' || resolvedAction === 'DEAL_ADD' || resolvedAction === 'TRADE') {
      const {
        ticket,
        id,
        type,
        symbol = 'XAUUSD',
        lots = 0.1,
        openPrice = 0,
        closePrice = 0,
        pnl = 0,
        pnlPercentage = 0,
        comment = '',
        magicNumber = 888899,
        timestamp
      } = body;

      const tradeId = String(ticket || id || `T_${Date.now()}`);
      const tradeType = String(type).toUpperCase().includes('SELL') ? 'SELL' : 'BUY';
      const cleanPnl = Number(pnl) || 0;
      const cleanPnlPct = Number(pnlPercentage) || (openPrice > 0 ? ((closePrice - openPrice) / openPrice) * 100 : 0);

      const tradeData = {
        id: tradeId,
        type: tradeType,
        symbol: String(symbol).toUpperCase(),
        lots: Number(lots) || 0.1,
        openPrice: Number(openPrice) || 0,
        closePrice: Number(closePrice) || 0,
        pnl: cleanPnl,
        pnlPercentage: Number(cleanPnlPct.toFixed(2)),
        comment: String(comment || ''),
        magicNumber: Number(magicNumber) || 888899,
        timestamp: timestamp || new Date().toISOString()
      };

      // Save to Firebase RTDB /trades/{tradeId}
      await fetch(`${RTDB_BASE_URL}/trades/${tradeId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradeData)
      });

      // Automatically Broadcast Live Signal to Telegram Channel if configured
      try {
        const configRes = await fetch(`${RTDB_BASE_URL}/system_config.json`);
        let channelId = process.env.TELEGRAM_SIGNAL_CHANNEL_ID || '';
        if (configRes.ok) {
          const cfg = await configRes.json();
          if (cfg?.signalChannelId) channelId = cfg.signalChannelId;
        }

        if (channelId) {
          const botToken = process.env.BOT_TOKEN || '8897704483:AAFRtOHaF4UdH25pgf_IffQUNpCAy0YFp_Q';
          const isWin = cleanPnl >= 0;
          const statusHeader = isWin 
            ? '🎯 *[SPARTAN QUANT 300 AI • CHỐT LỜI THÀNH CÔNG]*' 
            : '🛡️ *[SPARTAN QUANT 300 AI • BẢO TOÀN RỦI RO STOPLOSS]*';

          const signalMessage = 
            `${statusHeader}\n\n` +
            `📊 *Cặp giao dịch:* #${tradeData.symbol} (Gold Scalp M5)\n` +
            `📌 *Vị thế:* ${tradeData.type} ${tradeData.lots} Lot\n` +
            `💵 *Lợi nhuận Master Pool:* *${isWin ? '+' : ''}$${cleanPnl.toFixed(2)} USD* (${isWin ? '+' : ''}${cleanPnlPct.toFixed(2)}%)\n` +
            (openPrice > 0 ? `⏱ *Khớp lệnh:* ${openPrice} ➔ ${closePrice}\n` : '') +
            `👥 *Phân bổ:* 100% nhà đầu tư có vốn góp đã được tự động chia lãi vào tài khoản!\n\n` +
            `🚀 *Tham gia góp vốn & nhận chia sẻ lợi nhuận 24/7 cùng Bot tại:*`;

          fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: channelId,
              text: signalMessage,
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
          }).catch(() => {});
        }
      } catch (broadcastErr) {}

      return NextResponse.json({
        success: true,
        message: `✓ Đã đồng bộ lệnh ${tradeType} ${tradeData.symbol} (#${tradeId}) vào hệ thống thành công!`,
        trade: tradeData
      });
    }

    // 3. Action: HEARTBEAT (MQL5 EA báo cáo số dư Master Exness định kỳ)
    if (resolvedAction === 'HEARTBEAT' || resolvedAction === 'POOL_SYNC') {
      const {
        accountNumber = '9824029',
        broker = 'Exness',
        server = 'Exness-Real21',
        balance = 0,
        equity = 0,
        floatingProfit = 0,
        margin = 0,
        freeMargin = 0,
        marginLevel = 0,
        openPositions = 0
      } = body;

      const poolData = {
        accountNumber: String(accountNumber),
        broker: String(broker),
        server: String(server),
        balance: Number(balance) || 0,
        equity: Number(equity) || 0,
        floatingProfit: Number(floatingProfit) || 0,
        margin: Number(margin) || 0,
        freeMargin: Number(freeMargin) || 0,
        marginLevel: Number(marginLevel) || 0,
        openPositions: Number(openPositions) || 0,
        lastHeartbeat: new Date().toISOString(),
        status: 'ONLINE'
      };

      // Update /master_pool.json in Firebase RTDB
      await fetch(`${RTDB_BASE_URL}/master_pool.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(poolData)
      });

      return NextResponse.json({
        success: true,
        message: '✓ Nhận tín hiệu Heartbeat từ Exness MT5 Master thành công!',
        pool: poolData,
        serverTime: Date.now()
      });
    }

    // 4. Action: PING (Kiểm tra thông mạng)
    return NextResponse.json({
      success: true,
      status: 'ONLINE',
      server: 'SPARTAN_INSTITUTIONAL_CORE',
      timestamp: Date.now()
    });

  } catch (err: any) {
    console.error('Lỗi EA Webhook Route:', err);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error: ' + err.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ONLINE',
    service: 'Spartan MT4/MT5 EA Webhook Gateway',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
}
