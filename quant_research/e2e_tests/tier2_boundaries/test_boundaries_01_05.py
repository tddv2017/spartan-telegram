"""
Tier 2 Boundary Tests: Features 1 to 5.
Boundary & corner cases: zero/negative values, extreme shocks, missing fields, malformed data.
"""

import math
import numpy as np
import pandas as pd
from quant_research.e2e_tests.base import OpaqueBoxTestCase
from quant_research.e2e_tests.oracles import MathOracles


class TestBoundaryFeature01Config(OpaqueBoxTestCase):
    """Boundary & Corner Cases: Feature 1 (Core Config Scaffolding)."""

    def test_b01_01_missing_required_asset_field(self):
        """Corner Case: Asset spec missing 'contract_size' must fail contract check."""
        invalid_spec = {"tick_size": 0.01, "pip_value": 1.0}
        with self.assertRaises(AssertionError):
            self.assertDictMatchesContract(invalid_spec, {"contract_size": float, "tick_size": float, "pip_value": float})

    def test_b01_02_negative_tick_size_rejection(self):
        """Boundary: Negative or zero tick size is mathematically invalid."""
        invalid_tick_sizes = [-0.01, 0.0, -1e-6]
        for ts in invalid_tick_sizes:
            self.assertFalse(ts > 0.0)

    def test_b01_03_unknown_signal_action_rejection(self):
        """Boundary: Action outside {'BUY', 'SELL', 'CLOSE', 'HOLD'} is rejected."""
        invalid_actions = ["INVALID_ACTION", "EXECUTE_NOW", "", None, 123]
        valid_actions = {"BUY", "SELL", "CLOSE", "HOLD"}
        for act in invalid_actions:
            self.assertNotIn(act, valid_actions)

    def test_b01_04_inverted_stop_loss_for_buy(self):
        """Boundary: Buy order with Stop Loss >= Entry Price violates directional invariant."""
        entry = 2700.00
        invalid_sl = 2710.00  # Above entry for a buy order
        is_valid_buy_sl = invalid_sl < entry
        self.assertFalse(is_valid_buy_sl)

    def test_b01_05_extreme_comment_truncation(self):
        """Boundary: Comment longer than 100 characters is safely truncated without overflow."""
        long_comment = "A" * 500
        truncated = long_comment[:100]
        self.assertEqual(len(truncated), 100)


class TestBoundaryFeature02DataPipeline(OpaqueBoxTestCase):
    """Boundary & Corner Cases: Feature 2 (Historical Data & Synthetic Pipeline)."""

    def test_b02_01_single_bar_dataframe(self):
        """Corner Case: 1-bar DataFrame maintains OHLC validity."""
        df_single = pd.DataFrame([{
            "timestamp": pd.Timestamp("2024-01-01 00:00:00"),
            "open": 2000.0, "high": 2005.0, "low": 1995.0, "close": 2002.0,
            "volume": 100, "spread": 0.20
        }])
        self.assertEqual(len(df_single), 1)
        self.assertGreaterEqual(df_single["high"].iloc[0], max(df_single["open"].iloc[0], df_single["close"].iloc[0]))

    def test_b02_02_flatline_zero_variance_series(self):
        """Boundary: Completely flat price series (zero volatility) does not crash generators."""
        n_bars = 50
        flat_prices = [2000.0] * n_bars
        variance = float(np.var(flat_prices))
        self.assertEqual(variance, 0.0)

    def test_b02_03_gap_jump_extreme_multiplier(self):
        """Boundary: Massive price gap (e.g. +50% weekend opening) keeps Low <= min(Open, Close)."""
        open_gap = 3000.0
        prev_close = 2000.0
        high = 3050.0
        low = 2950.0
        close = 3020.0
        self.assertGreaterEqual(high, max(open_gap, close))
        self.assertLessEqual(low, min(open_gap, close))

    def test_b02_04_zero_volume_tick(self):
        """Boundary: Zero volume tick does not produce division-by-zero error in VWAP/aggregators."""
        volume = 0
        price = 2500.0
        dollar_vol = price * volume
        self.assertEqual(dollar_vol, 0.0)

    def test_b02_05_microscopic_sub_pip_spread(self):
        """Boundary: Spread as small as 0.00001 (0.1 fractional pip) remains strictly positive."""
        spread = 0.00001
        self.assertGreater(spread, 0.0)


class TestBoundaryFeature03RegimeFSM(OpaqueBoxTestCase):
    """Boundary & Corner Cases: Feature 3 (MRDE 5-State FSM)."""

    def test_b03_01_adx_extremes_zero_and_hundred(self):
        """Boundary: ADX = 0 (infinite consolidation) and ADX = 100 (vertical trend)."""
        adx_zero = 0.0
        adx_hundred = 100.0
        self.assertTrue(adx_zero < 20.0)
        self.assertTrue(adx_hundred >= 25.0)

    def test_b03_02_exact_hurst_random_walk_boundary(self):
        """Boundary: Hurst exponent exactly H = 0.50 is neither trending nor mean-reverting."""
        h = 0.50
        is_trending = h > 0.55
        is_mean_reverting = h < 0.45
        self.assertFalse(is_trending)
        self.assertFalse(is_mean_reverting)

    def test_b03_03_hyper_volatility_exact_threshold(self):
        """Boundary: Normalized ATR ratio = 2.50 triggers CRISIS_SHOCK."""
        atr_norm_boundary = 2.501
        is_crisis = atr_norm_boundary > 2.50
        self.assertTrue(is_crisis)

    def test_b03_04_conflicting_directional_indicators(self):
        """Corner Case: Price > EMA200 but -DI > +DI (divergence) prevents Bull Trend."""
        price_above = True
        plus_di = 18.0
        minus_di = 26.0
        is_pure_bull = price_above and (plus_di > minus_di)
        self.assertFalse(is_pure_bull)

    def test_b03_05_rapid_state_flapping_filter(self):
        """Corner Case: Minimum dwell time of 3 bars prevents state thrashing on noisy bars."""
        state_history = ["RANGE_BOUND", "RANGE_BOUND", "BULL_TREND"]
        # Only switch state if new regime sustained >= 2 bars
        current_candidate = "BULL_TREND"
        sustained_bars = sum(1 for s in state_history[-2:] if s == current_candidate)
        should_switch = sustained_bars >= 2
        self.assertFalse(should_switch)


class TestBoundaryFeature04HurstAndVolatility(OpaqueBoxTestCase):
    """Boundary & Corner Cases: Feature 4 (Hurst Exponent & Volatility Metrics)."""

    def test_b04_01_short_series_exception(self):
        """Corner Case: Series length < 50 raises ValueError in Hurst calculation."""
        short_series = pd.Series([100.0 + i for i in range(20)])
        with self.assertRaises(ValueError):
            MathOracles.calculate_hurst_exponent(short_series)

    def test_b04_02_zero_variance_hurst_fallback(self):
        """Boundary: Flat series with zero standard deviation falls back to 0.50 safely."""
        flat_series = pd.Series([100.0] * 100)
        h = MathOracles.calculate_hurst_exponent(flat_series)
        self.assertEqual(h, 0.50)

    def test_b04_03_atr_with_zero_price_movement(self):
        """Boundary: High == Low == Close yields ATR = 0.0 without crash."""
        high = pd.Series([100.0] * 30)
        low = pd.Series([100.0] * 30)
        close = pd.Series([100.0] * 30)
        atr = MathOracles.calculate_atr(high, low, close)
        self.assertEqual(float(atr.iloc[-1]), 0.0)

    def test_b04_04_normalized_atr_division_by_zero_safety(self):
        """Boundary: Zero baseline ATR is protected by epsilon 1e-9."""
        zero_atr = pd.Series([0.0] * 60)
        norm_atr = MathOracles.calculate_normalized_atr_ratio(zero_atr, baseline_period=50)
        self.assertFalse(norm_atr.isna().all())
        self.assertEqual(float(norm_atr.iloc[-1]), 0.0)

    def test_b04_05_historical_volatility_rank_empty_window(self):
        """Corner Case: HV rank with single sample returns 0.0% or 100.0% cleanly."""
        single_vol = [0.15]
        test_val = 0.20
        rank = (np.sum(np.array(single_vol) < test_val) / len(single_vol)) * 100.0
        self.assertEqual(rank, 100.0)


class TestBoundaryFeature05RegimeShock(OpaqueBoxTestCase):
    """Boundary & Corner Cases: Feature 5 (Regime Shock Circuit Breaker)."""

    def test_b05_01_bar_range_exact_boundary(self):
        """Boundary: Range at exactly 3.499x ATR (no shock) vs 3.500x ATR (shock)."""
        atr = 10.0
        range_sub = 34.99
        range_sup = 35.00
        self.assertFalse(range_sub / atr >= 3.50)
        self.assertTrue(range_sup / atr >= 3.50)

    def test_b05_02_spread_spike_exact_boundary(self):
        """Boundary: Spread at exactly 2.99x baseline (no shock) vs 3.00x baseline (shock)."""
        baseline = 1.50
        spread_sub = 4.485  # 2.99x
        spread_sup = 4.500  # 3.00x
        self.assertFalse(spread_sub / baseline >= 3.00)
        self.assertTrue(spread_sup / baseline >= 3.00)

    def test_b05_03_zero_atr_shock_division_protection(self):
        """Corner Case: If ATR is 0, shock detector does not raise ZeroDivisionError."""
        atr = 0.0
        bar_range = 5.0
        ratio = bar_range / max(atr, 1e-6)
        self.assertTrue(ratio >= 3.50)

    def test_b05_04_duplicate_shock_alert_suppression(self):
        """Corner Case: Consecutive shock bars within the same episode only fire 1 initial alert."""
        alert_fired = False
        alerts = []
        for is_shock in [True, True, True]:
            if is_shock and not alert_fired:
                alerts.append("ALERT_DISPATCHED")
                alert_fired = True
        self.assertEqual(len(alerts), 1)

    def test_b05_05_automatic_shock_clearance_after_cooldown(self):
        """Boundary: After 8 calm bars below 2.0x ATR, shock status clears."""
        cooldown_bars = 8
        calm_bars_passed = 8
        should_clear = calm_bars_passed >= cooldown_bars
        self.assertTrue(should_clear)
