# Dispatch: Worker M2 - Quant Alpha Models Suite

## 2026-09-11T06:43:29Z

You are the Implementation Worker for Milestone 2.
Your working directory is: f:\Development\spartan-miniapp-telegram\.agents\worker_m2
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
  * `quant_research/data/generator.py`, `loader.py`
  * `quant_research/regime/regime_fsm.py`, `hurst.py`, `vol_metrics.py`, `shock_detector.py`

EXCLUSIVE FILE OWNERSHIP:
You own exclusively:
- `quant_research/models/__init__.py`
- `quant_research/models/base_model.py`
- `quant_research/models/stat_arb.py`
- `quant_research/models/momentum_trend.py`
- `quant_research/models/vol_breakout.py`
- `quant_research/models/mean_reversion.py`
- `quant_research/models/asset_microstructures.py`
- `quant_research/tests/test_models.py`

IMPLEMENTATION SPECIFICATIONS (Features 6 - 10 in PROJECT.md):
1. `quant_research/models/base_model.py`:
   - Abstract Base Class `BaseQuantModel` enforcing `generate_signal(data, current_regime) -> Optional[SignalDict]` and `update_trailing_stop(position, current_bar) -> Optional[float]`.
   - Strictly integrates with `core/types.py:SignalDict` and `IRegimeDetector`.
2. `quant_research/models/stat_arb.py` (Model 1, Magic 888801):
   - Statistical Arbitrage for ETH/BTC (or crypto/FX pairs).
   - Dynamic Kalman Filter state-space hedge ratio ($\beta_t$), Engle-Granger ADF test, Ornstein-Uhlenbeck half-life $\tau_{1/2}$, rolling Z-score entry ($\pm 2.0$), exit ($\pm 0.20$), stop ($\pm 3.50$).
3. `quant_research/models/momentum_trend.py` (Model 2, Magic 888802):
   - Multi-Timeframe Momentum Trend-Following (H4 filter, H1 alignment, M15 execution).
   - Triple EMA 21/55/200 stack, Donchian Channel 20 breakout, Supertrend dynamic ATR ratcheting trailing stop, ADX $\ge 25$ trend filter.
4. `quant_research/models/vol_breakout.py` (Model 3, Magic 888803):
   - Dynamic Volatility Breakout.
   - Bollinger Bands inside Keltner Channels Squeeze detection, adaptive bandwidth ratio trigger ($> 1.15$), LinReg momentum oscillator slope, volume surge ($\ge 1.5\times$ SMA20), On-Balance Volume (OBV) confirmation.
5. `quant_research/models/mean_reversion.py` (Model 4, Magic 888804):
   - Regime-Filtered Mean-Reversion.
   - Strict Regime Gating ($ADX < 20 \land H < 0.45$), dynamic RSI rolling quantiles (10th/90th percentile), Bollinger envelope bounce rejection pin bar (wick ratio $\ge 0.60$), macro knife-catching defense (D1 EMA200).
6. `quant_research/models/asset_microstructures.py` (Feature 10):
   - Microstructure handlers for XAUUSD (100 oz, news blackout window, 2.5-3.5x ATR stops), Crypto (funding rate gate, 2.0-3.0x ATR stops), and Forex (spread gate < 1.8x, 1.2-1.8x ATR stops).
7. Verification & Testing:
   - Build unit test suite in `quant_research/tests/test_models.py` verifying signals, mathematical indicators, regime gating, and asset microstructures.
   - Run: `python -m pytest quant_research/tests/test_models.py -v`.
   - Run Tier 1 E2E tests: `python quant_research/run_e2e_tests.py --tier 1`.
   - Verify `./node_modules/.bin/tsc --noEmit` exits 0.
   - Deliver handoff report to: `f:\Development\spartan-miniapp-telegram\.agents\worker_m2\handoff.md`.
   - Notify parent when complete.
