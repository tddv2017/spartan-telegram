"""Momentum Multi-Timeframe Trend-Following Alpha Model (Feature 7, Magic 888802)."""

import math
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd

from quant_research.core.constants import MAGIC_MOMENTUM_TREND, OrderAction, RegimeState
from quant_research.core.logger import get_logger
from quant_research.core.types import SignalDict
from quant_research.models.base_model import BaseQuantModel

logger = get_logger("spartan_momentum_trend")


class MomentumTrendModel(BaseQuantModel):
    """
    Model 2: Momentum Multi-Timeframe Trend-Following.
    
    Features:
    - Triple EMA stack (21 / 55 / 200) alignment
    - Donchian Channel 20 breakout trigger
    - Supertrend dynamic ATR ratcheting trailing stop
    - ADX >= 25.0 and DMI (+DI / -DI) directional momentum filter
    - Multi-stage Take Profit (50% at +2.0R, remaining trails with Supertrend)
    - Regime gating: BULL_TREND and BEAR_TREND
    """

    def __init__(
        self,
        name: str = "Momentum Multi-Timeframe Trend",
        magic_number: int = MAGIC_MOMENTUM_TREND,
        strategy_code: int = 1,
        permitted_regimes: Optional[List[Union[RegimeState, str]]] = None,
        ema_fast: int = 21,
        ema_med: int = 55,
        ema_slow: int = 200,
        donchian_period: int = 20,
        supertrend_atr: int = 10,
        supertrend_mult: float = 3.0,
        adx_threshold: float = 25.0,
        risk_reward_tp1: float = 2.0,
        atr_stop_multiplier: float = 2.5,
        **kwargs: Any,
    ) -> None:
        if permitted_regimes is None:
            permitted_regimes = [RegimeState.BULL_TREND, RegimeState.BEAR_TREND]

        super().__init__(
            name=name,
            magic_number=magic_number,
            strategy_code=strategy_code,
            permitted_regimes=permitted_regimes,
            **kwargs,
        )
        self.ema_fast = ema_fast
        self.ema_med = ema_med
        self.ema_slow = ema_slow
        self.donchian_period = donchian_period
        self.supertrend_atr = supertrend_atr
        self.supertrend_mult = float(supertrend_mult)
        self.adx_threshold = float(adx_threshold)
        self.risk_reward_tp1 = float(risk_reward_tp1)
        self.atr_stop_multiplier = float(atr_stop_multiplier)

    @staticmethod
    def compute_ema(series: pd.Series, span: int) -> pd.Series:
        """Exponential Moving Average."""
        return series.ewm(span=span, adjust=False).mean()

    @staticmethod
    def compute_atr(df: pd.DataFrame, period: int = 10) -> pd.Series:
        """Wilder / Exponential Average True Range."""
        high = df["high"]
        low = df["low"]
        close = df["close"]
        prev_close = close.shift(1)
        
        tr1 = high - low
        tr2 = (high - prev_close).abs()
        tr3 = (low - prev_close).abs()
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        return tr.ewm(alpha=1.0 / max(1, period), adjust=False).mean()

    @staticmethod
    def compute_supertrend(
        df: pd.DataFrame,
        period: int = 10,
        multiplier: float = 3.0,
    ) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """
        Compute Supertrend line, upper band, and lower band with dynamic ratchet.
        
        Returns:
        --------
        Tuple[pd.Series, pd.Series, pd.Series]
            (supertrend_line, upper_band, lower_band)
        """
        n = len(df)
        if n == 0:
            empty = pd.Series(dtype=float)
            return empty, empty, empty

        high = df["high"].values
        low = df["low"].values
        close = df["close"].values
        
        atr_series = MomentumTrendModel.compute_atr(df, period=period)
        atr = atr_series.values

        # Median price
        median = (high + low) / 2.0

        raw_upper = median + (multiplier * atr)
        raw_lower = median - (multiplier * atr)

        # Fallback for zero ATR
        zero_mask = (atr == 0.0) | np.isnan(atr)
        raw_upper[zero_mask] = close[zero_mask]
        raw_lower[zero_mask] = close[zero_mask]

        ratchet_upper = np.zeros(n)
        ratchet_lower = np.zeros(n)
        trend = np.zeros(n)  # +1 = bull, -1 = bear
        supertrend = np.zeros(n)

        # Initialize bar 0
        ratchet_upper[0] = raw_upper[0]
        ratchet_lower[0] = raw_lower[0]
        trend[0] = 1 if close[0] >= ratchet_lower[0] else -1
        supertrend[0] = ratchet_lower[0] if trend[0] == 1 else ratchet_upper[0]

        for i in range(1, n):
            # Ratchet lower band: non-decreasing while close > prev_lb
            if close[i - 1] > ratchet_lower[i - 1]:
                ratchet_lower[i] = max(ratchet_lower[i - 1], raw_lower[i])
            else:
                ratchet_lower[i] = raw_lower[i]

            # Ratchet upper band: non-increasing while close < prev_ub
            if close[i - 1] < ratchet_upper[i - 1]:
                ratchet_upper[i] = min(ratchet_upper[i - 1], raw_upper[i])
            else:
                ratchet_upper[i] = raw_upper[i]

            # Determine trend direction
            prev_trend = trend[i - 1]
            if prev_trend == 1:
                if close[i] < ratchet_lower[i]:
                    trend[i] = -1
                    supertrend[i] = ratchet_upper[i]
                else:
                    trend[i] = 1
                    supertrend[i] = ratchet_lower[i]
            else:
                if close[i] > ratchet_upper[i]:
                    trend[i] = 1
                    supertrend[i] = ratchet_lower[i]
                else:
                    trend[i] = -1
                    supertrend[i] = ratchet_upper[i]

        idx = df.index
        return (
            pd.Series(supertrend, index=idx),
            pd.Series(ratchet_upper, index=idx),
            pd.Series(ratchet_lower, index=idx),
        )

    @staticmethod
    def compute_donchian(
        df: pd.DataFrame,
        period: int = 20,
    ) -> Tuple[pd.Series, pd.Series]:
        """
        Donchian Channels over preceding `period` bars (excluding current bar).
        """
        high = df["high"]
        low = df["low"]
        upper = high.shift(1).rolling(period).max()
        lower = low.shift(1).rolling(period).min()
        return upper, lower

    @staticmethod
    def compute_adx_dmi(
        df: pd.DataFrame,
        period: int = 14,
    ) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """Directional Movement Index and ADX."""
        high = df["high"]
        low = df["low"]
        close = df["close"]
        prev_high = high.shift(1)
        prev_low = low.shift(1)

        up_move = high - prev_high
        down_move = prev_low - low

        plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0.0)
        minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0.0)

        atr = MomentumTrendModel.compute_atr(df, period=period)
        plus_di = 100.0 * pd.Series(plus_dm, index=df.index).ewm(alpha=1.0 / period, adjust=False).mean() / (atr + 1e-9)
        minus_di = 100.0 * pd.Series(minus_dm, index=df.index).ewm(alpha=1.0 / period, adjust=False).mean() / (atr + 1e-9)

        di_sum = plus_di + minus_di + 1e-9
        dx = 100.0 * (plus_di - minus_di).abs() / di_sum
        adx = dx.ewm(alpha=1.0 / period, adjust=False).mean()
        return adx, plus_di, minus_di

    def generate_signal(
        self,
        data: pd.DataFrame,
        current_regime: Union[RegimeState, str],
        **kwargs: Any,
    ) -> Optional[SignalDict]:
        """
        Generate Momentum Trend-Following signal.
        """
        # 1. Regime filter: BULL_TREND or BEAR_TREND
        if not self.is_regime_permitted(current_regime):
            logger.debug(f"MomentumTrend suppressed: regime {current_regime} not permitted.")
            return None

        if not self.validate_data(data, min_bars=max(self.ema_slow + 10, self.donchian_period + 10)):
            return None

        close = data["close"]
        latest_close = float(close.iloc[-1])
        symbol = kwargs.get("symbol", "XAUUSD")

        # 2. Triple EMA Stack
        ema21 = self.compute_ema(close, self.ema_fast).iloc[-1]
        ema55 = self.compute_ema(close, self.ema_med).iloc[-1]
        ema200 = self.compute_ema(close, self.ema_slow).iloc[-1]

        is_bull_stack = (ema21 > ema55 > ema200)
        is_bear_stack = (ema21 < ema55 < ema200)

        # Equilibrium / Choppy guard
        if not (is_bull_stack or is_bear_stack):
            return None

        # 3. Donchian Breakout
        upper_dc, lower_dc = self.compute_donchian(data, self.donchian_period)
        latest_upper_dc = float(upper_dc.iloc[-1])
        latest_lower_dc = float(lower_dc.iloc[-1])

        is_bull_breakout = latest_close > latest_upper_dc
        is_bear_breakout = latest_close < latest_lower_dc

        # 4. Supertrend Ratchet
        st_line, st_upper, st_lower = self.compute_supertrend(
            data, period=self.supertrend_atr, multiplier=self.supertrend_mult
        )
        latest_st = float(st_line.iloc[-1])
        latest_lb = float(st_lower.iloc[-1])
        latest_ub = float(st_upper.iloc[-1])
        is_supertrend_bull = latest_close >= latest_lb
        is_supertrend_bear = latest_close <= latest_ub

        # 5. ADX & Directional Movement Gate
        adx, plus_di, minus_di = self.compute_adx_dmi(data)
        latest_adx = float(adx.iloc[-1])
        latest_plus_di = float(plus_di.iloc[-1])
        latest_minus_di = float(minus_di.iloc[-1])

        if latest_adx < self.adx_threshold:
            return None

        # Current ATR for stop sizing
        atr_val = float(self.compute_atr(data, period=self.supertrend_atr).iloc[-1])
        if atr_val <= 0:
            atr_val = latest_close * 0.005

        # 6. Signal Dispatch
        # Long Entry: Bull Stack + Donchian Breakout + Supertrend Green + ADX >= 25 +DI > -DI
        if is_bull_stack and is_bull_breakout and is_supertrend_bull and (latest_plus_di > latest_minus_di):
            initial_stop = latest_close - (self.atr_stop_multiplier * atr_val)
            r_dist = latest_close - initial_stop
            tp1 = latest_close + (self.risk_reward_tp1 * r_dist)

            return self.build_signal(
                action=OrderAction.BUY,
                symbol=symbol,
                entry_price=latest_close,
                stop_loss=initial_stop,
                take_profit=tp1,
                regime=current_regime,
                comment=f"Momentum Bull Breakout (ADX={latest_adx:.1f}, TP1=+{self.risk_reward_tp1:.1f}R)",
            )

        # Short Entry: Bear Stack + Donchian Breakdown + Supertrend Red + ADX >= 25 -DI > +DI
        if is_bear_stack and is_bear_breakout and is_supertrend_bear and (latest_minus_di > latest_plus_di):
            initial_stop = latest_close + (self.atr_stop_multiplier * atr_val)
            r_dist = initial_stop - latest_close
            tp1 = latest_close - (self.risk_reward_tp1 * r_dist)

            return self.build_signal(
                action=OrderAction.SELL,
                symbol=symbol,
                entry_price=latest_close,
                stop_loss=initial_stop,
                take_profit=tp1,
                regime=current_regime,
                comment=f"Momentum Bear Breakout (ADX={latest_adx:.1f}, TP1=+{self.risk_reward_tp1:.1f}R)",
            )

        return None

    def update_trailing_stop(
        self,
        position: Dict[str, Any],
        current_bar: Union[pd.Series, Dict[str, Any]],
        **kwargs: Any,
    ) -> Optional[float]:
        """
        Ratchet stop loss to Supertrend Lower Band (Long) or Upper Band (Short).
        """
        is_buy = str(position.get("side", position.get("type", "BUY"))).upper().startswith("BUY")
        entry_price = float(position.get("entry_price", 0.0))
        current_stop = float(position.get("current_stop", position.get("stop_loss", 0.0)))
        current_close = float(current_bar["close"])

        st_lb = kwargs.get("supertrend_lb")
        st_ub = kwargs.get("supertrend_ub")

        if is_buy:
            # Ratchet Long stop upward
            if st_lb is not None:
                new_stop = max(current_stop, float(st_lb))
                if new_stop > current_stop:
                    return round(new_stop, 6)
        else:
            # Ratchet Short stop downward
            if st_ub is not None:
                new_stop = min(current_stop, float(st_ub)) if current_stop > 0 else float(st_ub)
                if current_stop <= 0 or new_stop < current_stop:
                    return round(new_stop, 6)

        return None
