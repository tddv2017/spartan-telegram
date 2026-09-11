"""Comprehensive Unit Tests for Multi-Asset Data Generation, Loading, and Validation."""

from datetime import datetime, timedelta, timezone
from pathlib import Path
import numpy as np
import pandas as pd
import pytest
import yaml

from quant_research.core.types import IBarDataProvider
from quant_research.data.generator import SyntheticDataGenerator
from quant_research.data.loader import DataLoader


@pytest.fixture
def generator() -> SyntheticDataGenerator:
    """Fixture providing initialized data generator."""
    return SyntheticDataGenerator()


@pytest.fixture
def loader(tmp_path: Path) -> DataLoader:
    """Fixture providing data loader with temporary directory storage."""
    return DataLoader(data_directory=tmp_path)


def test_assets_yaml_configuration():
    """Verify assets.yaml exists and defines all 5 required asset classes."""
    config_path = Path(__file__).resolve().parent.parent / "config" / "assets.yaml"
    assert config_path.exists(), "assets.yaml must exist"

    with open(config_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    assert "assets" in data
    assets = data["assets"]
    expected_symbols = ["XAUUSD", "BTCUSDT", "ETHUSDT", "EURUSD", "GBPUSD"]

    for sym in expected_symbols:
        assert sym in assets, f"Symbol {sym} must be defined in assets.yaml"
        cfg = assets[sym]
        assert cfg["contract_size"] > 0
        assert cfg["tick_size"] > 0
        assert cfg["min_lot"] > 0
        assert cfg["max_lot"] >= cfg["min_lot"]
        assert cfg["baseline_spread"] > 0
        assert cfg["trading_schedule"] in ["24/7", "24/5", "23/5"]


def test_news_calendar_yaml():
    """Verify news_calendar.yaml contains high-impact macro releases."""
    news_path = Path(__file__).resolve().parent.parent / "config" / "news_calendar.yaml"
    assert news_path.exists(), "news_calendar.yaml must exist"

    with open(news_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    assert "events" in data
    events = data["events"]
    assert len(events) >= 50, "News calendar should cover 2023-2026 releases"

    event_types = {e["type"] for e in events}
    assert "CPI" in event_types
    assert "NFP" in event_types
    assert "FOMC" in event_types


def test_synthetic_bars_generation_xauusd(generator: SyntheticDataGenerator):
    """Test 36-month XAUUSD H1 synthetic bar generation."""
    df = generator.generate_bars(
        symbol="XAUUSD",
        timeframe="H1",
        start_date="2023-01-01",
        end_date="2026-01-01",
        seed=42,
    )

    assert isinstance(df, pd.DataFrame)
    assert len(df) > 15000, f"Expected >15,000 bars for 36 months H1, got {len(df)}"

    required_cols = ["timestamp", "open", "high", "low", "close", "volume", "spread"]
    for col in required_cols:
        assert col in df.columns, f"Missing column {col}"

    # Price bounds check for Gold (realistic trading ranges across 2023-2026)
    assert df["open"].min() > 1500.0
    assert df["close"].max() < 3500.0


def test_ohlcv_invariants_and_validation(generator: SyntheticDataGenerator):
    """Verify strict OHLCV mathematical and structural invariants."""
    for symbol in ["XAUUSD", "BTCUSDT", "EURUSD"]:
        df = generator.generate_bars(
            symbol=symbol,
            timeframe="H1",
            start_date="2023-01-01",
            end_date="2023-04-01",  # 3 months
            seed=101,
        )

        is_valid, issues = DataLoader.validate_bars(df)
        assert is_valid, f"Validation failed for {symbol}: {issues}"
        assert len(issues) == 0

        # Detailed mathematical invariant checks
        assert (df["high"] >= df["open"]).all(), "High must be >= Open"
        assert (df["high"] >= df["close"]).all(), "High must be >= Close"
        assert (df["low"] <= df["open"]).all(), "Low must be <= Open"
        assert (df["low"] <= df["close"]).all(), "Low must be <= Close"
        assert (df["high"] >= df["low"]).all(), "High must be >= Low"
        assert (df["volume"] >= 0).all(), "Volume must be non-negative"
        assert (df["spread"] > 0).all(), "Spread must be positive"
        assert df["timestamp"].is_monotonic_increasing, "Timestamps must be sorted"


def test_multi_asset_calendar_schedules(generator: SyntheticDataGenerator):
    """Verify Crypto trades 24/7 while Forex/Metals skip weekends."""
    # Weekend timestamp: Saturday 2023-01-07 12:00 UTC
    sat_dt = datetime(2023, 1, 7, 12, 0, tzinfo=timezone.utc)

    # 1. Crypto (BTC)
    df_btc = generator.generate_bars(
        symbol="BTCUSDT",
        timeframe="H1",
        start_date="2023-01-05",
        end_date="2023-01-10",
        seed=1,
    )
    sat_bars_btc = df_btc[df_btc["timestamp"].dt.weekday == 5]
    assert len(sat_bars_btc) == 24, "BTC must trade 24 hours on Saturday"

    # 2. Forex (EURUSD)
    df_eur = generator.generate_bars(
        symbol="EURUSD",
        timeframe="H1",
        start_date="2023-01-05",
        end_date="2023-01-10",
        seed=1,
    )
    sat_bars_eur = df_eur[df_eur["timestamp"].dt.weekday == 5]
    assert len(sat_bars_eur) == 0, "EURUSD must not trade on Saturday"


def test_tick_simulation(generator: SyntheticDataGenerator):
    """Verify realistic intra-bar bid/ask tick synthesis."""
    df_bars = generator.generate_bars(
        symbol="EURUSD",
        timeframe="M15",
        start_date="2023-01-02",
        end_date="2023-01-03",
        seed=42,
    ).head(10)

    ticks_per_bar = 4
    df_ticks = generator.generate_ticks(df_bars, ticks_per_bar=ticks_per_bar)

    assert len(df_ticks) == len(df_bars) * ticks_per_bar
    assert "bid" in df_ticks.columns
    assert "ask" in df_ticks.columns
    assert "spread" in df_ticks.columns
    assert (df_ticks["ask"] > df_ticks["bid"]).all(), "Ask must be greater than Bid"

    # Verify spread equality: ask - bid == spread (within rounding tolerance)
    diff = df_ticks["ask"] - df_ticks["bid"]
    np.testing.assert_allclose(diff, df_ticks["spread"], atol=1e-4)


def test_news_spread_multiplier_expansion(generator: SyntheticDataGenerator):
    """Verify that news events trigger >= 3.0x spread spikes."""
    # NFP release: 2023-01-06 13:30 UTC
    df = generator.generate_bars(
        symbol="EURUSD",
        timeframe="M15",
        start_date="2023-01-06",
        end_date="2023-01-07",
        seed=42,
    )

    # Find the bar containing 13:30
    news_bar = df[(df["timestamp"].dt.hour == 13) & (df["timestamp"].dt.minute == 30)]
    assert len(news_bar) > 0, "News bar must exist"

    baseline_spread = 0.00005
    actual_spread = float(news_bar.iloc[0]["spread"])
    spread_mult = actual_spread / baseline_spread

    assert spread_mult >= 3.0, f"News spread multiplier should be >= 3.0x, got {spread_mult:.2f}x"


def test_timeframe_resampling(generator: SyntheticDataGenerator):
    """Verify aggregation from M1 to M15 and H1."""
    df_m1 = generator.generate_bars(
        symbol="EURUSD",
        timeframe="M1",
        start_date="2023-01-02",
        end_date="2023-01-03",
        seed=42,
    )

    df_h1 = DataLoader.resample_bars(df_m1, target_timeframe="H1")
    assert len(df_h1) > 0
    assert len(df_h1) < len(df_m1)

    # Spot-check first full hour
    first_hour = df_m1[
        (df_m1["timestamp"] >= "2023-01-02 00:00:00")
        & (df_m1["timestamp"] < "2023-01-02 01:00:00")
    ]
    if len(first_hour) > 0:
        h1_match = df_h1[df_h1["timestamp"] == "2023-01-02 00:00:00"]
        if len(h1_match) > 0:
            assert h1_match.iloc[0]["open"] == first_hour.iloc[0]["open"]
            assert h1_match.iloc[0]["close"] == first_hour.iloc[-1]["close"]
            assert h1_match.iloc[0]["high"] == first_hour["high"].max()
            assert h1_match.iloc[0]["low"] == first_hour["low"].min()


def test_gap_detection(generator: SyntheticDataGenerator):
    """Verify anomalous data gap detector."""
    df = generator.generate_bars(
        symbol="EURUSD",
        timeframe="H1",
        start_date="2023-01-02",
        end_date="2023-01-05",  # Mon to Thu (no weekend)
        seed=42,
    )

    # Intentionally drop 6 consecutive bars on Tuesday
    corrupted_df = pd.concat([df.iloc[:20], df.iloc[26:]]).reset_index(drop=True)

    gaps = DataLoader.detect_gaps(corrupted_df, timeframe="H1", is_forex_or_metals=True)
    assert len(gaps) == 1
    assert gaps[0]["missing_bars_approx"] >= 5


def test_loader_caching_and_protocol(loader: DataLoader):
    """Verify DataLoader caching and compliance with IBarDataProvider protocol."""
    assert isinstance(loader, IBarDataProvider)

    start = datetime(2023, 1, 1, tzinfo=timezone.utc)
    end = datetime(2023, 2, 1, tzinfo=timezone.utc)

    # First fetch (synthesizes and caches)
    df1 = loader.get_bars("EURUSD", "H1", start=start, end=end)
    assert len(df1) > 0
    assert (loader._cache.get(("EURUSD", "H1")) is not None)

    # Second fetch (serves from cache)
    df2 = loader.get_bars("EURUSD", "H1", start=start, end=end)
    pd.testing.assert_frame_equal(df1, df2)
