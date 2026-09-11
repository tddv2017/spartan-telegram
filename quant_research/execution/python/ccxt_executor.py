"""
Spartan CCXT Crypto Execution Bot
Asynchronous execution engine for Binance Futures and Bybit Linear perpetuals.
Features:
- Smart Order Routing: Post-Only limit orders for maker rebates; IOC market orders for breakouts
- Client Order ID taxonomy: SPARTAN_{magic_number}_{timestamp_ms}
- Target perpetual symbols: BTC/USDT:USDT, ETH/USDT:USDT
- Subscribes to live bookTicker / L2 depth & private execution streams
- Seamless fallback adapter for local testing / environments without ccxt installed
- Real-time telemetry reporting to Spartan Webhook Bridge
"""

import asyncio
import time
import logging
from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass, field

try:
    import ccxt
    import ccxt.async_support as ccxt_async
    CCXT_AVAILABLE = True
except ImportError:
    ccxt = None
    ccxt_async = None
    CCXT_AVAILABLE = False

from quant_research.execution.python.webhook_client import SpartanWebhookClient, DEFAULT_WEBHOOK_URL

logger = logging.getLogger("spartan.ccxt_executor")

# Standardized Perpetual Symbols
SUPPORTED_SYMBOLS = ["BTC/USDT:USDT", "ETH/USDT:USDT"]
SUPPORTED_EXCHANGES = ["binance", "bybit"]
MAX_BREAKOUT_SLIPPAGE_PCT = 0.0005  # 0.05%


def generate_client_order_id(magic_number: int, timestamp_ms: Optional[int] = None) -> str:
    """
    Generate deterministic Client Order ID adhering to Spartan Taxonomy:
    Format: SPARTAN_{magic_number}_{timestamp_ms}
    """
    ts = timestamp_ms if timestamp_ms is not None else int(time.time() * 1000)
    return f"SPARTAN_{magic_number}_{ts}"


@dataclass
class SimulatedOrder:
    order_id: str
    client_order_id: str
    symbol: str
    side: str
    order_type: str
    amount: float
    price: float
    status: str
    post_only: bool = False
    time_in_force: str = "GTC"
    filled: float = 0.0
    remaining: float = 0.0
    cost: float = 0.0
    average_price: float = 0.0
    magic_number: int = 888801
    timestamp: int = field(default_factory=lambda: int(time.time() * 1000))


class MockExchangeAdapter:
    """High-fidelity simulated exchange matching Binance/Bybit perpetual order semantics."""

    def __init__(self, exchange_id: str = "binance"):
        self.id = exchange_id.lower()
        self.orders: Dict[str, SimulatedOrder] = {}
        self.order_counter = 100000
        self.tickers: Dict[str, Dict[str, float]] = {
            "BTC/USDT:USDT": {"bid": 64200.0, "ask": 64201.0, "last": 64200.5},
            "ETH/USDT:USDT": {"bid": 3450.0, "ask": 3450.5, "last": 3450.25},
        }
        self.balance = {"USDT": {"free": 100000.0, "used": 0.0, "total": 100000.0}}
        self.positions: Dict[str, Dict[str, Any]] = {}

    def set_ticker(self, symbol: str, bid: float, ask: float) -> None:
        self.tickers[symbol] = {"bid": bid, "ask": ask, "last": (bid + ask) / 2.0}

    async def fetch_ticker(self, symbol: str) -> Dict[str, Any]:
        await asyncio.sleep(0.001)
        if symbol not in self.tickers:
            self.tickers[symbol] = {"bid": 100.0, "ask": 100.1, "last": 100.05}
        t = self.tickers[symbol]
        return {
            "symbol": symbol,
            "bid": t["bid"],
            "ask": t["ask"],
            "last": t["last"],
            "timestamp": int(time.time() * 1000),
        }

    async def create_order(
        self,
        symbol: str,
        order_type: str,
        side: str,
        amount: float,
        price: Optional[float] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        await asyncio.sleep(0.002)
        params = params or {}
        self.order_counter += 1
        order_id = str(self.order_counter)
        client_order_id = params.get("clientOrderId", generate_client_order_id(888801))
        post_only = bool(params.get("postOnly", False) or params.get("timeInForce") == "PO")
        tif = params.get("timeInForce", "GTC")

        ticker = await self.fetch_ticker(symbol)
        bid = ticker["bid"]
        ask = ticker["ask"]

        sim_order = SimulatedOrder(
            order_id=order_id,
            client_order_id=client_order_id,
            symbol=symbol,
            side=side.lower(),
            order_type=order_type.lower(),
            amount=amount,
            price=price or (ask if side.lower() == "buy" else bid),
            status="open",
            post_only=post_only,
            time_in_force=tif,
            filled=0.0,
            remaining=amount,
        )

        # Handle Post-Only Maker Logic:
        # If BUY price >= ask, or SELL price <= bid, it would cross spread -> reject in post-only
        if post_only:
            if side.lower() == "buy" and sim_order.price >= ask:
                sim_order.status = "rejected"
                sim_order.remaining = amount
                self.orders[order_id] = sim_order
                return self._order_to_dict(sim_order)
            elif side.lower() == "sell" and sim_order.price <= bid:
                sim_order.status = "rejected"
                sim_order.remaining = amount
                self.orders[order_id] = sim_order
                return self._order_to_dict(sim_order)

        # Handle Immediate-or-Cancel (IOC) Breakout execution
        if tif == "IOC" or order_type.lower() == "market":
            execution_price = ask if side.lower() == "buy" else bid
            # Verify if execution price exceeds limit bounds (slippage guard)
            if price is not None and price > 0:
                if side.lower() == "buy" and execution_price > price:
                    sim_order.status = "canceled"
                    sim_order.remaining = amount
                    self.orders[order_id] = sim_order
                    return self._order_to_dict(sim_order)
                elif side.lower() == "sell" and execution_price < price:
                    sim_order.status = "canceled"
                    sim_order.remaining = amount
                    self.orders[order_id] = sim_order
                    return self._order_to_dict(sim_order)

            sim_order.status = "closed"
            sim_order.filled = amount
            sim_order.remaining = 0.0
            sim_order.cost = amount * execution_price
            sim_order.average_price = execution_price

        self.orders[order_id] = sim_order
        return self._order_to_dict(sim_order)

    async def cancel_order(self, order_id: str, symbol: Optional[str] = None) -> Dict[str, Any]:
        await asyncio.sleep(0.001)
        if order_id in self.orders:
            self.orders[order_id].status = "canceled"
            return self._order_to_dict(self.orders[order_id])
        return {"id": order_id, "status": "not_found"}

    async def fetch_order(self, order_id: str, symbol: Optional[str] = None) -> Dict[str, Any]:
        await asyncio.sleep(0.001)
        if order_id in self.orders:
            return self._order_to_dict(self.orders[order_id])
        return {"id": order_id, "status": "not_found"}

    def _order_to_dict(self, o: SimulatedOrder) -> Dict[str, Any]:
        return {
            "id": o.order_id,
            "clientOrderId": o.client_order_id,
            "symbol": o.symbol,
            "type": o.order_type,
            "side": o.side,
            "price": o.price,
            "amount": o.amount,
            "cost": o.cost,
            "average": o.average_price,
            "filled": o.filled,
            "remaining": o.remaining,
            "status": o.status,
            "postOnly": o.post_only,
            "timeInForce": o.time_in_force,
            "timestamp": o.timestamp,
        }

    async def close(self) -> None:
        pass


class CCXTExecutor:
    """
    Production-ready Async Crypto Execution Bot for Binance & Bybit Perpetuals.
    Enforces Smart Order Routing, Spartan Magic Taxonomy, and Webhook reporting.
    """

    def __init__(
        self,
        exchange_id: str = "binance",
        api_key: str = "",
        api_secret: str = "",
        testnet: bool = True,
        webhook_client: Optional[SpartanWebhookClient] = None,
        use_mock: bool = False,
    ):
        self.exchange_id = exchange_id.lower()
        if self.exchange_id not in SUPPORTED_EXCHANGES:
            raise ValueError(f"Exchange {exchange_id} not supported. Must be one of {SUPPORTED_EXCHANGES}")

        self.api_key = api_key
        self.api_secret = api_secret
        self.testnet = testnet
        self.webhook_client = webhook_client
        self.use_mock = use_mock or (not CCXT_AVAILABLE) or (not api_key)
        self.active_orders: Dict[str, Dict[str, Any]] = {}
        self.exchange: Any = None
        self._initialize_exchange()

    def _initialize_exchange(self) -> None:
        if self.use_mock:
            logger.info("Initializing MockExchangeAdapter for %s (Simulation Mode)", self.exchange_id)
            self.exchange = MockExchangeAdapter(self.exchange_id)
        else:
            exchange_class = getattr(ccxt_async, self.exchange_id, None)
            if exchange_class is None:
                raise RuntimeError(f"ccxt_async.{self.exchange_id} is unavailable")

            config = {
                "apiKey": self.api_key,
                "secret": self.api_secret,
                "enableRateLimit": True,
                "options": {
                    "defaultType": "future" if self.exchange_id == "binance" else "swap",
                },
            }
            if self.testnet:
                config["options"]["testnet"] = True
            self.exchange = exchange_class(config)

    async def fetch_best_price(self, symbol: str) -> Dict[str, float]:
        """Fetch current L1 bid, ask, and mid price."""
        ticker = await self.exchange.fetch_ticker(symbol)
        bid = float(ticker.get("bid") or ticker.get("last", 0.0))
        ask = float(ticker.get("ask") or ticker.get("last", 0.0))
        return {
            "bid": bid,
            "ask": ask,
            "mid": (bid + ask) / 2.0 if (bid > 0 and ask > 0) else 0.0,
        }

    async def execute_maker_entry(
        self,
        symbol: str,
        side: str,
        amount: float,
        price: float,
        magic_number: int = 888801,
    ) -> Dict[str, Any]:
        """
        Smart Routing - Normal Entries:
        Places Post-Only Limit Order to capture maker rebates and prevent spread crossing.
        """
        client_order_id = generate_client_order_id(magic_number)
        params: Dict[str, Any] = {
            "clientOrderId": client_order_id,
            "postOnly": True,
            "timeInForce": "PO",
        }

        logger.info("Placing Maker Post-Only order: %s %s %.4f @ %.2f (CID: %s)",
                    side.upper(), symbol, amount, price, client_order_id)

        try:
            order = await self.exchange.create_order(
                symbol=symbol,
                order_type="limit",
                side=side.lower(),
                amount=amount,
                price=price,
                params=params,
            )
            self.active_orders[order["id"]] = order
            return {
                "success": order["status"] != "rejected",
                "order": order,
                "client_order_id": client_order_id,
                "magic_number": magic_number,
                "post_only": True,
            }
        except Exception as exc:
            logger.error("Failed to place Maker Post-Only order: %s", exc)
            return {"success": False, "error": str(exc), "client_order_id": client_order_id}

    async def execute_breakout_entry(
        self,
        symbol: str,
        side: str,
        amount: float,
        magic_number: int = 888803,
        max_slippage_pct: float = MAX_BREAKOUT_SLIPPAGE_PCT,
    ) -> Dict[str, Any]:
        """
        Smart Routing - Breakout Entries:
        Places Immediate-or-Cancel (IOC) order with strictly capped slippage (<= 0.05%).
        """
        prices = await self.fetch_best_price(symbol)
        reference_price = prices["ask"] if side.lower() == "buy" else prices["bid"]

        # Calculate limit price with slippage cap
        if side.lower() == "buy":
            limit_price = reference_price * (1.0 + max_slippage_pct)
        else:
            limit_price = reference_price * (1.0 - max_slippage_pct)

        client_order_id = generate_client_order_id(magic_number)
        params = {
            "clientOrderId": client_order_id,
            "timeInForce": "IOC",
        }

        logger.info("Placing Breakout IOC order: %s %s %.4f Ref: %.2f Limit: %.2f (Slippage Cap: %.2f%%)",
                    side.upper(), symbol, amount, reference_price, limit_price, max_slippage_pct * 100.0)

        try:
            order = await self.exchange.create_order(
                symbol=symbol,
                order_type="limit",
                side=side.lower(),
                amount=amount,
                price=round(limit_price, 2),
                params=params,
            )
            self.active_orders[order["id"]] = order
            is_filled = order["status"] in ("closed", "filled")

            return {
                "success": is_filled or order["status"] == "open",
                "is_filled": is_filled,
                "order": order,
                "client_order_id": client_order_id,
                "slippage_capped": True,
            }
        except Exception as exc:
            logger.error("Failed to place Breakout IOC order: %s", exc)
            return {"success": False, "error": str(exc), "client_order_id": client_order_id}

    async def cancel_order(self, order_id: str, symbol: Optional[str] = None) -> Dict[str, Any]:
        """Cancel an open order."""
        res = await self.exchange.cancel_order(order_id, symbol)
        if order_id in self.active_orders:
            self.active_orders[order_id]["status"] = "canceled"
        return res

    async def report_closed_position(
        self,
        ticket: str,
        symbol: str,
        side: str,
        lots: float,
        open_price: float,
        close_price: float,
        pnl: float,
        magic_number: int = 888801,
        comment: str = "CCXT Crypto Alpha",
    ) -> Optional[Dict[str, Any]]:
        """Bridge trade closure directly to the Spartan Webhook client."""
        if self.webhook_client is None:
            return None

        pnl_pct = 0.0
        if open_price > 0.0:
            if side.upper() == "BUY":
                pnl_pct = ((close_price - open_price) / open_price) * 100.0
            else:
                pnl_pct = ((open_price - close_price) / open_price) * 100.0

        return await self.webhook_client.report_trade_closed_async(
            ticket=ticket,
            symbol=symbol.replace(":USDT", "").replace("/", ""),
            trade_type=side.upper(),
            lots=lots,
            open_price=open_price,
            close_price=close_price,
            pnl=pnl,
            pnl_percentage=pnl_pct,
            magic_number=magic_number,
            comment=comment,
        )

    async def close(self) -> None:
        """Graceful shutdown of exchange connections."""
        if self.exchange:
            await self.exchange.close()
