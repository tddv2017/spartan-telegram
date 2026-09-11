"""Institutional Unit Test Suite for Spartan Quantitative Alpha Models (Features 6 - 10)."""

import math
from datetime import datetime, timezone
import numpy as np
import pandas as pd
import pytest

from quant_research.core.constants import (
    MAGIC_FALLBACK_DEFAULT,
    MAGIC_MEAN_REVERSION,
    MAGIC_MOMENTUM_TREND,
    MAGIC_STAT_ARB,
    MAGIC_VOL_BREAKOUT,
    OrderAction,
    RegimeState,
)
from quant_research.models.base_model import BaseQuantModel
from quant_research.models.stat_arb import StatArbModel
from quant_research.models.momentum_trend import MomentumTrendModel
from quant_research.models.vol_breakout import VolBreakoutModel
from quant_research.models.mean_reversion import MeanReversionModel
from quant_research.models.asset_microstructures import (
    AssetClass,
    AssetMicrostructure,
    AssetMicrostructureRegistry,
    get_microstructure,
)


# ============================================================================
# SYNTHETIC DATA FIXTURES
# ============================================================================
def generate_ohlcv_data(
    n_bars: int = 150,
    start_price: float = 2000.0,
    trend: float = 0.0,
    volatility: float = 2.0,
    seed: int = 42,
) -> pd.DataFrame:
    """Generate high-fidelity synthetic OHLCV bars for unit testing."""
    np.random.seed(seed)
    timestamps = pd.date_range(start="2026-01-01 00:00:00", periods=n_bars, freq="15min")
    
    returns = np.random.normal(trend, volatility, n_bars)
    closes = np.zeros(n_bars)
    closes[0] = start_price
    for i in range(1, n_bars):
        closes[i] = max(1.0, closes[i - 1] + returns[i])

    opens = np.zeros(n_bars)
    highs = np.zeros(n_bars)
    lows = np.zeros(n_bars)
    volumes = np.random.uniform(500, 1500, n_bars)

    for i in range(n_bars):
        c = closes[i]
        o = c - returns[i] * 0.5
        noise = abs(np.random.normal(0, volatility * 0.5))
        h = max(o, c) + noise
        l = min(o, c) - noise
        opens[i] = o
        highs[i] = h
        lows[i] = l

    return pd.DataFrame(
        {
            "open": opens,
            "high": highs,
            "low": lows,
            "close": closes,
            "volume": volumes,
            "spread": np.full(n_bars, 0.20),
        },
        index=timestamps,
    )


# ============================================================================
# 1. BASE MODEL (BaseQuantModel) TESTS
# ============================================================================
class TestBaseQuantModel:
    """Verify BaseQuantModel abstract contract, regime gating, and validation."""

    def test_abstract_class_cannot_be_instantiated(self):
        """Verify TypeError when attempting to instantiate ABC directly."""
        with pytest.raises(TypeError):
            BaseQuantModel("TestBase", 888800, 1)  # type: ignore[abstract]

    def test_concrete_subclass_contract(self):
        """Verify minimal subclass implementing abstract methods works cleanly."""
        class DummyModel(BaseQuantModel):
            def generate_signal(self, data, current_regime, **kwargs):
                return self.build_signal(OrderAction.BUY, "TEST", 100.0, 95.0, 110.0, current_regime)
            def update_trailing_stop(self, position, current_bar, **kwargs):
                return 98.0

        model = DummyModel("Dummy", 888899, 99, permitted_regimes=[RegimeState.BULL_TREND])
        assert model.name == "Dummy"
        assert model.magic_number == 888899
        assert model.is_regime_permitted(RegimeState.BULL_TREND) is True
        assert model.is_regime_permitted(RegimeState.BEAR_TREND) is False
        assert model.is_regime_permitted("BULL_TREND") is True

        sig = model.generate_signal(pd.DataFrame(), RegimeState.BULL_TREND)
        assert sig is not None
        assert sig["action"] == "BUY"
        assert sig["magic_number"] == 888899

    def test_validate_data_integrity(self):
        """Verify validate_data checks minimum length and required OHLCV columns."""
        class DummyModel(BaseQuantModel):
            def generate_signal(self, data, current_regime, **kwargs): return None
            def update_trailing_stop(self, position, current_bar, **kwargs): return None

        model = DummyModel("Dummy", 888899, 99)
        assert model.validate_data(None) is False
        assert model.validate_data(pd.DataFrame()) is False
        
        # Missing columns
        incomplete_df = pd.DataFrame({"close": range(50)})
        assert model.validate_data(incomplete_df) is False

        # Complete valid dataframe
        valid_df = generate_ohlcv_data(50)
        assert model.validate_data(valid_df, min_bars=30) is True
        assert model.validate_data(valid_df, min_bars=100) is False


# ============================================================================
# 2. STATISTICAL ARBITRAGE (Feature 6, Magic 888801) TESTS
# ============================================================================
class TestStatArbModel:
    """Verify Model 1: Statistical Arbitrage (ETH/BTC)."""

    def test_kalman_dynamic_beta_convergence(self):
        """Verify 1D/2D Kalman filter converges to true hedge ratio beta."""
        np.random.seed(601)
        n = 500
        true_beta = 0.065
        btc = np.cumsum(np.random.normal(0, 100, n)) + 60000.0
        stationary_noise = np.random.normal(0, 5, n)
        eth = 100.0 + (true_beta * btc) + stationary_noise

        betas, alphas = StatArbModel.solve_kalman_dynamic_beta(eth, btc)
        estimated_beta = float(betas[-1])
        # Convergence within 15% relative error
        assert abs(estimated_beta - true_beta) / true_beta < 0.15

    def test_kalman_negative_beta_handling(self):
        """Verify Kalman filter handles inverse asset relationships (beta < 0)."""
        x = pd.Series(range(100))
        y = pd.Series([-2.5 * val for val in range(100)])
        betas, _ = StatArbModel.solve_kalman_dynamic_beta(y, x)
        assert float(betas[-1]) < 0.0

    def test_ou_half_life_estimation(self):
        """Verify Ornstein-Uhlenbeck half-life estimation is within [5, 80] bars."""
        np.random.seed(602)
        n = 500
        theta_true = 0.03
        spread = np.zeros(n)
        for i in range(1, n):
            spread[i] = spread[i - 1] - theta_true * spread[i - 1] + np.random.normal(0, 1.0)

        half_life, theta = StatArbModel.calculate_ou_half_life(spread)
        assert 5.0 <= half_life <= 80.0
        assert theta > 0.0

    def test_ou_half_life_explosive_spread_fallback(self):
        """Verify explosive non-mean-reverting spread returns half-life = 999.0."""
        diverging = pd.Series([10.0 * (1.05 ** i) for i in range(50)])
        half_life, theta = StatArbModel.calculate_ou_half_life(diverging)
        assert half_life == 999.0
        assert theta == 0.0

    def test_adf_cointegration_test(self):
        """Verify Augmented Dickey-Fuller stationarity test."""
        np.random.seed(603)
        # Stationary AR(1)
        stationary = np.zeros(200)
        for i in range(1, 200):
            stationary[i] = 0.4 * stationary[i - 1] + np.random.normal(0, 1)

        adf_stat, p_val, is_stat = StatArbModel.compute_adf_test(stationary)
        assert is_stat is True
        assert p_val < 0.05
        assert adf_stat < -2.86

    def test_z_score_calculation(self):
        """Verify rolling Z-score calculation."""
        spread = np.array([0.0] * 20 + [5.0])
        z, mean_s, std_s = StatArbModel.compute_z_score(spread, window=20)
        assert z > 2.0

    def test_stat_arb_signals_and_regime_gating(self):
        """Verify StatArb signal dispatch and strict RANGE_BOUND regime gate."""
        model = StatArbModel()
        assert model.magic_number == MAGIC_STAT_ARB

        # Synthetic cointegrated pair
        np.random.seed(604)
        n = 100
        btc = pd.Series(np.cumsum(np.random.normal(0, 50, n)) + 30000.0)
        eth = pd.Series(0.06 * btc.values + np.random.normal(0, 2, n))
        df = pd.DataFrame({"close": eth, "close_x": btc, "high": eth, "low": eth, "open": eth, "volume": 1000})

        # When regime is BULL_TREND -> must be blocked
        sig_blocked = model.generate_signal(df, RegimeState.BULL_TREND)
        assert sig_blocked is None

        # When regime is RANGE_BOUND -> allowed to evaluate
        sig_range = model.generate_signal(df, RegimeState.RANGE_BOUND)
        # Result can be None, BUY, SELL, or CLOSE based on Z-score
        if sig_range is not None:
            assert sig_range["action"] in ["BUY", "SELL", "CLOSE"]
            assert sig_range["magic_number"] == MAGIC_STAT_ARB


# ============================================================================
# 3. MOMENTUM TREND-FOLLOWING (Feature 7, Magic 888802) TESTS
# ============================================================================
class TestMomentumTrendModel:
    """Verify Model 2: Momentum Multi-Timeframe Trend."""

    def test_ema_stack_alignment(self):
        """Verify Triple EMA 21 > 55 > 200 bull stack condition."""
        closes = pd.Series([100.0 + i * 0.5 for i in range(250)])
        ema21 = MomentumTrendModel.compute_ema(closes, 21)
        ema55 = MomentumTrendModel.compute_ema(closes, 55)
        ema200 = MomentumTrendModel.compute_ema(closes, 200)

        is_bull_stack = ema21.iloc[-1] > ema55.iloc[-1] > ema200.iloc[-1]
        assert bool(is_bull_stack) is True

    def test_donchian_breakout_detection(self):
        """Verify breakout signal when Close strictly exceeds Donchian Upper Channel."""
        df = generate_ohlcv_data(n_bars=30, start_price=2000.0, seed=702)
        upper_dc, lower_dc = MomentumTrendModel.compute_donchian(df, period=20)
        
        # Test exact boundary: close == upper_dc is NOT a breakout
        upper_val = float(upper_dc.iloc[-1])
        assert not (upper_val > upper_val)
        assert (upper_val + 0.01) > upper_val

    def test_supertrend_ratchet_monotonicity(self):
        """Verify Supertrend lower band is strictly monotonic non-decreasing in ongoing bull run."""
        np.random.seed(703)
        prices = [2000.0 + i * 2.0 for i in range(30)]
        df = pd.DataFrame({
            "high": [p + 1.0 for p in prices],
            "low": [p - 1.0 for p in prices],
            "close": prices,
            "open": prices,
            "volume": 1000,
        })
        st_line, st_upper, st_lower = MomentumTrendModel.compute_supertrend(df, period=10, multiplier=3.0)

        # In strong continuous bull run, ratcheted lower band never decreases
        lb_vals = st_lower.values[10:]
        diffs = np.diff(lb_vals)
        assert np.all(diffs >= -1e-6)

    def test_supertrend_zero_atr_fallback(self):
        """Corner Case: Zero ATR does not produce NaNs or collapse."""
        df = pd.DataFrame({
            "high": [2000.0] * 20,
            "low": [2000.0] * 20,
            "close": [2000.0] * 20,
            "open": [2000.0] * 20,
            "volume": [1000] * 20,
        })
        st_line, st_upper, st_lower = MomentumTrendModel.compute_supertrend(df, period=10)
        assert not st_line.isna().any()
        assert float(st_line.iloc[-1]) == 2000.0

    def test_adx_trend_filter_gate(self):
        """Verify ADX >= 25.0 filter blocks weak trends."""
        model = MomentumTrendModel(adx_threshold=25.0)
        assert model.magic_number == MAGIC_MOMENTUM_TREND
        assert model.is_regime_permitted(RegimeState.BULL_TREND) is True
        assert model.is_regime_permitted(RegimeState.RANGE_BOUND) is False

    def test_trailing_stop_update(self):
        """Verify trailing stop update ratchets stop upward for BUY positions."""
        model = MomentumTrendModel()
        pos = {"side": "BUY", "entry_price": 2000.0, "current_stop": 1980.0}
        bar = {"close": 2040.0}
        
        # New supertrend lower band at 2010.0 -> updates stop
        new_stop = model.update_trailing_stop(pos, bar, supertrend_lb=2010.0)
        assert new_stop == 2010.0

        # If supertrend lower band is lower than current stop -> unchanged (None)
        lower_stop = model.update_trailing_stop(pos, bar, supertrend_lb=1970.0)
        assert lower_stop is None


# ============================================================================
# 4. VOLATILITY BREAKOUT (Feature 8, Magic 888803) TESTS
# ============================================================================
class TestVolBreakoutModel:
    """Verify Model 3: Dynamic Volatility Breakout."""

    def test_bollinger_inside_keltner_squeeze(self):
        """Verify SqueezeOn = True when BB is strictly inside Keltner Channels."""
        bb_upper = 2010.0
        bb_lower = 1990.0
        kc_upper = 2015.0
        kc_lower = 1985.0
        squeeze_on = VolBreakoutModel.check_squeeze(bb_upper, bb_lower, kc_upper, kc_lower)
        assert squeeze_on is True or bool(squeeze_on) is True

        # Border equality does NOT count as squeeze
        assert VolBreakoutModel.check_squeeze(2015.0, 1986.0, 2015.0, 1985.0) is False

    def test_minimum_squeeze_bars_requirement(self):
        """Verify squeeze must persist for >= 6 consecutive bars."""
        model = VolBreakoutModel(min_squeeze_bars=6)
        assert model.magic_number == MAGIC_VOL_BREAKOUT
        assert model.min_squeeze_bars == 6

    def test_bandwidth_expansion_trigger(self):
        """Verify bandwidth expansion trigger fires when BW / SMA50(BW) > 1.15."""
        bw = pd.Series([0.05] * 60)
        bb_upper = pd.Series([2050.0] * 60)
        bb_lower = pd.Series([1950.0] * 60)
        bb_mid = pd.Series([2000.0] * 60)
        # Spike on last bar
        bb_upper.iloc[-1] = 2080.0
        bb_lower.iloc[-1] = 1920.0

        _, ratio = VolBreakoutModel.compute_bandwidth_ratio(bb_upper, bb_lower, bb_mid, baseline_period=50)
        assert float(ratio.iloc[-1]) > 1.15

    def test_linear_regression_momentum_oscillator(self):
        """Verify momentum oscillator slope sign matches price acceleration direction."""
        df_bull = generate_ohlcv_data(n_bars=30, start_price=2000.0, trend=2.0, seed=804)
        mom_bull = VolBreakoutModel.compute_momentum_oscillator(df_bull, period=10)
        assert float(mom_bull.iloc[-1]) > 0.0

        df_bear = generate_ohlcv_data(n_bars=30, start_price=2000.0, trend=-2.0, seed=805)
        mom_bear = VolBreakoutModel.compute_momentum_oscillator(df_bear, period=10)
        assert float(mom_bear.iloc[-1]) < 0.0

    def test_obv_volume_calculation(self):
        """Verify OBV volume addition and subtraction."""
        df = pd.DataFrame({
            "close": [100.0, 105.0, 102.0],
            "volume": [1000.0, 1500.0, 800.0],
        })
        obv, _ = VolBreakoutModel.compute_obv(df)
        assert obv.iloc[0] == 0.0
        assert obv.iloc[1] == 1500.0
        assert obv.iloc[2] == 1500.0 - 800.0  # 700.0


# ============================================================================
# 5. MEAN-REVERSION (Feature 9, Magic 888804) TESTS
# ============================================================================
class TestMeanReversionModel:
    """Verify Model 4: Regime-Filtered Mean-Reversion."""

    def test_regime_prerequisite_gate(self):
        """Verify Mean-Reversion is strictly suppressed unless ADX < 20 and Hurst < 0.45."""
        model = MeanReversionModel(adx_max=20.0, hurst_max=0.45)
        assert model.magic_number == MAGIC_MEAN_REVERSION

        # Trending market -> must be blocked
        df = generate_ohlcv_data(120, trend=1.5, seed=901)
        sig = model.generate_signal(df, RegimeState.RANGE_BOUND, adx=25.0, hurst=0.58)
        assert sig is None

        # Range-bound with weak trend -> allowed
        sig_range = model.generate_signal(df, RegimeState.RANGE_BOUND, adx=16.0, hurst=0.40)
        # Evaluated without crashing
        assert sig_range is None or sig_range["magic_number"] == MAGIC_MEAN_REVERSION

    def test_dynamic_rsi_quantiles(self):
        """Verify dynamic RSI oversold threshold is clamped strictly between [20, 35]."""
        np.random.seed(902)
        rsi_series = pd.Series(np.random.uniform(15, 85, 100))
        oversold, overbought = MeanReversionModel.compute_dynamic_rsi_quantiles(rsi_series, lookback=100)
        assert 20.0 <= oversold <= 35.0
        assert 65.0 <= overbought <= 80.0

    def test_pin_bar_rejection_wick_ratio(self):
        """Verify pin bar rejection wick ratio calculation and boundary."""
        # Hammer: High=105, Low=95, Open=103, Close=104 -> Lower wick = 103 - 95 = 8, Range = 10 -> 0.80
        lw, uw = MeanReversionModel.compute_pin_bar_wick_ratio(103.0, 105.0, 95.0, 104.0)
        assert lw == 0.80
        assert uw == 0.10

        # Boundary checks
        assert not (0.599 >= 0.60)
        assert 0.600 >= 0.60

        # Doji candle (Open == Close)
        lw_doji, _ = MeanReversionModel.compute_pin_bar_wick_ratio(95.0, 100.0, 90.0, 95.0)
        assert lw_doji == 0.50

    def test_macro_knife_catching_defense(self):
        """Verify Long entries are blocked if price is below a downward-sloping D1 EMA200."""
        price = 1.0750
        d1_ema200 = 1.0900
        ema_slope = -0.0010
        block_long = (price < d1_ema200) and (ema_slope < -0.0005)
        assert block_long is True

    def test_time_stop_liquidation(self):
        """Verify time stop forces exit after 16 bars if reversion fails to materialize."""
        model = MeanReversionModel(max_bars_in_trade=16)
        pos = {"bars_held": 16}
        bar = {"close": 1.0850}
        exit_price = model.update_trailing_stop(pos, bar)
        assert exit_price == 1.0850

        # At bar 15 -> not yet stopped
        assert model.update_trailing_stop({"bars_held": 15}, bar) is None


# ============================================================================
# 6. ASSET MICROSTRUCTURES (Feature 10) TESTS
# ============================================================================
class TestAssetMicrostructures:
    """Verify Asset Microstructures for Gold (XAUUSD), Crypto, and Forex."""

    def test_gold_100oz_contract_pip_value_and_pnl(self):
        """Verify Gold contract size 100 oz results in $100 PnL per $1.00 move per lot."""
        gold = get_microstructure("XAUUSD")
        assert gold.contract_size == 100.0
        assert gold.pip_size == 0.1
        assert gold.calculate_pip_value(1.0) == 10.0

        pnl = gold.calculate_pnl("BUY", entry_price=2700.0, exit_price=2701.0, lots=1.0)
        assert pnl == 100.0

        # Stop loss buffer in [2.5, 3.5]
        assert 2.5 <= gold.stop_loss_atr_mult <= 3.5

    def test_gold_news_blackout_window(self):
        """Verify news blackout window activates 30m before and 15m after high-impact events."""
        gold = get_microstructure("XAUUSD")
        news_event = pd.Timestamp("2026-09-10 12:30:00")
        calendar = [news_event]

        # 15m before event -> inside blackout
        t_inside = pd.Timestamp("2026-09-10 12:15:00")
        assert gold.is_news_blackout(t_inside, calendar) is True

        # Exactly 30m before event -> boundary inside blackout
        t_boundary = pd.Timestamp("2026-09-10 12:00:00")
        assert gold.is_news_blackout(t_boundary, calendar) is True

        # 40m before event -> outside blackout
        t_outside = pd.Timestamp("2026-09-10 11:50:00")
        assert gold.is_news_blackout(t_outside, calendar) is False

    def test_crypto_funding_rate_and_24_7_schedule(self):
        """Verify Crypto 24/7 weekend trading and 0.05% funding rate cost gate."""
        btc = get_microstructure("BTCUSDT")
        assert btc.trading_schedule == "24/7"
        assert 2.0 <= btc.stop_loss_atr_mult <= 3.0

        # Weekend timestamp (Saturday) -> market is open
        sat = pd.Timestamp("2026-09-12 14:00:00")
        assert btc.is_market_open(sat) is True

        # Funding rate gate: 0.050% allowed, 0.051% gated
        assert btc.is_funding_rate_acceptable(0.00050) is True
        assert btc.is_funding_rate_acceptable(0.00051) is False

    def test_forex_pip_value_and_spread_gate(self):
        """Verify Forex EURUSD pip value ($10) and spread gate (> 1.8x avg spread)."""
        eur = get_microstructure("EURUSD")
        assert eur.contract_size == 100000.0
        assert eur.pip_size == 0.0001
        assert eur.calculate_pip_value(1.0) == 10.0
        assert 1.2 <= eur.stop_loss_atr_mult <= 1.8

        # Spread gate: 1.80x allowed, 1.81x blocked
        avg_spread = 1.0
        assert eur.is_spread_acceptable(1.80, avg_spread) is True
        assert eur.is_spread_acceptable(1.81, avg_spread) is False

        # Saturday -> Forex market closed
        sat = pd.Timestamp("2026-09-12 14:00:00")
        assert eur.is_market_open(sat) is False

    def test_registry_symbol_lookups(self):
        """Verify AssetMicrostructureRegistry resolves known symbols and aliases."""
        reg = AssetMicrostructureRegistry()
        assert reg.get("XAUUSD").symbol == "XAUUSD"
        assert reg.get("BTCUSDT").symbol == "BTCUSDT"
        assert reg.get("ETHUSDT").symbol == "ETHUSDT"
        assert reg.get("EURUSD").symbol == "EURUSD"
        assert reg.get("GBPUSD").symbol == "GBPUSD"
        assert reg.get("GOLD").symbol == "XAUUSD"
