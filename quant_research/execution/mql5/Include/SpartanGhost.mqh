//+------------------------------------------------------------------+
//|                                                 SpartanGhost.mqh |
//|                                  Copyright 2026, Spartan Quant AI |
//|                                https://spartan-telegram.vercel.app |
//+------------------------------------------------------------------+
#ifndef __SPARTAN_GHOST_MQH__
#define __SPARTAN_GHOST_MQH__

#property copyright "Copyright 2026, Spartan Quant AI"
#property link      "https://spartan-telegram.vercel.app"
#property strict

//+------------------------------------------------------------------+
//| Magic Taxonomy Constants                                         |
//| Formula: 880000 + (AssetCode * 1000) + (StrategyCode * 10) + Var  |
//+------------------------------------------------------------------+
#define MAGIC_BASE_PREFIX             880000
#define MAGIC_MASTER_STAT_ARB         888801
#define MAGIC_MASTER_MOMENTUM         888802
#define MAGIC_MASTER_VOL_BREAKOUT     888803
#define MAGIC_MASTER_MEAN_REV         888804
#define MAGIC_CIRCUIT_BREAKER         888888
#define MAGIC_FALLBACK_DEFAULT        888899

#define ASSET_CODE_XAUUSD             1
#define ASSET_CODE_EURUSD             2
#define ASSET_CODE_GBPUSD             3
#define ASSET_CODE_BTCUSDT            8
#define ASSET_CODE_ETHUSDT            9

#define STRAT_CODE_MOMENTUM           1
#define STRAT_CODE_VOL_BREAKOUT       2
#define STRAT_CODE_STAT_ARB           3
#define STRAT_CODE_MEAN_REV           4

#define VARIANT_M5                    1
#define VARIANT_M15                   2
#define VARIANT_H1                    3

//+------------------------------------------------------------------+
//| Decomposed Magic Structure                                       |
//+------------------------------------------------------------------+
struct SpartanMagicDecomposed
{
   long              magicNumber;
   int               assetCode;
   string            assetName;
   int               strategyCode;
   string            strategyName;
   int               variantCode;
   string            timeframe;
   bool              valid;
};

//+------------------------------------------------------------------+
//| Generate deterministic Magic Number                              |
//+------------------------------------------------------------------+
long MakeGhostMagic(const int assetCode, const int strategyCode, const int variantCode)
{
   return MAGIC_BASE_PREFIX + (assetCode * 1000) + (strategyCode * 10) + variantCode;
}

//+------------------------------------------------------------------+
//| Deconstruct and parse Magic Number taxonomy                      |
//+------------------------------------------------------------------+
SpartanMagicDecomposed ParseGhostMagic(const long magic)
{
   SpartanMagicDecomposed res;
   res.magicNumber   = magic;
   res.assetCode     = 0;
   res.assetName     = "UNKNOWN";
   res.strategyCode  = 0;
   res.strategyName  = "UNKNOWN";
   res.variantCode   = 0;
   res.timeframe     = "UNKNOWN";
   res.valid         = false;

   if(magic < MAGIC_BASE_PREFIX)
   {
      return res;
   }

   // Master model overrides
   if(magic == MAGIC_MASTER_STAT_ARB)
   {
      res.assetCode    = ASSET_CODE_BTCUSDT;
      res.assetName    = "BTCUSDT";
      res.strategyCode = 1;
      res.strategyName = "StatArb";
      res.variantCode  = VARIANT_M5;
      res.timeframe    = "M5";
      res.valid        = true;
      return res;
   }
   if(magic == MAGIC_MASTER_MOMENTUM)
   {
      res.assetCode    = ASSET_CODE_XAUUSD;
      res.assetName    = "XAUUSD";
      res.strategyCode = 2;
      res.strategyName = "Momentum";
      res.variantCode  = VARIANT_M15;
      res.timeframe    = "M15";
      res.valid        = true;
      return res;
   }
   if(magic == MAGIC_MASTER_VOL_BREAKOUT)
   {
      res.assetCode    = ASSET_CODE_XAUUSD;
      res.assetName    = "XAUUSD";
      res.strategyCode = 3;
      res.strategyName = "VolBreakout";
      res.variantCode  = VARIANT_M15;
      res.timeframe    = "M15";
      res.valid        = true;
      return res;
   }
   if(magic == MAGIC_MASTER_MEAN_REV)
   {
      res.assetCode    = ASSET_CODE_EURUSD;
      res.assetName    = "EURUSD";
      res.strategyCode = 4;
      res.strategyName = "MeanRev";
      res.variantCode  = VARIANT_M15;
      res.timeframe    = "M15";
      res.valid        = true;
      return res;
   }

   long remainder = magic - MAGIC_BASE_PREFIX;
   res.assetCode   = (int)(remainder / 1000);
   long remainder2 = remainder % 1000;
   res.strategyCode = (int)(remainder2 / 10);
   res.variantCode  = (int)(remainder2 % 10);

   switch(res.assetCode)
   {
      case 1: res.assetName = "XAUUSD"; break;
      case 2: res.assetName = "EURUSD"; break;
      case 3: res.assetName = "GBPUSD"; break;
      case 8: res.assetName = "BTCUSDT"; break;
      case 9: res.assetName = "ETHUSDT"; break;
      default: res.assetName = "UNKNOWN"; break;
   }

   switch(res.strategyCode)
   {
      case 1: res.strategyName = "Momentum"; break;
      case 2: res.strategyName = "VolBreakout"; break;
      case 3: res.strategyName = "StatArb/MeanRev"; break;
      case 4: res.strategyName = "MeanRev"; break;
      default: res.strategyName = "UNKNOWN"; break;
   }

   switch(res.variantCode)
   {
      case 1: res.timeframe = "M5"; break;
      case 2: res.timeframe = "M15"; break;
      case 3: res.timeframe = "H1"; break;
      default: res.timeframe = "UNKNOWN"; break;
   }

   res.valid = true;
   return res;
}

//+------------------------------------------------------------------+
//| Isolated Ghost Strategy State Machine                            |
//+------------------------------------------------------------------+
class CGhostStrategy
{
private:
   long              m_magicNumber;
   string            m_symbol;
   ENUM_TIMEFRAMES   m_timeframe;
   string            m_strategyName;
   bool              m_active;
   double            m_trailingStopPoints;
   double            m_trailingStepPoints;
   int               m_maxPositions;
   datetime          m_lastSignalTime;

public:
                     CGhostStrategy(void);
                    ~CGhostStrategy(void);

   bool              Init(const long magic, const string symbol, const ENUM_TIMEFRAMES tf,
                          const string stratName, const double trailPoints = 0.0,
                          const double trailStep = 0.0, const int maxPos = 1);

   long              GetMagic(void) const { return m_magicNumber; }
   string            GetSymbol(void) const { return m_symbol; }
   ENUM_TIMEFRAMES   GetTimeframe(void) const { return m_timeframe; }
   string            GetStrategyName(void) const { return m_strategyName; }
   bool              IsActive(void) const { return m_active; }
   void              SetActive(const bool active) { m_active = active; }
   double            GetTrailingStop(void) const { return m_trailingStopPoints; }
   void              SetTrailingStop(const double points) { m_trailingStopPoints = points; }

   // Isolated position queries (Strict filtering by Magic Number)
   int               GetActivePositionCount(void);
   bool              OwnsPosition(const ulong ticket);
   void              UpdateTrailingStops(void);
   int               CloseAllPositions(const string reason);
};

//+------------------------------------------------------------------+
//| Constructor                                                      |
//+------------------------------------------------------------------+
CGhostStrategy::CGhostStrategy(void)
   : m_magicNumber(0),
     m_symbol(""),
     m_timeframe(PERIOD_M15),
     m_strategyName(""),
     m_active(false),
     m_trailingStopPoints(0.0),
     m_trailingStepPoints(0.0),
     m_maxPositions(1),
     m_lastSignalTime(0)
{
}

//+------------------------------------------------------------------+
//| Destructor                                                       |
//+------------------------------------------------------------------+
CGhostStrategy::~CGhostStrategy(void)
{
}

//+------------------------------------------------------------------+
//| Initialize Ghost Sub-Strategy                                    |
//+------------------------------------------------------------------+
bool CGhostStrategy::Init(const long magic, const string symbol, const ENUM_TIMEFRAMES tf,
                          const string stratName, const double trailPoints = 0.0,
                          const double trailStep = 0.0, const int maxPos = 1)
{
   m_magicNumber        = magic;
   m_symbol             = symbol;
   m_timeframe          = tf;
   m_strategyName       = stratName;
   m_trailingStopPoints = trailPoints;
   m_trailingStepPoints = trailStep;
   m_maxPositions       = (maxPos > 0) ? maxPos : 1;
   m_active             = true;
   m_lastSignalTime     = 0;

   PrintFormat("[SPARTAN GHOST] Registered Ghost Magic #%I64d: %s on %s",
               m_magicNumber, m_strategyName, m_symbol);
   return true;
}

//+------------------------------------------------------------------+
//| Count active positions owned strictly by this Ghost instance     |
//+------------------------------------------------------------------+
int CGhostStrategy::GetActivePositionCount(void)
{
   int count = 0;
   int total = PositionsTotal();
   for(int i = 0; i < total; i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;

      long posMagic = PositionGetInteger(POSITION_MAGIC);
      string posSym = PositionGetString(POSITION_SYMBOL);

      if(posMagic == m_magicNumber && (m_symbol == "" || posSym == m_symbol))
      {
         count++;
      }
   }
   return count;
}

//+------------------------------------------------------------------+
//| Verify whether position is owned by this Ghost                   |
//+------------------------------------------------------------------+
bool CGhostStrategy::OwnsPosition(const ulong ticket)
{
   if(ticket == 0) return false;
   if(PositionSelectByTicket(ticket))
   {
      long posMagic = PositionGetInteger(POSITION_MAGIC);
      return (posMagic == m_magicNumber);
   }
   return false;
}

//+------------------------------------------------------------------+
//| Independent Trailing Stop calculation per Ghost                  |
//+------------------------------------------------------------------+
void CGhostStrategy::UpdateTrailingStops(void)
{
   if(!m_active || m_trailingStopPoints <= 0.0) return;

   int total = PositionsTotal();
   for(int i = 0; i < total; i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;

      if(PositionGetInteger(POSITION_MAGIC) != m_magicNumber) continue;

      string sym = PositionGetString(POSITION_SYMBOL);
      double point = SymbolInfoDouble(sym, SYMBOL_POINT);
      if(point <= 0.0) continue;

      ENUM_POSITION_TYPE posType = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
      double currentPrice = PositionGetDouble(POSITION_PRICE_CURRENT);
      double openPrice    = PositionGetDouble(POSITION_PRICE_OPEN);
      double currentSL    = PositionGetDouble(POSITION_SL);
      double currentTP    = PositionGetDouble(POSITION_TP);

      if(posType == POSITION_TYPE_BUY)
      {
         double profitDistance = currentPrice - openPrice;
         if(profitDistance > m_trailingStopPoints * point)
         {
            double newSL = currentPrice - m_trailingStopPoints * point;
            if(newSL > currentSL + m_trailingStepPoints * point || currentSL == 0.0)
            {
               MqlTradeRequest req;
               MqlTradeResult  res;
               ZeroMemory(req);
               ZeroMemory(res);

               req.action   = TRADE_ACTION_SLTP;
               req.position = ticket;
               req.symbol   = sym;
               req.sl       = NormalizeDouble(newSL, (int)SymbolInfoInteger(sym, SYMBOL_DIGITS));
               req.tp       = currentTP;

               if(OrderSend(req, res))
               {
                  PrintFormat("📈 [SPARTAN GHOST #%I64d] Trailed BUY SL ticket #%I64u to %.4f",
                              m_magicNumber, ticket, req.sl);
               }
            }
         }
      }
      else if(posType == POSITION_TYPE_SELL)
      {
         double profitDistance = openPrice - currentPrice;
         if(profitDistance > m_trailingStopPoints * point)
         {
            double newSL = currentPrice + m_trailingStopPoints * point;
            if(newSL < currentSL - m_trailingStepPoints * point || currentSL == 0.0)
            {
               MqlTradeRequest req;
               MqlTradeResult  res;
               ZeroMemory(req);
               ZeroMemory(res);

               req.action   = TRADE_ACTION_SLTP;
               req.position = ticket;
               req.symbol   = sym;
               req.sl       = NormalizeDouble(newSL, (int)SymbolInfoInteger(sym, SYMBOL_DIGITS));
               req.tp       = currentTP;

               if(OrderSend(req, res))
               {
                  PrintFormat("📉 [SPARTAN GHOST #%I64d] Trailed SELL SL ticket #%I64u to %.4f",
                              m_magicNumber, ticket, req.sl);
               }
            }
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Close all positions belonging exclusively to this Ghost          |
//+------------------------------------------------------------------+
int CGhostStrategy::CloseAllPositions(const string reason)
{
   int closed = 0;
   int total = PositionsTotal();

   for(int i = total - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;

      if(PositionGetInteger(POSITION_MAGIC) != m_magicNumber) continue;

      string sym = PositionGetString(POSITION_SYMBOL);
      ENUM_POSITION_TYPE posType = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
      double volume = PositionGetDouble(POSITION_VOLUME);

      MqlTradeRequest req;
      MqlTradeResult  res;
      ZeroMemory(req);
      ZeroMemory(res);

      req.action    = TRADE_ACTION_DEAL;
      req.position  = ticket;
      req.symbol    = sym;
      req.volume    = volume;
      req.deviation = 30;
      req.type      = (posType == POSITION_TYPE_BUY) ? ORDER_TYPE_SELL : ORDER_TYPE_BUY;
      req.price     = (req.type == ORDER_TYPE_BUY)
                      ? SymbolInfoDouble(sym, SYMBOL_ASK)
                      : SymbolInfoDouble(sym, SYMBOL_BID);
      req.magic     = m_magicNumber;
      req.comment   = "Ghost Close: " + reason;

      if(OrderSend(req, res))
      {
         if(res.retcode == TRADE_RETCODE_DONE || res.retcode == 10009)
         {
            closed++;
            PrintFormat("⚡ [SPARTAN GHOST #%I64d] Closed position #%I64u. Reason: %s",
                        m_magicNumber, ticket, reason);
         }
      }
   }
   return closed;
}

//+------------------------------------------------------------------+
//| Multi-Ghost Strategy Manager                                     |
//+------------------------------------------------------------------+
class CSpartanGhostManager
{
private:
   CGhostStrategy*   m_ghosts[32];
   int               m_ghostCount;

public:
                     CSpartanGhostManager(void);
                    ~CSpartanGhostManager(void);

   bool              RegisterGhost(CGhostStrategy* ghost);
   CGhostStrategy*   GetGhostByMagic(const long magic);
   int               TotalGhosts(void) const { return m_ghostCount; }

   void              UpdateAllTrailingStops(void);
   int               CloseAllGhostPositions(const string reason);
   int               TotalPositionsForMagic(const long magic);
   bool              IsPositionOwnedByAnyGhost(const ulong ticket);
};

//+------------------------------------------------------------------+
//| Constructor                                                      |
//+------------------------------------------------------------------+
CSpartanGhostManager::CSpartanGhostManager(void)
   : m_ghostCount(0)
{
   for(int i = 0; i < 32; i++)
   {
      m_ghosts[i] = NULL;
   }
}

//+------------------------------------------------------------------+
//| Destructor                                                       |
//+------------------------------------------------------------------+
CSpartanGhostManager::~CSpartanGhostManager(void)
{
   m_ghostCount = 0;
}

//+------------------------------------------------------------------+
//| Register a Ghost sub-strategy                                    |
//+------------------------------------------------------------------+
bool CSpartanGhostManager::RegisterGhost(CGhostStrategy* ghost)
{
   if(ghost == NULL || m_ghostCount >= 32) return false;

   // Check duplicate
   for(int i = 0; i < m_ghostCount; i++)
   {
      if(m_ghosts[i] != NULL && m_ghosts[i].GetMagic() == ghost.GetMagic())
      {
         PrintFormat("⚠️ [SPARTAN GHOST MGR] Ghost #%I64d already registered!", ghost.GetMagic());
         return false;
      }
   }

   m_ghosts[m_ghostCount] = ghost;
   m_ghostCount++;
   return true;
}

//+------------------------------------------------------------------+
//| Find Ghost by Magic Number                                       |
//+------------------------------------------------------------------+
CGhostStrategy* CSpartanGhostManager::GetGhostByMagic(const long magic)
{
   for(int i = 0; i < m_ghostCount; i++)
   {
      if(m_ghosts[i] != NULL && m_ghosts[i].GetMagic() == magic)
      {
         return m_ghosts[i];
      }
   }
   return NULL;
}

//+------------------------------------------------------------------+
//| Update trailing stops across all registered ghosts               |
//+------------------------------------------------------------------+
void CSpartanGhostManager::UpdateAllTrailingStops(void)
{
   for(int i = 0; i < m_ghostCount; i++)
   {
      if(m_ghosts[i] != NULL && m_ghosts[i].IsActive())
      {
         m_ghosts[i].UpdateTrailingStops();
      }
   }
}

//+------------------------------------------------------------------+
//| Close all positions across all registered ghosts                 |
//+------------------------------------------------------------------+
int CSpartanGhostManager::CloseAllGhostPositions(const string reason)
{
   int totalClosed = 0;
   for(int i = 0; i < m_ghostCount; i++)
   {
      if(m_ghosts[i] != NULL)
      {
         totalClosed += m_ghosts[i].CloseAllPositions(reason);
      }
   }
   return totalClosed;
}

//+------------------------------------------------------------------+
//| Count positions for a specific magic number                      |
//+------------------------------------------------------------------+
int CSpartanGhostManager::TotalPositionsForMagic(const long magic)
{
   CGhostStrategy* ghost = GetGhostByMagic(magic);
   if(ghost != NULL)
   {
      return ghost.GetActivePositionCount();
   }
   return 0;
}

//+------------------------------------------------------------------+
//| Check if position belongs to any registered ghost                |
//+------------------------------------------------------------------+
bool CSpartanGhostManager::IsPositionOwnedByAnyGhost(const ulong ticket)
{
   for(int i = 0; i < m_ghostCount; i++)
   {
      if(m_ghosts[i] != NULL && m_ghosts[i].OwnsPosition(ticket))
      {
         return true;
      }
   }
   return false;
}

#endif // __SPARTAN_GHOST_MQH__
