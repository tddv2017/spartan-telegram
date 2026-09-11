"""Statistical Arbitrage Quantitative Alpha Model (Feature 6, Magic 888801)."""

import math
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd

from quant_research.core.constants import MAGIC_STAT_ARB, OrderAction, RegimeState
from quant_research.core.logger import get_logger
from quant_research.core.types import SignalDict
from quant_research.models.base_model import BaseQuantModel

logger = get_logger("spartan_stat_arb")


class StatArbModel(BaseQuantModel):
    """
    Model 1: Statistical Arbitrage for Cointegrated Asset Pairs (e.g. ETH/BTC).
    
    Features:
    - 1D/2D State-Space Dynamic Kalman Filter for dynamic hedge ratio beta_t
    - Engle-Granger Augmented Dickey-Fuller (ADF) cointegration stationarity test
    - Ornstein-Uhlenbeck (OU) mean-reverting process parameterization and half-life (tau_1/2)
    - Normalized rolling Z-score with entry (±2.0), take profit (±0.20), and structural stop (±3.50)
    - Regime gating: Strictly active in RANGE_BOUND regime.
    """

    def __init__(
        self,
        name: str = "Statistical Arbitrage (ETH/BTC)",
        magic_number: int = MAGIC_STAT_ARB,
        strategy_code: int = 3,
        permitted_regimes: Optional[List[Union[RegimeState, str]]] = None,
        symbol_y: str = "ETHUSDT",
        symbol_x: str = "BTCUSDT",
        z_entry: float = 2.0,
        z_exit: float = 0.20,
        z_stop: float = 3.50,
        adf_pvalue_threshold: float = 0.05,
        min_half_life: float = 5.0,
        max_half_life: float = 80.0,
        kalman_delta: float = 1e-4,
        kalman_r: float = 1.0,
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
        self.symbol_y = symbol_y
        self.symbol_x = symbol_x
        self.z_entry = float(z_entry)
        self.z_exit = float(z_exit)
        self.z_stop = float(z_stop)
        self.adf_pvalue_threshold = float(adf_pvalue_threshold)
        self.min_half_life = float(min_half_life)
        self.max_half_life = float(max_half_life)
        self.kalman_delta = float(kalman_delta)
        self.kalman_r = float(kalman_r)

    @staticmethod
    def solve_kalman_dynamic_beta(
        y_series: Union[pd.Series, np.ndarray],
        x_series: Union[pd.Series, np.ndarray],
        delta: float = 1e-4,
        r: float = 1.0,
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Dynamic 2-State Kalman Filter:
        Measurement Equation: y_t = alpha_t + beta_t * x_t + v_t, v_t ~ N(0, R)
        State Transition: [alpha_t, beta_t]^T = [alpha_{t-1}, beta_{t-1}]^T + w_t, w_t ~ N(0, Q)
        where Q = delta / (1 - delta) * I_2.
        
        Returns:
        --------
        Tuple[np.ndarray, np.ndarray]
            (betas, alphas) over the time series.
        """
        y = np.asarray(y_series, dtype=float)
        x = np.asarray(x_series, dtype=float)
        n = len(y)
        if n == 0 or len(x) != n:
            return np.array([]), np.array([])

        theta = np.zeros(2)  # [alpha, beta]
        R = float(r)
        q_scale = delta / (1.0 - delta) if delta < 1.0 else delta
        Q = q_scale * np.eye(2)
        P = np.eye(2)

        betas = np.zeros(n)
        alphas = np.zeros(n)

        for t in range(n):
            # Prior prediction
            P = P + Q
            # Measurement matrix H = [1.0, x[t]]
            H = np.array([1.0, x[t]])
            
            # Innovation
            y_hat = np.dot(H, theta)
            error = y[t] - y_hat
            
            # Innovation covariance
            S = np.dot(H, np.dot(P, H.T)) + R
            # Kalman gain
            K = np.dot(P, H.T) / (S + 1e-12)
            
            # Measurement update
            theta = theta + K * error
            P = P - np.outer(K, np.dot(H, P))

            alphas[t] = theta[0]
            betas[t] = theta[1]

        return betas, alphas

    @staticmethod
    def calculate_ou_half_life(spread: Union[pd.Series, np.ndarray]) -> Tuple[float, float]:
        """
        Fit Ornstein-Uhlenbeck process via AR(1) regression:
        delta_S = a + b * S_{t-1} + error
        If b >= 0, series is non-mean-reverting -> returns (999.0, 0.0).
        If b < 0, theta = -b, half-life = ln(2) / theta.
        
        Returns:
        --------
        Tuple[float, float]
            (half_life_bars, theta)
        """
        s = np.asarray(spread, dtype=float)
        if len(s) < 5:
            return 999.0, 0.0

        s_lag = s[:-1]
        delta_s = np.diff(s)

        # Fit OLS: delta_s ~ b * s_lag + a
        poly = np.polyfit(s_lag, delta_s, 1)
        b = float(poly[0])

        if b >= 0:
            return 999.0, 0.0

        theta = -b
        half_life = math.log(2.0) / max(theta, 1e-6)
        return float(half_life), float(theta)

    @staticmethod
    def compute_adf_test(spread: Union[pd.Series, np.ndarray]) -> Tuple[float, float, bool]:
        """
        Perform Augmented Dickey-Fuller unit-root test for spread cointegration stationarity.
        
        Returns:
        --------
        Tuple[float, float, bool]
            (adf_stat, p_value, is_stationary_at_5pct)
        """
        s = np.asarray(spread, dtype=float)
        # Drop NaNs or Infs
        s = s[np.isfinite(s)]
        n = len(s)
        if n < 15:
            return 0.0, 1.0, False

        # Optional statsmodels if installed and working
        try:
            from statsmodels.tsa.stattools import adfuller  # type: ignore[import-untyped]
            res = adfuller(s, maxlag=1, regression="c")
            adf_stat = float(res[0])
            p_val = float(res[1])
            return adf_stat, p_val, bool(p_val < 0.05)
        except Exception:
            pass

        # Pure NumPy OLS of delta_S ~ gamma * S_{t-1} + const
        dy = np.diff(s)
        y_lag = s[:-1]
        X = np.column_stack([np.ones(len(y_lag)), y_lag])
        beta, _, _, _ = np.linalg.lstsq(X, dy, rcond=None)
        gamma = beta[1]
        e = dy - X @ beta
        dof = len(dy) - 2
        s2 = np.sum(e ** 2) / max(dof, 1)
        try:
            inv_xtx = np.linalg.inv(X.T @ X)
            se_gamma = np.sqrt(max(1e-12, s2 * inv_xtx[1, 1]))
            t_stat = float(gamma / se_gamma)
        except Exception:
            return 0.0, 1.0, False

        # MacKinnon critical values: 1%: -3.43, 5%: -2.86, 10%: -2.57
        if t_stat <= -3.43:
            p_val = max(0.0001, 0.01 * math.exp(min(0.0, t_stat + 3.43)))
        elif t_stat <= -2.86:
            p_val = 0.01 + (0.05 - 0.01) * (t_stat - (-3.43)) / (-2.86 - (-3.43))
        else:
            p_val = min(0.99, 0.05 + 0.94 / (1.0 + math.exp(-max(-50.0, min(50.0, 0.8 * (t_stat + 2.86))))))
        
        return round(t_stat, 4), round(p_val, 4), bool(p_val < 0.05)

    @staticmethod
    def compute_z_score(
        spread: Union[pd.Series, np.ndarray],
        window: int = 30,
    ) -> Tuple[float, float, float]:
        """
        Calculate current Z-score of spread over rolling window.
        
        Returns:
        --------
        Tuple[float, float, float]
            (current_z, rolling_mean, rolling_std)
        """
        s = np.asarray(spread, dtype=float)
        if len(s) < max(2, window // 2):
            return 0.0, 0.0, 1.0

        w = min(len(s), max(5, window))
        tail = s[-w:]
        mean_val = float(np.mean(tail))
        std_val = float(np.std(tail, ddof=1)) if len(tail) > 1 else 1.0
        if std_val < 1e-8:
            return 0.0, mean_val, std_val

        current_z = float((s[-1] - mean_val) / std_val)
        return current_z, mean_val, std_val

    def generate_signal(
        self,
        data: pd.DataFrame,
        current_regime: Union[RegimeState, str],
        **kwargs: Any,
    ) -> Optional[SignalDict]:
        """
        Generate StatArb Signal on ETH/BTC (or specified pair).
        
        Parameters:
        -----------
        data : pd.DataFrame
            DataFrame containing asset Y (default 'close') and asset X (column 'close_x', 'btc', or provided in secondary_data).
        current_regime : Union[RegimeState, str]
            Current market regime. Gated to RANGE_BOUND.
        **kwargs : Any
            secondary_data: Optional pd.DataFrame or pd.Series for asset X.
            symbol: Optional override for primary symbol Y.
        """
        # 1. Regime Gate: Only trade in RANGE_BOUND
        if not self.is_regime_permitted(current_regime):
            logger.debug(f"StatArb suppressed: regime {current_regime} not permitted.")
            return None

        # 2. Extract series y and x
        y_col = "close" if "close" in data.columns else data.columns[0]
        y_series = data[y_col]

        x_series: Optional[pd.Series] = None
        if "close_x" in data.columns:
            x_series = data["close_x"]
        elif "btc" in data.columns:
            x_series = data["btc"]
        elif "secondary_data" in kwargs:
            sec = kwargs["secondary_data"]
            if isinstance(sec, pd.DataFrame):
                x_series = sec["close"] if "close" in sec.columns else sec.iloc[:, 0]
            elif isinstance(sec, pd.Series):
                x_series = sec

        if x_series is None or len(y_series) < 30 or len(x_series) < 30:
            logger.debug("StatArb: Insufficient data for pair cointegration.")
            return None

        # Align lengths
        min_len = min(len(y_series), len(x_series))
        y_arr = np.asarray(y_series.iloc[-min_len:], dtype=float)
        x_arr = np.asarray(x_series.iloc[-min_len:], dtype=float)

        # 3. Dynamic Kalman Hedge Ratio
        betas, alphas = self.solve_kalman_dynamic_beta(
            y_arr, x_arr, delta=self.kalman_delta, r=self.kalman_r
        )
        if len(betas) == 0:
            return None

        current_beta = float(betas[-1])
        current_alpha = float(alphas[-1])
        spread = y_arr - (current_alpha + current_beta * x_arr)

        # 4. Ornstein-Uhlenbeck Half-Life
        half_life, theta = self.calculate_ou_half_life(spread)
        if not (self.min_half_life <= half_life <= self.max_half_life):
            logger.debug(f"StatArb: Half-life {half_life:.1f} outside [{self.min_half_life}, {self.max_half_life}].")
            return None

        # 5. ADF Cointegration Test
        adf_stat, p_val, is_stationary = self.compute_adf_test(spread)
        if p_val >= self.adf_pvalue_threshold:
            logger.debug(f"StatArb: ADF p-value {p_val:.4f} >= threshold {self.adf_pvalue_threshold}.")
            return None

        # 6. Z-Score Evaluation
        z_window = int(max(10, min(100, round(2.0 * half_life))))
        z_score, mean_spread, std_spread = self.compute_z_score(spread, window=z_window)

        symbol = kwargs.get("symbol", self.symbol_y)
        latest_price = float(y_arr[-1])

        # 7. Signal Logic
        # Structural Stop Loss trigger (|z| >= z_stop)
        if abs(z_score) >= self.z_stop:
            logger.info(f"StatArb: Structural breakdown detected (|Z|={z_score:.2f} >= {self.z_stop}).")
            return self.build_signal(
                action=OrderAction.CLOSE,
                symbol=symbol,
                entry_price=latest_price,
                stop_loss=latest_price,
                take_profit=latest_price,
                regime=current_regime,
                comment=f"StatArb Structural Stop (|Z|={z_score:.2f})",
            )

        # Mean Exit (|z| <= z_exit)
        if abs(z_score) <= self.z_exit:
            return self.build_signal(
                action=OrderAction.CLOSE,
                symbol=symbol,
                entry_price=latest_price,
                stop_loss=latest_price,
                take_profit=latest_price,
                regime=current_regime,
                comment=f"StatArb Mean Exit Target (|Z|={z_score:.2f} <= {self.z_exit})",
            )

        # Long Spread: Z <= -2.0 (Buy Y, Sell beta X)
        if z_score <= -self.z_entry:
            # Spread is underpriced -> Y expected to rise relative to X
            target_spread = mean_spread
            price_target_y = latest_price + (target_spread - spread[-1])
            stop_spread = mean_spread - (self.z_stop * std_spread)
            price_stop_y = latest_price - (spread[-1] - stop_spread)

            return self.build_signal(
                action=OrderAction.BUY,
                symbol=symbol,
                entry_price=latest_price,
                stop_loss=max(0.01, price_stop_y),
                take_profit=price_target_y,
                regime=current_regime,
                comment=f"StatArb Long Spread (Z={z_score:.2f}, beta={current_beta:.4f}, HL={half_life:.1f})",
            )

        # Short Spread: Z >= +2.0 (Sell Y, Buy beta X)
        if z_score >= self.z_entry:
            # Spread is overpriced -> Y expected to fall relative to X
            target_spread = mean_spread
            price_target_y = latest_price - (spread[-1] - target_spread)
            stop_spread = mean_spread + (self.z_stop * std_spread)
            price_stop_y = latest_price + (stop_spread - spread[-1])

            return self.build_signal(
                action=OrderAction.SELL,
                symbol=symbol,
                entry_price=latest_price,
                stop_loss=price_stop_y,
                take_profit=max(0.01, price_target_y),
                regime=current_regime,
                comment=f"StatArb Short Spread (Z={z_score:.2f}, beta={current_beta:.4f}, HL={half_life:.1f})",
            )

        return None

    def update_trailing_stop(
        self,
        position: Dict[str, Any],
        current_bar: Union[pd.Series, Dict[str, Any]],
        **kwargs: Any,
    ) -> Optional[float]:
        """
        Update stop loss or trigger structural liquidation if cointegration breaks down.
        """
        current_z = kwargs.get("z_score")
        if current_z is not None and abs(float(current_z)) >= self.z_stop:
            # Return current bar close to force immediate liquidation
            bar_close = float(current_bar["close"]) if isinstance(current_bar, (pd.Series, dict)) else float(current_bar)
            return bar_close

        # StatArb uses fixed structural stop and mean take-profit; trailing remains unchanged
        return None
