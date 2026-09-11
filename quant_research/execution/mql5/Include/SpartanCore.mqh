//+------------------------------------------------------------------+
//|                                                  SpartanCore.mqh |
//|                                  Copyright 2026, Spartan Quant AI |
//|                                https://spartan-telegram.vercel.app |
//+------------------------------------------------------------------+
#ifndef __SPARTAN_CORE_MQH__
#define __SPARTAN_CORE_MQH__

#property copyright "Copyright 2026, Spartan Quant AI"
#property link      "https://spartan-telegram.vercel.app"
#property strict

//+------------------------------------------------------------------+
//| Market Regime States                                             |
//+------------------------------------------------------------------+
enum ENUM_SPARTAN_REGIME
{
   REGIME_BULL_TREND       = 1, // Bull Trend
   REGIME_BEAR_TREND       = 2, // Bear Trend
   REGIME_RANGE_BOUND      = 3, // Range-Bound / Mean-Reverting
   REGIME_VOL_COMPRESSION  = 4, // Volatility Compression / Squeeze
   REGIME_CRISIS_SHOCK     = 5  // Crisis / Volatility Spike
};

//+------------------------------------------------------------------+
//| Core Lifecycle & State Controller                                |
//+------------------------------------------------------------------+
class CSpartanCore
{
private:
   bool              m_isInitialized;
   bool              m_globalBotActive;    // Synced with Mini-App RTDB system_config.globalBotActive
   bool              m_emergencyHalt;      // Local emergency tripwire state
   string            m_haltReason;
   datetime          m_lastHeartbeatTime;
   int               m_heartbeatInterval;  // Default 15s
   string            m_version;
   string            m_systemName;

   // Account snapshot metrics
   long              m_accountLogin;
   string            m_broker;
   string            m_server;
   double            m_balance;
   double            m_equity;
   double            m_margin;
   double            m_freeMargin;
   double            m_marginLevel;
   double            m_floatingProfit;
   int               m_openPositions;

public:
                     CSpartanCore(void);
                    ~CSpartanCore(void);

   bool              Init(const int heartbeatIntervalSeconds = 15);
   void              Deinit(void);

   void              RefreshAccountState(void);
   bool              IsTradingAllowed(void);
   bool              ShouldSendHeartbeat(void) const;
   void              MarkHeartbeatSent(void);

   // Remote kill-switch bridge
   void              SetGlobalBotActive(const bool active);
   bool              GetGlobalBotActive(void) const { return m_globalBotActive; }

   // Emergency tripwire controls
   void              TriggerEmergencyHalt(const string reason);
   void              ResetEmergencyHalt(void);
   bool              IsEmergencyHalt(void) const { return m_emergencyHalt; }
   string            GetHaltReason(void) const { return m_haltReason; }

   // Account metric accessors
   long              GetAccountLogin(void) const { return m_accountLogin; }
   string            GetBroker(void) const { return m_broker; }
   string            GetServer(void) const { return m_server; }
   double            GetBalance(void) const { return m_balance; }
   double            GetEquity(void) const { return m_equity; }
   double            GetMargin(void) const { return m_margin; }
   double            GetFreeMargin(void) const { return m_freeMargin; }
   double            GetMarginLevel(void) const { return m_marginLevel; }
   double            GetFloatingProfit(void) const { return m_floatingProfit; }
   int               GetOpenPositions(void) const { return m_openPositions; }
   int               GetHeartbeatInterval(void) const { return m_heartbeatInterval; }
   string            GetVersion(void) const { return m_version; }
   string            GetSystemName(void) const { return m_systemName; }
};

//+------------------------------------------------------------------+
//| Constructor                                                      |
//+------------------------------------------------------------------+
CSpartanCore::CSpartanCore(void)
   : m_isInitialized(false),
     m_globalBotActive(true),
     m_emergencyHalt(false),
     m_haltReason(""),
     m_lastHeartbeatTime(0),
     m_heartbeatInterval(15),
     m_version("2.00"),
     m_systemName("SPARTAN_INSTITUTIONAL_CORE"),
     m_accountLogin(0),
     m_broker(""),
     m_server(""),
     m_balance(0.0),
     m_equity(0.0),
     m_margin(0.0),
     m_freeMargin(0.0),
     m_marginLevel(0.0),
     m_floatingProfit(0.0),
     m_openPositions(0)
{
}

//+------------------------------------------------------------------+
//| Destructor                                                       |
//+------------------------------------------------------------------+
CSpartanCore::~CSpartanCore(void)
{
   Deinit();
}

//+------------------------------------------------------------------+
//| Initialization                                                   |
//+------------------------------------------------------------------+
bool CSpartanCore::Init(const int heartbeatIntervalSeconds = 15)
{
   m_heartbeatInterval = (heartbeatIntervalSeconds > 0) ? heartbeatIntervalSeconds : 15;
   m_globalBotActive = true;
   m_emergencyHalt = false;
   m_haltReason = "";
   m_lastHeartbeatTime = 0;

   RefreshAccountState();
   m_isInitialized = true;

   PrintFormat("[SPARTAN CORE] Initialized %s v%s. Heartbeat: %ds | Account: %I64d (%s)",
               m_systemName, m_version, m_heartbeatInterval, m_accountLogin, m_broker);
   return true;
}

//+------------------------------------------------------------------+
//| Deinitialization                                                 |
//+------------------------------------------------------------------+
void CSpartanCore::Deinit(void)
{
   if(m_isInitialized)
   {
      m_isInitialized = false;
      Print("[SPARTAN CORE] Core engine stopped.");
   }
}

//+------------------------------------------------------------------+
//| Synchronize Account Metrics                                      |
//+------------------------------------------------------------------+
void CSpartanCore::RefreshAccountState(void)
{
   m_accountLogin   = AccountInfoInteger(ACCOUNT_LOGIN);
   m_broker         = AccountInfoString(ACCOUNT_COMPANY);
   m_server         = AccountInfoString(ACCOUNT_SERVER);
   m_balance        = AccountInfoDouble(ACCOUNT_BALANCE);
   m_equity         = AccountInfoDouble(ACCOUNT_EQUITY);
   m_margin         = AccountInfoDouble(ACCOUNT_MARGIN);
   m_freeMargin     = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
   m_marginLevel    = AccountInfoDouble(ACCOUNT_MARGIN_LEVEL);
   m_floatingProfit = AccountInfoDouble(ACCOUNT_PROFIT);
   m_openPositions  = PositionsTotal();
}

//+------------------------------------------------------------------+
//| Check whether trading is permitted                               |
//+------------------------------------------------------------------+
bool CSpartanCore::IsTradingAllowed(void)
{
   if(!m_isInitialized) return false;
   if(m_emergencyHalt) return false;
   if(!m_globalBotActive) return false;

   if(!TerminalInfoInteger(TERMINAL_TRADE_ALLOWED)) return false;
   if(!MQLInfoInteger(MQL_TRADE_ALLOWED)) return false;

   return true;
}

//+------------------------------------------------------------------+
//| Evaluate if heartbeat dispatch timer has elapsed                 |
//+------------------------------------------------------------------+
bool CSpartanCore::ShouldSendHeartbeat(void) const
{
   return (TimeCurrent() - m_lastHeartbeatTime >= m_heartbeatInterval);
}

//+------------------------------------------------------------------+
//| Record timestamp of last successful heartbeat                     |
//+------------------------------------------------------------------+
void CSpartanCore::MarkHeartbeatSent(void)
{
   m_lastHeartbeatTime = TimeCurrent();
}

//+------------------------------------------------------------------+
//| Update global bot active state from remote backend sync          |
//+------------------------------------------------------------------+
void CSpartanCore::SetGlobalBotActive(const bool active)
{
   if(m_globalBotActive != active)
   {
      m_globalBotActive = active;
      if(!m_globalBotActive)
      {
         Print("🛑 [SPARTAN CORE] Remote Kill-Switch engaged via /api/ea/webhook: Bot halted.");
      }
      else
      {
         Print("✅ [SPARTAN CORE] Remote Kill-Switch cleared via /api/ea/webhook: Bot active.");
      }
   }
}

//+------------------------------------------------------------------+
//| Trigger local emergency halt                                     |
//+------------------------------------------------------------------+
void CSpartanCore::TriggerEmergencyHalt(const string reason)
{
   m_emergencyHalt = true;
   m_haltReason = reason;
   PrintFormat("⚠️ [SPARTAN CORE] EMERGENCY HALT TRIGGERED! Reason: %s", reason);
}

//+------------------------------------------------------------------+
//| Clear emergency halt                                             |
//+------------------------------------------------------------------+
void CSpartanCore::ResetEmergencyHalt(void)
{
   m_emergencyHalt = false;
   m_haltReason = "";
   Print("✅ [SPARTAN CORE] Emergency halt reset. Trading re-enabled.");
}

#endif // __SPARTAN_CORE_MQH__
