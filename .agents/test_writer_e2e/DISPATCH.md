# Dispatch: Test Writer - Opaque-Box E2E Testing Track

You are the E2E Test Writer.
Your working directory is: f:\Development\spartan-miniapp-telegram\.agents\test_writer_e2e
Parent conversation ID: 02307c0f-7278-4494-b854-3264a398bba3

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All test cases and runners must be genuine. DO NOT fabricate results or create dummy tests. An auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY READING:
- Original User Request: f:\Development\spartan-miniapp-telegram\.agents\ORIGINAL_REQUEST.md
- Project Scope & Architecture: f:\Development\spartan-miniapp-telegram\PROJECT.md
- Survey Findings:
  * f:\Development\spartan-miniapp-telegram\.agents\spec_miner_survey_1\handoff.md
  * f:\Development\spartan-miniapp-telegram\.agents\explorer_survey_2\handoff.md
  * f:\Development\spartan-miniapp-telegram\.agents\explorer_survey_3\handoff.md

EXCLUSIVE FILE OWNERSHIP:
You own exclusively:
- `TEST_INFRA.md` (at project root)
- `quant_research/e2e_tests/` (all test files within)
- `quant_research/run_e2e_tests.py`
- `TEST_READY.md` (at project root)

REQUIREMENTS & TEST CASE DESIGN METHODOLOGY:
1. Create `TEST_INFRA.md` at `f:\Development\spartan-miniapp-telegram\TEST_INFRA.md` following the template in the orchestrator instructions.
2. Build an opaque-box, requirements-driven test suite covering ALL 29 features in `PROJECT.md § Feature Inventory` using the systematic 4-tier methodology:
   - **Tier 1 - Feature Coverage (>=5 test cases per feature)**:
     Unit / functional verification of each feature in isolation (Features 1 through 29). Happy-path tests with representative inputs.
   - **Tier 2 - Boundary & Corner Cases (>=5 test cases per feature)**:
     Zero/negative values, extreme market shocks (10x spread, 30-pip slippage), maximum lot size (50.0 lots), minimum lot size (0.01 lot), margin level 85% threshold, extreme anomalous PnL (> $50,000 capping), missing fields, malformed timestamps.
   - **Tier 3 - Cross-Feature Combinations (pairwise coverage)**:
     Interactions between Alpha Models, Regime states, Asset Microstructures, Risk Engine sizing (Kelly), Drawdown Governors, and Webhook bridge payloads.
   - **Tier 4 - Real-World Application Scenarios (>=5 realistic scenarios)**:
     Full end-to-end scenarios:
     * Scenario 1: Gold Volatility Breakout during CPI release with 10x spread spike and slippage.
     * Scenario 2: ETH/BTC Statistical Arbitrage under Kalman dynamic hedging across 36 months.
     * Scenario 3: Crypto Trend Following during flash crash triggering Emergency Kill-Switch / Circuit Breaker.
     * Scenario 4: Multi-Ghost simultaneous execution on EURUSD/GBPUSD with isolated Magic Numbers and Webhook reporting to `/api/ea/webhook`.
     * Scenario 5: Stop-Out LTV 85% simulated account liquidation and de-leveraging test.
3. Build `quant_research/run_e2e_tests.py`:
   - Standalone executable Python test runner with rich CLI output.
   - Computes tier-by-tier pass/fail stats, execution times, and summary report.
   - Exit code 0 if all tests pass, 1 if any test fails.
4. When test creation and local verification pass, write `TEST_READY.md` at the project root (`f:\Development\spartan-miniapp-telegram\TEST_READY.md`).
5. Write your handoff report to `f:\Development\spartan-miniapp-telegram\.agents\test_writer_e2e\handoff.md` and notify parent.

## 2026-09-10T23:25:03Z

You are the E2E Test Writer.
Your working directory is: f:\Development\spartan-miniapp-telegram\.agents\test_writer_e2e
Read your instructions in: f:\Development\spartan-miniapp-telegram\.agents\test_writer_e2e\DISPATCH.md
MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All test cases and runners must be genuine. DO NOT fabricate results or create dummy tests. An auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
MANDATORY: Read the original user request at: f:\Development\spartan-miniapp-telegram\.agents\ORIGINAL_REQUEST.md
Read the project architecture and feature inventory at: f:\Development\spartan-miniapp-telegram\PROJECT.md
Build the E2E Testing Suite:
1. Create TEST_INFRA.md at project root (f:\Development\spartan-miniapp-telegram\TEST_INFRA.md).
2. Author opaque-box test cases across Tiers 1-4 covering all 29 features in PROJECT.md § Feature Inventory.
3. Build executable test runner script: quant_research/run_e2e_tests.py.
4. When test cases and runner are ready, publish TEST_READY.md at project root.
5. Deliver comprehensive handoff report to: f:\Development\spartan-miniapp-telegram\.agents\test_writer_e2e\handoff.md
Send a completion message back to parent when finished.
