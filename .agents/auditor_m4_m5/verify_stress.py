import sys, os
sys.path.insert(0, os.path.abspath("."))
import numpy as np
import pandas as pd
from quant_research.validation.monte_carlo import MonteCarloSimulator
from quant_research.validation.backtest_engine import BacktestEngine
from quant_research.validation.oos_split import PurgedTimeSeriesSplitter
from quant_research.validation.metrics import QuantitativeMetrics
from quant_research.execution.python.webhook_client import normalize_trade_payload, matches_secret
from quant_research.execution.python.ccxt_executor import generate_client_order_id

print("--- Test 1: Monte Carlo Randomness & Non-determinism ---")
trades = [{"pnl": 500.0 if i % 2 == 0 else -300.0} for i in range(50)]
mc1 = MonteCarloSimulator(n_simulations=1000, random_seed=1)
r1 = mc1.run_simulation(trades)
mc2 = MonteCarloSimulator(n_simulations=1000, random_seed=2)
r2 = mc2.run_simulation(trades)
print(f"Seed 1 p95 DD: {r1.percentile_95_max_dd}, Seed 2 p95 DD: {r2.percentile_95_max_dd}")
assert r1.sample_equity_paths[0] != r2.sample_equity_paths[0], "Paths must be independently randomized"
print("Monte Carlo randomness check PASSED")

print("--- Test 2: Purged Split Temporal Isolation ---")
dates = pd.date_range("2024-01-01", periods=500, freq="1h")
df = pd.DataFrame({"close": range(500)}, index=dates)
splitter = PurgedTimeSeriesSplitter(embargo_bars=20)
train, val, test = splitter.split(df)
assert train.index.max() < val.index.min(), "Train must strictly precede Val"
assert val.index.max() < test.index.min(), "Val must strictly precede Test"
print(f"Split bounds: Train max={train.index.max()}, Val min={val.index.min()}, Val max={val.index.max()}, Test min={test.index.min()}")
print("Purged split temporal monotonicity check PASSED")

print("--- Test 3: Webhook HMAC Secret Verification ---")
assert matches_secret("key_123", "key_123") is True
assert matches_secret("key_123", "key_456") is False
assert matches_secret("", "key_123") is False
print("Timing-safe secret check PASSED")

print("--- Test 4: Webhook Payload Normalization & Anomaly Cap ---")
raw_hack = {"pnl": 999999.0, "lots": 500.0, "openPrice": 0.0, "closePrice": 100.0, "symbol": "XAUUSD"}
norm = normalize_trade_payload(raw_hack)
assert norm["lots"] == 50.0, f"Lots should be clamped to 50, got {norm['lots']}"
assert norm["pnl"] == 50000.0, f"PnL should be capped to 50000, got {norm['pnl']}"
assert norm["isAnomalous"] is True, "isAnomalous flag must be set"
print("Payload normalization defense PASSED")

print("--- Test 5: Client Order ID Generation ---")
cid = generate_client_order_id(888801, 1726000000000)
assert cid == "SPARTAN_888801_1726000000000"
print(f"Client Order ID: {cid}")
print("All adversarial empirical checks PASSED!")
