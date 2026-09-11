"""Dynamic Volatility Breakout Quantitative Alpha Model (Feature 8, Magic 888803)."""

from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd

from quant_research.core.constants import MAGIC_VOL_BREAKOUT, OrderAction, RegimeState
from quant_research.core.logger import get_logger
from quant_research.core.types import SignalDict
from quant_research.models.base_model import BaseQuantModel

logger = get_logger("spartan_vol_breakout")


class VolBreakoutModel(BaseQuantModel):
    """
    Model 3: Dynamic Volatility Breakout (Bollinger / Keltner Squeeze & Bandwidth Expansion).
    
    Features:
    - Bollinger Bands (20, 2.0) inside Keltner Channels (20, 1.5) Squeeze detection
    - Minimum Squeeze compression duration (>= 6 bars)
    - Bandwidth expansion ratio trigger (BW / SMA50(BW) > 1.15)
    - Linear Regression momentum oscillator slope
    - Volume surge filter (Volume >= 1.50 * SMA20(Volume))
    - On-Balance Volume (OBV) trend confirmation
    - Regime gating: BULL_TREND, BEAR_TREND, VOL_COMPRESSION
    """

    def __init__(
        self,
        name: str = "Dynamic Volatility Breakout",
        magic_number: int = MAGIC_VOL_BREAKOUT,
        strategy_code: int = 2,
        permitted_regimes: Optional[List[Union[RegimeState, str]]] = None,
        bb_period: int = 20,
        bb_std: float = 2.0,
        kc_period: int = 20,
        kc_atr_mult: float = 1.5,
        min_squeeze_bars: int = 6,
        bandwidth_expansion_thresh: float = 1.15,
        volume_surge_mult: float = 1.5,
        mom_osc_period: int = 20,
        **kwargs: Any,
    ) -> None:
        if permitted_regimes is None:
            permitted_regimes = [
                RegimeState.BULL_TREND,
                RegimeState.BEAR_TREND,
                RegimeState.VOL_COMPRESSION,
            ]

        super().__init__(
            name=name,
            magic_number=magic_number,
            strategy_code=strategy_code,
            permitted_regimes=permitted_regimes,
            **kwargs,
        )
        self.bb_period = bb_period
        self.bb_std = float(bb_std)
        self.kc_period = kc_period
        self.kc_atr_mult = float(kc_atr_mult)
        self.min_squeeze_bars = min_squeeze_bars
        self.bandwidth_expansion_thresh = float(bandwidth_expansion_thresh)
        self.volume_surge_mult = float(volume_surge_mult)
        self.mom_osc_period = mom_osc_period

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
    def compute_keltner_channels(
        df: pd.DataFrame,
        period: int = 20,
        atr_mult: float = 1.5,
    ) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """Keltner Channels: Middle (EMA), Upper, Lower."""
        close = df["close"]
        high = df["high"]
        low = df["low"]
        prev_close = close.shift(1)

        tr1 = high - low
        tr2 = (high - prev_close).abs()
        tr3 = (low - prev_close).abs()
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = tr.ewm(alpha=1.0 / period, adjust=False).mean()

        mid = close.ewm(span=period, adjust=False).mean()
        upper = mid + (atr_mult * atr)
        lower = mid - (atr_mult * atr)
        return mid, upper, lower

    @staticmethod
    def check_squeeze(
        bb_upper: Union[pd.Series, float],
        bb_lower: Union[pd.Series, float],
        kc_upper: Union[pd.Series, float],
        kc_lower: Union[pd.Series, float],
    ) -> Union[pd.Series, bool]:
        """
        Check if Bollinger Bands are strictly inside Keltner Channels:
        (bb_upper < kc_upper) and (bb_lower > kc_lower).
        Exact border equality does NOT count as squeeze.
        """
        return (bb_upper < kc_upper) & (bb_lower > kc_lower)

    @staticmethod
    def compute_bandwidth_ratio(
        bb_upper: pd.Series,
        bb_lower: pd.Series,
        bb_mid: pd.Series,
        baseline_period: int = 50,
    ) -> Tuple[pd.Series, pd.Series]:
        """
        Bandwidth = (Upper - Lower) / Mid
        Bandwidth Ratio = Bandwidth / SMA50(Bandwidth)
        """
        bw = (bb_upper - bb_lower) / (bb_mid + 1e-9)
        sma_bw = bw.rolling(baseline_period).mean()
        ratio = bw / (sma_bw + 1e-9)
        return bw, ratio

    @staticmethod
    def compute_momentum_oscillator(
        df: pd.DataFrame,
        period: int = 20,
    ) -> pd.Series:
        """
        Linear Regression Momentum Oscillator:
        delta_t = Close - [ (max(High, period) + min(Low, period))/2 + EMA(Close, period) ] / 2
        MomOsc_t = LinRegSlope(delta_t, period)
        """
        close = df["close"]
        high = df["high"]
        low = df["low"]

        donchian_mid = (high.rolling(period).max() + low.rolling(period).min()) / 2.0
        ema_mid = close.ewm(span=period, adjust=False).mean()
        baseline = (donchian_mid + ema_mid) / 2.0
        delta = close - baseline

        # Rolling linear regression slope
        x = np.arange(period)
        x_mean = np.mean(x)
        x_dev = x - x_mean
        x_var = np.sum(x_dev ** 2)

        slopes = np.zeros(len(df))
        delta_vals = delta.values

        for i in range(period - 1, len(df)):
            y_window = delta_vals[i - period + 1 : i + 1]
            if np.any(np.isnan(y_window)):
                slopes[i] = 0.0
            else:
                y_mean = np.mean(y_window)
                cov = np.sum(x_dev * (y_window - y_mean))
                slopes[i] = cov / x_var if x_var > 0 else 0.0

        return pd.Series(slopes, index=df.index)

    @staticmethod
    def compute_obv(df: pd.DataFrame, ema_period: int = 20) -> Tuple[pd.Series, pd.Series]:
        """On-Balance Volume and its Exponential Moving Average."""
        close = df["close"].values
        volume = df["volume"].values
        n = len(df)
        obv = np.zeros(n)

        for i in range(1, n):
            if close[i] > close[i - 1]:
                obv[i] = obv[i - 1] + volume[i]
            elif close[i] < close[i - 1]:
                obv[i] = obv[i - 1] - volume[i]
            else:
                obv[i] = obv[i - 1]

        obv_series = pd.Series(obv, index=df.index)
        obv_ema = obv_series.ewm(span=ema_period, adjust=False).mean()
        return obv_series, obv_ema

    def generate_signal(
        self,
        data: pd.DataFrame,
        current_regime: Union[RegimeState, str],
        **kwargs: Any,
    ) -> Optional[SignalDict]:
        """
        Evaluate Volatility Squeeze and generate Breakout Signal.
        """
        if not self.is_regime_permitted(current_regime):
            logger.debug(f"VolBreakout suppressed: regime {current_regime} not permitted.")
            return None

        min_bars = max(self.bb_period + 10, self.kc_period + 10, 50)
        if not self.validate_data(data, min_bars=min_bars):
            return None

        close = data["close"]
        volume = data["volume"]
        latest_close = float(close.iloc[-1])
        symbol = kwargs.get("symbol", "XAUUSD")

        # 1. Bollinger Bands & Keltner Channels
        bb_mid, bb_upper, bb_lower = self.compute_bollinger_bands(close, self.bb_period, self.bb_std)
        kc_mid, kc_upper, kc_lower = self.compute_keltner_channels(data, self.kc_period, self.kc_atr_mult)

        squeeze_series = self.check_squeeze(bb_upper, bb_lower, kc_upper, kc_lower)

        # 2. Check Squeeze History (consecutive squeeze duration >= min_squeeze_bars)
        # Squeeze release requires squeeze was active for >= min_squeeze_bars before firing
        squeeze_vals = squeeze_series.values
        squeeze_active_count = 0
        for val in reversed(squeeze_vals[:-1]):  # check preceding bars
            if val:
                squeeze_active_count += 1
            else:
                break

        # Check if armed: prior squeeze >= min_squeeze_bars
        is_armed = squeeze_active_count >= self.min_squeeze_bars
        if not is_armed:
            return None

        # Squeeze firing condition: current bar is breaking out or expanding
        is_currently_squeezed = bool(squeeze_vals[-1])

        # 3. Bandwidth Expansion Trigger
        _, bw_ratio = self.compute_bandwidth_ratio(bb_upper, bb_lower, bb_mid, baseline_period=50)
        latest_bw_ratio = float(bw_ratio.iloc[-1]) if not np.isnan(bw_ratio.iloc[-1]) else 1.0

        # Boundary: > 1.15
        if latest_bw_ratio <= self.bandwidth_expansion_thresh:
            return None

        # 4. Linear Regression Momentum Oscillator
        mom_osc = self.compute_momentum_oscillator(data, self.mom_osc_period)
        latest_slope = float(mom_osc.iloc[-1])
        prev_slope = float(mom_osc.iloc[-2]) if len(mom_osc) >= 2 else latest_slope

        # Boundary: zero slope triggers neither
        if latest_slope == 0.0:
            return None

        is_mom_bull = (latest_slope > 0.0) and (latest_slope >= prev_slope)
        is_mom_bear = (latest_slope < 0.0) and (latest_slope <= prev_slope)

        # 5. Volume Surge & OBV Confirmation
        vol_sma20 = float(volume.rolling(20).mean().iloc[-1])
        latest_vol = float(volume.iloc[-1])
        is_vol_surge = latest_vol >= (self.volume_surge_mult * vol_sma20)

        obv, obv_ema = self.compute_obv(data, ema_period=20)
        latest_obv = float(obv.iloc[-1])
        latest_obv_ema = float(obv_ema.iloc[-1])
        is_obv_bull = latest_obv > latest_obv_ema
        is_obv_bear = latest_obv < latest_obv_ema

        # Breakout level verification
        latest_bb_upper = float(bb_upper.iloc[-1])
        latest_bb_lower = float(bb_lower.iloc[-1])
        latest_kc_mid = float(kc_mid.iloc[-1])

        # 6. Signal Execution
        # Bullish Breakout
        if is_mom_bull and is_vol_surge and is_obv_bull and (latest_close >= latest_bb_upper or not is_currently_squeezed):
            stop_loss = latest_kc_mid
            risk = latest_close - stop_loss
            if risk <= 0:
                risk = latest_close * 0.01
                stop_loss = latest_close - risk
            take_profit = latest_close + (2.0 * risk)

            return self.build_signal(
                action=OrderAction.BUY,
                symbol=symbol,
                entry_price=latest_close,
                stop_loss=stop_loss,
                take_profit=take_profit,
                regime=current_regime,
                comment=f"VolBreakout Bull (BW_ratio={latest_bw_ratio:.2f}, Slope={latest_slope:.3f})",
            )

        # Bearish Breakout
        if is_mom_bear and is_vol_surge and is_obv_bear and (latest_close <= latest_bb_lower or not is_currently_squeezed):
            stop_loss = latest_kc_mid
            risk = stop_loss - latest_close
            if risk <= 0:
                risk = latest_close * 0.01
                stop_loss = latest_close + risk
            take_profit = latest_close - (2.0 * risk)

            return self.build_signal(
                action=OrderAction.SELL,
                symbol=symbol,
                entry_price=latest_close,
                stop_loss=stop_loss,
                take_profit=take_profit,
                regime=current_regime,
                comment=f"VolBreakout Bear (BW_ratio={latest_bw_ratio:.2f}, Slope={latest_slope:.3f})",
            )

        return None

    def update_trailing_stop(
        self,
        position: Dict[str, Any],
        current_bar: Union[pd.Series, Dict[str, Any]],
        **kwargs: Any,
    ) -> Optional[float]:
        """
        Trail stop along Keltner Midline / EMA20.
        """
        is_buy = str(position.get("side", position.get("type", "BUY"))).upper().startswith("BUY")
        current_stop = float(position.get("current_stop", position.get("stop_loss", 0.0)))
        ema_mid = kwargs.get("kc_mid", kwargs.get("ema20"))

        if ema_mid is not None:
            val = float(ema_mid)
            if is_buy and val > current_stop:
                return round(val, 6)
            elif not is_buy and (current_stop <= 0 or val < current_stop):
                return round(val, 6)

        return None
