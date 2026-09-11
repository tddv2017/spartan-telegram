"""Comprehensive Unit Tests for Market Regime Detection Engine (MRDE)."""

import numpy as np
import pandas as pd
import pytest

from quant_research.core.constants import RegimeState
from quant_research.core.types import IRegimeDetector
from quant_research.regime.hurst import (
    classify_hurst,
    compute_hurst_exponent,
    rolling_hurst,
)
from quant_research.regime.regime_fsm import MarketRegimeFSM
from quant_research.regime.shock_detector import ShockDetector
from quant_research.regime.vol_metrics import (
    compute_adx_dmi,
    compute_atr,
    compute_historical_volatility,
    compute_hv_rank,
    compute_normalized_atr_ratio,
    compute_true_range,
)


# ============================================================================
# 1. HURST EXPONENT TESTS
# ============================================================================
def test_hurst_mean_reverting_series():
    """Verify Hurst exponent correctly identifies anti-persistent / mean-reverting series."""
    np.random.seed(42)
    # Generate stationary mean-reverting AR(1) process: x_t = -0.6 * x_{t-1} + noise
    n = 1000
    x = np.zeros(n)
    noise = np.random.normal(0, 1, n)
    for t in range(1, n):
        x[t] = -0.55 * x[t - 1] + noise[t]

    price_series = 100.0 + x
    h = compute_hurst_exponent(price_series)

    assert h < 0.45, f"Expected H < 0.45 for mean-reverting series, got {h:.4f}"
    assert classify_hurst(h) == "MEAN_REVERTING"


def test_hurst_random_walk():
    """Verify Hurst exponent correctly identifies Geometric Brownian Motion / Random Walk."""
    np.random.seed(123)
    # Pure Brownian motion: cumulative sum of white noise
    returns = np.random.normal(0, 0.01, 2000)
    price_series = 100.0 * np.exp(np.cumsum(returns))

    h = compute_hurst_exponent(price_series)
    assert 0.45 <= h <= 0.56, f"Expected H around 0.50 (0.45-0.56) for random walk, got {h:.4f}"
    # Classification must not be strong trend (>0.60) or strong mean reversion (<0.40)


def test_hurst_trending_series():
    """Verify Hurst exponent correctly identifies persistent / trending series."""
    np.random.seed(42)
    # Strong persistent momentum series
    n = 1000
    noise = np.random.normal(0, 0.005, n)
    # Positive trend with persistent positive autocorrelation
    persistent_shocks = np.zeros(n)
    persistent_shocks[0] = noise[0]
    for i in range(1, n):
        persistent_shocks[i] = 0.70 * persistent_shocks[i - 1] + noise[i]

    trend = np.linspace(0, 1.0, n)
    price_series = 100.0 * np.exp(trend + np.cumsum(persistent_shocks))

    h = compute_hurst_exponent(price_series)
    assert h > 0.55, f"Expected H > 0.55 for trending series, got {h:.4f}"
    assert classify_hurst(h) == "TRENDING"


def test_rolling_hurst_calculation():
    """Verify rolling Hurst produces expected length and valid bounds."""
    np.random.seed(99)
    series = pd.Series(100.0 + np.cumsum(np.random.normal(0, 1, 300)))
    h_roll = rolling_hurst(series, window=100)

    assert len(h_roll) == len(series)
    assert not h_roll.isnull().any(), "Rolling Hurst should have no NaNs"
    assert (h_roll >= 0.0).all() and (h_roll <= 1.0).all()


# ============================================================================
# 2. VOLATILITY METRICS TESTS
# ============================================================================
def test_volatility_metrics_and_atr_norm():
    """Verify ATR, ATR_norm, and Historical Volatility Rank calculations."""
    n = 150
    dates = pd.date_range("2024-01-01", periods=n, freq="1h")

    # Baseline steady price action
    base = 100.0
    opens = np.full(n, base)
    highs = np.full(n, base + 0.5)
    lows = np.full(n, base - 0.5)
    closes = np.full(n, base + 0.1)

    df_steady = pd.DataFrame({
        "timestamp": dates,
        "open": opens,
        "high": highs,
        "low": lows,
        "close": closes,
        "spread": np.full(n, 0.02),
        "volume": np.full(n, 1000),
    })

    atr = compute_atr(df_steady, period=14)
    assert len(atr) == n
    assert np.isclose(atr.iloc[-1], 1.0, atol=0.1)

    atr_norm = compute_normalized_atr_ratio(df_steady, atr_period=14, sma_period=50)
    assert np.isclose(atr_norm.iloc[-1], 1.0, atol=0.15)

    # Inject volatility compression into recent bars
    df_compressed = df_steady.copy()
    df_compressed.loc[n - 20 :, "high"] = base + 0.15
    df_compressed.loc[n - 20 :, "low"] = base - 0.15
    df_compressed.loc[n - 20 :, "close"] = base + 0.05

    atr_norm_comp = compute_normalized_atr_ratio(df_compressed, atr_period=14, sma_period=50)
    assert atr_norm_comp.iloc[-1] < 0.75, (
        f"Expected ATR_norm < 0.75 during compression, got {atr_norm_comp.iloc[-1]:.3f}"
    )


def test_hv_rank_percentile():
    """Verify Historical Volatility Rank is bounded between 0% and 100%."""
    np.random.seed(42)
    n = 300
    prices = 100.0 * np.exp(np.cumsum(np.random.normal(0, 0.01, n)))
    df = pd.DataFrame({
        "timestamp": pd.date_range("2024-01-01", periods=n, freq="1h"),
        "open": prices,
        "high": prices * 1.002,
        "low": prices * 0.998,
        "close": prices,
        "volume": np.full(n, 1000),
    })

    hv_rank = compute_hv_rank(df, hv_window=20, rank_lookback=100)
    assert (hv_rank >= 0.0).all() and (hv_rank <= 100.0).all()


def test_adx_directional_movement():
    """Verify ADX detects strong trend vs flat market."""
    n = 100
    # Strong persistent uptrend
    uptrend_closes = np.linspace(100.0, 200.0, n)
    df_uptrend = pd.DataFrame({
        "open": uptrend_closes - 0.5,
        "high": uptrend_closes + 1.0,
        "low": uptrend_closes - 1.0,
        "close": uptrend_closes,
    })

    adx, plus_di, minus_di = compute_adx_dmi(df_uptrend, period=14)
    assert adx.iloc[-1] > 25.0, "ADX should be > 25 in strong uptrend"
    assert plus_di.iloc[-1] > minus_di.iloc[-1], "+DI should exceed -DI in uptrend"


# ============================================================================
# 3. SHOCK DETECTOR CIRCUIT BREAKER TESTS
# ============================================================================
def test_shock_detector_bar_range():
    """Verify bar range >= 3.5x ATR triggers circuit breaker."""
    detector = ShockDetector(bar_range_threshold=3.50, spread_spike_threshold=3.00)

    # Normal Bar
    normal_res = detector.evaluate_bar(
        open_p=100.0,
        high_p=101.0,
        low_p=99.0,
        close_p=100.5,
        prev_close_p=100.0,
        spread=0.20,
        baseline_spread=0.20,
        current_atr=1.5,
        return_std=0.01,
        atr_norm=1.0,
    )
    assert not normal_res.is_shock
    assert normal_res.reason == "NORMAL"

    # Shock Bar: Range = 6.0 (6.0 / 1.5 = 4.0x ATR >= 3.5x)
    shock_res = detector.evaluate_bar(
        open_p=100.0,
        high_p=105.0,
        low_p=99.0,
        close_p=104.0,
        prev_close_p=100.0,
        spread=0.20,
        baseline_spread=0.20,
        current_atr=1.5,
        return_std=0.01,
        atr_norm=1.0,
    )
    assert shock_res.is_shock
    assert "BAR_RANGE_SHOCK" in shock_res.reason
    assert shock_res.bar_range_ratio >= 3.50


def test_shock_detector_spread_explosion():
    """Verify spread >= 3.0x baseline triggers spread explosion shock."""
    detector = ShockDetector(bar_range_threshold=3.50, spread_spike_threshold=3.00)

    shock_res = detector.evaluate_bar(
        open_p=100.0,
        high_p=101.0,
        low_p=99.5,
        close_p=100.2,
        prev_close_p=100.0,
        spread=0.85,  # 0.85 / 0.20 = 4.25x baseline
        baseline_spread=0.20,
        current_atr=1.5,
        return_std=0.01,
        atr_norm=1.0,
    )
    assert shock_res.is_shock
    assert "SPREAD_EXPLOSION" in shock_res.reason


def test_shock_detector_dataframe_vectorized():
    """Verify vectorized DataFrame shock detection."""
    n = 60
    base = 100.0
    df = pd.DataFrame({
        "open": np.full(n, base),
        "high": np.full(n, base + 1.0),
        "low": np.full(n, base - 1.0),
        "close": np.full(n, base + 0.2),
        "spread": np.full(n, 0.20),
    })

    # Inject extreme shock on bar 45
    df.loc[45, "high"] = base + 15.0  # 16-point range (normal range is 2.0)
    df.loc[45, "low"] = base - 1.0
    df.loc[45, "spread"] = 1.50  # 7.5x spread

    detector = ShockDetector()
    res_df = detector.evaluate_dataframe(df, baseline_spread=0.20)

    assert not res_df.loc[40, "is_shock"]
    assert res_df.loc[45, "is_shock"]
    assert "BAR_RANGE_SHOCK" in res_df.loc[45, "shock_reason"]
    assert "SPREAD_EXPLOSION" in res_df.loc[45, "shock_reason"]


# ============================================================================
# 4. 5-STATE FSM REGIME ENGINE TESTS
# ============================================================================
def test_regime_fsm_bull_trend():
    """Verify FSM transitions to BULL_TREND under persistent uptrend."""
    n = 250
    # Create persistent uptrend above EMA 200
    prices = np.linspace(100.0, 180.0, n)
    df = pd.DataFrame({
        "timestamp": pd.date_range("2024-01-01", periods=n, freq="1h"),
        "open": prices - 0.3,
        "high": prices + 0.8,
        "low": prices - 0.5,
        "close": prices,
        "spread": np.full(n, 0.20),
        "volume": np.full(n, 1000),
    })

    fsm = MarketRegimeFSM(shock_cooling_bars=3)
    assert isinstance(fsm, IRegimeDetector)

    eval_res = fsm.evaluate_detailed(df)
    assert eval_res.state == RegimeState.BULL_TREND
    assert eval_res.adx >= 25.0
    assert eval_res.details["close"] > eval_res.details["ema_200"]


def test_regime_fsm_bear_trend():
    """Verify FSM transitions to BEAR_TREND under persistent downtrend."""
    n = 250
    # Create persistent downtrend below EMA 200
    prices = np.linspace(180.0, 100.0, n)
    df = pd.DataFrame({
        "timestamp": pd.date_range("2024-01-01", periods=n, freq="1h"),
        "open": prices + 0.3,
        "high": prices + 0.5,
        "low": prices - 0.8,
        "close": prices,
        "spread": np.full(n, 0.20),
        "volume": np.full(n, 1000),
    })

    fsm = MarketRegimeFSM(shock_cooling_bars=3)
    eval_res = fsm.evaluate_detailed(df)

    assert eval_res.state == RegimeState.BEAR_TREND
    assert eval_res.adx >= 25.0
    assert eval_res.details["close"] < eval_res.details["ema_200"]


def test_regime_fsm_range_bound():
    """Verify FSM transitions to RANGE_BOUND when oscillating in a range."""
    np.random.seed(42)
    n = 250
    # Mean-reverting Ornstein-Uhlenbeck / stationary AR(1) process
    x = np.zeros(n)
    noise = np.random.normal(0, 0.4, n)
    for i in range(1, n):
        x[i] = 0.4 * x[i - 1] + noise[i]
    prices = 100.0 + x
    df = pd.DataFrame({
        "timestamp": pd.date_range("2024-01-01", periods=n, freq="1h"),
        "open": prices - 0.2,
        "high": prices + 0.6,
        "low": prices - 0.6,
        "close": prices,
        "spread": np.full(n, 0.20),
        "volume": np.full(n, 1000),
    })

    fsm = MarketRegimeFSM()
    eval_res = fsm.evaluate_detailed(df)
    assert eval_res.state == RegimeState.RANGE_BOUND


def test_regime_fsm_vol_compression():
    """Verify FSM transitions to VOL_COMPRESSION when ATR drops drastically."""
    n = 250
    dates = pd.date_range("2024-01-01", periods=n, freq="1h")
    # First 200 bars normal, last 50 bars extremely tight range (compression)
    opens = np.full(n, 100.0)
    highs = np.full(n, 102.0)
    lows = np.full(n, 98.0)
    closes = np.full(n, 100.0)

    # Tight squeeze
    highs[200:] = 100.10
    lows[200:] = 99.90
    closes[200:] = 100.02

    df = pd.DataFrame({
        "timestamp": dates,
        "open": opens,
        "high": highs,
        "low": lows,
        "close": closes,
        "spread": np.full(n, 0.05),
        "volume": np.full(n, 500),
    })

    fsm = MarketRegimeFSM()
    eval_res = fsm.evaluate_detailed(df)
    assert eval_res.state == RegimeState.VOL_COMPRESSION
    assert eval_res.atr_norm < 0.75


def test_regime_fsm_crisis_shock_and_cooling():
    """Verify FSM transitions to CRISIS_SHOCK on anomaly and respects cooling period."""
    n = 100
    prices = np.full(n, 100.0)
    df = pd.DataFrame({
        "timestamp": pd.date_range("2024-01-01", periods=n, freq="1h"),
        "open": prices,
        "high": prices + 1.0,
        "low": prices - 1.0,
        "close": prices,
        "spread": np.full(n, 0.20),
        "volume": np.full(n, 1000),
    })

    fsm = MarketRegimeFSM(shock_cooling_bars=3)

    # Baseline check
    assert fsm.evaluate(df) != RegimeState.CRISIS_SHOCK

    # Inject flash shock on the latest bar
    df.loc[df.index[-1], "high"] = 115.0  # Massive range
    df.loc[df.index[-1], "close"] = 114.0

    eval_res = fsm.evaluate_detailed(df)
    assert eval_res.state == RegimeState.CRISIS_SHOCK
    assert eval_res.is_shock

    # Next bar is normal, but cooling period should keep it in CRISIS_SHOCK
    next_bar = pd.DataFrame({
        "timestamp": [df["timestamp"].iloc[-1] + pd.Timedelta(hours=1)],
        "open": [114.0],
        "high": [114.5],
        "low": [113.5],
        "close": [114.0],
        "spread": [0.20],
        "volume": [1000],
    })
    df_post_shock_1 = pd.concat([df, next_bar], ignore_index=True)
    eval_res_post1 = fsm.evaluate_detailed(df_post_shock_1)
    assert eval_res_post1.state == RegimeState.CRISIS_SHOCK, "Must remain in CRISIS_SHOCK during cooling bar 1"
