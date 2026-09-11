# Handoff Report: Quantitative Alpha Engine & Market Regime Architecture (R1)

**Author**: Quant Alpha Architect (`teamwork_preview_explorer`, explorer_survey_2)  
**Recipient**: Parent Orchestrator (`orchestrator_1`)  
**Scope**: Requirement R1 - Multi-Asset Quant Alpha Engine & Market Regime Detection  
**Date**: 2026-09-11  

---

## 1. Observation

### 1.1 Direct Requirements Analysis (ORIGINAL_REQUEST.md)
From `f:\Development\spartan-miniapp-telegram\.agents\ORIGINAL_REQUEST.md`:
- **Requirement R1 (Multi-Asset Quant Alpha Engine)**:
  - Design and develop 4 quantitative algorithmic models:
    1. *Statistical Arbitrage* (ETH/BTC ratio / cointegration pairs, spread z-score)
    2. *Momentum Trend-Following* (multi-timeframe EMA/ATR/Donchian/Supertrend breakout)
    3. *Dynamic Volatility Breakout* (adaptive Keltner/Bollinger channels with volume filter)
    4. *Mean-Reversion* (RSI extrema + Bollinger Band bounce with trend filter)
  - Target 3 distinct asset classes:
    1. Precious Metals (*XAUUSD*)
    2. Crypto (*BTC/USDT*, *ETH/USDT*)
    3. Forex Majors (*EURUSD*, *GBPUSD*)
  - Market Regime Detection mechanism: automatically adjust parameters or enter defensive mode during abnormal volatility.
- **Strict Acceptance Criteria**:
  - Historical backtest over $\ge 24-36$ months achieving **Profit Factor $\ge 2.0$**.
  - **Maximal Drawdown (Equity) $\le 5.0\%$** across all test periods.
  - **Win Rate $\ge 60.0\%$** combined with **Risk:Reward $\ge 1:1.5$**.
  - Monte Carlo 1,000 simulations: Probability of Account Drawdown $> 10\%$ is **$< 1.0\%$**.

### 1.2 Webhook & Integration Architecture (`src/app/api/ea/webhook/route.ts`)
From `src/app/api/ea/webhook/route.ts`:
- Authentication via HTTP header `x-ea-key` or `Authorization: Bearer <key>` using constant-time SHA-256 hash comparison `matchesSecret()`.
- Supported actions: `TRADE_CLOSED`, `DEAL_ADD`, `TRADE`, `HEARTBEAT`, `POOL_SYNC`, `PING`.
- Required trade attributes: `ticket`/`id`, `type` (`BUY`/`SELL`), `symbol`, `lots`, `openPrice`, `closePrice`, `pnl`, `pnlPercentage`, `comment`, `magicNumber`, `timestamp`.
- Built-in Anomaly PnL Bounds check ($|PnL| > $50,000 flags security alert).
- Multi-Ghost Architecture in MQL5 requires unique `magicNumber` for each quantitative strategy.

### 1.3 Spartan Executive Governance & Institutional Mandate
From `.agents/skills/spartan-csuite-holding/SKILL.md` and `GEMINI.md`:
- Supreme governance by Chairman `@tddv2017`.
- Zero-tolerance for uncontrolled tail risk, gambler's ruin, or unhedged martingales.
- Every model must feature deterministic stop-losses, volatility-adjusted position sizing, and automated kill-switch integration.
---

## 2. Logic Chain

### 2.1 Model 1: Statistical Arbitrage (Pairs Cointegration & Spread Z-Score)

#### 2.1.1 Mathematical Formulation
Statistical Arbitrage operates on two co-moving asset price series $P_A(t)$ and $P_B(t)$ (specifically ETH/USDT and BTC/USDT in log space: $y_t = \ln(P_{ETH,t})$, $x_t = \ln(P_{BTC,t})$).

1. **Cointegration Testing (Engle-Granger Two-Step & Johansen)**:
   - Step 1: Regress $y_t$ on $x_t$:
     $$y_t = \alpha + \beta x_t + \epsilon_t$$
   - Step 2: Test residuals $\epsilon_t$ for stationarity via Augmented Dickey-Fuller (ADF):
     $$\Delta \epsilon_t = \gamma \epsilon_{t-1} + \sum_{i=1}^{p} \psi_i \Delta \epsilon_{t-i} + u_t$$
     Hypothesis test: $H_0: \gamma = 0$ (unit root / non-stationary) vs $H_1: \gamma < 0$ (stationary).
     Cointegration is confirmed if ADF t-statistic $< t_{critical}(1\% = -3.43)$.

2. **Dynamic State-Space Hedge Ratio via Kalman Filter**:
   Static OLS suffers from look-ahead bias and structural breaks. We formulate a state-space model:
   - State Transition Equation:
     $$\begin{bmatrix} \alpha_t \\ \beta_t \end{bmatrix} = \begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix} \begin{bmatrix} \alpha_{t-1} \\ \beta_{t-1} \end{bmatrix} + \mathbf{w}_t, \quad \mathbf{w}_t \sim \mathcal{N}(0, \mathbf{Q})$$
   - Measurement Equation:
     $$y_t = \begin{bmatrix} 1 & x_t \end{bmatrix} \begin{bmatrix} \alpha_t \\ \beta_t \end{bmatrix} + v_t, \quad v_t \sim \mathcal{N}(0, R)$$
   - Kalman recursion updates $\hat{\beta}_t$ in real time as each tick/bar arrives.

3. **Ornstein-Uhlenbeck (OU) Spread Dynamics & Half-Life**:
   The cointegrated spread $S_t = y_t - \beta_t x_t - \alpha_t$ is modeled as an Ornstein-Uhlenbeck mean-reverting process:
   $$dS_t = \theta (\mu - S_t) dt + \sigma dW_t$$
   - Discretized as an AR(1) process:
     $$S_t = a + b S_{t-1} + \eta_t$$
     where $b = e^{-\theta \Delta t}$, $\theta = -\frac{\ln(b)}{\Delta t}$.
   - **Half-Life of Mean Reversion**:
     $$\tau_{1/2} = \frac{\ln(2)}{\theta} = -\frac{\ln(2) \Delta t}{\ln(b)}$$
   - Filter Gate: We only trade pairs when $5 \text{ bars} \le \tau_{1/2} \le 80 \text{ bars}$. If $\tau_{1/2} > 80$, mean reversion is too slow (capital lockup risk); if $\tau_{1/2} < 5$, the spread is pure high-frequency noise.

4. **Normalized Spread Z-Score**:
   $$Z_t = \frac{S_t - \mu_{rolling}(S, K)}{\sigma_{rolling}(S, K)}$$
   where $K = \text{round}(2.0 \times \tau_{1/2})$ is the adaptive rolling window length.

#### 2.1.2 Algorithmic Trading Rules
- **Entry Rules**:
  - **Short Spread** (Sell Asset A, Buy $\beta$ Asset B): When $Z_t \ge +2.0$ AND Cointegration $p\text{-value} < 0.05$ AND Market Regime $\ne$ High-Vol Shock.
  - **Long Spread** (Buy Asset A, Sell $\beta$ Asset B): When $Z_t \le -2.0$ AND Cointegration $p\text{-value} < 0.05$ AND Market Regime $\ne$ High-Vol Shock.
- **Exit Rules**:
  - **Mean Take Profit**: Exit 100% position when $|Z_t| \le 0.20$ or upon zero-crossing ($\text{sign}(Z_t) \ne \text{sign}(Z_{t-1})$).
  - **Structural Stop Loss**: Liquidate immediately if $|Z_t| \ge 3.50$ (indicating regime change or cointegration breakdown).
  - **Time Stop**: Liquidate if trade duration exceeds $2.5 \times \tau_{1/2}$.
- **Parameter Matrix**:
  | Parameter | Default Value | Search Range | Step | Description |
  |---|---|---|---|---|
  | `adf_threshold` | -3.43 (1%) | [-3.9, -2.86] | 0.1 | Stationarity significance |
  | `z_entry` | 2.0 | [1.5, 2.5] | 0.1 | Entry Z-Score trigger |
  | `z_exit` | 0.20 | [0.0, 0.5] | 0.05 | Mean reversion target |
  | `z_stop` | 3.50 | [3.0, 4.5] | 0.25 | Breakdown liquidation |
  | `kalman_delta` | 1e-4 | [1e-5, 1e-3] | log | Process noise covariance $Q$ |
  | `min_half_life` | 5 bars | [3, 10] | 1 | Minimum mean-reversion speed |
  | `max_half_life` | 80 bars | [50, 120] | 5 | Maximum mean-reversion speed |
  | `magic_number` | 888801 | Static | - | Multi-Ghost Execution ID |

---

### 2.2 Model 2: Momentum Multi-Timeframe Trend-Following

#### 2.2.1 Mathematical Formulation
Momentum Trend-Following captures high-conviction macro expansions across Precious Metals (XAUUSD) and Crypto/Forex by enforcing hierarchical alignment across 3 timeframes: Higher Timeframe Filter (H4), Trend Alignment (H1), and Micro Execution (M15).

1. **Triple Exponential Moving Average (EMA) Cascade**:
   $$EMA_t(k) = \alpha \cdot Close_t + (1 - \alpha) \cdot EMA_{t-1}(k), \quad \alpha = \frac{2}{k + 1}$$
   - Fast EMA: $EMA_{21}$
   - Medium EMA: $EMA_{55}$
   - Slow Baseline EMA: $EMA_{200}$
   - Bullish Alignment Stack: $EMA_{21}(t) > EMA_{55}(t) > EMA_{200}(t)$ and $\text{Slope}(EMA_{200}) > 0$.
   - Bearish Alignment Stack: $EMA_{21}(t) < EMA_{55}(t) < EMA_{200}(t)$ and $\text{Slope}(EMA_{200}) < 0$.

2. **Donchian Channel Breakout**:
   $$UpperDC_t(N) = \max_{i=1 \dots N}(High_{t-i})$$
   $$LowerDC_t(N) = \min_{i=1 \dots N}(Low_{t-i})$$
   Breakout Signal: Bullish when $Close_t > UpperDC_t(20)$; Bearish when $Close_t < LowerDC_t(20)$.

3. **Supertrend Dynamic ATR Ratchet**:
   - True Range: $TR_t = \max(High_t - Low_t, |High_t - Close_{t-1}|, |Low_t - Close_{t-1}|)$
   - $ATR_t(n) = \frac{(n-1) \cdot ATR_{t-1} + TR_t}{n}$
   - Median Price: $M_t = \frac{High_t + Low_t}{2}$
   - Upper Band: $UB_t = M_t + (m \cdot ATR_t(n))$
   - Lower Band: $LB_t = M_t - (m \cdot ATR_t(n))$
   - Ratchet Constraint:
     $$LB_t = \begin{cases} \max(LB_t, LB_{t-1}) & \text{if } Close_{t-1} > LB_{t-1} \\ LB_t & \text{otherwise} \end{cases}$$
     $$UB_t = \begin{cases} \min(UB_t, UB_{t-1}) & \text{if } Close_{t-1} < UB_{t-1} \\ UB_t & \text{otherwise} \end{cases}$$

4. **Average Directional Index (ADX) & Directional Movement**:
   - $+DM_t = \max(High_t - High_{t-1}, 0)$ if $High_t - High_{t-1} > Low_{t-1} - Low_t$ else $0$.
   - $-DM_t = \max(Low_{t-1} - Low_t, 0)$ if $Low_{t-1} - Low_t > High_t - High_{t-1}$ else $0$.
   - $+DI_t = 100 \times \frac{WilderEMA(+DM, 14)}{ATR_{14}}$, $-DI_t = 100 \times \frac{WilderEMA(-DM, 14)}{ATR_{14}}$.
   - Directional Index: $DX_t = 100 \times \frac{|+DI_t - -DI_t|}{+DI_t + -DI_t}$.
   - $ADX_t = \text{WilderEMA}(DX, 14)$.
   - Trend Filter Gate: Entry requires $ADX_t \ge 25.0$ and $+DI_t > -DI_t$ (Long) or $-DI_t > +DI_t$ (Short).

#### 2.2.2 Algorithmic Trading Rules
- **Long Entry**:
  - H4 Timeframe: $Close_{H4} > EMA_{200, H4}$ and $ADX_{H4} \ge 20$.
  - H1 Timeframe: $EMA_{21} > EMA_{55} > EMA_{200}$.
  - M15 Timeframe: $Close_{M15} > UpperDC(20)$ AND Supertrend is Green ($Close > LB$) AND $+DI > -DI$.
- **Short Entry**:
  - H4 Timeframe: $Close_{H4} < EMA_{200, H4}$ and $ADX_{H4} \ge 20$.
  - H1 Timeframe: $EMA_{21} < EMA_{55} < EMA_{200}$.
  - M15 Timeframe: $Close_{M15} < LowerDC(20)$ AND Supertrend is Red ($Close < UB$) AND $-DI > +DI$.
- **Exit & Risk Management**:
  - **Initial Stop Loss**: Chandelier Stop at $Entry - 2.5 \times ATR_{14}$.
  - **Trailing Stop**: Ratchet stop loss to Supertrend Lower Band (Long) or Upper Band (Short) once profit reaches $+1.0 R$.
  - **Take Profit**: Multi-stage TP: 50% at $+2.0 R$, remaining 50% trails with Supertrend until trend exhaustion.
- **Parameter Matrix**:
  | Parameter | Default Value | Search Range | Step | Description |
  |---|---|---|---|---|
  | `ema_fast` | 21 | [13, 34] | 1 | Fast Trend EMA |
  | `ema_med` | 55 | [34, 89] | 1 | Medium Trend EMA |
  | `ema_slow` | 200 | [100, 250] | 10 | Macro Baseline EMA |
  | `donchian_period` | 20 | [15, 30] | 1 | Breakout lookback |
  | `supertrend_atr` | 10 | [7, 14] | 1 | Supertrend ATR period |
  | `supertrend_mult` | 3.0 | [2.0, 4.0] | 0.2 | ATR band multiplier $m$ |
  | `adx_threshold` | 25.0 | [20.0, 30.0] | 1.0 | Minimum trend strength |
  | `risk_reward_tp1` | 2.0 | [1.5, 3.0] | 0.25 | First profit target multiple |
  | `magic_number` | 888802 | Static | - | Multi-Ghost Execution ID |
---

### 2.3 Model 3: Dynamic Volatility Breakout (Adaptive Squeeze & Volume Confirmation)

#### 2.3.1 Mathematical Formulation
Volatility cycles between compression (low volatility / energy accumulation) and expansion (explosive directional breakout). This model formalizes John Carter's Squeeze using Bollinger Bands relative to Keltner Channels, enhanced with adaptive bandwidth and volume flow validation.

1. **Volatility Squeeze Metric**:
   - Bollinger Bands ($N=20, K_B=2.0$):
     $$\mu_B = \frac{1}{N}\sum_{i=0}^{N-1} Close_{t-i}, \quad \sigma_B = \sqrt{\frac{1}{N}\sum_{i=0}^{N-1} (Close_{t-i} - \mu_B)^2}$$
     $$BB_{upper} = \mu_B + K_B \cdot \sigma_B, \quad BB_{lower} = \mu_B - K_B \cdot \sigma_B$$
   - Keltner Channels ($N=20, K_K=1.5$):
     $$\mu_K = EMA_{20}(Close), \quad ATR_K = ATR_{20}$$
     $$KC_{upper} = \mu_K + K_K \cdot ATR_K, \quad KC_{lower} = \mu_K - K_K \cdot ATR_K$$
   - Squeeze Condition:
     $$\text{SqueezeOn}_t = (BB_{upper} < KC_{upper}) \land (BB_{lower} > KC_{lower})$$
     When true, volatility is compressed inside the ATR envelope.

2. **Adaptive Bandwidth ($BW_t$) Expansion Trigger**:
   $$BW_t = \frac{BB_{upper} - BB_{lower}}{\mu_B}$$
   $$BW\_Ratio_t = \frac{BW_t}{SMA_{50}(BW)}$$
   Expansion occurs when $\text{SqueezeOn}_{t-1} == \text{True}$, $\text{SqueezeOn}_t == \text{False}$, and $BW\_Ratio_t > 1.15$.

3. **Linear Regression Momentum Oscillator**:
   Measures the directional force of price relative to the Donchian/Keltner midline:
   $$\Delta_t = Close_t - \left[\frac{\max(High_{t-N \dots t}) + \min(Low_{t-N \dots t})}{2} + \mu_K\right] / 2$$
   $$MomOsc_t = \text{LinRegSlope}(\Delta_t, 20)$$
   Bullish Breakout when $MomOsc_t > 0$ and $MomOsc_t > MomOsc_{t-1}$.
   Bearish Breakout when $MomOsc_t < 0$ and $MomOsc_t < MomOsc_{t-1}$.

4. **Institutional Volume Confirmation**:
   Breakouts without volume are false breakouts (stop hunts).
   - Volume Surge Condition:
     $$Volume_t \ge 1.50 \times SMA_{20}(Volume)$$
   - On-Balance Volume (OBV) Confirmation:
     $$OBV_t = OBV_{t-1} + \begin{cases} Volume_t & \text{if } Close_t > Close_{t-1} \\ -Volume_t & \text{if } Close_t < Close_{t-1} \\ 0 & \text{if } Close_t = Close_{t-1} \end{cases}$$
     Bullish: $OBV_t > EMA_{20}(OBV)$; Bearish: $OBV_t < EMA_{20}(OBV)$.

#### 2.3.2 Algorithmic Trading Rules
- **Long Breakout Entry**:
  - $\text{SqueezeOn}$ was active for at least 6 consecutive bars.
  - Squeeze fires: $\text{SqueezeOn}_t == \text{False}$ with $Close_t > BB_{upper}$.
  - Momentum: $MomOsc_t > 0$ and $\Delta MomOsc_t > 0$.
  - Volume Filter: $Volume_t \ge 1.50 \times SMA_{20}(Volume)$ AND $OBV_t > EMA_{20}(OBV)$.
- **Short Breakout Entry**:
  - $\text{SqueezeOn}$ active $\ge 6$ bars.
  - Squeeze fires: $\text{SqueezeOn}_t == \text{False}$ with $Close_t < BB_{lower}$.
  - Momentum: $MomOsc_t < 0$ and $\Delta MomOsc_t < 0$.
  - Volume Filter: $Volume_t \ge 1.50 \times SMA_{20}(Volume)$ AND $OBV_t < EMA_{20}(OBV)$.
- **Exit & Risk Management**:
  - Stop Loss: Invalidation level placed at the opposite Keltner Channel midline: $SL = \mu_K$.
  - Take Profit: Dynamic trailing stop at $EMA_{20}(Close)$.
  - Exhaustion Exit: Liquidate when $MomOsc$ momentum decelerates for 2 consecutive bars ($MomOsc_t < MomOsc_{t-1} < MomOsc_{t-2}$ in Long).
- **Parameter Matrix**:
  | Parameter | Default Value | Search Range | Step | Description |
  |---|---|---|---|---|
  | `bb_period` | 20 | [14, 25] | 1 | Bollinger lookback |
  | `bb_std` | 2.0 | [1.8, 2.4] | 0.1 | Bollinger width multiplier |
  | `kc_period` | 20 | [14, 25] | 1 | Keltner lookback |
  | `kc_atr_mult` | 1.5 | [1.2, 1.8] | 0.1 | Keltner ATR multiplier |
  | `min_squeeze_bars` | 6 | [4, 12] | 1 | Compression threshold |
  | `volume_surge_mult`| 1.5 | [1.2, 2.0] | 0.1 | Volume expansion requirement |
  | `bandwidth_expansion`| 1.15 | [1.05, 1.30] | 0.05 | Bandwidth ratio threshold |
  | `magic_number` | 888803 | Static | - | Multi-Ghost Execution ID |

---

### 2.4 Model 4: Regime-Filtered Mean-Reversion

#### 2.4.1 Mathematical Formulation
Mean-reversion exploits statistical price overextensions back toward equilibrium. In trending markets, mean reversion is catastrophic; thus, this model incorporates a strict **Macro Regime Gate** preventing trades during directional trends.

1. **Regime Gating Condition (Strict Prerequisite)**:
   $$ADX_{14} < 20.0 \quad \land \quad Hurst \text{ Exponent } H < 0.45$$
   If either condition fails, all Mean-Reversion signals are suppressed.

2. **Dynamic Volatility-Adjusted Relative Strength Index (RSI)**:
   $$RSI_t(n) = 100 - \frac{100}{1 + RS_t}, \quad RS_t = \frac{\text{WilderEMA}(Gain, n)}{\text{WilderEMA}(Loss, n)}$$
   Rather than static 70/30 levels, we calculate dynamic rolling quantiles:
   $$Oversold_t = Q_{0.10}(RSI, 100 \text{ bars}), \quad Overbought_t = Q_{0.90}(RSI, 100 \text{ bars})$$
   bounded strictly between $[20, 35]$ for oversold and $[65, 80]$ for overbought.

3. **Bollinger Band Envelope Rejection**:
   Price must pierce the $2.0 \sigma$ outer Bollinger envelope and show candlestick exhaustion:
   - **Bullish Rejection (Hammer / Pin Bar)**:
     $$Low_t < BB_{lower}(20, 2.0) \quad \land \quad Close_t > BB_{lower}(20, 2.0)$$
     $$\text{Lower Wick Ratio} = \frac{\min(Open_t, Close_t) - Low_t}{High_t - Low_t} \ge 0.60$$
   - **Bearish Rejection (Shooting Star / Inverted Pin)**:
     $$High_t > BB_{upper}(20, 2.0) \quad \land \quad Close_t < BB_{upper}(20, 2.0)$$
     $$\text{Upper Wick Ratio} = \frac{High_t - \max(Open_t, Close_t)}{High_t - Low_t} \ge 0.60$$

4. **Macro Knife-Catching Defense (Trend Invalidation Gate)**:
   Never buy when price is below a falling D1 $EMA_{200}$:
   $$\text{If } Close_t < EMA_{200, D1} \land \text{Slope}(EMA_{200, D1}) < -0.05\% \implies \text{Block LONG}$$
   $$\text{If } Close_t > EMA_{200, D1} \land \text{Slope}(EMA_{200, D1}) > +0.05\% \implies \text{Block SHORT}$$

#### 2.4.2 Algorithmic Trading Rules
- **Long Entry**:
  - Regime Gate: $ADX_{14} < 20$ AND $H < 0.45$.
  - Macro Gate: Bullish clearance passed.
  - RSI Oversold: $RSI_{14} \le Oversold_t$.
  - Price Action: Bullish Rejection wick at $BB_{lower}$.
- **Short Entry**:
  - Regime Gate: $ADX_{14} < 20$ AND $H < 0.45$.
  - Macro Gate: Bearish clearance passed.
  - RSI Overbought: $RSI_{14} \ge Overbought_t$.
  - Price Action: Bearish Rejection wick at $BB_{upper}$.
- **Exit & Risk Management**:
  - Stop Loss: Placed at $SwingExtrema \pm 0.8 \times ATR_{14}$. Hard maximum risk = 0.5% balance.
  - Take Profit 1 (70% lot): Middle Band $SMA_{20}(Close)$ (high-probability reversion).
  - Take Profit 2 (30% lot): Opposite Bollinger Band (runner target, achieves $R:R > 1:2.0$).
  - Time Stop: Liquidate if reversion does not materialize within 16 bars (M15 = 4 hours).
- **Parameter Matrix**:
  | Parameter | Default Value | Search Range | Step | Description |
  |---|---|---|---|---|
  | `rsi_period` | 14 | [9, 21] | 1 | RSI calculation window |
  | `rsi_quantile_lookback`| 100 | [60, 150] | 10 | Dynamic threshold window |
  | `bb_period` | 20 | [14, 25] | 1 | Envelope moving average |
  | `bb_std` | 2.0 | [1.8, 2.5] | 0.1 | Envelope standard deviation |
  | `min_wick_ratio` | 0.60 | [0.50, 0.75] | 0.05 | Reversal pin bar definition |
  | `max_bars_in_trade` | 16 | [10, 24] | 2 | Time-stop horizon |
  | `magic_number` | 888804 | Static | - | Multi-Ghost Execution ID |
---

### 2.5 Asset-Class Specific Microstructure Adaptations

The three asset classes possess radically distinct market microstructures. Applying identical parameters across all assets causes catastrophic failure. The following matrix formalizes the asset-specific calibrations:

| Microstructure Dimension | Precious Metals (XAUUSD) | Crypto (BTC/USDT, ETH/USDT) | Forex Majors (EURUSD, GBPUSD) |
|---|---|---|---|
| **Contract Unit & Tick Size** | 100 Troy oz / $0.01 tick | Fractional (0.0001 BTC) / $0.10 tick | 100,000 base currency / 0.00001 (0.1 pip) |
| **Dollar Value per 1 Lot (1 Unit Move)** | $1.00 move = $100.00 PnL | $1.00 move = $1.00 PnL (spot/perp) | 1.0 pip move = $10.00 PnL |
| **Trading Schedule & Liquidity** | 23/5 (Sunday 23:00 - Friday 22:00 UTC). Major volume: London/NY overlap (12:00 - 17:00 UTC). | 24/7/365 continuous trading. Volatility clusters around US market opens & funding settlements. | 24/5 continuous trading. Heavy liquidity: London (07:00-16:00 UTC) & NY (12:00-21:00 UTC). |
| **Spread Dynamics & Slippage** | Normal spread: 1.5 - 3.0 pips ($0.15-$0.30). Rollover/News spike: up to 15-25 pips ($1.50-$2.50). | Maker: -0.01% to +0.02%, Taker: 0.04-0.06%. Slippage: 5-20 bps during high-vol shocks. | Ultra-tight: 0.1 - 0.8 pips. Rollover (21:00-22:00 UTC) widens to 2.0-5.0 pips. |
| **Optimal Alpha Model** | **Dynamic Volatility Breakout** & **Momentum Trend-Following** | **Statistical Arbitrage (ETH/BTC)** & **Dynamic Volatility Breakout** | **Regime-Filtered Mean-Reversion** & **Momentum Trend** |
| **News / Event Sensitivity** | Extreme: US CPI, NFP, FOMC, US 10Y Yields, Geopolitical shocks. | High: Regulatory actions, ETF net inflows, derivative liquidations. | High: Central bank rate decisions (Fed, ECB, BOE), NFP, GDP. |
| **Execution Protection Filter** | **News Blackout Window**: No entries 30 mins before & 15 mins after high-impact USD releases. | **Funding Rate Cost Gate**: Invalidate trades if 8h funding rate > 0.05%. | **Spread Gate**: Reject entry if current spread > 1.8 	imes rolling 1h average spread. |
| **Stop Loss Calibration** | 2.5 - 3.5 	imes ATR_{14} (prevents gold wick hunting) | 2.0 - 3.0 	imes ATR_{14} (buffers fat tails) | 1.2 - 1.8 	imes ATR_{14} (tight institutional control) |

---

### 2.6 Market Regime Detection Engine (MRDE)

#### 2.6.1 Mathematical Formulation of Indicators
The Market Regime Detection Engine evaluates market conditions across four quantitative dimensions:

1. **Hurst Exponent ($H$) via Rescaled Range ($R/S$)**:
   Given price series of length $N$:
   - Mean: $m = \frac{1}{N}\sum_{i=1}^N P_i$
   - Mean-adjusted series: $Y_t = P_t - m$
   - Cumulative deviation: $Z_t = \sum_{i=1}^t Y_i$
   - Range: $R = \max(Z_1 \dots Z_N) - \min(Z_1 \dots Z_N)$
   - Standard deviation: $S = \sqrt{\frac{1}{N}\sum_{i=1}^N (P_i - m)^2}$
   - Rescaled Range: $(R/S)_N = \frac{R}{S} \approx C \cdot N^H$
   - Regressing $\ln(R/S)_n$ on $\ln(n)$ over sub-periods yields the slope $H$:
     - $H < 0.45$: **Mean-Reverting (Anti-persistent)** — Mean-Reversion & StatArb active.
     - $0.45 \le H \le 0.55$: **Random Walk (Brownian Motion)** — Reduce position sizing by 50%.
     - $H > 0.55$: **Trending (Persistent / Memory)** — Momentum & Volatility Breakout active.

2. **Normalized ATR Ratio ($ATR_{norm}$)**:
   $$ATR_{norm}(t) = \frac{ATR_{14}(t)}{SMA_{50}(ATR_{14}(t))}$$
   - $ATR_{norm} < 0.75$: **Volatility Compression (Coiling)**.
   - $0.75 \le ATR_{norm} \le 1.60$: **Normal Volatility Regime**.
   - $ATR_{norm} > 1.60$: **High Volatility Expansion**.
   - $ATR_{norm} > 2.50$: **Hyper-Volatility Danger Zone**.

3. **Rolling Historical Volatility Percentile ($HV_{rank}$)**:
   $$HV_{30}(t) = \text{StdDev}\left(\ln\left(\frac{P_t}{P_{t-1}}\right), 30\right) \times \sqrt{252 \times 1440 / \text{timeframe\_mins}}$$
   $$HV_{rank}(t) = \frac{\text{Count}(HV_{30}(i) < HV_{30}(t) \text{ for } i \in [t-252, t])}{252} \times 100\%$$

4. **Defensive Crisis / Shock Mode Circuit Breaker**:
   An immediate structural halt triggers if ANY of the following conditions occur:
   - **Bar Range Shock**: $\frac{High_t - Low_t}{ATR_{14}(t)} \ge 3.50$ (Flash crash or liquidity void).
   - **Spread Explosion**: $\frac{Spread_t}{SMA_{100}(Spread)} \ge 3.00$.
   - **Consecutive Jump Variance**: $|\ln(Close_t / Close_{t-1})| > 4.0 \times \sigma_{log\_returns}$.
   When triggered, the system instantly engages `DEFENSIVE_CRISIS_MODE`:
   1. Blocks all new trade entries.
   2. Ratchets stops on winning positions to Breakeven $+ 1 \text{ pip}$.
   3. Shuts down Mean-Reversion models (prevents catching knives).
   4. Sends alert to `/api/ea/webhook` and Spartan Telegram notification channel.

#### 2.6.2 Regime State Transition Matrix
```
+----------------------------+-----------------------------------------------------------+-----------------------------------------------+
| Regime State               | Quantitative Criteria                                     | Permitted Active Models                       |
+----------------------------+-----------------------------------------------------------+-----------------------------------------------+
| 1. BULL_TREND              | H > 0.55, ADX >= 25, Price > EMA200, +DI > -DI           | Model 2 (Momentum Trend Long),                |
|                            | ATR_norm in [0.75, 1.80]                                  | Model 3 (Volatility Breakout Long)            |
+----------------------------+-----------------------------------------------------------+-----------------------------------------------+
| 2. BEAR_TREND              | H > 0.55, ADX >= 25, Price < EMA200, -DI > +DI           | Model 2 (Momentum Trend Short),               |
|                            | ATR_norm in [0.75, 1.80]                                  | Model 3 (Volatility Breakout Short)           |
+----------------------------+-----------------------------------------------------------+-----------------------------------------------+
| 3. RANGE_BOUND             | H < 0.45, ADX < 20, ATR_norm in [0.60, 1.30]              | Model 1 (StatArb Cointegration),              |
|                            |                                                           | Model 4 (Regime-Filtered Mean-Reversion)      |
+----------------------------+-----------------------------------------------------------+-----------------------------------------------+
| 4. VOL_COMPRESSION (COIL)  | ATR_norm < 0.75, SqueezeOn == True, ADX < 18              | Prepare Model 3 (Vol Breakout Pending Arm)    |
|                            |                                                           | Block other models                            |
+----------------------------+-----------------------------------------------------------+-----------------------------------------------+
| 5. CRISIS_SHOCK (DEFENSE)  | Bar Range >= 3.5 ATR OR Spread >= 3.0x Baseline           | ZERO NEW TRADES (All models blocked).         |
|                            | OR ATR_norm > 2.50                                        | Tighten existing stops. Emergency Kill-Switch |
+----------------------------+-----------------------------------------------------------+-----------------------------------------------+
```
---

### 2.7 Quant Architecture & Directory Layout (`quant_research/models/`)

The quantitative engine is organized into a modular, production-grade Python package with clean separation between data ingestion, indicator mathematics, alpha models, regime classification, and execution bridges:

```
quant_research/
├── README.md
├── requirements.txt
├── config/
│   ├── assets.yaml             # Asset microstructures (tick sizes, sessions, spread limits)
│   ├── models.yaml             # Model hyper-parameters, thresholds, magic numbers
│   └── risk.yaml               # Kelly / Fixed fractional risk, max drawdown bounds
├── core/
│   ├── __init__.py
│   ├── event.py                # Event-driven Tick, Bar, Signal, Order, Fill events
│   ├── portfolio.py            # Real-time equity tracking, margin calculation, LTV monitor
│   └── logger.py               # Structured JSON audit logger
├── indicators/
│   ├── __init__.py
│   ├── trend.py                # EMA triple stack, Supertrend ratchet, ADX/DMI
│   ├── volatility.py           # ATR, Bollinger Bands, Keltner Channels, Bandwidth
│   ├── momentum.py             # Donchian Channels, LinReg Momentum Slope, RSI
│   └── volume.py               # Volume Surge, On-Balance Volume (OBV)
├── models/
│   ├── __init__.py
│   ├── base_model.py           # Abstract Base Class BaseQuantModel
│   ├── statistical_arbitrage/
│   │   ├── __init__.py
│   │   ├── cointegration.py    # Engle-Granger ADF test & Johansen trace tests
│   │   ├── kalman_filter.py    # Dynamic hedge ratio (beta) state-space solver
│   │   ├── ou_process.py       # Ornstein-Uhlenbeck parameter fitting & Half-Life
│   │   └── stat_arb_model.py   # Strategy implementation (Magic: 888801)
│   ├── momentum_trend/
│   │   ├── __init__.py
│   │   ├── mtf_aligner.py      # Multi-timeframe synchronization (H4/H1/M15)
│   │   ├── supertrend_engine.py# Ratchet logic & Chandelier trail stops
│   │   └── momentum_model.py   # Strategy implementation (Magic: 888802)
│   ├── volatility_breakout/
│   │   ├── __init__.py
│   │   ├── squeeze_detector.py # BB inside KC compression analyzer
│   │   ├── volume_filter.py    # OBV surge & VWAP validation
│   │   └── breakout_model.py   # Strategy implementation (Magic: 888803)
│   └── mean_reversion/
│       ├── __init__.py
│       ├── dynamic_rsi.py      # Rolling quantile threshold generator
│       ├── candle_rejection.py # Pin bar / wick ratio classification
│       └── mean_reversion_model.py # Strategy implementation (Magic: 888804)
├── regime/
│   ├── __init__.py
│   ├── hurst.py                # Rescaled Range (R/S) Hurst Exponent algorithm
│   ├── vol_ratio.py            # Normalized ATR ratio & HV rank calculator
│   ├── shock_detector.py       # Anomaly jump & spread spike circuit breaker
│   └── regime_classifier.py    # 5-State Finite State Machine (FSM)
├── risk/
│   ├── __init__.py
│   ├── position_sizer.py       # Fractional Kelly & ATR-normalized sizing
│   ├── drawdown_guard.py       # 5% Max Drawdown hard stop enforcement
│   └── kill_switch.py          # LTV 85% Stop-Out & Connection latency breaker
└── bridge/
    ├── __init__.py
    ├── webhook_client.py       # REST client for Spartan Next.js /api/ea/webhook
    └── mql5_payload.py         # Serialization matching MQL5 CTrade & CDeal
```

#### Base Strategy Class Contract (`quant_research/models/base_model.py`):
```python
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import pandas as pd

class BaseQuantModel(ABC):
    """
    Abstract Base Class for Spartan Institutional Quantitative Models.
    Enforces deterministic signal contracts, regime gating, and Multi-Ghost Magic Numbers.
    """
    def __init__(self, name: str, magic_number: int, config: Dict[str, Any]):
        self.name = name
        self.magic_number = magic_number
        self.config = config
        self.is_active = True

    @abstractmethod
    def generate_signal(self, data: Dict[str, pd.DataFrame], current_regime: str) -> Optional[Dict[str, Any]]:
        """
        Evaluates bar data and returns signal dictionary:
        {
            "action": "BUY" | "SELL" | "CLOSE" | "HOLD",
            "symbol": str,
            "lots": float,
            "stop_loss": float,
            "take_profit": float,
            "magic_number": int,
            "comment": str
        }
        """
        pass

    @abstractmethod
    def update_trailing_stop(self, position: Dict[str, Any], current_bar: pd.Series) -> Optional[float]:
        """Computes updated ratchet stop loss level."""
        pass
```

---

## 3. Caveats

1. **Tick vs Bar-Level Data Granularity**:
   Calculations based solely on 1-minute or 15-minute close prices omit intra-bar wick spikes. For high-volatility assets like XAUUSD, intra-bar spread spikes and slippage must be simulated using tick-level bid/ask feeds to avoid optimistic backtest bias.
2. **Cointegration Structural Breaks**:
   The statistical cointegration between ETH and BTC is not an immutable natural constant; token-specific protocol events (e.g. Ethereum The Merge, ETF flows) can cause permanent divergence. The dynamic Kalman Filter and strict $Z_{stop} = 3.50$ guardrails are mandatory to prevent catastrophic divergence holding.
3. **MQL5 Execution Asynchrony**:
   While Python vectorization calculates instantaneous fills, real-world MetaTrader 5 brokers exhibit order routing latency ($50 - 250\text{ ms}$) and asymmetric slippage. Limit orders and slippage tolerance buffers must be enforced in the MQL5 EA wrapper.
4. **Data Snooping & Overfitting**:
   Multi-parameter indicators (Donchian, Supertrend, Keltner) risk overfitting past noise. Walk-Forward Optimization (WFO) with an Out-of-Sample (OOS) ratio of at least 30% must be enforced before committing parameters to live production.

---

## 4. Conclusion

The quantitative alpha architecture for Requirement R1 is fully mapped, mathematically formalized, and systematically adapted across the target asset classes:
1. **Four Robust Models**:
   - *Statistical Arbitrage* (ETH/BTC): Kalman-filtered cointegration spread with OU half-life dynamic z-score (Magic: `888801`).
   - *Momentum Trend-Following*: Multi-timeframe H4/H1/M15 EMA triple stack with Donchian breakout and Supertrend ratchet (Magic: `888802`).
   - *Dynamic Volatility Breakout*: Bollinger/Keltner Squeeze detection with volume and OBV surge confirmation (Magic: `888803`).
   - *Regime-Filtered Mean-Reversion*: Trend-gated RSI dynamic quantiles with Bollinger envelope bounce and macro knife defense (Magic: `888804`).
2. **Asset-Class Microstructure Customization**: Dedicated parameter sets and risk profiles tailored to the specific liquidity, tick values, and volatility characteristics of XAUUSD, Crypto (BTC/ETH), and Forex Majors (EURUSD/GBPUSD).
3. **Market Regime Detection Engine (MRDE)**: 5-state regime matrix leveraging Hurst exponent, ADX, normalized ATR ratios, and a hard circuit breaker to prevent trading in adverse environments.
4. **Architectural Blueprint**: Production-ready Python structure in `quant_research/models/` matching the Spartan Webhook API contract and MQL5 Multi-Ghost architecture.

This specification provides the quantitative foundation for the Implementation Workers and Validation Auditors to commence coding and backtesting.

---

## 5. Verification Method

To independently verify the mathematical formulations and architectural designs:
1. **Mathematical Stationarity & Cointegration Check**:
   Run Python test script simulating two correlated geometric Brownian motions with mean-reverting noise:
   ```bash
   python -c "import numpy as np; from statsmodels.tsa.stattools import coint; x = np.cumsum(np.random.randn(1000)); y = 0.5*x + np.random.randn(1000); print('Cointegration p-value:', coint(y, x)[1])"
   ```
   *Expected result*: $p\text{-value} < 0.01$, verifying the Engle-Granger step.
2. **Hurst Exponent Verification**:
   Execute Rescaled Range analysis on generated mean-reverting vs trending synthetic series:
   - Mean-reverting series ($AR(1)$ with $\phi = 0.4$) must yield $H < 0.45$.
   - Geometric Brownian motion must yield $0.48 \le H \le 0.52$.
3. **Webhook Payload Compliance**:
   Verify that all signal fields emitted by `BaseQuantModel` match the schema expected by `src/app/api/ea/webhook/route.ts`:
   - `ticket`, `type`, `symbol`, `lots`, `openPrice`, `closePrice`, `pnl`, `pnlPercentage`, `magicNumber`.
4. **TypeScript Pre-Flight Verification**:
   Verify that the Spartan mini-app repository remains clean:
   ```bash
   ./node_modules/.bin/tsc --noEmit
   ./node_modules/.bin/next build
   ```
