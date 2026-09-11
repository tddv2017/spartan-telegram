//+------------------------------------------------------------------+
//|                                             SpartanMasterEA.mq5 |
//|                                  Copyright 2026, Spartan Quant AI |
//|                                https://spartan-telegram.vercel.app |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, Spartan Quant AI"
#property link      "https://spartan-telegram.vercel.app"
#property version   "2.00"
#property description "Spartan Institutional Multi-Asset Quant Master Execution EA"
#property strict

//+------------------------------------------------------------------+
//| Include Modular Subsystems                                       |
//+------------------------------------------------------------------+
#include "Include/SpartanCore.mqh"
#include "Include/SpartanGhost.mqh"
#include "Include/SpartanRisk.mqh"
#include "Include/SpartanTrade.mqh"
#include "Include/SpartanWebhook.mqh"
#include "Include/SpartanNews.mqh"

//+------------------------------------------------------------------+
//| Input Parameters                                                 |
//+------------------------------------------------------------------+
input group "=== 1. SPARTAN GATEWAY & WEBHOOK CONNECTION ==="
input string   InpServerUrl               = "https://spartan-telegram.vercel.app/api/ea/webhook"; // Webhook Gateway URL
input string   InpApiKey                  = "";                                                   // API Secret Key (EA_SECRET_KEY)
input int      InpHeartbeatSeconds        = 15;                                                   // Heartbeat Frequency (Seconds)
input string   InpSpoolFilename           = "spartan_webhook_spool.dat";                          // Offline Queue Spool File

input group "=== 2. MULTI-TIER RISK MANAGEMENT ENGINE ==="
input double   InpKellyFractionMultiplier = 0.35; // Calibrated Fractional Kelly Multiplier (0.25 - 0.50)
input double   InpSoftThrottleDrawdownPct = 3.0;  // Tier 2 Soft Throttle DD (%)
input double   InpHardFreezeDrawdownPct   = 4.5;  // Tier 3 Hard Freeze DD (%)
input double   InpCircuitBreakerDDPct     = 5.0;  // Tier 4 Emergency Circuit Breaker DD (%)
input double   InpStopOutLtvThreshold     = 0.85; // Stop-Out Margin Utilization LTV Threshold (85%)

input group "=== 3. TRADE DISPATCH & SLIPPAGE GUARD ==="
input ulong    InpMaxSlippagePoints       = 30;   // Slippage Tolerance (Points)
input int      InpMaxTradeRetries         = 3;    // Maximum Order Retries on Transient Requote
input int      InpBaseRetryDelayMs        = 200;  // Exponential Backoff Base Delay (ms)

input group "=== 4. NEWS BLACKOUT & SPREAD EXPANSION FILTER ==="
input bool     InpEnableNewsFilter        = true; // Enable News Blackout Filter
input int      InpPreNewsBlackoutMins     = 15;   // Pre-News Blackout Window (Minutes)
input int      InpPostNewsBlackoutMins    = 30;   // Post-News Blackout Window (Minutes)
input double   InpSpreadSpikeMultiplier   = 3.0;  // Spread Anomaly Spike Multiplier (x EMA)

input group "=== 5. MULTI-GHOST STRATEGY SUB-MODULES ==="
input bool     InpEnableXauMomentumGhost  = true; // Ghost 1: XAUUSD Momentum Trend (888802)
input bool     InpEnableEurMeanRevGhost   = true; // Ghost 2: EURUSD Mean Reversion (888804)
input bool     InpEnableXauBreakoutGhost  = true; // Ghost 3: XAUUSD Volatility Breakout (888803)

//+------------------------------------------------------------------+
//| Global Subsystem Instances                                       |
//+------------------------------------------------------------------+
CSpartanCore           g_core;
CSpartanGhostManager    g_ghostMgr;
CSpartanRiskEngine      g_risk;
CSpartanTrade           g_trade;
CSpartanWebhookBridge   g_webhook;
CSpartanNewsFilter      g_news;

// Ghost instances
CGhostStrategy         g_ghostXauMomentum;
CGhostStrategy         g_ghostEurMeanRev;
CGhostStrategy         g_ghostXauBreakout;

ulong                  g_lastProcessedDeal = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("==================================================================");
   Print("🚀 [SPARTAN MASTER EA] Starting Institutional Quant Execution Core");
   Print("🔗 Webhook URL: ", InpServerUrl);
   Print("⏱️ Heartbeat Interval: ", InpHeartbeatSeconds, "s");
   Print("🛡️ Risk Tiers: Soft 3.0%, Hard 4.5%, Circuit Breaker 5.0%, LTV 85%");
   Print("==================================================================");

   // 1. Initialize Core Engine
   if(!g_core.Init(InpHeartbeatSeconds))
   {
      Print("❌ [SPARTAN MASTER EA] Failed to initialize Core subsystem!");
      return(INIT_FAILED);
   }

   // 2. Initialize Resilient Webhook Bridge
   if(!g_webhook.Init(InpServerUrl, InpApiKey, InpSpoolFilename))
   {
      Print("❌ [SPARTAN MASTER EA] Failed to initialize Webhook bridge!");
      return(INIT_FAILED);
   }

   // 3. Initialize Risk Management Engine
   if(!g_risk.Init(InpKellyFractionMultiplier,
                   InpSoftThrottleDrawdownPct,
                   InpHardFreezeDrawdownPct,
                   InpCircuitBreakerDDPct,
                   InpStopOutLtvThreshold))
   {
      Print("❌ [SPARTAN MASTER EA] Failed to initialize Risk engine!");
      return(INIT_FAILED);
   }

   // 4. Initialize Trade Dispatcher
   if(!g_trade.Init(InpMaxTradeRetries, InpBaseRetryDelayMs, InpMaxSlippagePoints))
   {
      Print("❌ [SPARTAN MASTER EA] Failed to initialize Trade dispatcher!");
      return(INIT_FAILED);
   }

   // 5. Initialize News Blackout & Spread Monitor
   if(!g_news.Init(InpEnableNewsFilter, InpPreNewsBlackoutMins, InpPostNewsBlackoutMins, InpSpreadSpikeMultiplier))
   {
      Print("❌ [SPARTAN MASTER EA] Failed to initialize News filter!");
      return(INIT_FAILED);
   }

   // 6. Register Multi-Ghost Sub-Strategies
   if(InpEnableXauMomentumGhost)
   {
      g_ghostXauMomentum.Init(MAGIC_MASTER_MOMENTUM, "XAUUSD", PERIOD_M15, "MomentumTrend_H1_M15", 350.0, 50.0, 1);
      g_ghostMgr.RegisterGhost(&g_ghostXauMomentum);
   }

   if(InpEnableEurMeanRevGhost)
   {
      g_ghostEurMeanRev.Init(MAGIC_MASTER_MEAN_REV, "EURUSD", PERIOD_M15, "RegimeMeanRev_M15", 150.0, 30.0, 1);
      g_ghostMgr.RegisterGhost(&g_ghostEurMeanRev);
   }

   if(InpEnableXauBreakoutGhost)
   {
      g_ghostXauBreakout.Init(MAGIC_MASTER_VOL_BREAKOUT, "XAUUSD", PERIOD_M15, "VolBreakout_Squeeze", 400.0, 60.0, 1);
      g_ghostMgr.RegisterGhost(&g_ghostXauBreakout);
   }

   // 7. Setup System Timer for Heartbeat & Webhook Queue Drainage
   EventSetTimer(InpHeartbeatSeconds);

   // 8. Dispatch Initial Heartbeat
   g_core.RefreshAccountState();
   g_webhook.SendHeartbeat(
      g_core.GetAccountLogin(),
      g_core.GetBroker(),
      g_core.GetServer(),
      g_core.GetBalance(),
      g_core.GetEquity(),
      g_core.GetFloatingProfit(),
      g_core.GetMargin(),
      g_core.GetFreeMargin(),
      g_core.GetMarginLevel(),
      g_core.GetOpenPositions()
   );
   g_core.MarkHeartbeatSent();

   PrintFormat("✅ [SPARTAN MASTER EA] Initialization complete. %d Ghosts active.", g_ghostMgr.TotalGhosts());
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();

   // Flush any unspooled memory events to disk
   g_webhook.FlushAllToDisk();
   g_core.Deinit();

   PrintFormat("🛑 [SPARTAN MASTER EA] Master EA stopped. Reason code: %d", reason);
}

//+------------------------------------------------------------------+
//| Timer function (Heartbeat dispatch & Queue drain)                |
//+------------------------------------------------------------------+
void OnTimer()
{
   g_core.RefreshAccountState();

   // 1. Dispatch periodic heartbeat
   if(g_core.ShouldSendHeartbeat())
   {
      bool sent = g_webhook.SendHeartbeat(
         g_core.GetAccountLogin(),
         g_core.GetBroker(),
         g_core.GetServer(),
         g_core.GetBalance(),
         g_core.GetEquity(),
         g_core.GetFloatingProfit(),
         g_core.GetMargin(),
         g_core.GetFreeMargin(),
         g_core.GetMarginLevel(),
         g_core.GetOpenPositions()
      );

      if(sent)
      {
         g_core.MarkHeartbeatSent();
      }

      // Sync remote kill-switch state
      g_core.SetGlobalBotActive(g_webhook.IsRemoteBotActive());
   }

   // 2. Process & drain offline queue items
   g_webhook.ProcessQueue(10);
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   // 1. Update spread monitor
   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   if(point > 0.0)
   {
      double spreadPoints = (ask - bid) / point;
      g_news.UpdateSpread(spreadPoints);
   }

   // 2. Refresh account telemetry
   g_core.RefreshAccountState();
   double currentEquity = g_core.GetEquity();
   double usedMargin    = g_core.GetMargin();

   // 3. Multi-Tier Risk Check: Stop-Out LTV 85% Circuit Breaker
   if(g_risk.CheckStopOutLTV(usedMargin, currentEquity))
   {
      Print("🚨 [SPARTAN MASTER EA] Stop-Out LTV Circuit Breaker ACTIVE: Closing highest margin positions!");
      g_ghostMgr.CloseAllGhostPositions("LTV 85% Emergency De-leveraging");
      return;
   }

   // 4. Multi-Tier Risk Check: 4-Tier Drawdown Governor
   ENUM_DRAWDOWN_TIER ddTier = g_risk.CheckDrawdown(currentEquity);
   if(ddTier == TIER_4_CIRCUIT_BREAKER)
   {
      PrintFormat("🚨 [SPARTAN MASTER EA] Tier 4 Circuit Breaker TRIPPED (DD: %.2f%%)! Liquidating all positions.",
                  g_risk.GetCurrentDDPct());
      g_core.TriggerEmergencyHalt("Drawdown >= 5.0%");
      g_ghostMgr.CloseAllGhostPositions("Tier 4 Drawdown Circuit Breaker");
      return;
   }

   // 5. If trading not permitted or news blackout, skip execution
   if(!g_core.IsTradingAllowed()) return;
   if(!g_news.IsSafeToTrade(_Symbol)) return;

   // 6. Update trailing stops across all registered ghosts
   g_ghostMgr.UpdateAllTrailingStops();
}

//+------------------------------------------------------------------+
//| TradeTransaction function (Realtime Closed Deal Capture)         |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& request,
                        const MqlTradeResult& result)
{
   // Intercept newly created deals
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

         // Handle position closing deal (DEAL_ENTRY_OUT or DEAL_ENTRY_INOUT)
         if(dealEntry == DEAL_ENTRY_OUT || dealEntry == DEAL_ENTRY_INOUT)
         {
            g_lastProcessedDeal = dealTicket;

            double profit      = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
            double volume      = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
            double closePrice  = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
            string comment     = HistoryDealGetString(dealTicket, DEAL_COMMENT);
            long positionId    = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);

            // Extract entry price from historical DEAL_ENTRY_IN
            double openPrice = 0.0;
            if(HistorySelectByPosition(positionId))
            {
               int dealCount = HistoryDealsTotal();
               for(int i = 0; i < dealCount; i++)
               {
                  ulong inTicket = HistoryDealGetTicket(i);
                  if(inTicket == 0) continue;
                  ENUM_DEAL_ENTRY inEntry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(inTicket, DEAL_ENTRY);
                  if(inEntry == DEAL_ENTRY_IN)
                  {
                     openPrice = HistoryDealGetDouble(inTicket, DEAL_PRICE);
                     if(openPrice > 0.0) break;
                  }
               }
            }

            // Determine original position trade direction
            string orderTypeStr = (dealType == DEAL_TYPE_BUY) ? "BUY" : "SELL";
            if(dealEntry == DEAL_ENTRY_OUT)
            {
               orderTypeStr = (dealType == DEAL_TYPE_BUY) ? "SELL" : "BUY";
            }

            // Calculate precise PnL percentage
            double pnlPercent = 0.0;
            if(openPrice > 0.0)
            {
               pnlPercent = (orderTypeStr == "BUY")
                  ? ((closePrice - openPrice) / openPrice) * 100.0
                  : ((openPrice - closePrice) / openPrice) * 100.0;
            }

            PrintFormat("⚡ [SPARTAN MASTER EA] Deal Closed: Ticket #%I64u | %s | %s %.2f lot | PnL: $%.2f (%.2f%%)",
                        dealTicket, symbol, orderTypeStr, volume, profit, pnlPercent);

            // Send or enqueue trade report via resilient webhook bridge
            g_webhook.SendTradeClosed(dealTicket, symbol, orderTypeStr, volume,
                                      openPrice, closePrice, profit, pnlPercent,
                                      comment, dealMagic);
         }
      }
   }
}
//+------------------------------------------------------------------+
