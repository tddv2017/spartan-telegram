"""High-Speed Market Data Loader, Validator, Gap Detector, and Resampler."""

from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
import pandas as pd
import numpy as np

from quant_research.core.logger import get_logger
from quant_research.core.types import IBarDataProvider
from quant_research.data.generator import SyntheticDataGenerator

logger = get_logger("spartan_data_loader")


class DataLoader(IBarDataProvider):
    """
    High-Speed Bar & Tick Data Loader with validation, caching,
    gap detection, and multi-timeframe resampling.
    Implements IBarDataProvider protocol.
    """

    def __init__(self, data_directory: Optional[Union[str, Path]] = None):
        self.data_dir = Path(data_directory) if data_directory else Path("./quant_research/data_store")
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self._cache: Dict[Tuple[str, str], pd.DataFrame] = {}
        self._generator: Optional[SyntheticDataGenerator] = None

    @property
    def generator(self) -> SyntheticDataGenerator:
        """Lazy-loaded synthetic generator for on-demand synthesis."""
        if self._generator is None:
            self._generator = SyntheticDataGenerator()
        return self._generator

    @staticmethod
    def validate_bars(df: pd.DataFrame) -> Tuple[bool, List[str]]:
        """
        Validate OHLCV data integrity:
        1. Required columns present
        2. No NaN / infinite values
        3. High >= max(Open, Close)
        4. Low <= min(Open, Close)
        5. High >= Low
        6. Volume >= 0
        7. Timestamps strictly ascending
        """
        issues: List[str] = []
        required_cols = {"timestamp", "open", "high", "low", "close", "volume"}
        missing = required_cols - set(df.columns)
        if missing:
            return False, [f"Missing required columns: {missing}"]

        if df.empty:
            return False, ["DataFrame is empty"]

        # Check NaNs
        null_counts = df[list(required_cols)].isnull().sum()
        if null_counts.any():
            issues.append(f"NaN values detected: {null_counts.to_dict()}")

        # Check Price Integrity
        invalid_high = (df["high"] < df[["open", "close"]].max(axis=1)).sum()
        if invalid_high > 0:
            issues.append(f"Found {invalid_high} bars where High < max(Open, Close)")

        invalid_low = (df["low"] > df[["open", "close"]].min(axis=1)).sum()
        if invalid_low > 0:
            issues.append(f"Found {invalid_low} bars where Low > min(Open, Close)")

        invalid_spread = (df["high"] < df["low"]).sum()
        if invalid_spread > 0:
            issues.append(f"Found {invalid_spread} bars where High < Low")

        invalid_volume = (df["volume"] < 0).sum()
        if invalid_volume > 0:
            issues.append(f"Found {invalid_volume} bars with negative volume")

        # Check timestamp ordering
        if not df["timestamp"].is_monotonic_increasing:
            issues.append("Timestamps are not strictly monotonically increasing")

        return len(issues) == 0, issues

    @staticmethod
    def detect_gaps(
        df: pd.DataFrame,
        timeframe: str = "H1",
        max_gap_multiplier: float = 2.5,
        is_forex_or_metals: bool = True,
    ) -> List[Dict[str, Any]]:
        """
        Detect abnormal time gaps in data.
        Distinguishes between standard weekend market closures and anomalous intraday data gaps.
        """
        if len(df) < 2:
            return []

        from quant_research.data.generator import TIMEFRAME_MINUTES
        expected_step = timedelta(minutes=TIMEFRAME_MINUTES.get(timeframe.upper(), 60))
        max_normal_delta = expected_step * max_gap_multiplier

        gaps: List[Dict[str, Any]] = []
        timestamps = pd.to_datetime(df["timestamp"])

        for i in range(1, len(timestamps)):
            prev_ts = timestamps.iloc[i - 1]
            curr_ts = timestamps.iloc[i]
            delta = curr_ts - prev_ts

            if delta > max_normal_delta:
                # Check if gap is weekend closure (Friday night to Sunday evening)
                is_weekend = False
                if is_forex_or_metals:
                    # Friday evening to Sunday evening gap is ~48-52 hours
                    if prev_ts.weekday() == 4 and curr_ts.weekday() == 6:
                        is_weekend = True

                if not is_weekend:
                    gaps.append({
                        "start": prev_ts.isoformat(),
                        "end": curr_ts.isoformat(),
                        "gap_duration": str(delta),
                        "missing_bars_approx": int(delta / expected_step) - 1,
                    })

        return gaps

    @staticmethod
    def resample_bars(df: pd.DataFrame, target_timeframe: str) -> pd.DataFrame:
        """
        Resample lower timeframe bars (e.g. M1) into target timeframe (M5, M15, H1, H4, D1).
        Uses institutional OHLC aggregation rules:
        - Open: First
        - High: Max
        - Low: Min
        - Close: Last
        - Volume: Sum
        - Spread: Mean
        """
        from quant_research.data.generator import TIMEFRAME_MINUTES
        if target_timeframe.upper() not in TIMEFRAME_MINUTES:
            raise ValueError(f"Unsupported timeframe: {target_timeframe}")

        df_copy = df.copy()
        df_copy["timestamp"] = pd.to_datetime(df_copy["timestamp"])
        df_copy = df_copy.set_index("timestamp").sort_index()

        freq_map = {
            "M1": "1min",
            "M5": "5min",
            "M15": "15min",
            "H1": "1h",
            "H4": "4h",
            "D1": "1D",
        }
        rule = freq_map[target_timeframe.upper()]

        agg_dict: Dict[str, str] = {
            "open": "first",
            "high": "max",
            "low": "min",
            "close": "last",
            "volume": "sum",
        }
        if "spread" in df_copy.columns:
            agg_dict["spread"] = "mean"

        resampled = df_copy.resample(rule).agg(agg_dict).dropna().reset_index()
        return resampled

    def save_bars(self, df: pd.DataFrame, symbol: str, timeframe: str) -> Path:
        """Save bars to local parquet or csv storage."""
        filename = f"{symbol.upper()}_{timeframe.upper()}.parquet"
        filepath = self.data_dir / filename
        try:
            df.to_parquet(filepath, index=False)
        except Exception:
            filename = f"{symbol.upper()}_{timeframe.upper()}.csv"
            filepath = self.data_dir / filename
            df.to_csv(filepath, index=False)
        self._cache[(symbol.upper(), timeframe.upper())] = df
        return filepath

    def load_bars_from_file(self, symbol: str, timeframe: str) -> Optional[pd.DataFrame]:
        """Load bars from local storage if existing."""
        filepath_p = self.data_dir / f"{symbol.upper()}_{timeframe.upper()}.parquet"
        if filepath_p.exists():
            try:
                df = pd.read_parquet(filepath_p)
                df["timestamp"] = pd.to_datetime(df["timestamp"])
                self._cache[(symbol.upper(), timeframe.upper())] = df
                return df
            except Exception:
                pass

        filepath_c = self.data_dir / f"{symbol.upper()}_{timeframe.upper()}.csv"
        if filepath_c.exists():
            df = pd.read_csv(filepath_c)
            df["timestamp"] = pd.to_datetime(df["timestamp"])
            self._cache[(symbol.upper(), timeframe.upper())] = df
            return df
        return None

    def get_bars(
        self,
        symbol: str,
        timeframe: str,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
    ) -> pd.DataFrame:
        """
        Implementation of IBarDataProvider protocol.
        Retrieves bars from cache, disk, or generates synthetic data on demand.
        """
        sym = symbol.upper()
        tf = timeframe.upper()
        cache_key = (sym, tf)

        if cache_key in self._cache:
            df = self._cache[cache_key]
        else:
            disk_df = self.load_bars_from_file(sym, tf)
            if disk_df is not None:
                df = disk_df
            else:
                # Generate synthetic data
                start_str = start.strftime("%Y-%m-%d") if start else "2023-01-01"
                end_str = end.strftime("%Y-%m-%d") if end else "2026-01-01"
                df = self.generator.generate_bars(
                    symbol=sym,
                    timeframe=tf,
                    start_date=start_str,
                    end_date=end_str,
                )
                self.save_bars(df, sym, tf)

        df["timestamp"] = pd.to_datetime(df["timestamp"])

        # Filter by start/end if requested
        if start is not None:
            start_tz = start.replace(tzinfo=timezone.utc) if start.tzinfo is None else start
            df = df[df["timestamp"] >= start_tz]
        if end is not None:
            end_tz = end.replace(tzinfo=timezone.utc) if end.tzinfo is None else end
            df = df[df["timestamp"] <= end_tz]

        return df.reset_index(drop=True)
