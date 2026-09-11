# Spartan Quantitative Trading Research & Execution Engine

An institutional-grade, multi-asset algorithmic trading ecosystem for Precious Metals (`XAUUSD`), Cryptocurrency (`BTCUSDT`, `ETHUSDT`), and Forex Majors (`EURUSD`, `GBPUSD`), integrated with the Spartan Telegram Mini-App backend (`/api/ea/webhook`).

## Architecture & Module Layout

```
quant_research/
├── requirements.txt           # Python dependencies (numpy, pandas, scipy, statsmodels, pytest)
├── config/
│   ├── assets.yaml            # Microstructure parameters for XAU, BTC, ETH, EUR, GBP
│   ├── models.yaml            # Hyperparameters for 4 Alpha Models + MRDE
│   ├── risk_profiles.yaml     # Fractional Kelly, 4-Tier Drawdown Governor, Tripwires
│   └── news_calendar.yaml     # Curated 2023-2026 CPI, NFP, FOMC macro events
├── core/
│   ├── __init__.py
│   ├── constants.py           # Enums (RegimeState, OrderAction), Magic Taxonomy, Error Codes
│   ├── types.py               # Strict dataclasses, TypedDicts, and Protocol interfaces
│   └── logger.py              # Structured institutional JSON logger
├── data/
│   ├── __init__.py
│   ├── generator.py           # 36-month high-fidelity multi-asset OHLCV & tick simulator
│   └── loader.py              # High-speed data loader, validator, gap detector, resampler
├── regime/
│   ├── __init__.py
│   ├── hurst.py               # Rescaled Range (R/S) Hurst Exponent algorithm
│   ├── vol_metrics.py         # Normalized ATR ratio, HV rank, ADX/DMI
│   ├── shock_detector.py      # Circuit breaker shock detector (bar range, spread spike)
│   └── regime_fsm.py          # 5-State Finite State Machine (MRDE)
└── tests/
    ├── test_data.py           # Unit tests for data generation, schedules, resampling, gaps
    └── test_regime.py         # Unit tests for Hurst, volatility metrics, shocks, and FSM
```

## Running the Unit Tests

```bash
python -m pytest quant_research/tests/test_regime.py quant_research/tests/test_data.py -v
```
