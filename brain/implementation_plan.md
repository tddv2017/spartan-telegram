# Implementation Plan: Telegram Quant Trading Bot Mini App (SharkHunter AI Style)

Thiết kế và xây dựng một **Telegram Mini App (TMA)** dành cho Quant Trading / Auto Bot giao dịch (tương tự mẫu **SharkHunterAIBot** trong hình) với giao diện Dark Theme hiện đại, biểu đồ Equity tăng trưởng, kết nối giá Gold (XAUUSD) thời gian thực, bảng điều khiển Start/Stop, và tích hợp hệ thống thu phí (Deposit/Withdraw Fee Engine: 9% + $3/$5 USD).

---

## 🎯 Mục Tiêu Sản Phẩm (Product Goals)

1. **Giao diện chuẩn Telegram Mini App (TMA):** 
   - Chuẩn UI/UX mobile-first, Dark Theme neon green (#00FF88).
   - Header hiển thị Balance, GEN AI Badge, Referral Income.
   - Biểu đồ đường cong Equity Growth (+1.85% Today).
   - Trạng thái Bot (Active/Hunting), Live Gold Price Feed (XAUUSD).
   - Nút bấm điều khiển `Start` / `Stop`, Quick Support & VIP Channel.
   - Đủ 4 Tab Navigation: Home, Wallet (Nạp/Rút), Analytics/History, Profile/Community.

2. **Hệ Thống Thu Phí & Ví (Fee Engine & Wallet):**
   - **Nạp tiền (Deposit):** Phí 9% + $3 USD cố định.
   - **Rút tiền (Withdraw):** Phí 9% + $5 USD cố định.
   - Phân tích lợi nhuận ròng, quản lý lịch sử giao dịch.
   - Tích hợp Referral link chia hoa hồng giới thiệu.

3. **Backend & Trading Execution Engine:**
   - Kết nối Telegram Bot API (`telegraf` / Telegram WebApp SDK).
   - Giả lập / Kết nối Realtime Price Ticker (XAUUSD / Crypto).
   - Quản lý trạng thái Bot (Active/Paused) & quản lý người dùng theo `telegram_id`.

---

## 🏗️ Kiến Trúc Công Nghệ (Tech Stack)

* **Frontend:** Next.js 14 / React + Tailwind CSS + Lucide Icons + Recharts (Vẽ biểu đồ Equity).
* **Telegram Integration:** `@twa-dev/sdk` (Telegram WebApp SDK chính thức).
* **Backend API:** Node.js (Express / Fastify) hoặc Python (FastAPI).
* **Database:** SQLite / PostgreSQL (Prisma ORM).
* **Payment Engine:** USDT (BEP20 / TRC20) Auto-deposit / Manual Payment Gateway.

---

## 📁 Cấu Trúc Dự Án (Proposed Directory)

**Thư mục dự án:** `/home/quoc/.gemini/antigravity/scratch/telegram-trading-bot-miniapp`

```
telegram-trading-bot-miniapp/
├── src/
│   ├── app/
│   │   ├── page.tsx            # Home Tab (Dashboard SharkHunter style)
│   │   ├── wallet/page.tsx     # Wallet Tab (Nạp/Rút với Fee Engine 9%+$3/$5)
│   │   ├── analytics/page.tsx  # Analytics & History Tab
│   │   └── profile/page.tsx    # Profile & Referral System
│   ├── components/
│   │   ├── BalanceCard.tsx     # Thẻ Total Balance & Badge GEN AI
│   │   ├── EquityChart.tsx     # Biểu đồ Equity tăng trưởng
│   │   ├── BotControls.tsx     # Nút Start/Stop & Bot Status
│   │   ├── LivePrice.tsx       # Live XAUUSD / Crypto Ticker
│   │   └── BottomNav.tsx       # Thanh điều hướng 4 Tab Telegram
│   ├── lib/
│   │   ├── feeCalculator.ts    # Logic tính phí Nạp 9%+$3, Rút 9%+$5
│   │   └── telegram.ts         # Init Telegram WebApp SDK
│   └── types/
└── package.json
```

---

## 📋 Các Bước Triển Khai (Execution Phases)

### Phase 1: Tạo Dự Án & Thiết Kế UI chuẩn SharkHunter (Frontend)
- Khởi tạo Next.js App với Tailwind CSS & Lucide Icons.
- Xây dựng component `BalanceCard` với hiệu ứng Neon Green glow.
- Xây dựng `EquityChart` sử dụng Recharts với độ mịn nét cao.
- Xây dựng `BotStatus` & Nút bấm `Start` (Xanh) / `Stop` (Đỏ border).

### Phase 2: Xây Dựng Hệ Thống Ví & Engine Thu Phí (Fee Engine)
- Tạo module `feeCalculator`:
  - `calcDeposit(amount)`: `net = amount * 0.91 - 3`
  - `calcWithdraw(amount)`: `net = amount * 0.91 - 5`
- Xây dựng UI Nạp/Rút USDT chuyên nghiệp với QR code & hiển thị minh bạch các khoản phí.

### Phase 3: Kết Nối Telegram WebApp SDK & Live Price Feed
- Tích hợp Telegram SDK để lấy thông tin User (`initDataUnsafe.user`).
- Tạo Live Price ticker giả lập/kết nối WebSocket cho cặp XAUUSD (Vàng) & BTCUSDT.

---

## 🧪 Kế Hoạch Kiểm Thử (Verification Plan)

### Automated & Unit Tests
- Kiểm thử unit test cho `feeCalculator` (đảm bảo tính đúng 9% + $3 USD cho Nạp và 9% + $5 USD cho Rút).
- Kiểm thử responsive trên giao diện Mobile Telegram Mini App Viewport.

### Manual Verification
- Chạy `npm run dev` xem trực tiếp giao diện Mini App trên trình duyệt.
- Test nút `Start` / `Stop` cập nhật trạng thái Bot realtime.
- Test quy trình Nạp/Rút thử nghiệm và kiểm tra công thức tính phí.
