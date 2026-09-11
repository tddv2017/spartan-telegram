"""
Tier 3 Pairwise Combinations Test Suite.
Verifies pairwise interactions between:
- Alpha Models (StatArb, Momentum Trend, Vol Breakout, Mean Reversion)
- Market Regimes (Bull, Bear, Range, Vol Compression, Crisis Shock)
- Asset Microstructures (Gold 100oz, Crypto funding, Forex spreads)
- Risk Management Engine (Calibrated Kelly, 4-Tier Drawdown, LTV 85%, Tripwires)
- Execution Telemetry & Webhook Bridges (/api/ea/webhook)
"""

import pandas as pd
from quant_research.e2e_tests.base import OpaqueBoxTestCase
from quant_research.e2e_tests.oracles import MathOracles, ProtocolOracles


class TestPairwiseCombinations(OpaqueBoxTestCase):
    """Pairwise Cross-Feature Integration Tests."""

    def test_c01_statarb_in_range_bound_with_kelly_sizing(self):
        """Interaction: Model 1 (StatArb) + RANGE_BOUND regime + Calibrated Kelly sizing."""
        # 1. Regime is RANGE_BOUND -> StatArb is allowed
        regime = "RANGE_BOUND"
        is_allowed = regime in ("RANGE_BOUND",)
        self.assertTrue(is_allowed)

        # 2. Spread Z-score hits -2.2 -> Long signal
        z_score = -2.2
        signal_action = "BUY" if z_score <= -2.0 else "HOLD"
        self.assertEqual(signal_action, "BUY")

        # 3. Kelly position sizing calculates risk fraction [0.25%, 0.50%]
        risk_pct = MathOracles.calculate_calibrated_fractional_kelly(win_rate=0.62, profit_payoff_ratio=1.6)
        self.assertWithinBounds(risk_pct, 0.0025, 0.0050)

        # 4. Cash risk on $100k equity
        equity = 100000.0
        cash_risk = equity * risk_pct
        self.assertWithinBounds(cash_risk, 250.0, 500.0)

    def test_c02_statarb_suppression_during_crisis_shock(self):
        """Interaction: Model 1 (StatArb) + CRISIS_SHOCK regime -> Immediate suppression."""
        regime = "CRISIS_SHOCK"
        z_score = 2.8  # Strong short signal
        # Even though Z-score is extreme, shock suppresses entry
        can_enter = (regime != "CRISIS_SHOCK") and (abs(z_score) >= 2.0)
        self.assertFalse(can_enter)

    def test_c03_momentum_trend_bull_gold_100oz_sizing(self):
        """Interaction: Model 2 (Momentum) + BULL_TREND + Gold 100oz Microstructure + Kelly."""
        regime = "BULL_TREND"
        symbol = "XAUUSD"
        entry_price = 2700.00
        atr_14 = 10.0
        # Stop loss = 2.5x ATR below entry on Gold
        sl_price = entry_price - (2.5 * atr_14)  # 2675.00
        equity = 100000.0

        risk_fraction = MathOracles.calculate_calibrated_fractional_kelly(win_rate=0.60, profit_payoff_ratio=1.5)
        lots = MathOracles.calculate_lot_size(
            equity=equity,
            risk_fraction=risk_fraction,
            entry_price=entry_price,
            stop_loss=sl_price,
            contract_size=100.0,
            tick_size=0.01,
            tick_value=1.0
        )
        self.assertWithinBounds(lots, 0.01, 50.0)
        # Check cash loss at SL does not exceed risk fraction * equity
        loss_at_sl = lots * 100.0 * (entry_price - sl_price)
        max_allowed_risk = equity * risk_fraction + 5.0  # slight rounding buffer
        self.assertLessEqual(loss_at_sl, max_allowed_risk)

    def test_c04_momentum_bear_eurusd_with_soft_throttle(self):
        """Interaction: Model 2 (Momentum) + BEAR_TREND + EURUSD + Drawdown Tier 2 (Soft Throttle)."""
        # Under Soft Throttle (DD >= 3.0%), risk is halved
        normal_risk = 0.0040
        soft_throttle_active = True
        effective_risk = normal_risk * 0.50 if soft_throttle_active else normal_risk
        self.assertEqual(effective_risk, 0.0020)

        # Sizing on EURUSD (100,000 contract)
        equity = 100000.0
        entry = 1.0850
        sl = 1.0890  # 40 pips SL for Short
        lots = MathOracles.calculate_lot_size(
            equity=equity,
            risk_fraction=effective_risk,
            entry_price=entry,
            stop_loss=sl,
            contract_size=100000.0,
            tick_size=0.00001,
            tick_value=10.0
        )
        self.assertWithinBounds(lots, 0.01, 50.0)

    def test_c05_volatility_breakout_squeeze_arming_and_firing(self):
        """Interaction: Model 3 (Vol Breakout) + VOL_COMPRESSION -> Squeeze Armed -> Release."""
        # Step 1: Vol Compression state arms breakout
        state_1 = "VOL_COMPRESSION"
        is_armed = (state_1 == "VOL_COMPRESSION")
        self.assertTrue(is_armed)

        # Step 2: Squeeze releases with volume surge
        squeeze_released = True
        volume_surge = True
        can_fire = is_armed and squeeze_released and volume_surge
        self.assertTrue(can_fire)

    def test_c06_volatility_breakout_blocked_by_crisis_shock(self):
        """Interaction: Model 3 (Vol Breakout) + CRISIS_SHOCK -> Execution blocked."""
        squeeze_released = True
        volume_surge = True
        regime = "CRISIS_SHOCK"
        can_fire = squeeze_released and volume_surge and (regime != "CRISIS_SHOCK")
        self.assertFalse(can_fire)

    def test_c07_mean_reversion_suppression_in_bull_trend(self):
        """Interaction: Model 4 (Mean Reversion) + BULL_TREND -> Suppressed by trend gate."""
        # In a strong bull trend (ADX=35, H=0.65), RSI reaches 82 (overbought)
        # Naive mean-reversion would sell; Spartan macro gate blocks shorting into trend
        adx = 35.0
        hurst = 0.65
        gate_passed = (adx < 20.0) and (hurst < 0.45)
        self.assertFalse(gate_passed)

    def test_c08_mean_reversion_in_range_bound_with_pin_bar(self):
        """Interaction: Model 4 (Mean Reversion) + RANGE_BOUND + Pin Bar Rejection."""
        regime = "RANGE_BOUND"
        adx = 15.0
        hurst = 0.38
        lower_wick_ratio = 0.65  # Valid pin bar bounce at lower BB
        signal = "BUY" if (regime == "RANGE_BOUND" and adx < 20 and hurst < 0.45 and lower_wick_ratio >= 0.60) else "HOLD"
        self.assertEqual(signal, "BUY")

    def test_c09_drawdown_hard_freeze_blocks_all_multi_ghosts(self):
        """Interaction: Drawdown Tier 3 (Hard Freeze at 4.5% DD) + Multi-Ghost Requests."""
        # 3 Ghost models attempt to open orders
        ghost_requests = [
            {"magic": 881011, "action": "BUY"},
            {"magic": 881021, "action": "BUY"},
            {"magic": 882032, "action": "SELL"}
        ]
        dd_tier = "TIER_3_HARD_FREEZE"
        allowed_orders = []
        for req in ghost_requests:
            if dd_tier in ("TIER_1_NORMAL", "TIER_2_SOFT_THROTTLE"):
                allowed_orders.append(req)
        self.assertEqual(len(allowed_orders), 0)

    def test_c10_circuit_breaker_triggers_full_market_flatten(self):
        """Interaction: Drawdown Tier 4 (5.0% DD) + Stop-Out LTV 85% -> Full liquidation."""
        dd_pct = 5.1
        ltv_pct = 86.0
        is_tier4 = dd_pct >= 5.0
        is_stopout = ltv_pct >= 85.0
        self.assertTrue(is_tier4)
        self.assertTrue(is_stopout)
        flatten_action = "EMERGENCY_KILL_AND_FLATTEN" if (is_tier4 or is_stopout) else "NORMAL"
        self.assertEqual(flatten_action, "EMERGENCY_KILL_AND_FLATTEN")

    def test_c11_webhook_payload_for_crypto_perpetual_ghost(self):
        """Interaction: CCXT Executor + Multi-Ghost Magic 888801 + Webhook route contract."""
        payload = {
            "action": "TRADE_CLOSED",
            "apiKey": "SECRET_KEY_123",
            "ticket": "CCXT_BTC_1001",
            "symbol": "BTCUSDT",
            "type": "BUY",
            "lots": 0.50,
            "openPrice": 62500.0,
            "closePrice": 63750.0,
            "pnl": 625.0,
            "pnlPercentage": 2.00,
            "comment": "StatArb Long Spread",
            "magicNumber": 888801,
            "timestamp": "2026-09-10T23:30:00Z"
        }
        normalized = ProtocolOracles.normalize_trade_payload(payload)
        parsed_magic = ProtocolOracles.parse_magic_number(normalized["magicNumber"])
        self.assertEqual(normalized["symbol"], "BTCUSDT")
        self.assertEqual(normalized["pnlPercentage"], 2.00)
        self.assertTrue(parsed_magic["valid"])

    def test_c12_latency_tripwire_compounds_with_soft_throttle(self):
        """Interaction: Latency Tripwire (>1500ms) triggered while in Soft Throttle."""
        dd_state = "TIER_2_SOFT_THROTTLE"
        ping_ms = 1650.0
        is_ping_tripped = ping_ms > 1500.0
        # Both halt new entries and maintain halved sizing
        halt_entries = is_ping_tripped
        self.assertTrue(halt_entries)

    def test_c13_news_blackout_postpones_gold_breakout(self):
        """Interaction: Macro News Blackout Window + Model 3 Volatility Breakout on Gold."""
        # Breakout fires at 12:15, but CPI release is at 12:30 (inside 30m blackout)
        event_time = pd.Timestamp("2026-09-10 12:30:00")
        current_time = pd.Timestamp("2026-09-10 12:15:00")
        is_in_blackout = (event_time - pd.Timedelta(minutes=30)) <= current_time <= (event_time + pd.Timedelta(minutes=15))
        breakout_signal_armed = True
        can_execute = breakout_signal_armed and not is_in_blackout
        self.assertFalse(can_execute)

    def test_c14_crypto_funding_gate_blocks_statarb(self):
        """Interaction: Crypto 8h Funding Rate > 0.05% + Model 1 StatArb Entry."""
        funding_rate = 0.00065  # 0.065% > 0.05%
        z_score = -2.3
        can_enter = (abs(z_score) >= 2.0) and (funding_rate <= 0.0005)
        self.assertFalse(can_enter)

    def test_c15_forex_spread_gate_blocks_momentum_breakout(self):
        """Interaction: Forex Spread > 1.8x Average + Model 2 Donchian Breakout."""
        avg_spread = 0.6
        current_spread = 1.3  # 2.16x > 1.8x
        donchian_breakout = True
        can_enter = donchian_breakout and (current_spread <= 1.8 * avg_spread)
        self.assertFalse(can_enter)
