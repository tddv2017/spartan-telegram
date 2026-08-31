# 🌐 TELEGRAM NATIVE WEB3 TON CONNECT & SMART CONTRACT SIGNER SPECIFICATION

---

## 📌 PHẦN 1: TỔNG QUAN MÔ HÌNH TELEGRAM WEB3 NATIVE

Đưa dòng tiền nạp/rút và ký duyệt giao dịch về trực tiếp **Ví Telegram Chính Thức (`@Wallet` / TON Connect SDK)** là giải pháp công nghệ **ĐỈNH CAO NHẤT, AN TOÀN PHÁP LÝ 100% VÀ TỐI ƯU TRẢI NGHIỆM KHÁCH HÀNG (UX)**.

```
[Khách Hàng Telegram] 
        │ 
        ├──► Nắm giữ ví cá nhân tại Telegram Wallet (@Wallet / TONkeeper)
        │
[Telegram Mini App (Spartan Quant AI)] 
        │ 
        ├──► Khách bấm "Nạp / Đặt Lệnh / Thuê Báo" 
        │ 
        ├──► Bật Pop-up Ký Duyệt Web3 Native trên Telegram Wallet 
        │ 
        └──► Khách quét FaceID / TouchID Ký Duyệt (Self-Custody Signed Transaction)
```

---

## 🛡️ PHẦN 2: LỢI ÍCH VƯỢT TRỘI VỀ PHÁP LÝ & CÔNG NGHỆ

| Yếu Tố | Mô Hình Cũ (Ví Tổng Manual) | Mô Hình Telegram Web3 TON Connect |
|---|---|---|
| **Lưu Giữ Vốn (Custody)** | Bạn phải giữ tiền ví tổng $\rightarrow$ Rủi ro pháp lý | 🟢 **PHI LƯU KÝ 100% (Self-Custody): Khách tự giữ 100% tiền trên Ví Telegram cá nhân.** |
| **Ký Duyệt Giao Dịch** | Chuyển khoản thủ công + Memo | 🟢 **Ký duyệt Web3 Native bằng FaceID/TouchID trực tiếp trên Ví Telegram.** |
| **Pháp Lý (Nghị định 284 & AML)** | Dễ dính rủi ro lưu ký trái phép | 🟢 **Hợp pháp 100%: Giao dịch Web3 phi tập trung do chính người dùng sở hữu chữ ký số.** |
| **Trải Nghiệm Khách (UX)** | Phức tạp (Copy địa chỉ, copy Memo) | 🟢 **Chỉ 1 chạm "Connect Wallet" & "Sign" — Đỉnh cao công nghệ Telegram 2026!** |

---

## 🛠️ PHẦN 3: LUỒNG HOẠT ĐỘNG KỸ THUẬT 3 BƯỚC

### 1️⃣ Kết Nối Ví Telegram (`TON Connect SDK Integration`):
- Khi khách mở Mini App, ở góc trên giao diện hiển thị nút: **`[ 💎 Connect Telegram Wallet ]`**.
- Khách bấm vào, ứng dụng gọi `@tonconnect/ui-react` tự động kết nối với Ví Telegram `@Wallet` hoặc Ví TONkeeper của khách trong **0.5 giây**.

### 2️⃣ Khởi Tạo Lệnh & Ký Duyệt On-Chain (`Native Smart Contract Signing`):
- Khách muốn Nạp vốn / Thuê bao License / Gửi vốn Kopie:
- Khách nhập số tiền (VD: $1,000 USDT TRC20 / TON-USDT) $\rightarrow$ Bấm **`[ 🚀 KÝ DUYỆT GIAO DỊCH ]`**.
- Màn hình Telegram nổ Pop-up chuẩn Web3:  
  `"Bạn có đồng ý ký xác nhận chuyển 1,000 USDT tới Smart Contract Spartan Quant AI không?"`
- Khách quét **FaceID / Vân Tay** để Ký (Sign Payload).

### 3️⃣ Xử Lý Lệnh Tự Động Phía Backend (`Web3 Event Listener`):
- Smart Contract trên Blockchain tự động thực thi lệnh đã ký.
- Backend Firebase tự động lắng nghe Sự kiện On-Chain (Web3 Event Listener) và cập nhật số dư cho khách **TỨC THÌ TRONG 2 GIÂY** mà không cần Admin phê duyệt thủ công!
