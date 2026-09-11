//+------------------------------------------------------------------+
//|                                                  SpartanNews.mqh |
//|                                  Copyright 2026, Spartan Quant AI |
//|                                https://spartan-telegram.vercel.app |
//+------------------------------------------------------------------+
#ifndef __SPARTAN_NEWS_MQH__
#define __SPARTAN_NEWS_MQH__

#property copyright "Copyright 2026, Spartan Quant AI"
#property link      "https://spartan-telegram.vercel.app"
#property strict

//+------------------------------------------------------------------+
//| High-Impact Economic Event Structure                             |
//+------------------------------------------------------------------+
struct SpartanNewsEvent
{
   datetime          eventTime;
   string            currency;
   string            eventName;
   int               impactLevel; // 1 = Low, 2 = Medium, 3 = High
};

//+------------------------------------------------------------------+
//| Economic Calendar Blackout Filter & Spread Monitor               |
//+------------------------------------------------------------------+
class CSpartanNewsFilter
{
private:
   bool              m_filterEnabled;
   int               m_preNewsBlackoutSeconds;  // Default 15 mins (900s)
   int               m_postNewsBlackoutSeconds; // Default 30 mins (1800s)

   SpartanNewsEvent  m_events[64];
   int               m_eventCount;

   // Spread expansion tracking
   double            m_spreadEma;
   double            m_alpha;                   // EMA smoothing factor
   double            m_spikeMultiplier;         // Default 3.0x
   bool              m_spreadSpikeDetected;
   double            m_lastSpread;

public:
                     CSpartanNewsFilter(void);
                    ~CSpartanNewsFilter(void);

   bool              Init(const bool enabled = true,
                          const int preMins = 15,
                          const int postMins = 30,
                          const double spikeMultiplier = 3.0);

   // News calendar operations
   bool              AddNewsEvent(const datetime eventTime, const string currency, const string eventName, const int impact = 3);
   bool              IsNewsBlackout(const datetime checkTime = 0, const string currency = "");
   void              ClearNewsEvents(void);

   // Spread monitor operations
   void              UpdateSpread(const double currentSpreadPoints);
   bool              IsSpreadSpike(void) const { return m_spreadSpikeDetected; }
   double            GetSpreadEma(void) const { return m_spreadEma; }
   double            GetLastSpread(void) const { return m_lastSpread; }

   // Combined safety check
   bool              IsSafeToTrade(const string symbol = "");
};

//+------------------------------------------------------------------+
//| Constructor                                                      |
//+------------------------------------------------------------------+
CSpartanNewsFilter::CSpartanNewsFilter(void)
   : m_filterEnabled(true),
     m_preNewsBlackoutSeconds(900),
     m_postNewsBlackoutSeconds(1800),
     m_eventCount(0),
     m_spreadEma(0.0),
     m_alpha(0.05), // ~20-period EMA
     m_spikeMultiplier(3.0),
     m_spreadSpikeDetected(false),
     m_lastSpread(0.0)
{
   for(int i = 0; i < 64; i++)
   {
      m_events[i].eventTime = 0;
      m_events[i].currency = "";
      m_events[i].eventName = "";
      m_events[i].impactLevel = 0;
   }
}

//+------------------------------------------------------------------+
//| Destructor                                                       |
//+------------------------------------------------------------------+
CSpartanNewsFilter::~CSpartanNewsFilter(void)
{
}

//+------------------------------------------------------------------+
//| Initialization                                                   |
//+------------------------------------------------------------------+
bool CSpartanNewsFilter::Init(const bool enabled = true,
                             const int preMins = 15,
                             const int postMins = 30,
                             const double spikeMultiplier = 3.0)
{
   m_filterEnabled          = enabled;
   m_preNewsBlackoutSeconds  = MathMax(60, preMins * 60);
   m_postNewsBlackoutSeconds = MathMax(60, postMins * 60);
   m_spikeMultiplier        = (spikeMultiplier > 1.0) ? spikeMultiplier : 3.0;
   m_eventCount             = 0;
   m_spreadEma              = 0.0;
   m_spreadSpikeDetected    = false;
   m_lastSpread             = 0.0;

   PrintFormat("[SPARTAN NEWS] Filter Initialized. Pre: %dm, Post: %dm, Spread Multiplier: %.1fx",
               preMins, postMins, m_spikeMultiplier);
   return true;
}

//+------------------------------------------------------------------+
//| Register High-Impact News Event                                  |
//+------------------------------------------------------------------+
bool CSpartanNewsFilter::AddNewsEvent(const datetime eventTime,
                                      const string currency,
                                      const string eventName,
                                      const int impact = 3)
{
   if(m_eventCount >= 64) return false;

   m_events[m_eventCount].eventTime   = eventTime;
   m_events[m_eventCount].currency    = currency;
   m_events[m_eventCount].eventName   = eventName;
   m_events[m_eventCount].impactLevel = impact;
   m_eventCount++;

   return true;
}

//+------------------------------------------------------------------+
//| Clear all registered news events                                 |
//+------------------------------------------------------------------+
void CSpartanNewsFilter::ClearNewsEvents(void)
{
   m_eventCount = 0;
}

//+------------------------------------------------------------------+
//| Check if current time falls within blackout window               |
//+------------------------------------------------------------------+
bool CSpartanNewsFilter::IsNewsBlackout(const datetime checkTime = 0, const string currency = "")
{
   if(!m_filterEnabled || m_eventCount == 0) return false;

   datetime now = (checkTime > 0) ? checkTime : TimeCurrent();

   for(int i = 0; i < m_eventCount; i++)
   {
      // High-impact events only
      if(m_events[i].impactLevel < 3) continue;

      if(currency != "" && m_events[i].currency != "" && m_events[i].currency != currency)
      {
         continue;
      }

      datetime eventStart = m_events[i].eventTime - m_preNewsBlackoutSeconds;
      datetime eventEnd   = m_events[i].eventTime + m_postNewsBlackoutSeconds;

      if(now >= eventStart && now <= eventEnd)
      {
         return true;
      }
   }

   return false;
}

//+------------------------------------------------------------------+
//| Update Spread EMA and detect sudden spikes                       |
//+------------------------------------------------------------------+
void CSpartanNewsFilter::UpdateSpread(const double currentSpreadPoints)
{
   m_lastSpread = currentSpreadPoints;

   if(m_spreadEma <= 0.0)
   {
      m_spreadEma = currentSpreadPoints;
   }
   else
   {
      m_spreadEma = (m_alpha * currentSpreadPoints) + ((1.0 - m_alpha) * m_spreadEma);
   }

   if(m_spreadEma > 0.0 && currentSpreadPoints >= m_spreadEma * m_spikeMultiplier)
   {
      if(!m_spreadSpikeDetected)
      {
         PrintFormat("⚠️ [SPARTAN NEWS] Spread Spike detected! Current: %.1f points, Baseline EMA: %.1f points (>= %.1fx)",
                     currentSpreadPoints, m_spreadEma, m_spikeMultiplier);
      }
      m_spreadSpikeDetected = true;
   }
   else
   {
      m_spreadSpikeDetected = false;
   }
}

//+------------------------------------------------------------------+
//| Combined safety evaluation (News blackout + Spread spike)        |
//+------------------------------------------------------------------+
bool CSpartanNewsFilter::IsSafeToTrade(const string symbol = "")
{
   if(m_spreadSpikeDetected) return false;

   if(m_filterEnabled)
   {
      string curr = "";
      if(StringLen(symbol) >= 6)
      {
         curr = StringSubstr(symbol, 0, 3); // Base currency
      }
      if(IsNewsBlackout(TimeCurrent(), curr))
      {
         return false;
      }
   }

   return true;
}

#endif // __SPARTAN_NEWS_MQH__
