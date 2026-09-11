"""Spartan Quantitative Validation & Stress-Testing Framework.

Modules:
    - BacktestEngine: Event-driven simulator with ticks, bid/ask spreads, commissions, swap, slippage.
    - PurgedTimeSeriesSplitter: Purged & Embargoed 60/20/20 temporal partitioner.
    - WalkForwardOptimizer: Rolling 6m/2m WFO and Walk-Forward Efficiency (WFE >= 60%).
    - MonteCarloSimulator: 1,000+ run bootstrap simulator with replacement and jitter.
    - MacroStressTester: CPI, NFP, FOMC news shock injector with spread spikes & adverse slippage.
    - QuantitativeMetrics: Exact calculation of Sharpe, Sortino, Calmar, Recovery, Profit Factor, WR, RR, MDD.
    - ValidationReportGenerator: Dark-Gold luxury HTML dashboard and executive Markdown generator.
"""

from quant_research.validation.backtest_engine import BacktestEngine, BacktestResult, Position
from quant_research.validation.metrics import QuantitativeMetrics
from quant_research.validation.monte_carlo import MonteCarloResult, MonteCarloSimulator
from quant_research.validation.oos_split import PurgedTimeSeriesSplitter
from quant_research.validation.report_generator import ValidationReportGenerator
from quant_research.validation.stress_testing import MacroEvent, MacroStressTester, StressTestResult
from quant_research.validation.walk_forward import WFOWindow, WFOResult, WalkForwardOptimizer

__all__ = [
    "BacktestEngine",
    "BacktestResult",
    "Position",
    "QuantitativeMetrics",
    "MonteCarloSimulator",
    "MonteCarloResult",
    "PurgedTimeSeriesSplitter",
    "WalkForwardOptimizer",
    "WFOWindow",
    "WFOResult",
    "MacroStressTester",
    "MacroEvent",
    "StressTestResult",
    "ValidationReportGenerator",
]
