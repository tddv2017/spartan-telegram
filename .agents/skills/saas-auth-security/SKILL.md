---
name: saas-auth-security
description: >-
  Use this skill whenever configuring authentication, session management, 
  role-based access control (RBAC), multi-factor authentication (3FA/TOTP), 
  or verifying Telegram initData HMAC-SHA256 signatures. Enforces Zero-Trust standards.
---

# SaaS Authentication & Security Playbook

This skill establishes enterprise-grade security protocols for identity verification and administrative access control.

---

## QUY CHUẨN XÁC THỰC DANH TÍNH (AUTHENTICATION STANDARDS)

### 1. Telegram Mini App Authentication (`initData` Verification)
- **Cấm Tuyệt Đối:** Sử dụng trực tiếp `initDataUnsafe.user` mà không qua kiểm tra chữ ký số mật mã.
- **Quy Trình Chuẩn HMAC-SHA256:**
  1. Client gửi nguyên chuỗi raw `Telegram.WebApp.initData` trong Header `x-telegram-init-data`.
  2. Server tính toán `secretKey = HMAC-SHA256("WebAppData", BOT_TOKEN)`.
  3. Server băm `data_check_string` và so sánh với `hash` bằng `crypto.timingSafeEqual`.
  4. Kiểm tra `auth_date` không được cũ quá 24 giờ (chống Replay Attack).

### 2. Cổng Quản Trị Độc Lập (`/admin` Multi-Layer 3FA)
- **Tầng 1:** Master PIN bí mật (băm muối PBKDF2/SHA-256 trên server, không lưu plaintext).
- **Tầng 2:** Mã OTP Server Live gửi trực tiếp về thiết bị di động/Telegram Admin.
- **Tầng 3:** Mã 2FA Google/Binance Authenticator xoay vòng 30 giây (RFC 6238 TOTP).
- **Phiên Đăng Nhập:** Cấp `AdminSessionJWT` lưu trong cookie `HttpOnly Secure SameSite`, tự hủy sau 30 phút.

---

## PHÂN QUYỀN VAI TRÒ (ROLE-BASED ACCESS CONTROL - RBAC)
1. **CLIENT:** Chỉ có quyền xem số dư của mình, tạo đơn nạp/rút cho chính mình.
2. **RESELLER:** Có quyền xem danh sách F1/F2 và hoa hồng giới thiệu của mình.
3. **TECH_OPS:** Có quyền xem nhật ký hệ thống, khởi động lại bot, không có quyền duyệt tiền.
4. **ACCOUNTANT:** Có quyền xem sổ cái kế toán và đối soát, không có quyền đổi cấu hình admin.
5. **SUPREME LEADER (ADMIN):** Toàn quyền duyệt nạp/rút, thay đổi tỷ lệ phí, kích hoạt Kill-Switch.

---

## BẢO VỆ CƠ SỞ DỮ LIỆU (DATABASE SECURITY RULES)
- Khóa toàn bộ quyền ghi tự do từ Client thông thường (`.write: auth != null`).
- Ràng buộc cấp dữ liệu: `tradingBalance >= 0`.
- Bảng mã băm đã dùng (`used_tx_hashes`): Thuộc tính Bất Biến (Chỉ được ghi 1 lần, không được sửa hoặc xóa).
