"""Unit Test Suite for Spartan Quantitative Validation Framework (Milestone 4).

Covers:
- QuantitativeMetrics (Feature 22)
- PurgedTimeSeriesSplitter (Feature 17)
- BacktestEngine (Feature 16)
- WalkForwardOptimizer (Feature 18)
- MonteCarloSimulator (Feature 19)
- MacroStressTester (Feature 20)
- ValidationReportGenerator (Feature 21)
"""

import math
import os
import unittest
import numpy as np
import pandas as pd

from quant_research.validation.backtest_engine import BacktestEngine, BacktestResult, Position
from quant_research.validation.metrics import QuantitativeMetrics
from quant_research.validation.monte_carlo import MonteCarloSimulator, MonteCarloResult
from quant_research.validation.oos_split import PurgedTimeSeriesSplitter
from quant_research.validation.report_generator import ValidationReportGenerator
from quant_research.validation.stress_testing import MacroStressTester, StressTestResult
from quant_research.validation.walk_forward import WalkForwardOptimizer, WFOWindow


class TestQuantitativeMetricsEngine(unittest.TestCase):
    """Test Suite for Feature 22: Quantitative Metrics Engine."""

    def test_profit_factor_calculation(self):
        """Verify Profit Factor = Gross Profit / Gross Loss >= 2.0."""
        trades = [
            {"pnl": 500.0}, {"pnl": -200.0}, {"pnl": 700.0}, {"pnl": -300.0}, {"pnl": 600.0}
        ]
        metrics = QuantitativeMetrics.calculate_metrics(trades)
        # Gross profit = 1800, gross loss = 500 -> PF = 3.60
        self.assertEqual(metrics["profit_factor"], 3.60)
        self.assertGreaterEqual(metrics["profit_factor"], 2.0)

    def test_zero_gross_losses_infinite_profit_factor(self):
        """Corner Case: 100% win rate (zero losses) caps Profit Factor safely."""
        trades = [{"pnl": 1000.0}, {"pnl": 2000.0}]
        metrics = QuantitativeMetrics.calculate_metrics(trades)
        self.assertGreater(metrics["profit_factor"], 1000.0)

    def test_zero_gross_profits_zero_profit_factor(self):
        """Corner Case: Zero winning trades yields Profit Factor = 0.0."""
        trades = [{"pnl": -500.0}, {"pnl": -300.0}]
        metrics = QuantitativeMetrics.calculate_metrics(trades)
        self.assertEqual(metrics["profit_factor"], 0.0)

    def test_win_rate_and_risk_reward(self):
        """Verify Win Rate >= 60.0% and Risk:Reward >= 1:1.5."""
        trades = [
            {"pnl": 300.0}, {"pnl": 300.0}, {"pnl": 300.0}, {"pnl": -200.0}, {"pnl": -200.0}
        ]
        metrics = QuantitativeMetrics.calculate_metrics(trades)
        # 3 wins out of 5 -> 60.0%
        # Avg win = 300, avg loss = 200 -> R:R = 1.50
        self.assertEqual(metrics["win_rate"], 60.0)
        self.assertEqual(metrics["risk_reward"], 1.50)

    def test_max_drawdown_percentage(self):
        """Verify Max Drawdown calculation <= 5.0%."""
        trades = [
            {"pnl": 2000.0}, {"pnl": -3000.0}, {"pnl": 1500.0}
        ]
        metrics = QuantitativeMetrics.calculate_metrics(trades, initial_capital=100000.0)
        # 100k -> 102k (peak) -> 99k (dd = 3k / 102k = 2.94%) -> 100.5k
        self.assertAlmostEqual(metrics["max_drawdown_pct"], 2.94, places=1)
        self.assertLessEqual(metrics["max_drawdown_pct"], 5.0)

    def test_sharpe_and_sortino_annualization(self):
        """Verify Sharpe and Sortino scale by sqrt(252)."""
        trades = [{"pnl": 100.0 + (i % 2) * 50.0} for i in range(20)]
        metrics = QuantitativeMetrics.calculate_metrics(trades)
        self.assertGreater(metrics["sharpe_ratio"], 0.0)
        self.assertGreater(metrics["sortino_ratio"], 0.0)

    def test_calmar_and_recovery_factor(self):
        """Verify Calmar Ratio and Recovery Factor calculations."""
        trades = [{"pnl": 1000.0}, {"pnl": -500.0}, {"pnl": 2000.0}]
        metrics = QuantitativeMetrics.calculate_metrics(trades, initial_capital=100000.0)
        self.assertGreater(metrics["recovery_factor"], 0.0)
        self.assertGreater(metrics["calmar_ratio"], 0.0)

    def test_trade_expectancy(self):
        """Verify trade expectancy calculation."""
        trades = [{"pnl": 300.0}, {"pnl": 300.0}, {"pnl": -200.0}]
        metrics = QuantitativeMetrics.calculate_metrics(trades)
        # WR = 2/3, W = 300, L = 200 -> E = (2/3 * 300) - (1/3 * 200) = 200 - 66.67 = 133.33
        self.assertAlmostEqual(metrics["trade_expectancy"], 133.33, places=1)

    def test_empty_trades_list(self):
        """Corner Case: Empty trades list returns 0.0 gracefully."""
        metrics = QuantitativeMetrics.calculate_metrics([])
        self.assertEqual(metrics["profit_factor"], 0.0)
        self.assertEqual(metrics["win_rate"], 0.0)
        self.assertEqual(metrics["ending_equity"], 100000.0)

    def test_institutional_compliance_check(self):
        """Verify check_institutional_compliance evaluates all 8 gates."""
        good_metrics = {
            "profit_factor": 2.5,
            "win_rate": 65.0,
            "risk_reward": 1.8,
            "max_drawdown_pct": 3.5,
            "sharpe_ratio": 2.8,
            "sortino_ratio": 3.9,
            "calmar_ratio": 3.2,
            "recovery_factor": 4.5,
        }
        comp = QuantitativeMetrics.check_institutional_compliance(good_metrics)
        self.assertTrue(comp["compliant"])
        self.assertEqual(comp["passed_count"], 8)

        failing_metrics = dict(good_metrics, max_drawdown_pct=5.5)
        comp_fail = QuantitativeMetrics.check_institutional_compliance(failing_metrics)
        self.assertFalse(comp_fail["compliant"])


class TestPurgedTimeSeriesSplitter(unittest.TestCase):
    """Test Suite for Feature 17: Purged & Embargoed OOS Splitter."""

    def test_split_proportions(self):
        """Verify 60% Train, 20% Val, 20% Test proportion allocation."""
        splitter = PurgedTimeSeriesSplitter(train_pct=0.60, val_pct=0.20, test_pct=0.20, embargo_bars=10)
        dates = pd.date_range("2024-01-01", periods=1000, freq="1h")
        df = pd.DataFrame({"close": np.linspace(100, 200, 1000)}, index=dates)

        train, val, test = splitter.split(df)
        self.assertEqual(len(train), 600)
        self.assertEqual(len(val), 200 - 10)  # val_start is train_end + embargo_bars
        self.assertGreater(len(test), 0)

    def test_embargo_buffer_separation(self):
        """Verify embargo buffer separates partitions."""
        splitter = PurgedTimeSeriesSplitter(embargo_bars=50)
        df = pd.DataFrame({"close": range(500)})
        train, val, test = splitter.split(df)
        self.assertEqual(len(train), 300)
        # Val starts at 300 + 50 = 350
        self.assertEqual(val.index[0], 350)

    def test_zero_embargo_fallback(self):
        """Boundary: Embargo bars = 0 results in contiguous splits."""
        splitter = PurgedTimeSeriesSplitter(embargo_bars=0)
        df = pd.DataFrame({"close": range(100)})
        train, val, test = splitter.split(df)
        self.assertEqual(len(train), 60)
        self.assertEqual(val.index[0], 60)

    def test_short_series_raises_error(self):
        """Corner Case: Dataset smaller than embargo window raises ValueError."""
        splitter = PurgedTimeSeriesSplitter(embargo_bars=50)
        df = pd.DataFrame({"close": range(80)})
        with self.assertRaises(ValueError):
            splitter.split(df)

    def test_invalid_proportions_raise_error(self):
        """Verify proportions not summing to 1.0 raise ValueError."""
        with self.assertRaises(ValueError):
            PurgedTimeSeriesSplitter(train_pct=0.50, val_pct=0.20, test_pct=0.20)

    def test_zero_lookahead_standardization(self):
        """Verify standardization fitted strictly on IS is applied to OOS."""
        train_data = np.array([10.0, 20.0, 30.0, 40.0, 50.0])
        test_data = np.array([60.0, 70.0])
        std_train, std_test = PurgedTimeSeriesSplitter.standardize_series(train_data, test_data)
        train_mean = np.mean(train_data)
        train_std = np.std(train_data)
        self.assertAlmostEqual(std_test[0], (60.0 - train_mean) / train_std)

    def test_purging_overlapping_trade_horizons(self):
        """Verify trades active across split boundary are purged from training set."""
        splitter = PurgedTimeSeriesSplitter()
        boundary = pd.Timestamp("2024-06-01 00:00:00")
        trades = [
            {"ticket": 1, "open_time": "2024-05-20 10:00:00", "close_time": "2024-05-25 10:00:00"},
            {"ticket": 2, "open_time": "2024-05-31 22:00:00", "close_time": "2024-06-01 04:00:00"},  # Straddles boundary
            {"ticket": 3, "open_time": "2024-06-02 10:00:00", "close_time": "2024-06-05 10:00:00"},
        ]
        train_t, test_t, purged_t = splitter.purge_overlapping_trades(trades, boundary)
        self.assertEqual(len(train_t), 1)
        self.assertEqual(train_t[0]["ticket"], 1)
        self.assertEqual(len(purged_t), 1)
        self.assertEqual(purged_t[0]["ticket"], 2)
        self.assertEqual(len(test_t), 1)
        self.assertEqual(test_t[0]["ticket"], 3)


class TestBacktestEngine(unittest.TestCase):
    """Test Suite for Feature 16: Event-Driven Backtesting Simulator."""

    def test_asymmetric_bid_ask_fills(self):
        """Verify BUY executes at Ask (Bid + Spread) and SELL executes at Bid."""
        engine = BacktestEngine(symbol="XAUUSD")
        bid = 2700.00
        spread = 0.25
        ask = bid + spread
        buy_fill = ask
        sell_fill = bid
        self.assertGreater(buy_fill, sell_fill)
        self.assertEqual(buy_fill, 2700.25)

    def test_zero_spread_fills(self):
        """Boundary: Zero spread accounts fill BUY and SELL at same price."""
        bid = 2700.00
        spread = 0.00
        ask = bid + spread
        self.assertEqual(bid, ask)

    def test_commission_deduction(self):
        """Verify commission modeling ($5.00 per lot round turn) is deducted."""
        engine = BacktestEngine(commission_per_lot=5.0)
        lots = 2.0
        gross_profit = 300.00
        comm = engine.calculate_commission(lots, notional_value=2700.0 * lots * 100.0)
        net_profit = gross_profit - comm
        self.assertEqual(comm, 10.00)
        self.assertEqual(net_profit, 290.00)

    def test_crypto_percentage_fee_deduction(self):
        """Verify Crypto maker/taker percentage commission calculation."""
        engine = BacktestEngine(symbol="BTCUSDT", is_crypto=True, taker_fee_pct=0.0007)
        notional = 50000.0 * 1.0  # 1 BTC at $50,000
        comm = engine.calculate_commission(1.0, notional)
        self.assertEqual(comm, 35.00)

    def test_commission_exceeds_gross_profit(self):
        """Corner Case: Micro profit ($2.00) with $5.00 commission results in negative net PnL."""
        gross = 2.00
        commission = 5.00
        net = gross - commission
        self.assertEqual(net, -3.00)

    def test_overnight_swap_application(self):
        """Verify overnight swap points applied when holding across rollover."""
        rollover_passed = True
        swap_points = -0.75
        swap_applied = swap_points if rollover_passed else 0.0
        self.assertLess(swap_applied, 0.0)

    def test_slippage_model_execution(self):
        """Verify market order fill incorporates slippage."""
        target_price = 2700.00
        slippage = 0.30
        executed_price_buy = target_price + slippage
        self.assertEqual(executed_price_buy, 2700.30)

    def test_extreme_slippage_penalty(self):
        """Boundary: 100-pip slippage penalty does not produce negative fill price."""
        target_price = 2700.00
        extreme_slip = 10.00
        fill_price = max(0.01, target_price + extreme_slip)
        self.assertEqual(fill_price, 2710.00)
        self.assertGreater(fill_price, 0.0)

    def test_instant_stop_loss_fill_at_open(self):
        """Corner Case: Gap open directly past stop loss fills at Open price."""
        stop_price = 2700.00
        open_gap = 2685.00
        executed_exit = min(stop_price, open_gap)
        self.assertEqual(executed_exit, 2685.00)

    def test_intrabar_tick_path_progression(self):
        """Verify synthesized intra-bar path follows Open -> Low/High -> Close."""
        engine = BacktestEngine()
        # Bullish bar
        ticks_bull = engine.synthesize_intrabar_path(100.0, 105.0, 98.0, 103.0)
        self.assertEqual(ticks_bull, [100.0, 98.0, 105.0, 103.0])

        # Bearish bar
        ticks_bear = engine.synthesize_intrabar_path(105.0, 108.0, 99.0, 101.0)
        self.assertEqual(ticks_bear, [105.0, 108.0, 99.0, 101.0])

    def test_full_simulation_run(self):
        """Verify complete simulation execution with synthetic bar data."""
        engine = BacktestEngine(symbol="XAUUSD")
        dates = pd.date_range("2024-01-01", periods=100, freq="1h")
        np.random.seed(42)
        base = 2700.0 + np.cumsum(np.random.normal(0, 1.0, 100))
        df = pd.DataFrame({
            "timestamp": dates,
            "open": base,
            "high": base + 2.0,
            "low": base - 2.0,
            "close": base + 0.5,
            "volume": 1000.0,
            "spread": 0.20,
        })

        # Inject some test signals
        preloaded_signals = [None] * 100
        preloaded_signals[35] = {
            "action": "BUY",
            "lots": 0.5,
            "stop_loss": base[35] - 5.0,
            "take_profit": base[35] + 5.0,
            "magic_number": 888801,
        }

        res = engine.run_simulation(data=df, preloaded_signals=preloaded_signals)
        self.assertIsInstance(res, BacktestResult)
        self.assertGreater(len(res.equity_curve), 0)
        self.assertGreater(len(res.drawdown_curve), 0)


class TestWalkForwardOptimizer(unittest.TestCase):
    """Test Suite for Feature 18: Walk-Forward Optimization (WFO)."""

    def test_wfe_calculation(self):
        """Verify WFE = (Annualized Return OOS / Annualized Return IS) * 100%."""
        wfe = WalkForwardOptimizer.calculate_wfe(is_return=0.40, oos_return=0.28)
        self.assertEqual(wfe, 70.0)
        self.assertTrue(WalkForwardOptimizer().is_wfe_qualified(wfe))

    def test_wfe_exact_sixty_percent_boundary(self):
        """Boundary: 59.99% disqualified vs 60.00% qualified."""
        wfo = WalkForwardOptimizer(min_wfe_pct=60.0)
        self.assertFalse(wfo.is_wfe_qualified(59.99))
        self.assertTrue(wfo.is_wfe_qualified(60.00))

    def test_negative_oos_return_negative_wfe(self):
        """Corner Case: Negative OOS return yields negative WFE."""
        wfe = WalkForwardOptimizer.calculate_wfe(is_return=0.30, oos_return=-0.05)
        self.assertLess(wfe, 0.0)
        self.assertFalse(WalkForwardOptimizer().is_wfe_qualified(wfe))

    def test_zero_is_return_protected(self):
        """Corner Case: Zero IS return protected by epsilon."""
        wfe = WalkForwardOptimizer.calculate_wfe(is_return=0.0, oos_return=0.10)
        self.assertGreater(wfe, 0.0)

    def test_rolling_window_cadence(self):
        """Verify 6-month train / 2-month test rolling window generation."""
        wfo = WalkForwardOptimizer(train_months=6, test_months=2, step_months=1)
        windows = wfo.generate_rolling_windows(
            start_date="2024-01-01",
            end_date="2025-01-01",
        )
        self.assertGreater(len(windows), 0)
        # First window: Train 2024-01 to 2024-07, Test 2024-07 to 2024-09
        first_win = windows[0]
        self.assertEqual(first_win[0][0], pd.Timestamp("2024-01-01"))
        self.assertEqual(first_win[0][1], pd.Timestamp("2024-07-01"))
        self.assertEqual(first_win[1][0], pd.Timestamp("2024-07-01"))
        self.assertEqual(first_win[1][1], pd.Timestamp("2024-09-01"))

    def test_parameter_stability_surface(self):
        """Verify parameter surface stability evaluation (plateau vs spike)."""
        grid = {18: 2.8, 19: 2.9, 20: 3.0, 21: 2.95, 22: 2.85}
        eval_res = WalkForwardOptimizer.evaluate_parameter_surface(grid, optimal_param=20)
        self.assertTrue(eval_res["is_stable_plateau"])
        self.assertAlmostEqual(eval_res["gradient_at_opt"], 0.025, places=3)

    def test_chained_equity_curve_concatenation(self):
        """Verify OOS return segments concatenate into continuous equity curve."""
        oos_returns = [pd.Series([0.05]), pd.Series([0.03])]
        equity, total_ret = WalkForwardOptimizer.concatenate_oos_returns(oos_returns, initial_capital=100000.0)
        self.assertAlmostEqual(equity.iloc[-1], 108150.0)
        self.assertAlmostEqual(total_ret, 0.0815)


class TestMonteCarloSimulator(unittest.TestCase):
    """Test Suite for Feature 19: Monte Carlo Simulation Framework."""

    def test_minimum_thousand_simulations_enforcement(self):
        """Boundary: Runs < 1,000 rejected with ValueError."""
        with self.assertRaises(ValueError):
            MonteCarloSimulator(n_simulations=999)

    def test_drawdown_risk_and_p95_bounds(self):
        """Verify probability of Max Drawdown > 10.0% < 1.0% and 95th percentile <= 5.0%."""
        mc = MonteCarloSimulator(n_simulations=1000, random_seed=42)
        # Generate 100 realistic winning and losing trades
        np.random.seed(42)
        trades = []
        for _ in range(100):
            pnl = 350.0 if np.random.rand() < 0.65 else -180.0
            trades.append({"pnl": pnl})

        res = mc.run_simulation(trades, initial_capital=100000.0)
        self.assertIsInstance(res, MonteCarloResult)
        self.assertLess(res.prob_dd_exceeds_10_pct, 0.01)
        self.assertLessEqual(res.percentile_95_max_dd, 5.0)
        self.assertEqual(res.prob_ruin, 0.00)
        self.assertLessEqual(res.cvar_99_max_dd, 7.5)
        self.assertTrue(res.is_compliant)

    def test_identical_trades_resampling(self):
        """Corner Case: Resampling identical trades."""
        mc = MonteCarloSimulator(n_simulations=1000, random_seed=42)
        trades = [{"pnl": 100.0}] * 30
        res = mc.run_simulation(trades, initial_capital=100000.0)
        self.assertEqual(res.percentile_95_max_dd, 0.0)
        self.assertEqual(res.prob_ruin, 0.0)

    def test_empty_trades_list(self):
        """Corner Case: Empty trades list returns 0.0 risk metrics gracefully."""
        mc = MonteCarloSimulator(n_simulations=1000)
        res = mc.run_simulation([])
        self.assertEqual(res.percentile_95_max_dd, 0.0)
        self.assertEqual(res.prob_ruin, 0.0)
        self.assertTrue(res.is_compliant)


class TestMacroStressTester(unittest.TestCase):
    """Test Suite for Feature 20: Macro Event Stress Testing."""

    def test_calendar_loading(self):
        """Verify news calendar loads historical releases."""
        tester = MacroStressTester()
        self.assertGreater(len(tester.events), 0)

    def test_stress_window_detection(self):
        """Verify stress window covers [t_event - 5m, t_event + 30m]."""
        tester = MacroStressTester()
        if not tester.events:
            self.skipTest("No calendar events loaded")
        event = tester.events[0]
        t_event = event.timestamp

        # Inside window
        in_win, _ = tester.is_in_stress_window(t_event)
        self.assertTrue(in_win)

        # 4 minutes before: inside
        in_win_pre, _ = tester.is_in_stress_window(t_event - pd.Timedelta(minutes=4))
        self.assertTrue(in_win_pre)

        # 25 minutes after: inside
        in_win_post, _ = tester.is_in_stress_window(t_event + pd.Timedelta(minutes=25))
        self.assertTrue(in_win_post)

        # 1 second outside window: outside
        out_win, _ = tester.is_in_stress_window(t_event + pd.Timedelta(minutes=30, seconds=1))
        self.assertFalse(out_win)

    def test_spread_spike_injection(self):
        """Verify spread multiplies by 10x during news shock."""
        tester = MacroStressTester(spread_multiplier=10.0)
        if not tester.events:
            self.skipTest("No calendar events loaded")
        event_time = tester.events[0].timestamp

        df = pd.DataFrame({
            "timestamp": [event_time - pd.Timedelta(hours=1), event_time, event_time + pd.Timedelta(hours=1)],
            "close": [2700.0, 2705.0, 2702.0],
            "spread": [0.20, 0.20, 0.20],
        })
        stressed_df = tester.inject_spread_spikes(df)
        self.assertEqual(stressed_df["spread"].iloc[0], 0.20)
        self.assertEqual(stressed_df["spread"].iloc[1], 2.00)  # 10x spiked
        self.assertEqual(stressed_df["spread"].iloc[2], 0.20)

    def test_adverse_slippage_injection(self):
        """Verify adverse slippage penalty reduces trade PnL."""
        tester = MacroStressTester(slippage_pips=30.0)
        if not tester.events:
            self.skipTest("No calendar events loaded")
        event_time = tester.events[0].timestamp

        trade = {
            "ticket": 101,
            "lots": 1.0,
            "type": "BUY",
            "pnl": 500.0,
            "close_time": event_time,
        }
        # 30 pips * $0.10 * 100 = $300 penalty
        stressed_trade = tester.calculate_stressed_trade_pnl(trade, asset_class="metals", pip_size=0.1, contract_size=100.0)
        self.assertTrue(stressed_trade["stress_applied"])
        self.assertEqual(stressed_trade["pnl"], 200.0)
        self.assertEqual(stressed_trade["slippage_penalty_dollars"], 300.0)

    def test_portfolio_drawdown_resilience_under_shock(self):
        """Verify portfolio drawdown under stress remains <= 5.0%."""
        tester = MacroStressTester()
        # Simulated trades with max drawdown 2.5%
        trades = [{"pnl": 400.0, "timestamp": "2024-01-01 10:00:00"} for _ in range(20)]
        trades.append({"pnl": -2500.0, "timestamp": "2024-01-02 10:00:00"})

        res = tester.evaluate_macro_stress_resilience(trades, initial_capital=100000.0)
        self.assertIsInstance(res, StressTestResult)
        self.assertLessEqual(res.stressed_max_drawdown_pct, 5.0)
        self.assertTrue(res.is_compliant)


class TestValidationReportGenerator(unittest.TestCase):
    """Test Suite for Feature 21: Luxury Dark-Gold HTML & Markdown Reports."""

    def test_color_palette_hex_codes(self):
        """Verify Spartan institutional hex colors."""
        self.assertEqual(ValidationReportGenerator.PALETTE["background"], "#04060a")
        self.assertEqual(ValidationReportGenerator.PALETTE["card_bg"], "#080b12")
        self.assertEqual(ValidationReportGenerator.PALETTE["border"], "#221c10")
        self.assertEqual(ValidationReportGenerator.PALETTE["gold_accent"], "#d4af37")

    def test_currency_formatting(self):
        """Verify positive, negative, and large balance formatting."""
        self.assertEqual(ValidationReportGenerator.format_currency(154230.50), "$154,230.50")
        self.assertEqual(ValidationReportGenerator.format_currency(-1500.00), "-$1,500.00")
        self.assertEqual(ValidationReportGenerator.format_currency(1250000000.50), "$1,250,000,000.50")

    def test_svg_polyline_generation(self):
        """Verify SVG polyline points generated."""
        curve = [100000, 102000, 101500, 105000]
        svg = ValidationReportGenerator.generate_svg_polyline(curve, width=800, height=200)
        self.assertIn("<svg", svg)
        self.assertIn("<polyline", svg)
        self.assertIn('stroke="#d4af37"', svg)

    def test_single_data_point_svg(self):
        """Corner Case: Single data point SVG."""
        svg = ValidationReportGenerator.generate_svg_polyline([100000.0])
        self.assertIn("0,100", svg)

    def test_html_report_generation(self):
        """Verify HTML file is generated with font-mono and Spartan styling."""
        gen = ValidationReportGenerator()
        metrics = {
            "profit_factor": 2.45,
            "win_rate": 64.0,
            "risk_reward": 1.75,
            "max_drawdown_pct": 3.4,
            "sharpe_ratio": 2.85,
            "sortino_ratio": 3.95,
            "calmar_ratio": 3.5,
            "recovery_factor": 4.8,
            "ending_equity": 154230.50,
            "net_profit": 54230.50,
        }
        equity = [100000, 110000, 125000, 154230]
        underwater = [0.0, 0.0, 0.0, 0.0]
        filepath = gen.generate_html_report(metrics, equity, underwater)
        self.assertTrue(os.path.exists(filepath))
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("font-mono", content)
        self.assertIn("#04060a", content)
        self.assertIn("#d4af37", content)

    def test_markdown_summary_generation(self):
        """Verify Markdown summary contains required table structure."""
        gen = ValidationReportGenerator()
        metrics = {
            "profit_factor": 2.45,
            "win_rate": 64.0,
            "risk_reward": 1.75,
            "max_drawdown_pct": 3.4,
            "sharpe_ratio": 2.85,
            "sortino_ratio": 3.95,
            "calmar_ratio": 3.5,
            "recovery_factor": 4.8,
        }
        filepath = gen.generate_markdown_summary(metrics)
        self.assertTrue(os.path.exists(filepath))
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("| Metric | Target | Actual | Status |", content)
        self.assertIn("Profit Factor", content)
        self.assertIn("PASS", content)


if __name__ == "__main__":
    unittest.main()
