//+------------------------------------------------------------------+
//|                                               SpartanWebhook.mqh |
//|                                  Copyright 2026, Spartan Quant AI |
//|                                https://spartan-telegram.vercel.app |
//+------------------------------------------------------------------+
#ifndef __SPARTAN_WEBHOOK_MQH__
#define __SPARTAN_WEBHOOK_MQH__

#property copyright "Copyright 2026, Spartan Quant AI"
#property link      "https://spartan-telegram.vercel.app"
#property strict

#define SPARTAN_QUEUE_CAPACITY        500
#define SPARTAN_DEFAULT_SPOOL_FILE    "spartan_webhook_spool.dat"
#define SPARTAN_DEFAULT_TIMEOUT_MS    4000

//+------------------------------------------------------------------+
//| Webhook Queue Item Structure                                     |
//+------------------------------------------------------------------+
struct SpartanQueueItem
{
   string            payload;
   datetime          timestamp;
   int               retryCount;
};

//+------------------------------------------------------------------+
//| Resilient WebRequest Client & Spool Bridge                       |
//+------------------------------------------------------------------+
class CSpartanWebhookBridge
{
private:
   string            m_serverUrl;
   string            m_apiKey;
   int               m_timeoutMs;
   string            m_spoolFilename;

   // In-memory FIFO Ring Queue (500 items)
   SpartanQueueItem  m_queue[SPARTAN_QUEUE_CAPACITY];
   int               m_head;
   int               m_tail;
   int               m_count;

   // Telemetry & state
   bool              m_remoteBotActive;
   datetime          m_lastSuccessfulSend;
   int               m_totalSent;
   int               m_totalFailed;
   int               m_totalSpooled;

public:
                     CSpartanWebhookBridge(void);
                    ~CSpartanWebhookBridge(void);

   bool              Init(const string serverUrl,
                          const string apiKey,
                          const string spoolFile = SPARTAN_DEFAULT_SPOOL_FILE,
                          const int timeoutMs = SPARTAN_DEFAULT_TIMEOUT_MS);
   void              Deinit(void);

   // Queue & Spool Operations
   bool              Enqueue(const string jsonPayload);
   bool              Dequeue(string &payload);
   int               GetQueueCount(void) const { return m_count; }
   int               GetQueueCapacity(void) const { return SPARTAN_QUEUE_CAPACITY; }
   string            GetSpoolFilename(void) const { return m_spoolFilename; }

   bool              SpoolToDisk(const string jsonPayload);
   int               DrainSpoolFromDisk(void);
   void              FlushAllToDisk(void);

   // HTTP Execution
   bool              SendHttpRequest(const string jsonPayload, string &respStr, int &httpCode);
   int               ProcessQueue(const int maxBatch = 10);

   // High-level Event Dispatchers
   bool              SendTradeClosed(const ulong dealTicket,
                                     const string symbol,
                                     const string orderType,
                                     const double volume,
                                     const double openPrice,
                                     const double closePrice,
                                     const double netProfit,
                                     const double pnlPct,
                                     const string comment,
                                     const long magicNum);

   bool              SendHeartbeat(const long accountLogin,
                                   const string broker,
                                   const string server,
                                   const double balance,
                                   const double equity,
                                   const double profit,
                                   const double margin,
                                   const double freeMargin,
                                   const double marginLevel,
                                   const int openPositions);

   // Server feedback
   bool              IsRemoteBotActive(void) const { return m_remoteBotActive; }
   datetime          GetLastSuccessfulSend(void) const { return m_lastSuccessfulSend; }

private:
   void              ParseServerResponse(const string respStr);
};

//+------------------------------------------------------------------+
//| Constructor                                                      |
//+------------------------------------------------------------------+
CSpartanWebhookBridge::CSpartanWebhookBridge(void)
   : m_serverUrl("https://spartan-telegram.vercel.app/api/ea/webhook"),
     m_apiKey(""),
     m_timeoutMs(SPARTAN_DEFAULT_TIMEOUT_MS),
     m_spoolFilename(SPARTAN_DEFAULT_SPOOL_FILE),
     m_head(0),
     m_tail(0),
     m_count(0),
     m_remoteBotActive(true),
     m_lastSuccessfulSend(0),
     m_totalSent(0),
     m_totalFailed(0),
     m_totalSpooled(0)
{
   for(int i = 0; i < SPARTAN_QUEUE_CAPACITY; i++)
   {
      m_queue[i].payload = "";
      m_queue[i].timestamp = 0;
      m_queue[i].retryCount = 0;
   }
}

//+------------------------------------------------------------------+
//| Destructor                                                       |
//+------------------------------------------------------------------+
CSpartanWebhookBridge::~CSpartanWebhookBridge(void)
{
   Deinit();
}

//+------------------------------------------------------------------+
//| Initialization                                                   |
//+------------------------------------------------------------------+
bool CSpartanWebhookBridge::Init(const string serverUrl,
                                 const string apiKey,
                                 const string spoolFile = SPARTAN_DEFAULT_SPOOL_FILE,
                                 const int timeoutMs = SPARTAN_DEFAULT_TIMEOUT_MS)
{
   m_serverUrl       = (serverUrl != "") ? serverUrl : "https://spartan-telegram.vercel.app/api/ea/webhook";
   m_apiKey          = apiKey;
   m_spoolFilename   = (spoolFile != "") ? spoolFile : SPARTAN_DEFAULT_SPOOL_FILE;
   m_timeoutMs       = (timeoutMs > 0) ? timeoutMs : SPARTAN_DEFAULT_TIMEOUT_MS;
   m_head            = 0;
   m_tail            = 0;
   m_count           = 0;
   m_remoteBotActive = true;
   m_totalSent       = 0;
   m_totalFailed     = 0;
   m_totalSpooled    = 0;

   // Drain existing offline spool on startup
   int drained = DrainSpoolFromDisk();
   PrintFormat("[SPARTAN WEBHOOK] Initialized gateway to %s (Spool: %s, recovered %d items)",
               m_serverUrl, m_spoolFilename, drained);
   return true;
}

//+------------------------------------------------------------------+
//| Deinitialization: Flush remaining memory queue to disk           |
//+------------------------------------------------------------------+
void CSpartanWebhookBridge::Deinit(void)
{
   if(m_count > 0)
   {
      FlushAllToDisk();
   }
}

//+------------------------------------------------------------------+
//| Enqueue payload in FIFO in-memory buffer (Capacity: 500)         |
//+------------------------------------------------------------------+
bool CSpartanWebhookBridge::Enqueue(const string jsonPayload)
{
   if(m_count >= SPARTAN_QUEUE_CAPACITY)
   {
      // Buffer full -> Spool to disk directly
      PrintFormat("⚠️ [SPARTAN WEBHOOK] In-memory queue full (%d items). Spooling to disk file: %s",
                  SPARTAN_QUEUE_CAPACITY, m_spoolFilename);
      SpoolToDisk(jsonPayload);
      return false;
   }

   m_queue[m_tail].payload    = jsonPayload;
   m_queue[m_tail].timestamp  = TimeCurrent();
   m_queue[m_tail].retryCount = 0;

   m_tail = (m_tail + 1) % SPARTAN_QUEUE_CAPACITY;
   m_count++;
   return true;
}

//+------------------------------------------------------------------+
//| Dequeue payload from FIFO in-memory buffer                       |
//+------------------------------------------------------------------+
bool CSpartanWebhookBridge::Dequeue(string &payload)
{
   if(m_count == 0) return false;

   payload = m_queue[m_head].payload;
   m_queue[m_head].payload = "";

   m_head = (m_head + 1) % SPARTAN_QUEUE_CAPACITY;
   m_count--;
   return true;
}

//+------------------------------------------------------------------+
//| Append payload line to disk spool file                           |
//+------------------------------------------------------------------+
bool CSpartanWebhookBridge::SpoolToDisk(const string jsonPayload)
{
   ResetLastError();
   int handle = FileOpen(m_spoolFilename, FILE_READ|FILE_WRITE|FILE_TXT|FILE_SHARE_READ|FILE_SHARE_WRITE);
   if(handle == INVALID_HANDLE)
   {
      PrintFormat("❌ [SPARTAN WEBHOOK] Failed to open spool file %s. Error: %d", m_spoolFilename, GetLastError());
      return false;
   }

   FileSeek(handle, 0, SEEK_END);
   FileWriteString(handle, jsonPayload + "\n");
   FileClose(handle);

   m_totalSpooled++;
   return true;
}

//+------------------------------------------------------------------+
//| Drain disk spool file back into in-memory queue or dispatch      |
//+------------------------------------------------------------------+
int CSpartanWebhookBridge::DrainSpoolFromDisk(void)
{
   ResetLastError();
   if(!FileIsExist(m_spoolFilename)) return 0;

   int handle = FileOpen(m_spoolFilename, FILE_READ|FILE_TXT|FILE_SHARE_READ);
   if(handle == INVALID_HANDLE) return 0;

   string lines[];
   int lineCount = 0;

   while(!FileIsEnding(handle))
   {
      string line = FileReadString(handle);
      StringTrimLeft(line);
      StringTrimRight(line);
      if(StringLen(line) > 5)
      {
         ArrayResize(lines, lineCount + 1);
         lines[lineCount] = line;
         lineCount++;
      }
   }
   FileClose(handle);

   if(lineCount > 0)
   {
      // Delete original spool file
      FileDelete(m_spoolFilename);

      int queued = 0;
      for(int i = 0; i < lineCount; i++)
      {
         if(Enqueue(lines[i]))
         {
            queued++;
         }
         else
         {
            // Re-spool overflow
            SpoolToDisk(lines[i]);
         }
      }
      PrintFormat("[SPARTAN WEBHOOK] Recovered %d/%d spooled items into active queue.", queued, lineCount);
      return queued;
   }

   return 0;
}

//+------------------------------------------------------------------+
//| Flush all memory queue items to disk file                        |
//+------------------------------------------------------------------+
void CSpartanWebhookBridge::FlushAllToDisk(void)
{
   int flushed = 0;
   string item;
   while(Dequeue(item))
   {
      if(SpoolToDisk(item))
      {
         flushed++;
      }
   }
   PrintFormat("[SPARTAN WEBHOOK] Flushed %d remaining in-memory payloads to %s", flushed, m_spoolFilename);
}

//+------------------------------------------------------------------+
//| Send HTTP POST WebRequest to /api/ea/webhook                     |
//+------------------------------------------------------------------+
bool CSpartanWebhookBridge::SendHttpRequest(const string jsonPayload, string &respStr, int &httpCode)
{
   char postData[];
   char resultData[];
   string resultHeaders;
   string headers = "Content-Type: application/json\r\n" +
                    "x-ea-key: " + m_apiKey + "\r\n";

   StringToCharArray(jsonPayload, postData, 0, WHOLE_ARRAY, CP_UTF8);
   int dataSize = ArraySize(postData);
   if(dataSize > 0 && postData[dataSize - 1] == '\0')
   {
      ArrayResize(postData, dataSize - 1); // Strip trailing null terminator
   }

   ResetLastError();
   httpCode = WebRequest("POST", m_serverUrl, headers, m_timeoutMs, postData, resultData, resultHeaders);

   if(httpCode == 200)
   {
      respStr = CharArrayToString(resultData, 0, WHOLE_ARRAY, CP_UTF8);
      m_lastSuccessfulSend = TimeCurrent();
      m_totalSent++;
      ParseServerResponse(respStr);
      return true;
   }
   else if(httpCode == -1)
   {
      int err = GetLastError();
      if(err == 4014) // ERR_FUNCTION_NOT_ALLOWED
      {
         Print("❌ [SPARTAN ERROR 4014] WebRequest URL not allowed in MT5 settings!");
         Print("👉 Tools -> Options -> Expert Advisors -> Allow WebRequest for: ", m_serverUrl);
      }
      else
      {
         PrintFormat("⚠️ [SPARTAN ERROR] WebRequest connection failure. ErrorCode: %d", err);
      }
      m_totalFailed++;
      return false;
   }
   else
   {
      respStr = CharArrayToString(resultData, 0, WHOLE_ARRAY, CP_UTF8);
      PrintFormat("⚠️ [SPARTAN WEBHOOK SERVER] HTTP %d: %s", httpCode, respStr);
      m_totalFailed++;
      return false;
   }
}

//+------------------------------------------------------------------+
//| Parse server response payload and extract remote control flags   |
//+------------------------------------------------------------------+
void CSpartanWebhookBridge::ParseServerResponse(const string respStr)
{
   // Check if server remote kill-switch has halted trading
   if(StringFind(respStr, "\"globalBotActive\":false") >= 0 ||
      StringFind(respStr, "\"globalBotActive\": false") >= 0)
   {
      m_remoteBotActive = false;
   }
   else if(StringFind(respStr, "\"globalBotActive\":true") >= 0 ||
           StringFind(respStr, "\"globalBotActive\": true") >= 0)
   {
      m_remoteBotActive = true;
   }
}

//+------------------------------------------------------------------+
//| Process and drain queued items                                   |
//+------------------------------------------------------------------+
int CSpartanWebhookBridge::ProcessQueue(const int maxBatch = 10)
{
   if(m_count == 0) return 0;

   int processed = 0;
   int batch = MathMin(maxBatch, m_count);

   for(int i = 0; i < batch; i++)
   {
      string payload = "";
      if(!Dequeue(payload)) break;

      string respStr = "";
      int httpCode = 0;

      if(SendHttpRequest(payload, respStr, httpCode))
      {
         processed++;
      }
      else
      {
         // Re-enqueue or spool to disk on failure
         if(!Enqueue(payload))
         {
            SpoolToDisk(payload);
         }
         break; // Halt further attempts this cycle to avoid blocking timer
      }
   }

   return processed;
}

//+------------------------------------------------------------------+
//| Send closed trade report (TRADE_CLOSED)                          |
//+------------------------------------------------------------------+
bool CSpartanWebhookBridge::SendTradeClosed(const ulong dealTicket,
                                           const string symbol,
                                           const string orderType,
                                           const double volume,
                                           const double openPrice,
                                           const double closePrice,
                                           const double netProfit,
                                           const double pnlPct,
                                           const string comment,
                                           const long magicNum)
{
   string jsonPayload = StringFormat(
      "{\"action\":\"TRADE_CLOSED\",\"apiKey\":\"%s\",\"ticket\":\"%I64u\",\"symbol\":\"%s\"," +
      "\"type\":\"%s\",\"lots\":%.2f,\"openPrice\":%.4f,\"closePrice\":%.4f," +
      "\"pnl\":%.2f,\"pnlPercentage\":%.2f,\"comment\":\"%s\",\"magicNumber\":%I64d," +
      "\"timestamp\":\"%s\"}",
      m_apiKey, dealTicket, symbol, orderType, volume, openPrice, closePrice,
      netProfit, pnlPct, comment, magicNum,
      TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS)
   );

   string respStr;
   int httpCode;
   if(SendHttpRequest(jsonPayload, respStr, httpCode))
   {
      PrintFormat("⚡ [SPARTAN WEBHOOK] Synced Deal #%I64u (%s %.2f lots, PnL $%.2f)",
                  dealTicket, symbol, volume, netProfit);
      return true;
   }

   // Network failed -> Enqueue in buffer
   PrintFormat("⚠️ [SPARTAN WEBHOOK] Failed to send deal #%I64u immediately. Enqueuing...", dealTicket);
   return Enqueue(jsonPayload);
}

//+------------------------------------------------------------------+
//| Send account balance & master pool heartbeat (HEARTBEAT)         |
//+------------------------------------------------------------------+
bool CSpartanWebhookBridge::SendHeartbeat(const long accountLogin,
                                         const string broker,
                                         const string server,
                                         const double balance,
                                         const double equity,
                                         const double profit,
                                         const double margin,
                                         const double freeMargin,
                                         const double marginLevel,
                                         const int openPositions)
{
   string jsonPayload = StringFormat(
      "{\"action\":\"HEARTBEAT\",\"apiKey\":\"%s\",\"accountNumber\":\"%I64d\",\"broker\":\"%s\"," +
      "\"server\":\"%s\",\"balance\":%.2f,\"equity\":%.2f,\"floatingProfit\":%.2f," +
      "\"margin\":%.2f,\"freeMargin\":%.2f,\"marginLevel\":%.2f,\"openPositions\":%d}",
      m_apiKey, accountLogin, broker, server, balance, equity, profit,
      margin, freeMargin, marginLevel, openPositions
   );

   string respStr;
   int httpCode;
   return SendHttpRequest(jsonPayload, respStr, httpCode);
}

#endif // __SPARTAN_WEBHOOK_MQH__
