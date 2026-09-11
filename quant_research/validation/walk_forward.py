"""Spartan Quantitative Validation Framework - Walk-Forward Optimization (WFO).

Implements:
- Rolling Window Walk-Forward Optimization (6-month IS / 2-month OOS / 1-month step).
- Walk-Forward Efficiency metric calculation: WFE = (Return_OOS / Return_IS) * 100%.
- Strict institutional qualification gate: WFE >= 60.0%.
- Parameter stability surface evaluation (plateau vs isolated spike).
- Out-of-sample concatenated equity curve generation.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd


@dataclass
class WFOWindow:
    """Specification of a single walk-forward optimization window."""
    window_id: int
    train_start: pd.Timestamp
    train_end: pd.Timestamp
    test_start: pd.Timestamp
    test_end: pd.Timestamp
    is_return: float = 0.0
    oos_return: float = 0.0
    wfe: float = 0.0
    is_qualified: bool = False
    best_params: Dict[str, Any] = field(default_factory=dict)


@dataclass
class WFOResult:
    """Complete results from a Walk-Forward Optimization study."""
    windows: List[WFOWindow]
    average_wfe: float
    is_qualified: bool
    cumulative_oos_return: float
    chained_equity_curve: pd.Series
    parameter_stability: Dict[str, Any]


class WalkForwardOptimizer:
    """Rolling Window Walk-Forward Optimization Engine."""

    def __init__(
        self,
        train_months: int = 6,
        test_months: int = 2,
        step_months: int = 1,
        min_wfe_pct: float = 60.0,
    ) -> None:
        """
        Initialize WFO Engine.

        Args:
            train_months: Length of in-sample training window in months (default 6).
            test_months: Length of out-of-sample testing window in months (default 2).
            step_months: Progression step size in months (default 1).
            min_wfe_pct: Minimum Walk-Forward Efficiency required for qualification (60.0%).
        """
        self.train_months = train_months
        self.test_months = test_months
        self.step_months = step_months
        self.min_wfe_pct = min_wfe_pct

    def generate_rolling_windows(
        self,
        start_date: Union[pd.Timestamp, str],
        end_date: Union[pd.Timestamp, str],
    ) -> List[Tuple[Tuple[pd.Timestamp, pd.Timestamp], Tuple[pd.Timestamp, pd.Timestamp]]]:
        """
        Generate list of ((train_start, train_end), (test_start, test_end)) timestamps.
        
        Args:
            start_date: Earliest available timestamp in dataset.
            end_date: Latest available timestamp in dataset.
            
        Returns:
            List of window timestamp pairs.
        """
        t_start = pd.Timestamp(start_date)
        t_end = pd.Timestamp(end_date)

        windows: List[Tuple[Tuple[pd.Timestamp, pd.Timestamp], Tuple[pd.Timestamp, pd.Timestamp]]] = []
        current_train_start = t_start

        while True:
            train_end = current_train_start + pd.DateOffset(months=self.train_months)
            test_start = train_end
            test_end = test_start + pd.DateOffset(months=self.test_months)

            if test_end > t_end:
                break

            windows.append(((current_train_start, train_end), (test_start, test_end)))
            current_train_start = current_train_start + pd.DateOffset(months=self.step_months)

        return windows

    @staticmethod
    def calculate_wfe(
        is_return: float,
        oos_return: float,
        annualized: bool = True,
    ) -> float:
        """
        Calculate Walk-Forward Efficiency:
        WFE = (Annualized Return OOS / Annualized Return IS) * 100%.

        Args:
            is_return: In-sample performance return.
            oos_return: Out-of-sample performance return.
            annualized: Whether returns are already annualized.

        Returns:
            Walk-Forward Efficiency percentage.
        """
        # Protect against division by zero
        denom = max(abs(is_return), 1e-6)
        wfe = (oos_return / denom) * 100.0

        # If IS return is negative, handle sign logic
        if is_return < 0 and oos_return > 0:
            wfe = abs(wfe)
        elif is_return < 0 and oos_return < 0:
            wfe = -abs(wfe)

        return round(float(wfe), 2)

    def is_wfe_qualified(self, wfe: float) -> bool:
        """Check if WFE satisfies the Spartan institutional requirement (>= 60.0%)."""
        return wfe >= self.min_wfe_pct

    @staticmethod
    def evaluate_parameter_surface(
        grid_results: Dict[Any, float],
        optimal_param: Any,
        plateau_tolerance: float = 0.10,
    ) -> Dict[str, Any]:
        """
        Verify that optimal parameter resides on a stable plateau rather than an isolated spike.

        Args:
            grid_results: Mapping of parameter value to Sharpe or Return.
            optimal_param: Chosen optimal parameter key.
            plateau_tolerance: Maximum allowable fractional drop for adjacent neighbors.

        Returns:
            Dictionary assessing plateau stability and gradient.
        """
        if not grid_results or optimal_param not in grid_results:
            return {"is_stable_plateau": False, "gradient": 0.0, "details": "Parameter not found in grid"}

        opt_val = grid_results[optimal_param]
        sorted_keys = sorted(list(grid_results.keys()))

        if len(sorted_keys) < 2:
            return {"is_stable_plateau": True, "gradient": 0.0, "details": "Single point grid"}

        opt_idx = sorted_keys.index(optimal_param)
        neighbor_vals = []
        if opt_idx > 0:
            neighbor_vals.append(grid_results[sorted_keys[opt_idx - 1]])
        if opt_idx < len(sorted_keys) - 1:
            neighbor_vals.append(grid_results[sorted_keys[opt_idx + 1]])

        values_arr = np.array([grid_results[k] for k in sorted_keys])
        gradients = np.gradient(values_arr)
        opt_gradient = float(gradients[opt_idx])

        # A stable plateau means neighbors are within (1 - plateau_tolerance) * opt_val
        min_allowed = opt_val * (1.0 - plateau_tolerance) if opt_val > 0 else opt_val * (1.0 + plateau_tolerance)
        is_plateau = all(n >= min_allowed for n in neighbor_vals)

        return {
            "is_stable_plateau": is_plateau,
            "optimal_value": opt_val,
            "neighbor_values": neighbor_vals,
            "gradient_at_opt": round(opt_gradient, 4),
            "plateau_check_passed": is_plateau,
        }

    @staticmethod
    def concatenate_oos_returns(
        oos_return_series_list: List[pd.Series],
        initial_capital: float = 100000.0,
    ) -> Tuple[pd.Series, float]:
        """
        Chain multiple OOS return segments into a continuous compounded equity curve.

        Args:
            oos_return_series_list: List of return series from sequential OOS windows.
            initial_capital: Starting portfolio equity.

        Returns:
            Tuple of (chained_equity_series, cumulative_total_return)
        """
        if not oos_return_series_list:
            return pd.Series([initial_capital]), 0.0

        current_equity = initial_capital
        equity_points = [initial_capital]

        for s in oos_return_series_list:
            for r in s:
                current_equity *= (1.0 + float(r))
                equity_points.append(current_equity)

        equity_curve = pd.Series(equity_points)
        total_return = (current_equity / initial_capital) - 1.0
        return equity_curve, total_return
