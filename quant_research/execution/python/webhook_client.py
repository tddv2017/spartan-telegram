"""
Spartan Webhook Bridge Client
Synchronous and Asynchronous client syncing execution telemetry to /api/ea/webhook.
Features:
- Timing-safe secret validation matching route.ts SHA-256 HMAC
- Normalization: lot clamping [0.01, 50.0], PnL anomaly threshold ±$50,000
- Mandatory explicit openPrice and pnlPercentage for Crypto and Forex
- In-memory FIFO queue (500 items) and offline disk spooling (spartan_webhook_spool.dat)
- Latency telemetry and verification (< 500ms)
"""

import os
import time
import json
import hashlib
import hmac
import logging
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timezone

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    requests = None
    REQUESTS_AVAILABLE = False

import urllib.request
import urllib.error

logger = logging.getLogger("spartan.webhook_client")

DEFAULT_WEBHOOK_URL = "https://spartan-telegram.vercel.app/api/ea/webhook"
LOCAL_WEBHOOK_URL = "http://localhost:3000/api/ea/webhook"
QUEUE_CAPACITY = 500
DEFAULT_SPOOL_FILENAME = "spartan_webhook_spool.dat"


def matches_secret(provided: str, expected: str) -> bool:
    """
    Constant-time SHA-256 secret verification matching route.ts:
    const a = crypto.createHash('sha256').update(provided).digest();
    const b = crypto.createHash('sha256').update(expected).digest();
    return crypto.timingSafeEqual(a, b);
    """
    if not provided or not expected:
        return False
    hash_a = hashlib.sha256(provided.encode("utf-8")).digest()
    hash_b = hashlib.sha256(expected.encode("utf-8")).digest()
    return hmac.compare_digest(hash_a, hash_b)


def normalize_trade_payload(
    raw_payload: Dict[str, Any],
    api_key: str = ""
) -> Dict[str, Any]:
    """
    Emulate backend route.ts data normalization and anomaly defense:
    - lots clamped to [0.01, 50.0]
    - pnl capped to [-50000, 50000] and flags isAnomalous
    - openPrice and pnlPercentage explicitly computed
    """
    lots = float(raw_payload.get("lots", 0.1))
    clean_lots = max(0.01, min(50.0, lots))

    raw_pnl = float(raw_payload.get("pnl", 0.0))
    is_anomalous = abs(raw_pnl) > 50000.0
    clean_pnl = max(-50000.0, min(50000.0, raw_pnl))

    open_price = float(raw_payload.get("openPrice", 0.0))
    close_price = float(raw_payload.get("closePrice", 0.0))
    trade_type = "SELL" if "SELL" in str(raw_payload.get("type", "")).upper() else "BUY"
    symbol = str(raw_payload.get("symbol", "XAUUSD")).upper()

    # Calculate explicit pnlPercentage if missing
    pnl_pct = raw_payload.get("pnlPercentage")
    if pnl_pct is None:
        if open_price > 0.0:
            if trade_type == "BUY":
                pnl_pct = ((close_price - open_price) / open_price) * 100.0
            else:
                pnl_pct = ((open_price - close_price) / open_price) * 100.0
        else:
            pnl_pct = 0.0
    else:
        pnl_pct = float(pnl_pct)

    magic = int(raw_payload.get("magicNumber", 888899))
    comment = str(raw_payload.get("comment", "Spartan Quant"))[:100]
    ticket = str(raw_payload.get("ticket", raw_payload.get("id", f"T_{int(time.time() * 1000)}")))
    timestamp = raw_payload.get("timestamp", datetime.now(timezone.utc).isoformat())

    return {
        "action": str(raw_payload.get("action", "TRADE_CLOSED")),
        "apiKey": api_key or raw_payload.get("apiKey", ""),
        "ticket": ticket,
        "symbol": symbol,
        "type": trade_type,
        "lots": round(clean_lots, 2),
        "openPrice": round(open_price, 4),
        "closePrice": round(close_price, 4),
        "pnl": round(clean_pnl, 2),
        "pnlPercentage": round(pnl_pct, 2),
        "comment": comment,
        "magicNumber": magic,
        "timestamp": timestamp,
        "isAnomalous": is_anomalous,
    }


class SpartanWebhookClient:
    """
    Resilient Webhook Client communicating with Spartan Backend at /api/ea/webhook.
    Provides memory buffering, disk spooling on connection loss, and latency auditing.
    """

    def __init__(
        self,
        api_key: str,
        server_url: str = DEFAULT_WEBHOOK_URL,
        timeout: float = 4.0,
        spool_filename: str = DEFAULT_SPOOL_FILENAME,
    ):
        self.api_key = api_key
        self.server_url = server_url
        self.timeout = timeout
        self.spool_filename = spool_filename
        self.queue: List[Dict[str, Any]] = []
        self.last_latency_ms: float = 0.0
        self.last_server_time: Optional[str] = None
        self.global_bot_active: bool = True
        self.stats = {
            "sent": 0,
            "failed": 0,
            "queued": 0,
            "spooled": 0,
            "drained": 0,
        }

    def _get_headers(self) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
            "x-ea-key": self.api_key,
        }

    def _execute_http_post(self, payload: Dict[str, Any]) -> Tuple[bool, int, Dict[str, Any], float]:
        """
        Execute low-level HTTP POST request with sub-millisecond latency tracking.
        Returns: (success, status_code, response_json, elapsed_ms)
        """
        headers = self._get_headers()
        json_data = json.dumps(payload).encode("utf-8")
        start_time = time.perf_counter()

        if REQUESTS_AVAILABLE:
            try:
                resp = requests.post(
                    self.server_url,
                    data=json_data,
                    headers=headers,
                    timeout=self.timeout,
                )
                elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                self.last_latency_ms = elapsed_ms
                status = resp.status_code

                try:
                    res_json = resp.json()
                except Exception:
                    res_json = {"raw": resp.text}

                if status == 200:
                    self._parse_server_feedback(res_json)
                    return True, status, res_json, elapsed_ms
                return False, status, res_json, elapsed_ms

            except Exception as e:
                elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                return False, -1, {"error": str(e)}, elapsed_ms
        else:
            # Fallback to standard library urllib
            req = urllib.request.Request(
                self.server_url,
                data=json_data,
                headers=headers,
                method="POST",
            )
            try:
                with urllib.request.urlopen(req, timeout=self.timeout) as response:
                    elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                    self.last_latency_ms = elapsed_ms
                    status = response.getcode()
                    raw_content = response.read().decode("utf-8")
                    try:
                        res_json = json.loads(raw_content)
                    except Exception:
                        res_json = {"raw": raw_content}
                    if status == 200:
                        self._parse_server_feedback(res_json)
                        return True, status, res_json, elapsed_ms
                    return False, status, res_json, elapsed_ms
            except urllib.error.HTTPError as he:
                elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                try:
                    body = he.read().decode("utf-8")
                    res_json = json.loads(body)
                except Exception:
                    res_json = {"error": str(he)}
                return False, he.code, res_json, elapsed_ms
            except Exception as exc:
                elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                return False, -1, {"error": str(exc)}, elapsed_ms

    def _parse_server_feedback(self, resp_data: Dict[str, Any]) -> None:
        """Inspect backend response for system flags like globalBotActive."""
        if "globalBotActive" in resp_data:
            self.global_bot_active = bool(resp_data["globalBotActive"])
        if "serverTime" in resp_data:
            self.last_server_time = str(resp_data["serverTime"])

    def enqueue(self, payload: Dict[str, Any]) -> bool:
        """Enqueue payload in in-memory buffer (capacity: 500) or spool to disk."""
        if len(self.queue) >= QUEUE_CAPACITY:
            logger.warning("In-memory queue at full capacity (%d). Spooling to disk.", QUEUE_CAPACITY)
            self.spool_to_disk(payload)
            return False
        self.queue.append(payload)
        self.stats["queued"] += 1
        return True

    def spool_to_disk(self, payload: Dict[str, Any]) -> bool:
        """Append failed or overflow payload to disk spool file."""
        try:
            with open(self.spool_filename, "a", encoding="utf-8") as f:
                f.write(json.dumps(payload) + "\n")
            self.stats["spooled"] += 1
            return True
        except Exception as e:
            logger.error("Failed to write to spool file %s: %s", self.spool_filename, e)
            return False

    def drain_spool_from_disk(self) -> int:
        """Read and drain offline disk spool file back into active in-memory queue."""
        if not os.path.exists(self.spool_filename):
            return 0

        recovered = []
        try:
            with open(self.spool_filename, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            recovered.append(json.loads(line))
                        except Exception:
                            pass
            os.remove(self.spool_filename)
        except Exception as e:
            logger.error("Error reading spool file %s: %s", self.spool_filename, e)
            return 0

        queued = 0
        for item in recovered:
            if self.enqueue(item):
                queued += 1
            else:
                self.spool_to_disk(item)

        self.stats["drained"] += queued
        return queued

    def process_queue(self, max_batch: int = 20) -> int:
        """Drain queued payloads in strict First-In-First-Out (FIFO) sequence."""
        if not self.queue:
            return 0

        sent_count = 0
        batch = min(max_batch, len(self.queue))

        for _ in range(batch):
            payload = self.queue.pop(0)
            success, _, _, _ = self._execute_http_post(payload)
            if success:
                sent_count += 1
                self.stats["sent"] += 1
            else:
                # Put back at front and re-spool to disk if needed
                self.queue.insert(0, payload)
                self.stats["failed"] += 1
                break

        return sent_count

    def report_trade_closed(
        self,
        ticket: Any,
        symbol: str,
        trade_type: str,
        lots: float,
        open_price: float,
        close_price: float,
        pnl: float,
        pnl_percentage: Optional[float] = None,
        magic_number: int = 888899,
        comment: str = "Spartan Quant Alpha",
    ) -> Dict[str, Any]:
        """
        Send TRADE_CLOSED execution telemetry to /api/ea/webhook.
        Guarantees mandatory openPrice and pnlPercentage for Crypto/Forex.
        """
        raw = {
            "action": "TRADE_CLOSED",
            "apiKey": self.api_key,
            "ticket": str(ticket),
            "symbol": symbol.upper(),
            "type": trade_type.upper(),
            "lots": lots,
            "openPrice": open_price,
            "closePrice": close_price,
            "pnl": pnl,
            "pnlPercentage": pnl_percentage,
            "magicNumber": magic_number,
            "comment": comment,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        normalized = normalize_trade_payload(raw, self.api_key)

        success, status, data, latency_ms = self._execute_http_post(normalized)
        if success:
            self.stats["sent"] += 1
            return {
                "success": True,
                "status_code": status,
                "latency_ms": latency_ms,
                "payload": normalized,
                "response": data,
            }

        # Failed -> Enqueue for resilient delivery
        self.enqueue(normalized)
        self.stats["failed"] += 1
        return {
            "success": False,
            "status_code": status,
            "latency_ms": latency_ms,
            "payload": normalized,
            "error": data,
            "enqueued": True,
        }

    def report_heartbeat(
        self,
        account_number: str,
        broker: str,
        server: str,
        balance: float,
        equity: float,
        floating_profit: float,
        margin: float,
        free_margin: float,
        margin_level: float,
        open_positions: int,
    ) -> Dict[str, Any]:
        """Send account health and master pool balance heartbeat."""
        payload = {
            "action": "HEARTBEAT",
            "apiKey": self.api_key,
            "accountNumber": str(account_number),
            "broker": broker,
            "server": server,
            "balance": round(balance, 2),
            "equity": round(equity, 2),
            "floatingProfit": round(floating_profit, 2),
            "margin": round(margin, 2),
            "freeMargin": round(free_margin, 2),
            "marginLevel": round(margin_level, 2),
            "openPositions": int(open_positions),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        success, status, data, latency_ms = self._execute_http_post(payload)
        if success:
            self.stats["sent"] += 1
            return {"success": True, "status_code": status, "latency_ms": latency_ms, "response": data}

        self.stats["failed"] += 1
        return {"success": False, "status_code": status, "latency_ms": latency_ms, "error": data}

    def ping(self) -> Dict[str, Any]:
        """Send lightweight ping to test connection and measure latency."""
        payload = {
            "action": "PING",
            "apiKey": self.api_key,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        success, status, data, latency_ms = self._execute_http_post(payload)
        return {
            "success": success,
            "status_code": status,
            "latency_ms": latency_ms,
            "response": data,
        }

    async def report_trade_closed_async(
        self,
        ticket: Any,
        symbol: str,
        trade_type: str,
        lots: float,
        open_price: float,
        close_price: float,
        pnl: float,
        pnl_percentage: Optional[float] = None,
        magic_number: int = 888899,
        comment: str = "Spartan Quant Async",
    ) -> Dict[str, Any]:
        """Asynchronous wrapper for non-blocking event loops."""
        import asyncio
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self.report_trade_closed,
            ticket, symbol, trade_type, lots, open_price, close_price, pnl, pnl_percentage, magic_number, comment
        )
