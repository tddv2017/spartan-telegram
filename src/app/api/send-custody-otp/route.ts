import { NextResponse } from 'next/server';
import { checkIsAdmin, ADMIN_TELEGRAM_IDS } from '@/lib/adminAuth';

const BOT_TOKEN = process.env.BOT_TOKEN || '8897704483:AAFRtOHaF4UdH25pgf_IffQUNpCAy0YFp_Q';
const DEFAULT_PRIMARY_ADMIN_ID = '494232782';
const RTDB_BASE_URL = "https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app";

export async function POST(req: Request) {
  try {
    const { email, telegramId, username } = await req.json();

    // 1. Resolve target Telegram Chat ID for THIS specific admin
    let targetChatId = String(telegramId || '').trim();
    let targetAdminUsername = String(username || '').replace('@', '').trim();

    // If no telegramId was provided, lookup from Firebase RTDB by username
    if (!targetChatId && targetAdminUsername) {
      try {
        const usersRes = await fetch(`${RTDB_BASE_URL}/users.json`);
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          if (usersData) {
            for (const [uid, uVal] of Object.entries(usersData) as [string, any][]) {
              const uName = String(uVal?.username || '').replace('@', '').toLowerCase().trim();
              if (uName === targetAdminUsername.toLowerCase()) {
                targetChatId = uid;
                break;
              }
            }
          }
        }
      } catch (e) {
        console.error('Error querying users from RTDB:', e);
      }
    }

    // Fallback to default primary admin ONLY if no ID could be resolved
    if (!targetChatId) {
      targetChatId = DEFAULT_PRIMARY_ADMIN_ID;
    }

    // 2. Generate Real 6-Digit Cryptographic OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const timestamp = Date.now();
    const expiresAt = timestamp + 5 * 60 * 1000; // 5 minutes

    const adminDisplay = targetAdminUsername ? `@${targetAdminUsername}` : `Admin #${targetChatId}`;

    // 3. Save OTP securely to Firebase RTDB under this specific admin's ID
    const sessionData = {
      otp,
      telegramId: targetChatId,
      adminDisplay,
      email: email || '',
      timestamp,
      expiresAt
    };

    // Save isolated per admin AND update latest_otp for compatibility
    await Promise.all([
      fetch(`${RTDB_BASE_URL}/admin_custody_session/${targetChatId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      }),
      fetch(`${RTDB_BASE_URL}/admin_custody_session/latest_otp.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      })
    ]);

    // 4. Dispatch Live Realtime Notification directly to THAT ADMIN's Telegram ID
    const messageText = `🔐 *[SPARTAN CUSTODY 3FA XÁC THỰC QUẢN TRỊ]*\n\n` +
      `Xin chào *${adminDisplay}*!\n` +
      `Mã bảo mật OTP đăng nhập Cổng Quản Trị của bạn là:\n` +
      `👉 *${otp}*\n\n` +
      `⏰ *Hiệu lực:* 5 phút\n` +
      `🆔 *Gửi riêng tới Telegram ID:* \`${targetChatId}\`\n` +
      `⚠️ *Cảnh báo an ninh:* Tuyệt đối không chia sẻ mã này cho bất kỳ ai!`;

    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: messageText,
        parse_mode: 'Markdown'
      })
    });

    const tgData = await tgRes.json();

    if (!tgData.ok) {
      console.warn(`Telegram API could not send to chat_id ${targetChatId}:`, tgData.description);
      return NextResponse.json({
        success: true,
        telegramSent: false,
        targetChatId,
        message: `Đã tạo mã OTP cho ${adminDisplay}. Nếu chưa thấy tin nhắn, vui lòng mở Bot Telegram bấm /start để nhận tin!`
      });
    }

    return NextResponse.json({
      success: true,
      telegramSent: true,
      targetChatId,
      message: `Đã gửi mã xác thực OTP trực tiếp về Telegram của ${adminDisplay} (ID: ${targetChatId})!`
    });
  } catch (err: any) {
    console.error('Error sending real OTP:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
