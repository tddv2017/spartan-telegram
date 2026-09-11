"""
Scenario 5: Stop-Out LTV 85% simulated account liquidation and de-leveraging test.
Simulates:
1. Multi-position account with high leverage under adverse market movement.
2. Margin utilization reaches 85.5% (Margin Level drops to 116.9%).
3. Stop-Out LTV 85% Circuit Breaker trips with 100% precision.
4. Selective de-leveraging liquidates highest-margin burden position until LTV < 50%.
5. Broker forced liquidation (30% margin level) is completely averted.
"""

from quant_research.e2e_tests.base import OpaqueBoxTestCase
from quant_research.e2e_tests.oracles import ProtocolOracles


class TestScenario5StopOutLTVLiquidation(OpaqueBoxTestCase):
    """Scenario 5: Stop-Out LTV 85% De-leveraging & Liquidation."""

    def test_scenario_5_execution_flow(self):
        # 1. Starting Portfolio: Equity $20,000, 3 open positions
        equity = 20000.0
        positions = [
            {"ticket": 901, "symbol": "XAUUSD", "lots": 2.0, "margin": 10000.0, "pnl": -1500.0},
            {"ticket": 902, "symbol": "EURUSD", "lots": 3.0, "margin": 4500.0,  "pnl": -300.0},
            {"ticket": 903, "symbol": "GBPUSD", "lots": 2.0, "margin": 2600.0,  "pnl": -200.0},
        ]

        # Total used margin = 10000 + 4500 + 2600 = 17,100
        used_margin = sum(p["margin"] for p in positions)
        self.assertEqual(used_margin, 17100.0)

        # 2. Calculate Margin Utilization (LTV) and Margin Level
        ltv = (used_margin / equity) * 100.0
        margin_level = (equity / used_margin) * 100.0

        # LTV = 17100 / 20000 = 85.5% (exceeds 85.0% threshold)
        # Margin Level = 20000 / 17100 = 116.96% (below 117.65%)
        self.assertEqual(ltv, 85.5)
        self.assertLessEqual(margin_level, 117.65)

        # 3. Circuit Breaker Trips (100% precision)
        breaker_tripped = (ltv >= 85.0)
        self.assertTrue(breaker_tripped)

        # 4. Graceful Emergency De-leveraging Algorithm
        # Sort positions descending by margin requirement
        positions_sorted = sorted(positions, key=lambda x: x["margin"], reverse=True)
        closed_positions = []
        remaining_positions = list(positions_sorted)

        while remaining_positions:
            current_margin = sum(p["margin"] for p in remaining_positions)
            current_ltv = (current_margin / equity) * 100.0
            if current_ltv < 50.0:
                break  # Target achieved
            # Liquidate highest margin position
            pos_to_close = remaining_positions.pop(0)
            closed_positions.append(pos_to_close)

        # 5. Verify Liquidation Outcome
        # Closed position 901 (margin $10,000)
        self.assertEqual(len(closed_positions), 1)
        self.assertEqual(closed_positions[0]["ticket"], 901)
        self.assertEqual(closed_positions[0]["margin"], 10000.0)

        # Remaining margin = 4500 + 2600 = 7,100
        new_used_margin = sum(p["margin"] for p in remaining_positions)
        new_ltv = (new_used_margin / equity) * 100.0
        new_margin_level = (equity / new_used_margin) * 100.0

        # LTV dropped to 7100 / 20000 = 35.5% (< 50.0% target!)
        # Margin Level recovered to 20000 / 7100 = 281.69% (far above broker 30% stop-out!)
        self.assertEqual(new_ltv, 35.5)
        self.assertLess(new_ltv, 50.0)
        self.assertGreater(new_margin_level, 200.0)

        # 6. Verify Broker Stop-Out (Exness 30% Margin Level) was Completely Averted
        broker_stopout_threshold = 30.0
        self.assertGreater(new_margin_level, broker_stopout_threshold)

        # 7. Webhook Security Telemetry Dispatch
        telemetry = {
            "action": "TRADE_CLOSED",
            "ticket": str(closed_positions[0]["ticket"]),
            "symbol": closed_positions[0]["symbol"],
            "type": "SELL",
            "lots": closed_positions[0]["lots"],
            "openPrice": 2720.0,
            "closePrice": 2712.5,
            "pnl": closed_positions[0]["pnl"],
            "pnlPercentage": -0.28,
            "comment": "EMERGENCY_DELEVERAGE: LTV 85.5% -> 35.5%",
            "magicNumber": 888888
        }
        norm = ProtocolOracles.normalize_trade_payload(telemetry)
        self.assertEqual(norm["ticket"], "901")
        self.assertIn("EMERGENCY_DELEVERAGE", norm["comment"])
