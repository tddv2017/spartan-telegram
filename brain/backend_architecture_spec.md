# Technical Specification: Spartan Quant AI (Demo to Production Transition)

Kiến trúc kỹ thuật và Cơ sở dữ liệu (Database Schema) để chuyển đổi từ bản **Demo Prototype** sang hệ thống **Production chính thức** cho dự án **Spartan Quant AI Telegram Mini App**.

---

## 🏗️ 1. Tổng Quan Kiến Trúc Hệ Thống (System Architecture)

```
[ 📱 TELEGRAM MINI APP FRONTEND ] (Next.js 14)
   │
   ├── Authenticate via Telegram WebApp initData (HMAC SHA-256)
   ├── Realtime REST / WebSocket API
   │
[ ⚙️ BACKEND API SERVER ] (Node.js / Express / Python FastAPI)
   │
   ├── 📂 Database (PostgreSQL / SQLite + Prisma ORM)
   │     ├── Users Table (telegram_id, demo_balance, real_balance, bot_status)
   │     ├── Transactions Table (type: DEPOSIT/WITHDRAW, gross, fee, net, tx_hash)
   │     └── MasterTrades Table (pair, type, lot, pnl, timestamp)
   │
   ├── 🧮 Fee Engine (Deposit: 9% + $3 USD | Withdraw: 9% + $5 USD)
   │
   └── 🔄 Master Pool Allocation Engine (PAMM / Allocation Formula)
         │
         ▼ (Sync Trades & PnL)
[ 📈 EXNESS MT5 MASTER ACCOUNT ] (Single Pool Account)
```

---

## 🗄️ 2. Thiết Kế Cơ Sở Dữ Liệu (Database Schema Specification)

### Table 1: `users`
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    real_balance DECIMAL(18, 2) DEFAULT 0.00,
    demo_balance DECIMAL(18, 2) DEFAULT 1000.00,
    bot_status VARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE' or 'STOPPED'
    referral_code VARCHAR(50) UNIQUE,
    referred_by BIGINT REFERENCES users(telegram_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Table 2: `transactions`
```sql
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(telegram_id),
    type VARCHAR(20) NOT NULL, -- 'DEPOSIT' or 'WITHDRAW'
    gross_amount DECIMAL(18, 2) NOT NULL,
    percentage_fee DECIMAL(18, 2) NOT NULL, -- 9%
    fixed_fee DECIMAL(18, 2) NOT NULL,      -- $3.00 for Deposit, $5.00 for Withdraw
    net_amount DECIMAL(18, 2) NOT NULL,
    tx_hash VARCHAR(255),
    status VARCHAR(20) DEFAULT 'COMPLETED', -- 'PENDING', 'COMPLETED', 'REJECTED'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Table 3: `master_trades`
```sql
CREATE TABLE master_trades (
    id SERIAL PRIMARY KEY,
    ticket_id VARCHAR(100) UNIQUE NOT NULL,
    symbol VARCHAR(50) DEFAULT 'XAUUSD',
    type VARCHAR(10) NOT NULL, -- 'BUY' or 'SELL'
    lot_size DECIMAL(10, 2) NOT NULL,
    entry_price DECIMAL(18, 4) NOT NULL,
    close_price DECIMAL(18, 4),
    profit_loss DECIMAL(18, 2) NOT NULL,
    pnl_percentage DECIMAL(10, 4) NOT NULL, -- e.g. +1.85%
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🧮 3. Công Thức Chia Tỷ Lệ Lợi Nhuận Master Pool (Allocation Engine)

Khi Bot MQL5 chốt một lệnh trên tài khoản Master Exness:

1. **Tính % Lợi nhuận của Master Pool:**
   $$\text{PnL \%} = \left( \frac{\text{Lợi nhuận lệnh Master}}{\text{Tổng vốn Master Pool trước lệnh}} \right) \times 100$$

2. **Cập nhật tự động cho toàn bộ User đang có `bot_status = ACTIVE`:**
   $$\text{Số dư mới User}_i = \text{Số dư cũ User}_i \times \left(1 + \frac{\text{PnL \%}}{100}\right)$$

---

## 🚀 4. Kế Hoạch Chuyển Đổi Từng Bước (Roadmap Demo to Production)

1. **Giai đoạn 1: Demo Sandbox (Hiện tại - Đã xong)**
   - Giao diện UI Next.js / Tailwind mượt mà.
   - Thử nghiệm Nạp/Rút giả lập với Fee Engine (9% + $3/$5).
   - Bật/Tắt Bot giả lập và chạy biểu đồ PnL sinh động.

2. **Giai đoạn 2: Ghép nối Backend Server & Telegram Bot API**
   - Đăng ký Telegram Bot với `@BotFather` và cài đặt Menu Button trỏ về Web App URL.
   - Xây dựng REST API Node.js / Express kết nối PostgreSQL Database.

3. **Giai đoạn 3: Kết nối Master Account Exness & Go Live**
   - Mở tài khoản Master Exness ECN và nạp vốn ban đầu.
   - Cài đặt MQL5 Trade Listener / Python MT5 Library để tự động đồng bộ PnL về Database khi lệnh đóng.
