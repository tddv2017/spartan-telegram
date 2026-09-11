"""Spartan Quantitative Trading System - Unified Risk Management Engine.

Implements:
    - IRiskEngine interface protocol matching PROJECT.md § Interface Contracts
    - Unified evaluation pipeline connecting:
        * KellyCalculator (Feature 11)
        * DrawdownGovernor (Feature 12)
        * StopOutCircuitBreaker (Feature 13)
        * Latency & Spread Tripwires (Feature 14)
        * Remote Admin Kill-Switch Bridge (Feature 15)
"""

from datetime import datetime, timezone
import os
import time
from typing import Any, Dict, List, Optional

from quant_research.core.constants import DrawdownTier
from quant_research.core.logger import get_logger
from quant_research.core.types import CircuitBreakerStatus, OrderDict, SignalDict
from quant_research.risk.circuit_breaker import CircuitBreakerSuite
from quant_research.risk.drawdown_governor import DrawdownGovernor
from quant_research.risk.kelly_calculator import KellyCalculator

logger = get_logger("risk_manager")


class SpartanRiskEngine:
    """Institutional Multi-Tier Risk Engine implementing IRiskEngine Protocol."""

    def __init__(
        self,
        config_path: Optional[str] = None,
        assets_path: Optional[str] = None,
        initial_equity: float = 100000.0,
    ) -> None:
        """Initialize all risk governance subsystems."""
        self.kelly_calc = KellyCalculator(config_path=config_path, assets_path=assets_path)
        self.drawdown_governor = DrawdownGovernor(initial_equity=initial_equity, config_path=config_path)
        self.circuit_breakers = CircuitBreakerSuite(config_path=config_path)

    def evaluate_order(
        self,
        signal: SignalDict,
        portfolio_equity: float,
        current_margin: float,
        free_margin: Optional[float] = None,
        current_spread: Optional[float] = None,
        win_rate: float = 0.60,
        payoff_ratio: float = 1.50,
    ) -> Optional[OrderDict]:
        """
        Evaluate an alpha model signal against the multi-tier risk architecture.

        Approval Pipeline:
            1. Remote Admin Kill-Switch Check
            2. Latency & Spread Anomaly Tripwire Check
            3. Stop-Out LTV 85% Headroom Check
            4. 4-Tier Drawdown Governor State Check
            5. Calibrated Fractional Kelly Sizing & Lot Clamping
            6. Margin Headroom Verification (<= 10% Free Margin)

        Args:
            signal: Alpha signal dictionary from quant models.
            portfolio_equity: Current total portfolio equity.
            current_margin: Total currently used margin.
            free_margin: Free available margin (calculated if None).
            current_spread: Current live spread (optional, for tripwire check).
            win_rate: Alpha model expected win rate.
            payoff_ratio: Alpha model expected win/loss payoff ratio.

        Returns:
            Approved OrderDict ready for execution, or None if rejected.
        """
        action = signal.get("action", "HOLD")
        symbol = signal.get("symbol", "").upper()

        # Rule 0: HOLD signals never produce orders
        if action == "HOLD":
            return None

        # Rule 1: CLOSE orders are defensive operations -> approved with top priority
        if action == "CLOSE":
            now_iso = datetime.now(timezone.utc).isoformat()
            magic = signal.get("magic_number", 888899)
            return OrderDict(
                order_id=f"SPARTAN_{magic}_{int(time.time() * 1000)}",
                ticket=None,
                symbol=symbol,
                action="CLOSE",
                order_type="MARKET",
                lots=float(signal.get("lots", 0.0)),
                price=float(signal.get("entry_price", 0.0)),
                stop_loss=float(signal.get("stop_loss", 0.0)),
                take_profit=float(signal.get("take_profit", 0.0)),
                magic_number=magic,
                comment=signal.get("comment", "SPARTAN_CLOSE_DEFENSIVE"),
                timestamp=now_iso,
            )

        # For BUY and SELL orders, run the complete institutional risk pipeline:

        # Step 1: Remote Kill Switch Check
        if not self.circuit_breakers.remote_kill.is_trading_allowed():
            logger.warning(f"Order rejected for {symbol}: Remote Kill-Switch active / RTDB disconnected.")
            return None

        # Step 2: Latency Tripwire Check
        if self.circuit_breakers.latency.is_tripped():
            logger.warning(f"Order rejected for {symbol}: Latency tripwire active (> 1500ms or 3 timeouts).")
            return None

        # Step 3: Spread Anomaly Tripwire Check
        if current_spread is not None:
            self.circuit_breakers.spread.update_spread(symbol, current_spread)
        if self.circuit_breakers.spread.is_spread_tripped(symbol):
            logger.warning(f"Order rejected for {symbol}: Spread anomaly tripwire active (> 3.5x EMA).")
            return None

        # Step 4: Stop-Out LTV 85% Check
        ltv = self.circuit_breakers.stop_out.calculate_ltv(portfolio_equity, current_margin)
        if ltv >= (self.circuit_breakers.stop_out.max_margin_utilization * 100.0):
            logger.warning(f"Order rejected for {symbol}: LTV={ltv:.2f}% exceeds 85.0% threshold.")
            return None

        # Step 5: 4-Tier Drawdown Governor Check
        dd_state = self.drawdown_governor.update_equity(portfolio_equity)
        if not dd_state.allow_new_trades:
            logger.warning(
                f"Order rejected for {symbol}: Drawdown Governor in {dd_state.tier} "
                f"(DD={dd_state.drawdown_pct:.2f}%). Reason: {dd_state.reason}"
            )
            return None

        # Step 6: Position Sizing & Margin Headroom via Kelly Calculator
        avail_free_margin = (
            float(free_margin)
            if free_margin is not None
            else max(0.0, float(portfolio_equity) - float(current_margin))
        )

        entry_price = float(signal.get("entry_price", 0.0))
        stop_loss = float(signal.get("stop_loss", 0.0))

        sizing_res = self.kelly_calc.evaluate_position_sizing(
            symbol=symbol,
            equity=portfolio_equity,
            free_margin=avail_free_margin,
            entry_price=entry_price,
            stop_loss=stop_loss,
            win_rate=win_rate,
            payoff_ratio=payoff_ratio,
            risk_multiplier=dd_state.risk_multiplier,
        )

        if not sizing_res["approved"]:
            logger.warning(f"Order rejected for {symbol} by Kelly Calculator: {sizing_res['reason']}.")
            return None

        # Step 7: Construct approved OrderDict
        lots = float(sizing_res["lots"])
        magic = int(signal.get("magic_number", 888899))
        now_iso = datetime.now(timezone.utc).isoformat()

        approved_order: OrderDict = {
            "order_id": f"SPARTAN_{magic}_{int(time.time() * 1000)}",
            "ticket": None,
            "symbol": symbol,
            "action": action,
            "order_type": "MARKET",
            "lots": lots,
            "price": entry_price,
            "stop_loss": stop_loss,
            "take_profit": float(signal.get("take_profit", 0.0)),
            "magic_number": magic,
            "comment": signal.get("comment", f"SPARTAN_RISK_APPROVED_{dd_state.tier.value if hasattr(dd_state.tier, 'value') else dd_state.tier}"),
            "timestamp": now_iso,
        }

        logger.info(
            f"ORDER APPROVED: {action} {lots} lots {symbol} @ {entry_price:.5f} | "
            f"Risk: {sizing_res['risk_fraction']*100:.3f}% (${sizing_res['cash_risk']:.2f}) | "
            f"Governor: {dd_state.tier}"
        )
        return approved_order

    def check_circuit_breaker(
        self,
        equity: float,
        balance: float,
        used_margin: float,
        latency_ms: float = 0.0,
        open_positions: Optional[List[Dict[str, Any]]] = None,
    ) -> CircuitBreakerStatus:
        """
        Evaluate overall circuit breaker status across all multi-tier risk dimensions.

        Args:
            equity: Account equity.
            balance: Account balance.
            used_margin: Account used margin.
            latency_ms: Latest observed execution roundtrip ping in milliseconds.
            open_positions: Optional list of open positions for de-leveraging assessment.

        Returns:
            CircuitBreakerStatus contract matching quant_research/core/types.py.
        """
        eq = float(equity)
        margin = float(used_margin)

        # 1. Update Drawdown Governor
        dd_state = self.drawdown_governor.update_equity(eq)

        # 2. Record latency if ping provided
        if latency_ms > 0.0:
            self.circuit_breakers.latency.record_ping(latency_ms)

        # 3. Calculate LTV & Margin Level
        ltv = self.circuit_breakers.stop_out.calculate_ltv(eq, margin)

        # Check Critical Conditions in Order of Severity:

        # Priority 1: Tier 4 Drawdown Governor Breach (Emergency Kill-Switch)
        if dd_state.tier == DrawdownTier.TIER_4_CIRCUIT_BREAKER or self.drawdown_governor.is_circuit_breaker_tripped:
            return CircuitBreakerStatus(
                is_triggered=True,
                tier=DrawdownTier.TIER_4_CIRCUIT_BREAKER,
                current_drawdown_pct=dd_state.drawdown_pct,
                margin_utilization_ltv=ltv,
                reason=dd_state.reason,
                action="CIRCUIT_BREAKER_KILL_SWITCH",
            )

        # Priority 2: Broker Stop-Out Cushion Breach (Instant Flatten)
        if self.circuit_breakers.stop_out.check_broker_cushion_breach(eq, margin):
            return CircuitBreakerStatus(
                is_triggered=True,
                tier=dd_state.tier,
                current_drawdown_pct=dd_state.drawdown_pct,
                margin_utilization_ltv=ltv,
                reason="BROKER_STOPOUT_CUSHION_BREACHED",
                action="EMERGENCY_FLATTEN",
            )

        # Priority 3: Stop-Out LTV >= 85.0% (Graceful De-leveraging)
        if ltv >= (self.circuit_breakers.stop_out.max_margin_utilization * 100.0):
            return CircuitBreakerStatus(
                is_triggered=True,
                tier=dd_state.tier,
                current_drawdown_pct=dd_state.drawdown_pct,
                margin_utilization_ltv=ltv,
                reason=f"STOP_OUT_LTV_EXCEEDED: LTV={ltv:.2f}% >= 85%",
                action="EMERGENCY_DELEVERAGE",
            )

        # Priority 4: Latency Tripwire Active (> 1,500ms)
        if self.circuit_breakers.latency.is_tripped():
            return CircuitBreakerStatus(
                is_triggered=True,
                tier=dd_state.tier,
                current_drawdown_pct=dd_state.drawdown_pct,
                margin_utilization_ltv=ltv,
                reason=self.circuit_breakers.latency.last_trip_reason,
                action="HALT_NEW_ENTRIES",
            )

        # Priority 5: Remote Admin Kill-Switch Active
        if not self.circuit_breakers.remote_kill.is_trading_allowed():
            return CircuitBreakerStatus(
                is_triggered=True,
                tier=dd_state.tier,
                current_drawdown_pct=dd_state.drawdown_pct,
                margin_utilization_ltv=ltv,
                reason="REMOTE_ADMIN_KILL_SWITCH_ACTIVE",
                action="LOCK_EXECUTION",
            )

        # Priority 6: Tier 3 Hard Freeze
        if dd_state.tier == DrawdownTier.TIER_3_HARD_FREEZE:
            return CircuitBreakerStatus(
                is_triggered=False,
                tier=DrawdownTier.TIER_3_HARD_FREEZE,
                current_drawdown_pct=dd_state.drawdown_pct,
                margin_utilization_ltv=ltv,
                reason=dd_state.reason,
                action="HARD_FREEZE",
            )

        # Priority 7: Tier 2 Soft Throttle
        if dd_state.tier == DrawdownTier.TIER_2_SOFT_THROTTLE:
            return CircuitBreakerStatus(
                is_triggered=False,
                tier=DrawdownTier.TIER_2_SOFT_THROTTLE,
                current_drawdown_pct=dd_state.drawdown_pct,
                margin_utilization_ltv=ltv,
                reason=dd_state.reason,
                action="SOFT_THROTTLE",
            )

        # Normal State: Tier 1
        return CircuitBreakerStatus(
            is_triggered=False,
            tier=DrawdownTier.TIER_1_NORMAL,
            current_drawdown_pct=dd_state.drawdown_pct,
            margin_utilization_ltv=ltv,
            reason="NORMAL_OPERATION",
            action="NORMAL_OPERATION",
        )
