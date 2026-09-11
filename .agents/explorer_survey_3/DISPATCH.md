# Survey Dispatch: Validation Framework, Risk Management, MQL5 & Python Execution Architecture

Target: Map the requirements and architecture for R2, R3, R4:
- R2 Validation Framework: Python backtest engine (VectorBT / Backtrader / Pandas), Out-of-Sample (OOS), Walk-Forward Optimization (WFO), 1,000 Monte Carlo simulations (drawdown > 10% probability < 1%), slippage & spread spike stress testing (CPI, NFP, FOMC news events).
- R3 Execution Bot: Modular MQL5 EA (.mq5) with Multi-Ghost Architecture (unique Magic Numbers per sub-strategy), WebRequest to `/api/ea/webhook`, Python/CCXT crypto execution scripts.
- R4 Multi-Tier Risk Engine: Kelly / Fixed Fractional (0.25% - 0.5% per trade), Max DD <= 5.0%, Emergency Kill-Switch / Circuit Breaker on Stop-Out LTV 85% or latency anomaly.
- Acceptance criteria analysis.
Read `f:\Development\spartan-miniapp-telegram\.agents\ORIGINAL_REQUEST.md` thoroughly before starting.
Write your findings to `f:\Development\spartan-miniapp-telegram\.agents\explorer_survey_3\handoff.md`.

## 2026-09-10T23:19:24Z
You are the Validation and Execution Architect (teamwork_preview_explorer).
Your working directory is: f:\Development\spartan-miniapp-telegram\.agents\explorer_survey_3
Read your instructions in: f:\Development\spartan-miniapp-telegram\.agents\explorer_survey_3\DISPATCH.md
MANDATORY: Read the original user request at: f:\Development\spartan-miniapp-telegram\.agents\ORIGINAL_REQUEST.md
Survey and design the architecture for R2, R3, and R4:
- R2 Validation Framework:
  * Python automated backtesting engine (clean Pandas/NumPy/VectorBT compatible structure).
  * Out-of-Sample (OOS) testing split (e.g. 70/30 or 60/20/20).
  * Walk-Forward Optimization (WFO) rolling windows.
  * Monte Carlo simulation framework (1,000 runs minimum) assessing probability of DD > 10% (< 1%).
  * News event stress testing (CPI, NFP, FOMC) with simulated slippage (e.g. 5-30 pips / 0.5-2%) and spread spikes (3x-10x normal).
  * Report generation: HTML and Markdown Summary with Sharpe, Sortino, Calmar, Recovery Factor, Profit Factor (>=2.0), Win Rate (>=60%), R:R (>=1:1.5), Max DD (<=5.0%).
- R3 Execution Bot & Webhook Bridge:
  * Modular MQL5 Expert Advisor (.mq5) with clean architecture, strict zero errors/warnings.
  * Multi-Ghost Architecture: unique Magic Numbers per sub-strategy/asset.
  * WebRequest integration to `/api/ea/webhook`.
  * Python/CCXT crypto execution scripts.
- R4 Multi-Tier Risk Engine:
  * Risk-adjusted sizing: Calibrated Kelly Criterion / Fixed Fractional (0.25% - 0.5% per trade).
  * Portfolio-level drawdown cap (<= 5.0%).
  * Emergency Kill-Switch / Circuit Breaker (Stop-Out LTV 85% or latency anomaly).
Write a comprehensive handoff report to: f:\Development\spartan-miniapp-telegram\.agents\explorer_survey_3\handoff.md
Send a completion message back to parent when done.
