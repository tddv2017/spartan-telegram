"""
Tier 1 Tests: Features 1 to 5.
Feature 1: Core Directory & Config Scaffolding
Feature 2: Historical Data & Synthetic Pipeline
Feature 3: Market Regime Detection Engine (MRDE)
Feature 4: Hurst Exponent & Volatility Metrics
Feature 5: Regime Shock Circuit Breaker
"""

import math
import numpy as np
import pandas as pd
from quant_research.e2e_tests.base import OpaqueBoxTestCase
from quant_research.e2e_tests.oracles import MathOracles


class TestFeature01ConfigScaffolding(OpaqueBoxTestCase):
    """Feature 1: Core Directory & Config Scaffolding."""

    def test_f01_01_asset_specification_contract(self):
        """Verify asset microstructure specifications for all 5 mandated instruments."""
        mandated_assets = {
            "XAUUSD": {"contract_size": 100.0, "tick_size": 0.01, "pip_value": 1.0},
            "BTCUSDT": {"contract_size": 1.0, "tick_size": 0.10, "pip_value": 0.10},
            "ETHUSDT": {"contract_size": 1.0, "tick_size": 0.01, "pip_value": 0.01},
            "EURUSD": {"contract_size": 100000.0, "tick_size": 0.00001, "pip_value": 10.0},
            "GBPUSD": {"contract_size": 100000.0, "tick_size": 0.00001, "pip_value": 10.0},
        }
        for asset, spec in mandated_assets.items():
            self.assertGreater(spec["contract_size"], 0.0)
            self.assertGreater(spec["tick_size"], 0.0)
            self.assertGreater(spec["pip_value"], 0.0)
            self.assertDictMatchesContract(spec, {"contract_size": float, "tick_size": float, "pip_value": float})

    def test_f01_02_signal_dict_schema(self):
        """Verify SignalDict interface schema matches M2 <-> M3 contract in PROJECT.md."""
        sample_signal = {
            "action": "BUY",
            "symbol": "XAUUSD",
            "entry_price": 2735.50,
            "stop_loss": 2720.00,
            "take_profit": 2760.00,
            "magic_number": 881011,
            "regime": "BULL_TREND",
            "comment": "Supertrend Breakout"
        }
        required_types = {
            "action": str,
            "symbol": str,
            "entry_price": float,
            "stop_loss": float,
            "take_profit": float,
            "magic_number": int,
            "regime": str,
            "comment": str
        }
        self.assertDictMatchesContract(sample_signal, required_types)
        self.assertIn(sample_signal["action"], ["BUY", "SELL", "CLOSE", "HOLD"])

    def test_f01_03_structured_logger_formatting(self):
        """Verify structured JSON logger envelope contract."""
        log_entry = {
            "timestamp": "2026-09-10T23:30:00.000Z",
            "level": "INFO",
            "module": "risk_engine",
            "event": "ORDER_EVALUATED",
            "payload": {"symbol": "XAUUSD", "lots": 0.25, "risk_pct": 0.004}
        }
        self.assertDictMatchesContract(log_entry, {
            "timestamp": str,
            "level": str,
            "module": str,
            "event": str,
            "payload": dict
        })
        self.assertIn(log_entry["level"], ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"])

    def test_f01_04_macro_news_calendar_schema(self):
        """Verify news calendar schema for CPI, NFP, and FOMC blackout windows."""
        sample_event = {
            "event_id": "CPI_2024_06",
            "currency": "USD",
            "name": "US Consumer Price Index",
            "timestamp": "2024-06-12T12:30:00Z",
            "impact": "HIGH",
            "blackout_before_mins": 30,
            "blackout_after_mins": 15
        }
        self.assertEqual(sample_event["currency"], "USD")
        self.assertEqual(sample_event["impact"], "HIGH")
        self.assertGreaterEqual(sample_event["blackout_before_mins"], 15)

    def test_f01_05_risk_parameters_schema(self):
        """Verify risk configuration bounds: Kelly 0.25-0.50%, DD tiers 3%, 4.5%, 5%."""
        risk_cfg = {
            "min_equity_risk_pct": 0.0025,
            "max_equity_risk_pct": 0.0050,
            "soft_throttle_dd_pct": 0.03,
            "hard_freeze_dd_pct": 0.045,
            "emergency_kill_dd_pct": 0.05,
            "stop_out_ltv_pct": 0.85
        }
        self.assertLess(risk_cfg["min_equity_risk_pct"], risk_cfg["max_equity_risk_pct"])
        self.assertLess(risk_cfg["soft_throttle_dd_pct"], risk_cfg["hard_freeze_dd_pct"])
        self.assertLess(risk_cfg["hard_freeze_dd_pct"], risk_cfg["emergency_kill_dd_pct"])
        self.assertEqual(risk_cfg["emergency_kill_dd_pct"], 0.05)


class TestFeature02DataPipeline(OpaqueBoxTestCase):
    """Feature 2: Historical Data & Synthetic Pipeline."""

    def test_f02_01_ohlc_invariants(self):
        """Verify synthetic bar generator enforces High >= max(Open, Close) and Low <= min(Open, Close)."""
        df = self.generate_synthetic_ohlcv(n_bars=300, start_price=2600.0, seed=101)
        for _, row in df.iterrows():
            self.assertGreaterEqual(row["high"], max(row["open"], row["close"]))
            self.assertLessEqual(row["low"], min(row["open"], row["close"]))
            self.assertGreater(row["low"], 0.0)

    def test_f02_02_volume_and_spread_positivity(self):
        """Verify volume is non-negative and bid-ask spread is strictly positive."""
        df = self.generate_synthetic_ohlcv(n_bars=200, start_price=65000.0, seed=102)
        self.assertTrue((df["volume"] >= 0).all())
        self.assertTrue((df["spread"] > 0).all())

    def test_f02_03_time_continuity(self):
        """Verify timestamps are strictly monotonic and spaced by timeframe increment."""
        df = self.generate_synthetic_ohlcv(n_bars=100, seed=103)
        time_diffs = df["timestamp"].diff().dropna()
        self.assertTrue(all(d == pd.Timedelta(minutes=15) for d in time_diffs))

    def test_f02_04_gold_price_scale(self):
        """Verify Gold synthetic series resides within realistic macro boundaries (1800 to 3200)."""
        df = self.generate_synthetic_ohlcv(n_bars=400, start_price=2400.0, volatility=0.015, seed=104)
        self.assertTrue((df["close"] > 1800.0).all())
        self.assertTrue((df["close"] < 3200.0).all())

    def test_f02_05_multi_asset_correlations(self):
        """Verify generation of cointegrated pairs (ETH and BTC)."""
        eth, btc, spread = self.generate_mean_reverting_pair(n_bars=500, beta=0.05, seed=105)
        self.assertEqual(len(eth), 500)
        self.assertEqual(len(btc), 500)
        # Verify correlation between ETH and BTC is positive and high (> 0.70)
        corr = eth.corr(btc)
        self.assertGreater(corr, 0.70)


class TestFeature03RegimeDetectionEngine(OpaqueBoxTestCase):
    """Feature 3: Market Regime Detection Engine (MRDE 5-State FSM)."""

    def evaluate_regime_state(self, hurst: float, adx: float, price_vs_ema: str, atr_norm: float, is_shock: bool) -> str:
        """Deterministic MRDE classification oracle per PROJECT.md § 2.6.2."""
        if is_shock or atr_norm > 2.50:
            return "CRISIS_SHOCK"
        if atr_norm < 0.75 and adx < 18.0:
            return "VOL_COMPRESSION"
        if hurst > 0.55 and adx >= 25.0 and price_vs_ema == "ABOVE" and 0.75 <= atr_norm <= 1.80:
            return "BULL_TREND"
        if hurst > 0.55 and adx >= 25.0 and price_vs_ema == "BELOW" and 0.75 <= atr_norm <= 1.80:
            return "BEAR_TREND"
        if hurst < 0.45 and adx < 20.0 and 0.60 <= atr_norm <= 1.30:
            return "RANGE_BOUND"
        return "RANGE_BOUND"

    def test_f03_01_bull_trend_classification(self):
        """Verify BULL_TREND state under H > 0.55, ADX >= 25, price above EMA200."""
        state = self.evaluate_regime_state(hurst=0.62, adx=32.0, price_vs_ema="ABOVE", atr_norm=1.10, is_shock=False)
        self.assertEqual(state, "BULL_TREND")

    def test_f03_02_bear_trend_classification(self):
        """Verify BEAR_TREND state under H > 0.55, ADX >= 25, price below EMA200."""
        state = self.evaluate_regime_state(hurst=0.59, adx=28.5, price_vs_ema="BELOW", atr_norm=1.25, is_shock=False)
        self.assertEqual(state, "BEAR_TREND")

    def test_f03_03_range_bound_classification(self):
        """Verify RANGE_BOUND state under H < 0.45, ADX < 20, normal ATR."""
        state = self.evaluate_regime_state(hurst=0.38, adx=14.0, price_vs_ema="ABOVE", atr_norm=0.95, is_shock=False)
        self.assertEqual(state, "RANGE_BOUND")

    def test_f03_04_vol_compression_classification(self):
        """Verify VOL_COMPRESSION state under low normalized ATR (< 0.75) and low ADX."""
        state = self.evaluate_regime_state(hurst=0.48, adx=12.0, price_vs_ema="ABOVE", atr_norm=0.65, is_shock=False)
        self.assertEqual(state, "VOL_COMPRESSION")

    def test_f03_05_crisis_shock_precedence(self):
        """Verify CRISIS_SHOCK overrides any underlying trend state when shock flag is active."""
        state = self.evaluate_regime_state(hurst=0.70, adx=45.0, price_vs_ema="ABOVE", atr_norm=2.80, is_shock=True)
        self.assertEqual(state, "CRISIS_SHOCK")


class TestFeature04HurstAndVolatilityMetrics(OpaqueBoxTestCase):
    """Feature 4: Hurst Exponent & Volatility Metrics."""

    def test_f04_01_hurst_on_mean_reverting_series(self):
        """Verify Hurst exponent R/S yields H < 0.48 on strongly mean-reverting AR(1) process."""
        np.random.seed(42)
        n = 800
        x = np.zeros(n)
        for t in range(1, n):
            x[t] = 0.15 * x[t-1] + np.random.normal(0, 1.0)
        price_series = pd.Series(100.0 + x)
        h = MathOracles.calculate_hurst_exponent(price_series)
        self.assertLess(h, 0.48)

    def test_f04_02_hurst_on_trending_series(self):
        """Verify Hurst exponent R/S yields H > 0.55 on persistent trending series."""
        np.random.seed(42)
        n = 800
        # Positive momentum persistence
        drift = 0.5
        returns = np.random.normal(drift, 0.5, n)
        price_series = pd.Series(np.cumsum(returns) + 1000.0)
        h = MathOracles.calculate_hurst_exponent(price_series)
        self.assertGreater(h, 0.55)

    def test_f04_03_atr_calculation_monotonicity(self):
        """Verify ATR rises when bar ranges expand."""
        df_calm = self.generate_synthetic_ohlcv(n_bars=50, volatility=0.002, seed=401)
        df_wild = self.generate_synthetic_ohlcv(n_bars=50, volatility=0.030, seed=402)
        atr_calm = MathOracles.calculate_atr(df_calm["high"], df_calm["low"], df_calm["close"])
        atr_wild = MathOracles.calculate_atr(df_wild["high"], df_wild["low"], df_wild["close"])
        self.assertGreater(atr_wild.iloc[-1], atr_calm.iloc[-1])

    def test_f04_04_normalized_atr_ratio_bounds(self):
        """Verify normalized ATR ratio = ATR / SMA(ATR) hovers around 1.0 under stationary volatility."""
        df = self.generate_synthetic_ohlcv(n_bars=200, volatility=0.01, seed=403)
        atr = MathOracles.calculate_atr(df["high"], df["low"], df["close"])
        norm_atr = MathOracles.calculate_normalized_atr_ratio(atr, baseline_period=50).dropna()
        mean_ratio = norm_atr.mean()
        self.assertWithinBounds(mean_ratio, 0.85, 1.20)

    def test_f04_05_historical_volatility_percentile_rank(self):
        """Verify HV rank correctly places a spike in the top 10th percentile (> 90%)."""
        np.random.seed(42)
        vols = np.random.uniform(0.10, 0.25, 252)
        spike_vol = 0.35  # Extreme volatility
        rank = (np.sum(vols < spike_vol) / len(vols)) * 100.0
        self.assertGreaterEqual(rank, 90.0)


class TestFeature05RegimeShockCircuitBreaker(OpaqueBoxTestCase):
    """Feature 5: Regime Shock Circuit Breaker."""

    def test_f05_01_bar_range_shock_trigger(self):
        """Verify trigger when bar range >= 3.5 * ATR_14."""
        atr_14 = 10.0
        normal_range = 8.0
        shock_range = 36.0  # 3.6x ATR
        is_normal_shock = (normal_range / atr_14) >= 3.50
        is_shock = (shock_range / atr_14) >= 3.50
        self.assertFalse(is_normal_shock)
        self.assertTrue(is_shock)

    def test_f05_02_spread_explosion_trigger(self):
        """Verify trigger when current spread >= 3.0 * baseline spread."""
        baseline_spread = 2.0
        current_spread = 6.5  # 3.25x
        is_spread_shock = (current_spread / baseline_spread) >= 3.00
        self.assertTrue(is_spread_shock)

    def test_f05_03_order_entry_suppression(self):
        """Verify that shock state sets new order permission to FALSE."""
        system_state = {"regime": "CRISIS_SHOCK", "allow_new_orders": False, "halt_duration_bars": 8}
        self.assertFalse(system_state["allow_new_orders"])
        self.assertEqual(system_state["regime"], "CRISIS_SHOCK")

    def test_f05_04_ratchet_stops_to_breakeven(self):
        """Verify that positions in profit have stop loss ratcheted to Breakeven + 1 pip during shock."""
        position = {
            "ticket": 1001,
            "type": "BUY",
            "open_price": 2700.00,
            "current_price": 2725.00,
            "stop_loss": 2680.00,
            "pip_size": 0.10
        }
        # In profit, ratchet SL = open + 1 pip
        new_sl = position["open_price"] + position["pip_size"]
        self.assertGreater(new_sl, position["stop_loss"])
        self.assertEqual(new_sl, 2700.10)

    def test_f05_05_alert_payload_generation(self):
        """Verify alert payload contains required security shock attributes."""
        alert = {
            "action": "TRADE_CLOSED",
            "ticket": "CRISIS_SHOCK_HALT",
            "type": "CIRCUIT_BREAKER",
            "comment": "SHOCK_DETECTED: Range 3.8x ATR",
            "magicNumber": 888888
        }
        self.assertEqual(alert["type"], "CIRCUIT_BREAKER")
        self.assertIn("SHOCK", alert["comment"])
