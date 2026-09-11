"""
Base test infrastructure, assertion utilities, and synthetic data oracles for Opaque-Box E2E tests.
"""

import unittest
import math
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple


class OpaqueBoxTestCase(unittest.TestCase):
    """
    Institutional Base Test Case for Spartan Quantitative Engine.
    Provides strict domain-specific assertion helpers and data generators.
    """

    def assertWithinBounds(self, value: float, min_val: float, max_val: float, msg: Optional[str] = None):
        """Assert that min_val <= value <= max_val."""
        full_msg = f"Value {value} out of bounds [{min_val}, {max_val}]"
        if msg:
            full_msg += f" - {msg}"
        self.assertTrue(min_val <= value <= max_val, full_msg)

    def assertAlmostEqualRelative(self, actual: float, expected: float, max_relative_error: float = 1e-3, msg: Optional[str] = None):
        """Assert that relative difference |actual - expected| / max(|expected|, 1e-9) <= max_relative_error."""
        denom = max(abs(expected), 1e-9)
        rel_err = abs(actual - expected) / denom
        full_msg = f"Relative error {rel_err:.6e} exceeds tolerance {max_relative_error:.6e} (actual={actual}, expected={expected})"
        if msg:
            full_msg += f" - {msg}"
        self.assertLessEqual(rel_err, max_relative_error, full_msg)

    def assertMonotonicNonDecreasing(self, sequence: List[float], msg: Optional[str] = None):
        """Assert that sequence[i+1] >= sequence[i] for all i."""
        for i in range(len(sequence) - 1):
            if sequence[i + 1] < sequence[i] - 1e-9:
                err_msg = f"Sequence violation at index {i}: {sequence[i]} > {sequence[i+1]}"
                if msg:
                    err_msg += f" - {msg}"
                self.fail(err_msg)

    def assertMonotonicNonIncreasing(self, sequence: List[float], msg: Optional[str] = None):
        """Assert that sequence[i+1] <= sequence[i] for all i."""
        for i in range(len(sequence) - 1):
            if sequence[i + 1] > sequence[i] + 1e-9:
                err_msg = f"Sequence violation at index {i}: {sequence[i]} < {sequence[i+1]}"
                if msg:
                    err_msg += f" - {msg}"
                self.fail(err_msg)

    def assertDictMatchesContract(self, target_dict: Dict[str, Any], required_types: Dict[str, type], msg: Optional[str] = None):
        """Assert that all required keys are present in target_dict and match expected types."""
        for key, expected_type in required_types.items():
            self.assertIn(key, target_dict, f"Missing required key '{key}' in dictionary contract. {msg or ''}")
            val = target_dict[key]
            # Handle float/int compatibility
            if expected_type is float and isinstance(val, (int, float)):
                continue
            self.assertIsInstance(val, expected_type, f"Field '{key}' has type {type(val).__name__}, expected {expected_type.__name__}. {msg or ''}")

    # ==========================================
    # Synthetic Data Generators for Opaque Testing
    # ==========================================
    @staticmethod
    def generate_synthetic_ohlcv(
        n_bars: int = 500,
        start_price: float = 2000.0,
        drift: float = 0.0,
        volatility: float = 0.01,
        seed: int = 42,
        base_spread: float = 0.20
    ) -> pd.DataFrame:
        """
        Generate mathematically sound OHLCV DataFrame satisfying financial price action invariants:
        - High >= max(Open, Close)
        - Low <= min(Open, Close)
        - Low > 0
        - Volume >= 0
        - Spread > 0
        """
        np.random.seed(seed)
        dt_index = pd.date_range(start="2024-01-01 00:00:00", periods=n_bars, freq="15min")
        
        # Log return simulation
        returns = np.random.normal(loc=drift / n_bars, scale=volatility / np.sqrt(n_bars), size=n_bars)
        log_prices = np.log(start_price) + np.cumsum(returns)
        close_prices = np.exp(log_prices)

        opens = [start_price] + list(close_prices[:-1])
        highs = []
        lows = []
        volumes = []
        spreads = []

        for i in range(n_bars):
            c = close_prices[i]
            o = opens[i]
            max_oc = max(o, c)
            min_oc = min(o, c)
            
            # Intrabar expansion
            intra_vol = abs(np.random.normal(0, volatility * c * 0.3))
            h = max_oc + intra_vol
            l = max(0.01, min_oc - intra_vol)
            
            v = max(10, int(np.random.lognormal(mean=5.0, sigma=0.8)))
            sp = max(0.01, base_spread + np.random.exponential(scale=base_spread * 0.1))

            highs.append(round(h, 4))
            lows.append(round(l, 4))
            volumes.append(v)
            spreads.append(round(sp, 4))

        df = pd.DataFrame({
            "timestamp": dt_index,
            "open": [round(x, 4) for x in opens],
            "high": highs,
            "low": lows,
            "close": [round(x, 4) for x in close_prices],
            "volume": volumes,
            "spread": spreads
        })
        return df

    @staticmethod
    def generate_mean_reverting_pair(
        n_bars: int = 1000,
        beta: float = 0.05,
        half_life: float = 20.0,
        seed: int = 1337
    ) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """
        Generate cointegrated asset pair (Asset A and Asset B) with known Ornstein-Uhlenbeck spread:
        Asset A = beta * Asset B + Spread + Noise
        """
        np.random.seed(seed)
        theta = math.log(2.0) / half_life
        dt = 1.0
        
        # Asset B is a geometric random walk (e.g. BTC)
        b_returns = np.random.normal(0.0001, 0.01, n_bars)
        price_b = 50000.0 * np.exp(np.cumsum(b_returns))
        
        # Spread is OU mean reverting to 0
        spread = np.zeros(n_bars)
        for t in range(1, n_bars):
            ds = -theta * spread[t-1] * dt + np.random.normal(0, 50.0)
            spread[t] = spread[t-1] + ds
            
        # Asset A (e.g. ETH) is cointegrated with beta
        price_a = beta * price_b + spread + 200.0 + np.random.normal(0, 5.0, n_bars)
        
        return pd.Series(price_a, name="ETH"), pd.Series(price_b, name="BTC"), pd.Series(spread, name="Spread")
