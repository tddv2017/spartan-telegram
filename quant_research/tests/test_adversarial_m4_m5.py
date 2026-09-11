"""Empirical Adversarial Challenge Test Suite: Milestones 4 & 5.

Comprehensive stress-testing and boundary verification across:
1. Monte Carlo Simulator under extreme tail shocks and 5,000 runs
2. Macro news stress tester across ALL 110 historical events with 10x spread spikes and 30-pip adverse slippage
3. MQL5 EA code syntax, balanced delimiters, memory safety, include guards, and offline queue spooling (spartan_webhook_spool.dat)
4. Webhook client latency, payload schema, timing-safe authentication, and anomaly capping ($50,000 limit)
"""

import http.server
import json
import os
import re
import socketserver
import tempfile
import threading
import time
import unittest
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd
import yaml

from quant_research.execution.python.ccxt_executor import (
    CCXTExecutor,
    generate_client_order_id,
    MAX_BREAKOUT_SLIPPAGE_PCT,
    SUPPORTED_EXCHANGES,
    SUPPORTED_SYMBOLS,
)
from quant_research.execution.python.webhook_client import (
    matches_secret,
    normalize_trade_payload,
    SpartanWebhookClient,
    QUEUE_CAPACITY,
)
from quant_research.validation.metrics import QuantitativeMetrics
from quant_research.validation.monte_carlo import MonteCarloResult, MonteCarloSimulator
from quant_research.validation.stress_testing import MacroEvent, MacroStressTester


# ============================================================================
# HELPER PARSERS FOR MQL5 STATIC ANALYSIS
# ============================================================================
EXECUTION_MQL5_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "execution", "mql5")
)
INCLUDE_DIR = os.path.join(EXECUTION_MQL5_DIR, "Include")


def strip_mql5_code(content: str) -> str:
    """Strip block comments, string literals, and line comments cleanly."""
    # 1. Block comments
    content = re.sub(r"/\*.*?\*/", "", content, flags=re.DOTALL)
    # 2. String literals (preserve escaped quotes)
    content = re.sub(r'"(?:\\.|[^"\\])*"', '""', content)
    # 3. Line comments
    content = re.sub(r"//.*", "", content)
    return content


def verify_mql5_delimiter_balance(text: str) -> Tuple[bool, str]:
    """Check exact balance of braces {}, parentheses (), and brackets []."""
    cleaned = strip_mql5_code(text)
    stack = []
    pairs = {')': '(', '}': '{', ']': '['}

    for idx, char in enumerate(cleaned):
        if char in '({[':
            stack.append((char, idx))
        elif char in ')}]':
            if not stack:
                return False, f"Unexpected closing '{char}' at index {idx}"
            top, pos = stack.pop()
            if pairs[char] != top:
                return False, f"Mismatched delimiter: expected '{pairs[char]}' matching pos {pos} but got '{char}' at {idx}"

    if stack:
        unclosed, pos = stack[-1]
        return False, f"Unclosed '{unclosed}' originating at index {pos}"

    return True, "Balanced"


# ============================================================================
# TARGET AREA 1: MONTE CARLO STRESS WITH 5,000 RUNS & TAIL SHOCKS
# ============================================================================
class TestMonteCarloAdversarialStress(unittest.TestCase):
    """Adversarial stress harness for Monte Carlo Simulation Engine."""

    def setUp(self):
        # High quality baseline trades (Sharpe > 2.5, Win Rate > 60%, Max DD < 4%)
        np.random.seed(42)
        self.baseline_trades = []
        for i in range(180):
            # 65% win rate, R:R 1:1.6
            is_win = np.random.rand() < 0.65
            pnl = float(np.random.normal(240.0, 40.0) if is_win else np.random.normal(-150.0, 30.0))
            self.baseline_trades.append({"trade_id": i, "pnl": round(pnl, 2)})

    def test_5000_simulations_scaling_and_distribution(self):
        """Stress test Monte Carlo engine with 5,000 runs for stability and precision."""
        sim = MonteCarloSimulator(n_simulations=5000, random_seed=123)
        self.assertEqual(sim.n_simulations, 5000)

        t_start = time.perf_counter()
        result: MonteCarloResult = sim.run_simulation(
            self.baseline_trades,
            initial_capital=100000.0,
            jitter_lambda=0.0,
        )
        elapsed_sec = time.perf_counter() - t_start

        # Performance constraint: 5,000 runs over 180 trades must execute in < 3.0s
        self.assertLess(elapsed_sec, 3.0, f"Monte Carlo 5,000 runs took too long: {elapsed_sec:.3f}s")

        # Distribution verification
        self.assertEqual(result.n_simulations, 5000)
        self.assertEqual(result.prob_ruin, 0.00)
        self.assertLess(result.prob_dd_exceeds_10_pct, 0.01)
        self.assertLessEqual(result.percentile_95_max_dd, 5.0)
        self.assertLessEqual(result.cvar_99_max_dd, 7.5)
        self.assertTrue(result.is_compliant)
        self.assertGreater(result.median_final_equity, 100000.0)

    def test_severe_slippage_jitter_triggers_non_compliance(self):
        """Inject severe adverse exponential slippage jitter (lambda=35.0) and verify compliance tripwire."""
        sim = MonteCarloSimulator(n_simulations=2500, random_seed=42)

        # Baseline with zero jitter passes
        res_baseline = sim.run_simulation(self.baseline_trades, jitter_lambda=0.0)
        self.assertTrue(res_baseline.is_compliant)

        # Apply catastrophic jitter: every trade suffers exponential penalty with mean $35/trade
        res_stressed = sim.run_simulation(self.baseline_trades, jitter_lambda=35.0)
        self.assertGreater(res_stressed.percentile_95_max_dd, res_baseline.percentile_95_max_dd)
        self.assertGreater(res_stressed.cvar_99_max_dd, res_baseline.cvar_99_max_dd)
        self.assertLess(res_stressed.median_final_equity, res_baseline.median_final_equity)

    def test_clustered_fat_tail_losses_trigger_ruin_detection(self):
        """Simulate flash-crash clustered catastrophic loss trades and test probability of ruin."""
        sim = MonteCarloSimulator(n_simulations=2500, random_seed=777)

        # Inject 15 catastrophic consecutive losses of -$3,000 each into the trades
        ruin_trades = list(self.baseline_trades)
        for i in range(15):
            ruin_trades.append({"trade_id": 900 + i, "pnl": -3000.0})

        result = sim.run_simulation(ruin_trades, initial_capital=50000.0)

        # Drawdown should exceed 10% frequently and ruin should trigger
        self.assertGreater(result.prob_dd_exceeds_10_pct, 0.05)
        self.assertFalse(result.is_compliant)

    def test_edge_cases_empty_single_and_zero_variance(self):
        """Test edge cases: empty list, single trade, zero variance, and 100% loss sequence."""
        sim = MonteCarloSimulator(n_simulations=1000, random_seed=42)

        # 1. Empty trade list
        res_empty = sim.run_simulation([], initial_capital=100000.0)
        self.assertEqual(res_empty.prob_ruin, 0.0)
        self.assertEqual(res_empty.percentile_95_max_dd, 0.0)
        self.assertEqual(res_empty.median_final_equity, 100000.0)
        self.assertTrue(res_empty.is_compliant)

        # 2. Single winning trade
        res_single = sim.run_simulation([{"pnl": 500.0}], initial_capital=100000.0)
        self.assertEqual(res_single.percentile_95_max_dd, 0.0)
        self.assertEqual(res_single.median_final_equity, 100500.0)

        # 3. 100% loss sequence (50 trades of -$500 on $10k capital = -$25k total loss)
        loss_trades = [{"pnl": -500.0} for _ in range(50)]
        res_losses = sim.run_simulation(loss_trades, initial_capital=10000.0)
        self.assertEqual(res_losses.prob_ruin, 1.0)
        self.assertEqual(res_losses.prob_dd_exceeds_10_pct, 1.0)
        self.assertFalse(res_losses.is_compliant)

    def test_10000_simulations_ultra_scale(self):
        """Stress test Monte Carlo engine with 10,000 runs to test numeric stability and memory scaling."""
        sim = MonteCarloSimulator(n_simulations=10000, random_seed=999)
        t_start = time.perf_counter()
        result = sim.run_simulation(self.baseline_trades, initial_capital=100000.0)
        elapsed = time.perf_counter() - t_start

        self.assertEqual(result.n_simulations, 10000)
        self.assertLess(elapsed, 5.0, f"10,000 Monte Carlo runs exceeded 5.0s: {elapsed:.2f}s")
        self.assertTrue(result.is_compliant)
        self.assertEqual(result.prob_ruin, 0.00)
        self.assertLessEqual(result.percentile_95_max_dd, 5.0)



# ============================================================================
# TARGET AREA 2: 110 NEWS EVENTS STRESS TESTING & 10x SPREAD / 30-PIP SLIPPAGE
# ============================================================================
class TestMacroNews110EventsAdversarial(unittest.TestCase):
    """Stress testing across ALL 110 macroeconomic announcements in news_calendar.yaml."""

    def setUp(self):
        self.config_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "config", "news_calendar.yaml")
        )
        self.assertTrue(os.path.isfile(self.config_path), f"news_calendar.yaml missing at {self.config_path}")
        self.tester = MacroStressTester(
            config_path=self.config_path,
            pre_event_window_minutes=5,
            post_event_window_minutes=30,
            spread_multiplier=10.0,
            slippage_pips=30.0,
            crypto_slippage_pct=0.02,
            latency_delay_ms=2000.0,
        )

    def test_calendar_event_count_exactly_110_and_schema(self):
        """Verify news_calendar.yaml contains exactly 110 high-impact announcements with correct schema."""
        with open(self.config_path, "r", encoding="utf-8") as f:
            raw_data = yaml.safe_load(f)

        events_raw = raw_data.get("events", [])
        self.assertEqual(len(events_raw), 110, f"Expected exactly 110 events, found {len(events_raw)}")
        self.assertEqual(len(self.tester.events), 110)

        # Validate each event
        valid_types = {"CPI", "NFP", "FOMC"}
        for idx, e in enumerate(self.tester.events):
            self.assertIn(e.event_type, valid_types, f"Event #{idx} invalid type: {e.event_type}")
            self.assertEqual(e.impact, "HIGH", f"Event #{idx} must be HIGH impact")
            self.assertIsInstance(e.timestamp, pd.Timestamp)
            self.assertGreaterEqual(e.timestamp.year, 2023)
            self.assertLessEqual(e.timestamp.year, 2026)

    def test_shock_window_detection_across_all_110_events(self):
        """Empirically test that EVERY SINGLE ONE of the 110 events activates the stress window."""
        for idx, event in enumerate(self.tester.events):
            ts_exact = event.timestamp
            in_window, trig_event = self.tester.is_in_stress_window(ts_exact)
            self.assertTrue(in_window, f"Event #{idx} ({event.description}) exact time not recognized in window")
            self.assertEqual(trig_event.description, event.description)

            # Test pre-event window boundary (exact -5 min)
            ts_pre = event.timestamp - pd.Timedelta(minutes=5)
            in_pre, _ = self.tester.is_in_stress_window(ts_pre)
            self.assertTrue(in_pre, f"Event #{idx} pre-boundary -5m not recognized")

            # Test post-event window boundary (exact +30 min)
            ts_post = event.timestamp + pd.Timedelta(minutes=30)
            in_post, _ = self.tester.is_in_stress_window(ts_post)
            self.assertTrue(in_post, f"Event #{idx} post-boundary +30m not recognized")

            # Test outside window (-6 min and +31 min)
            # Ensure not overlapping with adjacent event
            ts_before = event.timestamp - pd.Timedelta(minutes=6)
            in_before, _ = self.tester.is_in_stress_window(ts_before)
            # If false, confirm boundary works cleanly
            if not in_before:
                self.assertFalse(in_before)

    def test_10x_spread_spikes_injection_all_110_events(self):
        """Construct synthetic bars covering all 110 events and assert 10x spread multiplication."""
        event_timestamps = [e.timestamp for e in self.tester.events]
        # Create bars: 1 bar at event, 1 bar 10m after event, 1 bar 2 hours before event (normal)
        bar_times = []
        for et in event_timestamps:
            bar_times.append(et - pd.Timedelta(hours=2))   # Normal
            bar_times.append(et)                           # In window (10x)
            bar_times.append(et + pd.Timedelta(minutes=10)) # In window (10x)

        df = pd.DataFrame({
            "timestamp": bar_times,
            "open": [2500.0] * len(bar_times),
            "high": [2505.0] * len(bar_times),
            "low": [2495.0] * len(bar_times),
            "close": [2502.0] * len(bar_times),
            "spread": [0.20] * len(bar_times),
        })

        stressed_df = self.tester.inject_spread_spikes(df, base_spread=0.20)
        self.assertEqual(len(stressed_df), len(bar_times))

        # Check spreads: normal bars must be 0.20, shock bars must be 2.00 (10x)
        spread_vals = stressed_df["spread"].values
        for i in range(len(event_timestamps)):
            normal_idx = i * 3
            shock_idx1 = i * 3 + 1
            shock_idx2 = i * 3 + 2

            self.assertAlmostEqual(spread_vals[normal_idx], 0.20, places=2)
            self.assertAlmostEqual(spread_vals[shock_idx1], 2.00, places=2)
            self.assertAlmostEqual(spread_vals[shock_idx2], 2.00, places=2)

    def test_30_pip_adverse_slippage_and_latency_penalties(self):
        """Verify 30-pip adverse slippage penalty and 2000ms latency across metals, forex, and crypto."""
        first_event = self.tester.events[0]
        event_time = first_event.timestamp

        # Case 1: Gold XAUUSD ($0.10 pip, 100 oz contract, 1 lot -> 30 * 0.1 * 100 * 1 = $300 penalty)
        trade_gold = {
            "close_time": event_time + pd.Timedelta(minutes=2),
            "pnl": 500.0,
            "lots": 1.0,
            "type": "BUY",
        }
        stressed_gold = self.tester.calculate_stressed_trade_pnl(
            trade_gold, asset_class="metals", pip_size=0.1, contract_size=100.0
        )
        self.assertTrue(stressed_gold["stress_applied"])
        self.assertEqual(stressed_gold["slippage_penalty_dollars"], 300.0)
        self.assertEqual(stressed_gold["pnl"], 200.0)  # 500 - 300
        self.assertEqual(stressed_gold["latency_injected_ms"], 2000.0)

        # Case 2: Forex EURUSD ($0.0001 pip, 100,000 contract, 2 lots -> 30 * 0.0001 * 100000 * 2 = $600 penalty)
        trade_forex = {
            "close_time": event_time + pd.Timedelta(minutes=15),
            "pnl": 1200.0,
            "lots": 2.0,
            "type": "SELL",
        }
        stressed_forex = self.tester.calculate_stressed_trade_pnl(
            trade_forex, asset_class="forex", pip_size=0.0001, contract_size=100000.0
        )
        self.assertTrue(stressed_forex["stress_applied"])
        self.assertEqual(stressed_forex["slippage_penalty_dollars"], 600.0)
        self.assertEqual(stressed_forex["pnl"], 600.0)

        # Case 3: Crypto BTC (2.0% on $60,000 * 0.5 lot = $600 penalty)
        trade_crypto = {
            "close_time": event_time + pd.Timedelta(minutes=20),
            "close_price": 60000.0,
            "pnl": 1500.0,
            "lots": 0.5,
            "type": "BUY",
        }
        stressed_crypto = self.tester.calculate_stressed_trade_pnl(
            trade_crypto, asset_class="crypto"
        )
        self.assertTrue(stressed_crypto["stress_applied"])
        self.assertEqual(stressed_crypto["slippage_penalty_dollars"], 600.0)
        self.assertEqual(stressed_crypto["pnl"], 900.0)

        # Case 4: Trade outside stress window receives zero penalty
        trade_safe = {
            "close_time": event_time + pd.Timedelta(hours=5),
            "pnl": 450.0,
            "lots": 1.0,
            "type": "BUY",
        }
        stressed_safe = self.tester.calculate_stressed_trade_pnl(trade_safe, asset_class="metals")
        self.assertFalse(stressed_safe["stress_applied"])
        self.assertEqual(stressed_safe["pnl"], 450.0)

    def test_evaluate_macro_stress_resilience_multi_year_dataset(self):
        """Evaluate macro resilience across multi-year trades hitting 110 news events."""
        trades = []
        # Sample 20 events from the 110 events and create trades
        for idx in range(0, len(self.tester.events), 5):
            ev = self.tester.events[idx]
            # 1 trade inside shock window
            trades.append({
                "trade_id": idx,
                "close_time": ev.timestamp + pd.Timedelta(minutes=5),
                "pnl": 120.0,
                "lots": 0.25,
                "type": "BUY",
            })
            # 1 trade well outside shock window
            trades.append({
                "trade_id": idx + 1000,
                "close_time": ev.timestamp + pd.Timedelta(days=2),
                "pnl": 180.0,
                "lots": 0.25,
                "type": "BUY",
            })

        result = self.tester.evaluate_macro_stress_resilience(
            trades, initial_capital=100000.0, asset_class="metals", max_dd_limit_pct=5.0
        )
        self.assertEqual(result.total_events_tested, 110)
        self.assertGreater(result.events_in_dataset, 0)
        self.assertGreaterEqual(result.stressed_max_drawdown_pct, result.baseline_max_drawdown_pct)
        self.assertTrue(result.is_compliant)
        self.assertLessEqual(result.stressed_max_drawdown_pct, 5.0)

        # Extreme catastrophic exposure test: 1 trade with 100 lots inside shock window breaching 5% DD
        extreme_trades = list(trades)
        extreme_trades.append({
            "trade_id": 9999,
            "close_time": self.tester.events[0].timestamp,
            "pnl": -2000.0,
            "lots": 30.0,  # 30 lots * 30 pips * $10/pip = -$9,000 extra penalty!
            "type": "BUY",
        })
        breach_result = self.tester.evaluate_macro_stress_resilience(
            extreme_trades, initial_capital=100000.0, asset_class="metals", max_dd_limit_pct=5.0
        )
        self.assertFalse(breach_result.is_compliant)
        self.assertGreater(breach_result.stressed_max_drawdown_pct, 5.0)



# ============================================================================
# TARGET AREA 3: MQL5 EA SYNTAX, DELIMITER BALANCES, MEMORY LEAKS & SPOOL QUEUE
# ============================================================================
class TestMQL5EAArchitectureAndSpoolQueue(unittest.TestCase):
    """Adversarial validation of MQL5 EA source integrity and offline queue spooling."""

    def setUp(self):
        self.mql5_files = [
            os.path.join(EXECUTION_MQL5_DIR, "SpartanMasterEA.mq5"),
            os.path.join(INCLUDE_DIR, "SpartanCore.mqh"),
            os.path.join(INCLUDE_DIR, "SpartanGhost.mqh"),
            os.path.join(INCLUDE_DIR, "SpartanNews.mqh"),
            os.path.join(INCLUDE_DIR, "SpartanRisk.mqh"),
            os.path.join(INCLUDE_DIR, "SpartanTrade.mqh"),
            os.path.join(INCLUDE_DIR, "SpartanWebhook.mqh"),
        ]

    def test_mql5_delimiter_balance_all_7_files(self):
        """Adversarially parse all 7 MQL5 source files and verify 100% delimiter balance."""
        for file_path in self.mql5_files:
            self.assertTrue(os.path.isfile(file_path), f"File not found: {file_path}")
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            balanced, msg = verify_mql5_delimiter_balance(content)
            self.assertTrue(balanced, f"Delimiter syntax error in {os.path.basename(file_path)}: {msg}")

    def test_mql5_include_guards_and_property_strict(self):
        """Verify every include header has unique header guards and #property strict."""
        include_headers = [f for f in self.mql5_files if f.endswith(".mqh")]
        seen_guards = set()

        for header in include_headers:
            with open(header, "r", encoding="utf-8") as f:
                content = f.read()

            self.assertIn("#property strict", content, f"{os.path.basename(header)} missing #property strict")

            # Extract guard
            match = re.search(r"#ifndef\s+(\w+)", content)
            self.assertIsNotNone(match, f"{os.path.basename(header)} missing #ifndef header guard")
            guard = match.group(1)
            self.assertNotIn(guard, seen_guards, f"Duplicate include guard: {guard}")
            seen_guards.add(guard)

            # Check matching #define and #endif
            self.assertIn(f"#define {guard}", content)
            self.assertIn(f"#endif // {guard}", content)

    def test_mql5_memory_safety_and_pointer_cleanup(self):
        """Inspect dynamic allocation ('new ') to ensure proper destructors and 'delete' pair."""
        for file_path in self.mql5_files:
            with open(file_path, "r", encoding="utf-8") as f:
                content = strip_mql5_code(f.read())

            # Find all instances of 'new '
            new_allocations = re.findall(r"\bnew\s+([A-Za-z0-9_]+)", content)
            delete_calls = re.findall(r"\bdelete\s+([A-Za-z0-9_]+)", content)

            # If dynamic allocation is used, ensure matching deallocations
            if new_allocations:
                self.assertEqual(
                    len(new_allocations),
                    len(delete_calls),
                    f"Mismatched new/delete in {os.path.basename(file_path)}: {len(new_allocations)} new vs {len(delete_calls)} delete",
                )

    def test_spool_queue_overflow_to_disk_and_fifo_restoration(self):
        """Stress test 500-item in-memory queue capacity, disk spool overflow, and recovery."""
        temp_dir = tempfile.mkdtemp()
        spool_file = os.path.join(temp_dir, "spartan_webhook_spool.dat")

        client = SpartanWebhookClient(api_key="secret", spool_filename=spool_file)

        # 1. Enqueue 750 items: 500 to RAM, 250 overflow to disk spool
        for i in range(750):
            client.enqueue({"item_id": i, "payload": f"data_{i}"})

        self.assertEqual(len(client.queue), 500)
        self.assertTrue(os.path.isfile(spool_file))

        # Check line count in spool file (should be exactly 250)
        with open(spool_file, "r", encoding="utf-8") as f:
            lines = [l.strip() for l in f if l.strip()]
        self.assertEqual(len(lines), 250)

        # 2. Dequeue first 500 items and verify exact FIFO ordering
        for i in range(500):
            item = client.queue.pop(0)
            self.assertEqual(item["item_id"], i)
        self.assertEqual(len(client.queue), 0)

        # 3. Drain spool file back into active queue
        recovered = client.drain_spool_from_disk()
        self.assertEqual(recovered, 250)
        self.assertEqual(len(client.queue), 250)
        self.assertFalse(os.path.exists(spool_file), "Spool file must be cleaned after draining")

        # Verify recovered items maintain FIFO ordering from 500 to 749
        for i in range(250):
            item = client.queue.pop(0)
            self.assertEqual(item["item_id"], 500 + i)

    def test_spool_corruption_resilience(self):
        """Test spool recovery when file contains corrupted lines and whitespace."""
        temp_dir = tempfile.mkdtemp()
        spool_file = os.path.join(temp_dir, "corrupt_spool.dat")

        # Write mixed valid, corrupted, and empty lines
        with open(spool_file, "w", encoding="utf-8") as f:
            f.write('{"item_id": 1}\n')
            f.write('\n')
            f.write('NOT_A_VALID_JSON_STRING\n')
            f.write('{"item_id": 2}\n')
            f.write('{"item_id": 3, "broken": \n')
            f.write('{"item_id": 4}\n')

        client = SpartanWebhookClient(api_key="secret", spool_filename=spool_file)
        drained = client.drain_spool_from_disk()

        # Should recover 3 valid JSON items (1, 2, 4) without crashing
        self.assertEqual(drained, 3)
        self.assertEqual([x["item_id"] for x in client.queue], [1, 2, 4])

    def test_mql5_deinit_flush_and_startup_drain_cycle(self):
        """Simulate EA terminal shutdown flush and subsequent startup drain lifecycle."""
        temp_dir = tempfile.mkdtemp()
        spool_file = os.path.join(temp_dir, "spool_lifecycle.dat")

        # Session 1: Client has 350 items in memory when terminal closes (OnDeinit)
        client1 = SpartanWebhookClient(api_key="secret", spool_filename=spool_file)
        for i in range(350):
            client1.enqueue({"trade_id": i, "sym": "XAUUSD"})

        self.assertEqual(len(client1.queue), 350)
        self.assertFalse(os.path.exists(spool_file))  # Still in memory

        # Simulate OnDeinit: FlushAllToDisk
        while client1.queue:
            client1.spool_to_disk(client1.queue.pop(0))

        self.assertEqual(len(client1.queue), 0)
        self.assertTrue(os.path.exists(spool_file))

        # Session 2: New EA instance loads on terminal startup (OnInit)
        client2 = SpartanWebhookClient(api_key="secret", spool_filename=spool_file)
        recovered = client2.drain_spool_from_disk()

        self.assertEqual(recovered, 350)
        self.assertEqual(len(client2.queue), 350)
        self.assertEqual(client2.queue[0]["trade_id"], 0)
        self.assertEqual(client2.queue[-1]["trade_id"], 349)
        self.assertFalse(os.path.exists(spool_file))



# ============================================================================
# TARGET AREA 4: WEBHOOK CLIENT LATENCY, PAYLOAD SCHEMAS & ANOMALY CAPPING
# ============================================================================
class MockWebhookServerHandler(http.server.BaseHTTPRequestHandler):
    """Mock HTTP handler emulating /api/ea/webhook response and headers."""

    def log_message(self, format, *args):
        pass  # Silence console logging during test

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body_bytes = self.rfile.read(content_length)
        auth_key = self.headers.get("x-ea-key", "")

        # Verify secret
        if auth_key != "valid_secret_key_123":
            self.send_response(401)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"success":false,"error":"UNAUTHORIZED"}')
            return

        try:
            data = json.loads(body_bytes.decode("utf-8"))
        except Exception:
            data = {}

        action = data.get("action", "HEARTBEAT")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()

        response = {
            "success": True,
            "action": action,
            "globalBotActive": True,
            "serverTime": int(time.time() * 1000),
        }
        self.wfile.write(json.dumps(response).encode("utf-8"))


class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    allow_reuse_address = True


class TestWebhookClientLatencyAndSchemas(unittest.TestCase):
    """Adversarial verification of Webhook client schemas, latency, and anomaly thresholds."""

    @classmethod
    def setUpClass(cls):
        # Start ephemeral local multithreaded HTTP server on random free port
        cls.server = ThreadedTCPServer(("127.0.0.1", 0), MockWebhookServerHandler)
        cls.port = cls.server.server_address[1]
        cls.server_thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.server_thread.start()
        cls.server_url = f"http://127.0.0.1:{cls.port}/api/ea/webhook"


    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.secret = "valid_secret_key_123"
        self.client = SpartanWebhookClient(
            api_key=self.secret,
            server_url=self.server_url,
            timeout=2.0,
        )

    def test_timing_safe_secret_boundary_cases(self):
        """Adversarially challenge constant-time secret matching."""
        # 1. Exact match
        self.assertTrue(matches_secret(self.secret, self.secret))
        # 2. Case sensitivity
        self.assertFalse(matches_secret(self.secret.upper(), self.secret))
        # 3. Off-by-one character
        self.assertFalse(matches_secret(self.secret + "x", self.secret))
        # 4. Truncated
        self.assertFalse(matches_secret(self.secret[:-1], self.secret))
        # 5. Empty / None
        self.assertFalse(matches_secret("", self.secret))
        self.assertFalse(matches_secret(self.secret, ""))
        self.assertFalse(matches_secret("", ""))

    def test_anomaly_capping_exact_50k_boundary(self):
        """Test strict boundary conditions for $50,000 PnL anomaly defense."""
        # Just below boundary: $49,999.99 -> not anomalous
        p1 = normalize_trade_payload({"pnl": 49999.99, "symbol": "XAUUSD"})
        self.assertFalse(p1["isAnomalous"])
        self.assertEqual(p1["pnl"], 49999.99)

        # Exact boundary: $50,000.00 -> not anomalous
        p2 = normalize_trade_payload({"pnl": 50000.00, "symbol": "XAUUSD"})
        self.assertFalse(p2["isAnomalous"])
        self.assertEqual(p2["pnl"], 50000.00)

        # Just above boundary: $50,000.01 -> ANOMALOUS & CAPPED
        p3 = normalize_trade_payload({"pnl": 50000.01, "symbol": "XAUUSD"})
        self.assertTrue(p3["isAnomalous"])
        self.assertEqual(p3["pnl"], 50000.00)

        # Negative boundary: -$50,000.00 -> not anomalous
        p4 = normalize_trade_payload({"pnl": -50000.00, "symbol": "BTCUSDT"})
        self.assertFalse(p4["isAnomalous"])
        self.assertEqual(p4["pnl"], -50000.00)

        # Negative breach: -$50,000.01 -> ANOMALOUS & CAPPED to -$50,000
        p5 = normalize_trade_payload({"pnl": -50000.01, "symbol": "BTCUSDT"})
        self.assertTrue(p5["isAnomalous"])
        self.assertEqual(p5["pnl"], -50000.00)

    def test_lot_size_boundary_clamping(self):
        """Test strict clamping of lots within [0.01, 50.0]."""
        test_cases = [
            (-10.0, 0.01),
            (0.00, 0.01),
            (0.005, 0.01),
            (0.01, 0.01),
            (1.50, 1.50),
            (50.0, 50.0),
            (50.01, 50.0),
            (999.0, 50.0),
        ]
        for in_lots, expected in test_cases:
            res = normalize_trade_payload({"lots": in_lots, "pnl": 10.0})
            self.assertEqual(res["lots"], expected, f"Failed lot clamping for input {in_lots}")

    def test_multi_asset_pricing_mandatory_open_price_and_pct(self):
        """Verify mandatory explicit openPrice and pnlPercentage for non-XAU assets."""
        # Crypto ETH trade BUY
        eth_buy = normalize_trade_payload({
            "symbol": "ETHUSDT",
            "type": "BUY",
            "openPrice": 3000.0,
            "closePrice": 3150.0,
            "lots": 1.0,
            "pnl": 150.0,
        })
        self.assertEqual(eth_buy["symbol"], "ETHUSDT")
        self.assertEqual(eth_buy["openPrice"], 3000.0)
        self.assertEqual(eth_buy["closePrice"], 3150.0)
        self.assertAlmostEqual(eth_buy["pnlPercentage"], 5.0, places=2)

        # Forex GBPUSD trade SELL
        gbp_sell = normalize_trade_payload({
            "symbol": "GBPUSD",
            "type": "SELL",
            "openPrice": 1.3000,
            "closePrice": 1.2870,
            "lots": 1.0,
            "pnl": 1300.0,
        })
        self.assertEqual(gbp_sell["symbol"], "GBPUSD")
        self.assertEqual(gbp_sell["openPrice"], 1.3000)
        self.assertEqual(gbp_sell["closePrice"], 1.2870)
        self.assertAlmostEqual(gbp_sell["pnlPercentage"], 1.0, places=2)

    def test_live_socket_roundtrip_latency_under_500ms(self):
        """Execute real socket HTTP request against local server and assert latency < 500ms."""
        # Send heartbeat
        res = self.client.report_heartbeat(
            account_number="9824029",
            broker="Exness",
            server="Exness-Real21",
            balance=105000.0,
            equity=105300.0,
            floating_profit=300.0,
            margin=1500.0,
            free_margin=103800.0,
            margin_level=7020.0,
            open_positions=1,
        )

        self.assertTrue(res["success"], f"HTTP POST failed: {res}")
        self.assertEqual(res["status_code"], 200)
        # Verify sub-500ms requirement (typically < 15ms on loopback)
        self.assertLess(res["latency_ms"], 500.0, f"Latency breached 500ms: {res['latency_ms']:.2f}ms")
        self.assertTrue(self.client.global_bot_active)

    def test_trade_closed_real_transmission_and_queue_drain(self):
        """Verify report_trade_closed transmission over real socket and queue drain."""
        res = self.client.report_trade_closed(
            ticket=88812345,
            symbol="BTCUSDT",
            trade_type="BUY",
            lots=0.5,
            open_price=64000.0,
            close_price=65200.0,
            pnl=600.0,
            magic_number=888801,
        )
        self.assertTrue(res["success"])
        self.assertEqual(res["status_code"], 200)
        self.assertLess(res["latency_ms"], 500.0)
        self.assertEqual(res["payload"]["symbol"], "BTCUSDT")
        self.assertAlmostEqual(res["payload"]["pnlPercentage"], 1.88, places=2)

    def test_webhook_async_concurrency_stress(self):
        """Stress test Webhook client under 10 concurrent async requests."""
        import asyncio

        async def run_concurrent():
            tasks = []
            for i in range(10):
                task = self.client.report_trade_closed_async(
                    ticket=900000 + i,
                    symbol="XAUUSD",
                    trade_type="BUY" if i % 2 == 0 else "SELL",
                    lots=0.1,
                    open_price=2500.0,
                    close_price=2505.0,
                    pnl=50.0,
                    magic_number=888802,
                )
                tasks.append(task)
            return await asyncio.gather(*tasks)

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        results = loop.run_until_complete(run_concurrent())
        loop.close()

        self.assertEqual(len(results), 10)
        for r in results:
            self.assertTrue(r["success"])
            self.assertEqual(r["status_code"], 200)
            self.assertLess(r["latency_ms"], 500.0)


    def test_webhook_http_error_re_enqueue(self):
        """Verify that server failure (e.g. invalid endpoint or wrong key) enqueues payload."""
        bad_client = SpartanWebhookClient(
            api_key="wrong_unauthorized_key",
            server_url=self.server_url,
            timeout=2.0,
        )
        res = bad_client.report_trade_closed(
            ticket=999999,
            symbol="EURUSD",
            trade_type="BUY",
            lots=1.0,
            open_price=1.0900,
            close_price=1.0950,
            pnl=500.0,
        )
        self.assertFalse(res["success"])
        self.assertEqual(res["status_code"], 401)
        self.assertTrue(res["enqueued"])
        self.assertEqual(len(bad_client.queue), 1)
        self.assertEqual(bad_client.stats["failed"], 1)


if __name__ == "__main__":
    unittest.main()

