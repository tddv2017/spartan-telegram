# Dispatch: Worker M6 - Final Verification & Adversarial Hardening (Phase 1 & Phase 2)

You are the Implementation & Verification Specialist for Milestone 6 (Final Milestone).
Your working directory is: f:\Development\spartan-miniapp-telegram\.agents\worker_m6
Parent conversation ID: 02307c0f-7278-4494-b854-3264a398bba3

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations and tests must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. An auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY READING:
- Original User Request: f:\Development\spartan-miniapp-telegram\.agents\ORIGINAL_REQUEST.md
- Project Scope & Architecture: f:\Development\spartan-miniapp-telegram\PROJECT.md
- Test Readiness Declaration: f:\Development\spartan-miniapp-telegram\TEST_READY.md
- All Milestone Handoff Reports:
  * `.agents/worker_m1/handoff.md`
  * `.agents/worker_m2/handoff.md`
  * `.agents/worker_m3/handoff.md`
  * `.agents/worker_m4/handoff.md`
  * `.agents/worker_m5/handoff.md`
  * `.agents/test_writer_e2e/handoff.md`

SCOPE & MISSIONS:
Phase 1 — E2E Test Verification (Tiers 1-4):
- Execute the institutional test runner: `python quant_research/run_e2e_tests.py`.
- Verify that 100% of the 310 opaque-box test cases across Tiers 1, 2, 3, and 4 pass cleanly with exit code 0.

Phase 2 — Adversarial Coverage Hardening (Tier 5):
- Author Tier 5 white-box adversarial stress test suite in `quant_research/e2e_tests/test_tier5_adversarial_hardening.py` and `quant_research/tests/test_tier5_adversarial_hardening.py`:
  * Extreme numerical stability (zero variance, NaN inputs, division by zero guards).
  * Severe market regime transitions (instant flash-crash, hyper-volatility shock cooling).
  * Kelly position sizing edge cases (extreme tight vs extreme wide SL, minimum/maximum lot bounds [0.01, 50.0], margin exhaustion).
  * Stop-Out LTV 85% de-leveraging and broker stop-out cushion breach instant liquidation.
  * Macro news stress testing with 10x spread expansion and 30-pip adverse slippage.
  * MQL5 EA syntax and offline WebRequest spooling queue resilience.
- Run the Tier 5 tests and ensure 100% pass rate.

Final Pre-Flight Verifications:
- Run full pytest regression: `python -m pytest quant_research/tests/ -v`.
- Run Spartan Next.js pre-flight checks:
  1. `./node_modules/.bin/tsc --noEmit` -> Must exit with code 0 (zero errors).
  2. `./node_modules/.bin/next build` -> Must compile successfully for production.

Deliver your comprehensive handoff report to: `f:\Development\spartan-miniapp-telegram\.agents\worker_m6\handoff.md`.
Notify parent orchestrator when complete.
