"""Spartan Quantitative Validation Framework - Monte Carlo Simulation Engine.

Evaluates sequence risk and statistical tail risk via:
- 1,000+ to 5,000+ bootstrap path permutations with replacement.
- Parametric slippage jitter perturbation modeling.
- Downside tail risk verification:
  * P(Max DD > 10.0%) < 1.0%
  * 95th Percentile Max Drawdown <= 5.0%
  * Probability of Ruin (>= 20% loss) == 0.00%
  * Conditional Value at Risk (CVaR 99%) <= 7.5%
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
import numpy as np


@dataclass
class MonteCarloResult:
    """Statistical summary of Monte Carlo simulation runs."""
    n_simulations: int
    prob_dd_exceeds_10_pct: float
    percentile_95_max_dd: float
    prob_ruin: float
    cvar_99_max_dd: float
    median_max_dd: float
    median_final_equity: float
    percentile_5_final_equity: float
    percentile_95_final_equity: float
    is_compliant: bool
    summary_metrics: Dict[str, float]
    sample_equity_paths: List[List[float]] = field(default_factory=list)


class MonteCarloSimulator:
    """Monte Carlo Bootstrapping and Perturbation Framework."""

    MIN_SIMULATIONS: int = 1000

    def __init__(
        self,
        n_simulations: int = 2500,
        random_seed: Optional[int] = 42,
        dd_threshold_pct: float = 10.0,
        p95_dd_target_pct: float = 5.0,
        ruin_loss_pct: float = 20.0,
        cvar_threshold_pct: float = 7.5,
    ) -> None:
        """
        Initialize Monte Carlo Simulator.

        Args:
            n_simulations: Number of bootstrap simulation iterations (min 1,000).
            random_seed: Reproducibility seed.
            dd_threshold_pct: Drawdown breach threshold for probability calculation (10.0%).
            p95_dd_target_pct: 95th percentile Max Drawdown acceptance limit (5.0%).
            ruin_loss_pct: Ruin account drawdown threshold (20.0%).
            cvar_threshold_pct: Maximum allowable CVaR 99% drawdown (7.5%).
        """
        if n_simulations < self.MIN_SIMULATIONS:
            raise ValueError(
                f"Monte Carlo framework requires at least {self.MIN_SIMULATIONS} iterations (got {n_simulations})."
            )
        self.n_simulations = n_simulations
        self.random_seed = random_seed
        self.dd_threshold_pct = dd_threshold_pct
        self.p95_dd_target_pct = p95_dd_target_pct
        self.ruin_loss_pct = ruin_loss_pct
        self.cvar_threshold_pct = cvar_threshold_pct

    def run_simulation(
        self,
        trades: List[Dict[str, Any]],
        initial_capital: float = 100000.0,
        jitter_lambda: float = 0.0,
        max_paths_to_store: int = 50,
    ) -> MonteCarloResult:
        """
        Execute trade sequence bootstrapping and jitter perturbation analysis.

        Args:
            trades: Historical trade records containing 'pnl'.
            initial_capital: Initial portfolio starting balance.
            jitter_lambda: Exponential parameter for adverse slippage jitter (0.0 = off).
            max_paths_to_store: Number of simulated equity curves stored for charting.

        Returns:
            MonteCarloResult with tail risk probabilities and compliance status.
        """
        if self.random_seed is not None:
            np.random.seed(self.random_seed)

        if not trades:
            return MonteCarloResult(
                n_simulations=self.n_simulations,
                prob_dd_exceeds_10_pct=0.0,
                percentile_95_max_dd=0.0,
                prob_ruin=0.0,
                cvar_99_max_dd=0.0,
                median_max_dd=0.0,
                median_final_equity=initial_capital,
                percentile_5_final_equity=initial_capital,
                percentile_95_final_equity=initial_capital,
                is_compliant=True,
                summary_metrics={},
                sample_equity_paths=[[initial_capital]],
            )

        pnls = np.array([float(t.get("pnl", 0.0)) for t in trades], dtype=float)
        n_trades = len(pnls)

        sim_max_dds: List[float] = []
        sim_final_equities: List[float] = []
        ruin_events = 0
        dd_exceed_events = 0
        stored_paths: List[List[float]] = []

        for sim_idx in range(self.n_simulations):
            # 1. Resample trade sequence with replacement
            sampled_indices = np.random.choice(n_trades, size=n_trades, replace=True)
            sampled_pnls = pnls[sampled_indices].copy()

            # 2. Apply slippage jitter perturbation if configured
            if jitter_lambda > 0.0:
                jitter = np.random.exponential(scale=jitter_lambda, size=n_trades)
                sampled_pnls -= jitter

            # 3. Simulate equity trajectory
            equity = initial_capital
            peak = equity
            sim_max_dd_frac = 0.0
            equity_path = [equity]

            for pnl in sampled_pnls:
                equity += pnl
                equity_path.append(equity)
                if equity > peak:
                    peak = equity
                dd_frac = (peak - equity) / max(peak, 1e-6)
                if dd_frac > sim_max_dd_frac:
                    sim_max_dd_frac = dd_frac

            sim_max_dd_pct = sim_max_dd_frac * 100.0
            sim_max_dds.append(sim_max_dd_pct)
            sim_final_equities.append(equity)

            # Check threshold breaches
            if sim_max_dd_pct > self.dd_threshold_pct:
                dd_exceed_events += 1

            # Ruin threshold: loss from initial capital >= ruin_loss_pct (20%)
            total_loss_pct = ((initial_capital - equity) / initial_capital) * 100.0
            if total_loss_pct >= self.ruin_loss_pct or sim_max_dd_pct >= self.ruin_loss_pct:
                ruin_events += 1

            if sim_idx < max_paths_to_store:
                stored_paths.append(equity_path)

        # Statistical Metrics Computation
        max_dds_arr = np.array(sim_max_dds)
        final_equities_arr = np.array(sim_final_equities)

        prob_dd_over_10 = float(dd_exceed_events / self.n_simulations)
        prob_ruin = float(ruin_events / self.n_simulations)
        p95_max_dd = float(np.percentile(max_dds_arr, 95))
        median_max_dd = float(np.median(max_dds_arr))

        # CVaR 99% (Expected Shortfall): average of the worst 1% of drawdowns
        cutoff_99 = np.percentile(max_dds_arr, 99)
        worst_1_pct_dds = max_dds_arr[max_dds_arr >= cutoff_99]
        cvar_99 = float(np.mean(worst_1_pct_dds)) if len(worst_1_pct_dds) > 0 else p95_max_dd

        median_eq = float(np.median(final_equities_arr))
        p5_eq = float(np.percentile(final_equities_arr, 5))
        p95_eq = float(np.percentile(final_equities_arr, 95))

        # Institutional Acceptance Evaluation:
        # 1. P(DD > 10%) < 1.0% (0.01)
        # 2. 95th Percentile Max DD <= 5.0%
        # 3. Probability of Ruin == 0.00%
        # 4. CVaR 99% <= 7.5%
        is_compliant = (
            prob_dd_over_10 < 0.01
            and p95_max_dd <= self.p95_dd_target_pct
            and prob_ruin == 0.00
            and cvar_99 <= self.cvar_threshold_pct
        )

        metrics = {
            "n_simulations": float(self.n_simulations),
            "prob_dd_exceeds_10_pct": round(prob_dd_over_10, 4),
            "percentile_95_max_dd": round(p95_max_dd, 2),
            "prob_ruin": round(prob_ruin, 4),
            "cvar_99_max_dd": round(cvar_99, 2),
            "median_max_dd": round(median_max_dd, 2),
            "median_final_equity": round(median_eq, 2),
            "percentile_5_final_equity": round(p5_eq, 2),
            "percentile_95_final_equity": round(p95_eq, 2),
        }

        return MonteCarloResult(
            n_simulations=self.n_simulations,
            prob_dd_exceeds_10_pct=prob_dd_over_10,
            percentile_95_max_dd=p95_max_dd,
            prob_ruin=prob_ruin,
            cvar_99_max_dd=cvar_99,
            median_max_dd=median_max_dd,
            median_final_equity=median_eq,
            percentile_5_final_equity=p5_eq,
            percentile_95_final_equity=p95_eq,
            is_compliant=is_compliant,
            summary_metrics=metrics,
            sample_equity_paths=stored_paths,
        )
