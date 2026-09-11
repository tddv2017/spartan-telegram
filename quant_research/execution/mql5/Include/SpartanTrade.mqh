//+------------------------------------------------------------------+
//|                                                 SpartanTrade.mqh |
//|                                  Copyright 2026, Spartan Quant AI |
//|                                https://spartan-telegram.vercel.app |
//+------------------------------------------------------------------+
#ifndef __SPARTAN_TRADE_MQH__
#define __SPARTAN_TRADE_MQH__

#property copyright "Copyright 2026, Spartan Quant AI"
#property link      "https://spartan-telegram.vercel.app"
#property strict

//+------------------------------------------------------------------+
//| Atomic Order Dispatcher & Slippage Guard                         |
//+------------------------------------------------------------------+
class CSpartanTrade
{
private:
   int               m_maxRetries;
   int               m_baseDelayMs;
   ulong             m_slippagePoints;
   ulong             m_lastTicket;
   uint              m_lastRetcode;
   string            m_lastErrorStr;

public:
                     CSpartanTrade(void);
                    ~CSpartanTrade(void);

   bool              Init(const int maxRetries = 3, const int baseDelayMs = 200, const ulong slippagePoints = 30);

   // Order execution
   bool              OpenMarketOrder(const string symbol,
                                     const ENUM_ORDER_TYPE orderType,
                                     const double volume,
                                     const double sl = 0.0,
                                     const double tp = 0.0,
                                     const long magic = 888899,
                                     const string comment = "Spartan Quant");

   bool              ClosePosition(const ulong ticket,
                                   const double volume = 0.0,
                                   const string comment = "Spartan Close");

   bool              ModifyPosition(const ulong ticket,
                                    const double sl,
                                    const double tp);

   // Accessors
   ulong             GetLastTicket(void) const { return m_lastTicket; }
   uint              GetLastRetcode(void) const { return m_lastRetcode; }
   string            GetLastErrorStr(void) const { return m_lastErrorStr; }
   string            GetRetcodeDescription(const uint retcode) const;

private:
   bool              IsTransientError(const uint retcode) const;
};

//+------------------------------------------------------------------+
//| Constructor                                                      |
//+------------------------------------------------------------------+
CSpartanTrade::CSpartanTrade(void)
   : m_maxRetries(3),
     m_baseDelayMs(200),
     m_slippagePoints(30),
     m_lastTicket(0),
     m_lastRetcode(0),
     m_lastErrorStr("")
{
}

//+------------------------------------------------------------------+
//| Destructor                                                       |
//+------------------------------------------------------------------+
CSpartanTrade::~CSpartanTrade(void)
{
}

//+------------------------------------------------------------------+
//| Initialization                                                   |
//+------------------------------------------------------------------+
bool CSpartanTrade::Init(const int maxRetries = 3, const int baseDelayMs = 200, const ulong slippagePoints = 30)
{
   m_maxRetries     = (maxRetries > 0) ? maxRetries : 3;
   m_baseDelayMs    = (baseDelayMs > 0) ? baseDelayMs : 200;
   m_slippagePoints = slippagePoints;
   m_lastTicket     = 0;
   m_lastRetcode    = 0;
   m_lastErrorStr   = "";

   PrintFormat("[SPARTAN TRADE] Initialized: MaxRetries=%d, BaseDelay=%dms, SlippageGuard=%I64u points",
               m_maxRetries, m_baseDelayMs, m_slippagePoints);
   return true;
}

//+------------------------------------------------------------------+
//| Check if trade error is transient and eligible for retry         |
//+------------------------------------------------------------------+
bool CSpartanTrade::IsTransientError(const uint retcode) const
{
   return (retcode == 10004 || // TRADE_RETCODE_REQUOTE
           retcode == 10006 || // TRADE_RETCODE_REQUEST_REJECTED
           retcode == 10018 || // TRADE_RETCODE_MARKET_CLOSED
           retcode == 10019 || // TRADE_RETCODE_NO_MONEY
           retcode == 10020 || // TRADE_RETCODE_PRICE_CHANGED
           retcode == 10021);  // TRADE_RETCODE_PRICE_OFF
}

//+------------------------------------------------------------------+
//| Execute atomic market order with slippage guard and retry backoff|
//+------------------------------------------------------------------+
bool CSpartanTrade::OpenMarketOrder(const string symbol,
                                    const ENUM_ORDER_TYPE orderType,
                                    const double volume,
                                    const double sl = 0.0,
                                    const double tp = 0.0,
                                    const long magic = 888899,
                                    const string comment = "Spartan Quant")
{
   m_lastTicket = 0;
   m_lastRetcode = 0;
   m_lastErrorStr = "";

   if(volume <= 0.0)
   {
      m_lastErrorStr = "Invalid order volume (<= 0.0)";
      PrintFormat("[SPARTAN TRADE] Error: %s", m_lastErrorStr);
      return false;
   }

   int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);

   for(int attempt = 0; attempt < m_maxRetries; attempt++)
   {
      double price = 0.0;
      if(orderType == ORDER_TYPE_BUY)
      {
         price = SymbolInfoDouble(symbol, SYMBOL_ASK);
      }
      else if(orderType == ORDER_TYPE_SELL)
      {
         price = SymbolInfoDouble(symbol, SYMBOL_BID);
      }
      else
      {
         m_lastErrorStr = "Only ORDER_TYPE_BUY and ORDER_TYPE_SELL supported for market orders";
         return false;
      }

      MqlTradeRequest req;
      MqlTradeResult  res;
      ZeroMemory(req);
      ZeroMemory(res);

      req.action       = TRADE_ACTION_DEAL;
      req.symbol       = symbol;
      req.volume       = NormalizeDouble(volume, 2);
      req.type         = orderType;
      req.price        = NormalizeDouble(price, digits);
      req.deviation    = m_slippagePoints;
      req.magic        = magic;
      req.comment      = comment;
      req.type_filling = ORDER_FILLING_IOC;

      if(sl > 0.0) req.sl = NormalizeDouble(sl, digits);
      if(tp > 0.0) req.tp = NormalizeDouble(tp, digits);

      ResetLastError();
      bool success = OrderSend(req, res);
      m_lastRetcode = res.retcode;

      if(success && (res.retcode == TRADE_RETCODE_DONE || res.retcode == 10009 || res.retcode == 10008))
      {
         m_lastTicket = (res.deal > 0) ? res.deal : res.order;
         PrintFormat("⚡ [SPARTAN TRADE] Executed %s %s %.2f lots @ %.4f. Ticket #%I64u (Magic: %I64d)",
                     (orderType == ORDER_TYPE_BUY ? "BUY" : "SELL"), symbol, volume, res.price, m_lastTicket, magic);
         return true;
      }

      // Check transient error
      if(IsTransientError(res.retcode))
      {
         int delay = m_baseDelayMs * (1 << attempt); // Exponential backoff: 200ms, 400ms, 800ms
         PrintFormat("⚠️ [SPARTAN TRADE] Transient error #%u (%s) on attempt %d/%d. Backoff %dms...",
                     res.retcode, GetRetcodeDescription(res.retcode), attempt + 1, m_maxRetries, delay);
         Sleep(delay);
         continue;
      }
      else
      {
         m_lastErrorStr = StringFormat("Fatal order failure: retcode %u (%s)", res.retcode, GetRetcodeDescription(res.retcode));
         PrintFormat("❌ [SPARTAN TRADE] %s", m_lastErrorStr);
         return false;
      }
   }

   m_lastErrorStr = StringFormat("Exceeded maximum retries (%d)", m_maxRetries);
   PrintFormat("❌ [SPARTAN TRADE] %s", m_lastErrorStr);
   return false;
}

//+------------------------------------------------------------------+
//| Close active position                                            |
//+------------------------------------------------------------------+
bool CSpartanTrade::ClosePosition(const ulong ticket,
                                  const double volume = 0.0,
                                  const string comment = "Spartan Close")
{
   if(!PositionSelectByTicket(ticket))
   {
      m_lastErrorStr = StringFormat("Position ticket #%I64u not found", ticket);
      return false;
   }

   string sym = PositionGetString(POSITION_SYMBOL);
   ENUM_POSITION_TYPE posType = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
   double posVolume = PositionGetDouble(POSITION_VOLUME);
   long posMagic = PositionGetInteger(POSITION_MAGIC);

   double closeVolume = (volume > 0.0 && volume <= posVolume) ? volume : posVolume;
   int digits = (int)SymbolInfoInteger(sym, SYMBOL_DIGITS);

   MqlTradeRequest req;
   MqlTradeResult  res;
   ZeroMemory(req);
   ZeroMemory(res);

   req.action       = TRADE_ACTION_DEAL;
   req.position     = ticket;
   req.symbol       = sym;
   req.volume       = NormalizeDouble(closeVolume, 2);
   req.deviation    = m_slippagePoints;
   req.magic        = posMagic;
   req.comment      = comment;
   req.type_filling = ORDER_FILLING_IOC;

   if(posType == POSITION_TYPE_BUY)
   {
      req.type  = ORDER_TYPE_SELL;
      req.price = NormalizeDouble(SymbolInfoDouble(sym, SYMBOL_BID), digits);
   }
   else
   {
      req.type  = ORDER_TYPE_BUY;
      req.price = NormalizeDouble(SymbolInfoDouble(sym, SYMBOL_ASK), digits);
   }

   ResetLastError();
   bool success = OrderSend(req, res);
   m_lastRetcode = res.retcode;

   if(success && (res.retcode == TRADE_RETCODE_DONE || res.retcode == 10009))
   {
      PrintFormat("⚡ [SPARTAN TRADE] Closed position #%I64u: %.2f lots %s @ %.4f",
                  ticket, closeVolume, sym, res.price);
      return true;
   }

   m_lastErrorStr = StringFormat("Close position failed: retcode %u (%s)", res.retcode, GetRetcodeDescription(res.retcode));
   PrintFormat("❌ [SPARTAN TRADE] %s", m_lastErrorStr);
   return false;
}

//+------------------------------------------------------------------+
//| Modify position Stop Loss and Take Profit                        |
//+------------------------------------------------------------------+
bool CSpartanTrade::ModifyPosition(const ulong ticket,
                                   const double sl,
                                   const double tp)
{
   if(!PositionSelectByTicket(ticket))
   {
      m_lastErrorStr = StringFormat("Position ticket #%I64u not found", ticket);
      return false;
   }

   string sym = PositionGetString(POSITION_SYMBOL);
   int digits = (int)SymbolInfoInteger(sym, SYMBOL_DIGITS);

   MqlTradeRequest req;
   MqlTradeResult  res;
   ZeroMemory(req);
   ZeroMemory(res);

   req.action   = TRADE_ACTION_SLTP;
   req.position = ticket;
   req.symbol   = sym;
   req.sl       = (sl > 0.0) ? NormalizeDouble(sl, digits) : 0.0;
   req.tp       = (tp > 0.0) ? NormalizeDouble(tp, digits) : 0.0;

   ResetLastError();
   bool success = OrderSend(req, res);
   m_lastRetcode = res.retcode;

   if(success && (res.retcode == TRADE_RETCODE_DONE || res.retcode == 10009))
   {
      return true;
   }

   m_lastErrorStr = StringFormat("Modify position failed: retcode %u (%s)", res.retcode, GetRetcodeDescription(res.retcode));
   return false;
}

//+------------------------------------------------------------------+
//| Human-readable MT5 Retcode Description                           |
//+------------------------------------------------------------------+
string CSpartanTrade::GetRetcodeDescription(const uint retcode) const
{
   switch(retcode)
   {
      case 10004: return "REQUOTE";
      case 10006: return "REQUEST_REJECTED";
      case 10008: return "ORDER_PLACED";
      case 10009: return "TRADE_RETCODE_DONE";
      case 10011: return "REQUEST_PROCESSING";
      case 10012: return "REQUEST_CANCELLED";
      case 10013: return "INVALID_REQUEST";
      case 10014: return "INVALID_VOLUME";
      case 10015: return "INVALID_PRICE";
      case 10016: return "INVALID_STOPS";
      case 10017: return "TRADE_DISABLED";
      case 10018: return "MARKET_CLOSED";
      case 10019: return "NO_MONEY";
      case 10020: return "PRICE_CHANGED";
      case 10021: return "PRICE_OFF";
      case 10022: return "INVALID_EXPIRATION";
      case 10023: return "ORDER_CHANGED";
      case 10024: return "TOO_MANY_REQUESTS";
      case 10025: return "NO_CHANGES";
      case 10026: return "SERVER_DISABLES_AT";
      case 10027: return "CLIENT_DISABLES_AT";
      case 10028: return "LOCKED";
      case 10029: return "FROZEN";
      case 10030: return "INVALID_FILL";
      case 10031: return "CONNECTION";
      case 10032: return "ONLY_REAL";
      case 10033: return "LIMIT_ORDERS";
      case 10034: return "LIMIT_VOLUME";
      default:    return "UNKNOWN_RETCODE";
   }
}

#endif // __SPARTAN_TRADE_MQH__
