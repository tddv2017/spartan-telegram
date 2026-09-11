"""Spartan Quantitative Validation Framework - Macro News Event Stress Testing.

Simulates extreme liquidity disruptions during macroeconomic announcements:
- US CPI, Non-Farm Payrolls (NFP), FOMC Rate Decisions & Press Conferences.
- Injects 3x to 10x spread spikes.
- Penalizes stop-loss exits with 5 to 30 pip adverse slippage (0.5% - 2.0% for crypto).
- Simulates 1,000ms to 2,500ms execution re-quote / network latency delays.
- Verifies portfolio maximum drawdown remains strictly <= 5.0% under news shocks.
"""

from dataclasses import dataclass, field
import os
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd
import yaml

from quant_research.core.logger import get_logger

logger = get_logger("stress_testing")


@dataclass
class MacroEvent:
    """Historical macroeconomic announcement event."""
    timestamp: pd.Timestamp
    event_type: str  # "CPI", "NFP", "FOMC"
    impact: str  # "HIGH"
    description: str


@dataclass
class StressTestResult:
    """Evaluation summary of macroeconomic stress testing."""
    total_events_tested: int
    events_in_dataset: int
    baseline_max_drawdown_pct: float
    stressed_max_drawdown_pct: float
    drawdown_increase_pct: float
    is_compliant: bool
    spread_multiplier_applied: float
    slippage_pips_applied: float
    details: List[Dict[str, Any]] = field(default_factory=list)


class MacroStressTester:
    """Macroeconomic News Event Stress Testing Engine."""

    def __init__(
        self,
        config_path: Optional[str] = None,
        pre_event_window_minutes: int = 5,
        post_event_window_minutes: int = 30,
        spread_multiplier: float = 10.0,
        slippage_pips: float = 30.0,
        crypto_slippage_pct: float = 0.02,  # 2.0%
        latency_delay_ms: float = 2000.0,
    ) -> None:
        """
        Initialize Macro Stress Tester.

        Args:
            config_path: Optional path to news_calendar.yaml.
            pre_event_window_minutes: Minutes before news release to commence shock window.
            post_event_window_minutes: Minutes after release before spread/liquidity normalizes.
            spread_multiplier: Factor to multiply normal spread during shock (3.0 to 10.0x).
            slippage_pips: Adverse slippage applied to stops for Forex/Metals (5.0 to 30.0 pips).
            crypto_slippage_pct: Adverse slippage percentage for Crypto (0.5% to 2.0%).
            latency_delay_ms: Execution delay injected during shocks (1,000 to 2,500ms).
        """
        self.pre_window = pd.Timedelta(minutes=pre_event_window_minutes)
        self.post_window = pd.Timedelta(minutes=post_event_window_minutes)
        self.spread_multiplier = max(3.0, min(10.0, spread_multiplier))
        self.slippage_pips = max(5.0, min(30.0, slippage_pips))
        self.crypto_slippage_pct = max(0.005, min(0.02, crypto_slippage_pct))
        self.latency_delay_ms = latency_delay_ms
        self.events: List[MacroEvent] = []

        self._load_calendar(config_path)

    def _load_calendar(self, config_path: Optional[str] = None) -> None:
        """Load historical announcements from news_calendar.yaml."""
        if config_path is None:
            # Default to quant_research/config/news_calendar.yaml
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            config_path = os.path.join(base_dir, "config", "news_calendar.yaml")

        if not os.path.exists(config_path):
            logger.warning(f"News calendar file not found at {config_path}; using empty event list.")
            return

        try:
            with open(config_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)

            events_raw = data.get("events", [])
            for e in events_raw:
                ts = pd.Timestamp(e["date"])
                # Normalize to tz-naive UTC for consistent comparison
                if ts.tz is not None:
                    ts = ts.tz_convert("UTC").tz_localize(None)
                self.events.append(
                    MacroEvent(
                        timestamp=ts,
                        event_type=e.get("type", "NEWS"),
                        impact=e.get("impact", "HIGH"),
                        description=e.get("description", ""),
                    )
                )
            logger.info(f"Loaded {len(self.events)} macroeconomic events from {config_path}")
        except Exception as err:
            logger.error(f"Error loading news calendar: {err}")

    def is_in_stress_window(
        self,
        timestamp: Union[pd.Timestamp, str, datetime_type],
    ) -> Tuple[bool, Optional[MacroEvent]]:
        """
        Check if a given timestamp falls within [t_event - pre_window, t_event + post_window].

        Args:
            timestamp: Bar or tick timestamp.

        Returns:
            Tuple of (is_stressed: bool, triggering_event: Optional[MacroEvent])
        """
        ts = pd.Timestamp(timestamp)
        if ts.tz is not None:
            ts = ts.tz_convert("UTC").tz_localize(None)

        for event in self.events:
            w_start = event.timestamp - self.pre_window
            w_end = event.timestamp + self.post_window
            if w_start <= ts <= w_end:
                return True, event

        return False, None

    def inject_spread_spikes(
        self,
        df: pd.DataFrame,
        base_spread: float = 0.20,
    ) -> pd.DataFrame:
        """
        Produce a new DataFrame with spread values multiplied during news shock windows.

        Args:
            df: Historical bars DataFrame with 'timestamp' and 'spread' (or 'close').
            base_spread: Default spread if not present in columns.

        Returns:
            Modified DataFrame with spiked spreads.
        """
        stressed_df = df.copy()
        if "spread" not in stressed_df.columns:
            stressed_df["spread"] = base_spread

        timestamps = pd.to_datetime(stressed_df["timestamp"] if "timestamp" in stressed_df.columns else stressed_df.index)
        # Normalize timezone
        if hasattr(timestamps, "dt") and timestamps.dt.tz is not None:
            timestamps = timestamps.dt.tz_convert("UTC").dt.tz_localize(None)

        spreads = stressed_df["spread"].values.copy()
        for idx, ts in enumerate(timestamps):
            in_window, _ = self.is_in_stress_window(ts)
            if in_window:
                spreads[idx] = spreads[idx] * self.spread_multiplier

        stressed_df["spread"] = spreads
        return stressed_df

    def calculate_stressed_trade_pnl(
        self,
        trade: Dict[str, Any],
        asset_class: str = "metals",  # "metals", "forex", "crypto"
        pip_size: float = 0.1,  # $0.10 for gold
        contract_size: float = 100.0,
    ) -> Dict[str, Any]:
        """
        Penalize a trade that exited during a macro news shock with adverse slippage & latency.

        Args:
            trade: Trade record dict.
            asset_class: "metals", "forex", or "crypto".
            pip_size: Size of 1 pip for the asset.
            contract_size: Units per standard lot.

        Returns:
            Modified trade dictionary with stressed PnL and applied penalties.
        """
        exit_ts = trade.get("close_time") or trade.get("exit_time") or trade.get("timestamp")
        in_window, event = self.is_in_stress_window(exit_ts)

        stressed_trade = dict(trade)
        if not in_window:
            stressed_trade["stress_applied"] = False
            return stressed_trade

        # Apply adverse slippage penalty
        lots = float(trade.get("lots", 1.0))
        trade_type = str(trade.get("type", "BUY")).upper()
        original_pnl = float(trade.get("pnl", 0.0))

        if asset_class == "crypto":
            # Percentage penalty on notional exit price
            close_price = float(trade.get("closePrice") or trade.get("close_price", 1000.0))
            slippage_dollars = close_price * self.crypto_slippage_pct * lots
        else:
            # Pips converted to currency
            slippage_dollars = self.slippage_pips * pip_size * contract_size * lots

        stressed_pnl = original_pnl - slippage_dollars
        stressed_trade["pnl"] = round(stressed_pnl, 2)
        stressed_trade["stress_applied"] = True
        stressed_trade["slippage_penalty_dollars"] = round(slippage_dollars, 2)
        stressed_trade["stress_event"] = event.description if event else "MACRO_EVENT"
        stressed_trade["latency_injected_ms"] = self.latency_delay_ms

        return stressed_trade

    def evaluate_macro_stress_resilience(
        self,
        baseline_trades: List[Dict[str, Any]],
        initial_capital: float = 100000.0,
        asset_class: str = "metals",
        max_dd_limit_pct: float = 5.0,
    ) -> StressTestResult:
        """
        Apply macroeconomic stress across historical trades and evaluate Max Drawdown.

        Acceptance Rule: Max Drawdown must remain strictly <= 5.0% under stress.

        Args:
            baseline_trades: List of normal backtest trades.
            initial_capital: Portfolio initial capital.
            asset_class: Target asset class.
            max_dd_limit_pct: Maximum allowed drawdown threshold (5.0%).

        Returns:
            StressTestResult containing resilience assessment.
        """
        from quant_research.validation.metrics import QuantitativeMetrics

        baseline_metrics = QuantitativeMetrics.calculate_metrics(baseline_trades, initial_capital=initial_capital)
        baseline_mdd = baseline_metrics["max_drawdown_pct"]

        # Apply stress to each trade
        stressed_trades = []
        events_hit = 0
        details = []

        for t in baseline_trades:
            st = self.calculate_stressed_trade_pnl(t, asset_class=asset_class)
            if st.get("stress_applied", False):
                events_hit += 1
                details.append({
                    "event": st.get("stress_event"),
                    "penalty": st.get("slippage_penalty_dollars"),
                    "orig_pnl": t.get("pnl"),
                    "new_pnl": st.get("pnl"),
                })
            stressed_trades.append(st)

        stressed_metrics = QuantitativeMetrics.calculate_metrics(stressed_trades, initial_capital=initial_capital)
        stressed_mdd = stressed_metrics["max_drawdown_pct"]

        is_compliant = bool(stressed_mdd <= max_dd_limit_pct)

        return StressTestResult(
            total_events_tested=len(self.events),
            events_in_dataset=events_hit,
            baseline_max_drawdown_pct=baseline_mdd,
            stressed_max_drawdown_pct=stressed_mdd,
            drawdown_increase_pct=round(stressed_mdd - baseline_mdd, 2),
            is_compliant=is_compliant,
            spread_multiplier_applied=self.spread_multiplier,
            slippage_pips_applied=self.slippage_pips,
            details=details,
        )


datetime_type = Union[pd.Timestamp, str]
