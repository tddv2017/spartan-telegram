---
name: saas-feature-builder
description: >-
  Use this skill whenever planning, scaffolding, or implementing a new SaaS feature, 
  CRUD module, interactive UI view, or user workflow. Enforces schema-first architecture, 
  high-density fintech UX/UI, defensive error handling, and mandatory build verification.
---

# SaaS Feature Builder Standard Operating Procedure (SOP)

This skill guides the implementation of end-to-end features for modern SaaS applications. Follow these 5 phases in strict sequence.

---

## PHẦN 1: KHỞI TẠO & THIẾT KẾ MÔ HÌNH DỮ LIỆU (SCHEMA FIRST)
1. **Định nghĩa TypeScript Interfaces:**
   - Tạo hoặc cập nhật interfaces trong thư mục `@/types/` hoặc phần đầu service file.
   - Bắt buộc luôn có các trường kiểm toán (Audit Trail):
     ```typescript
     export interface StandardRecord {
       id: string;              // Unique identifier
       userId: string;          // Multi-tenant isolation key
       createdAt: string;       // ISO 8601 Timestamp
       updatedAt?: string;      // ISO 8601 Timestamp
       status: 'ACTIVE' | 'PENDING' | 'ARCHIVED';
     }
     ```
2. **Ràng buộc toàn vẹn dữ liệu (Data Integrity):**
   - Không cho phép số âm đối với các trường số lượng/tiền tệ (`Math.max(0, val)`).
   - Sanitize chuỗi đầu vào (cắt tỉa khoảng trắng, chống XSS).

---

## PHẦN 2: TẦNG SERVICE & BACKEND API
1. **Quy chuẩn API Route (`src/app/api/<feature>/route.ts`):**
   - Mọi logic phải nằm trong khối `try/catch` có bắt lỗi chi tiết.
   - Kiểm tra xác thực danh tính ngay dòng đầu tiên (JWT / Telegram HMAC / Session).
   - Chuẩn hóa cấu trúc phản hồi JSON:
     ```typescript
     // Thành công
     return NextResponse.json({ success: true, data: result, message: '...' });
     // Thất bại
     return NextResponse.json({ success: false, message: 'Thông báo lỗi thân thiện' }, { status: 400 });
     ```
2. **Nguyên tắc Phòng thủ Không Thờ Ơ (Zero-Trust):**
   - Tuyệt đối không tin cậy dữ liệu do client gửi lên (giá tiền, quyền hạn, số dư).
   - Luôn tính toán lại phí và số dư ở phía máy chủ (Server-side validation).

---

## PHẦN 3: GIAO DIỆN NGƯỜI DÙNG CHUẨN ĐỊNH CHẾ (INSTITUTIONAL LUXURY UI)
1. **Thẩm mỹ thị giác:**
   - Phối màu chuẩn: Nền đen sâu (`#04060a`, `#080b12`), viền kim loại mảnh (`#221c10`), điểm nhấn Vàng Hoàng Gia 24K (`#d4af37`, `#f5d77f`).
   - Font số học: Dùng font Monospace (`font-mono`) cho toàn bộ số tiền, phần trăm, mã TxID.
2. **Trạng thái tương tác bắt buộc:**
   - **Loading State:** Nút bấm phải hiển thị spinner (`Loader2`) và disable khi đang thực thi.
   - **Empty State:** Khi danh sách trống, hiển thị biểu tượng mờ và dòng thông báo hướng dẫn.
   - **Dangerous Action:** Thao tác xóa, rút tiền hoặc đổi cấu hình phải có Modal xác nhận 2 bước.

---

## PHẦN 4: AN NINH & BẢO VỆ DÒNG TIỀN
1. **Chống Tấn Công Đồng Thời (Race Condition / Double-Spend):**
   - Với các hành động rút tiền/trừ điểm: Kiểm tra xem người dùng có thao tác nào đang ở trạng thái `PENDING` hay không trước khi cho phép tạo lệnh mới.
2. **Bảo vệ Bí Mật:**
   - Không lưu Master PIN hoặc Secret Key dạng plaintext trong `localStorage`.

---

## PHẦN 5: NGHIỆM THU BẮT BUỘC (PRE-FLIGHT VERIFICATION)
Trước khi thông báo hoàn tất cho người dùng, BẮT BUỘC phải thực hiện đủ 3 bước kiểm tra:
1. Chạy `./node_modules/.bin/tsc --noEmit` -> Đảm bảo **0 lỗi TypeScript**.
2. Chạy `./node_modules/.bin/next build` -> Đảm bảo **biên dịch production thành công**.
3. Nếu có lỗi, tự động sửa ngay lập tức đến khi build xanh 100%.
