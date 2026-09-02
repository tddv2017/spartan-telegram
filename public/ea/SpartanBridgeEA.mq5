//+------------------------------------------------------------------+
//|                                              SpartanBridgeEA.mq5 |
//|                                  Copyright 2026, Spartan Quant AI |
//|                                https://spartan-telegram.vercel.app |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, Spartan Quant AI"
#property link      "https://spartan-telegram.vercel.app"
#property version   "2.00"
#property description "EA Cầu Nối Đồng Bộ Realtime Lệnh MT5 Exness về Telegram Mini App"

//--- Input Parameters
input group "=== CẤU HÌNH KẾT NỐI SPARTAN BACKEND ==="
input string   InpServerUrl         = "https://spartan-telegram.vercel.app/api/ea/webhook"; // Webhook API URL
input string   InpApiKey            = "SPARTAN_EA_LIVE_2026";                              // Khóa bảo mật API
input int      InpHeartbeatSeconds  = 15;                                                   // Tần suất gửi Heartbeat (Giây)

input group "=== BỘ LỌC GIAO DỊCH ==="
input bool     InpSyncAllSymbols    = true;                                                 // Đồng bộ tất cả cặp tiền (Mặc định XAUUSD)
input long     InpFilterMagic       = 0;                                                    // Lọc Magic Number (0 = Đồng bộ toàn bộ EA)

//--- Global Variables
datetime g_lastHeartbeatTime = 0;
ulong    g_lastProcessedDeal = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("=========================================================");
   Print("🚀 [SPARTAN BRIDGE EA] Khởi động cầu nối MT5 -> Telegram Mini App!");
   Print("🔗 Webhook URL: ", InpServerUrl);
   Print("⏱️ Tần suất Heartbeat: ", InpHeartbeatSeconds, "s");
   Print("=========================================================");

   // Khởi tạo Timer gửi Heartbeat định kỳ
   EventSetTimer(InpHeartbeatSeconds);

   // Gửi Heartbeat đầu tiên ngay khi bật EA
   SendHeartbeat();

   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   Print("🛑 [SPARTAN BRIDGE EA] Đã dừng cầu nối.");
}

//+------------------------------------------------------------------+
//| Timer function (Gửi Heartbeat số dư & trạng thái định kỳ)        |
//+------------------------------------------------------------------+
void OnTimer()
{
   SendHeartbeat();
}

//+------------------------------------------------------------------+
//| TradeTransaction function (Bắt sự kiện chốt lệnh Realtime)       |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& request,
                        const MqlTradeResult& result)
{
   // Chỉ xử lý khi có Deal mới được tạo (TRADE_TRANSACTION_DEAL_ADD)
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
   {
      ulong dealTicket = trans.deal;
      if(dealTicket == 0 || dealTicket == g_lastProcessedDeal) return;

      if(HistoryDealSelect(dealTicket))
      {
         ENUM_DEAL_ENTRY dealEntry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
         ENUM_DEAL_TYPE dealType   = (ENUM_DEAL_TYPE)HistoryDealGetInteger(dealTicket, DEAL_TYPE);
         long dealMagic            = HistoryDealGetInteger(dealTicket, DEAL_MAGIC);
         string symbol             = HistoryDealGetString(dealTicket, DEAL_SYMBOL);

         // Lọc theo Magic Number nếu có cấu hình
         if(InpFilterMagic > 0 && dealMagic != InpFilterMagic) return;

         // Lọc theo Symbol
         if(!InpSyncAllSymbols && symbol != _Symbol) return;

         // Khi một lệnh kết thúc (DEAL_ENTRY_OUT hoặc DEAL_ENTRY_INOUT) hoặc giao dịch phát sinh lãi/lỗ
         if(dealEntry == DEAL_ENTRY_OUT || dealEntry == DEAL_ENTRY_INOUT)
         {
            g_lastProcessedDeal = dealTicket;

            double profit      = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
            double volume      = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
            double price       = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
            string comment     = HistoryDealGetString(dealTicket, DEAL_COMMENT);
            long positionId    = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);

            // Tìm giá mở lệnh từ vị thế gốc
            double openPrice = price;
            if(HistoryOrderSelect(positionId))
            {
               openPrice = HistoryOrderGetDouble(positionId, ORDER_PRICE_OPEN);
            }

            string orderTypeStr = (dealType == DEAL_TYPE_BUY) ? "BUY" : "SELL";
            // Nếu là đóng lệnh SELL thì dealType là BUY và ngược lại
            if(dealEntry == DEAL_ENTRY_OUT)
            {
               orderTypeStr = (dealType == DEAL_TYPE_BUY) ? "SELL" : "BUY";
            }

            double pnlPercent = 0.0;
            if(openPrice > 0)
            {
               pnlPercent = (orderTypeStr == "BUY") 
                  ? ((price - openPrice) / openPrice) * 100.0 
                  : ((openPrice - price) / openPrice) * 100.0;
            }

            PrintFormat("⚡ [SPARTAN DEAL CLOSED] Ticket #%I64u | %s | %s %.2f lot | PnL: $%.2f",
                        dealTicket, symbol, orderTypeStr, volume, profit);

            // Đóng gói JSON
            string jsonPayload = StringFormat(
               "{\"action\":\"TRADE_CLOSED\",\"apiKey\":\"%s\",\"ticket\":\"%I64u\",\"symbol\":\"%s\",\"type\":\"%s\",\"lots\":%.2f,\"openPrice\":%.4f,\"closePrice\":%.4f,\"pnl\":%.2f,\"pnlPercentage\":%.2f,\"comment\":\"%s\",\"magicNumber\":%I64d,\"timestamp\":\"%s\"}",
               InpApiKey,
               dealTicket,
               symbol,
               orderTypeStr,
               volume,
               openPrice,
               price,
               profit,
               pnlPercent,
               comment,
               dealMagic,
               TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS)
            );

            // Gửi WebRequest bất đồng bộ / đồng bộ lên Mini App Backend
            SendWebRequest(jsonPayload);
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Gửi Heartbeat báo cáo số dư Master Exness                        |
//+------------------------------------------------------------------+
void SendHeartbeat()
{
   long   accountLogin   = AccountInfoInteger(ACCOUNT_LOGIN);
   string brokerCompany  = AccountInfoString(ACCOUNT_COMPANY);
   string serverName     = AccountInfoString(ACCOUNT_SERVER);
   double balance        = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity         = AccountInfoDouble(ACCOUNT_EQUITY);
   double profit         = AccountInfoDouble(ACCOUNT_PROFIT);
   double margin         = AccountInfoDouble(ACCOUNT_MARGIN);
   double freeMargin     = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
   double marginLevel    = AccountInfoDouble(ACCOUNT_MARGIN_LEVEL);
   int    openPositions  = PositionsTotal();

   string json = StringFormat(
      "{\"action\":\"HEARTBEAT\",\"apiKey\":\"%s\",\"accountNumber\":\"%I64d\",\"broker\":\"%s\",\"server\":\"%s\",\"balance\":%.2f,\"equity\":%.2f,\"floatingProfit\":%.2f,\"margin\":%.2f,\"freeMargin\":%.2f,\"marginLevel\":%.2f,\"openPositions\":%d}",
      InpApiKey,
      accountLogin,
      brokerCompany,
      serverName,
      balance,
      equity,
      profit,
      margin,
      freeMargin,
      marginLevel,
      openPositions
   );

   SendWebRequest(json);
}

//+------------------------------------------------------------------+
//| Hàm gửi WebRequest HTTP POST về Backend                          |
//+------------------------------------------------------------------+
bool SendWebRequest(const string jsonPayload)
{
   char postData[];
   char resultData[];
   string resultHeaders;
   string headers = "Content-Type: application/json\r\n" +
                    "x-ea-key: " + InpApiKey + "\r\n";
   int timeout = 4000; // 4 giây

   StringToCharArray(jsonPayload, postData, 0, WHOLE_ARRAY, CP_UTF8);
   ArrayResize(postData, ArraySize(postData) - 1); // Loại bỏ null terminator

   ResetLastError();
   int res = WebRequest("POST", InpServerUrl, headers, timeout, postData, resultData, resultHeaders);

   if(res == 200)
   {
      // Thành công
      return true;
   }
   else if(res == -1)
   {
      int err = GetLastError();
      if(err == 4014) // ERR_FUNCTION_NOT_ALLOWED
      {
         Print("❌ [SPARTAN ERROR 4014] Chưa cấp quyền WebRequest!");
         Print("👉 Vào Tools -> Options -> Expert Advisors -> Tích 'Allow WebRequest for listed URL'");
         Print("👉 Thêm URL: https://spartan-telegram.vercel.app");
      }
      else
      {
         PrintFormat("⚠️ [SPARTAN ERROR] WebRequest thất bại! ErrorCode: %d", err);
      }
      return false;
   }
   else
   {
      string respStr = CharArrayToString(resultData, 0, WHOLE_ARRAY, CP_UTF8);
      PrintFormat("⚠️ [SPARTAN SERVER] HTTP %d: %s", res, respStr);
      return false;
   }
}
//+------------------------------------------------------------------+
