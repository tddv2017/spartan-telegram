import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { normalizeTimestampIso } from '@/lib/dateUtils';
import { toErrorResponse } from '@/lib/server/auth';
import { getBotToken, getEaSecretKey } from '@/lib/server/env';
import { dbGet, dbSet } from '@/lib/server/rtdb';

/** Length-safe constant-time comparison, so a wrong key leaks no timing signal. */
function matchesSecret(provided: string, expected: string): boolean {
  const a = crypto.createHash('sha256').update(provided).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  try {
    // 1. API Security Gate Check. The key has no literal fallback: if it is not
    // configured the endpoint must reject everything rather than accept a value
    // that is readable in the repository history.
    const eaSecretKey = getEaSecretKey();
    const authHeader = req.headers.get('x-ea-key') || req.headers.get('authorization');
    const body = await req.json().catch(() => ({}));
    const providedKey = String(authHeader?.replace('Bearer ', '').trim() || body.apiKey || '');

    if (!providedKey || !matchesSecret(providedKey, eaSecretKey)) {
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
      
      // 🛡️ SECURITY DEFENSE: Anomaly PnL Bounds & Lot Size Check (Chống hack PnL giả)
      const cleanLots = Math.min(50, Math.max(0.01, Number(lots) || 0.1));
      let cleanPnl = Number(pnl) || 0;
      const isAnomalous = Math.abs(cleanPnl) > 50000;
      if (isAnomalous) {
        cleanPnl = Math.min(50000, Math.max(-50000, cleanPnl));
        dbSet(`security_alerts/ANOMALY_${Date.now()}`, {
            type: 'PNL_ANOMALY_DETECTED',
            ticket: tradeId,
            rawPnl: pnl,
            rawLots: lots,
            cappedPnl: cleanPnl,
            timestamp: new Date().toISOString()
          }).catch(() => {});
      }

      const cleanPnlPct = Number(pnlPercentage) || (openPrice > 0 ? ((closePrice - openPrice) / openPrice) * 100 : 0);

      const tradeData = {
        id: tradeId,
        type: tradeType,
        symbol: String(symbol).toUpperCase(),
        lots: cleanLots,
        openPrice: Number(openPrice) || 0,
        closePrice: Number(closePrice) || 0,
        pnl: cleanPnl,
        pnlPercentage: Number(cleanPnlPct.toFixed(2)),
        comment: String(comment || '').slice(0, 100),
        magicNumber: Number(magicNumber) || 888899,
        isAnomalous,
        timestamp: normalizeTimestampIso(timestamp)
      };

      // Save to Firebase RTDB /trades/{tradeId}
      await dbSet(`trades/${tradeId}`, tradeData);

      // Automatically Broadcast Live Signal to Telegram Channel if configured
      try {
        const cfg = await dbGet<{ signalChannelId?: string } | null>('system_config').catch(() => null);
        const channelId = cfg?.signalChannelId || process.env.TELEGRAM_SIGNAL_CHANNEL_ID || '';

        if (channelId) {
          const botToken = getBotToken();
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
      await dbSet('master_pool', poolData);

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

  } catch (err) {
    return toErrorResponse(err);
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
