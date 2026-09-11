# Project: Spartan Quantitative Trading Research & Execution Engine

## Architecture

The Spartan Quantitative Trading Research & Execution Engine is an institutional-grade, multi-asset algorithmic trading ecosystem. It bridges theoretical quantitative alpha research, rigorous mathematical validation, institutional risk controls, and automated production execution across MetaTrader 5 (MQL5) and Crypto Perpetuals (CCXT/Python), feeding telemetry directly into the Spartan Mini-App backend (`/api/ea/webhook`).

```
                              [ Spartan Mini-App Backend ]
                               /api/ea/webhook (Next.js)
                                           ▲
                     ┌─────────────────────┴─────────────────────┐
                     │ WebRequest (HTTP POST x-ea-key)           │ REST API
                     │                                           │
         [ MQL5 SpartanMasterEA ]                      [ Python CCXT Executor ]
         ├── CSpartanCore                              ├── Async CCXT Pro (Binance/Bybit)
         ├── CSpartanGhostManager                      ├── Multi-Ghost Magic IDs
         ├── CSpartanRiskEngine                        └── Webhook Client Sync
         ├── CSpartanTrade (Slippage Guard)
         └── CSpartanWebhookBridge (Spool Queue)
                     ▲                                           ▲
                     └─────────────────────┬─────────────────────┘
                                           │ Direct Model Translation
                                           │
                        [ Quantitative Alpha Models (R1) ]
                        ├── Model 1: Statistical Arbitrage (ETH/BTC)
                        ├── Model 2: Momentum Multi-Timeframe Trend
                        ├── Model 3: Dynamic Volatility Breakout
                        ├── Model 4: Regime-Filtered Mean-Reversion
                        └── Market Regime Detection Engine (MRDE 5-State FSM)
                                           ▲
                                           │
                        [ Multi-Tier Risk Engine (R4) ]
                        ├── Calibrated Fractional Kelly (0.25% - 0.50%)
                        ├── 4-Tier Drawdown Governor (Soft 3%, Hard 4.5%, Kill 5%)
                        └── Circuit Breaker (Stop-Out LTV 85%, Latency, Spread)
                                           ▲
                                           │
                      [ Rigorous Validation Framework (R2) ]
                      ├── Dual Engine (VectorBT + Event-Driven Tick Simulator)
                      ├── Purged & Embargoed 60/20/20 Time-Series Split
                      ├── Rolling Walk-Forward Optimization (WFE >= 60%)
                      ├── Monte Carlo Simulation (1,000+ runs, P(DD > 10%) < 1%)
                      ├── News Stress Testing (CPI/NFP/FOMC, 10x spread, 30-pip slip)
                      └── Dark-Gold Luxury HTML & Executive Markdown Reports
```

---

## Feature Inventory

Every feature enumerated across the survey reports is cataloged and assigned to a milestone below.

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Core Directory & Config Scaffolding | Package structure, `assets.yaml`, `models.yaml`, `risk.yaml`, `news_calendar.yaml`, types & logger | M1 | Survey |
| 2 | Historical Data & Synthetic Pipeline | 36-month high-fidelity bar & tick data generator for XAUUSD, BTC, ETH, EURUSD, GBPUSD | M1 | Survey |
| 3 | Market Regime Detection Engine (MRDE) | 5-State FSM (`BULL_TREND`, `BEAR_TREND`, `RANGE_BOUND`, `VOL_COMPRESSION`, `CRISIS_SHOCK`) | M1 | Survey |
| 4 | Hurst Exponent & Volatility Metrics | Rescaled Range Hurst ($H$), normalized ATR ($ATR_{norm}$), historical volatility percentile ($HV_{rank}$) | M1 | Survey |
| 5 | Regime Shock Circuit Breaker | Instant defensive transition on bar range $\ge 3.5\times ATR$ or spread $\ge 3.0\times$ baseline | M1 | Survey |
| 6 | Model 1: Statistical Arbitrage | Cointegration ADF test, Kalman Filter dynamic hedge ratio $\beta_t$, OU half-life, Z-score (Magic 888801) | M2 | Survey |
| 7 | Model 2: Momentum Trend-Following | Multi-timeframe H4/H1/M15, EMA 21/55/200 stack, Donchian 20, Supertrend dynamic ratchet (Magic 888802) | M2 | Survey |
| 8 | Model 3: Volatility Breakout | Bollinger/Keltner Squeeze, bandwidth expansion trigger, LinReg momentum slope, volume surge, OBV (Magic 888803) | M2 | Survey |
| 9 | Model 4: Regime Mean-Reversion | ADX < 20 & Hurst < 0.45 gate, dynamic RSI rolling quantiles, BB outer envelope pin bar rejection (Magic 888804) | M2 | Survey |
| 10 | Asset-Specific Microstructures | Calibrations for XAUUSD (100 oz), Crypto (funding rate gate), and Forex (tight spread gate) | M2 | Survey |
| 11 | Calibrated Fractional Kelly Sizing | Institutional $0.25\% - 0.50\%$ equity risk sizing with parameter uncertainty calibration | M3 | Survey |
| 12 | 4-Tier Drawdown Governor | Soft Throttle at 3% DD, Hard Freeze at 4.5% DD, Emergency Circuit Breaker at 5.0% DD | M3 | Survey |
| 13 | Stop-Out LTV 85% Circuit Breaker | Auto-liquidation of highest margin positions when Margin Utilization $\ge 85\%$ (Margin Level $\le 117.65\%$) | M3 | Survey |
| 14 | Latency & Spread Anomaly Tripwires | Execution halt on ping $> 1,500\text{ms}$ or spread $> 3.5\times$ EMA | M3 | Survey |
| 15 | Remote Admin Kill-Switch Bridge | Sync with Spartan Mini-App RTDB `system_config.globalBotActive` | M3 | Survey |
| 16 | Event-Driven Backtesting Engine | Exact tick simulation, bid/ask pricing, commissions, overnight swap, and slippage modeling | M4 | Survey |
| 17 | Purged & Embargoed OOS Splitter | 60/20/20 train/val/test partitioner with zero serial correlation leakage or lookahead bias | M4 | Survey |
| 18 | Walk-Forward Optimization (WFO) | Rolling 6m train / 2m test windows, evaluating Walk-Forward Efficiency ($WFE \ge 60\%$) | M4 | Survey |
| 19 | Monte Carlo Simulation Framework | 1,000+ bootstrapping runs verifying $P(\text{Max DD} > 10.0\%) < 1.0\%$ and 95th percentile DD $\le 5.0\%$ | M4 | Survey |
| 20 | Macro Event Stress Testing | CPI, NFP, FOMC news simulation with $3\times - 10\times$ spread spikes and 5–30 pip adverse slippage | M4 | Survey |
| 21 | Luxury Dark-Gold HTML & Markdown Reports | Standalone HTML dashboard with SVG/Chart equity curves, drawdown underwater chart, and metrics summary | M4 | Survey |
| 22 | Quantitative Metrics Engine | Exact calculation of Sharpe, Sortino, Calmar, Recovery Factor, Profit Factor, Win Rate, R:R | M4 | Survey |
| 23 | Modular MQL5 EA (`SpartanMasterEA.mq5`) | `#property strict` clean OOP architecture with `CSpartanCore`, `CSpartanGhostManager`, `CSpartanRiskEngine` | M5 | Survey |
| 24 | Multi-Ghost Architecture in MQL5 | Isolated order state machines with Magic Number taxonomy $88[Asset][Strategy][Variant]$ | M5 | Survey |
| 25 | Resilient MQL5 WebRequest Bridge | Telemetry to `/api/ea/webhook` with in-memory queue (500 items) and offline disk spool (`spartan_webhook_spool.dat`) | M5 | Survey |
| 26 | Python CCXT Crypto Execution Bot | Async perpetual execution on Binance/Bybit with smart limit/market routing and client order IDs | M5 | Survey |
| 27 | Webhook Latency & Payload Verification | Payload verification meeting `/api/ea/webhook` schema with $< 500\text{ms}$ roundtrip response | M5 | Survey |
| 28 | Opaque-Box E2E Test Suite (Tiers 1-4) | Requirements-driven verification across features, boundaries, combinations, and full workloads | M6 / E2E Track | Survey |
| 29 | Adversarial Coverage Hardening (Tier 5) | White-box stress-testing, edge-case generation, and robustness validation | M6 / E2E Track | Survey |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Scaffolding, Data & Regime Engine | Project skeleton, configs, 36m multi-asset data generation, Market Regime Detection Engine (FSM) | none | DONE |
| M2 | Quant Alpha Models Suite | 4 quantitative models (StatArb, Momentum, Vol Breakout, Mean Reversion) across 3 asset classes | M1 | DONE |
| M3 | Multi-Tier Risk Management Engine | Fractional Kelly, 4-Tier Drawdown Governor, Stop-Out LTV 85%, Latency/Spread tripwires, Kill-Switch | M1 | DONE |
| M4 | Validation & Stress-Testing Framework | Event-driven backtester, 60/20/20 OOS, WFO ($WFE \ge 60\%$), Monte Carlo (1000 runs), News stress test, HTML report | M2, M3 | DONE |
| M5 | Execution Bot & Webhook Bridge | Modular MQL5 EA (`SpartanMasterEA.mq5`), Multi-Ghost Magic taxonomy, WebRequest spool, CCXT bot, Webhook sync | M2, M3 | DONE |
| M6 | Final Verification & Hardening | Phase 1: 100% E2E test suite pass (Tiers 1–4). Phase 2: Adversarial coverage hardening (Tier 5). | M4, M5, E2E Track | DONE |
| E2E | E2E Testing Track | Independent opaque-box test runner and test cases (Tiers 1–4) covering all 29 features. Publishes `TEST_READY.md`. | none (parallel) | DONE |

---

## Interface Contracts

### M1 ↔ M2: Data & Regime Interface
```python
class IBarDataProvider(Protocol):
    def get_bars(self, symbol: str, timeframe: str, start: datetime, end: datetime) -> pd.DataFrame: ...

class IRegimeDetector(Protocol):
    def evaluate(self, df: pd.DataFrame) -> RegimeState: ...
    # RegimeState: "BULL_TREND" | "BEAR_TREND" | "RANGE_BOUND" | "VOL_COMPRESSION" | "CRISIS_SHOCK"
```

### M2 ↔ M3: Alpha Signals ↔ Risk Engine Interface
```python
class SignalDict(TypedDict):
    action: Literal["BUY", "SELL", "CLOSE", "HOLD"]
    symbol: str
    entry_price: float
    stop_loss: float
    take_profit: float
    magic_number: int
    regime: str
    comment: str

class IRiskEngine(Protocol):
    def evaluate_order(self, signal: SignalDict, portfolio_equity: float, current_margin: float) -> Optional[OrderDict]: ...
    def check_circuit_breaker(self, equity: float, balance: float, used_margin: float, latency_ms: float) -> CircuitBreakerStatus: ...
```

### M2 / M3 ↔ M4: Backtesting & Validation Interface
```python
class IBacktestSimulator(Protocol):
    def run_simulation(self, model: BaseQuantModel, risk_engine: IRiskEngine, data: pd.DataFrame, initial_capital: float = 100000.0) -> BacktestResult: ...
    # BacktestResult contains: equity_curve, trades_list, metrics (PF, WR, RR, MDD, Sharpe, Sortino, Calmar, RecoveryFactor)
```

### M2 / M3 ↔ M5: Strategy Specification ↔ Execution Bridge Interface
- Standardized Magic Number Scheme: `880000 + (AssetCode * 1000) + (StrategyCode * 10) + Variant`
- Webhook JSON payload contract matching `src/app/api/ea/webhook/route.ts`:
  * Action: `TRADE_CLOSED` | `DEAL_ADD` | `TRADE` | `HEARTBEAT` | `POOL_SYNC`
  * Headers: `x-ea-key: <EA_SECRET_KEY>`, `Content-Type: application/json`
  * Attributes: `ticket`, `symbol`, `type`, `lots`, `openPrice`, `closePrice`, `pnl`, `pnlPercentage`, `magicNumber`, `timestamp`.
  * Mandatory: `openPrice` and `pnlPercentage` must be explicitly computed and passed for non-XAU assets.

---

## Code Layout

```
quant_research/
├── README.md
├── requirements.txt
├── config/
│   ├── assets.yaml                 # Asset specifications (contract size, tick size, pip value)
│   ├── news_calendar.yaml          # Curated historical CPI, NFP, FOMC timestamps (2022-2026)
│   ├── risk_profiles.yaml          # Kelly fractions, drawdown tiers, kill-switch thresholds
│   └── strategies.yaml             # Alpha parameters per asset & timeframe
├── core/
│   ├── __init__.py
│   ├── constants.py                # Magic numbers, system enums, HTTP codes
│   ├── types.py                    # Strict TypedDicts, Pydantic schemas for bars & trades
│   └── logger.py                   # Structured institutional JSON logger
├── data/
│   ├── __init__.py
│   ├── generator.py                # High-fidelity 36-month multi-asset synthetic data generator
│   └── loader.py                   # Parquet/CSV high-speed data loader
├── regime/
│   ├── __init__.py
│   ├── hurst.py                    # Rescaled Range (R/S) Hurst Exponent algorithm
│   ├── vol_metrics.py              # Normalized ATR ratio & historical volatility rank
│   ├── shock_detector.py           # Anomaly jump & spread spike circuit breaker
│   └── regime_fsm.py               # 5-State Finite State Machine
├── models/
│   ├── __init__.py
│   ├── base_model.py               # Abstract Base Class BaseQuantModel
│   ├── stat_arb.py                 # Model 1: Statistical Arbitrage (ETH/BTC) (888801)
│   ├── momentum_trend.py           # Model 2: Momentum Multi-Timeframe Trend (888802)
│   ├── vol_breakout.py             # Model 3: Dynamic Volatility Breakout (888803)
│   └── mean_reversion.py           # Model 4: Regime-Filtered Mean-Reversion (888804)
├── risk/
│   ├── __init__.py
│   ├── kelly_calculator.py         # Calibrated Fractional Kelly Sizing (0.25% - 0.50%)
│   ├── drawdown_governor.py        # 4-Tier Drawdown Governor (Soft 3%, Hard 4.5%, Kill 5%)
│   └── circuit_breaker.py          # Stop-Out LTV 85%, Latency & Spread Anomaly Tripwires
├── validation/
│   ├── __init__.py
│   ├── backtest_engine.py          # Event-driven simulator (ticks, spreads, slippage, swap)
│   ├── oos_split.py                # Purged & Embargoed 60/20/20 Time-Series Partitioner
│   ├── walk_forward.py             # Rolling Window WFO & Walk-Forward Efficiency (WFE >= 60%)
│   ├── monte_carlo.py              # 1,000+ Run Trade & Return Bootstrapping Simulator
│   ├── stress_testing.py           # CPI/NFP/FOMC Macro Shock Simulator (10x spread, 30-pip slip)
│   ├── metrics.py                  # Sharpe, Sortino, Calmar, Recovery Factor, Profit Factor
│   └── report_generator.py         # Dark-Gold Luxury HTML & Executive Markdown Generator
├── execution/
│   ├── mql5/
│   │   ├── SpartanMasterEA.mq5     # Master Modular Expert Advisor (#property strict)
│   │   └── Include/
│   │       ├── SpartanCore.mqh     # Engine lifecycle & event router
│   │       ├── SpartanGhost.mqh    # Multi-Ghost Architecture & Magic Number state machines
│   │       ├── SpartanRisk.mqh     # Calibrated Kelly & Drawdown Governor MQL5 module
│   │       ├── SpartanTrade.mqh    # Order dispatcher, slippage guard, retry logic
│   │       ├── SpartanWebhook.mqh  # Resilient WebRequest client with offline spool queue
│   │       └── SpartanNews.mqh     # Economic calendar blackout filter & spread monitor
│   └── python/
│       ├── __init__.py
│       ├── ccxt_executor.py        # Async CCXT perpetual execution bot (Binance/Bybit)
│       └── webhook_client.py       # Python HTTP Webhook client syncing to /api/ea/webhook
├── reports/                        # Output directory for HTML/Markdown validation reports
└── tests/                          # Automated test suite (Pytest & integration harnesses)
    ├── test_regime.py
    ├── test_models.py
    ├── test_risk.py
    ├── test_backtest.py
    ├── test_monte_carlo.py
    ├── test_stress_test.py
    ├── test_mql5_syntax.py
    └── test_webhook_bridge.py
```
