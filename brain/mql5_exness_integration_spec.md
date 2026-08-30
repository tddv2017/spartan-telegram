# SPARTAN QUANT AI - MQL5 & EXNESS INTEGRATION SPECIFICATION

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG
Hệ thống kết nối giữa **Telegram Mini App (Frontend/Backend)**, **MQL5 Expert Advisor (MT5 Master Bot)**, và **Tài Khoản Master Exness**.

```
┌─────────────────────────┐       1. Khách bấm Nạp Money       ┌──────────────────────────────┐
│ Telegram Mini App (Web) │ ─────────────────────────────────> │ Backend API (Node.js/Python) │
└─────────────────────────┘                                    └──────────────────────────────┘
             ▲                                                                 ▲
             │                                                                 │
             │ 4. Cộng tiền Net (đã trừ 9%+$3)                                │ 3. WebRequest() xác nhận
             │                                                                 │    tiền đã vào Master
             │                                                                 │
┌─────────────────────────┐       2. Nạp tiền vào Master        ┌──────────────────────────────┐
│   Ví Exness / Master    │ ─────────────────────────────────> │ MT5 Master Bot (MQL5 EA)     │
└─────────────────────────┘                                    └──────────────────────────────┘
```

---

## 2. KẾT NỐI MQL5 EA VỚI BACKEND TELEGRAM MINI APP

### Bước 1: Cấu hình MT5 cho phép kết nối WebRequest
Trong MetaTrader 5 Terminal:
1. Mở `Tools` -> `Options` (hoặc nhấn `Ctrl + O`).
2. Chọn Tab `Expert Advisors`.
3. Tích chọn `Allow WebRequest for listed URL`.
4. Thêm URL Backend Server của bạn:
   - `https://spartan-telegram.vercel.app`
   - Hoặc URL Backend API riêng (VD: `https://api.spartan.quant`).

### Bước 2: Đoạn Mã MQL5 Gửi Dữ Liệu Trade & Số Dư Về Server
```mql5
//+------------------------------------------------------------------+
//| MQL5 WebRequest Helper Function                                 |
//+------------------------------------------------------------------+
bool SendDataToBackend(string endpoint, string jsonPayload) {
    string url = "https://spartan-telegram.vercel.app/api/" + endpoint;
    string headers = "Content-Type: application/json\r\n";
    char postData[];
    char resultData[];
    string resultHeaders;
    int timeout = 5000; // 5 seconds
    
    StringToCharArray(jsonPayload, postData, 0, WHOLE_ARRAY, CP_UTF8);
    ArrayResize(postData, ArraySize(postData) - 1); // Remove null terminator
    
    ResetLastError();
    int res = WebRequest("POST", url, headers, timeout, postData, resultData, resultHeaders);
    
    if (res == 200) {
        Print("[SPARTAN MQL5] Đồng bộ Backend thành công!");
        return true;
    } else {
        Print("[SPARTAN MQL5] Lỗi WebRequest: ", res, " ErrorCode: ", GetLastError());
        return false;
    }
}
```

---

## 3. CƠ CHẾ XÁC NHẬN NẠP TIỀN TỰ ĐỘNG EXNESS MASTER (AUTOMATED DEPOSIT VERIFICATION)

### Quy trình 4 bước chuẩn xác:

1. **Khách Hàng Tạo Lệnh Nạp Trên App:**
   - Khách nhập số tiền (VD: $1,000 USD).
   - Hệ thống tính toán Net Amount (9% + $3 USD):  
     `Net = $1,000 * 0.91 - $3 = $907.00 USD`.
   - Hệ thống cấp cho khách 1 **Mã Giao Dịch (Memo Code)** độc nhất (VD: `SPARTAN_982402`).

2. **Khách Nạp Tiền Vào Exness Master Account:**
   - Khách chuyển khoản nạp vào tài khoản Master Exness kèm mã Memo `SPARTAN_982402`.

3. **MQL5 EA Tự Động Bắt Sự Kiện Tiền Vào Master:**
   - Hàm `OnTradeTransaction()` trong MQL5 tự động kích hoạt khi có giao dịch Balance (Nạp tiền).

```mql5
//+------------------------------------------------------------------+
//| MQL5 Automated Balance Deposit Detection                         |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& request,
                        const MqlTradeResult& result) {
    // Kiểm tra nếu là giao dịch nạp/rút tiền (DEAL_TYPE_BALANCE)
    if (trans.type == TRADE_TRANSACTION_DEAL_ADD) {
        long dealTicket = trans.deal;
        if (HistoryDealSelect(dealTicket)) {
            ENUM_DEAL_TYPE dealType = (ENUM_DEAL_TYPE)HistoryDealGetInteger(dealTicket, DEAL_TYPE);
            
            // DEAL_TYPE_BALANCE chính là giao dịch nạp/rút tiền trên Exness
            if (dealType == DEAL_TYPE_BALANCE) {
                double amount = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
                string comment = HistoryDealGetString(dealTicket, DEAL_COMMENT);
                
                if (amount > 0) { // Nếu số tiền > 0 nghĩa là NẠP TIỀN
                    Print("[MQL5 DEPOSIT] Phát hiện khoản nạp mới trên Exness Master: $", amount, " Comment: ", comment);
                    
                    // Đóng gói JSON gửi về Backend Mini App
                    string json = StringFormat(
                        "{\"event\":\"EXNESS_DEPOSIT_MATCHED\",\"ticket\":%d,\"amount\":%.2f,\"comment\":\"%s\"}",
                        dealTicket, amount, comment
                    );
                    
                    SendDataToBackend("exness-deposit-webhook", json);
                }
            }
        }
    }
}
```

4. **Backend Server Xác Nhận & Cộng Tiền Acc Khách:**
   - Backend kiểm tra khoản nạp thực tế từ MQL5 EA gửi về.
   - Khi `dealTicket` trùng khớp và tiền đã thực sự nạp vào tài khoản Master Exness:
     - Chuyển trạng thái giao dịch từ `PENDING` $\rightarrow$ `SUCCESS`.
     - Cộng số dư Net ($907.00 USDT) vào tài khoản của khách trên Mini App.
     - Gửi tin nhắn Telegram thông báo cho khách: `"✅ Nạp tiền thành công $907.00 USDT vào tài khoản!"`.

---

## 4. CÁC PHƯƠNG PHÁP THỰC THI (PROPOSAL OPTIONS)

| Phương Pháp | Mô Tả | Ưu Điểm | Nhược Điểm |
| :--- | :--- | :--- | :--- |
| **Phương Pháp 1 (MQL5 EA Direct - KHUYÊN DÙNG)** | Viết hàm `OnTradeTransaction()` trong MQL5 EA gửi WebRequest trực tiếp về Backend Mini App. | ✅ Tin cậy 100%, tiền thực tế đã vào Master Exness mới cộng tiền khách.<br>✅ Không lo bị hack hay nạp ảo. | Cần treo MT5 Terminal 24/7 (hoặc dùng VPS). |
| **Phương Pháp 2 (Python MetaTrader 5 API)** | Dùng thư viện `MetaTrader5` trên Python Server để đọc lịch sử Master Exness mỗi 5 giây. | ✅ Chạy hoàn toàn trên Cloud Server.<br>✅ Không bị ảnh hưởng nếu tắt app MT5. | Cần Server Linux/Windows cài sẵn Python MT5 library. |
| **Phương Pháp 3 (Exness Webhook / IB Partner API)** | Sử dụng Webhook của hệ thống Exness Partner / Social Trading API. | ✅ Tự động hoàn toàn từ phía Exness. | Cần tài khoản Exness Partner/Broker API được phê duyệt. |
