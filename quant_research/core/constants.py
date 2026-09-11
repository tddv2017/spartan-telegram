"""Spartan Quantitative Trading System Constants, Enums, and Magic Taxonomy."""

from enum import Enum
from typing import Dict

# ============================================================================
# HTTP STATUS CODES & BACKEND INTEGRATION
# ============================================================================
HTTP_200_OK: int = 200
HTTP_400_BAD_REQUEST: int = 400
HTTP_401_UNAUTHORIZED: int = 401
HTTP_403_FORBIDDEN: int = 403
HTTP_404_NOT_FOUND: int = 404
HTTP_500_INTERNAL_ERROR: int = 500
HTTP_503_SERVICE_UNAVAILABLE: int = 503

# Webhook Constants
DEFAULT_WEBHOOK_URL: str = "https://spartan-telegram.vercel.app/api/ea/webhook"
LOCAL_WEBHOOK_URL: str = "http://localhost:3000/api/ea/webhook"
DEFAULT_WEBHOOK_TIMEOUT_SECONDS: float = 4.0
MAX_ALLOWED_WEBHOOK_LATENCY_MS: float = 500.0

# ============================================================================
# ERROR CODES
# ============================================================================
ERR_SUCCESS: int = 0
ERR_SPREAD_ANOMALY: int = 4001
ERR_LATENCY_TRIPWIRE: int = 4002
ERR_STOP_OUT_LTV: int = 4003
ERR_DRAWDOWN_BREACH: int = 4004
ERR_ORDER_REJECTED: int = 4005
ERR_DATA_GAP_DETECTED: int = 4006
ERR_INVALID_TICK: int = 4007
ERR_REGIME_BLOCKED: int = 4008
ERR_FUNCTION_NOT_ALLOWED: int = 4014

# ============================================================================
# MAGIC NUMBER TAXONOMY
# Format: 880000 + (AssetCode * 1000) + (StrategyCode * 10) + Variant
# ============================================================================
MAGIC_BASE_PREFIX: int = 880000

ASSET_CODES: Dict[str, int] = {
    "XAUUSD": 1,
    "EURUSD": 2,
    "GBPUSD": 3,
    "BTCUSDT": 8,
    "ETHUSDT": 9,
}

STRATEGY_CODES: Dict[str, int] = {
    "MOMENTUM_TREND": 1,
    "VOL_BREAKOUT": 2,
    "STAT_ARB": 3,
    "MEAN_REVERSION": 4,
}

# Static Standardized Strategy Magic Numbers
MAGIC_STAT_ARB: int = 888801
MAGIC_MOMENTUM_TREND: int = 888802
MAGIC_VOL_BREAKOUT: int = 888803
MAGIC_MEAN_REVERSION: int = 888804
MAGIC_CIRCUIT_BREAKER: int = 888888
MAGIC_FALLBACK_DEFAULT: int = 888899


def make_magic_number(symbol: str, strategy_code: int, variant: int = 1) -> int:
    """Generate deterministic Spartan Multi-Ghost magic number."""
    asset_code = ASSET_CODES.get(symbol.upper(), 0)
    return MAGIC_BASE_PREFIX + (asset_code * 1000) + (strategy_code * 10) + variant


# ============================================================================
# CORE ENUMS
# ============================================================================
class RegimeState(str, Enum):
    """5-State Market Regime Classification."""
    BULL_TREND = "BULL_TREND"
    BEAR_TREND = "BEAR_TREND"
    RANGE_BOUND = "RANGE_BOUND"
    VOL_COMPRESSION = "VOL_COMPRESSION"
    CRISIS_SHOCK = "CRISIS_SHOCK"


class OrderAction(str, Enum):
    """Signal / Order Action Types."""
    BUY = "BUY"
    SELL = "SELL"
    CLOSE = "CLOSE"
    HOLD = "HOLD"


class OrderType(str, Enum):
    """Execution Order Types."""
    MARKET = "MARKET"
    LIMIT = "LIMIT"
    STOP = "STOP"
    STOP_LOSS = "STOP_LOSS"
    TAKE_PROFIT = "TAKE_PROFIT"


class OrderStatus(str, Enum):
    """Order Lifecycle Statuses."""
    PENDING = "PENDING"
    FILLED = "FILLED"
    PARTIALLY_FILLED = "PARTIALLY_FILLED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"


class TimeFrame(str, Enum):
    """Supported Bar Timeframes."""
    M1 = "M1"
    M5 = "M5"
    M15 = "M15"
    H1 = "H1"
    H4 = "H4"
    D1 = "D1"


class DrawdownTier(str, Enum):
    """4-Tier Portfolio Drawdown Escalation Levels."""
    TIER_1_NORMAL = "TIER_1_NORMAL"
    TIER_2_SOFT_THROTTLE = "TIER_2_SOFT_THROTTLE"
    TIER_3_HARD_FREEZE = "TIER_3_HARD_FREEZE"
    TIER_4_CIRCUIT_BREAKER = "TIER_4_CIRCUIT_BREAKER"


class WebhookAction(str, Enum):
    """Supported Webhook Actions on /api/ea/webhook."""
    TRADE_CLOSED = "TRADE_CLOSED"
    DEAL_ADD = "DEAL_ADD"
    TRADE = "TRADE"
    HEARTBEAT = "HEARTBEAT"
    POOL_SYNC = "POOL_SYNC"
    PING = "PING"
