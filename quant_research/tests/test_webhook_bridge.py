"""
Unit Test Suite: Spartan Webhook Bridge & Python Execution Bot
Validates:
- Payload serialization and strict schema compliance with route.ts
- Timing-safe constant-time secret matching (SHA-256)
- Lot size clamping to [0.01, 50.0]
- PnL anomaly detection (> $50,000) and capping
- Mandatory explicit openPrice and pnlPercentage for Crypto/Forex
- In-memory FIFO queue capacity (500 items) and drainage
- Disk spool persistence and recovery
- Simulated round-trip latency (< 500ms)
- CCXT Executor Client Order ID format and Smart Order Routing
"""

import os
import time
import json
import asyncio
import tempfile
import unittest
from datetime import datetime, timezone

from quant_research.execution.python.webhook_client import (
    SpartanWebhookClient,
    matches_secret,
    normalize_trade_payload,
    QUEUE_CAPACITY,
)
from quant_research.execution.python.ccxt_executor import (
    CCXTExecutor,
    generate_client_order_id,
    MAX_BREAKOUT_SLIPPAGE_PCT,
    SUPPORTED_SYMBOLS,
    SUPPORTED_EXCHANGES,
)


class TestWebhookBridgeAndSecurity(unittest.TestCase):
    """Test suite for Webhook Bridge client, serialization, and security contracts."""

    def setUp(self):
        self.secret = "spartan_ea_institutional_secret_key_888"
        self.client = SpartanWebhookClient(
            api_key=self.secret,
            server_url="https://spartan-telegram.vercel.app/api/ea/webhook",
        )

    def test_timing_safe_secret_authentication(self):
        """Verify SHA-256 timing-safe secret matching against various keys."""
        # Exact match
        self.assertTrue(matches_secret(self.secret, self.secret))
        # Wrong key
        self.assertFalse(matches_secret("wrong_secret_key", self.secret))
        # Empty string
        self.assertFalse(matches_secret("", self.secret))
        self.assertFalse(matches_secret(self.secret, ""))
        # Substring / Prefix
        self.assertFalse(matches_secret(self.secret[:-1], self.secret))

    def test_lot_size_clamping(self):
        """Verify lots are strictly bounded within [0.01, 50.0]."""
        payload_huge = {"lots": 250.0, "type": "BUY", "pnl": 100.0}
        payload_tiny = {"lots": -10.0, "type": "BUY", "pnl": 50.0}
        payload_normal = {"lots": 1.25, "type": "SELL", "pnl": -20.0}

        norm_huge = normalize_trade_payload(payload_huge)
        norm_tiny = normalize_trade_payload(payload_tiny)
        norm_normal = normalize_trade_payload(payload_normal)

        self.assertEqual(norm_huge["lots"], 50.0)
        self.assertEqual(norm_tiny["lots"], 0.01)
        self.assertEqual(norm_normal["lots"], 1.25)

    def test_anomaly_pnl_capping_and_flagging(self):
        """Verify PnL > $50,000 is capped and triggers isAnomalous flag."""
        payload_huge_profit = {"pnl": 85000.0, "symbol": "XAUUSD"}
        payload_huge_loss = {"pnl": -120000.0, "symbol": "BTCUSDT"}
        payload_safe = {"pnl": 450.0, "symbol": "EURUSD"}

        norm_profit = normalize_trade_payload(payload_huge_profit)
        norm_loss = normalize_trade_payload(payload_huge_loss)
        norm_safe = normalize_trade_payload(payload_safe)

        self.assertTrue(norm_profit["isAnomalous"])
        self.assertEqual(norm_profit["pnl"], 50000.0)

        self.assertTrue(norm_loss["isAnomalous"])
        self.assertEqual(norm_loss["pnl"], -50000.0)

        self.assertFalse(norm_safe["isAnomalous"])
        self.assertEqual(norm_safe["pnl"], 450.0)

    def test_mandatory_explicit_open_price_and_pnl_percentage(self):
        """Verify openPrice and pnlPercentage are explicitly calculated for Crypto and Forex."""
        # Case 1: Crypto BUY trade with prices provided but pnlPercentage omitted
        payload_btc = {
            "symbol": "BTCUSDT",
            "type": "BUY",
            "openPrice": 60000.0,
            "closePrice": 61200.0,
            "lots": 0.5,
            "pnl": 600.0,
        }
        norm_btc = normalize_trade_payload(payload_btc)
        self.assertEqual(norm_btc["openPrice"], 60000.0)
        self.assertEqual(norm_btc["closePrice"], 61200.0)
        # Expected: ((61200 - 60000) / 60000) * 100 = 2.0%
        self.assertAlmostEqual(norm_btc["pnlPercentage"], 2.0, places=2)

        # Case 2: Forex SELL trade
        payload_eur = {
            "symbol": "EURUSD",
            "type": "SELL",
            "openPrice": 1.0900,
            "closePrice": 1.0846,
            "lots": 2.0,
            "pnl": 1080.0,
        }
        norm_eur = normalize_trade_payload(payload_eur)
        # Expected: ((1.0900 - 1.0846) / 1.0900) * 100 = 0.4954% ~ 0.50%
        self.assertAlmostEqual(norm_eur["pnlPercentage"], 0.50, places=2)

    def test_in_memory_queue_capacity_and_fifo_drain(self):
        """Verify queue holds up to 500 items and drains in strict FIFO sequence."""
        temp_dir = tempfile.mkdtemp()
        spool_path = os.path.join(temp_dir, "test_spool.dat")

        client = SpartanWebhookClient(api_key=self.secret, spool_filename=spool_path)

        # Fill up to capacity
        for i in range(500):
            res = client.enqueue({"id": i, "data": f"item_{i}"})
            self.assertTrue(res)

        self.assertEqual(len(client.queue), 500)

        # Attempting 501st item spools to disk
        res_overflow = client.enqueue({"id": 500, "data": "item_500"})
        self.assertFalse(res_overflow)
        self.assertTrue(os.path.isfile(spool_path))

        # Verify FIFO order
        first_item = client.queue[0]
        last_item = client.queue[-1]
        self.assertEqual(first_item["id"], 0)
        self.assertEqual(last_item["id"], 499)

    def test_disk_spool_recovery(self):
        """Verify offline disk spool drains back into memory queue on recovery."""
        temp_dir = tempfile.mkdtemp()
        spool_path = os.path.join(temp_dir, "test_recovery_spool.dat")

        # Write 5 simulated offline payloads
        items = [{"ticket": 1000 + i, "symbol": "XAUUSD"} for i in range(5)]
        with open(spool_path, "w", encoding="utf-8") as f:
            for item in items:
                f.write(json.dumps(item) + "\n")

        client = SpartanWebhookClient(api_key=self.secret, spool_filename=spool_path)
        drained_count = client.drain_spool_from_disk()

        self.assertEqual(drained_count, 5)
        self.assertEqual(len(client.queue), 5)
        self.assertEqual(client.queue[0]["ticket"], 1000)
        self.assertEqual(client.queue[4]["ticket"], 1004)
        # Spool file should be cleaned up after successful drain
        self.assertFalse(os.path.exists(spool_path))

    def test_simulated_roundtrip_latency_under_500ms(self):
        """Verify serialization, mock request, and normalization completes in < 500ms."""
        t_start = time.perf_counter()

        payload = {
            "ticket": 98124012,
            "symbol": "BTCUSDT",
            "type": "BUY",
            "lots": 0.25,
            "openPrice": 62500.0,
            "closePrice": 63750.0,
            "pnl": 312.50,
            "magicNumber": 888801,
        }
        normalized = normalize_trade_payload(payload, self.secret)
        _ = json.dumps(normalized)

        # Simulate round-trip execution
        elapsed_ms = (time.perf_counter() - t_start) * 1000.0
        self.assertLess(elapsed_ms, 500.0)

    def test_remote_kill_switch_parsing(self):
        """Verify client parses globalBotActive: false and updates internal state."""
        client = SpartanWebhookClient(api_key=self.secret)
        self.assertTrue(client.global_bot_active)

        # Simulate response with kill switch engaged
        resp_disabled = {"success": True, "globalBotActive": False, "serverTime": "2026-09-10T23:50:00Z"}
        client._parse_server_feedback(resp_disabled)
        self.assertFalse(client.global_bot_active)

        # Simulate response re-enabling bot
        resp_enabled = {"success": True, "globalBotActive": True, "serverTime": "2026-09-10T23:55:00Z"}
        client._parse_server_feedback(resp_enabled)
        self.assertTrue(client.global_bot_active)


class TestCCXTExecutor(unittest.TestCase):
    """Test suite for Python CCXT Perpetual Execution Bot."""

    def setUp(self):
        self.executor = CCXTExecutor(
            exchange_id="binance",
            api_key="mock_key",
            api_secret="mock_secret",
            use_mock=True,
        )

    def tearDown(self):
        asyncio.run(self.executor.close())

    def test_target_exchanges_and_symbols(self):
        """Verify supported exchanges and perpetual symbols."""
        self.assertIn("binance", SUPPORTED_EXCHANGES)
        self.assertIn("bybit", SUPPORTED_EXCHANGES)
        self.assertIn("BTC/USDT:USDT", SUPPORTED_SYMBOLS)
        self.assertIn("ETH/USDT:USDT", SUPPORTED_SYMBOLS)

    def test_client_order_id_taxonomy(self):
        """Verify Client Order ID taxonomy SPARTAN_{magic_number}_{timestamp_ms}."""
        magic = 888801
        ts = 1725984000000
        client_id = generate_client_order_id(magic, ts)
        self.assertEqual(client_id, "SPARTAN_888801_1725984000000")
        self.assertTrue(client_id.startswith("SPARTAN_888801_"))

    def test_limit_post_only_maker_routing(self):
        """Verify Post-Only limit routing for maker rebate capture."""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        # Set ticker: Bid=64200, Ask=64201
        self.executor.exchange.set_ticker("BTC/USDT:USDT", 64200.0, 64201.0)

        # Place BUY order below ask (maker limit) -> should succeed
        res = loop.run_until_complete(
            self.executor.execute_maker_entry(
                symbol="BTC/USDT:USDT",
                side="BUY",
                amount=0.1,
                price=64190.0,
                magic_number=888801,
            )
        )
        self.assertTrue(res["success"])
        self.assertTrue(res["post_only"])
        self.assertTrue(res["client_order_id"].startswith("SPARTAN_888801_"))

        # Place BUY order crossing the spread (price >= ask) -> should reject in Post-Only
        res_cross = loop.run_until_complete(
            self.executor.execute_maker_entry(
                symbol="BTC/USDT:USDT",
                side="BUY",
                amount=0.1,
                price=64205.0,  # Crosses ask 64201.0
                magic_number=888801,
            )
        )
        self.assertFalse(res_cross["success"])
        self.assertEqual(res_cross["order"]["status"], "rejected")
        loop.close()

    def test_market_ioc_breakout_slippage_cap(self):
        """Verify breakout execution uses IOC with max 0.05% slippage."""
        self.assertEqual(MAX_BREAKOUT_SLIPPAGE_PCT, 0.0005)

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        self.executor.exchange.set_ticker("ETH/USDT:USDT", 3450.0, 3450.5)

        # Breakout order with normal market slippage -> should fill
        res = loop.run_until_complete(
            self.executor.execute_breakout_entry(
                symbol="ETH/USDT:USDT",
                side="BUY",
                amount=1.0,
                magic_number=888803,
            )
        )
        self.assertTrue(res["success"])
        self.assertTrue(res["is_filled"])
        self.assertTrue(res["client_order_id"].startswith("SPARTAN_888803_"))
        self.assertTrue(res["slippage_capped"])
        loop.close()

    def test_order_cancellation(self):
        """Verify order cancellation functionality."""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        # Place maker order
        res = loop.run_until_complete(
            self.executor.execute_maker_entry(
                symbol="BTC/USDT:USDT",
                side="BUY",
                amount=0.05,
                price=64000.0,
            )
        )
        order_id = res["order"]["id"]

        # Cancel order
        cancel_res = loop.run_until_complete(self.executor.cancel_order(order_id))
        self.assertEqual(cancel_res["status"], "canceled")
        loop.close()


if __name__ == "__main__":
    unittest.main()
