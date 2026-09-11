//+------------------------------------------------------------------+
//|                                                  SpartanRisk.mqh |
//|                                  Copyright 2026, Spartan Quant AI |
//|                                https://spartan-telegram.vercel.app |
//+------------------------------------------------------------------+
#ifndef __SPARTAN_RISK_MQH__
#define __SPARTAN_RISK_MQH__

#property copyright "Copyright 2026, Spartan Quant AI"
#property link      "https://spartan-telegram.vercel.app"
#property strict

//+------------------------------------------------------------------+
//| Drawdown Escalation Tiers                                        |
//+------------------------------------------------------------------+
enum ENUM_DRAWDOWN_TIER
{
   TIER_1_NORMAL           = 1, // Normal execution (DD < 3.0%)
   TIER_2_SOFT_THROTTLE    = 2, // 50% Lot Size reduction (3.0% <= DD < 4.5%)
   TIER_3_HARD_FREEZE      = 3, // Block new orders (4.5% <= DD < 5.0%)
   TIER_4_CIRCUIT_BREAKER  = 4  // Liquidate & Halt (DD >= 5.0%)
};

//+------------------------------------------------------------------+
//| Institutional Multi-Tier Risk Engine                             |
//+------------------------------------------------------------------+
class CSpartanRiskEngine
{
private:
   // Kelly parameters
   double            m_kellyFraction;        // Calibration multiplier (e.g. 0.25 to 0.50)
   double            m_minRiskPct;           // Minimum risk per trade (0.25%)
   double            m_maxRiskPct;           // Maximum risk per trade (0.50%)
   double            m_maxLotCap;            // Institutional absolute lot cap (50.0)

   // Drawdown Governor thresholds
   double            m_peakEquity;
   double            m_softThrottleDDPct;    // 3.0%
   double            m_hardFreezeDDPct;      // 4.5%
   double            m_circuitBreakerDDPct;  // 5.0%

   // Stop-Out LTV 85% threshold
   double            m_stopOutLtvThreshold;  // 0.85 (Margin Level <= 117.65%)
   double            m_deleveragingTargetLtv; // 0.80

   // Anomaly Tripwires
   double            m_maxLatencyMs;         // 1500 ms
   double            m_maxSpreadMultiplier;  // 3.5x baseline

   // State tracking
   ENUM_DRAWDOWN_TIER m_currentTier;
   double            m_currentDDPct;
   bool              m_ltvTripped;
   bool              m_tripwireActive;
   string            m_tripwireReason;

public:
                     CSpartanRiskEngine(void);
                    ~CSpartanRiskEngine(void);

   bool              Init(const double kellyFraction = 0.35,
                          const double softThrottleDD = 3.0,
                          const double hardFreezeDD = 4.5,
                          const double circuitBreakerDD = 5.0,
                          const double stopOutLtvThreshold = 0.85);

   // Fractional Kelly lot calculation
   double            CalculateLotSize(const string symbol,
                                      const double entryPrice,
                                      const double stopLoss,
                                      const double winRate = 0.60,
                                      const double winLossRatio = 1.50);

   // 4-Tier Drawdown evaluation
   ENUM_DRAWDOWN_TIER CheckDrawdown(const double currentEquity);

   // Stop-Out LTV 85% evaluation
   bool              CheckStopOutLTV(const double usedMargin, const double currentEquity);

   // Latency & spread tripwires
   bool              CheckTripwires(const double latencyMs, const double currentSpread, const double avgSpread);

   // Accessors
   ENUM_DRAWDOWN_TIER GetCurrentTier(void) const { return m_currentTier; }
   double            GetCurrentDDPct(void) const { return m_currentDDPct; }
   double            GetPeakEquity(void) const { return m_peakEquity; }
   bool              IsLtvTripped(void) const { return m_ltvTripped; }
   bool              IsTripwireActive(void) const { return m_tripwireActive; }
   string            GetTripwireReason(void) const { return m_tripwireReason; }

   void              ResetPeak(const double equity) { m_peakEquity = equity; }
   void              ResetTripwires(void);
};

//+------------------------------------------------------------------+
//| Constructor                                                      |
//+------------------------------------------------------------------+
CSpartanRiskEngine::CSpartanRiskEngine(void)
   : m_kellyFraction(0.35),
     m_minRiskPct(0.25),
     m_maxRiskPct(0.50),
     m_maxLotCap(50.0),
     m_peakEquity(0.0),
     m_softThrottleDDPct(3.0),
     m_hardFreezeDDPct(4.5),
     m_circuitBreakerDDPct(5.0),
     m_stopOutLtvThreshold(0.85),
     m_deleveragingTargetLtv(0.80),
     m_maxLatencyMs(1500.0),
     m_maxSpreadMultiplier(3.5),
     m_currentTier(TIER_1_NORMAL),
     m_currentDDPct(0.0),
     m_ltvTripped(false),
     m_tripwireActive(false),
     m_tripwireReason("")
{
}

//+------------------------------------------------------------------+
//| Destructor                                                       |
//+------------------------------------------------------------------+
CSpartanRiskEngine::~CSpartanRiskEngine(void)
{
}

//+------------------------------------------------------------------+
//| Initialize Risk Engine                                           |
//+------------------------------------------------------------------+
bool CSpartanRiskEngine::Init(const double kellyFraction = 0.35,
                             const double softThrottleDD = 3.0,
                             const double hardFreezeDD = 4.5,
                             const double circuitBreakerDD = 5.0,
                             const double stopOutLtvThreshold = 0.85)
{
   m_kellyFraction       = (kellyFraction > 0.0) ? kellyFraction : 0.35;
   m_softThrottleDDPct   = (softThrottleDD > 0.0) ? softThrottleDD : 3.0;
   m_hardFreezeDDPct     = (hardFreezeDD > 0.0) ? hardFreezeDD : 4.5;
   m_circuitBreakerDDPct = (circuitBreakerDD > 0.0) ? circuitBreakerDD : 5.0;
   m_stopOutLtvThreshold = (stopOutLtvThreshold > 0.0) ? stopOutLtvThreshold : 0.85;

   m_peakEquity          = AccountInfoDouble(ACCOUNT_EQUITY);
   if(m_peakEquity <= 0.0) m_peakEquity = AccountInfoDouble(ACCOUNT_BALANCE);

   m_currentTier         = TIER_1_NORMAL;
   m_currentDDPct        = 0.0;
   m_ltvTripped          = false;
   m_tripwireActive      = false;
   m_tripwireReason      = "";

   PrintFormat("[SPARTAN RISK] Initialized. Kelly: %.2f | DD Tiers: Soft=%.1f%%, Hard=%.1f%%, Kill=%.1f%% | Stop-Out LTV: %.1f%%",
               m_kellyFraction, m_softThrottleDDPct, m_hardFreezeDDPct, m_circuitBreakerDDPct, m_stopOutLtvThreshold * 100.0);
   return true;
}

//+------------------------------------------------------------------+
//| Calibrated Fractional Kelly Lot Size Calculator                  |
//+------------------------------------------------------------------+
double CSpartanRiskEngine::CalculateLotSize(const string symbol,
                                           const double entryPrice,
                                           const double stopLoss,
                                           const double winRate = 0.60,
                                           const double winLossRatio = 1.50)
{
   // Check drawdown tier gating
   double currentEquity = AccountInfoDouble(ACCOUNT_EQUITY);
   ENUM_DRAWDOWN_TIER tier = CheckDrawdown(currentEquity);

   if(tier >= TIER_3_HARD_FREEZE)
   {
      Print("[SPARTAN RISK] Entry blocked: Hard Freeze / Circuit Breaker active!");
      return 0.0;
   }

   if(m_ltvTripped || m_tripwireActive)
   {
      Print("[SPARTAN RISK] Entry blocked: LTV or Anomaly Tripwire active!");
      return 0.0;
   }

   // 1. Classical Kelly Criterion: f* = (p * b - q) / b
   double p = MathMax(0.01, MathMin(0.99, winRate));
   double q = 1.0 - p;
   double b = MathMax(0.1, winLossRatio);
   double rawKelly = (p * b - q) / b;

   if(rawKelly <= 0.0)
   {
      rawKelly = 0.05; // Fallback minimum positive baseline
   }

   // 2. Institutional Calibrated Risk Fraction (0.25% - 0.50% range)
   double calibratedRiskPct = rawKelly * m_kellyFraction;
   calibratedRiskPct = MathMax(m_minRiskPct, MathMin(m_maxRiskPct, calibratedRiskPct));

   // Tier 2 Soft Throttle: reduce risk by 50%
   if(tier == TIER_2_SOFT_THROTTLE)
   {
      calibratedRiskPct *= 0.50;
      PrintFormat("[SPARTAN RISK] Tier 2 Soft Throttle: Risk throttled to %.3f%%", calibratedRiskPct);
   }

   double riskDollars = currentEquity * (calibratedRiskPct / 100.0);

   // 3. Stop loss distance in points
   double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
   if(point <= 0.0) point = 0.0001;

   double slDistance = MathAbs(entryPrice - stopLoss);
   if(slDistance <= 0.0)
   {
      Print("[SPARTAN RISK] Error: Stop loss distance is zero!");
      return 0.0;
   }

   double distancePoints = slDistance / point;

   // 4. Loss per 1.0 lot
   double tickSize  = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE);
   double tickValue = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);
   if(tickSize <= 0.0) tickSize = point;
   if(tickValue <= 0.0) tickValue = 1.0;

   double lossPerLot = (distancePoints * point / tickSize) * tickValue;
   if(lossPerLot <= 0.0) lossPerLot = distancePoints * tickValue;
   if(lossPerLot <= 0.0) return 0.0;

   double rawLots = riskDollars / lossPerLot;

   // 5. Volume step rounding & broker limits
   double minLot  = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
   double maxLot  = MathMin(m_maxLotCap, SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX));
   double lotStep = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);

   if(minLot <= 0.0) minLot = 0.01;
   if(maxLot <= 0.0) maxLot = 50.0;
   if(lotStep <= 0.0) lotStep = 0.01;

   double roundedLots = MathFloor(rawLots / lotStep) * lotStep;
   roundedLots = MathMax(minLot, MathMin(maxLot, roundedLots));

   return NormalizeDouble(roundedLots, 2);
}

//+------------------------------------------------------------------+
//| Evaluate 4-Tier Drawdown Governor                                |
//+------------------------------------------------------------------+
ENUM_DRAWDOWN_TIER CSpartanRiskEngine::CheckDrawdown(const double currentEquity)
{
   if(currentEquity > m_peakEquity)
   {
      m_peakEquity = currentEquity;
      m_currentDDPct = 0.0;
      m_currentTier = TIER_1_NORMAL;
      return m_currentTier;
   }

   if(m_peakEquity > 0.0)
   {
      m_currentDDPct = ((m_peakEquity - currentEquity) / m_peakEquity) * 100.0;
   }
   else
   {
      m_currentDDPct = 0.0;
   }

   if(m_currentDDPct >= m_circuitBreakerDDPct)
   {
      m_currentTier = TIER_4_CIRCUIT_BREAKER;
   }
   else if(m_currentDDPct >= m_hardFreezeDDPct)
   {
      m_currentTier = TIER_3_HARD_FREEZE;
   }
   else if(m_currentDDPct >= m_softThrottleDDPct)
   {
      m_currentTier = TIER_2_SOFT_THROTTLE;
   }
   else
   {
      m_currentTier = TIER_1_NORMAL;
   }

   return m_currentTier;
}

//+------------------------------------------------------------------+
//| Evaluate Stop-Out LTV 85% Circuit Breaker                        |
//| LTV = Used Margin / Equity >= 0.85                               |
//+------------------------------------------------------------------+
bool CSpartanRiskEngine::CheckStopOutLTV(const double usedMargin, const double currentEquity)
{
   if(currentEquity <= 0.0)
   {
      m_ltvTripped = true;
      return true;
   }

   double ltv = usedMargin / currentEquity;
   if(ltv >= m_stopOutLtvThreshold)
   {
      m_ltvTripped = true;
      PrintFormat("🚨 [SPARTAN RISK] STOP-OUT LTV CIRCUIT BREAKER TRIPPED! LTV: %.2f%% >= %.1f%% (Margin: $%.2f, Equity: $%.2f)",
                  ltv * 100.0, m_stopOutLtvThreshold * 100.0, usedMargin, currentEquity);
      return true;
   }

   if(m_ltvTripped && ltv < m_deleveragingTargetLtv)
   {
      m_ltvTripped = false;
      PrintFormat("✅ [SPARTAN RISK] LTV circuit breaker reset. LTV returned to safe level: %.2f%%", ltv * 100.0);
   }

   return m_ltvTripped;
}

//+------------------------------------------------------------------+
//| Check Latency & Spread Anomaly Tripwires                         |
//+------------------------------------------------------------------+
bool CSpartanRiskEngine::CheckTripwires(const double latencyMs,
                                       const double currentSpread,
                                       const double avgSpread)
{
   if(latencyMs > m_maxLatencyMs)
   {
      m_tripwireActive = true;
      m_tripwireReason = StringFormat("Latency Tripwire: %.1fms > %.1fms", latencyMs, m_maxLatencyMs);
      PrintFormat("⚠️ [SPARTAN RISK] %s", m_tripwireReason);
      return false;
   }

   if(avgSpread > 0.0 && currentSpread >= avgSpread * m_maxSpreadMultiplier)
   {
      m_tripwireActive = true;
      m_tripwireReason = StringFormat("Spread Anomaly: %.1f points >= %.1fx baseline (%.1f)",
                                      currentSpread, m_maxSpreadMultiplier, avgSpread);
      PrintFormat("⚠️ [SPARTAN RISK] %s", m_tripwireReason);
      return false;
   }

   m_tripwireActive = false;
   m_tripwireReason = "";
   return true;
}

//+------------------------------------------------------------------+
//| Reset tripwires                                                  |
//+------------------------------------------------------------------+
void CSpartanRiskEngine::ResetTripwires(void)
{
   m_tripwireActive = false;
   m_tripwireReason = "";
}

#endif // __SPARTAN_RISK_MQH__
