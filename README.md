# Spartan Quant AI - Telegram Mini App

Ứng dụng Telegram Mini App (TMA) cho hệ thống giao dịch tự động **Spartan Quant AI / Spartan Trading System**.

---

## 🚀 TÍNH NĂNG NỔI BẬT

1. **Khả năng tự động kết nối tài khoản Telegram:** Zero-friction authentication qua `window.Telegram.WebApp`.
2. **Hệ thống thu phí Nạp & Rút tiền tự động (Fee Engine):**
   - Phí Nạp tiền: **9% + $3.00 USD** (Công thức: `Net = Amount * 0.91 - 3`).
   - Phí Rút tiền: **9% + $5.00 USD** (Công thức: `Net = Amount * 0.91 - 5`).
3. **Quản lý Số dư & Lịch sử Nạp/Rút Realtime:** Tự động cộng dồn số dư Net, cập nhật bảng Lịch sử Nạp/Rút realtime khi khách bấm xác nhận.
4. **Phân Quyền Admin Đặc Quyền (`@tddv2017`):**
   - Tab **ADMIN** dành riêng cho tài khoản Super Admin `@tddv2017`.
   - Hàng đợi Duyệt lệnh Rút tiền Pending Queue (`[ PHÊ DUYỆT ]` / `[ TỪ CHỐI ]`).
   - Bảng Quản lý Danh sách 100+ Khách hàng (Client Directory) kèm Thanh tìm kiếm, Bộ lọc trạng thái Bot & Modal Pop-up xem chi tiết khách hàng.
   - Công tắc Master Switch bật/tắt toàn bộ Copy-Trade và Hệ thống tin nhắn Broadcast tới 100+ Clients.
5. **Thiết kế chuẩn Spartan Trading System:** Tông màu Đêm Midnight `#0B0E17`, Cam Spartan `#FF5500`, Xanh Mint `#00DF89`, Đỏ Magenta `#FF2D55` và điểm xuyết Ánh Tím công nghệ.

---

## 📂 CẤU TRÚC DỰ ÁN

```
telegram-trading-bot-miniapp/
├── brain/                             # Tài liệu Kiến trúc, Báo cáo QA & Kế hoạch
│   ├── backend_architecture_spec.md   # Thiết kế Cơ sở dữ liệu PostgreSQL & Master Exness Listener
│   ├── implementation_plan.md         # Kế hoạch triển khai & Yêu cầu sản phẩm
│   ├── qa_test_report.md              # Báo cáo Kiểm thử QA Audit 12/12 Kịch bản
│   └── walkthrough.md                 # Nhật ký phát triển & Hướng dẫn sử dụng
├── src/
│   ├── app/
│   │   ├── globals.css                # Style Tailwind CSS & Spartan Gradient Utilities
│   │   ├── layout.tsx                 # Root layout tích hợp Telegram WebApp SDK
│   │   └── page.tsx                   # Main router quản lý Tab Navigation
│   ├── components/
│   │   ├── Header.tsx                 # App Header & Badge "BOT ĐANG CHẠY"
│   │   ├── BalanceCard.tsx            # Thẻ Số Dư Tổng Hợp (Gồm Vốn & Hoa hồng Đại lý)
│   │   ├── EquityChart.tsx            # Biểu đồ Account Growth Curve màu Cam Spartan
│   │   ├── BotStatusCard.tsx          # Trạng thái Bot & Giá Vàng XAUUSD realtime
│   │   ├── ActionButtons.tsx          # Nút Bật/Tắt Bot (Engage / Standby)
│   │   ├── QuantStrategyCard.tsx      # Thẻ thông tin Chiến lược Spartan 300 AI
│   │   ├── WalletView.tsx             # Tab Đầu Tư: Nạp/Rút, Fee Engine & Lịch Sử Realtime
│   │   ├── AnalyticsView.tsx          # Tab Tổng Quan: Performance Analytics
│   │   ├── TradeHistoryCard.tsx       # Bảng Lịch Sử Giao Dịch (Exness ECN)
│   │   ├── ProfileView.tsx            # Tab Đại Lý: Link Ref 5% & Danh Sách 10 Người Giới Thiệu
│   │   ├── AdminPanel.tsx             # Tab ADMIN: Duyệt lệnh Rút, Client Directory & Modal Chi Tiết
│   │   └── BottomNav.tsx              # Thanh Điều Hướng Đáy (Tab Navigation)
│   └── lib/
│       ├── adminAuth.ts               # Thư viện Phân Quyền Admin (@tddv2017)
│       └── feeCalculator.ts           # Động cơ tính phí Nạp 9%+$3 & Rút 9%+$5
├── package.json
└── README.md
```

---

## 🛠️ HƯỚNG DẪN KHỞI CHẠY (LOCAL DEV)

```bash
# 1. Cài đặt dependencies
npm install

# 2. Chạy ứng dụng ở môi trường Development
npm run dev

# 3. Mở trình duyệt tại: http://localhost:3000
```

---

## 📑 HỒ SƠ TÀI LIỆU LƯU TRỮ (BRAIN ARCHIVE)

Tất cả tài liệu phân tích kỹ thuật, báo cáo QA kiểm thử và sơ đồ kiến trúc Backend đều được lưu trữ hoàn chỉnh tại thư mục [`/brain`](./brain/).
