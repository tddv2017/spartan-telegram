"""Spartan Quantitative Validation Framework - Metrics Engine.

Calculates institutional quantitative performance metrics:
- Profit Factor (PF >= 2.0)
- Win Rate (WR >= 60.0%)
- Risk:Reward Ratio (R:R >= 1:1.5)
- Maximal Drawdown (MDD <= 5.0%)
- Annualized Sharpe Ratio (>= 2.5)
- Annualized Sortino Ratio (>= 3.5)
- Calmar Ratio (>= 3.0)
- Recovery Factor (>= 4.0)
- Trade Expectancy (> 0)
"""

import math
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd


class QuantitativeMetrics:
    """Quantitative Performance Metrics Engine matching Spartan Institutional Standards."""

    # Institutional Acceptance Thresholds from PROJECT.md & ORIGINAL_REQUEST.md
    THRESHOLDS: Dict[str, Dict[str, Any]] = {
        "profit_factor": {"target": 2.0, "op": ">=", "description": "Profit Factor >= 2.0"},
        "win_rate": {"target": 60.0, "op": ">=", "description": "Win Rate >= 60.0%"},
        "risk_reward": {"target": 1.5, "op": ">=", "description": "Risk:Reward >= 1:1.5"},
        "max_drawdown_pct": {"target": 5.0, "op": "<=", "description": "Max Drawdown <= 5.0%"},
        "sharpe_ratio": {"target": 2.5, "op": ">=", "description": "Sharpe Ratio >= 2.5"},
        "sortino_ratio": {"target": 3.5, "op": ">=", "description": "Sortino Ratio >= 3.5"},
        "calmar_ratio": {"target": 3.0, "op": ">=", "description": "Calmar Ratio >= 3.0"},
        "recovery_factor": {"target": 4.0, "op": ">=", "description": "Recovery Factor >= 4.0"},
    }

    @staticmethod
    def calculate_metrics(
        trades: List[Dict[str, Any]],
        initial_capital: float = 100000.0,
        risk_free_rate: float = 0.0,
        annual_factor: float = 252.0,
    ) -> Dict[str, float]:
        """
        Calculate complete institutional performance metrics from trade records.

        Args:
            trades: List of trade dictionaries containing at minimum 'pnl'.
            initial_capital: Starting portfolio balance (default $100,000).
            risk_free_rate: Annualized risk-free rate for Sharpe/Sortino.
            annual_factor: Trading periods per year (252 for daily).

        Returns:
            Dictionary of calculated quantitative metrics.
        """
        if not trades:
            return {
                "profit_factor": 0.0,
                "win_rate": 0.0,
                "risk_reward": 0.0,
                "max_drawdown_pct": 0.0,
                "max_drawdown_dollars": 0.0,
                "sharpe_ratio": 0.0,
                "sortino_ratio": 0.0,
                "calmar_ratio": 0.0,
                "recovery_factor": 0.0,
                "trade_expectancy": 0.0,
                "gross_profit": 0.0,
                "gross_loss": 0.0,
                "net_profit": 0.0,
                "ending_equity": float(initial_capital),
                "total_trades": 0,
                "winning_trades": 0,
                "losing_trades": 0,
                "avg_win": 0.0,
                "avg_loss": 0.0,
            }

        pnls = [float(t.get("pnl", 0.0)) for t in trades]
        wins = [p for p in pnls if p > 0]
        losses = [abs(p) for p in pnls if p < 0]

        gross_profit = float(sum(wins))
        gross_loss = float(sum(losses))
        net_profit = float(sum(pnls))

        # Profit Factor
        if gross_loss > 0:
            profit_factor = gross_profit / gross_loss
        elif gross_profit > 0:
            # 100% win rate (no losses) -> high bounded number
            profit_factor = gross_profit / 1e-6
        else:
            profit_factor = 0.0

        n_trades = len(pnls)
        n_wins = len(wins)
        n_losses = len(losses)
        win_rate_pct = (n_wins / max(n_trades, 1)) * 100.0
        win_rate_frac = n_wins / max(n_trades, 1)

        avg_win = float(np.mean(wins)) if wins else 0.0
        avg_loss = float(np.mean(losses)) if losses else (1e-6 if wins else 0.0)

        # Risk:Reward Ratio
        if avg_loss > 0:
            risk_reward = avg_win / avg_loss
        else:
            risk_reward = avg_win / 1e-6 if avg_win > 0 else 0.0

        # Trade Expectancy ($ per trade)
        expectancy = (win_rate_frac * avg_win) - ((1.0 - win_rate_frac) * avg_loss)

        # Equity Curve and Peak-to-Trough Drawdown
        equity = float(initial_capital)
        peak = equity
        max_dd_dollars = 0.0
        max_dd_frac = 0.0

        period_returns: List[float] = []
        for p in pnls:
            ret = p / max(equity, 1e-6)
            period_returns.append(ret)
            equity += p
            if equity > peak:
                peak = equity
            dd_dollars = peak - equity
            dd_frac = dd_dollars / max(peak, 1e-6)
            if dd_frac > max_dd_frac:
                max_dd_frac = dd_frac
            if dd_dollars > max_dd_dollars:
                max_dd_dollars = dd_dollars

        max_dd_pct = max_dd_frac * 100.0

        # Annualized Sharpe and Sortino
        returns_arr = np.array(period_returns)
        mean_ret = float(np.mean(returns_arr)) if len(returns_arr) > 0 else 0.0
        std_ret = float(np.std(returns_arr, ddof=1)) if len(returns_arr) > 1 else 1e-6

        downside_returns = returns_arr[returns_arr < 0]
        downside_std = (
            float(np.std(downside_returns, ddof=1)) if len(downside_returns) > 1 else (1e-6 if len(downside_returns) == 1 else 1e-6)
        )

        annual_sqrt = math.sqrt(annual_factor)
        rf_per_period = risk_free_rate / annual_factor

        excess_mean = mean_ret - rf_per_period
        sharpe = (excess_mean / max(std_ret, 1e-6)) * annual_sqrt
        sortino = (excess_mean / max(downside_std, 1e-6)) * annual_sqrt

        # CAGR & Calmar Ratio
        cagr = (equity / max(initial_capital, 1e-6)) - 1.0
        calmar = cagr / max(max_dd_frac, 1e-6)

        # Recovery Factor: Net Profit / Max Drawdown Dollars
        recovery_factor = net_profit / max(max_dd_dollars, 1e-6)

        return {
            "profit_factor": round(float(profit_factor), 2),
            "win_rate": round(float(win_rate_pct), 2),
            "risk_reward": round(float(risk_reward), 2),
            "max_drawdown_pct": round(float(max_dd_pct), 2),
            "max_drawdown_dollars": round(float(max_dd_dollars), 2),
            "sharpe_ratio": round(float(sharpe), 2),
            "sortino_ratio": round(float(sortino), 2),
            "calmar_ratio": round(float(calmar), 2),
            "recovery_factor": round(float(recovery_factor), 2),
            "trade_expectancy": round(float(expectancy), 2),
            "gross_profit": round(float(gross_profit), 2),
            "gross_loss": round(float(gross_loss), 2),
            "net_profit": round(float(net_profit), 2),
            "ending_equity": round(float(equity), 2),
            "total_trades": n_trades,
            "winning_trades": n_wins,
            "losing_trades": n_losses,
            "avg_win": round(float(avg_win), 2),
            "avg_loss": round(float(avg_loss), 2),
        }

    @staticmethod
    def calculate_equity_and_drawdown_series(
        trades: List[Dict[str, Any]],
        initial_capital: float = 100000.0,
    ) -> Tuple[pd.Series, pd.Series]:
        """
        Generate equity curve and underwater drawdown curve series.

        Returns:
            Tuple of (equity_series, underwater_drawdown_pct_series)
            Note: Underwater drawdown values are <= 0.0%.
        """
        if not trades:
            s = pd.Series([initial_capital])
            dd = pd.Series([0.0])
            return s, dd

        equity_vals = [initial_capital]
        current_eq = initial_capital
        for t in trades:
            current_eq += float(t.get("pnl", 0.0))
            equity_vals.append(current_eq)

        equity_series = pd.Series(equity_vals)
        peaks = equity_series.cummax()
        # Underwater curve is (equity - peak) / peak * 100.0 (strictly <= 0.0%)
        underwater = ((equity_series - peaks) / peaks.clip(lower=1e-6)) * 100.0
        return equity_series, underwater

    @classmethod
    def check_institutional_compliance(cls, metrics: Dict[str, float]) -> Dict[str, Any]:
        """
        Verify calculated metrics against the Spartan institutional criteria:
        - Profit Factor >= 2.0
        - Win Rate >= 60.0%
        - Risk:Reward >= 1:1.5
        - Max Drawdown <= 5.0%
        - Sharpe Ratio >= 2.5
        - Sortino Ratio >= 3.5
        - Calmar Ratio >= 3.0
        - Recovery Factor >= 4.0
        """
        checks: Dict[str, Dict[str, Any]] = {}
        all_passed = True

        for metric_name, rule in cls.THRESHOLDS.items():
            val = float(metrics.get(metric_name, 0.0))
            target = rule["target"]
            op = rule["op"]

            if op == ">=":
                passed = bool(val >= target)
            elif op == "<=":
                passed = bool(val <= target)
            else:
                passed = False

            if not passed:
                all_passed = False

            checks[metric_name] = {
                "target": target,
                "actual": val,
                "operator": op,
                "passed": passed,
                "description": rule["description"],
            }

        return {
            "compliant": all_passed,
            "passed_count": sum(1 for c in checks.values() if c["passed"]),
            "total_checks": len(checks),
            "checks": checks,
        }
