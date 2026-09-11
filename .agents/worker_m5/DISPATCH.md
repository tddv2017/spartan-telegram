# Dispatch: Worker M5 - Execution Bot & Webhook Bridge

You are the Implementation Worker for Milestone 5.
Your working directory is: f:\Development\spartan-miniapp-telegram\.agents\worker_m5
Parent conversation ID: 02307c0f-7278-4494-b854-3264a398bba3

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. An auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY READING:
- Original User Request: f:\Development\spartan-miniapp-telegram\.agents\ORIGINAL_REQUEST.md
- Project Scope & Architecture: f:\Development\spartan-miniapp-telegram\PROJECT.md
- Backend Webhook Mining Report:
  * f:\Development\spartan-miniapp-telegram\.agents\spec_miner_survey_1\handoff.md
- Existing Codebase Reference:
  * `src/app/api/ea/webhook/route.ts` (Next.js webhook gateway)
  * `public/ea/SpartanBridgeEA.mq5` (Reference bridge)

EXCLUSIVE FILE OWNERSHIP:
You own exclusively:
- `quant_research/execution/mql5/SpartanMasterEA.mq5`
- `quant_research/execution/mql5/Include/SpartanCore.mqh`
- `quant_research/execution/mql5/Include/SpartanGhost.mqh`
- `quant_research/execution/mql5/Include/SpartanRisk.mqh`
- `quant_research/execution/mql5/Include/SpartanTrade.mqh`
- `quant_research/execution/mql5/Include/SpartanWebhook.mqh`
- `quant_research/execution/mql5/Include/SpartanNews.mqh`
- `quant_research/execution/python/__init__.py`
- `quant_research/execution/python/ccxt_executor.py`
- `quant_research/execution/python/webhook_client.py`
- `quant_research/tests/test_mql5_syntax.py`
- `quant_research/tests/test_webhook_bridge.py`

IMPLEMENTATION SPECIFICATIONS (Features 23 - 27 in PROJECT.md):
1. Modular MQL5 Expert Advisor (`SpartanMasterEA.mq5` & `Include/`):
   - Strict MQL5 compliance (`#property strict`), clean object-oriented architecture, zero compilation errors, zero critical warnings.
   - `Include/SpartanCore.mqh`: Lifecycle controller (`OnInit`, `OnDeinit`, `OnTick`, `OnTimer`), heartbeat event dispatcher.
   - `Include/SpartanGhost.mqh`: Multi-Ghost Architecture managing isolated order state machines per sub-strategy using hierarchical Magic Number taxonomy: `880000 + (AssetCode * 1000) + (StrategyCode * 10) + Variant`. Filters position lookups strictly by magic number to guarantee zero cross-contamination.
   - `Include/SpartanRisk.mqh`: Calibrated Fractional Kelly lot calculator (0.25% - 0.50%), 4-Tier Drawdown Governor, and Stop-Out LTV 85% circuit breaker.
   - `Include/SpartanTrade.mqh`: Slippage guard, atomic order dispatcher, retry logic with exponential backoff.
   - `Include/SpartanWebhook.mqh`: Resilient WebRequest client connecting to `/api/ea/webhook`. Uses `x-ea-key` header and `apiKey` body. Features an in-memory queue (up to 500 items) and offline ring-buffer spool to `MQL5/Files/spartan_webhook_spool.dat` on network drops. Parses two-way server response (`globalBotActive`) and halts new entries if disabled.
   - `Include/SpartanNews.mqh`: Economic calendar blackout filter and spread expansion monitor.
2. Python CCXT Crypto Execution Bot (`execution/python/ccxt_executor.py`):
   - Asynchronous execution bot for Binance Futures and Bybit Linear perpetuals using `asyncio` and `ccxt.pro`.
   - Subscribes to live bookTicker / L2 depth and private execution streams.
   - Smart Order Routing: Post-Only limit orders for normal entries; IOC market orders with max 0.05% slippage for breakouts.
   - Client Order ID taxonomy: `SPARTAN_{magic_number}_{timestamp_ms}`.
3. Python Webhook Client (`execution/python/webhook_client.py`):
   - Synchronous/asynchronous client reporting `TRADE_CLOSED`, `HEARTBEAT`, and `SECURITY_ALERT` payloads to `/api/ea/webhook`.
   - Explicitly passes `openPrice` and `pnlPercentage` (mandatory for Crypto/Forex per `spec_miner_survey_1`).
   - Verifies HTTP 200 response with < 500ms latency.
4. Verification & Testing:
   - `quant_research/tests/test_mql5_syntax.py`: Parses all `.mq5` and `.mqh` files, verifying strict syntax, balanced braces/parentheses, OOP class definitions, `#property strict`, error handlers, and zero syntax errors.
   - `quant_research/tests/test_webhook_bridge.py`: Tests payload serialization, schema compliance with `route.ts`, authentication hashing, offline queue spooling, and simulated HTTP response handling.
   - Run tests: `python -m pytest quant_research/tests/test_mql5_syntax.py quant_research/tests/test_webhook_bridge.py -v`.
   - Run E2E test runner: `python quant_research/run_e2e_tests.py`.
   - Ensure `./node_modules/.bin/tsc --noEmit` exits 0.
   - Deliver handoff report to: `f:\Development\spartan-miniapp-telegram\.agents\worker_m5\handoff.md`.
   - Notify parent when complete.

## 2026-09-10T23:56:21Z
Assigned Milestone 5: Execution Bot & Webhook Bridge. Commencing architecture, implementation, and verification.
