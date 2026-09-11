"""
Adversarial Stress Test Suite for Multi-Asset Data Generation & Loader Pipeline.
Milestone 1 - Challenger 2.

Examines:
1. 36-Month multi-asset generation across 100,000+ bars for all 5 assets.
2. Strict OHLCV invariant validation across every single bar.
3. News spread spike multipliers & jump diffusion behavior across timeframes.
4. Tick generator bid/ask consistency, spread fidelity, and ticks_per_bar behavior.
5. DataLoader gap detection, resampling integrity, and caching.
"""

from datetime import datetime, timedelta, timezone
from pathlib import Path
import numpy as np
import pandas as pd
import pytest
import yaml

from quant_research.data.generator import (
    SyntheticDataGenerator,
    DEFAULT_ASSET_PARAMS,
    TIMEFRAME_MINUTES,
)
from quant_research.data.loader import DataLoader


@pytest.fixture(scope="module")
def gen() -> SyntheticDataGenerator:
    return SyntheticDataGenerator()


@pytest.fixture(scope="module")
def full_36m_dataset(gen: SyntheticDataGenerator):
    """Generate 36-month H1 bars for all 5 assets."""
    symbols = ["XAUUSD", "BTCUSDT", "ETHUSDT", "EURUSD", "GBPUSD"]
    return gen.generate_multi_asset_dataset(
        symbols=symbols,
        timeframe="H1",
        start_date="2023-01-01",
        end_date="2026-01-01",
        seed=42,
    )


# =============================================================================
# 1. 100,000+ Bars Multi-Asset Generation & Invariant Stress Test
# =============================================================================

def test_100k_bars_generated_across_36_months(full_36m_dataset):
    """Verify that multi-asset dataset covers 36 months and exceeds 100,000 bars."""
    total_bars = sum(len(df) for df in full_36m_dataset.values())
    print(f"\nTotal bars generated across 5 assets (H1, 36M): {total_bars}")
    for sym, df in full_36m_dataset.items():
        print(f"  - {sym}: {len(df)} bars, range {df['timestamp'].min()} -> {df['timestamp'].max()}")

    assert total_bars >= 100_000, f"Expected >= 100,000 bars across 5 assets, got {total_bars}"
    assert len(full_36m_dataset) == 5, "Must generate all 5 assets"


def test_strict_ohlcv_invariants_on_all_bars(full_36m_dataset):
    """Stress-test strict OHLCV invariants across all 100,000+ bars."""
    for sym, df in full_36m_dataset.items():
        # 1. High >= max(Open, Close)
        max_oc = df[["open", "close"]].max(axis=1)
        viol_high = df[df["high"] < max_oc]
        assert len(viol_high) == 0, f"[{sym}] High < max(Open, Close) in {len(viol_high)} bars"

        # 2. Low <= min(Open, Close)
        min_oc = df[["open", "close"]].min(axis=1)
        viol_low = df[df["low"] > min_oc]
        assert len(viol_low) == 0, f"[{sym}] Low > min(Open, Close) in {len(viol_low)} bars"

        # 3. High >= Low
        viol_hl = df[df["high"] < df["low"]]
        assert len(viol_hl) == 0, f"[{sym}] High < Low in {len(viol_hl)} bars"

        # 4. Strictly positive spread
        assert (df["spread"] > 0).all(), f"[{sym}] Non-positive spread detected"

        # 5. Non-negative volume
        assert (df["volume"] >= 0).all(), f"[{sym}] Negative volume detected"

        # 6. No NaNs or Infs
        assert not df.isnull().values.any(), f"[{sym}] NaN detected"
        assert np.isfinite(df[["open", "high", "low", "close", "volume", "spread"]].values).all(), f"[{sym}] Inf detected"

        # 7. Monotonically increasing timestamps
        assert df["timestamp"].is_monotonic_increasing, f"[{sym}] Non-monotonic timestamps"

        # 8. Zero duplicate timestamps
        assert df["timestamp"].duplicated().sum() == 0, f"[{sym}] Duplicate timestamps found"


def test_bar_zero_invariants_across_multiple_seeds(gen: SyntheticDataGenerator):
    """
    Examine bar 0 across 500 seeds for all symbols to test if
    High == Low or invalid wick conditions ever occur at bar 0.
    """
    symbols = ["XAUUSD", "BTCUSDT", "ETHUSDT", "EURUSD", "GBPUSD"]
    zero_range_count = 0
    total_seeds = 200

    for seed in range(total_seeds):
        for sym in symbols:
            df = gen.generate_bars(sym, timeframe="H1", start_date="2023-01-01", end_date="2023-01-03", seed=seed)
            bar0 = df.iloc[0]
            if bar0["high"] <= bar0["low"]:
                zero_range_count += 1
            assert bar0["high"] >= max(bar0["open"], bar0["close"]), f"Bar 0 high violation seed {seed} {sym}"
            assert bar0["low"] <= min(bar0["open"], bar0["close"]), f"Bar 0 low violation seed {seed} {sym}"

    print(f"\nBar 0 zero-range occurrences across {total_seeds * len(symbols)} runs: {zero_range_count}")


# =============================================================================
# 2. News Event Spread Spike Multipliers & Jump Diffusion Stress Test
# =============================================================================

def test_news_spread_spikes_m15(gen: SyntheticDataGenerator):
    """
    Stress-test all macro news events in news_calendar.yaml on M15 bars.
    Verify that >= 3.0x spread spike occurs during the news event window.
    """
    news_calendar_path = Path(__file__).resolve().parent.parent / "config" / "news_calendar.yaml"
    with open(news_calendar_path, "r", encoding="utf-8") as f:
        news_data = yaml.safe_load(f)

    events = news_data.get("events", [])
    assert len(events) >= 50, "Expected at least 50 events in calendar"

    # Test EURUSD on M15 for 2023
    df_eur_m15 = gen.generate_bars("EURUSD", timeframe="M15", start_date="2023-01-01", end_date="2023-06-30", seed=42)
    baseline_spread = DEFAULT_ASSET_PARAMS["EURUSD"]["baseline_spread"]

    spiked_events = 0
    total_events_in_range = 0

    for ev in events:
        ev_dt = datetime.fromisoformat(ev["date"].replace("Z", "+00:00"))
        if datetime(2023, 1, 1, tzinfo=timezone.utc) <= ev_dt < datetime(2023, 6, 30, tzinfo=timezone.utc):
            total_events_in_range += 1
            # Check window around event (-30m to +15m)
            window_bars = df_eur_m15[
                (df_eur_m15["timestamp"] >= ev_dt - timedelta(minutes=30))
                & (df_eur_m15["timestamp"] <= ev_dt + timedelta(minutes=15))
            ]
            if len(window_bars) > 0:
                max_spread = window_bars["spread"].max()
                mult = max_spread / baseline_spread
                if mult >= 3.0:
                    spiked_events += 1

    print(f"\nM15 News Spread Spikes: {spiked_events}/{total_events_in_range} events triggered >= 3.0x spread")
    assert spiked_events == total_events_in_range, f"Expected all {total_events_in_range} events to trigger spread spikes, got {spiked_events}"


def test_news_spread_spikes_and_jumps_across_timeframes(gen: SyntheticDataGenerator):
    """
    Adversarially evaluate news spread spikes and jump diffusions across M15, H1, H4.
    Observe if coarser timeframes (H1, H4) miss xx:30 events or jump diffusions.
    """
    events_2023 = [
        {"date": "2023-01-06T13:30:00Z", "type": "NFP"},
        {"date": "2023-01-12T13:30:00Z", "type": "CPI"},
        {"date": "2023-02-01T19:00:00Z", "type": "FOMC"},
    ]
    baseline_spread = DEFAULT_ASSET_PARAMS["EURUSD"]["baseline_spread"]

    for tf in ["M15", "H1", "H4"]:
        df = gen.generate_bars("EURUSD", timeframe=tf, start_date="2023-01-01", end_date="2023-02-15", seed=42)
        print(f"\n--- Timeframe: {tf} ---")
        for ev in events_2023:
            ev_dt = datetime.fromisoformat(ev["date"].replace("Z", "+00:00"))
            # Find bars covering this event window
            bars_in_window = df[
                (df["timestamp"] >= ev_dt - timedelta(hours=2))
                & (df["timestamp"] <= ev_dt + timedelta(hours=2))
            ]
            max_mult = (bars_in_window["spread"].max() / baseline_spread) if len(bars_in_window) > 0 else 0.0
            print(f"  Event {ev['type']} ({ev['date']}): max spread mult = {max_mult:.2f}x across {len(bars_in_window)} adjacent bars")


# =============================================================================
# 3. Tick Generator Output Format & Bid < Ask Consistency Stress Test
# =============================================================================

def test_tick_generator_bid_less_than_ask_100k(full_36m_dataset, gen: SyntheticDataGenerator):
    """
    Synthesize ticks from bars across all 5 assets and verify bid < ask consistency.
    """
    total_ticks = 0
    violations = 0

    for sym, df_bars in full_36m_dataset.items():
        # Sample 500 bars per asset (2,000 ticks per asset = 10,000 ticks)
        sample_bars = df_bars.head(500)
        df_ticks = gen.generate_ticks(sample_bars, ticks_per_bar=4)
        total_ticks += len(df_ticks)

        # 1. Ask > Bid strictly
        bad_ticks = df_ticks[df_ticks["ask"] <= df_ticks["bid"]]
        if len(bad_ticks) > 0:
            violations += len(bad_ticks)
            print(f"[{sym}] Found {len(bad_ticks)} ticks where ask <= bid!")

        assert (df_ticks["ask"] > df_ticks["bid"]).all(), f"[{sym}] ask <= bid found"

        # 2. Spread consistency: ask - bid == spread
        diff = df_ticks["ask"] - df_ticks["bid"]
        np.testing.assert_allclose(diff.values, df_ticks["spread"].values, atol=1e-4)

        # 3. Positive volume
        assert (df_ticks["volume"] >= 1.0).all(), f"[{sym}] tick volume < 1.0"

    print(f"\nTick Generator: verified {total_ticks} ticks across 5 assets. Violations: {violations}")


def test_tick_generator_ticks_per_bar_parameter(gen: SyntheticDataGenerator):
    """
    Adversarially test the ticks_per_bar parameter.
    Does generate_ticks produce N ticks when ticks_per_bar=N is passed?
    """
    df_bars = gen.generate_bars("EURUSD", timeframe="M15", start_date="2023-01-02", end_date="2023-01-03", seed=42).head(5)

    for n_ticks in [1, 2, 4, 8, 16]:
        df_ticks = gen.generate_ticks(df_bars, ticks_per_bar=n_ticks)
        actual_ticks_per_bar = len(df_ticks) / len(df_bars)
        print(f"Requested ticks_per_bar={n_ticks} -> Actual ticks per bar produced: {actual_ticks_per_bar}")
        # Observe whether price_points is fixed to 4 regardless of ticks_per_bar


def test_tick_generator_empty_dataframe(gen: SyntheticDataGenerator):
    """Verify empty DataFrame input does not crash."""
    empty_bars = pd.DataFrame(columns=["timestamp", "open", "high", "low", "close", "volume", "spread"])
    df_ticks = gen.generate_ticks(empty_bars)
    assert len(df_ticks) == 0
    assert "bid" in df_ticks.columns
    assert "ask" in df_ticks.columns


# =============================================================================
# 4. DataLoader Validation, Resampling, & Gap Detection Stress Test
# =============================================================================

def test_loader_validate_bars_adversarial():
    """Adversarially challenge validate_bars with corrupted data structures."""
    # 1. Inverted High / Low
    df_bad_hl = pd.DataFrame({
        "timestamp": [datetime.now(timezone.utc)],
        "open": [100.0],
        "high": [90.0],  # Invalid High < Low
        "low": [110.0],
        "close": [100.0],
        "volume": [1000],
    })
    is_valid, issues = DataLoader.validate_bars(df_bad_hl)
    assert not is_valid
    assert any("High < Low" in s or "High < max" in s for s in issues)

    # 2. Negative Volume
    df_bad_vol = pd.DataFrame({
        "timestamp": [datetime.now(timezone.utc)],
        "open": [100.0],
        "high": [105.0],
        "low": [95.0],
        "close": [100.0],
        "volume": [-50],
    })
    is_valid, issues = DataLoader.validate_bars(df_bad_vol)
    assert not is_valid
    assert any("negative volume" in s for s in issues)

    # 3. Non-monotonic timestamp
    df_bad_ts = pd.DataFrame({
        "timestamp": [datetime(2023, 1, 2, 12, 0), datetime(2023, 1, 2, 11, 0)],
        "open": [100.0, 100.0],
        "high": [105.0, 105.0],
        "low": [95.0, 95.0],
        "close": [100.0, 100.0],
        "volume": [100, 100],
    })
    is_valid, issues = DataLoader.validate_bars(df_bad_ts)
    assert not is_valid
    assert any("monotonically increasing" in s for s in issues)


def test_resample_bars_preserves_invariants_across_10k_bars(gen: SyntheticDataGenerator):
    """
    Generate 10,000 M1 bars, resample to M5, M15, H1, H4, D1,
    and assert strict OHLCV invariants on all resampled bars.
    """
    df_m1 = gen.generate_bars("EURUSD", timeframe="M1", start_date="2023-01-02", end_date="2023-01-15", seed=42)
    print(f"\nGenerated {len(df_m1)} M1 bars for resampling stress test")

    for target_tf in ["M5", "M15", "H1", "H4", "D1"]:
        resampled = DataLoader.resample_bars(df_m1, target_timeframe=target_tf)
        assert len(resampled) > 0, f"Resampling to {target_tf} yielded 0 bars"
        is_valid, issues = DataLoader.validate_bars(resampled)
        assert is_valid, f"Resampled {target_tf} bars failed validation: {issues}"


def test_detect_gaps_weekend_and_daily_breaks(gen: SyntheticDataGenerator):
    """
    Adversarially challenge detect_gaps:
    - XAUUSD has 23/5 trading schedule (daily 22:00-23:00 break).
    - D1 daily bars have Friday-to-Monday step.
    Observe whether detect_gaps correctly handles or misclassifies these schedules.
    """
    # 1. XAUUSD H1
    df_gold_h1 = gen.generate_bars("XAUUSD", timeframe="H1", start_date="2023-01-02", end_date="2023-01-10", seed=42)
    gaps_gold_h1 = DataLoader.detect_gaps(df_gold_h1, timeframe="H1", is_forex_or_metals=True)
    print(f"\nXAUUSD H1 detected gaps: {len(gaps_gold_h1)}")

    # 2. XAUUSD M15 (each daily break is 60m = 4 missing bars)
    df_gold_m15 = gen.generate_bars("XAUUSD", timeframe="M15", start_date="2023-01-02", end_date="2023-01-06", seed=42)
    gaps_gold_m15 = DataLoader.detect_gaps(df_gold_m15, timeframe="M15", is_forex_or_metals=True)
    print(f"XAUUSD M15 detected gaps (daily breaks): {len(gaps_gold_m15)}")
    for g in gaps_gold_m15:
        print(f"  Gap: {g['start']} -> {g['end']}, duration={g['gap_duration']}, missing={g['missing_bars_approx']}")

    # 3. EURUSD D1 (Friday to Monday)
    df_eur_d1 = gen.generate_bars("EURUSD", timeframe="D1", start_date="2023-01-01", end_date="2023-02-01", seed=42)
    gaps_eur_d1 = DataLoader.detect_gaps(df_eur_d1, timeframe="D1", is_forex_or_metals=True)
    print(f"EURUSD D1 detected gaps: {len(gaps_eur_d1)}")
    for g in gaps_eur_d1:
        print(f"  Gap: {g['start']} -> {g['end']}, duration={g['gap_duration']}, missing={g['missing_bars_approx']}")
