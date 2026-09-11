## 2026-09-11T00:00:00Z
# Dispatch: Worker M4 - Rigorous Validation Framework & Stress Testing

You are the Implementation Worker for Milestone 4.
Your working directory is: f:\Development\spartan-miniapp-telegram\.agents\worker_m4
Parent conversation ID: 02307c0f-7278-4494-b854-3264a398bba3

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. An auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY READING:
- Original User Request: f:\Development\spartan-miniapp-telegram\.agents\ORIGINAL_REQUEST.md
- Project Scope & Architecture: f:\Development\spartan-miniapp-telegram\PROJECT.md
- Architectural Surveys:
  * f:\Development\spartan-miniapp-telegram\.agents\spec_miner_survey_1\handoff.md
  * f:\Development\spartan-miniapp-telegram\.agents\explorer_survey_2\handoff.md
  * f:\Development\spartan-miniapp-telegram\.agents\explorer_survey_3\handoff.md
- Completed Packages:
  * `quant_research/core/` (types, constants, logger)
  * `quant_research/data/` (generator, loader)
  * `quant_research/regime/` (regime_fsm, hurst, vol_metrics, shock_detector)
  * `quant_research/models/` (all 4 alpha models & asset microstructures)
  * `quant_research/risk/` (kelly_calculator, drawdown_governor, circuit_breaker, risk_manager)

EXCLUSIVE FILE OWNERSHIP:
You own exclusively:
- `quant_research/validation/__init__.py`
- `quant_research/validation/backtest_engine.py`
- `quant_research/validation/oos_split.py`
- `quant_research/validation/walk_forward.py`
- `quant_research/validation/monte_carlo.py`
- `quant_research/validation/stress_testing.py`
- `quant_research/validation/metrics.py`
- `quant_research/validation/report_generator.py`
- `quant_research/reports/` (all reports within)
- `quant_research/tests/test_validation.py`

IMPLEMENTATION SPECIFICATIONS (Features 16 - 22 in PROJECT.md):
1. Event-Driven Backtesting Simulator (`validation/backtest_engine.py`):
   - High-fidelity tick/bar backtesting engine simulating intra-bar path (Open -> High/Low -> Close), asymmetric Bid/Ask fills, realistic commissions ($5/lot for FX/Gold, 0.04% maker / 0.07% taker for Crypto), overnight rollover swap, and slippage modeling.
   - Integrates with `BaseQuantModel` and `SpartanRiskEngine` (evaluating order lots, Stop-Out LTV 85%, drawdown tiers).
   - Generates trade ledger, equity curve, underwater drawdown curve.
2. Purged & Embargoed OOS Splitter (`validation/oos_split.py`):
   - Strict 60% Train, 20% Validation, 20% Out-of-Sample temporal split with configurable embargo buffer bars to prevent serial correlation leakage. Zero lookahead bias.
3. Walk-Forward Optimization Engine (`validation/walk_forward.py`):
   - Rolling 6-month training / 2-month testing forward windows (1-month step size).
   - Computes Walk-Forward Efficiency: WFE = (Annualized Return OOS / Annualized Return IS) * 100%.
   - Verifies WFE >= 60% requirement.
4. Monte Carlo Simulation Framework (`validation/monte_carlo.py`):
   - 1,000+ simulation runs minimum (default 2,500) using trade sequence bootstrapping with replacement and slippage jitter perturbations.
   - Evaluates:
     * Probability of Max Drawdown exceeding 10.0%: P(DD > 10%) < 1.0%.
     * 95th Percentile Max Drawdown: <= 5.0%.
     * Probability of Ruin (account loss >= 20%): 0.00%.
     * Conditional Value at Risk (CVaR 99%): worst 1% average drawdown <= 7.5%.
5. Macro News Stress Testing Engine (`validation/stress_testing.py`):
   - Simulates historical CPI, NFP, and FOMC releases (from `config/news_calendar.yaml`).
   - Injects 3x - 10x spread spikes and 5 to 30 pip adverse slippage during news shock windows [t - 5m, t + 30m].
   - Verifies portfolio maximum drawdown remains <= 5.0% under news shocks.
6. Quantitative Metrics Engine (`validation/metrics.py`):
   - Calculates Sharpe ratio (annualized >= 2.5), Sortino ratio (annualized >= 3.5), Calmar ratio (>= 3.0), Recovery Factor (>= 4.0), Profit Factor (>= 2.0), Win Rate (>= 60%), Risk:Reward (>= 1:1.5), Max Drawdown (<= 5.0%).
7. Luxury Dark-Gold HTML Dashboard & Markdown Generator (`validation/report_generator.py`):
   - Generates standalone responsive HTML report in `reports/validation_report.html` with Spartan institutional design:
     * Background: Deep Obsidian `#04060a`, `#080b12`
     * Borders: Hairline metallic `#221c10`
     * Accents: 24K Royal Gold `#d4af37`, `#f5d77f`
     * Numerics: font-mono JetBrains Mono
     * Embedded SVG / Chart.js equity curve, underwater drawdown, monthly PnL heatmap, Monte Carlo fan chart.
   - Generates executive Markdown report in `reports/summary_report.md`.
8. Verification & Testing:
   - Build unit test suite in `quant_research/tests/test_validation.py`.
   - Run tests: `python -m pytest quant_research/tests/test_validation.py -v`.
   - Run E2E test runner: `python quant_research/run_e2e_tests.py`.
   - Ensure `./node_modules/.bin/tsc --noEmit` exits 0.
   - Deliver handoff report to: `f:\Development\spartan-miniapp-telegram\.agents\worker_m4\handoff.md`.
   - Notify parent when complete.
