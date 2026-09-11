"""Volatility Metrics, Normalized ATR Ratio, and Historical Volatility Rank."""

from typing import Dict, Tuple
import numpy as np
import pandas as pd


def compute_true_range(df: pd.DataFrame) -> pd.Series:
    """Compute True Range (TR) series from OHLC DataFrame."""
    high = df["high"]
    low = df["low"]
    prev_close = df["close"].shift(1).fillna(df["open"])

    tr1 = high - low
    tr2 = (high - prev_close).abs()
    tr3 = (low - prev_close).abs()

    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    return tr


def compute_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    """Compute Average True Range (ATR) using Wilder's Smoothing."""
    tr = compute_true_range(df)
    atr = tr.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()
    return atr.bfill()


def compute_normalized_atr_ratio(
    df: pd.DataFrame,
    atr_period: int = 14,
    sma_period: int = 50,
) -> pd.Series:
    """
    Compute Normalized ATR Ratio:
    ATR_norm = ATR_14 / SMA_50(ATR_14)

    Regimes:
    - ATR_norm < 0.75: Volatility Compression (Coiling / Squeeze)
    - 0.75 <= ATR_norm <= 1.80: Normal Volatility
    - 1.80 < ATR_norm <= 2.50: Volatility Expansion
    - ATR_norm > 2.50: Hyper-Volatility / Shock Zone
    """
    atr = compute_atr(df, period=atr_period)
    sma_atr = atr.rolling(window=sma_period, min_periods=max(5, sma_period // 2)).mean().bfill()

    # Prevent division by zero
    sma_atr = sma_atr.replace(0, 1e-8)
    atr_norm = atr / sma_atr
    return atr_norm.bfill()


def compute_historical_volatility(
    df: pd.DataFrame,
    window: int = 30,
    annualization_factor: float = np.sqrt(252 * 24),  # Default H1
) -> pd.Series:
    """Compute annualized rolling historical volatility from log returns."""
    log_returns = np.log(df["close"] / df["close"].shift(1)).fillna(0.0)
    rolling_std = log_returns.rolling(window=window, min_periods=max(5, window // 2)).std().bfill()
    hv = rolling_std * annualization_factor
    return hv.bfill()


def compute_hv_rank(
    df: pd.DataFrame,
    hv_window: int = 30,
    rank_lookback: int = 252,
) -> pd.Series:
    """
    Compute Rolling Historical Volatility Percentile Rank (0% to 100%).
    Measures current volatility relative to past 252 bars.
    """
    hv = compute_historical_volatility(df, window=hv_window)

    def percentile_rank(s: pd.Series) -> float:
        val = s.iloc[-1]
        count_below = (s.iloc[:-1] < val).sum()
        total = len(s) - 1
        return (count_below / max(1, total)) * 100.0

    hv_rank = hv.rolling(window=rank_lookback, min_periods=max(10, rank_lookback // 4)).apply(
        percentile_rank, raw=False
    ).bfill()

    return hv_rank.fillna(50.0)


def compute_adx_dmi(
    df: pd.DataFrame,
    period: int = 14,
) -> Tuple[pd.Series, pd.Series, pd.Series]:
    """
    Compute Directional Movement Index (+DI, -DI) and ADX.

    Returns:
        (adx, plus_di, minus_di)
    """
    high = df["high"]
    low = df["low"]

    up_move = high - high.shift(1)
    down_move = low.shift(1) - low

    plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0.0)
    minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0.0)

    tr = compute_true_range(df)
    atr = tr.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()

    plus_di = (
        100.0
        * pd.Series(plus_dm, index=df.index).ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()
        / atr.replace(0, 1e-8)
    )
    minus_di = (
        100.0
        * pd.Series(minus_dm, index=df.index).ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()
        / atr.replace(0, 1e-8)
    )

    di_sum = (plus_di + minus_di).replace(0, 1e-8)
    dx = 100.0 * (plus_di - minus_di).abs() / di_sum

    adx = dx.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()
    return adx.bfill(), plus_di.bfill(), minus_di.bfill()


def get_volatility_summary(df: pd.DataFrame) -> Dict[str, float]:
    """Calculate the latest volatility and trend metrics for a DataFrame."""
    atr_norm_s = compute_normalized_atr_ratio(df)
    hv_rank_s = compute_hv_rank(df)
    adx_s, p_di, m_di = compute_adx_dmi(df)

    latest_idx = df.index[-1]
    return {
        "atr_norm": float(atr_norm_s.loc[latest_idx]),
        "hv_rank": float(hv_rank_s.loc[latest_idx]),
        "adx": float(adx_s.loc[latest_idx]),
        "plus_di": float(p_di.loc[latest_idx]),
        "minus_di": float(m_di.loc[latest_idx]),
    }
