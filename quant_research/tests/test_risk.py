"""Spartan Quantitative Trading System - Multi-Tier Risk Management Engine Unit Tests.

Covers:
    - Feature 11: Calibrated Fractional Kelly Sizing, Lot Clamping & Margin Headroom
    - Feature 12: 4-Tier Drawdown Governor, Hysteresis Recovery & Chairman TOTP Unlock
    - Feature 13: Stop-Out LTV 85% Circuit Breaker & Graceful Emergency De-leveraging
    - Feature 14: Latency & Spread Anomaly Tripwires
    - Feature 15: Remote Admin Kill-Switch Bridge & Heartbeat Telemetry
    - IRiskEngine Interface Contract & SpartanRiskEngine Unified Pipeline
"""

import time
import unittest
from typing import Any, Dict, List

from quant_research.core.constants import DrawdownTier
from quant_research.core.types import CircuitBreakerStatus, OrderDict, SignalDict
from quant_research.risk.circuit_breaker import (
    CircuitBreakerSuite,
    LatencyTripwire,
    RemoteKillSwitchBridge,
    SpreadTripwire,
    StopOutCircuitBreaker,
)
from quant_research.risk.drawdown_governor import DrawdownGovernor, DrawdownState
from quant_research.risk.kelly_calculator import KellyCalculator
from quant_research.risk.risk_manager import SpartanRiskEngine


class TestKellyCalculator(unittest.TestCase):
    """Unit tests for Feature 11: Calibrated Fractional Kelly Sizing."""

    def setUp(self) -> None:
        self.calc = KellyCalculator(
            scaling_factor=0.0125,
            min_risk_per_trade=0.0025,
            max_risk_per_trade=0.0050,
            max_margin_per_trade_pct=0.10,
        )

    def test_baseline_kelly_calibration(self) -> None:
        """Verify calibrated fractional Kelly with WR=60%, R:R=1.5 yields [0.25%, 0.50%]."""
        # Raw Kelly = (0.60 * 1.5 - 0.40) / 1.5 = 0.50 / 1.5 = 0.333333
        # 1/25th Kelly = 0.0125 * 0.333333 = 0.004167 (0.417%)
        f_star = self.calc.calculate_fractional_kelly(win_rate=0.60, profit_payoff_ratio=1.5)
        self.assertGreaterEqual(f_star, 0.0025)
        self.assertLessEqual(f_star, 0.0050)
        self.assertAlmostEqual(f_star, 0.004167, places=5)

    def test_negative_edge_safety_clamp(self) -> None:
        """Verify negative edge (WR=35%, R:R=1.0) returns 0.0 risk (trade abort)."""
        # Raw Kelly = (0.35 * 1.0 - 0.65) / 1.0 = -0.30 <= 0 -> 0.0
        f_star = self.calc.calculate_fractional_kelly(win_rate=0.35, profit_payoff_ratio=1.0)
        self.assertEqual(f_star, 0.0)

    def test_zero_win_rate_and_zero_payoff(self) -> None:
        """Verify 0% win rate or zero payoff ratio aborts with 0.0 risk."""
        self.assertEqual(self.calc.calculate_fractional_kelly(win_rate=0.0, profit_payoff_ratio=2.0), 0.0)
        self.assertEqual(self.calc.calculate_fractional_kelly(win_rate=0.60, profit_payoff_ratio=0.0), 0.0)
        self.assertEqual(self.calc.calculate_fractional_kelly(win_rate=0.60, profit_payoff_ratio=-1.0), 0.0)

    def test_infinite_edge_upper_bound_clamping(self) -> None:
        """Verify 100% win rate clamps to max risk 0.50% (0.0050)."""
        f_star = self.calc.calculate_fractional_kelly(
            win_rate=1.0,
            profit_payoff_ratio=2.0,
            calibration_factor=0.04,
        )
        self.assertEqual(f_star, 0.0050)

    def test_slight_edge_lower_bound_clamping(self) -> None:
        """Verify marginal edge (calibrated < 0.25%) clamps to minimum 0.25% (0.0025)."""
        # Edge = 0.51 * 1.0 - 0.49 = 0.02 -> 0.02 * 0.0125 = 0.00025 -> clamped to 0.0025
        f_star = self.calc.calculate_fractional_kelly(win_rate=0.51, profit_payoff_ratio=1.0)
        self.assertEqual(f_star, 0.0025)

    def test_lot_sizing_gold_precision_and_clamping(self) -> None:
        """Verify lot calculation clamps to [0.01, 50.0] on Gold."""
        equity = 100000.0
        risk_fraction = 0.0050  # $500 risk
        entry_price = 2700.0
        stop_loss = 2690.0  # $10 stop -> 1000 ticks of 0.01 -> $1000 per lot
        lots = self.calc.calculate_lot_size(
            equity=equity,
            risk_fraction=risk_fraction,
            entry_price=entry_price,
            stop_loss=stop_loss,
            symbol="XAUUSD",
            contract_size=100.0,
            tick_size=0.01,
            tick_value=1.0,
            lot_step=0.01,
            min_lot=0.01,
            max_lot=50.0,
        )
        # Expected: $500 / $1000 = 0.50 lots
        self.assertEqual(lots, 0.50)
        self.assertGreaterEqual(lots, 0.01)
        self.assertLessEqual(lots, 50.0)

    def test_lot_size_clamped_to_min_lot(self) -> None:
        """Verify small account risk clamps up to minimum 0.01 lot."""
        lots = self.calc.calculate_lot_size(
            equity=1000.0,
            risk_fraction=0.0025,  # $2.50 risk
            entry_price=2700.0,
            stop_loss=2650.0,  # $50 move -> $5000 cost/lot -> raw 0.0005
            min_lot=0.01,
        )
        self.assertEqual(lots, 0.01)

    def test_lot_size_clamped_to_max_lot_cap(self) -> None:
        """Verify large account or tight stop clamps to maximum 50.0 lots."""
        lots = self.calc.calculate_lot_size(
            equity=10000000.0,  # $10M equity
            risk_fraction=0.0050,  # $50,000 risk
            entry_price=2700.0,
            stop_loss=2699.0,  # $1 move -> $100 cost/lot -> raw 500 lots
            max_lot=50.0,
        )
        self.assertEqual(lots, 50.0)

    def test_zero_stop_loss_distance_protection(self) -> None:
        """Verify entry == SL returns 0.0 lots without ZeroDivisionError."""
        lots = self.calc.calculate_lot_size(
            equity=100000.0,
            risk_fraction=0.0050,
            entry_price=2700.0,
            stop_loss=2700.0,
        )
        self.assertEqual(lots, 0.0)

    def test_lot_sizing_multi_asset_microstructure(self) -> None:
        """Verify lot calculation works for BTC, ETH, EURUSD, GBPUSD."""
        # BTCUSDT: tick_size=0.10, tick_value=0.10, contract_size=1.0, min_lot=0.001
        btc_lots = self.calc.calculate_lot_size(
            equity=100000.0,
            risk_fraction=0.0040,  # $400 risk
            entry_price=60000.0,
            stop_loss=58000.0,  # $2000 move -> cost per lot = 2000 * (0.10/0.10) = $2000
            symbol="BTCUSDT",
        )
        # Expected: $400 / $2000 = 0.200 lots
        self.assertAlmostEqual(btc_lots, 0.20, places=2)

        # EURUSD: tick_size=0.00001, tick_value=1.0, contract_size=100000
        eur_lots = self.calc.calculate_lot_size(
            equity=100000.0,
            risk_fraction=0.0030,  # $300 risk
            entry_price=1.10000,
            stop_loss=1.09700,  # 30 pips = 0.00300 -> 300 ticks -> $300/lot
            symbol="EURUSD",
        )
        # Expected: $300 / $300 = 1.00 lot
        self.assertAlmostEqual(eur_lots, 1.00, places=2)

    def test_margin_headroom_requirement(self) -> None:
        """Verify required margin <= 10% of free margin passes, > 10% fails."""
        free_margin = 50000.0
        self.assertTrue(self.calc.check_margin_headroom(required_margin=3500.0, free_margin=free_margin))
        self.assertFalse(self.calc.check_margin_headroom(required_margin=8000.0, free_margin=free_margin))

    def test_evaluate_position_sizing_complete_pipeline(self) -> None:
        """Verify end-to-end position sizing evaluation."""
        res_approved = self.calc.evaluate_position_sizing(
            symbol="XAUUSD",
            equity=100000.0,
            free_margin=90000.0,
            entry_price=2700.0,
            stop_loss=2690.0,
            win_rate=0.60,
            payoff_ratio=1.5,
            risk_multiplier=1.0,
        )
        self.assertTrue(res_approved["approved"])
        self.assertGreater(res_approved["lots"], 0.0)
        self.assertEqual(res_approved["reason"], "APPROVED")

        # Insufficient free margin -> fails headroom
        res_margin_fail = self.calc.evaluate_position_sizing(
            symbol="XAUUSD",
            equity=100000.0,
            free_margin=500.0,  # Tiny free margin
            entry_price=2700.0,
            stop_loss=2690.0,
            win_rate=0.60,
            payoff_ratio=1.5,
        )
        self.assertFalse(res_margin_fail["approved"])
        self.assertEqual(res_margin_fail["reason"], "MARGIN_HEADROOM_EXCEEDED")


class TestDrawdownGovernor(unittest.TestCase):
    """Unit tests for Feature 12: 4-Tier Drawdown Governor."""

    def setUp(self) -> None:
        self.gov = DrawdownGovernor(
            initial_equity=100000.0,
            soft_throttle_dd_pct=3.0,
            hard_freeze_dd_pct=4.5,
            circuit_breaker_dd_pct=5.0,
            hysteresis_recovery_dd_pct=1.5,
        )

    def test_tier1_normal_operation(self) -> None:
        """Verify Tier 1 Normal when DD < 3.0%."""
        state = self.gov.update_equity(98500.0)  # 1.5% DD
        self.assertEqual(state.tier, DrawdownTier.TIER_1_NORMAL)
        self.assertEqual(state.risk_multiplier, 1.0)
        self.assertTrue(state.allow_new_trades)
        self.assertFalse(state.lock_breakeven)
        self.assertFalse(state.emergency_flatten)

    def test_tier2_soft_throttle(self) -> None:
        """Verify Tier 2 Soft Throttle when 3.0% <= DD < 4.5% (risk halved)."""
        state = self.gov.update_equity(96500.0)  # 3.5% DD
        self.assertEqual(state.tier, DrawdownTier.TIER_2_SOFT_THROTTLE)
        self.assertEqual(state.risk_multiplier, 0.5)
        self.assertTrue(state.allow_new_trades)
        self.assertEqual(state.tighten_stops_pct, 0.30)
        self.assertFalse(state.emergency_flatten)

    def test_tier3_hard_freeze(self) -> None:
        """Verify Tier 3 Hard Freeze when 4.5% <= DD < 5.0% (zero new entries)."""
        state = self.gov.update_equity(95200.0)  # 4.8% DD
        self.assertEqual(state.tier, DrawdownTier.TIER_3_HARD_FREEZE)
        self.assertEqual(state.risk_multiplier, 0.0)
        self.assertFalse(state.allow_new_trades)
        self.assertTrue(state.lock_breakeven)
        self.assertFalse(state.emergency_flatten)

    def test_tier4_emergency_circuit_breaker(self) -> None:
        """Verify Tier 4 Emergency Circuit Breaker when DD >= 5.0%."""
        state = self.gov.update_equity(94900.0)  # 5.1% DD
        self.assertEqual(state.tier, DrawdownTier.TIER_4_CIRCUIT_BREAKER)
        self.assertEqual(state.risk_multiplier, 0.0)
        self.assertFalse(state.allow_new_trades)
        self.assertTrue(state.emergency_flatten)
        self.assertTrue(self.gov.is_circuit_breaker_tripped)

    def test_hwm_upward_ratchet(self) -> None:
        """Verify equity exceeding HWM establishes new peak and resets DD to 0.0%."""
        state = self.gov.update_equity(105000.0)
        self.assertEqual(self.gov.high_water_mark, 105000.0)
        self.assertEqual(state.drawdown_pct, 0.0)
        self.assertEqual(state.tier, DrawdownTier.TIER_1_NORMAL)

    def test_recovery_hysteresis_buffer(self) -> None:
        """Verify de-escalation from Tier 2 to Tier 1 requires DD < 1.5%."""
        # 1. Drop into Tier 2 Soft Throttle (3.5% DD)
        self.gov.update_equity(96500.0)
        self.assertEqual(self.gov.current_tier, DrawdownTier.TIER_2_SOFT_THROTTLE)

        # 2. Equity recovers to 97500 (2.5% DD) -> DD < 3.0% but DD >= 1.5% -> STILL Tier 2!
        state_hysteresis = self.gov.update_equity(97500.0)
        self.assertEqual(state_hysteresis.tier, DrawdownTier.TIER_2_SOFT_THROTTLE)
        self.assertEqual(state_hysteresis.risk_multiplier, 0.5)

        # 3. Equity recovers to 98800 (1.2% DD) -> DD < 1.5% -> Restored to Tier 1 Normal!
        state_cleared = self.gov.update_equity(98800.0)
        self.assertEqual(state_cleared.tier, DrawdownTier.TIER_1_NORMAL)
        self.assertEqual(state_cleared.risk_multiplier, 1.0)

    def test_hysteresis_recovery_from_tier_3(self) -> None:
        """Verify step-down recovery from Tier 3 to Tier 2, then Tier 1."""
        # 1. Breach Tier 3 Hard Freeze (4.8% DD)
        self.gov.update_equity(95200.0)
        self.assertEqual(self.gov.current_tier, DrawdownTier.TIER_3_HARD_FREEZE)

        # 2. Recover to 3.5% DD -> De-escalates to Tier 2 Soft Throttle
        state_t2 = self.gov.update_equity(96500.0)
        self.assertEqual(state_t2.tier, DrawdownTier.TIER_2_SOFT_THROTTLE)

        # 3. Recover to 2.0% DD -> Remains in Tier 2
        state_t2_buff = self.gov.update_equity(98000.0)
        self.assertEqual(state_t2_buff.tier, DrawdownTier.TIER_2_SOFT_THROTTLE)

        # 4. Recover to 1.0% DD -> Restores to Tier 1
        state_t1 = self.gov.update_equity(99000.0)
        self.assertEqual(state_t1.tier, DrawdownTier.TIER_1_NORMAL)

    def test_tier4_locked_until_chairman_totp_unlock(self) -> None:
        """Verify Tier 4 remains locked until manual Chairman cryptographic unlock."""
        # 1. Breach Tier 4 (5.5% DD)
        self.gov.update_equity(94500.0)
        self.assertEqual(self.gov.current_tier, DrawdownTier.TIER_4_CIRCUIT_BREAKER)

        # 2. Equity improves back to 99000 (1.0% DD) -> STILL locked in Tier 4!
        state_locked = self.gov.update_equity(99000.0)
        self.assertEqual(state_locked.tier, DrawdownTier.TIER_4_CIRCUIT_BREAKER)
        self.assertTrue(self.gov.is_circuit_breaker_tripped)

        # 3. Unauthorized unlock attempts fail
        self.assertFalse(self.gov.unlock_circuit_breaker(authorized_by="", totp_verified=True))
        self.assertFalse(self.gov.unlock_circuit_breaker(authorized_by="Chairman_tddv2017", totp_verified=False))

        # 4. Valid Chairman TOTP unlock succeeds
        success = self.gov.unlock_circuit_breaker(
            authorized_by="Chairman_tddv2017",
            totp_verified=True,
            reset_hwm=True,
        )
        self.assertTrue(success)
        self.assertEqual(self.gov.current_tier, DrawdownTier.TIER_1_NORMAL)
        self.assertFalse(self.gov.is_circuit_breaker_tripped)
        self.assertEqual(self.gov.high_water_mark, 99000.0)

    def test_static_drawdown_oracle_compatibility(self) -> None:
        """Verify static evaluation method matches E2E oracle expectations."""
        eval_fn = DrawdownGovernor.evaluate_drawdown_tier_static
        self.assertEqual(eval_fn(100000.0, 98500.0), "TIER_1_NORMAL")
        self.assertEqual(eval_fn(100000.0, 96500.0), "TIER_2_SOFT_THROTTLE")
        self.assertEqual(eval_fn(100000.0, 95200.0), "TIER_3_HARD_FREEZE")
        self.assertEqual(eval_fn(100000.0, 94900.0), "TIER_4_CIRCUIT_BREAKER")


class TestCircuitBreakers(unittest.TestCase):
    """Unit tests for Features 13, 14, 15: Stop-Out LTV, Latency, Spread & Kill-Switch."""

    def test_ltv_calculation_and_margin_level(self) -> None:
        """Verify LTV = UsedMargin / Equity * 100% and 85% LTV <=> 117.65% Margin Level."""
        equity = 10000.0
        used_margin = 8500.0
        ltv = StopOutCircuitBreaker.calculate_ltv(equity, used_margin)
        margin_level = StopOutCircuitBreaker.calculate_margin_level(equity, used_margin)

        self.assertEqual(ltv, 85.0)
        self.assertAlmostEqual(margin_level, 117.647, places=2)

    def test_graceful_emergency_deleveraging_target(self) -> None:
        """Verify liquidation sequence reduces LTV strictly below 50.0%."""
        so = StopOutCircuitBreaker(max_margin_utilization=0.85, target_recovery_utilization=0.50)
        positions = [
            {"ticket": 101, "margin": 4000.0},
            {"ticket": 102, "margin": 3000.0},
            {"ticket": 103, "margin": 1500.0},
        ]
        equity = 10000.0
        used_margin = 8500.0  # 85% LTV

        res = so.evaluate_deleveraging(equity=equity, used_margin=used_margin, positions=positions)
        self.assertTrue(res["triggered"])
        self.assertEqual(res["action"], "EMERGENCY_DELEVERAGE")
        # Ticket 101 has 4000 margin -> closing it leaves 4500 margin -> 45% LTV < 50%
        self.assertEqual(res["tickets_to_close"], [101])
        self.assertLess(res["new_ltv"], 50.0)

    def test_broker_stopout_cushion_detection(self) -> None:
        """Verify instant emergency flatten when inside 20% cushion of 30% broker stop-out."""
        so = StopOutCircuitBreaker(broker_stopout_level=30.0, cushion_pct=0.20)
        equity = 340.0
        used_margin = 1000.0  # Margin level = 34.0% <= 36.0% (critical cushion)

        positions = [{"ticket": 1, "margin": 500.0}, {"ticket": 2, "margin": 500.0}]
        res = so.evaluate_deleveraging(equity=equity, used_margin=used_margin, positions=positions)
        self.assertTrue(res["triggered"])
        self.assertEqual(res["action"], "EMERGENCY_FLATTEN")
        self.assertEqual(res["reason"], "BROKER_STOPOUT_CUSHION_BREACHED")
        self.assertEqual(set(res["tickets_to_close"]), {1, 2})

    def test_empty_positions_at_stopout(self) -> None:
        """Verify graceful handling of empty positions list during stop-out check."""
        so = StopOutCircuitBreaker()
        res = so.evaluate_deleveraging(equity=10000.0, used_margin=9000.0, positions=[])
        self.assertTrue(res["triggered"])
        self.assertEqual(res["tickets_to_close"], [])

    def test_latency_tripwire_trigger_and_halt(self) -> None:
        """Verify ping > 1500ms trips halt for 15 minutes."""
        lat = LatencyTripwire(max_latency_ms=1500.0, halt_duration_minutes=15)
        now = 1000000.0

        # Normal ping: 250ms -> safe
        tripped = lat.record_ping(250.0, current_time=now)
        self.assertFalse(tripped)
        self.assertFalse(lat.is_tripped(current_time=now))

        # Latency spike: 1850ms -> trips!
        tripped = lat.record_ping(1850.0, current_time=now)
        self.assertTrue(tripped)
        self.assertTrue(lat.is_tripped(current_time=now + 60.0))  # 1m later still halted
        self.assertTrue(lat.is_tripped(current_time=now + 899.0))  # 14m 59s later still halted
        self.assertFalse(lat.is_tripped(current_time=now + 901.0))  # 15m 1s later cleared!

    def test_consecutive_timeouts_tripwire(self) -> None:
        """Verify 3 consecutive timeouts trip latency tripwire."""
        lat = LatencyTripwire(max_consecutive_timeouts=3, halt_duration_minutes=15)
        now = 1000000.0

        lat.record_ping(100.0, is_timeout=True, current_time=now)
        self.assertFalse(lat.is_tripped(now))
        lat.record_ping(100.0, is_timeout=True, current_time=now + 1.0)
        self.assertFalse(lat.is_tripped(now + 1.0))
        tripped = lat.record_ping(100.0, is_timeout=True, current_time=now + 2.0)
        self.assertTrue(tripped)
        self.assertTrue(lat.is_tripped(now + 2.0))

    def test_spread_anomaly_tripwire_and_cooling(self) -> None:
        """Verify spread > 3.5 * EMA trips entries and 3 cooling bars un-trip."""
        st = SpreadTripwire(max_spread_multiplier=3.5, ema_period=10, cooling_bars_required=3)
        symbol = "XAUUSD"

        # Baseline: spread 0.20 for several bars
        for _ in range(10):
            st.update_spread(symbol, 0.20)
        self.assertFalse(st.is_spread_tripped(symbol))

        # Spike: spread 1.50 (> 3.5 * 0.20 = 0.70) -> TRIPPED
        tripped = st.update_spread(symbol, 1.50)
        self.assertTrue(tripped)
        self.assertTrue(st.is_spread_tripped(symbol))

        # Cooling bar 1 (spread 0.22 <= 2.0 * EMA)
        st.update_spread(symbol, 0.22)
        self.assertTrue(st.is_spread_tripped(symbol))

        # Cooling bar 2
        st.update_spread(symbol, 0.22)
        self.assertTrue(st.is_spread_tripped(symbol))

        # Cooling bar 3 -> Cleared!
        st.update_spread(symbol, 0.22)
        self.assertFalse(st.is_spread_tripped(symbol))

    def test_remote_kill_switch_bridge(self) -> None:
        """Verify globalBotActive=False halts trading and heartbeat updates state."""
        rk = RemoteKillSwitchBridge(max_disconnect_seconds=60.0)
        now = 1000000.0

        # Normal active state
        rk.set_state(global_bot_active=True, maintenance_mode=False, current_time=now)
        self.assertTrue(rk.is_trading_allowed(current_time=now + 10.0))

        # Remote disable
        rk.set_state(global_bot_active=False, current_time=now)
        self.assertFalse(rk.is_trading_allowed(current_time=now + 10.0))

        # Heartbeat update restores
        heartbeat_response = {
            "success": True,
            "globalBotActive": True,
            "maintenanceMode": False,
            "serverTime": 1725984000000,
        }
        rk.update_from_heartbeat(heartbeat_response, current_time=now + 20.0)
        self.assertTrue(rk.is_trading_allowed(current_time=now + 25.0))

        # Stale disconnect (> 60s)
        self.assertTrue(rk.is_disconnected(current_time=now + 90.0))
        self.assertFalse(rk.is_trading_allowed(current_time=now + 90.0))


class TestSpartanRiskEngine(unittest.TestCase):
    """Unit tests for unified SpartanRiskEngine implementing IRiskEngine interface."""

    def setUp(self) -> None:
        self.engine = SpartanRiskEngine(initial_equity=100000.0)

    def test_evaluate_order_tier1_normal_approved(self) -> None:
        """Verify valid BUY signal is approved under Tier 1."""
        signal: SignalDict = {
            "action": "BUY",
            "symbol": "XAUUSD",
            "entry_price": 2700.0,
            "stop_loss": 2690.0,
            "take_profit": 2720.0,
            "magic_number": 881011,
            "regime": "BULL_TREND",
            "comment": "MOMENTUM_ENTRY",
        }
        order = self.engine.evaluate_order(
            signal=signal,
            portfolio_equity=100000.0,
            current_margin=2000.0,
            free_margin=98000.0,
        )
        self.assertIsNotNone(order)
        self.assertEqual(order["symbol"], "XAUUSD")
        self.assertEqual(order["action"], "BUY")
        self.assertGreater(order["lots"], 0.0)
        self.assertEqual(order["magic_number"], 881011)

    def test_evaluate_order_tier2_soft_throttle_halved_size(self) -> None:
        """Verify risk sizing is halved under Tier 2 Soft Throttle."""
        # 1. Evaluate in Tier 1 (100k equity)
        signal: SignalDict = {
            "action": "BUY",
            "symbol": "XAUUSD",
            "entry_price": 2700.0,
            "stop_loss": 2690.0,
            "take_profit": 2720.0,
            "magic_number": 881011,
        }
        order_t1 = self.engine.evaluate_order(
            signal=signal,
            portfolio_equity=100000.0,
            current_margin=2000.0,
        )
        lots_t1 = order_t1["lots"]

        # 2. Transition into Tier 2 (96.5k equity = 3.5% DD)
        order_t2 = self.engine.evaluate_order(
            signal=signal,
            portfolio_equity=96500.0,
            current_margin=2000.0,
        )
        self.assertIsNotNone(order_t2)
        lots_t2 = order_t2["lots"]

        # Expected: lots_t2 approximately 0.5x of lots_t1
        self.assertAlmostEqual(lots_t2, lots_t1 * 0.5, delta=0.03)

    def test_evaluate_order_tier3_hard_freeze_blocked(self) -> None:
        """Verify BUY order is blocked under Tier 3 Hard Freeze (4.8% DD)."""
        signal: SignalDict = {
            "action": "BUY",
            "symbol": "XAUUSD",
            "entry_price": 2700.0,
            "stop_loss": 2690.0,
        }
        order = self.engine.evaluate_order(
            signal=signal,
            portfolio_equity=95200.0,  # 4.8% DD
            current_margin=2000.0,
        )
        self.assertIsNone(order)

    def test_evaluate_order_tier4_circuit_breaker_blocked(self) -> None:
        """Verify BUY order is blocked under Tier 4 Circuit Breaker (5.2% DD)."""
        signal: SignalDict = {
            "action": "BUY",
            "symbol": "XAUUSD",
            "entry_price": 2700.0,
            "stop_loss": 2690.0,
        }
        order = self.engine.evaluate_order(
            signal=signal,
            portfolio_equity=94800.0,  # 5.2% DD
            current_margin=2000.0,
        )
        self.assertIsNone(order)

    def test_evaluate_order_close_action_approved(self) -> None:
        """Verify defensive CLOSE order is approved even during Hard Freeze."""
        signal: SignalDict = {
            "action": "CLOSE",
            "symbol": "XAUUSD",
            "entry_price": 2700.0,
            "lots": 0.50,
            "magic_number": 881011,
        }
        order = self.engine.evaluate_order(
            signal=signal,
            portfolio_equity=95000.0,  # 5.0% DD
            current_margin=2000.0,
        )
        self.assertIsNotNone(order)
        self.assertEqual(order["action"], "CLOSE")

    def test_evaluate_order_tripwire_rejections(self) -> None:
        """Verify rejection when latency, spread or remote kill-switch is active."""
        signal: SignalDict = {
            "action": "BUY",
            "symbol": "XAUUSD",
            "entry_price": 2700.0,
            "stop_loss": 2690.0,
        }

        # 1. Latency tripwire active
        self.engine.circuit_breakers.latency.record_ping(2000.0)
        self.assertIsNone(self.engine.evaluate_order(signal, 100000.0, 2000.0))
        self.engine.circuit_breakers.latency.reset()

        # 2. Spread tripwire active
        self.engine.circuit_breakers.spread.update_spread("XAUUSD", 0.20)
        self.engine.circuit_breakers.spread.update_spread("XAUUSD", 2.00)  # Spike
        self.assertIsNone(self.engine.evaluate_order(signal, 100000.0, 2000.0))

        # 3. Remote kill switch active
        self.engine.circuit_breakers.spread.tripped_symbols["XAUUSD"] = False
        self.engine.circuit_breakers.remote_kill.set_state(global_bot_active=False)
        self.assertIsNone(self.engine.evaluate_order(signal, 100000.0, 2000.0))

    def test_check_circuit_breaker_contract(self) -> None:
        """Verify check_circuit_breaker satisfies CircuitBreakerStatus interface contract."""
        # 1. Normal state
        status_norm = self.engine.check_circuit_breaker(
            equity=100000.0,
            balance=100000.0,
            used_margin=2000.0,
            latency_ms=150.0,
        )
        self.assertIsInstance(status_norm, CircuitBreakerStatus)
        self.assertFalse(status_norm.is_triggered)
        self.assertEqual(status_norm.tier, DrawdownTier.TIER_1_NORMAL)
        self.assertEqual(status_norm.margin_utilization_ltv, 2.0)

        # 2. Stop-Out LTV breach (used_margin 86000 / equity 100000 = 86% LTV)
        status_ltv = self.engine.check_circuit_breaker(
            equity=100000.0,
            balance=100000.0,
            used_margin=86000.0,
        )
        self.assertTrue(status_ltv.is_triggered)
        self.assertEqual(status_ltv.action, "EMERGENCY_DELEVERAGE")

        # 3. Drawdown Tier 4 breach
        status_dd4 = self.engine.check_circuit_breaker(
            equity=94000.0,  # 6.0% DD from 100k HWM
            balance=94000.0,
            used_margin=1000.0,
        )
        self.assertTrue(status_dd4.is_triggered)
        self.assertEqual(status_dd4.tier, DrawdownTier.TIER_4_CIRCUIT_BREAKER)
        self.assertEqual(status_dd4.action, "CIRCUIT_BREAKER_KILL_SWITCH")


if __name__ == "__main__":
    unittest.main()
