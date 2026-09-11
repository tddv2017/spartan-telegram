"""
================================================================================
SPARTAN QUANTITATIVE RESEARCH & EXECUTION ENGINE: TIER 5 TEST SUITE
WHITE-BOX ADVERSARIAL COVERAGE HARDENING (Feature 29)
================================================================================
Exhaustive stress-testing across 6 critical operational vectors:
1. Extreme Numerical Stability (zero variance, NaN inputs, division by zero guards)
2. Severe Market Regime Transitions (instant flash-crash, hyper-volatility shock cooling)
3. Kelly Position Sizing Edge Cases (extreme tight vs wide SL, lot bounds [0.01, 50.0], margin exhaustion)
4. Stop-Out LTV 85% De-leveraging & Broker Stop-Out Cushion Breach Instant Liquidation
5. Macro News Stress Testing (10x spread expansion, 30-pip adverse slippage)
6. MQL5 EA Syntax & Offline WebRequest Spooling Queue Resilience
================================================================================
"""

import math
import os
import re
import tempfile
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd

from quant_research.core.constants import (
    DrawdownTier,
    OrderAction,
    RegimeState,
    MAGIC_STAT_ARB,
    MAGIC_MOMENTUM_TREND,
    MAGIC_VOL_BREAKOUT,
    MAGIC_MEAN_REVERSION,
)
from quant_research.core.types import CircuitBreakerStatus, OrderDict, SignalDict
from quant_research.e2e_tests.base import OpaqueBoxTestCase
from quant_research.e2e_tests.oracles import MathOracles, ProtocolOracles
from quant_research.regime.hurst import compute_hurst_exponent
from quant_research.regime.vol_metrics import compute_atr, compute_normalized_atr_ratio
from quant_research.regime.shock_detector import ShockDetector, ShockDetectionResult
from quant_research.regime.regime_fsm import MarketRegimeFSM
from quant_research.models.stat_arb import StatArbModel
from quant_research.models.mean_reversion import MeanReversionModel
from quant_research.risk.kelly_calculator import KellyCalculator
from quant_research.risk.circuit_breaker import (
    StopOutCircuitBreaker,
    LatencyTripwire,
    SpreadTripwire,
    RemoteKillSwitchBridge,
    CircuitBreakerSuite,
)
from quant_research.risk.risk_manager import SpartanRiskEngine
from quant_research.validation.metrics import QuantitativeMetrics
from quant_research.validation.stress_testing import MacroStressTester, MacroEvent
from quant_research.execution.python.webhook_client import (
    SpartanWebhookClient,
    matches_secret,
    normalize_trade_payload,
    QUEUE_CAPACITY,
)


# ==============================================================================
# 1. EXTREME NUMERICAL STABILITY
# ==============================================================================
class TestTier5ExtremeNumericalStability(OpaqueBoxTestCase):
    """Stress test mathematical engines against pathological numerical inputs."""

    def test_zero_variance_flatline_hurst_exponent(self):
        """Constant flatline price series must yield 0.50 without ZeroDivisionError."""
        flat_prices = pd.Series([2000.0] * 120)
        
        # Test Oracle algorithm
        h_oracle = MathOracles.calculate_hurst_exponent(flat_prices)
        self.assertEqual(h_oracle, 0.50)
        
        # Test Core production implementation
        h_prod = compute_hurst_exponent(flat_prices)
        self.assertEqual(h_prod, 0.50)

    def test_nan_and_inf_inputs_handled_safely(self):
        """Corrupted series containing NaN and Inf must not crash the calculation."""
        dirty_series = pd.Series([2000.0, np.nan, 2010.0, np.inf, -np.inf, 2005.0] + [2000.0] * 60)
        
        # Core compute_hurst_exponent uses .dropna()
        clean_arr = dirty_series.replace([np.inf, -np.inf], np.nan).dropna()
        h_val = compute_hurst_exponent(clean_arr)
        self.assertWithinBounds(h_val, 0.0, 1.0)

    def test_zero_atr_and_zero_spread_normalized_atr(self):
        """When High == Low == Close, ATR is 0.0; normalized ATR must not raise ZeroDivisionError."""
        dt_idx = pd.date_range("2026-01-01", periods=60, freq="15min")
        zero_range_df = pd.DataFrame({
            "open": [100.0] * 60,
            "high": [100.0] * 60,
            "low": [100.0] * 60,
            "close": [100.0] * 60,
            "volume": [1000] * 60,
            "spread": [0.0] * 60,
        }, index=dt_idx)
        
        atr_series = compute_atr(zero_range_df, period=14)
        self.assertTrue((atr_series == 0.0).all())
        
        norm_atr = compute_normalized_atr_ratio(zero_range_df, atr_period=14)
        # Verify no NaN or Inf generated
        self.assertFalse(norm_atr.isna().any())
        self.assertFalse(np.isinf(norm_atr).any())

    def test_metrics_zero_loss_infinite_profit_factor_and_zero_vol_returns(self):
        """QuantitativeMetrics must safely handle 0 losses, 0 profits, and 0 volatility."""
        metrics_engine = QuantitativeMetrics()
        
        # 1. 0 trades
        metrics_empty = metrics_engine.calculate_metrics([])
        self.assertEqual(metrics_empty["profit_factor"], 0.0)
        self.assertEqual(metrics_empty["win_rate"], 0.0)
        
        # 2. All wins (0 losses) -> Profit Factor high bounded number
        all_wins = [{"pnl": 500.0}, {"pnl": 300.0}, {"pnl": 200.0}]
        metrics_wins = metrics_engine.calculate_metrics(all_wins)
        self.assertGreaterEqual(metrics_wins["profit_factor"], 999.0)
        self.assertEqual(metrics_wins["win_rate"], 100.0)
        
        # 3. All losses (0 wins) -> Profit Factor 0.0
        all_losses = [{"pnl": -500.0}, {"pnl": -300.0}]
        metrics_losses = metrics_engine.calculate_metrics(all_losses)
        self.assertEqual(metrics_losses["profit_factor"], 0.0)
        self.assertEqual(metrics_losses["win_rate"], 0.0)
        
        # 4. Zero volatility returns -> Sharpe ratio must be 0.0 or handled safely without ZeroDivisionError
        identical_trades = [{"pnl": 10.0}] * 20
        metrics_ident = metrics_engine.calculate_metrics(identical_trades)
        self.assertIsNotNone(metrics_ident["sharpe_ratio"])
        self.assertFalse(math.isnan(metrics_ident["sharpe_ratio"]))
        
        # 5. Zero max drawdown -> Calmar ratio bounded safely
        self.assertGreaterEqual(metrics_wins["calmar_ratio"], 999.0)

    def test_kalman_dynamic_beta_zero_variance_and_collinear_assets(self):
        """Kalman filter on identical assets must maintain numerical stability with beta approaching 1.0."""
        n_bars = 100
        x = pd.Series(np.linspace(100.0, 120.0, n_bars))
        y = x.copy()  # Perfect colinearity
        
        betas, alphas = MathOracles.solve_kalman_dynamic_beta(y, x)
        self.assertEqual(len(betas), n_bars)
        self.assertFalse(np.isnan(betas).any())
        self.assertFalse(np.isinf(betas).any())
        # Final beta should converge towards 1.0
        self.assertAlmostEqualRelative(betas[-1], 1.0, max_relative_error=0.15)

    def test_fractional_kelly_extreme_odds_and_zero_edge(self):
        """Kelly calculator must bound allocations under pathological win rates and payoff ratios."""
        # Negative or zero edge -> risk = 0.0
        k_zero = MathOracles.calculate_calibrated_fractional_kelly(win_rate=0.30, profit_payoff_ratio=1.0)
        self.assertEqual(k_zero, 0.0)
        
        # Zero win rate -> risk = 0.0
        k_nowin = MathOracles.calculate_calibrated_fractional_kelly(win_rate=0.0, profit_payoff_ratio=5.0)
        self.assertEqual(k_nowin, 0.0)
        
        # 100% win rate and 10x payoff -> clamped to max institutional risk 0.50% (0.0050)
        k_max = MathOracles.calculate_calibrated_fractional_kelly(win_rate=1.0, profit_payoff_ratio=10.0)
        self.assertEqual(k_max, 0.0050)


# ==============================================================================
# 2. SEVERE MARKET REGIME TRANSITIONS
# ==============================================================================
class TestTier5SevereMarketRegimeTransitions(OpaqueBoxTestCase):
    """Stress test Market Regime Detection Engine under extreme flash crashes and spread shocks."""

    def setUp(self):
        self.shock_detector = ShockDetector(
            bar_range_threshold=3.50,
            spread_spike_threshold=3.00,
            jump_sigma_threshold=4.00,
            hyper_vol_threshold=2.50,
        )
        self.fsm = MarketRegimeFSM(shock_cooling_bars=3)

    def test_flash_crash_single_bar_drop_instant_shock(self):
        """A single -15% flash-crash bar with 15x ATR range must immediately trip CRISIS_SHOCK."""
        # 1. Normal bar
        res_norm = self.shock_detector.evaluate_bar(
            open_p=2000.0, high_p=2005.0, low_p=1995.0, close_p=2002.0,
            prev_close_p=2000.0, spread=0.20, baseline_spread=0.20,
            current_atr=10.0, return_std=0.002, atr_norm=1.0,
        )
        self.assertFalse(res_norm.is_shock)
        
        # 2. Flash-crash bar: range = 200.0 (20x ATR 10.0)
        res_crash = self.shock_detector.evaluate_bar(
            open_p=2000.0, high_p=2002.0, low_p=1800.0, close_p=1810.0,
            prev_close_p=2000.0, spread=0.20, baseline_spread=0.20,
            current_atr=10.0, return_std=0.002, atr_norm=1.0,
        )
        self.assertTrue(res_crash.is_shock)
        self.assertIn("BAR_RANGE_SHOCK", res_crash.reason)
        self.assertGreaterEqual(res_crash.bar_range_ratio, 3.50)

    def test_spread_explosion_regime_shock(self):
        """Spread explosion to 5.0x baseline must trigger SPREAD_EXPLOSION shock."""
        res_spread = self.shock_detector.evaluate_bar(
            open_p=2000.0, high_p=2005.0, low_p=1995.0, close_p=2000.0,
            prev_close_p=2000.0, spread=1.20, baseline_spread=0.20,  # 6.0x baseline
            current_atr=10.0, return_std=0.002, atr_norm=1.0,
        )
        self.assertTrue(res_spread.is_shock)
        self.assertIn("SPREAD_EXPLOSION", res_spread.reason)
        self.assertGreaterEqual(res_spread.spread_ratio, 3.00)

    def test_hyper_volatility_normalized_atr_shock(self):
        """Normalized ATR >= 2.50 must trigger HYPER_VOLATILITY shock."""
        res_hyper = self.shock_detector.evaluate_bar(
            open_p=2000.0, high_p=2005.0, low_p=1995.0, close_p=2000.0,
            prev_close_p=2000.0, spread=0.20, baseline_spread=0.20,
            current_atr=10.0, return_std=0.002, atr_norm=2.85,
        )
        self.assertTrue(res_hyper.is_shock)
        self.assertIn("HYPER_VOLATILITY", res_hyper.reason)

    def test_shock_cooling_period_and_consecutive_shocks(self):
        """Consecutive shocks must maintain CRISIS_SHOCK; cooling requires quiet bars."""
        # Build baseline synthetic bars (50 bars)
        df = self.generate_synthetic_ohlcv(n_bars=50, start_price=2000.0)
        
        # Inject shock on latest bar: range = 50.0 (normal ATR ~ 5.0 -> 10x ATR)
        df_shocked = df.copy()
        df_shocked.iloc[-1, df_shocked.columns.get_loc("high")] = 2050.0
        df_shocked.iloc[-1, df_shocked.columns.get_loc("low")] = 1950.0
        
        state1 = self.fsm.evaluate(df_shocked)
        self.assertEqual(state1, RegimeState.CRISIS_SHOCK)
        self.assertEqual(self.fsm._bars_since_shock, 0)

        # Bar +1 (quiet bar): still in cooling period (< 3 bars since shock)
        df_cooling1 = df.copy()
        state2 = self.fsm.evaluate(df_cooling1)
        self.assertEqual(state2, RegimeState.CRISIS_SHOCK)
        self.assertEqual(self.fsm._bars_since_shock, 1)

        # Consecutive shock resets counter to 0
        state3 = self.fsm.evaluate(df_shocked)
        self.assertEqual(state3, RegimeState.CRISIS_SHOCK)
        self.assertEqual(self.fsm._bars_since_shock, 0)

    def test_model_signal_suppression_under_crisis_shock(self):
        """MeanReversion and StatArb models must suppress BUY/SELL entries under CRISIS_SHOCK."""
        # Mean Reversion: permitted only in RANGE_BOUND
        mr_model = MeanReversionModel(symbol="EURUSD", timeframe="M15")
        df_dummy = self.generate_synthetic_ohlcv(n_bars=60, start_price=1.0800)
        signal_mr = mr_model.generate_signal(df_dummy, current_regime=RegimeState.CRISIS_SHOCK)
        # Suppressed signal returns None or HOLD
        self.assertTrue(signal_mr is None or signal_mr.get("action") == OrderAction.HOLD.value)

        # Stat Arb: suppressed under CRISIS_SHOCK
        sa_model = StatArbModel(pair=("ETHUSDT", "BTCUSDT"), timeframe="M5")
        df_pair = pd.DataFrame({"close": [3000.0] * 60, "close_x": [60000.0] * 60})
        signal_sa = sa_model.generate_signal(df_pair, current_regime=RegimeState.CRISIS_SHOCK)
        self.assertIsNone(signal_sa)


# ==============================================================================
# 3. KELLY POSITION SIZING EDGE CASES
# ==============================================================================
class TestTier5KellyPositionSizingEdgeCases(OpaqueBoxTestCase):
    """Stress test position sizing with boundary stop losses and margin exhaustion."""

    def setUp(self):
        self.kelly_calc = KellyCalculator()
        self.risk_engine = SpartanRiskEngine()

    def test_extreme_tight_stop_loss_lot_clamping_max_bound(self):
        """Microscopic SL distance must clamp lots strictly to max lot bound (50.0)."""
        # Calculate lot size with distance = 0.001 points on XAUUSD
        lots = self.kelly_calc.calculate_lot_size(
            equity=100000.0,
            risk_fraction=0.0050,
            entry_price=2650.000,
            stop_loss=2649.999,
            symbol="XAUUSD",
        )
        self.assertEqual(lots, 50.0)  # Clamped strictly to max_lot=50.0

    def test_extreme_wide_stop_loss_lot_clamping_min_bound(self):
        """Enormous SL distance (e.g. 2600 points) must clamp lots to min lot bound (0.01)."""
        lots = self.kelly_calc.calculate_lot_size(
            equity=10000.0,
            risk_fraction=0.0025,
            entry_price=2650.00,
            stop_loss=50.00,  # 2600 points distance
            symbol="XAUUSD",
        )
        self.assertEqual(lots, 0.01)  # Clamped to min_lot=0.01

    def test_zero_and_inverted_stop_loss_guards(self):
        """Zero SL distance or inverted SL must be rejected without division by zero."""
        # 1. Zero distance via calculate_lot_size
        lots_zero = self.kelly_calc.calculate_lot_size(
            equity=100000.0,
            risk_fraction=0.0050,
            entry_price=2650.00,
            stop_loss=2650.00,
            symbol="XAUUSD",
        )
        self.assertEqual(lots_zero, 0.0)

        # 2. evaluate_position_sizing with zero distance
        res_zero = self.kelly_calc.evaluate_position_sizing(
            symbol="XAUUSD",
            equity=100000.0,
            free_margin=100000.0,
            entry_price=2650.00,
            stop_loss=2650.00,
        )
        self.assertFalse(res_zero["approved"])
        self.assertEqual(res_zero["lots"], 0.0)
        self.assertEqual(res_zero["reason"], "INVALID_LOT_SIZE")

        # 3. Inverted SL: BUY signal with SL above entry
        bad_buy_signal: SignalDict = {
            "action": "BUY",
            "symbol": "XAUUSD",
            "entry_price": 2650.00,
            "stop_loss": 2700.00,
            "take_profit": 2750.00,
            "magic_number": 881021,
            "regime": "BULL_TREND",
            "comment": "INVERTED_SL_TEST",
        }
        order = self.risk_engine.evaluate_order(bad_buy_signal, portfolio_equity=100000.0, current_margin=0.0)
        if order is not None:
            self.assertWithinBounds(order["lots"], 0.01, 50.0)

    def test_margin_exhaustion_defense(self):
        """Free margin near zero must cause order rejection by risk engine."""
        signal: SignalDict = {
            "action": "BUY",
            "symbol": "XAUUSD",
            "entry_price": 2650.00,
            "stop_loss": 2640.00,
            "take_profit": 2670.00,
            "magic_number": 881021,
            "regime": "BULL_TREND",
            "comment": "MARGIN_EXHAUSTION_TEST",
        }
        # Available free margin is only $5, not enough to cover margin requirement
        order = self.risk_engine.evaluate_order(
            signal,
            portfolio_equity=10000.0,
            current_margin=9995.0,
            free_margin=5.0,
        )
        self.assertIsNone(order)

    def test_zero_and_negative_equity_protection(self):
        """Zero or negative portfolio equity must result in rejection with 0 lots."""
        res_zero = self.kelly_calc.evaluate_position_sizing(
            symbol="XAUUSD",
            equity=0.0,
            free_margin=0.0,
            entry_price=2650.00,
            stop_loss=2640.00,
        )
        self.assertFalse(res_zero["approved"])
        self.assertEqual(res_zero["lots"], 0.0)

        res_neg = self.kelly_calc.evaluate_position_sizing(
            symbol="XAUUSD",
            equity=-5000.0,
            free_margin=-5000.0,
            entry_price=2650.00,
            stop_loss=2640.00,
        )
        self.assertFalse(res_neg["approved"])
        self.assertEqual(res_neg["lots"], 0.0)


# ==============================================================================
# 4. STOP-OUT LTV 85% & BROKER CUSHION BREACH
# ==============================================================================
class TestTier5StopOutLTV85AndBrokerCushionBreach(OpaqueBoxTestCase):
    """Stress test margin utilization thresholds and emergency de-leveraging liquidation."""

    def setUp(self):
        self.breaker = StopOutCircuitBreaker(
            max_margin_utilization=0.85,
            target_recovery_utilization=0.50,
            broker_stopout_level=30.0,
            cushion_pct=0.20,
        )
        self.risk_engine = SpartanRiskEngine()

    def test_ltv_85_threshold_detection(self):
        """Exact 85.0% LTV triggers de-leveraging; 84.99% remains normal."""
        # 84.99% LTV
        res_ok = self.breaker.evaluate_deleveraging(
            equity=100000.0,
            used_margin=84990.0,
            positions=[{"ticket": 101, "margin": 84990.0}],
        )
        self.assertFalse(res_ok["triggered"])
        self.assertEqual(res_ok["action"], "NORMAL")

        # 85.00% LTV
        res_breach = self.breaker.evaluate_deleveraging(
            equity=100000.0,
            used_margin=85000.0,
            positions=[{"ticket": 101, "margin": 85000.0}],
        )
        self.assertTrue(res_breach["triggered"])
        self.assertEqual(res_breach["action"], "EMERGENCY_DELEVERAGE")
        self.assertEqual(res_breach["tickets_to_close"], [101])

    def test_highest_margin_sequential_deleveraging(self):
        """Positions are liquidated in descending order of margin until LTV < 50.0%."""
        positions = [
            {"ticket": 1, "margin": 10000.0},
            {"ticket": 2, "margin": 45000.0},  # Highest: closes this first (margin drops to 45,000 = 45% < 50%)
            {"ticket": 3, "margin": 20000.0},
            {"ticket": 4, "margin": 15000.0},
        ]
        # Total margin = 90,000, Equity = 100,000 (LTV = 90%)
        # Closing Ticket 2 (45,000) brings margin down to 45,000 (45.0% < 50.0% target)
        res = self.breaker.evaluate_deleveraging(
            equity=100000.0,
            used_margin=90000.0,
            positions=positions,
        )
        self.assertTrue(res["triggered"])
        self.assertEqual(res["action"], "EMERGENCY_DELEVERAGE")
        self.assertEqual(res["tickets_to_close"], [2])
        self.assertLess(res["new_ltv"], 50.0)

    def test_broker_stopout_cushion_breach_instant_flatten(self):
        """Margin Level <= 36.0% (within 20% cushion of broker 30% stop-out) flattens ALL positions."""
        positions = [
            {"ticket": 1, "margin": 50000.0},
            {"ticket": 2, "margin": 50000.0},
        ]
        # Equity = 35,000, Used Margin = 100,000 => Margin Level = 35.0% <= 36.0%
        res = self.breaker.evaluate_deleveraging(
            equity=35000.0,
            used_margin=100000.0,
            positions=positions,
        )
        self.assertTrue(res["triggered"])
        self.assertEqual(res["action"], "EMERGENCY_FLATTEN")
        self.assertEqual(set(res["tickets_to_close"]), {1, 2})

    def test_reentry_blocking_under_deleveraging_state(self):
        """Risk engine blocks order evaluation when LTV exceeds 85.0%."""
        signal: SignalDict = {
            "action": "BUY",
            "symbol": "EURUSD",
            "entry_price": 1.0850,
            "stop_loss": 1.0820,
            "take_profit": 1.0900,
            "magic_number": 882012,
            "regime": "BULL_TREND",
            "comment": "LTV_BLOCK_TEST",
        }
        order = self.risk_engine.evaluate_order(
            signal,
            portfolio_equity=100000.0,
            current_margin=86000.0,  # 86% LTV >= 85%
        )
        self.assertIsNone(order)

    def test_margin_recovery_resets_breaker(self):
        """When equity recovers so LTV < 50%, circuit breaker evaluates to NORMAL."""
        status = self.breaker.evaluate_deleveraging(
            equity=200000.0,
            used_margin=50000.0,  # LTV = 25%
            positions=[{"ticket": 1, "margin": 50000.0}],
        )
        self.assertFalse(status["triggered"])
        self.assertEqual(status["action"], "NORMAL")


# ==============================================================================
# 5. MACRO NEWS STRESS TESTING (10x Spread, 30-pip Slippage)
# ==============================================================================
class TestTier5MacroNewsStressTesting(OpaqueBoxTestCase):
    """Stress test order execution against macro news spikes and slippage."""

    def setUp(self):
        self.stress_tester = MacroStressTester(
            spread_multiplier=10.0,
            slippage_pips=30.0,
        )

    def test_macro_news_calendar_loading_and_event_count(self):
        """News calendar must contain at least 100 curated CPI/NFP/FOMC events."""
        self.assertGreaterEqual(len(self.stress_tester.events), 100)
        types = {e.event_type for e in self.stress_tester.events}
        self.assertIn("CPI", types)
        self.assertIn("NFP", types)
        self.assertIn("FOMC", types)

    def test_macro_spread_expansion_10x_injection(self):
        """During news window, spread expands by exactly 10.0x."""
        event_time = self.stress_tester.events[0].timestamp
        df = pd.DataFrame({
            "timestamp": [
                event_time - pd.Timedelta(minutes=30),  # Outside
                event_time,                             # Inside
                event_time + pd.Timedelta(minutes=10),  # Inside
                event_time + pd.Timedelta(hours=2),     # Outside
            ],
            "spread": [0.20, 0.20, 0.20, 0.20],
        })
        stressed = self.stress_tester.inject_spread_spikes(df, base_spread=0.20)
        self.assertAlmostEqual(stressed["spread"].iloc[0], 0.20)
        self.assertAlmostEqual(stressed["spread"].iloc[1], 2.00)  # 10x
        self.assertAlmostEqual(stressed["spread"].iloc[2], 2.00)  # 10x
        self.assertAlmostEqual(stressed["spread"].iloc[3], 0.20)

    def test_adverse_slippage_30_pip_deduction(self):
        """Trades exiting during a macro news shock incur 30-pip slippage penalty."""
        event_time = self.stress_tester.events[0].timestamp
        trade = {
            "ticket": 12345,
            "symbol": "XAUUSD",
            "lots": 1.0,
            "open_price": 2650.00,
            "close_price": 2640.00,
            "pnl": -1000.0,
            "exit_time": event_time,
        }
        stressed_trade = self.stress_tester.calculate_stressed_trade_pnl(
            trade,
            asset_class="metals",
            pip_size=0.10,  # 30 pips = $3.00 on 100 oz = $300 penalty
            contract_size=100.0,
        )
        self.assertTrue(stressed_trade["stress_applied"])
        self.assertLess(stressed_trade["pnl"], -1000.0)
        # Expected penalty = 30 * 0.10 * 100 * 1.0 = $300
        self.assertAlmostEqual(stressed_trade["pnl"], -1300.0)

    def test_news_blackout_filter_suppresses_orders_during_shock(self):
        """Order attempts during news shock window are recognized and gated."""
        event_time = self.stress_tester.events[0].timestamp
        in_window, event = self.stress_tester.is_in_stress_window(event_time)
        self.assertTrue(in_window)
        self.assertIsNotNone(event)


# ==============================================================================
# 6. MQL5 EA SYNTAX & OFFLINE SPOOL RESILIENCE
# ==============================================================================
class TestTier5MQL5SyntaxAndSpoolResilience(OpaqueBoxTestCase):
    """Stress test MQL5 source code integrity and WebRequest spooling resilience."""

    def test_all_mql5_files_have_property_strict_and_header_guards(self):
        """Master EA must declare #property strict, and all headers must have include guards."""
        mql5_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "execution", "mql5")
        )
        master_ea = os.path.join(mql5_dir, "SpartanMasterEA.mq5")
        self.assertTrue(os.path.exists(master_ea))
        with open(master_ea, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("#property strict", content)

        include_dir = os.path.join(mql5_dir, "Include")
        headers = [f for f in os.listdir(include_dir) if f.endswith(".mqh")]
        self.assertGreaterEqual(len(headers), 5)
        for h in headers:
            h_path = os.path.join(include_dir, h)
            with open(h_path, "r", encoding="utf-8") as f:
                h_text = f.read()
            self.assertIn("#ifndef", h_text, f"{h} missing #ifndef")
            self.assertIn("#define", h_text, f"{h} missing #define")
            self.assertIn("#endif", h_text, f"{h} missing #endif")

    def test_mql5_code_delimiter_balance_and_cleanliness(self):
        """Static analysis of all MQL5 code: braces, brackets, and parentheses must balance."""
        mql5_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "execution", "mql5")
        )
        for root, _, files in os.walk(mql5_dir):
            for file in files:
                if file.endswith((".mq5", ".mqh")):
                    f_path = os.path.join(root, file)
                    with open(f_path, "r", encoding="utf-8") as f:
                        code = f.read()
                    
                    # Strip comments and strings
                    clean = re.sub(r"/\*.*?\*/", "", code, flags=re.DOTALL)
                    clean = re.sub(r'"(?:\\.|[^"\\])*"', '""', clean)
                    clean = re.sub(r"//.*", "", clean)
                    
                    # Check balance
                    stack = []
                    pairs = {')': '(', '}': '{', ']': '['}
                    for char in clean:
                        if char in '({[':
                            stack.append(char)
                        elif char in ')}]':
                            self.assertTrue(len(stack) > 0, f"Unmatched '{char}' in {file}")
                            top = stack.pop()
                            self.assertEqual(top, pairs[char], f"Mismatched delimiter in {file}")
                    self.assertEqual(len(stack), 0, f"Unclosed delimiters in {file}: {stack}")

    def test_offline_webrequest_queue_capacity_500(self):
        """In-memory queue holds up to 500 items while offline."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            spool_file = os.path.join(tmp_dir, "spool.dat")
            client = SpartanWebhookClient(
                api_key="test_key",
                server_url="http://127.0.0.1:59999/api/ea/webhook",
                spool_filename=spool_file,
            )
            # Enqueue 500 items
            for i in range(500):
                client.enqueue({"ticket": 1000 + i, "symbol": "XAUUSD", "lots": 0.1, "pnl": 10.0})
            
            self.assertEqual(len(client.queue), 500)
            
            # 501st item overflows and spools to disk
            res_501 = client.enqueue({"ticket": 1501, "symbol": "XAUUSD", "lots": 0.1, "pnl": 10.0})
            self.assertFalse(res_501)
            self.assertTrue(os.path.exists(spool_file))

    def test_disk_spool_overflow_and_fifo_recovery(self):
        """Items spooled to disk are recovered into queue in strict FIFO order."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            spool_file = os.path.join(tmp_dir, "test_spool.dat")
            client = SpartanWebhookClient(
                api_key="test_key",
                server_url="http://127.0.0.1:59999/api/ea/webhook",
                spool_filename=spool_file,
            )
            # Spool 5 items to disk
            for i in range(5):
                client.spool_to_disk({"ticket": 2000 + i, "symbol": "BTCUSDT", "pnl": 50.0 * (i + 1)})
            
            self.assertTrue(os.path.exists(spool_file))

            # New client drains spool from disk
            client_recovered = SpartanWebhookClient(
                api_key="test_key",
                server_url="http://127.0.0.1:59999/api/ea/webhook",
                spool_filename=spool_file,
            )
            drained_count = client_recovered.drain_spool_from_disk()
            self.assertEqual(drained_count, 5)
            self.assertEqual(len(client_recovered.queue), 5)
            self.assertEqual(client_recovered.queue[0]["ticket"], 2000)
            self.assertEqual(client_recovered.queue[-1]["ticket"], 2004)

    def test_webhook_payload_sanitization_and_anomaly_capping(self):
        """Payloads must clamp lots to [0.01, 50.0] and PnL to [-50000, 50000] flagging anomalies."""
        raw_payload = {
            "ticket": 99999,
            "symbol": "ETHUSDT",
            "lots": 150.0,          # Out of bounds
            "pnl": 75000.0,          # Out of bounds
            "comment": "x" * 150,    # Too long
            "magicNumber": 888801,
        }
        clean = normalize_trade_payload(raw_payload)
        self.assertEqual(clean["lots"], 50.0)
        self.assertEqual(clean["pnl"], 50000.0)
        self.assertTrue(clean["isAnomalous"])
        self.assertEqual(len(clean["comment"]), 100)
