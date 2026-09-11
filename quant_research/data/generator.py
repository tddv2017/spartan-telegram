"""High-Fidelity 36-Month Multi-Asset Synthetic Market Data & Tick Generator."""

import math
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
import yaml

from quant_research.core.logger import get_logger

logger = get_logger("spartan_data_generator")


# Default initial prices and characteristics at 2023-01-01
DEFAULT_ASSET_PARAMS: Dict[str, Dict[str, Any]] = {
    "XAUUSD": {
        "initial_price": 1825.0,
        "drift_annual": 0.15,
        "vol_annual": 0.16,
        "baseline_spread": 0.20,
        "digits": 2,
        "trading_schedule": "23/5",
    },
    "BTCUSDT": {
        "initial_price": 16540.0,
        "drift_annual": 0.65,
        "vol_annual": 0.55,
        "baseline_spread": 5.0,
        "digits": 1,
        "trading_schedule": "24/7",
    },
    "ETHUSDT": {
        "initial_price": 1195.0,
        "drift_annual": 0.50,
        "vol_annual": 0.60,
        "baseline_spread": 0.30,
        "digits": 2,
        "trading_schedule": "24/7",
    },
    "EURUSD": {
        "initial_price": 1.0700,
        "drift_annual": 0.01,
        "vol_annual": 0.075,
        "baseline_spread": 0.00005,
        "digits": 5,
        "trading_schedule": "24/5",
    },
    "GBPUSD": {
        "initial_price": 1.2050,
        "drift_annual": 0.02,
        "vol_annual": 0.085,
        "baseline_spread": 0.00008,
        "digits": 5,
        "trading_schedule": "24/5",
    },
}

TIMEFRAME_MINUTES: Dict[str, int] = {
    "M1": 1,
    "M5": 5,
    "M15": 15,
    "H1": 60,
    "H4": 240,
    "D1": 1440,
}


class SyntheticDataGenerator:
    """Institutional-grade Multi-Asset Market Data Generator."""

    def __init__(
        self,
        news_calendar_path: Optional[str] = None,
        assets_config_path: Optional[str] = None,
    ):
        self.news_events: List[Dict[str, Any]] = []
        self.asset_configs: Dict[str, Any] = {}
        self._load_configs(news_calendar_path, assets_config_path)

    def _load_configs(
        self, news_path: Optional[str], assets_path: Optional[str]
    ) -> None:
        """Load news events and asset configurations if available."""
        # Find news calendar
        if news_path and Path(news_path).exists():
            with open(news_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
                self.news_events = data.get("events", [])
        else:
            default_news = Path(__file__).resolve().parent.parent / "config" / "news_calendar.yaml"
            if default_news.exists():
                with open(default_news, "r", encoding="utf-8") as f:
                    data = yaml.safe_load(f)
                    self.news_events = data.get("events", [])

        # Find asset config
        if assets_path and Path(assets_path).exists():
            with open(assets_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
                self.asset_configs = data.get("assets", {})
        else:
            default_assets = Path(__file__).resolve().parent.parent / "config" / "assets.yaml"
            if default_assets.exists():
                with open(default_assets, "r", encoding="utf-8") as f:
                    data = yaml.safe_load(f)
                    self.asset_configs = data.get("assets", {})

        # Pre-parse news event timestamps
        self.parsed_news_events: List[Tuple[datetime, str, str]] = []
        for ev in self.news_events:
            try:
                dt_str = ev["date"]
                dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
                self.parsed_news_events.append((dt, ev.get("type", "NEWS"), ev.get("impact", "HIGH")))
            except Exception:
                continue

    def _is_trading_hour(self, dt: datetime, schedule: str) -> bool:
        """Filter out weekend bars for Forex / Metals."""
        weekday = dt.weekday()  # Monday is 0, Sunday is 6
        if schedule == "24/7":
            return True
        elif schedule == "24/5":
            # Forex closes Friday ~22:00 UTC, reopens Sunday ~22:00 UTC
            if weekday == 5:  # Saturday
                return False
            if weekday == 6 and dt.hour < 22:  # Sunday before 22:00
                return False
            if weekday == 4 and dt.hour >= 22:  # Friday after 22:00
                return False
            return True
        elif schedule == "23/5":
            # Metals daily break 22:00-23:00 UTC, closed weekends
            if weekday == 5:
                return False
            if weekday == 6 and dt.hour < 23:
                return False
            if weekday == 4 and dt.hour >= 22:
                return False
            if dt.hour == 22:  # Daily maintenance break
                return False
            return True
        return True

    def generate_bars(
        self,
        symbol: str,
        timeframe: str = "H1",
        start_date: str = "2023-01-01",
        end_date: str = "2026-01-01",
        seed: Optional[int] = 42,
    ) -> pd.DataFrame:
        """
        Generate realistic OHLCV bars over the specified timeframe.

        Uses regime-switching Geometric Brownian Motion with stochastic drift,
        Merton jump-diffusion on news events, intra-bar wick synthesis,
        and spread expansion modeling.
        """
        if seed is not None:
            np.random.seed(seed)

        sym = symbol.upper()
        asset_info = DEFAULT_ASSET_PARAMS.get(sym, DEFAULT_ASSET_PARAMS["EURUSD"])
        config_info = self.asset_configs.get(sym, {})

        initial_price = asset_info["initial_price"]
        annual_drift = asset_info["drift_annual"]
        annual_vol = asset_info["vol_annual"]
        baseline_spread = config_info.get("baseline_spread", asset_info["baseline_spread"])
        digits = asset_info["digits"]
        schedule = asset_info["trading_schedule"]

        tf_minutes = TIMEFRAME_MINUTES.get(timeframe.upper(), 60)
        dt_start = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
        dt_end = datetime.fromisoformat(end_date).replace(tzinfo=timezone.utc)

        # Generate timestamps
        current_dt = dt_start
        step = timedelta(minutes=tf_minutes)
        timestamps: List[datetime] = []

        while current_dt < dt_end:
            if self._is_trading_hour(current_dt, schedule):
                timestamps.append(current_dt)
            current_dt += step

        n_bars = len(timestamps)
        if n_bars == 0:
            raise ValueError(f"No active trading bars found between {start_date} and {end_date}")

        # Time parameters per bar
        dt_years = (tf_minutes / (365.25 * 1440)) if schedule == "24/7" else (tf_minutes / (252.0 * 1440))

        # ---------------------------------------------------------------------
        # 1. Regime-Switching Volatility and Trend Persistence Simulation
        # ---------------------------------------------------------------------
        # We simulate 4 macro regimes:
        # - Regime 0: Range-Bound / Mean-Reverting (drift = 0, vol = 1.0x)
        # - Regime 1: Bull Trend (drift = +1.1x, vol = 1.3x)
        # - Regime 2: Bear Trend (drift = -0.9x, vol = 1.3x)
        # - Regime 3: Vol Compression (drift = 0, vol = 0.5x)
        #
        # Markov regime sequence
        regimes = np.zeros(n_bars, dtype=int)
        transition_matrix = np.array([
            [0.96, 0.02, 0.01, 0.01],
            [0.03, 0.95, 0.01, 0.01],
            [0.03, 0.01, 0.94, 0.02],
            [0.04, 0.03, 0.01, 0.92],
        ])

        curr_regime = 0
        for i in range(1, n_bars):
            curr_regime = np.random.choice(4, p=transition_matrix[curr_regime])
            regimes[i] = curr_regime

        vol_multipliers = np.array([1.0, 1.25, 1.25, 0.55])
        drift_multipliers = np.array([0.0, 1.10, -0.85, 0.0])

        bar_vols = annual_vol * np.sqrt(dt_years) * vol_multipliers[regimes]
        bar_drifts = (annual_drift - 0.5 * annual_vol**2) * dt_years * drift_multipliers[regimes]

        # Fractional Gaussian noise or AR(1) momentum persistence
        # Generate correlated standard normals for trending regimes
        raw_shocks = np.random.normal(0, 1, n_bars)
        persistent_shocks = np.zeros(n_bars)
        persistent_shocks[0] = raw_shocks[0]
        for i in range(1, n_bars):
            if regimes[i] == 1 or regimes[i] == 2:  # Trend persistence
                persistent_shocks[i] = 0.35 * persistent_shocks[i-1] + math.sqrt(1 - 0.35**2) * raw_shocks[i]
            elif regimes[i] == 0:  # Mean-reverting anti-persistence
                persistent_shocks[i] = -0.25 * persistent_shocks[i-1] + math.sqrt(1 - 0.25**2) * raw_shocks[i]
            else:
                persistent_shocks[i] = raw_shocks[i]

        log_returns = bar_drifts + bar_vols * persistent_shocks

        # ---------------------------------------------------------------------
        # 2. News Shock & Event Spread Multiplier Injection
        # ---------------------------------------------------------------------
        spreads = np.full(n_bars, baseline_spread)
        news_dt_set = {ev_dt: (ev_type, ev_imp) for ev_dt, ev_type, ev_imp in self.parsed_news_events}

        for i, ts in enumerate(timestamps):
            # Check if within 30m before or 15m after any scheduled news event
            for ev_dt, (ev_type, ev_imp) in news_dt_set.items():
                diff_sec = (ts - ev_dt).total_seconds()
                if -1800 <= diff_sec <= 900:  # News window
                    mult = np.random.uniform(3.0, 6.5)
                    spreads[i] = baseline_spread * mult
                    # If this is the exact event window (-5m to +5m), inject jump return
                    if -300 <= diff_sec <= 300:
                        jump_direction = np.random.choice([-1.0, 1.0])
                        jump_size = np.random.uniform(2.5, 4.2) * bar_vols[i]
                        log_returns[i] += jump_direction * jump_size
                    break

        # Generate Close Price Path
        log_prices = np.zeros(n_bars)
        log_prices[0] = math.log(initial_price)
        for i in range(1, n_bars):
            log_prices[i] = log_prices[i-1] + log_returns[i]

        close_prices = np.exp(log_prices)

        # ---------------------------------------------------------------------
        # 3. High-Fidelity OHLC Construction with Intraday Wicks
        # ---------------------------------------------------------------------
        opens = np.zeros(n_bars)
        highs = np.zeros(n_bars)
        lows = np.zeros(n_bars)
        closes = np.round(close_prices, digits)
        volumes = np.zeros(n_bars)

        # First bar
        opens[0] = round(initial_price, digits)
        half_bar_range = max(10**(-digits), abs(closes[0] * bar_vols[0]))
        highs[0] = round(max(opens[0], closes[0]) + np.random.exponential(half_bar_range * 0.6), digits)
        lows[0] = round(min(opens[0], closes[0]) - np.random.exponential(half_bar_range * 0.6), digits)
        volumes[0] = round(np.random.lognormal(mean=7.0, sigma=0.5))

        for i in range(1, n_bars):
            # Open is previous close with tiny micro-slippage
            opens[i] = closes[i-1]
            c = closes[i]
            o = opens[i]

            bar_range = max(10**(-digits), abs(c * bar_vols[i]))
            upper_wick = np.random.exponential(bar_range * 0.7)
            lower_wick = np.random.exponential(bar_range * 0.7)

            high = round(max(o, c) + upper_wick, digits)
            low = round(min(o, c) - lower_wick, digits)

            # Strict validation guarantees
            if high < max(o, c):
                high = max(o, c)
            if low > min(o, c):
                low = min(o, c)
            if high == low:
                high = round(high + 10**(-digits), digits)

            highs[i] = high
            lows[i] = low

            # Volume positively correlated with volatility and return magnitude
            vol_boost = 1.0 + (spreads[i] / baseline_spread - 1.0) * 0.8
            ret_boost = abs(log_returns[i]) / (bar_vols[i] + 1e-8)
            vol_mean = 7.0 + 0.3 * ret_boost
            volumes[i] = round(np.random.lognormal(mean=vol_mean, sigma=0.4) * vol_boost)

        df = pd.DataFrame({
            "timestamp": timestamps,
            "open": opens,
            "high": highs,
            "low": lows,
            "close": closes,
            "volume": volumes,
            "spread": np.round(spreads, digits + 1),
        })

        return df

    def generate_ticks(
        self,
        df_bars: pd.DataFrame,
        ticks_per_bar: int = 4,
    ) -> pd.DataFrame:
        """
        Synthesize realistic intra-bar bid/ask ticks from OHLCV bars.

        Traverses Open -> Low/High -> High/Low -> Close depending on bar polarity.
        """
        if len(df_bars) == 0:
            return pd.DataFrame(columns=["timestamp", "bid", "ask", "spread", "volume"])

        records: List[Dict[str, Any]] = []

        for _, row in df_bars.iterrows():
            ts = row["timestamp"]
            o = float(row["open"])
            h = float(row["high"])
            l = float(row["low"])
            c = float(row["close"])
            spread = float(row["spread"])
            vol = max(1.0, float(row["volume"]) / max(1, ticks_per_bar))

            # Determine intra-bar price sequence
            if c >= o:  # Bullish bar: Open -> Low -> High -> Close
                price_points = [o, l, h, c]
            else:  # Bearish bar: Open -> High -> Low -> Close
                price_points = [o, h, l, c]

            # Distribute timestamps across bar duration
            bar_duration_seconds = 60  # Default 1 minute
            delta_sec = bar_duration_seconds / len(price_points)

            for idx, price in enumerate(price_points):
                tick_ts = ts + timedelta(seconds=idx * delta_sec)
                bid = round(price - spread / 2.0, 5)
                ask = round(price + spread / 2.0, 5)
                records.append({
                    "timestamp": tick_ts,
                    "bid": bid,
                    "ask": ask,
                    "spread": spread,
                    "volume": round(vol),
                })

        return pd.DataFrame(records)

    def generate_multi_asset_dataset(
        self,
        symbols: Optional[List[str]] = None,
        timeframe: str = "H1",
        start_date: str = "2023-01-01",
        end_date: str = "2026-01-01",
        seed: Optional[int] = 42,
    ) -> Dict[str, pd.DataFrame]:
        """Generate synchronized multi-asset OHLCV bar dataset."""
        if symbols is None:
            symbols = ["XAUUSD", "BTCUSDT", "ETHUSDT", "EURUSD", "GBPUSD"]

        dataset: Dict[str, pd.DataFrame] = {}
        for idx, sym in enumerate(symbols):
            sym_seed = (seed + idx * 100) if seed is not None else None
            df = self.generate_bars(
                symbol=sym,
                timeframe=timeframe,
                start_date=start_date,
                end_date=end_date,
                seed=sym_seed,
            )
            dataset[sym] = df
            logger.info(
                f"Generated synthetic {sym} {timeframe} dataset: {len(df)} bars ({start_date} to {end_date})"
            )

        return dataset
