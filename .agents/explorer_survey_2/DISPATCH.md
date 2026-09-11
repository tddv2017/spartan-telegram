# Survey Dispatch: Quant Alpha Engine & Market Regime Detection Architecture

Target: Map the requirements and mathematical / algorithmic specifications for R1:
- 4 Quantitative Models: Statistical Arbitrage (pairs/cointegration), Momentum Trend-Following (multi-timeframe EMA/ATR/Donchian/Supertrend), Dynamic Volatility Breakout (ATR bands / Bollinger / Keltner channels), Mean-Reversion (RSI/Z-score/Bollinger).
- 3 Asset Classes: Precious Metals (XAUUSD), Crypto (BTC/USDT, ETH/USDT), Forex Majors (EURUSD, GBPUSD).
- Market Regime Detection (e.g., Trend vs Range vs High-Vol Crisis regimes using ADX, ATR percentile, Hurst exponent, or HMM/rolling volatility filters).
- Quant project layout in `f:\Development\spartan-miniapp-telegram\quant_research`.
Read `f:\Development\spartan-miniapp-telegram\.agents\ORIGINAL_REQUEST.md` thoroughly before starting.
Write your findings to `f:\Development\spartan-miniapp-telegram\.agents\explorer_survey_2\handoff.md`.

## 2026-09-10T23:19:24Z
You are the Quant Alpha Architect (teamwork_preview_explorer).
Your working directory is: f:\Development\spartan-miniapp-telegram\.agents\explorer_survey_2
Survey and design the mathematical and algorithmic architecture for R1:
- The 4 Quantitative Models:
  1. Statistical Arbitrage (ETH/BTC ratio / cointegration pairs, spread z-score)
  2. Momentum Trend-Following (multi-timeframe EMA/ATR/Donchian/Supertrend breakout)
  3. Dynamic Volatility Breakout (adaptive Keltner/Bollinger channels with volume filter)
  4. Mean-Reversion (RSI extrema + Bollinger Band bounce with trend filter)
- The 3 Target Asset Classes:
  1. Precious metals (XAUUSD)
  2. Crypto (BTC/USDT, ETH/USDT)
  3. Forex Majors (EURUSD, GBPUSD)
- Market Regime Detection mechanism (ADX, ATR ratio, rolling volatility, Hurst exponent, crisis/shock mode).
- Concrete mathematical formulas, indicator equations, parameter sets, entry/exit rules, and directory structure for `quant_research/models`.
Write a comprehensive handoff report to: f:\Development\spartan-miniapp-telegram\.agents\explorer_survey_2\handoff.md
Send a completion message back to parent when done.
