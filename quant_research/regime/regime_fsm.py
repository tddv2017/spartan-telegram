"""5-State Market Regime Detection Engine (MRDE) Finite State Machine."""

from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd

from quant_research.core.constants import RegimeState
from quant_research.core.logger import get_logger
from quant_research.core.types import IRegimeDetector, RegimeEvaluation
from quant_research.regime.hurst import compute_hurst_exponent
from quant_research.regime.shock_detector import ShockDetector
from quant_research.regime.vol_metrics import (
    compute_adx_dmi,
    compute_atr,
    compute_normalized_atr_ratio,
    compute_hv_rank,
)

logger = get_logger("spartan_regime_fsm")


class MarketRegimeFSM(IRegimeDetector):
    """
    Spartan Institutional 5-State Market Regime Finite State Machine.
    Evaluates:
    - Rescaled Range Hurst Exponent (H)
    - Normalized ATR Ratio (ATR_norm)
    - Historical Volatility Percentile Rank (HV_rank)
    - Directional Movement Index (ADX, +DI, -DI)
    - Macro Baseline Trend (EMA 200)
    - Circuit Breaker Shocks (Bar Range >= 3.5x ATR, Spread >= 3.0x Baseline)

    States:
    1. BULL_TREND
    2. BEAR_TREND
    3. RANGE_BOUND
    4. VOL_COMPRESSION
    5. CRISIS_SHOCK
    """

    def __init__(
        self,
        hurst_trend_threshold: float = 0.55,
        hurst_mean_rev_threshold: float = 0.45,
        adx_trend_threshold: float = 25.0,
        adx_range_threshold: float = 20.0,
        atr_norm_compression: float = 0.75,
        atr_norm_crisis: float = 2.50,
        ema_baseline_period: int = 200,
        shock_cooling_bars: int = 3,
        bb_period: int = 20,
        bb_std: float = 2.0,
        kc_period: int = 20,
        kc_atr_mult: float = 1.5,
    ):
        self.hurst_trend_threshold = hurst_trend_threshold
        self.hurst_mean_rev_threshold = hurst_mean_rev_threshold
        self.adx_trend_threshold = adx_trend_threshold
        self.adx_range_threshold = adx_range_threshold
        self.atr_norm_compression = atr_norm_compression
        self.atr_norm_crisis = atr_norm_crisis
        self.ema_baseline_period = ema_baseline_period
        self.shock_cooling_bars = shock_cooling_bars

        self.bb_period = bb_period
        self.bb_std = bb_std
        self.kc_period = kc_period
        self.kc_atr_mult = kc_atr_mult

        self.shock_detector = ShockDetector(
            bar_range_threshold=3.50,
            spread_spike_threshold=3.00,
            hyper_vol_threshold=atr_norm_crisis,
        )

        self._current_state: RegimeState = RegimeState.RANGE_BOUND
        self._bars_since_shock: int = 999

    @property
    def current_state(self) -> RegimeState:
        return self._current_state

    def reset(self) -> None:
        """Reset state machine to initial default state."""
        self._current_state = RegimeState.RANGE_BOUND
        self._bars_since_shock = 999

    def _check_squeeze_on(self, df: pd.DataFrame) -> bool:
        """Check if Bollinger Bands are compressed inside Keltner Channels."""
        if len(df) < max(self.bb_period, self.kc_period):
            return False

        close = df["close"]
        bb_mid = close.rolling(self.bb_period).mean()
        bb_std_val = close.rolling(self.bb_period).std()
        bb_upper = bb_mid + self.bb_std * bb_std_val
        bb_lower = bb_mid - self.bb_std * bb_std_val

        kc_mid = close.ewm(span=self.kc_period, adjust=False).mean()
        atr = compute_atr(df, period=self.kc_period)
        kc_upper = kc_mid + self.kc_atr_mult * atr
        kc_lower = kc_mid - self.kc_atr_mult * atr

        latest = df.index[-1]
        squeeze = (bb_upper.loc[latest] < kc_upper.loc[latest]) and (bb_lower.loc[latest] > kc_lower.loc[latest])
        return bool(squeeze)

    def evaluate_detailed(self, df: pd.DataFrame) -> RegimeEvaluation:
        """
        Evaluate market regime with full quantitative diagnostic breakdown.
        """
        if len(df) < 30:
            return RegimeEvaluation(
                state=RegimeState.RANGE_BOUND,
                hurst=0.50,
                atr_norm=1.0,
                hv_rank=50.0,
                is_shock=False,
                details={"reason": "Insufficient bars (< 30)"},
            )

        # 1. Compute Indicators
        close = df["close"]
        hurst_val = compute_hurst_exponent(close.tail(100))
        atr_norm_series = compute_normalized_atr_ratio(df)
        atr_norm = float(atr_norm_series.iloc[-1])
        hv_rank_series = compute_hv_rank(df)
        hv_rank = float(hv_rank_series.iloc[-1])

        adx_series, plus_di_series, minus_di_series = compute_adx_dmi(df)
        adx_val = float(adx_series.iloc[-1])
        plus_di = float(plus_di_series.iloc[-1])
        minus_di = float(minus_di_series.iloc[-1])

        # Baseline EMA 200
        min_ema_p = min(len(df), self.ema_baseline_period)
        ema_200 = float(close.ewm(span=min_ema_p, adjust=False).mean().iloc[-1])
        latest_close = float(close.iloc[-1])

        # Squeeze indicator
        squeeze_on = self._check_squeeze_on(df)

        # Shock evaluation on latest bar
        latest_idx = df.index[-1]
        latest_row = df.loc[latest_idx]
        prev_close = float(df["close"].iloc[-2]) if len(df) >= 2 else latest_close
        current_atr = float(compute_atr(df).iloc[-1])
        spread = float(latest_row.get("spread", 0.0))
        baseline_spread = float(df["spread"].tail(100).median()) if "spread" in df.columns else 1.0

        # Return standard deviation for jump shock
        raw_std = float(
            np.log(df["close"] / df["close"].shift(1)).tail(50).std()
        ) if len(df) >= 10 else 0.01
        ret_std = max(0.002, 0.01 if np.isnan(raw_std) else raw_std)

        shock_res = self.shock_detector.evaluate_bar(
            open_p=float(latest_row["open"]),
            high_p=float(latest_row["high"]),
            low_p=float(latest_row["low"]),
            close_p=latest_close,
            prev_close_p=prev_close,
            spread=spread,
            baseline_spread=baseline_spread,
            current_atr=current_atr,
            return_std=ret_std,
            atr_norm=atr_norm,
        )

        # Update shock counter
        if shock_res.is_shock:
            self._bars_since_shock = 0
        else:
            self._bars_since_shock += 1

        # ---------------------------------------------------------------------
        # 2. State Machine Transitions (Exact Matrix & Priority Order)
        # ---------------------------------------------------------------------
        new_state: RegimeState
        shock_reason = shock_res.reason

        # PRIORITY 1: CRISIS_SHOCK (Circuit Breaker)
        if shock_res.is_shock or self._bars_since_shock < self.shock_cooling_bars:
            new_state = RegimeState.CRISIS_SHOCK

        # PRIORITY 2: VOL_COMPRESSION (Coiling / Squeeze)
        elif atr_norm < self.atr_norm_compression:
            new_state = RegimeState.VOL_COMPRESSION

        # PRIORITY 3: BULL_TREND
        # H > 0.55, ADX >= 25, Price > EMA200, +DI > -DI, ATR_norm in [0.75, 1.80]
        elif (
            hurst_val >= self.hurst_trend_threshold
            and adx_val >= self.adx_trend_threshold
            and latest_close > ema_200
            and plus_di > minus_di
            and 0.70 <= atr_norm <= 1.85
        ):
            new_state = RegimeState.BULL_TREND

        # PRIORITY 4: BEAR_TREND
        # H > 0.55, ADX >= 25, Price < EMA200, -DI > +DI, ATR_norm in [0.75, 1.80]
        elif (
            hurst_val >= self.hurst_trend_threshold
            and adx_val >= self.adx_trend_threshold
            and latest_close < ema_200
            and minus_di > plus_di
            and 0.70 <= atr_norm <= 1.85
        ):
            new_state = RegimeState.BEAR_TREND

        # PRIORITY 5: RANGE_BOUND
        # H < 0.45 or ADX < 20, ATR_norm in [0.60, 1.30]
        elif hurst_val <= self.hurst_mean_rev_threshold or adx_val <= self.adx_range_threshold:
            new_state = RegimeState.RANGE_BOUND

        # Hysteresis / Stability Retention
        else:
            # If in trend and direction maintained with moderate strength, preserve state
            if self._current_state == RegimeState.BULL_TREND and latest_close > ema_200 and adx_val >= 20.0:
                new_state = RegimeState.BULL_TREND
            elif self._current_state == RegimeState.BEAR_TREND and latest_close < ema_200 and adx_val >= 20.0:
                new_state = RegimeState.BEAR_TREND
            else:
                new_state = RegimeState.RANGE_BOUND

        self._current_state = new_state

        details: Dict[str, float] = {
            "close": latest_close,
            "ema_200": ema_200,
            "plus_di": plus_di,
            "minus_di": minus_di,
            "squeeze_on": 1.0 if squeeze_on else 0.0,
            "bars_since_shock": float(self._bars_since_shock),
        }

        return RegimeEvaluation(
            state=new_state,
            hurst=float(hurst_val),
            atr_norm=atr_norm,
            hv_rank=hv_rank,
            adx=adx_val,
            is_shock=shock_res.is_shock,
            shock_reason=shock_reason,
            details=details,
        )

    def evaluate(self, df: pd.DataFrame) -> RegimeState:
        """Standard interface contract implementation for IRegimeDetector."""
        eval_res = self.evaluate_detailed(df)
        return eval_res.state

    def classify_series(self, df: pd.DataFrame) -> pd.Series:
        """
        Classify an entire historical dataframe bar-by-bar into regime states.
        Returns a pd.Series of RegimeState values matching df.index.
        """
        self.reset()
        results: List[RegimeState] = []

        # Warm up window
        warmup = max(30, self.bb_period)
        for i in range(len(df)):
            if i < warmup:
                results.append(RegimeState.RANGE_BOUND)
            else:
                sub_df = df.iloc[: i + 1]
                state = self.evaluate(sub_df)
                results.append(state)

        return pd.Series(results, index=df.index, name="regime")
