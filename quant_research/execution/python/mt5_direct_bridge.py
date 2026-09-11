"""
Spartan MT5 Direct Connection Bridge (EA-less Execution Engine)
Directly connects to MetaTrader 5 via Python API without requiring EA installation.

Usage:
  python mt5_direct_bridge.py --login 98240291 --password "SecretPass123" --server "Exness-Real21" --symbol "XAUUSD"
"""

import sys
import os
import time
import json
import argparse
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone

# Add parent directory to path for relative imports if needed
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from webhook_client import SpartanWebhookClient, DEFAULT_WEBHOOK_URL

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("spartan.mt5_direct_bridge")

# Try importing MetaTrader5 package
MT5_AVAILABLE = False
try:
    import MetaTrader5 as mt5
    MT5_AVAILABLE = True
except ImportError:
    mt5 = None
    logger.warning("MetaTrader5 python package not installed. Bridge running in simulation mode.")


class SpartanMt5DirectBridge:
    def __init__(
        self,
        account_number: int,
        password: str,
        server: str,
        symbol: str = "XAUUSD",
        webhook_key: str = "spartan_sec_ea_888999",
        webhook_url: str = DEFAULT_WEBHOOK_URL,
    ):
        self.account_number = account_number
        self.password = password
        self.server = server
        self.symbol = symbol.upper()
        self.webhook_client = SpartanWebhookClient(api_key=webhook_key, server_url=webhook_url)
        self.is_connected = False
        self.last_heartbeat_time = 0.0

    def connect(self) -> Dict[str, Any]:
        """Establish direct MT5 terminal connection and login to account."""
        if not MT5_AVAILABLE:
            logger.info("Simulation connection established for MT5 Account %d on %s", self.account_number, self.server)
            self.is_connected = True
            return {
                "success": True,
                "mode": "SIMULATION",
                "accountNumber": str(self.account_number),
                "server": self.server,
                "broker": "Exness (Simulated)",
                "balance": 50000.0,
                "equity": 50245.80,
                "margin": 1500.0,
                "freeMargin": 48745.80,
                "marginLevel": 3349.72,
                "floatingProfit": 245.80,
                "openPositions": 1,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

        # Initialize MT5 Terminal
        if not mt5.initialize():
            err_code, err_str = mt5.last_error()
            logger.error("MT5 terminal initialize failed: [%d] %s", err_code, err_str)
            return {
                "success": False,
                "error": f"MT5 terminal initialize failed: [{err_code}] {err_str}"
            }

        # Perform Login
        authorized = mt5.login(
            login=self.account_number,
            password=self.password,
            server=self.server
        )

        if not authorized:
            err_code, err_str = mt5.last_error()
            logger.error("MT5 Account login failed for %d on %s: [%d] %s", self.account_number, self.server, err_code, err_str)
            mt5.shutdown()
            return {
                "success": False,
                "error": f"Tài khoản MT5 hoặc Server không chính xác! [{err_code}] {err_str}"
            }

        account_info = mt5.account_info()
        if account_info is None:
            mt5.shutdown()
            return {
                "success": False,
                "error": "Không thể truy xuất thông tin tài khoản MT5 sau khi đăng nhập!"
            }

        self.is_connected = True
        logger.info("Successfully connected to MT5 Account #%d (%s) - Balance: $%.2f",
                    account_info.login, account_info.company, account_info.balance)

        # Select target symbol
        mt5.symbol_select(self.symbol, True)

        return {
            "success": True,
            "mode": "LIVE_MT5_API",
            "accountNumber": str(account_info.login),
            "server": account_info.server,
            "broker": account_info.company,
            "balance": float(account_info.balance),
            "equity": float(account_info.equity),
            "margin": float(account_info.margin),
            "freeMargin": float(account_info.margin_free),
            "marginLevel": float(account_info.margin_level) if account_info.margin > 0 else 0.0,
            "floatingProfit": float(account_info.profit),
            "openPositions": len(mt5.positions_get() or []),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    def sync_heartbeat(self) -> Dict[str, Any]:
        """Fetch current MT5 account metrics and broadcast heartbeat telemetry."""
        if not self.is_connected:
            conn_res = self.connect()
            if not conn_res.get("success"):
                return conn_res

        if not MT5_AVAILABLE:
            res = self.webhook_client.report_heartbeat(
                account_number=str(self.account_number),
                broker="Exness",
                server=self.server,
                balance=50000.0,
                equity=50245.80,
                floating_profit=245.80,
                margin=1500.0,
                free_margin=48745.80,
                margin_level=3349.72,
                open_positions=1
            )
            return res

        acc = mt5.account_info()
        if acc is None:
            return {"success": False, "error": "Lost connection to MT5 terminal"}

        open_positions = len(mt5.positions_get() or [])

        res = self.webhook_client.report_heartbeat(
            account_number=str(acc.login),
            broker=str(acc.company),
            server=str(acc.server),
            balance=float(acc.balance),
            equity=float(acc.equity),
            floating_profit=float(acc.profit),
            margin=float(acc.margin),
            free_margin=float(acc.margin_free),
            margin_level=float(acc.margin_level) if acc.margin > 0 else 0.0,
            open_positions=open_positions
        )
        self.last_heartbeat_time = time.time()
        return res

    def disconnect(self) -> None:
        if MT5_AVAILABLE and self.is_connected:
            mt5.shutdown()
        self.is_connected = False
        logger.info("MT5 Direct Bridge disconnected.")


def main():
    parser = argparse.ArgumentParser(description="Spartan Direct MT5 Connection Bridge")
    parser.add_argument("--login", type=int, required=True, help="MT5 Account Number")
    parser.add_argument("--password", type=str, required=True, help="MT5 Trading Password")
    parser.add_argument("--server", type=str, required=True, help="MT5 Broker Server")
    parser.add_argument("--symbol", type=str, default="XAUUSD", help="Trading Symbol")
    parser.add_argument("--key", type=str, default="spartan_sec_ea_888999", help="Spartan Webhook Secret Key")
    parser.add_argument("--action", type=str, default="test", choices=["test", "daemon"], help="Run single test or daemon loop")

    args = parser.parse_args()

    bridge = SpartanMt5DirectBridge(
        account_number=args.login,
        password=args.password,
        server=args.server,
        symbol=args.symbol,
        webhook_key=args.key
    )

    if args.action == "test":
        result = bridge.connect()
        print(json.dumps(result, indent=2))
        if result.get("success"):
            hb = bridge.sync_heartbeat()
            print("Heartbeat telemetry result:", json.dumps(hb, indent=2))
        bridge.disconnect()
    else:
        logger.info("Starting Direct MT5 Bridge Daemon loop for Account %d...", args.login)
        conn_res = bridge.connect()
        print(json.dumps(conn_res, indent=2))
        if not conn_res.get("success"):
            sys.exit(1)

        try:
            while True:
                hb_res = bridge.sync_heartbeat()
                logger.info("Synced MT5 telemetry: %s", hb_res.get("success"))
                time.sleep(5)
        except KeyboardInterrupt:
            logger.info("Stopping Direct MT5 Bridge Daemon...")
        finally:
            bridge.disconnect()

if __name__ == "__main__":
    main()
