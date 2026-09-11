"""Rescaled Range (R/S) and Generalized Hurst Exponent Calculation."""

from typing import List, Optional, Union
import numpy as np
import pandas as pd


def compute_hurst_exponent(
    series: Union[pd.Series, np.ndarray, List[float]],
    min_chunk: int = 5,
    max_chunk: Optional[int] = None,
) -> float:
    """
    Compute the Hurst Exponent (H) for a time series.

    Theoretical interpretation:
    - H < 0.45: Mean-Reverting (anti-persistent) series
    - 0.45 <= H <= 0.55: Geometric Brownian Motion / Random Walk (H ~ 0.50)
    - H > 0.55: Persistent / Trending series with long-memory effects

    Uses the Generalized Hurst Exponent (structure function / scaling of increments)
    over multiple lag horizons:
        <|X(t + tau) - X(t)|^2> ~ tau^(2H)
        ln(Var(tau)) = 2H * ln(tau) + C
    This is mathematically robust on both raw price levels and stationary processes.
    """
    if isinstance(series, pd.Series):
        arr = series.dropna().to_numpy(dtype=float)
    else:
        arr = np.asarray(series, dtype=float)

    n_total = len(arr)
    if n_total < 25:
        return 0.50

    if max_chunk is None:
        max_chunk = min(60, n_total // 4)

    min_tau = max(2, min_chunk)
    max_tau = max(min_tau + 4, max_chunk)

    # Generate log-spaced lag horizons
    taus = np.unique(
        np.logspace(
            np.log10(min_tau),
            np.log10(max_tau),
            num=min(16, max_tau - min_tau + 1),
            dtype=int,
        )
    )

    variances: List[float] = []
    valid_taus: List[int] = []

    for tau in taus:
        if tau >= n_total:
            continue
        diffs = arr[tau:] - arr[:-tau]
        if len(diffs) < 5:
            continue

        var_tau = float(np.mean(diffs**2))
        if var_tau > 1e-12:
            variances.append(var_tau)
            valid_taus.append(int(tau))

    if len(valid_taus) < 3:
        return 0.50

    # Linear regression in log-log space: ln(Var) = 2H * ln(tau) + C
    log_tau = np.log(valid_taus)
    log_var = np.log(variances)

    poly = np.polyfit(log_tau, log_var, deg=1)
    hurst = float(poly[0] / 2.0)

    # Bound Hurst exponent strictly between 0.0 and 1.0
    return float(np.clip(hurst, 0.0, 1.0))


def classify_hurst(hurst: float) -> str:
    """Classify Hurst exponent into persistent, random walk, or mean-reverting."""
    if hurst < 0.45:
        return "MEAN_REVERTING"
    elif hurst <= 0.55:
        return "RANDOM_WALK"
    else:
        return "TRENDING"


def rolling_hurst(
    series: pd.Series,
    window: int = 100,
    min_chunk: int = 5,
) -> pd.Series:
    """Calculate rolling Hurst exponent across a moving window."""
    result = pd.Series(index=series.index, dtype=float)
    arr = series.to_numpy(dtype=float)

    for i in range(window, len(arr) + 1):
        chunk = arr[i - window : i]
        h = compute_hurst_exponent(chunk, min_chunk=min_chunk)
        result.iloc[i - 1] = h

    # Fill leading NaNs with 0.50
    result = result.bfill().fillna(0.50)
    return result
