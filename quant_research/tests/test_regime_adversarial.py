"""Empirical Adversarial Stress Test Suite for Market Regime Detection Engine (MRDE).

This suite stress-tests MRDE components against hostile market scenarios:
1. Flatline zero-variance price series
2. Huge flash-crash gaps (>10x ATR) and cooling hysteresis
3. High-frequency alternating noise (mean-reversion limits)
4. Spread explosions and baseline distortions
5. NaN, Inf, negative prices, and anomalous inputs
"""

import numpy as np
import pandas as pd
import pytest

from quant_research.core.constants import RegimeState
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
# 1. FLATLINE ZERO-VARIANCE PRICE SERIES
# ============================================================================
class TestFlatlineZeroVariance:
    """Stress tests on completely flat, zero-variance price data."""

    def test_hurst_flatline_returns_neutral(self):
        """Zero-variance series must yield Hurst = 0.50 (neutral random walk) without division by zero."""
        series = pd.Series([100.0] * 120)
        h = compute_hurst_exponent(series)
        assert h == 0.50
        assert classify_hurst(h) == "RANDOM_WALK"

    def test_vol_metrics_flatline_stability(self):
        """ATR, ATR_norm, HV, and ADX must handle flatlines without crashing or producing NaNs."""
        n = 100
        df = pd.DataFrame({
            "timestamp": pd.date_range("2024-01-01", periods=n, freq="1h"),
            "open": [100.0] * n,
            "high": [100.0] * n,
            "low": [100.0] * n,
            "close": [100.0] * n,
            "spread": [0.02] * n,
            "volume": [0] * n,
        })

        tr = compute_true_range(df)
        assert (tr == 0.0).all()

        atr = compute_atr(df, period=14)
        assert (atr == 0.0).all()

        atr_norm = compute_normalized_atr_ratio(df, atr_period=14, sma_period=50)
        assert not atr_norm.isna().any()
        assert atr_norm.iloc[-1] == 0.0

        hv = compute_historical_volatility(df, window=30)
        assert not hv.isna().any()
        assert (hv == 0.0).all()

        hv_rank = compute_hv_rank(df, hv_window=30, rank_lookback=50)
        assert not hv_rank.isna().any()

        adx, p_di, m_di = compute_adx_dmi(df, period=14)
        assert not adx.isna().any()
        assert adx.iloc[-1] == 0.0

    def test_fsm_flatline_identifies_compression(self):
        """Zero-variance flatline must be classified as VOL_COMPRESSION (ATR_norm < 0.75)."""
        n = 100
        df = pd.DataFrame({
            "timestamp": pd.date_range("2024-01-01", periods=n, freq="1h"),
            "open": [100.0] * n,
            "high": [100.0] * n,
            "low": [100.0] * n,
            "close": [100.0] * n,
            "spread": [0.02] * n,
            "volume": [0] * n,
        })
        fsm = MarketRegimeFSM()
        eval_res = fsm.evaluate_detailed(df)
        assert eval_res.state == RegimeState.VOL_COMPRESSION
        assert eval_res.atr_norm == 0.0
        assert not eval_res.is_shock


# ============================================================================
# 2. HUGE FLASH CRASH GAPS (>10x ATR) & COOLING
# ============================================================================
class TestFlashCrashAndCooling:
    """Stress tests for extreme gap drops, flash crashes, and circuit breaker cooling."""

    def test_intraday_flash_crash_bar_range(self):
        """Intraday flash crash >10x ATR must immediately trip CRISIS_SHOCK."""
        n = 100
        base = 100.0
        df = pd.DataFrame({
            "timestamp": pd.date_range("2024-01-01", periods=n, freq="1h"),
            "open": [base] * n,
            "high": [base + 1.0] * n,
            "low": [base - 1.0] * n,
            "close": [base] * n,
            "spread": [0.20] * n,
            "volume": [1000] * n,
        })

        # Inject massive flash crash: 20x normal ATR
        normal_atr = float(compute_atr(df).iloc[-1])
        df.loc[n - 1, "high"] = base
        df.loc[n - 1, "low"] = base - (15.0 * normal_atr)
        df.loc[n - 1, "close"] = base - (14.0 * normal_atr)

        fsm = MarketRegimeFSM(shock_cooling_bars=3)
        res = fsm.evaluate_detailed(df)

        assert res.state == RegimeState.CRISIS_SHOCK
        assert res.is_shock
        assert "BAR_RANGE_SHOCK" in res.shock_reason

    def test_overnight_gap_flash_crash_jump_variance(self):
        """Overnight gap flash crash with tight post-gap candle must trip JUMP_VARIANCE."""
        n = 100
        base = 100.0
        df = pd.DataFrame({
            "timestamp": pd.date_range("2024-01-01", periods=n, freq="1h"),
            "open": [base] * n,
            "high": [base + 1.0] * n,
            "low": [base - 1.0] * n,
            "close": [base] * n,
            "spread": [0.20] * n,
            "volume": [1000] * n,
        })

        # Overnight gap down: bar range itself is tiny (0.4), but price gapped 25% down
        df.loc[n - 1, "open"] = 75.0
        df.loc[n - 1, "high"] = 75.2
        df.loc[n - 1, "low"] = 74.8
        df.loc[n - 1, "close"] = 75.0

        fsm = MarketRegimeFSM(shock_cooling_bars=3)
        res = fsm.evaluate_detailed(df)

        assert res.state == RegimeState.CRISIS_SHOCK
        assert res.is_shock
        assert "JUMP_VARIANCE" in res.shock_reason

    def test_shock_cooling_period_retention(self):
        """FSM must remain locked in CRISIS_SHOCK throughout exact cooling duration."""
        n = 80
        df = pd.DataFrame({
            "timestamp": pd.date_range("2024-01-01", periods=n, freq="1h"),
            "open": [100.0] * n,
            "high": [101.0] * n,
            "low": [99.0] * n,
            "close": [100.0] * n,
            "spread": [0.20] * n,
        })

        # Shock at bar 75
        df.loc[75, "high"] = 120.0
        df.loc[75, "close"] = 118.0

        cooling_bars = 3
        fsm = MarketRegimeFSM(shock_cooling_bars=cooling_bars)
        states = fsm.classify_series(df)

        assert states.iloc[75] == RegimeState.CRISIS_SHOCK, "Shock bar must be CRISIS_SHOCK"
        assert states.iloc[76] == RegimeState.CRISIS_SHOCK, "Cooling bar 1 must be CRISIS_SHOCK"
        assert states.iloc[77] == RegimeState.CRISIS_SHOCK, "Cooling bar 2 must be CRISIS_SHOCK"
        assert states.iloc[78] == RegimeState.CRISIS_SHOCK, "Cooling bar 3 must be CRISIS_SHOCK"
        assert states.iloc[79] != RegimeState.CRISIS_SHOCK, "Bar 4 post-shock must exit CRISIS_SHOCK"


# ============================================================================
# 3. HIGH-FREQUENCY NOISE ALTERNATING EVERY BAR
# ============================================================================
class TestHighFrequencyAlternatingNoise:
    """Stress tests on anti-persistent alternating noise series."""

    def test_pure_alternating_series_hurst_near_zero(self):
        """Pure alternating ping-pong series must yield Hurst ~ 0.0 (anti-persistent)."""
        series = [100.0 if i % 2 == 0 else 102.0 for i in range(120)]
        h = compute_hurst_exponent(series)
        assert h < 0.10, f"Expected H ~ 0 for pure alternating series, got {h}"
        assert classify_hurst(h) == "MEAN_REVERTING"

    def test_hf_noise_classified_as_range_bound(self):
        """FSM must classify alternating HF noise as RANGE_BOUND and never as TREND."""
        n = 100
        prices = [100.0 if i % 2 == 0 else 103.0 for i in range(n)]
        df = pd.DataFrame({
            "timestamp": pd.date_range("2024-01-01", periods=n, freq="1h"),
            "open": prices,
            "high": [p + 0.5 for p in prices],
            "low": [p - 0.5 for p in prices],
            "close": prices,
            "spread": [0.05] * n,
        })

        fsm = MarketRegimeFSM()
        res = fsm.evaluate_detailed(df)
        assert res.state == RegimeState.RANGE_BOUND
        assert res.hurst < 0.45
        assert res.adx < 20.0


# ============================================================================
# 4. SPREAD EXPLOSIONS & LIQUIDITY VOIDS
# ============================================================================
class TestSpreadExplosions:
    """Stress tests on sudden spread widening and illiquidity."""

    def test_spread_spike_triggers_shock(self):
        """Spread explosion >= 3.0x baseline spread must immediately trip CRISIS_SHOCK."""
        n = 60
        df = pd.DataFrame({
            "timestamp": pd.date_range("2024-01-01", periods=n, freq="1h"),
            "open": [100.0] * n,
            "high": [101.0] * n,
            "low": [99.0] * n,
            "close": [100.0] * n,
            "spread": [0.20] * n,
        })
        # Explode spread 10x baseline on latest bar
        df.loc[n - 1, "spread"] = 2.0

        fsm = MarketRegimeFSM()
        res = fsm.evaluate_detailed(df)
        assert res.state == RegimeState.CRISIS_SHOCK
        assert res.is_shock
        assert "SPREAD_EXPLOSION" in res.shock_reason

    def test_infinite_spread_triggers_shock(self):
        """Spread = inf must trip SPREAD_EXPLOSION without crashing."""
        detector = ShockDetector()
        res = detector.evaluate_bar(
            open_p=100.0,
            high_p=101.0,
            low_p=99.0,
            close_p=100.0,
            prev_close_p=100.0,
            spread=float("inf"),
            baseline_spread=0.20,
            current_atr=1.0,
            return_std=0.01,
            atr_norm=1.0,
        )
        assert res.is_shock
        assert "SPREAD_EXPLOSION" in res.reason

    def test_zero_baseline_spread_handled(self):
        """Baseline spread = 0.0 must be safely guarded against division by zero."""
        detector = ShockDetector()
        res = detector.evaluate_bar(
            open_p=100.0,
            high_p=101.0,
            low_p=99.0,
            close_p=100.0,
            prev_close_p=100.0,
            spread=0.50,
            baseline_spread=0.0,
            current_atr=1.0,
            return_std=0.01,
            atr_norm=1.0,
        )
        assert res.is_shock
        assert "SPREAD_EXPLOSION" in res.reason


# ============================================================================
# 5. ANOMALIES, NAN & INF INPUTS
# ============================================================================
class TestAnomaliesNaNAndInf:
    """Stress tests on NaN, Inf, non-positive prices, and feed corruption."""

    def test_empty_and_insufficient_dataframe(self):
        """DataFrame with < 30 bars returns RANGE_BOUND safely."""
        fsm = MarketRegimeFSM()
        res_empty = fsm.evaluate_detailed(pd.DataFrame())
        assert res_empty.state == RegimeState.RANGE_BOUND
        assert "Insufficient bars" in res_empty.details["reason"]

        df_short = pd.DataFrame({
            "open": [100.0] * 10,
            "high": [101.0] * 10,
            "low": [99.0] * 10,
            "close": [100.0] * 10,
        })
        res_short = fsm.evaluate_detailed(df_short)
        assert res_short.state == RegimeState.RANGE_BOUND

    def test_inf_in_price_triggers_crisis_shock(self):
        """Inf price in close must trigger CRISIS_SHOCK via JUMP_VARIANCE."""
        n = 50
        df = pd.DataFrame({
            "timestamp": pd.date_range("2024-01-01", periods=n, freq="1h"),
            "open": [100.0] * n,
            "high": [101.0] * n,
            "low": [99.0] * n,
            "close": [100.0] * n,
            "spread": [0.20] * n,
        })
        df.loc[n - 1, "close"] = np.inf

        fsm = MarketRegimeFSM()
        res = fsm.evaluate_detailed(df)
        assert res.state == RegimeState.CRISIS_SHOCK
        assert res.is_shock
        assert "JUMP_VARIANCE" in res.shock_reason

    def test_inf_in_high_triggers_crisis_shock(self):
        """Inf price in high must trigger CRISIS_SHOCK via BAR_RANGE_SHOCK."""
        n = 50
        df = pd.DataFrame({
            "timestamp": pd.date_range("2024-01-01", periods=n, freq="1h"),
            "open": [100.0] * n,
            "high": [101.0] * n,
            "low": [99.0] * n,
            "close": [100.0] * n,
            "spread": [0.20] * n,
        })
        df.loc[n - 1, "high"] = np.inf

        fsm = MarketRegimeFSM()
        res = fsm.evaluate_detailed(df)
        assert res.state == RegimeState.CRISIS_SHOCK
        assert res.is_shock
        assert "BAR_RANGE_SHOCK" in res.shock_reason

    def test_rolling_hurst_handles_nan_and_inf_without_crashing(self):
        """rolling_hurst on series with Inf must produce finite output bounded in [0, 1]."""
        s = pd.Series([100.0 + i for i in range(120)])
        s.iloc[80] = np.inf
        rh = rolling_hurst(s, window=40)
        assert not rh.isna().any()
        assert not np.isinf(rh).any()
        assert (rh >= 0.0).all() and (rh <= 1.0).all()
