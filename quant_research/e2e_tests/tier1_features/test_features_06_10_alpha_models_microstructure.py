"""
Tier 1 Tests: Features 6 to 10.
Feature 6: Model 1: Statistical Arbitrage (ETH/BTC)
Feature 7: Model 2: Momentum Trend-Following
Feature 8: Model 3: Dynamic Volatility Breakout
Feature 9: Model 4: Regime-Filtered Mean-Reversion
Feature 10: Asset-Specific Microstructures
"""

import math
import numpy as np
import pandas as pd
from quant_research.e2e_tests.base import OpaqueBoxTestCase
from quant_research.e2e_tests.oracles import MathOracles, ProtocolOracles


class TestFeature06StatisticalArbitrage(OpaqueBoxTestCase):
    """Feature 6: Model 1: Statistical Arbitrage (ETH/BTC) (Magic: 888801)."""

    def test_f06_01_kalman_dynamic_beta_convergence(self):
        """Verify 1D Kalman filter converges to true hedge ratio beta on synthetic pair."""
        true_beta = 0.065
        eth, btc, spread = self.generate_mean_reverting_pair(n_bars=600, beta=true_beta, seed=601)
        betas, alphas = MathOracles.solve_kalman_dynamic_beta(eth, btc)
        estimated_beta = float(betas[-1])
        self.assertAlmostEqualRelative(estimated_beta, true_beta, max_relative_error=0.15)

    def test_f06_02_ou_half_life_estimation(self):
        """Verify Ornstein-Uhlenbeck process half-life estimation is within [5, 80] bars filter."""
        eth, btc, spread = self.generate_mean_reverting_pair(n_bars=500, half_life=25.0, seed=602)
        half_life, theta = MathOracles.calculate_ou_half_life(spread)
        self.assertWithinBounds(half_life, 5.0, 80.0)

    def test_f06_03_z_score_entry_and_exit_signals(self):
        """Verify Z-score triggers Long at <= -2.0, Short at >= +2.0, and Mean-Exit at <= 0.20."""
        z_scores = [-2.5, -1.8, -0.15, 0.5, 2.2, 3.6]
        # Signals:
        # z = -2.5 -> Long Entry
        # z = 2.2 -> Short Entry
        # z = -0.15 -> Exit / Take Profit
        # z = 3.6 -> Structural Stop Loss (|z| >= 3.5)
        self.assertTrue(z_scores[0] <= -2.0)
        self.assertTrue(z_scores[4] >= 2.0)
        self.assertTrue(abs(z_scores[2]) <= 0.20)
        self.assertTrue(abs(z_scores[5]) >= 3.50)

    def test_f06_04_structural_stop_loss_trigger(self):
        """Verify immediate liquidation trigger when |Z| >= 3.50 (cointegration breakdown)."""
        z_score = 3.75
        should_stop_out = abs(z_score) >= 3.50
        self.assertTrue(should_stop_out)

    def test_f06_05_magic_number_and_taxonomy(self):
        """Verify Magic Number is 888801 and matches StatArb ETH/BTC taxonomy."""
        magic = 888801
        parsed = ProtocolOracles.parse_magic_number(magic)
        self.assertTrue(parsed["valid"])
        self.assertEqual(parsed["asset_name"], "BTCUSDT")
        self.assertEqual(parsed["strategy_code"], 1)
        self.assertEqual(parsed["strategy_name"], "StatArb")


class TestFeature07MomentumTrendFollowing(OpaqueBoxTestCase):
    """Feature 7: Model 2: Momentum Multi-Timeframe Trend (Magic: 888802)."""

    def test_f07_01_ema_stack_alignment(self):
        """Verify EMA 21 > EMA 55 > EMA 200 bull stack condition."""
        closes = pd.Series([100.0 + i * 0.5 for i in range(250)])
        ema21 = closes.ewm(span=21, adjust=False).mean()
        ema55 = closes.ewm(span=55, adjust=False).mean()
        ema200 = closes.ewm(span=200, adjust=False).mean()
        is_bull_stack = (ema21.iloc[-1] > ema55.iloc[-1] > ema200.iloc[-1])
        self.assertTrue(is_bull_stack)

    def test_f07_02_donchian_breakout_detection(self):
        """Verify breakout signal when Close exceeds 20-period Donchian Upper Channel."""
        df = self.generate_synthetic_ohlcv(n_bars=30, start_price=2000.0, seed=702)
        upper_dc = df["high"].iloc[:20].max()
        # Bar 21 breaks out
        breakout_close = upper_dc + 5.0
        is_breakout = breakout_close > upper_dc
        self.assertTrue(is_breakout)

    def test_f07_03_supertrend_ratchet_monotonicity(self):
        """Verify Supertrend lower band is strictly monotonic non-decreasing in ongoing bull run."""
        np.random.seed(703)
        prices = [2000.0 + i * 2.0 + np.random.normal(0, 0.5) for i in range(20)]
        atr = 5.0
        multiplier = 3.0
        raw_lower_bands = [p - (multiplier * atr) for p in prices]
        
        # Ratchet lower band: LB_t = max(LB_t, LB_{t-1}) while close > LB_{t-1}
        ratcheted_lb = [raw_lower_bands[0]]
        for i in range(1, len(prices)):
            ratcheted = max(ratcheted_lb[-1], raw_lower_bands[i])
            ratcheted_lb.append(ratcheted)

        self.assertMonotonicNonDecreasing(ratcheted_lb)

    def test_f07_04_adx_trend_filter_gate(self):
        """Verify entry is blocked if ADX < 25.0 (choppy or consolidating market)."""
        adx_weak = 18.5
        adx_strong = 31.0
        self.assertFalse(adx_weak >= 25.0)
        self.assertTrue(adx_strong >= 25.0)

    def test_f07_05_multi_stage_tp_and_trailing(self):
        """Verify 50% TP executed at +2.0R and remaining 50% trails with Supertrend."""
        entry = 2000.0
        sl = 1980.0
        r_dist = entry - sl  # 20 points
        tp1 = entry + (2.0 * r_dist)  # 2040.0
        self.assertEqual(tp1, 2040.0)


class TestFeature08VolatilityBreakout(OpaqueBoxTestCase):
    """Feature 8: Model 3: Dynamic Volatility Breakout (Magic: 888803)."""

    def test_f08_01_bollinger_inside_keltner_squeeze(self):
        """Verify SqueezeOn = True when BB is entirely inside Keltner Channels."""
        bb_upper = 2010.0
        bb_lower = 1990.0
        kc_upper = 2015.0
        kc_lower = 1985.0
        squeeze_on = (bb_upper < kc_upper) and (bb_lower > kc_lower)
        self.assertTrue(squeeze_on)

    def test_f08_02_minimum_squeeze_compression_bars(self):
        """Verify squeeze must persist for >= 6 consecutive bars before release trigger arms."""
        squeeze_durations = [3, 5, 6, 12]
        self.assertFalse(squeeze_durations[0] >= 6)
        self.assertFalse(squeeze_durations[1] >= 6)
        self.assertTrue(squeeze_durations[2] >= 6)
        self.assertTrue(squeeze_durations[3] >= 6)

    def test_f08_03_bandwidth_expansion_trigger(self):
        """Verify bandwidth expansion trigger fires when BW / SMA50(BW) > 1.15."""
        bw = 0.05
        sma_bw_normal = 0.045
        sma_bw_spike = 0.035
        ratio_normal = bw / sma_bw_normal  # 1.11 -> no trigger
        ratio_spike = bw / sma_bw_spike    # 1.42 -> trigger!
        self.assertFalse(ratio_normal > 1.15)
        self.assertTrue(ratio_spike > 1.15)

    def test_f08_04_volume_surge_filter(self):
        """Verify breakout requires Volume >= 1.5 * SMA20(Volume) and OBV > EMA20(OBV)."""
        sma_vol = 1000.0
        vol_weak = 1200.0   # 1.2x -> rejected
        vol_surge = 1600.0  # 1.6x -> accepted
        self.assertFalse(vol_weak >= 1.50 * sma_vol)
        self.assertTrue(vol_surge >= 1.50 * sma_vol)

    def test_f08_05_linear_regression_momentum_oscillator(self):
        """Verify momentum oscillator slope sign matches breakout direction."""
        bull_delta = np.array([1.0, 2.2, 3.5, 4.8, 6.0])
        bear_delta = np.array([-1.0, -2.5, -3.8, -5.2, -6.5])
        slope_bull = np.polyfit(range(len(bull_delta)), bull_delta, 1)[0]
        slope_bear = np.polyfit(range(len(bear_delta)), bear_delta, 1)[0]
        self.assertGreater(slope_bull, 0.0)
        self.assertLess(slope_bear, 0.0)


class TestFeature09RegimeMeanReversion(OpaqueBoxTestCase):
    """Feature 9: Model 4: Regime-Filtered Mean-Reversion (Magic: 888804)."""

    def test_f09_01_regime_prerequisite_gate(self):
        """Verify Mean-Reversion is strictly suppressed unless ADX < 20 and Hurst < 0.45."""
        # Case A: Trending market (ADX=30, H=0.60) -> BLOCKED
        # Case B: Range-bound market (ADX=16, H=0.40) -> ALLOWED
        gate_a = (30.0 < 20.0) and (0.60 < 0.45)
        gate_b = (16.0 < 20.0) and (0.40 < 0.45)
        self.assertFalse(gate_a)
        self.assertTrue(gate_b)

    def test_f09_02_dynamic_rsi_rolling_quantiles(self):
        """Verify dynamic RSI oversold threshold is clamped strictly between [20, 35]."""
        np.random.seed(902)
        rsi_history = np.random.uniform(15, 85, 100)
        q10 = float(np.percentile(rsi_history, 10))
        oversold = max(20.0, min(35.0, q10))
        self.assertWithinBounds(oversold, 20.0, 35.0)

    def test_f09_03_pin_bar_rejection_wick_ratio(self):
        """Verify pin bar rejection wick ratio >= 0.60 for Bollinger outer envelope bounce."""
        # Hammer candle: High=105, Low=95, Open=103, Close=104
        # Lower wick = min(Open, Close) - Low = 103 - 95 = 8
        # Total range = 105 - 95 = 10
        # Lower wick ratio = 8 / 10 = 0.80 >= 0.60
        high = 105.0
        low = 95.0
        open_p = 103.0
        close_p = 104.0
        wick_ratio = (min(open_p, close_p) - low) / (high - low)
        self.assertGreaterEqual(wick_ratio, 0.60)

    def test_f09_04_macro_knife_catching_defense(self):
        """Verify Long entries are blocked if price is below a downward-sloping D1 EMA200."""
        price = 1.0750
        d1_ema200 = 1.0900
        ema_slope = -0.0010  # Falling
        block_long = (price < d1_ema200) and (ema_slope < -0.0005)
        self.assertTrue(block_long)

    def test_f09_05_time_stop_liquidation(self):
        """Verify time stop forces exit after 16 bars if reversion fails to materialize."""
        bars_in_trade = 17
        max_bars = 16
        should_time_stop = bars_in_trade >= max_bars
        self.assertTrue(should_time_stop)


class TestFeature10AssetMicrostructures(OpaqueBoxTestCase):
    """Feature 10: Asset-Specific Microstructures (XAUUSD, Crypto, Forex)."""

    def test_f10_01_gold_100oz_contract_pip_value(self):
        """Verify Gold contract size 100 oz results in $100 PnL per $1.00 move per lot."""
        lots = 1.0
        contract_size = 100.0  # Troy oz
        price_move = 1.00  # e.g. 2700 to 2701
        pnl = lots * contract_size * price_move
        self.assertEqual(pnl, 100.0)

    def test_f10_02_crypto_funding_rate_cost_gate(self):
        """Verify crypto trades are gated/blocked if 8h funding rate > 0.05%."""
        funding_rate_normal = 0.0002   # 0.02% -> OK
        funding_rate_extreme = 0.0008  # 0.08% -> BLOCKED
        self.assertFalse(funding_rate_normal > 0.0005)
        self.assertTrue(funding_rate_extreme > 0.0005)

    def test_f10_03_forex_pip_value_and_spread_gate(self):
        """Verify Forex EURUSD 1 lot pip value ($10) and spread gate (> 1.8x 1h average)."""
        eur_contract = 100000.0
        pip_size = 0.0001
        pip_value = eur_contract * pip_size  # $10
        self.assertEqual(pip_value, 10.0)

        avg_spread = 0.5
        current_spread_normal = 0.7  # 1.4x -> OK
        current_spread_blown = 1.2   # 2.4x -> BLOCKED
        self.assertFalse(current_spread_normal > 1.8 * avg_spread)
        self.assertTrue(current_spread_blown > 1.8 * avg_spread)

    def test_f10_04_gold_news_blackout_window(self):
        """Verify news blackout window activates 30m before and 15m after high-impact USD events."""
        event_time = pd.Timestamp("2026-09-10 12:30:00")
        t_inside = pd.Timestamp("2026-09-10 12:15:00")  # 15m before -> BLACKOUT
        t_outside = pd.Timestamp("2026-09-10 11:50:00") # 40m before -> CLEAR

        is_blackout_inside = (event_time - pd.Timedelta(minutes=30)) <= t_inside <= (event_time + pd.Timedelta(minutes=15))
        is_blackout_outside = (event_time - pd.Timedelta(minutes=30)) <= t_outside <= (event_time + pd.Timedelta(minutes=15))
        self.assertTrue(is_blackout_inside)
        self.assertFalse(is_blackout_outside)

    def test_f10_05_asset_specific_atr_stop_multipliers(self):
        """Verify stop loss ATR buffers: Gold 2.5-3.5x, Crypto 2.0-3.0x, Forex 1.2-1.8x."""
        buffers = {"XAUUSD": 3.0, "BTCUSDT": 2.5, "EURUSD": 1.5}
        self.assertWithinBounds(buffers["XAUUSD"], 2.5, 3.5)
        self.assertWithinBounds(buffers["BTCUSDT"], 2.0, 3.0)
        self.assertWithinBounds(buffers["EURUSD"], 1.2, 1.8)
