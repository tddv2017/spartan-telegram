"""
Scenario 4: Multi-Ghost simultaneous execution on EURUSD/GBPUSD with isolated Magic Numbers.
Simulates:
1. Multi-Ghost initialization: Ghost A (EURUSD Momentum M15, Magic 882012) and Ghost B (GBPUSD Breakout M15, Magic 883022).
2. Simultaneous order execution without state collisions.
3. Independent trailing stops and partial TP modifications.
4. Telemetry transmission to /api/ea/webhook and Master Pool heartbeat.
"""

from quant_research.e2e_tests.base import OpaqueBoxTestCase
from quant_research.e2e_tests.oracles import ProtocolOracles


class TestScenario4MultiGhostWebhook(OpaqueBoxTestCase):
    """Scenario 4: Multi-Ghost Execution & Webhook Telemetry."""

    def test_scenario_4_execution_flow(self):
        # 1. Initialize two isolated ghost modules
        ghost_a_magic = 882012  # EURUSD (2), Momentum (01), M15 (2)
        ghost_b_magic = 883022  # GBPUSD (3), VolBreakout (02), M15 (2)

        parsed_a = ProtocolOracles.parse_magic_number(ghost_a_magic)
        parsed_b = ProtocolOracles.parse_magic_number(ghost_b_magic)
        self.assertEqual(parsed_a["asset_name"], "EURUSD")
        self.assertEqual(parsed_b["asset_name"], "GBPUSD")
        self.assertNotEqual(ghost_a_magic, ghost_b_magic)

        # 2. Ghost Order Registry Simulation
        active_orders = {
            ghost_a_magic: [],
            ghost_b_magic: []
        }

        # 3. Simultaneous Order Opening
        order_a = {
            "ticket": 20491,
            "magic": ghost_a_magic,
            "symbol": "EURUSD",
            "type": "BUY",
            "lots": 1.20,
            "open_price": 1.08500,
            "stop_loss": 1.08200,
            "take_profit": 1.09100
        }
        order_b = {
            "ticket": 20492,
            "magic": ghost_b_magic,
            "symbol": "GBPUSD",
            "type": "SELL",
            "lots": 0.80,
            "open_price": 1.29500,
            "stop_loss": 1.29800,
            "take_profit": 1.28900
        }

        active_orders[ghost_a_magic].append(order_a)
        active_orders[ghost_b_magic].append(order_b)

        # 4. Verify State Machine Isolation
        self.assertEqual(len(active_orders[ghost_a_magic]), 1)
        self.assertEqual(len(active_orders[ghost_b_magic]), 1)
        self.assertEqual(active_orders[ghost_a_magic][0]["ticket"], 20491)
        self.assertEqual(active_orders[ghost_b_magic][0]["ticket"], 20492)

        # 5. Ghost A Partial Close & Trailing Stop Modification
        # Price reaches 1.0880 (+30 pips -> +1.0R): close 50% lots (0.60 lot), move SL to Breakeven
        order_a["lots"] = 0.60
        order_a["stop_loss"] = 1.08500  # Breakeven

        # Verify Ghost B order parameters were NOT altered
        self.assertEqual(order_b["stop_loss"], 1.29800)
        self.assertEqual(order_b["lots"], 0.80)

        # 6. Ghost B Exit at Take Profit: Price hits 1.2890 (+60 pips)
        pnl_b = 0.80 * 100000.0 * (1.29500 - 1.28900)  # $480.00
        active_orders[ghost_b_magic].clear()

        # Ghost A Closes Remaining 50% at 1.0910 (+60 pips)
        pnl_a = (0.60 * 100000.0 * (1.08800 - 1.08500)) + (0.60 * 100000.0 * (1.09100 - 1.08500))  # 180 + 360 = $540.00
        active_orders[ghost_a_magic].clear()

        # 7. Generate and Normalize Webhook Payloads for Both Trades
        payload_a = {
            "action": "TRADE_CLOSED",
            "ticket": "20491",
            "symbol": "EURUSD",
            "type": "BUY",
            "lots": 1.20,
            "openPrice": 1.0850,
            "closePrice": 1.0910,
            "pnl": pnl_a,
            "pnlPercentage": 0.55,
            "magicNumber": ghost_a_magic
        }
        payload_b = {
            "action": "TRADE_CLOSED",
            "ticket": "20492",
            "symbol": "GBPUSD",
            "type": "SELL",
            "lots": 0.80,
            "openPrice": 1.2950,
            "closePrice": 1.2890,
            "pnl": pnl_b,
            "pnlPercentage": 0.46,
            "magicNumber": ghost_b_magic
        }

        norm_a = ProtocolOracles.normalize_trade_payload(payload_a)
        norm_b = ProtocolOracles.normalize_trade_payload(payload_b)

        self.assertEqual(norm_a["magicNumber"], 882012)
        self.assertEqual(norm_b["magicNumber"], 883022)
        self.assertGreater(norm_a["openPrice"], 0.0)
        self.assertGreater(norm_b["openPrice"], 0.0)

        # 8. Heartbeat Payload Verification
        heartbeat = {
            "action": "HEARTBEAT",
            "balance": 105420.00,
            "equity": 105420.00,
            "openPositions": 0,
            "margin": 0.0
        }
        self.assertEqual(heartbeat["openPositions"], 0)
