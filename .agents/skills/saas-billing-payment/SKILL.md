---
name: saas-billing-payment
description: >-
  Use this skill whenever implementing or modifying payment gateways, subscription billing, 
  crypto deposit/withdrawal flows (USDT TRC20/BEP20), fee calculators, or financial ledgers. 
  Enforces idempotency, atomic locks, fee transparency, and immutable audit logs.
---

# SaaS Billing & Financial Engine Operating Procedure

This skill governs all financial, ledger, and payment processing tasks. Zero-loss tolerance is mandatory.

---

## NGUYÊN TẮC VÀNG VỀ DÒNG TIỀN (FINANCIAL RULES)
1. **Zero-Hot-Key on Web Server:**
   - Server web không bao giờ lưu trữ Private Key của ví lạnh thanh khoản chính.
2. **Khấu Trừ Ngay Lập Tức (Atomic Deduction on Withdraw):**
   - Khi tạo lệnh rút tiền, số dư khả dụng phải bị trừ hoặc đóng băng ngay lập tức, không được đợi đến khi admin duyệt mới trừ để chống việc user chuyển tiền đi nơi khác.
3. **Idempotency & Replay Attack Defense:**
   - Mọi mã băm giao dịch (TxID) sau khi nạp phải được ghi vào bảng bất biến `/used_tx_hashes/{hash}` để chống nạp trùng.

---

## QUY TRÌNH THIẾT KẾ CỔNG NẠP (DEPOSIT WORKFLOW)
1. **Kiểm tra mức nạp tối thiểu:** Chặn mọi khoản nạp nhỏ hơn ngưỡng phí cơ bản để bảo vệ người dùng không bị âm tiền do phí gas.
2. **Minh bạch hóa 3 dòng tiền:**
   - Gross Amount (Số tiền nạp gốc).
   - Fee Deduction (Phí sàn + Phí On-chain).
   - Net Credited (Số tiền thực nhận vào tài khoản).
3. **Bản Ký Cam Kết Rủi Ro Bắt Buộc:** Mọi khoản nạp vốn đầu tư phải có bước ký cam kết số hóa (Digital Signature) trước khi cung cấp địa chỉ ví.

---

## QUY TRÌNH THIẾT KẾ CỔNG RÚT (WITHDRAWAL WORKFLOW)
1. **Khóa Đơn Rút Đang Chờ (Concurrent Withdrawal Lock):**
   - Người dùng chỉ được phép có tối đa 1 lệnh rút ở trạng thái `PENDING`.
2. **Kiểm toán nguồn gốc vốn (Source of Funds Audit):**
   - Kiểm tra: `Tổng Nạp Thực Tế + Tổng Lãi Thực Tế - Tổng Đã Rút >= Số Tiền Yêu Cầu`.
3. **Duyệt Phân Tầng (Tiered Approval):**
   - Khoản rút nhỏ: Có thể tự động giải ngân sau khi kiểm toán tự động.
   - Khoản rút lớn: Bắt buộc yêu cầu xác thực 3FA (Master PIN + OTP + Google Authenticator) từ Ban Điều Hành.

---

## CHECKLIST KIỂM THỬ TÀI CHÍNH
- [ ] Đã thử nghiệm nạp với số âm -> Bị chặn 100%.
- [ ] Đã thử nghiệm bấm rút tiền 10 lần liên tiếp trong 1 giây -> Chỉ tạo đúng 1 lệnh, 9 lệnh kia bị khóa.
- [ ] Đã thử nghiệm tái sử dụng mã hash TxID cũ -> Bị từ chối và báo động đỏ.
