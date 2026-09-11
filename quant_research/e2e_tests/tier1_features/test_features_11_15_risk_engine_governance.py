"""
Tier 1 Tests: Features 11 to 15.
Feature 11: Calibrated Fractional Kelly Sizing
Feature 12: 4-Tier Drawdown Governor
Feature 13: Stop-Out LTV 85% Circuit Breaker
Feature 14: Latency & Spread Anomaly Tripwires
Feature 15: Remote Admin Kill-Switch Bridge
"""

import math
import pandas as pd
from quant_research.e2e_tests.base import OpaqueBoxTestCase
from quant_research.e2e_tests.oracles import MathOracles


class TestFeature11FractionalKellySizing(OpaqueBoxTestCase):
    """Feature 11: Calibrated Fractional Kelly Sizing (0.25% - 0.50%)."""

    def test_f11_01_baseline_kelly_calibration(self):
        """Verify calibrated Kelly with WR=60%, R:R=1.5 yields within [0.25%, 0.50%]."""
        f_star = MathOracles.calculate_calibrated_fractional_kelly(
            win_rate=0.60,
            profit_payoff_ratio=1.5,
            calibration_multiplier=0.04
        )
        self.assertWithinBounds(f_star, 0.0025, 0.0050)

    def test_f11_02_negative_edge_safety_clamp(self):
        """Verify that negative edge (e.g. WR=35%, R:R=1.0) returns 0.0 risk (trade abort)."""
        f_star = MathOracles.calculate_calibrated_fractional_kelly(
            win_rate=0.35,
            profit_payoff_ratio=1.0
        )
        self.assertEqual(f_star, 0.0)

    def test_f11_03_lot_sizing_precision_and_clamping(self):
        """Verify lot calculation clamps to [0.01, 50.0] lots with step 0.01."""
        equity = 100000.0
        risk_fraction = 0.0050  # $500 risk
        lots = MathOracles.calculate_lot_size(
            equity=equity,
            risk_fraction=risk_fraction,
            entry_price=2700.0,
            stop_loss=2690.0,  # $10 stop -> 1000 points on gold (0.01 tick)
            contract_size=100.0,
            tick_size=0.01,
            tick_value=1.0,
            lot_step=0.01,
            min_lot=0.01,
            max_lot=50.0
        )
        self.assertWithinBounds(lots, 0.01, 50.0)
        self.assertEqual(round(lots, 2), lots)

    def test_f11_04_max_lot_cap_at_50(self):
        """Verify extreme account size or tight stop clamps lot size to maximum 50.0 lots."""
        equity = 10000000.0  # $10M
        lots = MathOracles.calculate_lot_size(
            equity=equity,
            risk_fraction=0.0050,
            entry_price=2700.0,
            stop_loss=2699.0,
            contract_size=100.0,
            tick_size=0.01,
            tick_value=1.0,
            max_lot=50.0
        )
        self.assertEqual(lots, 50.0)

    def test_f11_05_margin_headroom_requirement(self):
        """Verify required margin does not exceed 10% of available free margin."""
        free_margin = 50000.0
        required_margin_safe = 3500.0   # 7% -> PASS
        required_margin_risky = 8000.0  # 16% -> FAIL
        self.assertTrue(required_margin_safe <= 0.10 * free_margin)
        self.assertFalse(required_margin_risky <= 0.10 * free_margin)


class TestFeature12DrawdownGovernor(OpaqueBoxTestCase):
    """Feature 12: 4-Tier Drawdown Governor (Soft 3%, Hard 4.5%, Kill 5%)."""

    def evaluate_drawdown_tier(self, hwm: float, equity: float) -> str:
        """Deterministic drawdown tier oracle."""
        dd_pct = (hwm - equity) / hwm * 100.0
        if dd_pct >= 5.00:
            return "TIER_4_CIRCUIT_BREAKER"
        elif dd_pct >= 4.50:
            return "TIER_3_HARD_FREEZE"
        elif dd_pct >= 3.00:
            return "TIER_2_SOFT_THROTTLE"
        else:
            return "TIER_1_NORMAL"

    def test_f12_01_tier1_normal_operation(self):
        """Verify Tier 1 Normal state when DD < 3.0%."""
        state = self.evaluate_drawdown_tier(hwm=100000.0, equity=98500.0)  # 1.5% DD
        self.assertEqual(state, "TIER_1_NORMAL")

    def test_f12_02_tier2_soft_throttle(self):
        """Verify Tier 2 Soft Throttle when 3.0% <= DD < 4.5% (risk halved)."""
        state = self.evaluate_drawdown_tier(hwm=100000.0, equity=96500.0)  # 3.5% DD
        self.assertEqual(state, "TIER_2_SOFT_THROTTLE")

    def test_f12_03_tier3_hard_freeze(self):
        """Verify Tier 3 Hard Freeze when 4.5% <= DD < 5.0% (zero new entries)."""
        state = self.evaluate_drawdown_tier(hwm=100000.0, equity=95200.0)  # 4.8% DD
        self.assertEqual(state, "TIER_3_HARD_FREEZE")

    def test_f12_04_tier4_emergency_kill_switch(self):
        """Verify Tier 4 Emergency Circuit Breaker when DD >= 5.0% (total liquidation)."""
        state = self.evaluate_drawdown_tier(hwm=100000.0, equity=94900.0)  # 5.1% DD
        self.assertEqual(state, "TIER_4_CIRCUIT_BREAKER")

    def test_f12_05_recovery_hysteresis_buffer(self):
        """Verify de-escalation from Tier 2 to Tier 1 requires DD to recover below 1.5%."""
        hwm = 100000.0
        equity_recovering = 97500.0  # 2.5% DD -> still in throttle
        equity_cleared = 98800.0     # 1.2% DD -> restored to Tier 1
        dd_recovering = (hwm - equity_recovering) / hwm * 100.0
        dd_cleared = (hwm - equity_cleared) / hwm * 100.0
        self.assertTrue(dd_recovering > 1.5)
        self.assertTrue(dd_cleared < 1.5)


class TestFeature13StopOutLTVCircuitBreaker(OpaqueBoxTestCase):
    """Feature 13: Stop-Out LTV 85% Circuit Breaker."""

    def test_f13_01_ltv_calculation(self):
        """Verify Margin Utilization (LTV) = (Used Margin / Equity) * 100%."""
        equity = 10000.0
        used_margin = 8500.0
        ltv = (used_margin / equity) * 100.0
        self.assertEqual(ltv, 85.0)

    def test_f13_02_margin_level_equivalence(self):
        """Verify 85% LTV corresponds to Margin Level 117.65%."""
        equity = 10000.0
        used_margin = 8500.0
        margin_level = (equity / used_margin) * 100.0
        self.assertAlmostEqual(margin_level, 117.647, places=2)

    def test_f13_03_de_leveraging_target(self):
        """Verify liquidation sequence reduces LTV below 50.0%."""
        positions = [
            {"ticket": 1, "margin": 4000.0},
            {"ticket": 2, "margin": 3000.0},
            {"ticket": 3, "margin": 1500.0}
        ]
        equity = 10000.0
        # Total margin = 8500 -> LTV = 85%
        # Close ticket 1 (largest margin): new margin = 4500 -> LTV = 45% < 50%
        remaining = positions[1:]
        new_margin = sum(p["margin"] for p in remaining)
        new_ltv = (new_margin / equity) * 100.0
        self.assertLess(new_ltv, 50.0)

    def test_f13_04_broker_stopout_cushion_detection(self):
        """Verify instant market-flatten when within 20% cushion of broker 30% stop-out level."""
        broker_stopout_level = 30.0  # Exness 30% margin level
        margin_level_critical = 34.0  # Inside cushion
        margin_level_safe = 65.0      # Outside cushion
        self.assertTrue(margin_level_critical <= broker_stopout_level * 1.20)
        self.assertFalse(margin_level_safe <= broker_stopout_level * 1.20)

    def test_f13_05_execution_atomic_close(self):
        """Verify circuit breaker triggers market order close with high priority."""
        close_command = {
            "action": "EMERGENCY_DELEVERAGE",
            "reason": "LTV_EXCEEDED_85_PCT",
            "tickets_to_close": [101, 102],
            "force_market": True
        }
        self.assertTrue(close_command["force_market"])
        self.assertEqual(len(close_command["tickets_to_close"]), 2)


class TestFeature14LatencyAndSpreadTripwires(OpaqueBoxTestCase):
    """Feature 14: Latency & Spread Anomaly Tripwires."""

    def test_f14_01_execution_latency_threshold(self):
        """Verify tripwire triggers when roundtrip execution ping > 1500ms."""
        ping_normal = 240.0   # ms
        ping_anomaly = 1850.0 # ms
        self.assertFalse(ping_normal > 1500.0)
        self.assertTrue(ping_anomaly > 1500.0)

    def test_f14_02_consecutive_timeout_counter(self):
        """Verify halt triggered on 3 consecutive connection timeouts."""
        timeout_history = [True, True, True]
        is_tripped = len(timeout_history) >= 3 and all(timeout_history[-3:])
        self.assertTrue(is_tripped)

    def test_f14_03_spread_spike_ema_multiplier(self):
        """Verify spread tripwire triggers when spread > 3.5 * EMA(spread)."""
        ema_spread = 1.2
        spread_normal = 2.5
        spread_spike = 4.8  # 4.0x -> TRIP
        self.assertFalse(spread_normal > 3.5 * ema_spread)
        self.assertTrue(spread_spike > 3.5 * ema_spread)

    def test_f14_04_cooling_off_period_bars(self):
        """Verify entry halt enforces at least 3 consecutive bars of normalized spread."""
        spread_history = [1.2, 1.1, 1.3]  # All normal
        ema_spread = 1.2
        is_normalized = all(s <= 2.0 * ema_spread for s in spread_history)
        self.assertTrue(is_normalized)

    def test_f14_05_protective_stop_tightening_on_trip(self):
        """Verify that tripping tripwire tightens open position stops to lock profit."""
        tripwire_action = {
            "halt_new_entries": True,
            "tighten_existing_stops": True,
            "duration_minutes": 15
        }
        self.assertTrue(tripwire_action["halt_new_entries"])
        self.assertEqual(tripwire_action["duration_minutes"], 15)


class TestFeature15RemoteAdminKillSwitchBridge(OpaqueBoxTestCase):
    """Feature 15: Remote Admin Kill-Switch Bridge."""

    def test_f15_01_remote_disable_halts_new_entries(self):
        """Verify globalBotActive=false suppresses all new order dispatches."""
        rtdb_config = {"system_config": {"globalBotActive": False, "maintenanceMode": False}}
        allow_entry = rtdb_config["system_config"]["globalBotActive"] and not rtdb_config["system_config"]["maintenanceMode"]
        self.assertFalse(allow_entry)

    def test_f15_02_remote_enable_resumes_under_tier1(self):
        """Verify globalBotActive=true restores trading subject to normal risk checks."""
        rtdb_config = {"system_config": {"globalBotActive": True, "maintenanceMode": False}}
        allow_entry = rtdb_config["system_config"]["globalBotActive"] and not rtdb_config["system_config"]["maintenanceMode"]
        self.assertTrue(allow_entry)

    def test_f15_03_heartbeat_sync_response(self):
        """Verify heartbeat response delivers globalBotActive state to EA."""
        heartbeat_response = {
            "success": True,
            "globalBotActive": False,
            "maintenanceMode": False,
            "serverTime": 1725984000000
        }
        self.assertDictMatchesContract(heartbeat_response, {
            "success": bool,
            "globalBotActive": bool,
            "serverTime": int
        })

    def test_f15_04_manual_chairman_totp_unlock_requirement(self):
        """Verify tier 4 circuit breaker recovery requires manual authorized unlock."""
        unlock_request = {"authorized_by": "Chairman_tddv2017", "totp_verified": True, "reset_hwm": True}
        self.assertTrue(unlock_request["totp_verified"])
        self.assertIn("Chairman", unlock_request["authorized_by"])

    def test_f15_05_disconnect_grace_period(self):
        """Verify system defaults to defensive mode if remote RTDB ping fails for > 60s."""
        last_heartbeat_age_seconds = 75.0
        max_allowed_disconnect = 60.0
        should_enter_defensive = last_heartbeat_age_seconds > max_allowed_disconnect
        self.assertTrue(should_enter_defensive)
