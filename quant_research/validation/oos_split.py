"""Spartan Quantitative Validation Framework - Purged & Embargoed OOS Splitter.

Implements:
- Strict 60/20/20 Train / Validation / Test temporal partitioning.
- Marcos Lopez de Prado's Purging and Embargoing cross-validation protocol.
- Zero-lookahead transformation pipeline: fit strictly on IS, transform OOS.
- Trade boundary purging to eliminate serial correlation leakage.
"""

from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd


class PurgedTimeSeriesSplitter:
    """
    Purged & Embargoed Time-Series Partitioner.
    
    Guarantees:
    1. Temporal monotonicity (Train < Val < Test).
    2. Embargo buffer bars to absorb auto-regressive market memory.
    3. Purging of trades spanning across split boundaries.
    4. Zero information leakage or lookahead bias.
    """

    def __init__(
        self,
        train_pct: float = 0.60,
        val_pct: float = 0.20,
        test_pct: float = 0.20,
        embargo_bars: int = 50,
    ) -> None:
        """
        Initialize time-series partitioner with strict proportion validation.
        
        Args:
            train_pct: Proportion of data allocated to training (default 0.60).
            val_pct: Proportion of data allocated to validation (default 0.20).
            test_pct: Proportion of data allocated to blind OOS test (default 0.20).
            embargo_bars: Number of buffer bars between partitions (default 50).
        """
        if not math_is_close_to_one(train_pct + val_pct + test_pct, 1.0):
            raise ValueError(
                f"Split proportions must sum to 1.0 (got {train_pct + val_pct + test_pct:.6f})"
            )
        if train_pct <= 0 or val_pct <= 0 or test_pct <= 0:
            raise ValueError("All split proportions must be strictly positive.")
        if embargo_bars < 0:
            raise ValueError("Embargo bars cannot be negative.")

        self.train_pct = train_pct
        self.val_pct = val_pct
        self.test_pct = test_pct
        self.embargo_bars = embargo_bars

    def split(
        self,
        df: pd.DataFrame,
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """
        Partition dataframe into Train, Validation, and Test sets with embargo buffers.
        
        Args:
            df: Time-ordered pandas DataFrame (bars).
            
        Returns:
            Tuple of (train_df, val_df, test_df)
        """
        if df is None or not isinstance(df, pd.DataFrame):
            raise ValueError("Input data must be a valid pandas DataFrame.")

        n_bars = len(df)
        if self.embargo_bars > 0 and n_bars <= self.embargo_bars * 2:
            raise ValueError(
                f"Dataset length ({n_bars}) is too short for embargo buffer ({self.embargo_bars} bars). "
                f"Requires at least {self.embargo_bars * 2 + 1} bars."
            )

        train_len = int(n_bars * self.train_pct)
        val_len = int(n_bars * self.val_pct)

        train_end = train_len
        val_start = train_end + self.embargo_bars
        val_end = min(n_bars, int(n_bars * (self.train_pct + self.val_pct)))
        test_start = val_end + self.embargo_bars

        train_df = df.iloc[:train_end].copy()
        val_df = df.iloc[val_start:val_end].copy() if val_start < val_end else pd.DataFrame(columns=df.columns)
        test_df = df.iloc[test_start:].copy() if test_start < n_bars else pd.DataFrame(columns=df.columns)

        return train_df, val_df, test_df

    def purge_overlapping_trades(
        self,
        trades: List[Dict[str, Any]],
        split_boundary: Union[pd.Timestamp, str],
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Purge trades that straddle the split boundary from training data.
        
        A trade is purged if: open_time < split_boundary < close_time.
        
        Args:
            trades: List of trade dictionaries containing 'open_time' and 'close_time'.
            split_boundary: Timestamp marking the boundary between IS and OOS.
            
        Returns:
            Tuple of (retained_train_trades, test_trades, purged_trades)
        """
        boundary_ts = pd.Timestamp(split_boundary)
        train_trades: List[Dict[str, Any]] = []
        test_trades: List[Dict[str, Any]] = []
        purged_trades: List[Dict[str, Any]] = []

        for trade in trades:
            open_ts = pd.Timestamp(trade.get("open_time") or trade.get("timestamp"))
            close_ts = pd.Timestamp(trade.get("close_time") or trade.get("exit_time") or open_ts)

            # Check if trade straddles the boundary
            if open_ts < boundary_ts < close_ts:
                purged_trades.append(trade)
            elif close_ts <= boundary_ts:
                train_trades.append(trade)
            elif open_ts >= boundary_ts:
                test_trades.append(trade)
            else:
                # Boundary edge cases
                if open_ts < boundary_ts:
                    purged_trades.append(trade)
                else:
                    test_trades.append(trade)

        return train_trades, test_trades, purged_trades

    @staticmethod
    def standardize_series(
        train_series: Union[pd.Series, np.ndarray],
        test_series: Union[pd.Series, np.ndarray],
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Standardize test series strictly using parameters fitted on train series (Zero Lookahead).
        
        Args:
            train_series: In-sample training feature values.
            test_series: Out-of-sample testing feature values.
            
        Returns:
            Tuple of (standardized_train_array, standardized_test_array)
        """
        train_arr = np.asarray(train_series, dtype=float)
        test_arr = np.asarray(test_series, dtype=float)

        mean_is = float(np.nanmean(train_arr)) if len(train_arr) > 0 else 0.0
        std_is = float(np.nanstd(train_arr)) if len(train_arr) > 0 else 1.0
        if std_is < 1e-12:
            std_is = 1.0

        std_train = (train_arr - mean_is) / std_is
        std_test = (test_arr - mean_is) / std_is
        return std_train, std_test


def math_is_close_to_one(val: float, target: float = 1.0, tol: float = 1e-5) -> bool:
    """Helper to verify float sum proximity to target."""
    return abs(val - target) < tol
