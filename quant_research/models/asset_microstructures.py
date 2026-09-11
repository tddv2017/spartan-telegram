"""Asset-Specific Microstructure Models & Validation Handlers (Feature 10)."""

from dataclasses import dataclass, field
from enum import Enum
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
import pandas as pd
import yaml

from quant_research.core.logger import get_logger

logger = get_logger("spartan_asset_microstructures")


class AssetClass(str, Enum):
    """Institutional Asset Classes."""
    METALS = "metals"
    CRYPTO = "crypto"
    FOREX = "forex"


@dataclass
class AssetMicrostructure:
    """
    Institutional Asset Microstructure Specification and Execution Safeguards.
    """
    symbol: str
    asset_class: AssetClass
    asset_code: int
    contract_size: float
    tick_size: float
    tick_value: float
    pip_size: float
    pip_value: float
    min_lot: float = 0.01
    max_lot: float = 50.0
    lot_step: float = 0.01
    base_currency: str = "USD"
    quote_currency: str = "USD"
    margin_currency: str = "USD"
    leverage: float = 100.0
    baseline_spread: float = 0.20
    max_spread_multiplier: float = 1.80
    stop_loss_atr_mult: float = 2.50
    stop_loss_atr_min: float = 2.0
    stop_loss_atr_max: float = 3.5
    trading_schedule: str = "24/5"
    max_funding_rate: float = 0.0005  # 0.05% per 8h
    commission_per_lot: float = 0.0
    news_blackout_pre_mins: int = 30
    news_blackout_post_mins: int = 15

    def calculate_pip_value(self, lots: float = 1.0) -> float:
        """
        Calculate total USD value per 1 pip move for given lot size.
        E.g. EURUSD 1 lot = 100,000 * 0.0001 = $10.00.
        XAUUSD 1 lot = 100 * 0.1 = $10.00.
        """
        return float(lots * self.contract_size * self.pip_size)

    def calculate_pnl(
        self,
        action: str,
        entry_price: float,
        exit_price: float,
        lots: float = 1.0,
    ) -> float:
        """
        Calculate absolute profit/loss in USD for trade execution.
        """
        is_buy = str(action).upper().startswith("BUY")
        price_diff = (exit_price - entry_price) if is_buy else (entry_price - exit_price)
        gross_pnl = lots * self.contract_size * price_diff
        return float(round(gross_pnl, 4))

    def is_spread_acceptable(self, current_spread: float, avg_spread: float) -> bool:
        """
        Forex & Multi-Asset Spread Gate:
        Rejects entry if current spread exceeds max_spread_multiplier * avg_spread.
        Boundary: 1.80x is allowed, 1.81x is blocked.
        """
        if avg_spread <= 0:
            return True
        return float(current_spread) <= float(self.max_spread_multiplier * avg_spread)

    def is_funding_rate_acceptable(self, funding_rate: float) -> bool:
        """
        Crypto Funding Rate Cost Gate:
        Invalidates trades if absolute 8h funding rate > max_funding_rate (0.05%).
        Boundary: 0.050% allowed, 0.051% gated.
        """
        return abs(float(funding_rate)) <= float(self.max_funding_rate)

    def is_market_open(self, timestamp: Optional[pd.Timestamp] = None) -> bool:
        """
        Check if trading is permitted at given timestamp based on schedule.
        Crypto trades 24/7/365. Metals & Forex closed on weekends.
        """
        if self.trading_schedule == "24/7":
            return True
        
        ts = timestamp if timestamp is not None else pd.Timestamp.utcnow()
        day_of_week = ts.dayofweek  # 0=Mon, 4=Fri, 5=Sat, 6=Sun
        
        if self.trading_schedule in ("24/5", "23/5"):
            # Saturday is closed
            if day_of_week == 5:
                return False
            # Sunday before 22:00 / 23:00 UTC is closed
            if day_of_week == 6 and ts.hour < 22:
                return False
            # Friday after 22:00 UTC is closed
            if day_of_week == 4 and ts.hour >= 22:
                return False
        return True

    def is_news_blackout(
        self,
        current_time: pd.Timestamp,
        news_calendar: Optional[List[Any]] = None,
    ) -> bool:
        """
        Check if current timestamp falls within the News Blackout Window:
        [event_time - 30 mins, event_time + 15 mins].
        """
        if not news_calendar:
            return False
            
        current_ts = pd.Timestamp(current_time)
        pre_delta = pd.Timedelta(minutes=self.news_blackout_pre_mins)
        post_delta = pd.Timedelta(minutes=self.news_blackout_post_mins)

        for event in news_calendar:
            if isinstance(event, (pd.Timestamp, str)):
                event_ts = pd.Timestamp(event)
            elif isinstance(event, dict) and "timestamp" in event:
                event_ts = pd.Timestamp(event["timestamp"])
            else:
                continue
                
            start_blackout = event_ts - pre_delta
            end_blackout = event_ts + post_delta
            if start_blackout <= current_ts <= end_blackout:
                return True
        return False


class AssetMicrostructureRegistry:
    """
    Central Registry for Asset Microstructures across the Spartan Universe.
    """

    _DEFAULT_CONFIGS: Dict[str, Dict[str, Any]] = {
        "XAUUSD": {
            "symbol": "XAUUSD",
            "asset_class": AssetClass.METALS,
            "asset_code": 1,
            "contract_size": 100.0,
            "tick_size": 0.01,
            "tick_value": 1.0,
            "pip_size": 0.1,
            "pip_value": 10.0,
            "min_lot": 0.01,
            "max_lot": 50.0,
            "lot_step": 0.01,
            "leverage": 100.0,
            "baseline_spread": 0.20,
            "max_spread_multiplier": 1.80,
            "stop_loss_atr_mult": 3.0,
            "stop_loss_atr_min": 2.5,
            "stop_loss_atr_max": 3.5,
            "trading_schedule": "23/5",
            "commission_per_lot": 5.0,
        },
        "BTCUSDT": {
            "symbol": "BTCUSDT",
            "asset_class": AssetClass.CRYPTO,
            "asset_code": 8,
            "contract_size": 1.0,
            "tick_size": 0.10,
            "tick_value": 0.10,
            "pip_size": 1.0,
            "pip_value": 1.0,
            "min_lot": 0.001,
            "max_lot": 20.0,
            "lot_step": 0.001,
            "leverage": 20.0,
            "baseline_spread": 5.0,
            "max_spread_multiplier": 1.80,
            "stop_loss_atr_mult": 2.5,
            "stop_loss_atr_min": 2.0,
            "stop_loss_atr_max": 3.0,
            "trading_schedule": "24/7",
            "max_funding_rate": 0.0005,
        },
        "ETHUSDT": {
            "symbol": "ETHUSDT",
            "asset_class": AssetClass.CRYPTO,
            "asset_code": 9,
            "contract_size": 1.0,
            "tick_size": 0.01,
            "tick_value": 0.01,
            "pip_size": 0.10,
            "pip_value": 0.10,
            "min_lot": 0.01,
            "max_lot": 50.0,
            "lot_step": 0.01,
            "leverage": 20.0,
            "baseline_spread": 0.30,
            "max_spread_multiplier": 1.80,
            "stop_loss_atr_mult": 2.5,
            "stop_loss_atr_min": 2.0,
            "stop_loss_atr_max": 3.0,
            "trading_schedule": "24/7",
            "max_funding_rate": 0.0005,
        },
        "EURUSD": {
            "symbol": "EURUSD",
            "asset_class": AssetClass.FOREX,
            "asset_code": 2,
            "contract_size": 100000.0,
            "tick_size": 0.00001,
            "tick_value": 1.0,
            "pip_size": 0.0001,
            "pip_value": 10.0,
            "min_lot": 0.01,
            "max_lot": 50.0,
            "lot_step": 0.01,
            "leverage": 100.0,
            "baseline_spread": 0.00005,
            "max_spread_multiplier": 1.80,
            "stop_loss_atr_mult": 1.5,
            "stop_loss_atr_min": 1.2,
            "stop_loss_atr_max": 1.8,
            "trading_schedule": "24/5",
            "commission_per_lot": 5.0,
        },
        "GBPUSD": {
            "symbol": "GBPUSD",
            "asset_class": AssetClass.FOREX,
            "asset_code": 3,
            "contract_size": 100000.0,
            "tick_size": 0.00001,
            "tick_value": 1.0,
            "pip_size": 0.0001,
            "pip_value": 10.0,
            "min_lot": 0.01,
            "max_lot": 50.0,
            "lot_step": 0.01,
            "leverage": 100.0,
            "baseline_spread": 0.00008,
            "max_spread_multiplier": 1.80,
            "stop_loss_atr_mult": 1.5,
            "stop_loss_atr_min": 1.2,
            "stop_loss_atr_max": 1.8,
            "trading_schedule": "24/5",
            "commission_per_lot": 5.0,
        },
    }

    def __init__(self, config_path: Optional[Union[str, Path]] = None) -> None:
        self._microstructures: Dict[str, AssetMicrostructure] = {}
        self._load_defaults()
        if config_path:
            self._load_yaml(config_path)

    def _load_defaults(self) -> None:
        for sym, cfg in self._DEFAULT_CONFIGS.items():
            self._microstructures[sym.upper()] = AssetMicrostructure(**cfg)

    def _load_yaml(self, path: Union[str, Path]) -> None:
        p = Path(path)
        if not p.exists():
            return
        try:
            with open(p, "r", encoding="utf-8") as f:
                raw = yaml.safe_load(f)
            assets_data = raw.get("assets", {})
            for sym, data in assets_data.items():
                cls_str = data.get("asset_class", "metals").lower()
                ac = AssetClass(cls_str) if cls_str in AssetClass.__members__.values() else AssetClass.METALS
                
                # Update or create microstructure
                existing = self._microstructures.get(sym.upper())
                cfg_dict = existing.__dict__.copy() if existing else self._DEFAULT_CONFIGS.get("XAUUSD", {}).copy()
                cfg_dict["symbol"] = sym.upper()
                cfg_dict["asset_class"] = ac
                for k, v in data.items():
                    if k != "asset_class" and hasattr(AssetMicrostructure, k):
                        cfg_dict[k] = v
                self._microstructures[sym.upper()] = AssetMicrostructure(**cfg_dict)
        except Exception as e:
            logger.warning(f"Failed to load yaml config from {p}: {e}")

    def get(self, symbol: str) -> AssetMicrostructure:
        """Retrieve microstructure by symbol, falling back to Gold specification."""
        sym_clean = symbol.upper().replace("/", "")
        if sym_clean in self._microstructures:
            return self._microstructures[sym_clean]
        
        # Heuristic matching
        if "XAU" in sym_clean or "GOLD" in sym_clean:
            return self._microstructures["XAUUSD"]
        if "BTC" in sym_clean:
            return self._microstructures["BTCUSDT"]
        if "ETH" in sym_clean:
            return self._microstructures["ETHUSDT"]
        if "GBP" in sym_clean:
            return self._microstructures["GBPUSD"]
        if "EUR" in sym_clean:
            return self._microstructures["EURUSD"]
            
        return self._microstructures["XAUUSD"]


# Global default instance
default_registry = AssetMicrostructureRegistry()


def get_microstructure(symbol: str) -> AssetMicrostructure:
    """Convenience helper to fetch microstructure specification for a symbol."""
    return default_registry.get(symbol)
