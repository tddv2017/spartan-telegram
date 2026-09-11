"""Spartan Quantitative Research & Execution Package."""

from quant_research.execution.python.webhook_client import (
    SpartanWebhookClient,
    matches_secret,
    normalize_trade_payload,
    DEFAULT_WEBHOOK_URL,
    LOCAL_WEBHOOK_URL,
    QUEUE_CAPACITY,
    DEFAULT_SPOOL_FILENAME,
)
from quant_research.execution.python.ccxt_executor import (
    CCXTExecutor,
    generate_client_order_id,
    SUPPORTED_SYMBOLS,
    SUPPORTED_EXCHANGES,
    MAX_BREAKOUT_SLIPPAGE_PCT,
)

__all__ = [
    "SpartanWebhookClient",
    "matches_secret",
    "normalize_trade_payload",
    "DEFAULT_WEBHOOK_URL",
    "LOCAL_WEBHOOK_URL",
    "QUEUE_CAPACITY",
    "DEFAULT_SPOOL_FILENAME",
    "CCXTExecutor",
    "generate_client_order_id",
    "SUPPORTED_SYMBOLS",
    "SUPPORTED_EXCHANGES",
    "MAX_BREAKOUT_SLIPPAGE_PCT",
]
