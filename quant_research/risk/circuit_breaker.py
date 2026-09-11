"""Spartan Quantitative Trading System - Institutional Circuit Breakers (Features 13, 14, 15).

Components:
    1. Stop-Out LTV 85% Circuit Breaker (Feature 13):
        - Margin Utilization LTV = (Used Margin / Equity) * 100%
        - Margin Level = (Equity / Used Margin) * 100% (85% LTV <=> 117.65% Margin Level)
        - Triggers Graceful Emergency De-leveraging: sequentially closes open positions
          with highest margin burden until LTV < 50.0%.
        - Broker Stop-Out Cushion Guard: If Margin Level is within 20% cushion of
          broker stop-out (30% on Exness -> <= 36.0%), instant market-flatten across all positions.

    2. Latency & Execution Anomaly Tripwire (Feature 14):
        - Execution roundtrip ping > 1,500ms or 3 consecutive timeouts.
        - Halts new order entries for 15 minutes.
        - Tightens existing stops to lock profit.

    3. Spread Anomaly Tripwire (Feature 14):
        - Computes rolling EMA(Spread, 100).
        - If Spread > 3.5 * EMA(Spread), blocks new orders.
        - Enforces cooling-off period of >= 3 consecutive normalized bars (Spread <= 2.0 * EMA).

    4. Remote Admin Kill-Switch Bridge (Feature 15):
        - Synchronizes with Spartan RTDB system_config.globalBotActive.
        - Disconnect grace period: If remote heartbeat fails for > 60s, defaults to defensive mode.
"""

from dataclasses import dataclass, field
import os
import time
from typing import Any, Dict, List, Optional, Tuple
import yaml

from quant_research.core.logger import get_logger

logger = get_logger("circuit_breaker")


# ============================================================================
# 1. STOP-OUT LTV 85% CIRCUIT BREAKER (Feature 13)
# ============================================================================
class StopOutCircuitBreaker:
    """Margin Stress Guard and Graceful Emergency De-leveraging."""

    def __init__(
        self,
        max_margin_utilization: float = 0.85,
        target_recovery_utilization: float = 0.50,
        broker_stopout_level: float = 30.0,
        cushion_pct: float = 0.20,
    ) -> None:
        self.max_margin_utilization = max_margin_utilization  # 85% LTV
        self.target_recovery_utilization = target_recovery_utilization  # 50% LTV
        self.broker_stopout_level = broker_stopout_level  # 30% margin level
        self.cushion_pct = cushion_pct  # 20% cushion -> <= 36.0% margin level

    @staticmethod
    def calculate_ltv(equity: float, used_margin: float) -> float:
        """Calculate Margin Utilization (LTV) in percentage (0.0 to 100.0+)."""
        if equity <= 0.0:
            return 100.0 if used_margin > 0.0 else 0.0
        return (used_margin / equity) * 100.0

    @staticmethod
    def calculate_margin_level(equity: float, used_margin: float) -> float:
        """Calculate Margin Level in percentage (Equity / Used Margin * 100)."""
        if used_margin <= 0.0:
            return float("inf")
        return (equity / used_margin) * 100.0

    def check_broker_cushion_breach(self, equity: float, used_margin: float) -> bool:
        """
        Check if Margin Level is within critical cushion of broker stop-out.
        E.g., broker stop-out 30% * 1.20 = 36.0%.
        """
        if used_margin <= 0.0:
            return False
        ml = self.calculate_margin_level(equity, used_margin)
        critical_threshold = self.broker_stopout_level * (1.0 + self.cushion_pct)
        return ml <= critical_threshold

    def evaluate_deleveraging(
        self,
        equity: float,
        used_margin: float,
        positions: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Evaluate account margin state and execute emergency de-leveraging if required.

        Args:
            equity: Account equity.
            used_margin: Total currently used margin.
            positions: List of open positions, each containing 'ticket' and 'margin'.

        Returns:
            Dict containing:
                triggered: bool
                action: "NORMAL" | "EMERGENCY_DELEVERAGE" | "EMERGENCY_FLATTEN"
                reason: str
                tickets_to_close: List[Any]
                force_market: bool
                new_ltv: float
        """
        ltv_pct = self.calculate_ltv(equity, used_margin)

        # Critical Check 1: Broker Stop-Out Cushion Breach -> Instant Market Flatten
        if self.check_broker_cushion_breach(equity, used_margin):
            all_tickets = [p.get("ticket") for p in positions if p.get("ticket") is not None]
            logger.critical(
                f"STOP-OUT CUSHION BREACHED! Margin Level: {self.calculate_margin_level(equity, used_margin):.2f}% "
                f"<= {self.broker_stopout_level * (1 + self.cushion_pct):.2f}%. Executing emergency flatten."
            )
            return {
                "triggered": True,
                "action": "EMERGENCY_FLATTEN",
                "reason": "BROKER_STOPOUT_CUSHION_BREACHED",
                "tickets_to_close": all_tickets,
                "force_market": True,
                "new_ltv": 0.0,
            }

        # Check 2: LTV >= 85.0% -> Graceful Emergency De-leveraging to < 50%
        if ltv_pct >= (self.max_margin_utilization * 100.0):
            target_margin = equity * self.target_recovery_utilization
            # Sort positions in descending order of margin burden
            sorted_positions = sorted(
                positions,
                key=lambda p: float(p.get("margin", p.get("used_margin", 0.0))),
                reverse=True,
            )

            tickets_to_close: List[Any] = []
            running_margin = used_margin

            for pos in sorted_positions:
                pos_margin = float(pos.get("margin", pos.get("used_margin", 0.0)))
                ticket = pos.get("ticket")
                if ticket is not None:
                    tickets_to_close.append(ticket)
                    running_margin -= pos_margin
                    # Check if target reached (< 50% LTV)
                    current_ltv = (running_margin / equity) * 100.0 if equity > 0 else 0.0
                    if current_ltv < (self.target_recovery_utilization * 100.0):
                        break

            new_ltv = (running_margin / equity) * 100.0 if equity > 0 else 0.0
            logger.warning(
                f"STOP-OUT LTV TRIGGERED: LTV={ltv_pct:.2f}% >= {self.max_margin_utilization * 100}%. "
                f"De-leveraging {len(tickets_to_close)} positions. Resulting LTV={new_ltv:.2f}%."
            )

            return {
                "triggered": True,
                "action": "EMERGENCY_DELEVERAGE",
                "reason": "LTV_EXCEEDED_85_PCT",
                "tickets_to_close": tickets_to_close,
                "force_market": True,
                "new_ltv": round(new_ltv, 2),
            }

        # Normal operation: LTV safe
        return {
            "triggered": False,
            "action": "NORMAL",
            "reason": "MARGIN_UTILIZATION_SAFE",
            "tickets_to_close": [],
            "force_market": False,
            "new_ltv": round(ltv_pct, 2),
        }


# ============================================================================
# 2. LATENCY TRIPWIRE (Feature 14)
# ============================================================================
class LatencyTripwire:
    """Execution latency tripwire protecting against broker slippage and timeout storms."""

    def __init__(
        self,
        max_latency_ms: float = 1500.0,
        max_consecutive_timeouts: int = 3,
        halt_duration_minutes: int = 15,
    ) -> None:
        self.max_latency_ms = max_latency_ms
        self.max_consecutive_timeouts = max_consecutive_timeouts
        self.halt_duration_seconds = halt_duration_minutes * 60.0
        self.consecutive_timeouts: int = 0
        self.halt_until_timestamp: float = 0.0
        self.last_trip_reason: str = ""

    def record_ping(
        self,
        ping_ms: float,
        is_timeout: bool = False,
        current_time: Optional[float] = None,
    ) -> bool:
        """
        Record execution roundtrip latency or timeout.

        Returns:
            True if tripwire was tripped by this ping, False otherwise.
        """
        now = current_time if current_time is not None else time.time()

        if is_timeout:
            self.consecutive_timeouts += 1
        else:
            if ping_ms <= self.max_latency_ms:
                self.consecutive_timeouts = 0

        # Check conditions
        if is_timeout and self.consecutive_timeouts >= self.max_consecutive_timeouts:
            self.halt_until_timestamp = now + self.halt_duration_seconds
            self.last_trip_reason = f"CONSECUTIVE_TIMEOUTS_EXCEEDED_{self.consecutive_timeouts}"
            logger.error(f"Latency Tripwire TRIPPED: {self.last_trip_reason}. Halting entries for 15m.")
            return True

        if ping_ms > self.max_latency_ms:
            self.halt_until_timestamp = now + self.halt_duration_seconds
            self.last_trip_reason = f"LATENCY_SPIKE_{ping_ms:.1f}MS_EXCEEDS_{self.max_latency_ms:.1f}MS"
            logger.error(f"Latency Tripwire TRIPPED: {self.last_trip_reason}. Halting entries for 15m.")
            return True

        return False

    def is_tripped(self, current_time: Optional[float] = None) -> bool:
        """Check if latency halt is currently active."""
        now = current_time if current_time is not None else time.time()
        return now < self.halt_until_timestamp

    def get_tripwire_action(self, current_time: Optional[float] = None) -> Dict[str, Any]:
        """Return defensive action package when tripped."""
        now = current_time if current_time is not None else time.time()
        tripped = self.is_tripped(now)
        remaining_sec = max(0.0, self.halt_until_timestamp - now)
        return {
            "halt_new_entries": tripped,
            "tighten_existing_stops": tripped,
            "duration_minutes": int(self.halt_duration_seconds / 60.0),
            "remaining_seconds": round(remaining_sec, 1),
            "reason": self.last_trip_reason if tripped else "",
        }

    def reset(self) -> None:
        """Manually clear latency tripwire."""
        self.consecutive_timeouts = 0
        self.halt_until_timestamp = 0.0
        self.last_trip_reason = ""


# ============================================================================
# 3. SPREAD ANOMALY TRIPWIRE (Feature 14)
# ============================================================================
class SpreadTripwire:
    """Spread spike anomaly tripwire tracking rolling EMA(Spread, 100)."""

    def __init__(
        self,
        max_spread_multiplier: float = 3.5,
        ema_period: int = 100,
        cooling_bars_required: int = 3,
    ) -> None:
        self.max_spread_multiplier = max_spread_multiplier
        self.ema_alpha = 2.0 / (ema_period + 1.0)
        self.cooling_bars_required = cooling_bars_required

        self.ema_spreads: Dict[str, float] = {}
        self.tripped_symbols: Dict[str, bool] = {}
        self.cooling_counters: Dict[str, int] = {}

    def update_spread(self, symbol: str, current_spread: float) -> bool:
        """
        Update spread for symbol, update EMA, evaluate tripwire and cooling counters.

        Returns:
            True if symbol is currently tripped (entry blocked), False otherwise.
        """
        sym = symbol.upper()
        spread = max(0.0, float(current_spread))

        # Update or initialize EMA
        if sym not in self.ema_spreads:
            self.ema_spreads[sym] = spread
            self.tripped_symbols[sym] = False
            self.cooling_counters[sym] = 0
            return False

        current_ema = self.ema_spreads[sym]
        # Exponential moving average update
        new_ema = (spread * self.ema_alpha) + (current_ema * (1.0 - self.ema_alpha))
        self.ema_spreads[sym] = new_ema

        threshold = current_ema * self.max_spread_multiplier

        # Spike detection
        if spread > threshold:
            self.tripped_symbols[sym] = True
            self.cooling_counters[sym] = 0
            logger.warning(
                f"Spread Tripwire TRIPPED for {sym}: Spread={spread:.5f} > "
                f"3.5x EMA ({threshold:.5f}). Entries blocked."
            )
            return True

        # Cooling-off check if currently tripped
        if self.tripped_symbols.get(sym, False):
            # Normalization condition: spread <= 2.0 * EMA
            if spread <= (current_ema * 2.0):
                self.cooling_counters[sym] = self.cooling_counters.get(sym, 0) + 1
                if self.cooling_counters[sym] >= self.cooling_bars_required:
                    self.tripped_symbols[sym] = False
                    logger.info(f"Spread normalized for {sym} after {self.cooling_bars_required} bars. Unlocked.")
            else:
                self.cooling_counters[sym] = 0

        return self.tripped_symbols.get(sym, False)

    def is_spread_tripped(self, symbol: str) -> bool:
        """Check if spread anomaly is active for symbol."""
        return self.tripped_symbols.get(symbol.upper(), False)

    def get_ema_spread(self, symbol: str) -> float:
        """Get current EMA spread value for symbol."""
        return self.ema_spreads.get(symbol.upper(), 0.0)


# ============================================================================
# 4. REMOTE ADMIN KILL-SWITCH BRIDGE (Feature 15)
# ============================================================================
class RemoteKillSwitchBridge:
    """Sync with Spartan RTDB system_config.globalBotActive and heartbeat grace period."""

    def __init__(
        self,
        rtdb_path: str = "system_config.globalBotActive",
        max_disconnect_seconds: float = 60.0,
    ) -> None:
        self.rtdb_path = rtdb_path
        self.max_disconnect_seconds = max_disconnect_seconds
        self.global_bot_active: bool = True
        self.maintenance_mode: bool = False
        self.last_heartbeat_timestamp: float = time.time()

    def update_from_heartbeat(
        self,
        response_payload: Dict[str, Any],
        current_time: Optional[float] = None,
    ) -> None:
        """
        Synchronize state from backend /api/ea/webhook heartbeat response.

        Expected JSON format:
            {
                "success": True,
                "globalBotActive": True,
                "maintenanceMode": False,
                "serverTime": 1725984000000
            }
        """
        now = current_time if current_time is not None else time.time()
        self.last_heartbeat_timestamp = now

        # Handle camelCase and snake_case variants
        if "globalBotActive" in response_payload:
            self.global_bot_active = bool(response_payload["globalBotActive"])
        elif "global_bot_active" in response_payload:
            self.global_bot_active = bool(response_payload["global_bot_active"])

        if "maintenanceMode" in response_payload:
            self.maintenance_mode = bool(response_payload["maintenanceMode"])
        elif "maintenance_mode" in response_payload:
            self.maintenance_mode = bool(response_payload["maintenance_mode"])

        if not self.global_bot_active or self.maintenance_mode:
            logger.warning("Remote Admin Kill-Switch ACTIVE: GlobalBotActive=False or MaintenanceMode=True.")

    def set_state(
        self,
        global_bot_active: bool,
        maintenance_mode: bool = False,
        current_time: Optional[float] = None,
    ) -> None:
        """Manually override remote kill-switch state."""
        self.global_bot_active = global_bot_active
        self.maintenance_mode = maintenance_mode
        self.last_heartbeat_timestamp = current_time if current_time is not None else time.time()

    def is_disconnected(self, current_time: Optional[float] = None) -> bool:
        """Check if remote RTDB telemetry is stale (> 60s disconnect grace period)."""
        now = current_time if current_time is not None else time.time()
        age = now - self.last_heartbeat_timestamp
        return age > self.max_disconnect_seconds

    def is_trading_allowed(self, current_time: Optional[float] = None) -> bool:
        """
        Trading is allowed ONLY if:
        1. globalBotActive is True
        2. maintenanceMode is False
        3. RTDB connection is fresh (not disconnected > 60s)
        """
        now = current_time if current_time is not None else time.time()
        if not self.global_bot_active or self.maintenance_mode:
            return False
        if self.is_disconnected(now):
            logger.warning(
                f"Heartbeat stale ({now - self.last_heartbeat_timestamp:.1f}s > "
                f"{self.max_disconnect_seconds}s). Suppressing trading."
            )
            return False
        return True


# ============================================================================
# 5. UNIFIED CIRCUIT BREAKER SUITE
# ============================================================================
class CircuitBreakerSuite:
    """Unified institutional circuit breaker management suite."""

    def __init__(self, config_path: Optional[str] = None) -> None:
        self.stop_out = StopOutCircuitBreaker()
        self.latency = LatencyTripwire()
        self.spread = SpreadTripwire()
        self.remote_kill = RemoteKillSwitchBridge()

        # Load yaml config
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        risk_cfg_path = config_path or os.path.join(base_dir, "config", "risk_profiles.yaml")
        self._load_config(risk_cfg_path)

    def _load_config(self, path: str) -> None:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    cfg = yaml.safe_load(f) or {}
                cb_cfg = cfg.get("circuit_breakers", {})

                # Stop out
                so = cb_cfg.get("stop_out_ltv", {})
                if "max_margin_utilization" in so:
                    self.stop_out.max_margin_utilization = float(so["max_margin_utilization"])
                if "target_recovery_utilization" in so:
                    self.stop_out.target_recovery_utilization = float(so["target_recovery_utilization"])
                if "critical_cushion_pct" in so:
                    self.stop_out.cushion_pct = float(so["critical_cushion_pct"])

                # Latency
                lat = cb_cfg.get("latency_tripwire", {})
                if "max_latency_ms" in lat:
                    self.latency.max_latency_ms = float(lat["max_latency_ms"])
                if "max_consecutive_timeouts" in lat:
                    self.latency.max_consecutive_timeouts = int(lat["max_consecutive_timeouts"])
                if "halt_duration_minutes" in lat:
                    self.latency.halt_duration_seconds = float(lat["halt_duration_minutes"]) * 60.0

                # Spread
                sp = cb_cfg.get("spread_tripwire", {})
                if "max_spread_multiplier" in sp:
                    self.spread.max_spread_multiplier = float(sp["max_spread_multiplier"])
                if "cooling_bars" in sp:
                    self.spread.cooling_bars_required = int(sp["cooling_bars"])

                # Remote kill switch
                rk = cb_cfg.get("remote_kill_switch", {})
                if "rtdb_path" in rk:
                    self.remote_kill.rtdb_path = str(rk["rtdb_path"])
            except Exception as e:
                logger.warning(f"Failed to load circuit breaker config from {path}: {e}")
