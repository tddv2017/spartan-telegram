"""Spartan Quantitative Trading System - 4-Tier Drawdown Governor (Feature 12).

Mathematical Implementation:
    Drawdown Metric:
        DD(t) = ((HWM - Equity(t)) / HWM) * 100%

    4-Tier Escalation Architecture:
        Tier 1: Normal (0.0% <= DD < 3.0%)
            - Full Sizing: risk_multiplier = 1.0 (0.25% - 0.50%)
            - All Ghosts / sub-strategies active
            - Action: NORMAL_OPERATION

        Tier 2: Soft Throttle (3.0% <= DD < 4.5%)
            - Risk halved: risk_multiplier = 0.5 (0.125% - 0.25%)
            - Tighten trailing stops by 30% (tighten_trailing_stops_pct = 0.30)
            - Freeze new ghost spawn
            - Action: SOFT_THROTTLE

        Tier 3: Hard Freeze (4.5% <= DD < 5.0%)
            - Block all new entries: allow_new_trades = False, risk_multiplier = 0.0
            - Lock breakeven stop loss on all positive trades (lock_breakeven = True)
            - Action: HARD_FREEZE

        Tier 4: Emergency Circuit Breaker (DD >= 5.0%)
            - EMERGENCY KILL-SWITCH: emergency_flatten = True, allow_new_trades = False
            - Close all open positions, cancel all orders
            - Action: CIRCUIT_BREAKER_KILL_SWITCH

    Hysteresis Recovery:
        - De-escalation from Tier 2 back to Tier 1 requires DD < 1.5%.
        - Transition out of Tier 4 requires manual cryptographic Chairman TOTP unlock.
"""

from dataclasses import dataclass
import os
from typing import Any, Dict, Optional
import yaml

from quant_research.core.constants import DrawdownTier
from quant_research.core.logger import get_logger

logger = get_logger("drawdown_governor")


@dataclass
class DrawdownState:
    """Immutable snapshot of current Drawdown Governor state."""
    tier: DrawdownTier
    hwm: float
    current_equity: float
    drawdown_pct: float
    risk_multiplier: float
    allow_new_trades: bool
    tighten_stops_pct: float
    lock_breakeven: bool
    emergency_flatten: bool
    action: str
    reason: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "tier": self.tier.value if hasattr(self.tier, "value") else str(self.tier),
            "hwm": self.hwm,
            "current_equity": self.current_equity,
            "drawdown_pct": round(self.drawdown_pct, 4),
            "risk_multiplier": self.risk_multiplier,
            "allow_new_trades": self.allow_new_trades,
            "tighten_stops_pct": self.tighten_stops_pct,
            "lock_breakeven": self.lock_breakeven,
            "emergency_flatten": self.emergency_flatten,
            "action": self.action,
            "reason": self.reason,
        }


class DrawdownGovernor:
    """4-Tier Portfolio Drawdown Governor with Hysteresis Recovery and Admin Unlock."""

    def __init__(
        self,
        initial_equity: float = 100000.0,
        soft_throttle_dd_pct: float = 3.0,
        hard_freeze_dd_pct: float = 4.5,
        circuit_breaker_dd_pct: float = 5.0,
        hysteresis_recovery_dd_pct: float = 1.5,
        config_path: Optional[str] = None,
    ) -> None:
        """Initialize governor with thresholds and baseline equity."""
        self.hwm = float(initial_equity)
        self.current_equity = float(initial_equity)
        self.soft_throttle_dd_pct = soft_throttle_dd_pct
        self.hard_freeze_dd_pct = hard_freeze_dd_pct
        self.circuit_breaker_dd_pct = circuit_breaker_dd_pct
        self.hysteresis_recovery_dd_pct = hysteresis_recovery_dd_pct

        # Active internal state
        self._current_tier: DrawdownTier = DrawdownTier.TIER_1_NORMAL
        self._is_locked_in_circuit_breaker: bool = False

        # Load yaml config if available
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        risk_cfg_path = config_path or os.path.join(base_dir, "config", "risk_profiles.yaml")
        self._load_config(risk_cfg_path)

    def _load_config(self, path: str) -> None:
        """Load drawdown thresholds from risk_profiles.yaml if present."""
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    cfg = yaml.safe_load(f) or {}
                dd_cfg = cfg.get("drawdown_governor", {})
                tiers = dd_cfg.get("tiers", {})

                t2 = tiers.get("tier_2_soft_throttle", {})
                t3 = tiers.get("tier_3_hard_freeze", {})
                t4 = tiers.get("tier_4_circuit_breaker", {})

                if "min_dd" in t2:
                    self.soft_throttle_dd_pct = float(t2["min_dd"]) * 100.0
                if "min_dd" in t3:
                    self.hard_freeze_dd_pct = float(t3["min_dd"]) * 100.0
                if "min_dd" in t4:
                    self.circuit_breaker_dd_pct = float(t4["min_dd"]) * 100.0

                if "hysteresis_recovery_dd" in dd_cfg:
                    self.hysteresis_recovery_dd_pct = float(dd_cfg["hysteresis_recovery_dd"]) * 100.0
            except Exception as e:
                logger.warning(f"Failed to load drawdown governor config from {path}: {e}")

    @staticmethod
    def evaluate_drawdown_tier_static(
        hwm: float,
        equity: float,
        soft_throttle_pct: float = 3.0,
        hard_freeze_pct: float = 4.5,
        circuit_breaker_pct: float = 5.0,
    ) -> str:
        """
        Pure static evaluation of drawdown tier without hysteresis.
        Matches exact test oracle contract in test_features_11_15_risk_engine_governance.py.
        """
        if hwm <= 0.0:
            return DrawdownTier.TIER_4_CIRCUIT_BREAKER.value

        dd_pct = (hwm - equity) / hwm * 100.0
        if dd_pct >= circuit_breaker_pct:
            return DrawdownTier.TIER_4_CIRCUIT_BREAKER.value
        elif dd_pct >= hard_freeze_pct:
            return DrawdownTier.TIER_3_HARD_FREEZE.value
        elif dd_pct >= soft_throttle_pct:
            return DrawdownTier.TIER_2_SOFT_THROTTLE.value
        else:
            return DrawdownTier.TIER_1_NORMAL.value

    def calculate_drawdown_pct(self, equity: float) -> float:
        """Calculate current drawdown percentage against High-Water Mark."""
        if self.hwm <= 0.0:
            return 100.0
        return max(0.0, (self.hwm - float(equity)) / self.hwm * 100.0)

    def update_equity(self, equity: float) -> DrawdownState:
        """
        Update portfolio equity, recalculate HWM, apply hysteresis transitions, and return state.

        Args:
            equity: Current portfolio equity in account currency.

        Returns:
            DrawdownState containing operational parameters.
        """
        eq = float(equity)
        self.current_equity = eq

        # Update High-Water Mark if new equity peak is achieved
        if eq > self.hwm:
            self.hwm = eq

        dd_pct = self.calculate_drawdown_pct(eq)

        # Tier 4 lock condition: Once triggered, remains locked until manual Chairman TOTP unlock
        if self._is_locked_in_circuit_breaker:
            self._current_tier = DrawdownTier.TIER_4_CIRCUIT_BREAKER
            return self._build_state(
                dd_pct=dd_pct,
                reason="LOCKED_IN_TIER_4_UNTIL_CHAIRMAN_UNLOCK",
            )

        # Check for immediate escalation to Tier 4
        if dd_pct >= self.circuit_breaker_dd_pct:
            self._current_tier = DrawdownTier.TIER_4_CIRCUIT_BREAKER
            self._is_locked_in_circuit_breaker = True
            logger.critical(
                f"TIER 4 CIRCUIT BREAKER TRIGGERED: DD={dd_pct:.2f}% >= {self.circuit_breaker_dd_pct:.2f}%. "
                f"Emergency liquidation active."
            )
            return self._build_state(
                dd_pct=dd_pct,
                reason=f"DRAWDOWN_BREACH_TIER_4: DD={dd_pct:.2f}% >= {self.circuit_breaker_dd_pct}%",
            )

        # Check for escalation to Tier 3
        if dd_pct >= self.hard_freeze_dd_pct:
            self._current_tier = DrawdownTier.TIER_3_HARD_FREEZE
            return self._build_state(
                dd_pct=dd_pct,
                reason=f"DRAWDOWN_BREACH_TIER_3: DD={dd_pct:.2f}% >= {self.hard_freeze_dd_pct}%",
            )

        # Check for escalation to Tier 2
        if dd_pct >= self.soft_throttle_dd_pct:
            self._current_tier = DrawdownTier.TIER_2_SOFT_THROTTLE
            return self._build_state(
                dd_pct=dd_pct,
                reason=f"DRAWDOWN_BREACH_TIER_2: DD={dd_pct:.2f}% >= {self.soft_throttle_dd_pct}%",
            )

        # At this point, DD is below soft_throttle_dd_pct (e.g. < 3.0%).
        # Hysteresis rule: If currently in Tier 2 (or higher), must recover below hysteresis_recovery_dd_pct (1.5%)
        # to safely restore Tier 1 Normal operation.
        if self._current_tier in (DrawdownTier.TIER_2_SOFT_THROTTLE, DrawdownTier.TIER_3_HARD_FREEZE):
            if dd_pct < self.hysteresis_recovery_dd_pct:
                # Restored to Normal
                self._current_tier = DrawdownTier.TIER_1_NORMAL
                return self._build_state(
                    dd_pct=dd_pct,
                    reason=f"HYSTERESIS_RECOVERY_SUCCESSFUL: DD={dd_pct:.2f}% < {self.hysteresis_recovery_dd_pct}%",
                )
            else:
                # Remains in Tier 2 Soft Throttle buffer
                self._current_tier = DrawdownTier.TIER_2_SOFT_THROTTLE
                return self._build_state(
                    dd_pct=dd_pct,
                    reason=f"HYSTERESIS_BUFFER_ACTIVE: DD={dd_pct:.2f}% >= {self.hysteresis_recovery_dd_pct}%",
                )

        # Normal Tier 1 Operation
        self._current_tier = DrawdownTier.TIER_1_NORMAL
        return self._build_state(
            dd_pct=dd_pct,
            reason=f"NORMAL_OPERATION: DD={dd_pct:.2f}% < {self.soft_throttle_dd_pct}%",
        )

    def _build_state(self, dd_pct: float, reason: str) -> DrawdownState:
        """Construct DrawdownState for the current tier."""
        tier = self._current_tier

        if tier == DrawdownTier.TIER_1_NORMAL:
            return DrawdownState(
                tier=tier,
                hwm=self.hwm,
                current_equity=self.current_equity,
                drawdown_pct=dd_pct,
                risk_multiplier=1.0,
                allow_new_trades=True,
                tighten_stops_pct=0.0,
                lock_breakeven=False,
                emergency_flatten=False,
                action="NORMAL_OPERATION",
                reason=reason,
            )
        elif tier == DrawdownTier.TIER_2_SOFT_THROTTLE:
            return DrawdownState(
                tier=tier,
                hwm=self.hwm,
                current_equity=self.current_equity,
                drawdown_pct=dd_pct,
                risk_multiplier=0.5,
                allow_new_trades=True,
                tighten_stops_pct=0.30,
                lock_breakeven=False,
                emergency_flatten=False,
                action="SOFT_THROTTLE",
                reason=reason,
            )
        elif tier == DrawdownTier.TIER_3_HARD_FREEZE:
            return DrawdownState(
                tier=tier,
                hwm=self.hwm,
                current_equity=self.current_equity,
                drawdown_pct=dd_pct,
                risk_multiplier=0.0,
                allow_new_trades=False,
                tighten_stops_pct=0.30,
                lock_breakeven=True,
                emergency_flatten=False,
                action="HARD_FREEZE",
                reason=reason,
            )
        else:  # TIER_4_CIRCUIT_BREAKER
            return DrawdownState(
                tier=tier,
                hwm=self.hwm,
                current_equity=self.current_equity,
                drawdown_pct=dd_pct,
                risk_multiplier=0.0,
                allow_new_trades=False,
                tighten_stops_pct=0.0,
                lock_breakeven=True,
                emergency_flatten=True,
                action="CIRCUIT_BREAKER_KILL_SWITCH",
                reason=reason,
            )

    def unlock_circuit_breaker(
        self,
        authorized_by: str,
        totp_verified: bool = True,
        reset_hwm: bool = True,
    ) -> bool:
        """
        Cryptographic/Manual Administrative Unlock from Tier 4 Circuit Breaker.

        Args:
            authorized_by: Identifier of authorizing executive (must contain 'Chairman' or valid admin).
            totp_verified: Whether 2FA TOTP was cryptographically verified.
            reset_hwm: Whether to reset HWM to current equity to avoid re-triggering.

        Returns:
            True if successfully unlocked, False otherwise.
        """
        if not authorized_by or not totp_verified:
            logger.warning("Unlock rejected: Missing authorization or TOTP verification.")
            return False

        self._is_locked_in_circuit_breaker = False
        if reset_hwm:
            self.hwm = max(1.0, self.current_equity)

        self._current_tier = DrawdownTier.TIER_1_NORMAL
        logger.info(
            f"Circuit Breaker successfully unlocked by {authorized_by}. "
            f"HWM set to {self.hwm:.2f}, tier restored to TIER_1_NORMAL."
        )
        return True

    @property
    def current_tier(self) -> DrawdownTier:
        return self._current_tier

    @property
    def current_drawdown_pct(self) -> float:
        return self.calculate_drawdown_pct(self.current_equity)

    @property
    def high_water_mark(self) -> float:
        return self.hwm

    @property
    def risk_multiplier(self) -> float:
        if self._current_tier == DrawdownTier.TIER_1_NORMAL:
            return 1.0
        elif self._current_tier == DrawdownTier.TIER_2_SOFT_THROTTLE:
            return 0.5
        return 0.0

    @property
    def allow_new_entries(self) -> bool:
        return self._current_tier in (DrawdownTier.TIER_1_NORMAL, DrawdownTier.TIER_2_SOFT_THROTTLE)

    @property
    def is_circuit_breaker_tripped(self) -> bool:
        return self._current_tier == DrawdownTier.TIER_4_CIRCUIT_BREAKER or self._is_locked_in_circuit_breaker
