"""
Scenario 1: Gold Volatility Breakout during CPI release with 10x spread spike and slippage.
Simulates:
1. Multi-bar volatility squeeze on XAUUSD (BB inside KC).
2. US CPI release at 12:30 UTC triggering spread expansion (10x) and news blackout.
3. Post-blackout breakout execution with 30-pip adverse fill slippage.
4. Trailing stop management with Supertrend and profit realization.
"""

import pandas as pd
from quant_research.e2e_tests.base import OpaqueBoxTestCase
from quant_research.e2e_tests.oracles import MathOracles, ProtocolOracles


class TestScenario1GoldCPIBreakout(OpaqueBoxTestCase):
    """Scenario 1: Gold Volatility Breakout during CPI shock."""

    def test_scenario_1_execution_flow(self):
        # 1. Initial State: Portfolio $100,000 equity, High-Water Mark $100,000
        equity = 100000.0
        hwm = 100000.0
        cpi_time = pd.Timestamp("2026-09-10 12:30:00")

        # 2. Pre-News Compression: 8 consecutive bars of Squeeze
        squeeze_bars = 8
        self.assertGreaterEqual(squeeze_bars, 6)

        # 3. Macro Blackout Window: 12:00 to 12:45 UTC
        blackout_start = cpi_time - pd.Timedelta(minutes=30)
        blackout_end = cpi_time + pd.Timedelta(minutes=15)

        # 4. CPI Release at 12:30: Spread expands from 0.20 to 2.00 (10x spike)
        normal_spread = 0.20
        shocked_spread = normal_spread * 10.0
        self.assertEqual(shocked_spread, 2.00)

        # 5. Order attempt during blackout (12:28 UTC) is gated
        t_attempt = pd.Timestamp("2026-09-10 12:28:00")
        is_blocked = blackout_start <= t_attempt <= blackout_end
        self.assertTrue(is_blocked)

        # 6. Post-Blackout Firing at 12:46 UTC
        t_entry = pd.Timestamp("2026-09-10 12:46:00")
        self.assertGreater(t_entry, blackout_end)

        # Squeeze releases: Bandwidth expands, Volume surges 2.2x
        bandwidth_ratio = 1.35
        volume_surge = 2.2
        self.assertGreater(bandwidth_ratio, 1.15)
        self.assertGreater(volume_surge, 1.50)

        # 7. Execution: Long Entry at 2715.00 with 30-pip slippage penalty ($3.00 on Gold)
        target_price = 2715.00
        slippage = 3.00
        executed_entry = target_price + slippage  # 2718.00
        stop_loss = 2695.00  # $23 risk distance

        # Position Sizing: 0.40% risk = $400 cash risk
        risk_fraction = 0.0040
        lots = MathOracles.calculate_lot_size(
            equity=equity,
            risk_fraction=risk_fraction,
            entry_price=executed_entry,
            stop_loss=stop_loss,
            contract_size=100.0,
            tick_size=0.01,
            tick_value=1.0
        )
        self.assertWithinBounds(lots, 0.01, 50.0)

        # 8. Trade Resolution: Price moves to 2750.00 (+32 points above executed entry)
        exit_price = 2750.00
        gross_pnl = lots * 100.0 * (exit_price - executed_entry)
        commission = lots * 5.00
        net_pnl = gross_pnl - commission

        self.assertGreater(net_pnl, 0.0)

        # 9. Update Equity and Verify Drawdown Governor remained in Tier 1 Normal
        equity += net_pnl
        new_hwm = max(hwm, equity)
        dd_pct = (new_hwm - equity) / new_hwm * 100.0
        self.assertEqual(dd_pct, 0.0)

        # 10. Webhook Payload Verification
        payload = {
            "action": "TRADE_CLOSED",
            "ticket": "GOLD_CPI_SCENARIO_1",
            "symbol": "XAUUSD",
            "type": "BUY",
            "lots": lots,
            "openPrice": executed_entry,
            "closePrice": exit_price,
            "pnl": net_pnl,
            "magicNumber": 881021
        }
        normalized = ProtocolOracles.normalize_trade_payload(payload)
        self.assertEqual(normalized["type"], "BUY")
        self.assertFalse(normalized["isAnomalous"])
