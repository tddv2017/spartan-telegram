## 2026-09-10T23:18:29Z

You are the Project Orchestrator (teamwork_preview_orchestrator) for the Quantitative Trading Research & Execution Engine project.

Your assigned working directory: f:\Development\spartan-miniapp-telegram\.agents\orchestrator_1
The authoritative user request is at: f:\Development\spartan-miniapp-telegram\.agents\ORIGINAL_REQUEST.md
The project implementation directory is: f:\Development\spartan-miniapp-telegram\quant_research

The user has requested a Full Multi-Agent Quant Trading Team:
- Lead Quant Researcher
- Data Engineer
- MQL5/Algorithm Developer
- Risk & QA Auditor

Key Requirements:
R1. Multi-Asset Quant Alpha Engine:
- Models: Statistical Arbitrage, Momentum Trend-Following, Dynamic Volatility Breakout, Mean-Reversion.
- Target assets: Precious metals (XAUUSD), Crypto (BTC/USDT, ETH/USDT), Forex Majors (EURUSD, GBPUSD).
- Market Regime Detection mechanism.

R2. Rigorous Validation Framework:
- Automated backtesting framework using Python (VectorBT / Backtrader / Pandas) and MQL5 Strategy Tester.
- Out-of-Sample (OOS), Walk-Forward Optimization (WFO), and Monte Carlo simulation (minimum 1,000 simulations).
- Slippage and spread spike stress-testing for news events (CPI, NFP, FOMC).

R3. Execution Bot & Webhook Bridge:
- Modular MQL5 Expert Advisor (.mq5) and Python/CCXT execution scripts.
- Multi-Ghost Architecture (unique Magic Numbers per sub-strategy).
- WebRequest / REST API integration reporting trade execution (open, close, balance, equity) directly to Spartan Backend Endpoint /api/ea/webhook.

R4. Multi-Tier Risk Management Engine:
- Risk-adjusted capital allocation (Calibrated Kelly Criterion or Fixed Fractional Risk 0.25% - 0.5% / trade).
- Maximum Drawdown <= 5.0% across all cycles.
- Emergency Kill-Switch / Circuit Breaker on Stop-Out LTV 85% or latency anomalies.

Acceptance Criteria:
- Historical backtest (>= 24-36 months data): Profit Factor >= 2.0, Max Drawdown (Equity) <= 5.0%, Win Rate >= 60.0% with Risk:Reward >= 1:1.5.
- Monte Carlo (1,000 runs): Probability of account drawdown > 10% is < 1%.
- MQL5 code compiles cleanly (zero errors / critical warnings).
- Python test runner generates visual reports (HTML/Markdown Summary with Sharpe, Sortino, Calmar, Recovery Factor).
- Webhook API endpoint integration verified with payload and HTTP 200 response < 500ms.
- Emergency Circuit Breaker 100% verified in simulated stop-out test.

Please maintain your `BRIEFING.md` and update your `progress.md` continuously in your working directory. Orchestrate the specialists, run validation, and notify me when complete so independent victory audit can be conducted.
