"""Regime Shock Circuit Breaker and Anomaly Jump Detector."""

from dataclasses import dataclass
from typing import Optional, Tuple
import numpy as np
import pandas as pd

from quant_research.regime.vol_metrics import compute_atr, compute_normalized_atr_ratio


@dataclass(frozen=True)
class ShockDetectionResult:
    """Result of Shock Evaluation."""
    is_shock: bool
    reason: str
    bar_range_ratio: float
    spread_ratio: float
    return_zscore: float
    atr_norm: float


class ShockDetector:
    """
    Institutional Regime Shock Circuit Breaker Detector.
    Identifies liquidity void shocks, flash crashes, extreme spread spikes,
    and hyper-volatility danger zones.
    """

    def __init__(
        self,
        bar_range_threshold: float = 3.50,
        spread_spike_threshold: float = 3.00,
        jump_sigma_threshold: float = 4.00,
        hyper_vol_threshold: float = 2.50,
        atr_period: int = 14,
    ):
        self.bar_range_threshold = bar_range_threshold
        self.spread_spike_threshold = spread_spike_threshold
        self.jump_sigma_threshold = jump_sigma_threshold
        self.hyper_vol_threshold = hyper_vol_threshold
        self.atr_period = atr_period

    def evaluate_bar(
        self,
        open_p: float,
        high_p: float,
        low_p: float,
        close_p: float,
        prev_close_p: float,
        spread: float,
        baseline_spread: float,
        current_atr: float,
        return_std: float,
        atr_norm: float = 1.0,
    ) -> ShockDetectionResult:
        """
        Evaluate a single bar in real-time for immediate circuit breaker tripwire.
        """
        bar_range = high_p - low_p
        safe_atr = max(current_atr, 1e-8)
        bar_range_ratio = bar_range / safe_atr

        safe_baseline_spread = max(baseline_spread, 1e-8)
        spread_ratio = spread / safe_baseline_spread

        log_ret = abs(np.log(close_p / max(prev_close_p, 1e-8)))
        safe_std = max(return_std, 1e-8)
        return_zscore = log_ret / safe_std

        reasons = []

        # Condition 1: Bar Range Shock (High - Low >= 3.5x ATR)
        if bar_range_ratio >= self.bar_range_threshold:
            reasons.append(f"BAR_RANGE_SHOCK (range={bar_range_ratio:.2f}x ATR >= {self.bar_range_threshold}x)")

        # Condition 2: Spread Explosion (Spread >= 3.0x Baseline)
        if spread_ratio >= self.spread_spike_threshold:
            reasons.append(f"SPREAD_EXPLOSION (spread={spread_ratio:.2f}x baseline >= {self.spread_spike_threshold}x)")

        # Condition 3: Consecutive Jump Variance (|r| > 4.0 * sigma AND |r| >= 0.01)
        # Prevent false positives on tiny returns during zero-variance synthetic series
        min_shock_return = 0.01
        if return_zscore >= self.jump_sigma_threshold and log_ret >= min_shock_return:
            reasons.append(f"JUMP_VARIANCE (zscore={return_zscore:.2f} >= {self.jump_sigma_threshold})")

        # Condition 4: Hyper-Volatility Danger Zone (ATR_norm >= 2.50)
        if atr_norm >= self.hyper_vol_threshold:
            reasons.append(f"HYPER_VOLATILITY (ATR_norm={atr_norm:.2f} >= {self.hyper_vol_threshold})")

        is_shock = len(reasons) > 0
        reason_str = " | ".join(reasons) if is_shock else "NORMAL"

        return ShockDetectionResult(
            is_shock=is_shock,
            reason=reason_str,
            bar_range_ratio=float(bar_range_ratio),
            spread_ratio=float(spread_ratio),
            return_zscore=float(return_zscore),
            atr_norm=float(atr_norm),
        )

    def evaluate_dataframe(
        self,
        df: pd.DataFrame,
        baseline_spread: Optional[float] = None,
    ) -> pd.DataFrame:
        """
        Evaluate full historical DataFrame and return detailed shock analysis columns:
        - 'is_shock': bool
        - 'shock_reason': str
        - 'bar_range_ratio': float
        - 'spread_ratio': float
        """
        result = df.copy()
        atr = compute_atr(result, period=self.atr_period)
        atr_norm = compute_normalized_atr_ratio(result, atr_period=self.atr_period)

        bar_range = result["high"] - result["low"]
        bar_range_ratio = bar_range / atr.replace(0, 1e-8)

        # Baseline spread from data or default
        if "spread" in result.columns:
            if baseline_spread is None:
                # Rolling baseline spread
                rolling_baseline = result["spread"].rolling(window=100, min_periods=10).median().bfill()
            else:
                rolling_baseline = pd.Series(baseline_spread, index=result.index)
            spread_ratio = result["spread"] / rolling_baseline.replace(0, 1e-8)
        else:
            spread_ratio = pd.Series(1.0, index=result.index)

        # Log return jump z-score
        log_ret = np.log(result["close"] / result["close"].shift(1)).fillna(0.0).abs()
        rolling_std = log_ret.rolling(window=50, min_periods=10).std().bfill().replace(0, 1e-8)
        return_zscore = log_ret / rolling_std

        # Vectorized shock flags
        cond_bar_range = bar_range_ratio >= self.bar_range_threshold
        cond_spread = spread_ratio >= self.spread_spike_threshold
        cond_jump = return_zscore >= self.jump_sigma_threshold
        cond_hyper_vol = atr_norm >= self.hyper_vol_threshold

        is_shock = cond_bar_range | cond_spread | cond_jump | cond_hyper_vol

        # Construct reason column
        reasons = pd.Series("", index=result.index)
        reasons[cond_bar_range] += "BAR_RANGE_SHOCK; "
        reasons[cond_spread] += "SPREAD_EXPLOSION; "
        reasons[cond_jump] += "JUMP_VARIANCE; "
        reasons[cond_hyper_vol] += "HYPER_VOLATILITY; "
        reasons[~is_shock] = "NORMAL"

        result["is_shock"] = is_shock
        result["shock_reason"] = reasons.str.rstrip("; ")
        result["bar_range_ratio"] = bar_range_ratio
        result["spread_ratio"] = spread_ratio
        result["atr_norm"] = atr_norm

        return result
