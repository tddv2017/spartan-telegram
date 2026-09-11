# Original User Request

## 2026-09-10T23:17:43Z

# Teamwork Project Prompt

Requested team: Full Multi-Agent Quant Trading Team (Lead Quant Researcher, Data Engineer, MQL5/Algorithm Developer, Risk & QA Auditor)

Xây dựng hệ thống nghiên cứu và thực thi giao dịch định lượng (Quantitative Trading Research & Execution Engine) toàn diện cho danh mục đa tài sản (Vàng XAUUSD, Tiền điện tử BTC/ETH, và Ngoại hối EURUSD/GBPUSD), tích hợp từ mô hình hóa toán học Alpha, khung kiểm thử Backtest/Stress-test đến đóng gói robot MQL5/Python kết nối tự động với Spartan Webhook API.

Working directory: f:/Development/spartan-miniapp-telegram/quant_research
Integrity mode: development

## Requirements

### R1. Mô hình hóa Chiến lược Định lượng Đa tài sản (Multi-Asset Quant Alpha Engine)
- Thiết kế và phát triển các mô hình thuật toán định lượng (Statistical Arbitrage, Momentum Trend-Following, Dynamic Volatility Breakout, Mean-Reversion) tối ưu cho 3 nhóm tài sản: Kim loại quý (XAUUSD), Crypto (BTC/USDT, ETH/USDT), và Forex Major (EURUSD, GBPUSD).
- Thuật toán phải có cơ chế nhận diện trạng thái thị trường (Market Regime Detection) để tự động điều chỉnh thông số hoặc đưa hệ thống về trạng thái phòng vệ khi biến động bất thường.

### R2. Khung Kiểm Thử Backtesting & Stress Testing Nghiêm Ngặt (Rigorous Validation Framework)
- Xây dựng framework kiểm thử tự động sử dụng Python (VectorBT / Backtrader / Pandas) và MQL5 Strategy Tester.
- Bắt buộc kiểm tra độ bền vững Out-of-Sample (OOS), Walk-Forward Optimization (WFO) và mô phỏng xác suất rủi ro Monte Carlo (tối thiểu 1,000 simulations).
- Đánh giá khả năng chống chịu trượt giá (Slippage) và độ giãn biên độ chênh lệch giá (Spread Spikes) khi có tin tức mạnh (CPI, NFP, FOMC).

### R3. Đóng Gói Robot Giao Dịch & Tích Hợp Webhook Real-time (Execution Bot & Webhook Bridge)
- Đóng gói mã nguồn Expert Advisor MQL5 (.mq5) và script thực thi Python/CCXT có cấu trúc mô-đun hóa cao, hỗ trợ quản lý Magic Number riêng cho từng chiến lược phụ (Multi-Ghost Architecture).
- Tích hợp chuẩn giao thức WebRequest / REST API gửi báo cáo giao dịch (lệnh mở, đóng, số dư balance, equity) trực tiếp về Spartan Backend Endpoint /api/ea/webhook.

### R4. Hệ Thống Quản Trị Rủi Ro Đa Tầng (Multi-Tier Risk Management Engine)
- Triển khai cơ chế phân bổ vốn theo rủi ro (Kelly Criterion hiệu chỉnh hoặc Fixed Fractional Risk 0.25% - 0.5% / trade).
- Kiểm soát Drawdown tối đa không vượt quá 5.0% vốn tổng.
- Thiết lập cơ chế tự động khóa giao dịch khẩn cấp (Emergency Kill-Switch / Circuit Breaker) khi chạm ngưỡng Stop-Out LTV 85% hoặc phát hiện độ trễ kết nối bất thường.

## Acceptance Criteria

### Performance & Statistical Robustness
- [ ] Mọi chiến lược backtest trên dữ liệu lịch sử (tối thiểu 24-36 tháng) đạt **Profit Factor >= 2.0**.
- [ ] **Maximal Drawdown (Equity) <= 5.0%** trên toàn bộ các chu kỳ thử nghiệm.
- [ ] **Win Rate >= 60.0%** kết hợp tỷ lệ **Risk:Reward >= 1:1.5**.
- [ ] Kết quả mô phỏng Monte Carlo 1,000 lần xác nhận xác suất suy giảm tài khoản > 10% là **dưới 1%**.

### Code Quality & Execution Stability
- [ ] Mã nguồn MQL5 biên dịch sạch, không có cảnh báo nghiêm trọng (Zero compilation errors/critical warnings).
- [ ] Script Python kiểm thử chạy tự động với đầu ra báo cáo trực quan (HTML/Markdown Summary Report kèm các chỉ số Sharpe, Sortino, Calmar, Recovery Factor).
- [ ] Tích hợp API Webhook gửi payload JSON chuẩn xác đến /api/ea/webhook và nhận phản hồi HTTP 200 OK với độ trễ < 500ms.
- [ ] Cơ chế ngắt khẩn cấp (Emergency Circuit Breaker) hoạt động chuẩn xác 100% trong bài test giả lập tài khoản chạm ngưỡng Stop-Out.

## 2026-09-11T05:15:06Z

# Spartan C-Suite AI Executive Board Review Meeting Prompt

Requested team: Spartan C-Suite AI Executive Board (CTO - Archon, CFO - Aegis, CCO - Leonidas, CLO - Themis, CISO - BlueGuard, CDO - Phidias & Senior Quant Strategist)

Tổ chức Cuộc họp Hội đồng Quản trị Tối cao (Spartan C-Suite AI Executive Board Meeting) thẩm định toàn diện mô hình kinh doanh 3 năm (2027–2029), cấu trúc biểu phí, tỷ lệ sinh lời của Bot Định lượng, hạn mức Quỹ Dự Phòng Kho Bạc và đề xuất phương án điều chỉnh tối ưu hóa lợi nhuận & quản trị rủi ro doanh nghiệp.

Working directory: f:/Development/spartan-miniapp-telegram/quant_research
Integrity mode: development

## Requirements

### R1. Thẩm định Tài chính & Cấu trúc Phí (Aegis Finance AI - CFO Review)
- Đánh giá tính khả thi và độ bền vững của mức sinh lời Bot (20% - 25%/tháng).
- Phân tích sự cân bằng giữa Phí Nạp (9%+$3), Phí HWM (20%) và Phí Rút Tiền 3 Giai đoạn.
- Kiểm tra tính an toàn của Quỹ Dự Phòng Kho Bạc ($486K USD) và đề xuất tỷ lệ trích lập tối ưu.

### R2. Chiến lược Thương mại & Mạng lưới Đại lý (Leonidas Market AI - CCO Review)
- Đánh giá sức hút của mô hình đối với người dùng cuối và đối tác liên kết (Reseller Network 10 Tiers).
- Đề xuất chính sách kích thích tăng trưởng khách hàng (Affiliate Incentive & Virality) mà vẫn giữ vững margin lợi nhuận ròng của Admin.

### R3. Rà soát Pháp lý & Tuân thủ (Themis Legal AI - CLO Review)
- Kiểm tra toàn bộ thuật ngữ truyền thông, hợp đồng và chính sách rút vốn để đảm bảo Zero-Trust compliance.
- Loại bỏ các nguy cơ về cam kết lợi nhuận cố định hay mô hình rủi ro pháp lý.

### R4. An toàn Hạ tầng & Bảo mật Ví (BlueGuard Security AI - CISO Review)
- Thẩm định độ an toàn của cơ chế ví 2 lớp (Master Exness Vault & Treasury Reserve Wallet).
- Đề xuất giải pháp bảo vệ trước các đợt tấn công trượt giá, rút vốn ồ ạt (Run on Vault) hay tấn công giả mạo giao dịch.

### R5. Đánh giá Hạ tầng Kỹ thuật & Thuật toán (Archon Tech AI - CTO & Quant Strategist Review)
- Kiểm định độ trễ execution (<500ms), kết nối Webhook real-time và khả năng chịu tải khi TVL vượt mốc $4.7 Triệu USD.

## Acceptance Criteria

### Executive Alignment & Recommendations
- [ ] 100% các thành viên Hội đồng AI C-Suite bỏ phiếu thông qua Nghị quyết Đánh giá (Board Resolution).
- [ ] Đưa ra bảng khuyến nghị điều chỉnh chi tiết từng thông số (Phí, Lãi suất, Quỹ dự phòng, Khối lượng lệnh) có tính khả thi 100%.
- [ ] Xuất biên bản cuộc họp C-Suite Executive Summary dưới dạng Markdown & HTML công bố trực tiếp cho Chủ tịch @tddv2017.
