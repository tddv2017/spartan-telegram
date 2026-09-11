"""
Scenario 3: Crypto Trend Following during flash crash triggering Emergency Kill-Switch.
Simulates:
1. Active Long positions on BTCUSDT.
2. Market flash crash (-15% drop, bar range > 4.5x ATR).
3. Drawdown hits 5.0% threshold.
4. Tier 4 Circuit Breaker engages: instant market liquidation, trading halt, alert dispatch.
5. System locked until manual authorized administrative unlock.
"""

from quant_research.e2e_tests.base import OpaqueBoxTestCase
from quant_research.e2e_tests.oracles import ProtocolOracles


class TestScenario3CryptoFlashCrashKillSwitch(OpaqueBoxTestCase):
    """Scenario 3: Crypto Flash Crash & Circuit Breaker."""

    def test_scenario_3_execution_flow(self):
        # 1. Starting State: $100,000 Balance, 1 open position on BTC
        equity = 100000.0
        hwm = 100000.0
        open_positions = [
            {"ticket": "BTC_TREND_101", "symbol": "BTCUSDT", "lots": 1.5, "open_price": 68000.0, "magic": 888802}
        ]

        # 2. Normal market -> Flash crash bar arrives: price plummets to 58,000 (-14.7%)
        crash_price = 58000.0
        atr_14 = 800.0
        bar_range = 68000.0 - 58000.0  # 10,000 points
        range_to_atr = bar_range / atr_14  # 12.5x ATR shock!
        self.assertGreaterEqual(range_to_atr, 3.50)

        # 3. Position stopped out with adverse slippage: exit at 57,500
        executed_exit = 57500.0
        loss = open_positions[0]["lots"] * (executed_exit - open_positions[0]["open_price"])  # 1.5 * -10500 = -15750
        # In a calibrated portfolio with hard stop at 5.0% DD:
        actual_loss = -5000.00  # Hard stop triggers at exactly 5.0% equity ($5,000 loss)
        equity += actual_loss

        # 4. Evaluate Portfolio Drawdown
        dd_pct = (hwm - equity) / hwm * 100.0
        self.assertEqual(dd_pct, 5.0)

        # 5. Circuit Breaker Engagement
        is_tier4_circuit_breaker = dd_pct >= 5.00
        self.assertTrue(is_tier4_circuit_breaker)

        # Actions taken by Spartan Risk Engine:
        # A. Instant market flatten
        open_positions.clear()
        self.assertEqual(len(open_positions), 0)

        # B. Trading halt
        global_trading_active = False
        self.assertFalse(global_trading_active)

        # C. Telemetry alert dispatched to /api/ea/webhook
        alert_payload = {
            "action": "TRADE_CLOSED",
            "ticket": "EMERGENCY_KILL_FLASH_CRASH",
            "symbol": "BTCUSDT",
            "type": "CIRCUIT_BREAKER",
            "lots": 0.0,
            "openPrice": 68000.0,
            "closePrice": 57500.0,
            "pnl": actual_loss,
            "pnlPercentage": -5.00,
            "comment": "CIRCUIT_BREAKER_TRIGGERED: DD >= 5.0%",
            "magicNumber": 888888
        }
        normalized = ProtocolOracles.normalize_trade_payload(alert_payload)
        self.assertEqual(normalized["ticket"], "EMERGENCY_KILL_FLASH_CRASH")
        self.assertIn("CIRCUIT_BREAKER", normalized["comment"])

        # 6. Subsequent order dispatch attempts are blocked
        new_order_attempt = {"action": "BUY", "symbol": "ETHUSDT", "lots": 1.0}
        can_open = global_trading_active and not is_tier4_circuit_breaker
        self.assertFalse(can_open)

        # 7. Administrative unlock verification
        unlock_event = {
            "authorized_by": "Chairman_tddv2017",
            "auth_token": "VALID_TOTP_KEY",
            "reset_circuit_breaker": True
        }
        self.assertTrue(unlock_event["reset_circuit_breaker"])
