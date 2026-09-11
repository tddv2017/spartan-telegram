"""Spartan Quantitative Core Strict Types, TypedDicts, and Protocol Interfaces."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Literal, Optional, Protocol, TypedDict, runtime_checkable
import pandas as pd

from quant_research.core.constants import DrawdownTier, OrderAction, OrderType, RegimeState


# ============================================================================
# MARKET DATA MODELS
# ============================================================================
@dataclass(frozen=True)
class Bar:
    """OHLCV Bar Data Structure."""
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float
    spread: float = 0.0

    def to_dict(self) -> Dict[str, object]:
        return {
            "timestamp": self.timestamp,
            "open": self.open,
            "high": self.high,
            "low": self.low,
            "close": self.close,
            "volume": self.volume,
            "spread": self.spread,
        }


@dataclass(frozen=True)
class Tick:
    """Real-time Tick Data Structure."""
    timestamp: datetime
    symbol: str
    bid: float
    ask: float
    volume: float = 1.0
    spread: float = field(init=False)

    def __post_init__(self) -> None:
        object.__setattr__(self, "spread", max(0.0, self.ask - self.bid))

    def to_dict(self) -> Dict[str, object]:
        return {
            "timestamp": self.timestamp,
            "symbol": self.symbol,
            "bid": self.bid,
            "ask": self.ask,
            "spread": self.spread,
            "volume": self.volume,
        }


# ============================================================================
# TRADING & EXECUTION CONTRACTS (Matching PROJECT.md Interfaces)
# ============================================================================
class SignalDict(TypedDict, total=False):
    """Signal Contract emitted by Quant Alpha Models (M2 ↔ M3)."""
    action: Literal["BUY", "SELL", "CLOSE", "HOLD"]
    symbol: str
    entry_price: float
    stop_loss: float
    take_profit: float
    magic_number: int
    regime: str
    comment: str


class OrderDict(TypedDict, total=False):
    """Order Contract approved by Risk Engine."""
    order_id: str
    ticket: Optional[int]
    symbol: str
    action: Literal["BUY", "SELL", "CLOSE", "HOLD"]
    order_type: Literal["MARKET", "LIMIT", "STOP"]
    lots: float
    price: float
    stop_loss: float
    take_profit: float
    magic_number: int
    comment: str
    timestamp: str


class FillDict(TypedDict, total=False):
    """Execution Fill Record."""
    fill_id: str
    order_id: str
    ticket: int
    symbol: str
    type: Literal["BUY", "SELL"]
    lots: float
    open_price: float
    close_price: float
    pnl: float
    pnl_percentage: float
    commission: float
    swap: float
    slippage_points: float
    magic_number: int
    timestamp: str


@dataclass
class AccountState:
    """Broker / Exchange Account Margin & Equity State."""
    balance: float
    equity: float
    used_margin: float
    free_margin: float
    margin_level_pct: float
    open_positions: int = 0
    floating_pnl: float = 0.0

    @property
    def margin_utilization_ltv(self) -> float:
        """Calculate Margin Utilization (LTV = Used Margin / Equity)."""
        if self.equity <= 0:
            return 1.0
        return self.used_margin / self.equity


@dataclass
class CircuitBreakerStatus:
    """Current Circuit Breaker State & Escalation Tier."""
    is_triggered: bool
    tier: DrawdownTier
    current_drawdown_pct: float
    margin_utilization_ltv: float
    reason: str = ""
    action: str = ""


# ============================================================================
# REGIME ENGINE DATA TYPES
# ============================================================================
@dataclass
class RegimeEvaluation:
    """Detailed output from Market Regime Detection Engine."""
    state: RegimeState
    hurst: float
    atr_norm: float
    hv_rank: float
    is_shock: bool
    adx: float = 0.0
    shock_reason: str = ""
    details: Dict[str, float] = field(default_factory=dict)


# ============================================================================
# PROTOCOL INTERFACES (Matching PROJECT.md Contracts)
# ============================================================================
@runtime_checkable
class IBarDataProvider(Protocol):
    """Data interface for bar data retrieval (M1 ↔ M2)."""
    def get_bars(self, symbol: str, timeframe: str, start: datetime, end: datetime) -> pd.DataFrame:
        ...


@runtime_checkable
class IRegimeDetector(Protocol):
    """Market Regime Detection Engine Interface (M1 ↔ M2)."""
    def evaluate(self, df: pd.DataFrame) -> RegimeState:
        ...

    def evaluate_detailed(self, df: pd.DataFrame) -> RegimeEvaluation:
        ...
