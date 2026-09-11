# Dispatch: Worker M3 - Multi-Tier Risk Management Engine

You are the Implementation Worker for Milestone 3.
Your working directory is: f:\Development\spartan-miniapp-telegram\.agents\worker_m3
Parent conversation ID: 02307c0f-7278-4494-b854-3264a398bba3

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. An auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY READING:
- Original User Request: f:\Development\spartan-miniapp-telegram\.agents\ORIGINAL_REQUEST.md
- Project Scope & Architecture: f:\Development\spartan-miniapp-telegram\PROJECT.md
- Survey Findings:
  * f:\Development\spartan-miniapp-telegram\.agents\spec_miner_survey_1\handoff.md
  * f:\Development\spartan-miniapp-telegram\.agents\explorer_survey_2\handoff.md
  * f:\Development\spartan-miniapp-telegram\.agents\explorer_survey_3\handoff.md
- Milestone 1 Completed Package:
  * `quant_research/core/types.py`, `constants.py`
  * `quant_research/config/risk_profiles.yaml`

EXCLUSIVE FILE OWNERSHIP:
You own exclusively:
- `quant_research/risk/__init__.py`
- `quant_research/risk/kelly_calculator.py`
- `quant_research/risk/drawdown_governor.py`
- `quant_research/risk/circuit_breaker.py`
- `quant_research/risk/risk_manager.py`
- `quant_research/tests/test_risk.py`

IMPLEMENTATION SPECIFICATIONS (Features 11 - 15 in PROJECT.md):
1. `quant_research/risk/kelly_calculator.py` (Feature 11):
   - Calibrated Fractional Kelly Sizing:
     $$K = \frac{p \cdot b - q}{b}$$
     Scaled by $c \approx 0.0125$ ($\frac{1}{25}$th Kelly), clamped strictly between $0.25\% \le f^* \le 0.50\%$ of Total Equity.
   - Sizing logic: Cash Risk (\$) = Equity * $f^*$.
   - Distance to SL = |Entry Price - Stop Loss|.
   - Lots = Cash Risk / (Distance to SL * Tick Value / Tick Size). Clamped to min lot (0.01) and max lot (50.0).
   - Margin check: Required margin <= 10% of free margin.
2. `quant_research/risk/drawdown_governor.py` (Feature 12):
   - 4-Tier Drawdown Governor tracking High-Water Mark (HWM):
     * Tier 1: Normal (0.0% - 2.99% DD) -> 100% sizing.
     * Tier 2: Soft Throttle (3.0% - 4.49% DD) -> Sizing halved (0.125% - 0.25%), tighten trailing stops by 30%.
     * Tier 3: Hard Freeze (4.5% - 4.99% DD) -> Block all new entries, lock breakeven on all positive trades.
     * Tier 4: Emergency Circuit Breaker (>= 5.0% DD) -> EMERGENCY KILL-SWITCH: Close all open positions immediately, cancel pending orders.
   - Hysteresis recovery: requires DD to fall back below 1.5% to return from Tier 2 to Tier 1.
3. `quant_research/risk/circuit_breaker.py` (Features 13, 14, 15):
   - Stop-Out LTV 85% Trigger: If Margin Utilization LTV >= 85.0% (Margin Level <= 117.65%), execute Graceful Emergency De-leveraging (sequentially close positions with highest margin burden until LTV < 50%).
   - Latency Tripwire: If roundtrip ping > 1,500ms or 3 consecutive timeouts occur, halt entries for 15 minutes.
   - Spread Anomaly Tripwire: If Spread > 3.5 * EMA(Spread, 100), block new entries.
   - Remote Admin Kill-Switch: Synchronizes with Spartan RTDB `system_config.globalBotActive`. If false, locks all trade executions.
4. `quant_research/risk/risk_manager.py`:
   - Unified `SpartanRiskEngine` implementing `IRiskEngine` interface from `PROJECT.md § Interface Contracts`:
     * `evaluate_order(signal, portfolio_equity, current_margin)`
     * `check_circuit_breaker(equity, balance, used_margin, latency_ms)`
5. Verification & Testing:
   - Build unit test suite in `quant_research/tests/test_risk.py` covering all features: Kelly sizing, lot clamping, 4-tier governor transitions, hysteresis, Stop-Out LTV 85% de-leveraging simulation, latency tripwire, remote kill-switch.
   - Run: `python -m pytest quant_research/tests/test_risk.py -v`.
   - Run Tier 1 E2E tests: `python quant_research/run_e2e_tests.py --tier 1`.
   - Verify `./node_modules/.bin/tsc --noEmit` exits 0.
   - Deliver handoff report to: `f:\Development\spartan-miniapp-telegram\.agents\worker_m2\handoff.md`.
   - Notify parent when complete.

## 2026-09-10T23:43:29Z
You are the Implementation Worker for Milestone 3 (Multi-Tier Risk Management Engine).
Your working directory is: f:\Development\spartan-miniapp-telegram\.agents\worker_m3
Read your instructions in: f:\Development\spartan-miniapp-telegram\.agents\worker_m3\DISPATCH.md
MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. An auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
MANDATORY: Read the original user request at: f:\Development\spartan-miniapp-telegram\.agents\ORIGINAL_REQUEST.md
Read the project architecture and feature inventory at: f:\Development\spartan-miniapp-telegram\PROJECT.md
Implement the Multi-Tier Risk Engine in quant_research/risk/:
- KellyCalculator (Calibrated fractional Kelly 0.25%-0.50%, lot clamping, margin check)
- DrawdownGovernor (4-tier governor: Soft 3%, Hard 4.5%, Circuit Breaker 5%, hysteresis recovery)
- CircuitBreaker (Stop-Out LTV 85% de-leveraging, latency >1500ms tripwire, spread >3.5x tripwire, remote kill-switch sync)
- RiskManager (SpartanRiskEngine implementing IRiskEngine interface)
Build unit tests in quant_research/tests/test_risk.py.
Run the tests and verify 100% pass rate.
Deliver handoff report to: f:\Development\spartan-miniapp-telegram\.agents\worker_m3\handoff.md
Send completion message to parent when finished.
