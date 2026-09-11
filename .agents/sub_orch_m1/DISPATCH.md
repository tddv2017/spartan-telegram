# Dispatch: Milestone 1 Sub-Orchestrator

You are the Sub-Orchestrator for Milestone 1: Scaffolding, Data Ingestion & Market Regime Engine.
Your working directory is: f:\Development\spartan-miniapp-telegram\.agents\sub_orch_m1
Parent conversation ID: 02307c0f-7278-4494-b854-3264a398bba3

MANDATORY READING:
- Original User Request: f:\Development\spartan-miniapp-telegram\.agents\ORIGINAL_REQUEST.md
- Project Scope & Architecture: f:\Development\spartan-miniapp-telegram\PROJECT.md
- Survey Findings:
  * f:\Development\spartan-miniapp-telegram\.agents\spec_miner_survey_1\handoff.md
  * f:\Development\spartan-miniapp-telegram\.agents\explorer_survey_2\handoff.md
  * f:\Development\spartan-miniapp-telegram\.agents\explorer_survey_3\handoff.md

SCOPE & WORK ITEMS (Features 1 - 5 from PROJECT.md):
1. **Core Directory Scaffolding & Configuration**:
   - Create `quant_research/` directory structure per `PROJECT.md § Code Layout`.
   - Setup `requirements.txt` with required libraries: `numpy`, `pandas`, `scipy`, `statsmodels`, `pyyaml`, `pytest`, `requests`.
   - Setup `config/assets.yaml`, `config/models.yaml`, `config/risk_profiles.yaml`, `config/news_calendar.yaml`.
   - Setup `core/constants.py`, `core/types.py` (strict TypedDicts / dataclasses), `core/logger.py`.
2. **Historical Data Pipeline & Synthetic Generator (`data/`)**:
   - `data/generator.py`: Realistic 36-month multi-asset M1/M15/H1 bar & tick data generator for XAUUSD, BTCUSDT, ETHUSDT, EURUSD, GBPUSD incorporating realistic volatility, trends, wicks, and macro news spread spikes.
   - `data/loader.py`: High-speed CSV/Parquet loader and validator.
3. **Market Regime Detection Engine (MRDE) (`regime/`)**:
   - `regime/hurst.py`: Rescaled Range (R/S) Hurst Exponent algorithm ($H < 0.45$ mean-reverting, $H > 0.55$ trending).
   - `regime/vol_metrics.py`: Normalized ATR ratio ($ATR_{norm}$) and Historical Volatility percentile ($HV_{rank}$).
   - `regime/shock_detector.py`: Circuit breaker on bar range $\ge 3.5\times ATR$ or spread $\ge 3.0\times$ baseline.
   - `regime/regime_fsm.py`: 5-State Finite State Machine (`BULL_TREND`, `BEAR_TREND`, `RANGE_BOUND`, `VOL_COMPRESSION`, `CRISIS_SHOCK`).
4. **Unit Verification Tests**:
   - Build unit tests in `quant_research/tests/test_regime.py` and `quant_research/tests/test_data.py`.
   - Run tests and ensure 100% pass rate.

Follow the Orchestrator Iteration Loop:
- Dispatch `teamwork_preview_worker` (or domain specialists) to implement modules and write unit tests.
- Dispatch `teamwork_preview_reviewer` to review code quality and interface adherence.
- Dispatch `teamwork_preview_auditor` for integrity verification.
- Enforce strict verification and report back to parent upon completion.
