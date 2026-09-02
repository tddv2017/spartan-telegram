//+------------------------------------------------------------------+
//|                                              SpartanBridgeEA.mq4 |
//|                                  Copyright 2026, Spartan Quant AI |
//|                                https://spartan-telegram.vercel.app |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, Spartan Quant AI"
#property link      "https://spartan-telegram.vercel.app"
#property version   "2.00"
#property strict
#property description "EA Cầu Nối Đồng Bộ Realtime Lệnh MT4 Exness về Telegram Mini App"

//--- Input Parameters
input string   InpServerUrl         = "https://spartan-telegram.vercel.app/api/ea/webhook"; // Webhook API URL
input string   InpApiKey            = "SPARTAN_EA_LIVE_2026";                              // Khóa bảo mật API
input int      InpHeartbeatSeconds  = 15;                                                   // Tần suất gửi Heartbeat (Giây)
input long     InpFilterMagic       = 0;                                                    // Lọc Magic Number (0 = Tất cả)

//--- Global Variables
datetime g_lastCheckTime = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("🚀 [SPARTAN BRIDGE EA MT4] Khởi động cầu nối MT4 -> Mini App!");
   g_lastCheckTime = TimeCurrent();
   EventSetTimer(InpHeartbeatSeconds);
   SendHeartbeat();
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   Print("🛑 [SPARTAN BRIDGE EA MT4] Đã dừng cầu nối.");
}

//+------------------------------------------------------------------+
//| Timer function                                                   |
//+------------------------------------------------------------------+
void OnTimer()
{
   SendHeartbeat();
   CheckClosedOrders();
}

//+------------------------------------------------------------------+
//| Tick function                                                    |
//+------------------------------------------------------------------+
void OnTick()
{
   CheckClosedOrders();
}

//+------------------------------------------------------------------+
//| Quét lệnh đã đóng trong lịch sử MT4                              |
//+------------------------------------------------------------------+
void CheckClosedOrders()
{
   int totalHistory = OrdersHistoryTotal();
   datetime currentScanTime = g_lastCheckTime;

   for(int i = totalHistory - 1; i >= 0; i--)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_HISTORY))
      {
         datetime closeTime = OrderCloseTime();
         if(closeTime <= g_lastCheckTime) break; // Đã xử lý các lệnh trước thời điểm này

         if(closeTime > currentScanTime) currentScanTime = closeTime;

         int cmd = OrderType();
         if(cmd != OP_BUY && cmd != OP_SELL) continue; // Bỏ qua nạp/rút balance

         if(InpFilterMagic > 0 && OrderMagicNumber() != InpFilterMagic) continue;

         int ticket       = OrderTicket();
         string symbol    = OrderSymbol();
         double lots      = OrderLots();
         double openPrice = OrderOpenPrice();
         double closePr   = OrderClosePrice();
         double profit    = OrderProfit() + OrderSwap() + OrderCommission();
         string orderType = (cmd == OP_BUY) ? "BUY" : "SELL";
         string comment   = OrderComment();

         double pnlPercent = 0.0;
         if(openPrice > 0)
         {
            pnlPercent = (cmd == OP_BUY)
               ? ((closePr - openPrice) / openPrice) * 100.0
               : ((openPrice - closePr) / openPrice) * 100.0;
         }

         PrintFormat("⚡ [MT4 DEAL CLOSED] Ticket #%d | %s | %s %.2f lot | PnL: $%.2f",
                     ticket, symbol, orderType, lots, profit);

         string json = StringFormat(
            "{\"action\":\"TRADE_CLOSED\",\"apiKey\":\"%s\",\"ticket\":\"%d\",\"symbol\":\"%s\",\"type\":\"%s\",\"lots\":%.2f,\"openPrice\":%.4f,\"closePrice\":%.4f,\"pnl\":%.2f,\"pnlPercentage\":%.2f,\"comment\":\"%s\",\"timestamp\":\"%s\"}",
            InpApiKey,
            ticket,
            symbol,
            orderType,
            lots,
            openPrice,
            closePr,
            profit,
            pnlPercent,
            comment,
            TimeToString(closeTime, TIME_DATE|TIME_SECONDS)
         );

         SendWebRequest(json);
      }
   }

   g_lastCheckTime = currentScanTime;
}

//+------------------------------------------------------------------+
//| Gửi Heartbeat báo cáo số dư Master Exness                        |
//+------------------------------------------------------------------+
void SendHeartbeat()
{
   long   accountLogin   = AccountNumber();
   string brokerCompany  = AccountCompany();
   string serverName     = AccountServer();
   double balance        = AccountBalance();
   double equity         = AccountEquity();
   double profit         = AccountProfit();
   double margin         = AccountMargin();
   double freeMargin     = AccountFreeMargin();
   double marginLevel    = (margin > 0) ? (equity / margin * 100.0) : 0;
   int    openPositions  = OrdersTotal();

   string json = StringFormat(
      "{\"action\":\"HEARTBEAT\",\"apiKey\":\"%s\",\"accountNumber\":\"%d\",\"broker\":\"%s\",\"server\":\"%s\",\"balance\":%.2f,\"equity\":%.2f,\"floatingProfit\":%.2f,\"margin\":%.2f,\"freeMargin\":%.2f,\"marginLevel\":%.2f,\"openPositions\":%d}",
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
//| WebRequest HTTP POST                                             |
//+------------------------------------------------------------------+
bool SendWebRequest(const string jsonPayload)
{
   char postData[];
   char resultData[];
   string resultHeaders;
   string headers = "Content-Type: application/json\r\n" +
                    "x-ea-key: " + InpApiKey + "\r\n";
   int timeout = 4000;

   StringToCharArray(jsonPayload, postData, 0, WHOLE_ARRAY, CP_UTF8);
   ArrayResize(postData, ArraySize(postData) - 1);

   ResetLastError();
   int res = WebRequest("POST", InpServerUrl, headers, timeout, postData, resultData, resultHeaders);

   if(res == 200) return true;

   if(res == -1)
   {
      int err = GetLastError();
      if(err == 4014)
      {
         Print("❌ [SPARTAN ERROR 4014] Chưa cấp quyền WebRequest!");
         Print("👉 Vào Tools -> Options -> Expert Advisors -> Tích 'Allow WebRequest for listed URL'");
         Print("👉 Thêm URL: https://spartan-telegram.vercel.app");
      }
      return false;
   }
   return false;
}
//+------------------------------------------------------------------+
