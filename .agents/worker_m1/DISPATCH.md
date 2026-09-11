# Dispatch: Worker M1 - Scaffolding, Multi-Asset Data Pipeline & Market Regime Engine

You are the Implementation Worker for Milestone 1.
Your working directory is: f:\Development\spartan-miniapp-telegram\.agents\worker_m1
Parent conversation ID: 02307c0f-7278-4494-b854-3264a398bba3

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. An auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY READING:
- Original User Request: f:\Development\spartan-miniapp-telegram\.agents\ORIGINAL_REQUEST.md
- Project Scope & Architecture: f:\Development\spartan-miniapp-telegram\PROJECT.md
- Architectural & Survey Findings:
  * f:\Development\spartan-miniapp-telegram\.agents\spec_miner_survey_1\handoff.md
  * f:\Development\spartan-miniapp-telegram\.agents\explorer_survey_2\handoff.md
  * f:\Development\spartan-miniapp-telegram\.agents\explorer_survey_3\handoff.md

EXCLUSIVE FILE OWNERSHIP:
You own exclusively:
- `quant_research/requirements.txt`
- `quant_research/config/assets.yaml`
- `quant_research/config/models.yaml`
- `quant_research/config/risk_profiles.yaml`
- `quant_research/config/news_calendar.yaml`
- `quant_research/core/__init__.py`, `constants.py`, `types.py`, `logger.py`
- `quant_research/data/__init__.py`, `generator.py`, `loader.py`
- `quant_research/regime/__init__.py`, `hurst.py`, `vol_metrics.py`, `shock_detector.py`, `regime_fsm.py`
- `quant_research/tests/test_regime.py`
- `quant_research/tests/test_data.py`

IMPLEMENTATION SPECIFICATIONS (Features 1 - 5 in PROJECT.md):
1. Project Skeleton & Dependencies:
   - Create `quant_research/requirements.txt` with standard scientific Python stack (`numpy`, `pandas`, `scipy`, `statsmodels`, `pyyaml`, `pytest`, `requests`).
   - Create configs:
     * `config/assets.yaml`: Specifications for XAUUSD (100 oz contract, tick size 0.01, min lot 0.01), BTCUSDT, ETHUSDT, EURUSD (contract 100,000, 0.1 pip), GBPUSD.
     * `config/models.yaml`: Parameters for the 4 alpha models per survey specifications.
     * `config/risk_profiles.yaml`: Fractional Kelly 0.25%-0.50%, 4-tier drawdown thresholds (3%, 4.5%, 5%), Stop-Out LTV 85%.
     * `config/news_calendar.yaml`: Curated historical CPI, NFP, FOMC dates and shock windows.
   - Create `core/constants.py` (magic numbers, error codes, HTTP statuses), `core/types.py` (strict dataclasses / TypedDicts for Bar, Tick, Signal, Order, Fill, RegimeState), `core/logger.py` (structured JSON logger).
2. Multi-Asset Data Pipeline (`data/`):
   - `data/generator.py`: Generates realistic 36 months (2023-2026) of multi-asset OHLCV bar data (M1, M15, H1) and tick simulation for XAUUSD, BTCUSDT, ETHUSDT, EURUSD, GBPUSD. Must model realistic volatility, trend persistence, intraday wicks, bid-ask spread variation, and news event spread spikes.
   - `data/loader.py`: High-speed bar and tick loader with validation, gap detection, and caching.
3. Market Regime Detection Engine (MRDE) (`regime/`):
   - `regime/hurst.py`: Rescaled Range (R/S) Hurst exponent ($H$). Correctly detects mean-reversion ($H < 0.45$), random walk ($0.45 \le H \le 0.55$), and trend persistence ($H > 0.55$).
   - `regime/vol_metrics.py`: Normalized ATR ratio ($ATR_{norm} = ATR_{14} / SMA_{50}(ATR)$) and historical volatility rank ($HV_{rank}$).
   - `regime/shock_detector.py`: Circuit breaker detecting bar range $\ge 3.5\times ATR$ or spread $\ge 3.0\times$ baseline.
   - `regime/regime_fsm.py`: 5-State Finite State Machine (`BULL_TREND`, `BEAR_TREND`, `RANGE_BOUND`, `VOL_COMPRESSION`, `CRISIS_SHOCK`) implementing the exact state transition matrix in `PROJECT.md`.
4. Verification & Testing:
   - Create `tests/test_regime.py` and `tests/test_data.py`.
   - Run tests: execute `python -m pytest quant_research/tests/test_regime.py quant_research/tests/test_data.py -v`.
   - Ensure all tests pass with 100% success.
   - Document commands, test results, and file layout in your handoff report: `f:\Development\spartan-miniapp-telegram\.agents\worker_m1\handoff.md`.
   - Send completion message to parent when finished.
