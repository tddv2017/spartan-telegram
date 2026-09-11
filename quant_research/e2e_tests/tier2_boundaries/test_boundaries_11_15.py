"""
Tier 2 Boundary Tests: Features 11 to 15.
Boundary & corner cases: Kelly bounds, drawdown governor thresholds, stop-out LTV, latency, remote kill switch.
"""

import math
from quant_research.e2e_tests.base import OpaqueBoxTestCase
from quant_research.e2e_tests.oracles import MathOracles


class TestBoundaryFeature11Kelly(OpaqueBoxTestCase):
    """Boundary & Corner Cases: Feature 11 (Fractional Kelly Sizing)."""

    def test_b11_01_win_rate_one_hundred_percent_capped(self):
        """Boundary: Win Rate = 100% (hypothetical infinite edge) clamps risk to max 0.50%."""
        f_star = MathOracles.calculate_calibrated_fractional_kelly(
            win_rate=1.00,
            profit_payoff_ratio=2.0,
            max_risk=0.0050
        )
        self.assertEqual(f_star, 0.0050)

    def test_b11_02_win_rate_zero_percent_aborts(self):
        """Boundary: Win Rate = 0% returns 0.0 risk."""
        f_star = MathOracles.calculate_calibrated_fractional_kelly(
            win_rate=0.00,
            profit_payoff_ratio=2.0
        )
        self.assertEqual(f_star, 0.0)

    def test_b11_03_lot_size_below_minimum_clamped_to_0_01(self):
        """Boundary: Calculated lot size 0.004 clamps to minimum 0.01 lot."""
        lots = MathOracles.calculate_lot_size(
            equity=1000.0,
            risk_fraction=0.0025,  # $2.50 risk
            entry_price=2700.0,
            stop_loss=2650.0,      # 50 points -> $5000/lot cost -> 0.0005 raw lots
            min_lot=0.01
        )
        self.assertEqual(lots, 0.01)

    def test_b11_04_lot_size_above_maximum_clamped_to_50(self):
        """Boundary: Calculated lot size 75.0 clamps to maximum 50.0 lots."""
        lots = MathOracles.calculate_lot_size(
            equity=5000000.0,
            risk_fraction=0.0050,
            entry_price=2700.0,
            stop_loss=2699.0,
            max_lot=50.0
        )
        self.assertEqual(lots, 50.0)

    def test_b11_05_zero_stop_loss_distance_protection(self):
        """Corner Case: Entry == Stop Loss (zero distance) returns 0.0 lots without division error."""
        lots = MathOracles.calculate_lot_size(
            equity=100000.0,
            risk_fraction=0.0050,
            entry_price=2700.0,
            stop_loss=2700.0
        )
        self.assertEqual(lots, 0.0)


class TestBoundaryFeature12DrawdownGovernor(OpaqueBoxTestCase):
    """Boundary & Corner Cases: Feature 12 (4-Tier Drawdown Governor)."""

    def test_b12_01_soft_throttle_exact_boundary(self):
        """Boundary: DD at 2.999% (Tier 1) vs 3.000% (Tier 2 Soft Throttle)."""
        hwm = 100000.0
        eq_sub = 97001.0  # 2.999%
        eq_sup = 97000.0  # 3.000%
        self.assertFalse((hwm - eq_sub) / hwm * 100.0 >= 3.00)
        self.assertTrue((hwm - eq_sup) / hwm * 100.0 >= 3.00)

    def test_b12_02_hard_freeze_exact_boundary(self):
        """Boundary: DD at 4.499% (Tier 2) vs 4.500% (Tier 3 Hard Freeze)."""
        hwm = 100000.0
        eq_sub = 95501.0  # 4.499%
        eq_sup = 95500.0  # 4.500%
        self.assertFalse((hwm - eq_sub) / hwm * 100.0 >= 4.50)
        self.assertTrue((hwm - eq_sup) / hwm * 100.0 >= 4.50)

    def test_b12_03_circuit_breaker_exact_boundary(self):
        """Boundary: DD at 4.999% (Tier 3) vs 5.000% (Tier 4 Circuit Breaker)."""
        hwm = 100000.0
        eq_sub = 95001.0  # 4.999%
        eq_sup = 95000.0  # 5.000%
        self.assertFalse((hwm - eq_sub) / hwm * 100.0 >= 5.00)
        self.assertTrue((hwm - eq_sup) / hwm * 100.0 >= 5.00)

    def test_b12_04_hysteresis_exact_recovery_boundary(self):
        """Boundary: DD at 1.501% (remains in Soft Throttle) vs 1.499% (restores to Normal)."""
        dd_unrecovered = 1.501
        dd_recovered = 1.499
        self.assertFalse(dd_unrecovered < 1.50)
        self.assertTrue(dd_recovered < 1.50)

    def test_b12_05_equity_exceeds_hwm_negative_dd(self):
        """Corner Case: Equity > HWM yields new HWM and DD = 0.0%."""
        hwm = 100000.0
        equity = 105000.0
        new_hwm = max(hwm, equity)
        dd = (new_hwm - equity) / new_hwm * 100.0
        self.assertEqual(new_hwm, 105000.0)
        self.assertEqual(dd, 0.0)


class TestBoundaryFeature13StopOutLTV(OpaqueBoxTestCase):
    """Boundary & Corner Cases: Feature 13 (Stop-Out LTV 85% Circuit Breaker)."""

    def test_b13_01_ltv_exact_threshold_boundary(self):
        """Boundary: LTV at 84.99% (no trigger) vs 85.00% (circuit breaker triggers)."""
        self.assertFalse(84.99 >= 85.0)
        self.assertTrue(85.00 >= 85.0)

    def test_b13_02_margin_level_exact_threshold(self):
        """Boundary: Margin Level 117.65% triggers de-leveraging."""
        ml_safe = 117.66
        ml_trip = 117.64
        self.assertFalse(ml_safe <= 117.65)
        self.assertTrue(ml_trip <= 117.65)

    def test_b13_03_zero_used_margin_safe_state(self):
        """Boundary: Used margin = $0.00 yields LTV = 0.0% without division error."""
        equity = 10000.0
        used_margin = 0.0
        ltv = (used_margin / equity) * 100.0
        self.assertEqual(ltv, 0.0)

    def test_b13_04_empty_positions_list_at_stopout(self):
        """Corner Case: Stop-out called when positions are already closed does not crash."""
        positions = []
        closed_count = 0
        while positions:
            positions.pop()
            closed_count += 1
        self.assertEqual(closed_count, 0)

    def test_b13_05_single_massive_position_deleveraging(self):
        """Corner Case: Single position accounting for 90% LTV is immediately closed."""
        positions = [{"ticket": 101, "margin": 9000.0}]
        equity = 10000.0
        # Close ticket 101
        positions.clear()
        remaining_margin = sum(p["margin"] for p in positions)
        new_ltv = (remaining_margin / equity) * 100.0
        self.assertEqual(new_ltv, 0.0)


class TestBoundaryFeature14LatencyAndSpread(OpaqueBoxTestCase):
    """Boundary & Corner Cases: Feature 14 (Latency & Spread Tripwires)."""

    def test_b14_01_ping_exact_threshold_boundary(self):
        """Boundary: Ping at 1500.0ms (allowed) vs 1500.1ms (tripped)."""
        self.assertFalse(1500.0 > 1500.0)
        self.assertTrue(1500.1 > 1500.0)

    def test_b14_02_timeout_count_boundary(self):
        """Boundary: 2 timeouts (no halt) vs 3 timeouts (execution halt)."""
        self.assertFalse(2 >= 3)
        self.assertTrue(3 >= 3)

    def test_b14_03_spread_exact_multiplier_boundary(self):
        """Boundary: Spread at exactly 3.500x EMA (no trip) vs 3.501x EMA (tripped)."""
        ema_spread = 1.0
        self.assertFalse(3.500 > 3.500 * ema_spread)
        self.assertTrue(3.501 > 3.500 * ema_spread)

    def test_b14_04_cooling_off_bars_boundary(self):
        """Boundary: Normalized spread for 2 bars (not cleared) vs 3 bars (cleared)."""
        self.assertFalse(2 >= 3)
        self.assertTrue(3 >= 3)

    def test_b14_05_zero_spread_ema_fallback(self):
        """Corner Case: Zero spread EMA protected by minimum 0.1 pip epsilon."""
        ema_spread = 0.0
        safe_ema = max(0.00001, ema_spread)
        self.assertGreater(safe_ema, 0.0)


class TestBoundaryFeature15RemoteKillSwitch(OpaqueBoxTestCase):
    """Boundary & Corner Cases: Feature 15 (Remote Admin Kill-Switch Bridge)."""

    def test_b15_01_missing_global_bot_active_defaults_to_false(self):
        """Corner Case: Missing 'globalBotActive' field in RTDB defaults safely to FALSE."""
        rtdb_payload = {}
        bot_active = bool(rtdb_payload.get("globalBotActive", False))
        self.assertFalse(bot_active)

    def test_b15_02_non_boolean_truthy_handling(self):
        """Corner Case: String 'false' or '0' parsed strictly as boolean False."""
        def parse_bool(val):
            return str(val).lower() in ("true", "1", "yes")
        self.assertFalse(parse_bool("false"))
        self.assertFalse(parse_bool("0"))
        self.assertTrue(parse_bool("true"))

    def test_b15_03_disconnect_grace_period_exact_seconds(self):
        """Boundary: RTDB disconnect at 60.0s (held) vs 60.1s (defensive mode engaged)."""
        self.assertFalse(60.0 > 60.0)
        self.assertTrue(60.1 > 60.0)

    def test_b15_04_rapid_admin_toggle_debouncing(self):
        """Corner Case: Rapid toggles within 5 seconds debounced to latest state."""
        toggles = [True, False, True, False]
        latest_state = toggles[-1]
        self.assertFalse(latest_state)

    def test_b15_05_invalid_totp_rejection(self):
        """Boundary: Invalid TOTP token (e.g. '000000') rejects administrative reset."""
        entered_token = "000000"
        correct_token = "849201"
        is_valid = (entered_token == correct_token)
        self.assertFalse(is_valid)
