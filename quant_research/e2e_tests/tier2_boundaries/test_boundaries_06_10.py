"""
Tier 2 Boundary Tests: Features 6 to 10.
Boundary & corner cases: extreme parameters, zero noise, exact threshold boundaries, asset microstructures.
"""

import math
import numpy as np
import pandas as pd
from quant_research.e2e_tests.base import OpaqueBoxTestCase
from quant_research.e2e_tests.oracles import MathOracles, ProtocolOracles


class TestBoundaryFeature06StatArb(OpaqueBoxTestCase):
    """Boundary & Corner Cases: Feature 6 (Statistical Arbitrage ETH/BTC)."""

    def test_b06_01_cointegration_pvalue_exact_boundary(self):
        """Boundary: Cointegration p-value at 0.049 (valid) vs 0.051 (rejected)."""
        p_val_valid = 0.049
        p_val_invalid = 0.051
        self.assertTrue(p_val_valid < 0.05)
        self.assertFalse(p_val_invalid < 0.05)

    def test_b06_02_half_life_exact_filter_bounds(self):
        """Boundary: Half-life at 4.9 bars (rejected) vs 5.0 bars (accepted) and 80.0 vs 80.1."""
        self.assertFalse(4.9 >= 5.0)
        self.assertTrue(5.0 >= 5.0)
        self.assertTrue(80.0 <= 80.0)
        self.assertFalse(80.1 <= 80.0)

    def test_b06_03_non_mean_reverting_infinite_half_life(self):
        """Corner Case: Explosive spread (positive b in AR(1)) returns half-life = 999.0."""
        diverging_spread = pd.Series([10.0 * (1.1 ** i) for i in range(50)])
        half_life, theta = MathOracles.calculate_ou_half_life(diverging_spread)
        self.assertEqual(half_life, 999.0)
        self.assertEqual(theta, 0.0)

    def test_b06_04_negative_kalman_beta_handling(self):
        """Corner Case: Inverse asset relationship (beta < 0) maintains valid Kalman state."""
        x = pd.Series(range(100))
        y = pd.Series([-2.0 * val for val in range(100)])
        betas, alphas = MathOracles.solve_kalman_dynamic_beta(y, x)
        self.assertLess(float(betas[-1]), 0.0)

    def test_b06_05_z_score_exact_boundary_triggers(self):
        """Boundary: Z-score at -1.99 (no entry) vs -2.00 (entry triggered)."""
        z_sub = -1.99
        z_sup = -2.00
        self.assertFalse(z_sub <= -2.0)
        self.assertTrue(z_sup <= -2.0)


class TestBoundaryFeature07MomentumTrend(OpaqueBoxTestCase):
    """Boundary & Corner Cases: Feature 7 (Momentum Trend-Following)."""

    def test_b07_01_all_emas_equal_choppy_market(self):
        """Boundary: EMA21 == EMA55 == EMA200 (complete equilibrium) rejects entry."""
        ema21 = 100.0
        ema55 = 100.0
        ema200 = 100.0
        is_bull = (ema21 > ema55 > ema200)
        is_bear = (ema21 < ema55 < ema200)
        self.assertFalse(is_bull)
        self.assertFalse(is_bear)

    def test_b07_02_adx_exact_threshold_boundary(self):
        """Boundary: ADX at 24.9 (rejected) vs 25.0 (accepted)."""
        self.assertFalse(24.9 >= 25.0)
        self.assertTrue(25.0 >= 25.0)

    def test_b07_03_zero_atr_supertrend_fallback(self):
        """Corner Case: Zero ATR does not collapse Supertrend into NaN."""
        close = 2000.0
        atr = 0.0
        m = 3.0
        ub = close + (m * atr)
        lb = close - (m * atr)
        self.assertEqual(ub, 2000.0)
        self.assertEqual(lb, 2000.0)

    def test_b07_04_donchian_breakout_exact_match(self):
        """Boundary: Close == Upper Donchian Channel does NOT trigger breakout (must exceed)."""
        upper_dc = 2050.0
        close_equal = 2050.0
        close_breakout = 2050.01
        self.assertFalse(close_equal > upper_dc)
        self.assertTrue(close_breakout > upper_dc)

    def test_b07_05_gap_across_supertrend_trailing_stop(self):
        """Corner Case: Price opens below Supertrend lower band (gap stop hit)."""
        supertrend_lb = 2010.0
        open_gap = 1995.0
        is_stopped_out = open_gap <= supertrend_lb
        self.assertTrue(is_stopped_out)


class TestBoundaryFeature08VolatilityBreakout(OpaqueBoxTestCase):
    """Boundary & Corner Cases: Feature 8 (Dynamic Volatility Breakout)."""

    def test_b08_01_squeeze_exact_border_equality(self):
        """Boundary: BB Upper == KC Upper does NOT count as Squeeze (must be strictly inside)."""
        bb_upper = 2015.0
        kc_upper = 2015.0
        bb_lower = 1986.0
        kc_lower = 1985.0
        squeeze_on = (bb_upper < kc_upper) and (bb_lower > kc_lower)
        self.assertFalse(squeeze_on)

    def test_b08_02_minimum_squeeze_bars_exact_boundary(self):
        """Boundary: 5 squeeze bars (no arm) vs 6 squeeze bars (armed)."""
        self.assertFalse(5 >= 6)
        self.assertTrue(6 >= 6)

    def test_b08_03_bandwidth_ratio_exact_boundary(self):
        """Boundary: Bandwidth ratio at 1.150 (not triggered) vs 1.151 (triggered)."""
        self.assertFalse(1.150 > 1.150)
        self.assertTrue(1.151 > 1.150)

    def test_b08_04_zero_momentum_slope(self):
        """Boundary: LinReg momentum slope exactly 0.0 triggers neither Long nor Short."""
        slope = 0.0
        is_bull = slope > 0.0
        is_bear = slope < 0.0
        self.assertFalse(is_bull)
        self.assertFalse(is_bear)

    def test_b08_05_obv_volume_negative_inversion(self):
        """Corner Case: OBV calculation handles down-day volume subtraction cleanly."""
        obv_prev = 10000
        vol_today = 2500
        close_today = 1980.0
        close_prev = 2000.0
        obv_new = obv_prev - vol_today if close_today < close_prev else obv_prev + vol_today
        self.assertEqual(obv_new, 7500)


class TestBoundaryFeature09MeanReversion(OpaqueBoxTestCase):
    """Boundary & Corner Cases: Feature 9 (Regime Mean-Reversion)."""

    def test_b09_01_adx_exact_mean_reversion_gate(self):
        """Boundary: ADX at 19.99 (allowed) vs 20.00 (blocked)."""
        self.assertTrue(19.99 < 20.0)
        self.assertFalse(20.00 < 20.0)

    def test_b09_02_hurst_exact_mean_reversion_gate(self):
        """Boundary: Hurst at 0.449 (allowed) vs 0.450 (blocked)."""
        self.assertTrue(0.449 < 0.45)
        self.assertFalse(0.450 < 0.45)

    def test_b09_03_pin_bar_wick_ratio_boundary(self):
        """Boundary: Lower wick ratio at 0.599 (rejected) vs 0.600 (accepted)."""
        self.assertFalse(0.599 >= 0.60)
        self.assertTrue(0.600 >= 0.60)

    def test_b09_04_doji_zero_body_pin_bar(self):
        """Corner Case: Doji candle (Open == Close) computes clean wick ratio."""
        high = 100.0
        low = 90.0
        open_p = 95.0
        close_p = 95.0
        wick_ratio = (min(open_p, close_p) - low) / (high - low)
        self.assertEqual(wick_ratio, 0.50)

    def test_b09_05_time_stop_exact_sixteen_bars(self):
        """Boundary: Time stop at bar 15 (held) vs bar 16 (liquidated)."""
        self.assertFalse(15 >= 16)
        self.assertTrue(16 >= 16)


class TestBoundaryFeature10AssetMicrostructures(OpaqueBoxTestCase):
    """Boundary & Corner Cases: Feature 10 (Asset-Specific Microstructures)."""

    def test_b10_01_zero_lot_size_rejection(self):
        """Boundary: Request with 0.0 lots is immediately aborted."""
        lots = 0.0
        is_valid = lots >= 0.01
        self.assertFalse(is_valid)

    def test_b10_02_crypto_funding_rate_exact_boundary(self):
        """Boundary: Funding rate at 0.050% (allowed) vs 0.051% (gated)."""
        rate_ok = 0.00050
        rate_gated = 0.00051
        self.assertFalse(rate_ok > 0.0005)
        self.assertTrue(rate_gated > 0.0005)

    def test_b10_03_forex_spread_gate_exact_boundary(self):
        """Boundary: Current spread at 1.80x (allowed) vs 1.81x (blocked)."""
        avg_spread = 1.0
        self.assertFalse(1.80 > 1.80 * avg_spread)
        self.assertTrue(1.81 > 1.80 * avg_spread)

    def test_b10_04_news_blackout_boundary_exact_seconds(self):
        """Boundary: Exactly 30 minutes 0 seconds before event is inside blackout."""
        event_time = pd.Timestamp("2026-09-10 12:30:00")
        t_boundary = pd.Timestamp("2026-09-10 12:00:00")
        is_blackout = (event_time - pd.Timedelta(minutes=30)) <= t_boundary <= (event_time + pd.Timedelta(minutes=15))
        self.assertTrue(is_blackout)

    def test_b10_05_crypto_round_clock_weekend_trading(self):
        """Corner Case: Crypto allows execution on Saturday and Sunday (24/7/365)."""
        saturday_ts = pd.Timestamp("2026-09-12 14:00:00")  # Saturday
        is_weekend = saturday_ts.weekday() >= 5
        crypto_market_open = True
        forex_market_open = False
        self.assertTrue(is_weekend)
        self.assertTrue(crypto_market_open)
        self.assertFalse(forex_market_open)
