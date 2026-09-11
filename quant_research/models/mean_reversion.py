"""Regime-Filtered Mean-Reversion Alpha Model (Feature 9, Magic 888804)."""

from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd

from quant_research.core.constants import MAGIC_MEAN_REVERSION, OrderAction, RegimeState
from quant_research.core.logger import get_logger
from quant_research.core.types import SignalDict
from quant_research.models.base_model import BaseQuantModel
from quant_research.regime.hurst import compute_hurst_exponent

logger = get_logger("spartan_mean_reversion")


class MeanReversionModel(BaseQuantModel):
    """
    Model 4: Regime-Filtered Mean-Reversion.
    
    Features:
    - Strict Regime Gating (ADX < 20.0 and Hurst Exponent H < 0.45)
    - Dynamic RSI Rolling Quantiles (10th percentile for oversold, 90th for overbought)
    - Bollinger Band outer envelope bounce rejection pin bar (wick ratio >= 0.60)
    - Macro knife-catching defense (falling/rising D1 EMA200 slope invalidation)
    - 16-bar Time-Stop liquidation mechanism
    - Multi-stage Take Profit (TP1 at BB Mid, TP2 at opposite BB outer band)
    - Regime gating: Strictly RANGE_BOUND
    """

    def __init__(
        self,
        name: str = "Regime-Filtered Mean-Reversion",
        magic_number: int = MAGIC_MEAN_REVERSION,
        strategy_code: int = 4,
        permitted_regimes: Optional[List[Union[RegimeState, str]]] = None,
        rsi_period: int = 14,
        rsi_quantile_lookback: int = 100,
        bb_period: int = 20,
        bb_std: float = 2.0,
        min_wick_ratio: float = 0.60,
        max_bars_in_trade: int = 16,
        adx_max: float = 20.0,
        hurst_max: float = 0.45,
        macro_ema_period: int = 200,
        **kwargs: Any,
    ) -> None:
        if permitted_regimes is None:
            permitted_regimes = [RegimeState.RANGE_BOUND]

        super().__init__(
            name=name,
            magic_number=magic_number,
            strategy_code=strategy_code,
            permitted_regimes=permitted_regimes,
            **kwargs,
        )
        self.rsi_period = rsi_period
        self.rsi_quantile_lookback = rsi_quantile_lookback
        self.bb_period = bb_period
        self.bb_std = float(bb_std)
        self.min_wick_ratio = float(min_wick_ratio)
        self.max_bars_in_trade = max_bars_in_trade
        self.adx_max = float(adx_max)
        self.hurst_max = float(hurst_max)
        self.macro_ema_period = macro_ema_period

    @staticmethod
    def compute_rsi(close: pd.Series, period: int = 14) -> pd.Series:
        """Relative Strength Index via Wilder Exponential Moving Average."""
        delta = close.diff()
        gain = delta.where(delta > 0, 0.0)
        loss = (-delta).where(delta < 0, 0.0)

        avg_gain = gain.ewm(alpha=1.0 / period, adjust=False).mean()
        avg_loss = loss.ewm(alpha=1.0 / period, adjust=False).mean()

        rs = avg_gain / (avg_loss + 1e-9)
        rsi = 100.0 - (100.0 / (1.0 + rs))
        return rsi

    @staticmethod
    def compute_dynamic_rsi_quantiles(
        rsi_series: pd.Series,
        lookback: int = 100,
    ) -> Tuple[float, float]:
        """
        Calculate dynamic oversold (10th percentile clamped to [20, 35])
        and overbought (90th percentile clamped to [65, 80]) thresholds.
        """
        tail = rsi_series.dropna().tail(lookback)
        if len(tail) < 10:
            return 30.0, 70.0

        q10 = float(np.percentile(tail, 10))
        q90 = float(np.percentile(tail, 90))

        oversold = max(20.0, min(35.0, q10))
        overbought = max(65.0, min(80.0, q90))
        return oversold, overbought

    @staticmethod
    def compute_bollinger_bands(
        close: pd.Series,
        period: int = 20,
        num_std: float = 2.0,
    ) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """Bollinger Bands: Middle, Upper, Lower."""
        mid = close.rolling(period).mean()
        std = close.rolling(period).std(ddof=0)
        upper = mid + (num_std * std)
        lower = mid - (num_std * std)
        return mid, upper, lower

    @staticmethod
    def compute_pin_bar_wick_ratio(
        open_p: float,
        high_p: float,
        low_p: float,
        close_p: float,
    ) -> Tuple[float, float]:
        """
        Calculate lower and upper wick ratios of a candlestick.
        Returns:
        --------
        Tuple[float, float]
            (lower_wick_ratio, upper_wick_ratio)
        """
        total_range = high_p - low_p
        if total_range <= 1e-9:
            return 0.0, 0.0

        body_low = min(open_p, close_p)
        body_high = max(open_p, close_p)

        lower_wick = body_low - low_p
        upper_wick = high_p - body_high

        lower_wick_ratio = lower_wick / total_range
        upper_wick_ratio = upper_wick / total_range
        return float(lower_wick_ratio), float(upper_wick_ratio)

    @staticmethod
    def compute_adx(df: pd.DataFrame, period: int = 14) -> float:
        """Compute latest ADX value."""
        high = df["high"]
        low = df["low"]
        close = df["close"]
        prev_close = close.shift(1)

        tr = pd.concat([
            high - low,
            (high - prev_close).abs(),
            (low - prev_close).abs(),
        ], axis=1).max(axis=1)
        atr = tr.ewm(alpha=1.0 / period, adjust=False).mean()

        up_move = high - high.shift(1)
        down_move = low.shift(1) - low

        plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0.0)
        minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0.0)

        plus_di = 100.0 * pd.Series(plus_dm, index=df.index).ewm(alpha=1.0 / period, adjust=False).mean() / (atr + 1e-9)
        minus_di = 100.0 * pd.Series(minus_dm, index=df.index).ewm(alpha=1.0 / period, adjust=False).mean() / (atr + 1e-9)

        dx = 100.0 * (plus_di - minus_di).abs() / (plus_di + minus_di + 1e-9)
        adx = dx.ewm(alpha=1.0 / period, adjust=False).mean()
        return float(adx.iloc[-1])

    def generate_signal(
        self,
        data: pd.DataFrame,
        current_regime: Union[RegimeState, str],
        **kwargs: Any,
    ) -> Optional[SignalDict]:
        """
        Generate Mean-Reversion signal under strict regime and macro gating.
        """
        # 1. Base Regime Filter (RANGE_BOUND only)
        if not self.is_regime_permitted(current_regime):
            logger.debug(f"MeanReversion suppressed: regime {current_regime} not permitted.")
            return None

        if not self.validate_data(data, min_bars=max(self.bb_period + 10, self.rsi_quantile_lookback)):
            return None

        # 2. Strict Quantitative Regime Gating: ADX < 20.0 and Hurst < 0.45
        adx_val = kwargs.get("adx")
        if adx_val is None:
            adx_val = self.compute_adx(data)
        else:
            adx_val = float(adx_val)

        hurst_val = kwargs.get("hurst")
        if hurst_val is None:
            hurst_val = compute_hurst_exponent(data["close"].tail(100))
        else:
            hurst_val = float(hurst_val)

        # Boundary checks: must strictly be < 20.0 and < 0.45
        if adx_val >= self.adx_max or hurst_val >= self.hurst_max:
            logger.debug(f"MeanReversion gated: ADX={adx_val:.2f}>={self.adx_max} or H={hurst_val:.3f}>={self.hurst_max}")
            return None

        close = data["close"]
        latest_idx = data.index[-1]
        latest_bar = data.loc[latest_idx]
        latest_close = float(latest_bar["close"])
        latest_open = float(latest_bar["open"])
        latest_high = float(latest_bar["high"])
        latest_low = float(latest_bar["low"])
        symbol = kwargs.get("symbol", "EURUSD")

        # 3. Dynamic RSI Quantiles
        rsi_series = self.compute_rsi(close, self.rsi_period)
        latest_rsi = float(rsi_series.iloc[-1])
        oversold_thresh, overbought_thresh = self.compute_dynamic_rsi_quantiles(
            rsi_series, self.rsi_quantile_lookback
        )

        # 4. Bollinger Bands & Rejection Wick
        bb_mid, bb_upper, bb_lower = self.compute_bollinger_bands(close, self.bb_period, self.bb_std)
        latest_bb_mid = float(bb_mid.iloc[-1])
        latest_bb_upper = float(bb_upper.iloc[-1])
        latest_bb_lower = float(bb_lower.iloc[-1])

        lower_wick_ratio, upper_wick_ratio = self.compute_pin_bar_wick_ratio(
            latest_open, latest_high, latest_low, latest_close
        )

        # 5. Macro Knife-Catching Defense (D1 EMA200 / Trend Invalidation)
        # Check macro trend slope if macro data or parameters provided
        macro_slope = float(kwargs.get("macro_ema_slope", 0.0))
        macro_ema = float(kwargs.get("macro_ema200", latest_close))

        block_long = (latest_close < macro_ema) and (macro_slope < -0.0005)
        block_short = (latest_close > macro_ema) and (macro_slope > 0.0005)

        # Current ATR for stop buffer
        high_low = latest_high - latest_low
        atr_val = max(high_low, latest_close * 0.002)

        # 6. Long Entry:
        # RSI <= Oversold (clamped [20, 35])
        # Price bounced at BB Lower: Low < BB_lower and Close > BB_lower
        # Bullish Pin Bar: Lower wick ratio >= 0.60
        # Macro knife-catching defense passed
        if (
            latest_rsi <= oversold_thresh
            and latest_low < latest_bb_lower
            and latest_close > latest_bb_lower
            and lower_wick_ratio >= self.min_wick_ratio
            and not block_long
        ):
            stop_loss = latest_low - (0.8 * atr_val)
            take_profit = latest_bb_mid  # TP1: middle band reversion target

            return self.build_signal(
                action=OrderAction.BUY,
                symbol=symbol,
                entry_price=latest_close,
                stop_loss=stop_loss,
                take_profit=take_profit,
                regime=current_regime,
                comment=f"MeanRev Bull Bounce (RSI={latest_rsi:.1f}<={oversold_thresh:.1f}, Wick={lower_wick_ratio:.2f})",
            )

        # 7. Short Entry:
        # RSI >= Overbought (clamped [65, 80])
        # Price rejected at BB Upper: High > BB_upper and Close < BB_upper
        # Bearish Pin Bar: Upper wick ratio >= 0.60
        # Macro knife defense passed
        if (
            latest_rsi >= overbought_thresh
            and latest_high > latest_bb_upper
            and latest_close < latest_bb_upper
            and upper_wick_ratio >= self.min_wick_ratio
            and not block_short
        ):
            stop_loss = latest_high + (0.8 * atr_val)
            take_profit = latest_bb_mid

            return self.build_signal(
                action=OrderAction.SELL,
                symbol=symbol,
                entry_price=latest_close,
                stop_loss=stop_loss,
                take_profit=take_profit,
                regime=current_regime,
                comment=f"MeanRev Bear Bounce (RSI={latest_rsi:.1f}>={overbought_thresh:.1f}, Wick={upper_wick_ratio:.2f})",
            )

        return None

    def update_trailing_stop(
        self,
        position: Dict[str, Any],
        current_bar: Union[pd.Series, Dict[str, Any]],
        **kwargs: Any,
    ) -> Optional[float]:
        """
        Time-Stop Liquidation: Force liquidation if position held >= 16 bars.
        """
        bars_held = int(position.get("bars_held", kwargs.get("bars_held", 0)))
        if bars_held >= self.max_bars_in_trade:
            # Force exit at current close
            current_close = float(current_bar["close"])
            return current_close

        return None
