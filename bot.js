/**
 * Spartan Quant AI - Telegram Bot Listener (Zero Dependency Polling Server)
 * Responds to /start, /app, /wallet, /admin commands instantly with WebApp buttons.
 */

const BOT_TOKEN = process.env.BOT_TOKEN || '8897704483:AAFRtOHaF4UdH25pgf_IffQUNpCAy0YFp_Q';
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://spartan-telegram.vercel.app';

if (!BOT_TOKEN) {
  console.log('⚠️ Vui lòng nhập BOT_TOKEN từ @BotFather vào file .env hoặc chạy: BOT_TOKEN="your_token" node bot.js');
}

let offset = 0;

async function pollUpdates() {
  if (!BOT_TOKEN) return;

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${offset}&timeout=30`);
    const data = await res.json();

    if (data.ok && data.result.length > 0) {
      for (const update of data.result) {
        offset = update.update_id + 1;
        
        if (update.message && update.message.text) {
          const chatId = update.message.chat.id;
          const text = update.message.text.trim();
          const username = update.message.from.username || update.message.from.first_name;

          console.log(`📩 Nhận tin nhắn từ @${username}: ${text}`);

          if (text.startsWith('/start') || text.startsWith('/app') || text.startsWith('/wallet')) {
            await sendMessageWithWebApp(chatId, username);
          }
        }
      }
    }
  } catch (err) {
    console.error('Polling error:', err.message);
  }

  setTimeout(pollUpdates, 1000);
}

async function sendMessageWithWebApp(chatId, username) {
  const welcomeText = `⚔️ *CHÀO MỪNG CHIẾN BINH @${username} ĐẾN VỚI SPARTAN QUANT AI!*\n\nHệ thống giao dịch định lượng AI & Copy Trade tự động hàng đầu.\n\n👇 Bấm nút bên dưới để mở giao diện Mini App:`;

  const payload = {
    chat_id: chatId,
    text: welcomeText,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '⚔️ MỞ SPARTAN AI MINI APP',
            web_app: { url: WEBAPP_URL },
          },
        ],
        [
          { text: '📊 Nhóm Tín Hiệu Telegram', url: 'https://t.me' },
          { text: '💬 Hỗ Trợ Admin (@tddv2017)', url: 'https://t.me/tddv2017' },
        ],
      ],
    },
  };

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// Start bot polling listener
if (BOT_TOKEN) {
  console.log(`🚀 Spartan Telegram Bot Listener đang kết nối Vercel: ${WEBAPP_URL}`);
  pollUpdates();
}
