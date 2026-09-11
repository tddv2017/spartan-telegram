"""Spartan Quantitative Trading System - Fractional Kelly Sizing Engine (Feature 11).

Mathematical Implementation:
    Classical Full Kelly:
        K = (p * b - q) / b
        where:
            p = Win Rate
            q = 1 - p (Loss Rate)
            b = Win/Loss Payoff Ratio (Average Win / Average Loss)

    Calibrated Fractional Kelly:
        f* = Clamp(c * K, min_risk, max_risk)
        where:
            c ≈ 0.0125 (1/25th fractional Kelly)
            0.25% <= f* <= 0.50% of Total Equity

    Sizing Formula:
        Cash Risk ($) = Equity * f*
        Distance to SL = |Entry Price - Stop Loss|
        Raw Lots = Cash Risk / ((Distance to SL / Tick Size) * Tick Value)
        Stepped Lots = floor(Raw Lots / Lot Step) * Lot Step
        Clamped Lots = max(Min Lot, min(Max Lot, Stepped Lots))

    Margin Headroom Check:
        Required Margin <= 10% * Free Margin
"""

import math
import os
from typing import Any, Dict, Optional
import yaml

from quant_research.core.logger import get_logger

logger = get_logger("kelly_calculator")


class KellyCalculator:
    """Institutional Fractional Kelly Position Sizing and Margin Headroom Calculator."""

    def __init__(
        self,
        config_path: Optional[str] = None,
        assets_path: Optional[str] = None,
        scaling_factor: float = 0.0125,
        min_risk_per_trade: float = 0.0025,
        max_risk_per_trade: float = 0.0050,
        max_margin_per_trade_pct: float = 0.10,
    ) -> None:
        """Initialize Kelly Calculator with institutional config or robust defaults."""
        self.scaling_factor = scaling_factor
        self.min_risk_per_trade = min_risk_per_trade
        self.max_risk_per_trade = max_risk_per_trade
        self.max_margin_per_trade_pct = max_margin_per_trade_pct
        self.asset_specs: Dict[str, Dict[str, Any]] = {}

        # Resolve project root for config paths
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        risk_cfg_path = config_path or os.path.join(base_dir, "config", "risk_profiles.yaml")
        asset_cfg_path = assets_path or os.path.join(base_dir, "config", "assets.yaml")

        self._load_risk_config(risk_cfg_path)
        self._load_asset_specs(asset_cfg_path)

    def _load_risk_config(self, path: str) -> None:
        """Load risk profile configuration if file exists."""
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    cfg = yaml.safe_load(f) or {}
                pos_cfg = cfg.get("position_sizing", {})
                self.scaling_factor = float(pos_cfg.get("kelly_scaling_factor", self.scaling_factor))
                self.min_risk_per_trade = float(pos_cfg.get("min_risk_per_trade", self.min_risk_per_trade))
                self.max_risk_per_trade = float(pos_cfg.get("max_risk_per_trade", self.max_risk_per_trade))
                self.max_margin_per_trade_pct = float(
                    pos_cfg.get("max_margin_per_trade_pct", self.max_margin_per_trade_pct)
                )
            except Exception as e:
                logger.warning(f"Failed to load risk profile from {path}: {e}. Using defaults.")

    def _load_asset_specs(self, path: str) -> None:
        """Load asset microstructure specifications if file exists."""
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    cfg = yaml.safe_load(f) or {}
                self.asset_specs = cfg.get("assets", {})
            except Exception as e:
                logger.warning(f"Failed to load asset specs from {path}: {e}.")

    def get_asset_spec(self, symbol: str) -> Dict[str, Any]:
        """Retrieve microstructure specification for a symbol, or institutional defaults."""
        sym_clean = symbol.upper().replace("/", "").replace("-", "")
        if sym_clean in self.asset_specs:
            return self.asset_specs[sym_clean]

        # Default standard institutional fallback specs
        if "XAU" in sym_clean or "GOLD" in sym_clean:
            return {
                "contract_size": 100.0,
                "tick_size": 0.01,
                "tick_value": 1.0,
                "pip_size": 0.1,
                "pip_value": 10.0,
                "min_lot": 0.01,
                "max_lot": 50.0,
                "lot_step": 0.01,
                "leverage": 100.0,
            }
        elif "BTC" in sym_clean:
            return {
                "contract_size": 1.0,
                "tick_size": 0.10,
                "tick_value": 0.10,
                "pip_size": 1.0,
                "pip_value": 1.0,
                "min_lot": 0.001,
                "max_lot": 20.0,
                "lot_step": 0.001,
                "leverage": 20.0,
            }
        elif "ETH" in sym_clean:
            return {
                "contract_size": 1.0,
                "tick_size": 0.01,
                "tick_value": 0.01,
                "pip_size": 0.10,
                "pip_value": 0.10,
                "min_lot": 0.01,
                "max_lot": 50.0,
                "lot_step": 0.01,
                "leverage": 20.0,
            }
        else:
            # Forex Major default (EURUSD / GBPUSD)
            return {
                "contract_size": 100000.0,
                "tick_size": 0.00001,
                "tick_value": 1.0,
                "pip_size": 0.0001,
                "pip_value": 10.0,
                "min_lot": 0.01,
                "max_lot": 50.0,
                "lot_step": 0.01,
                "leverage": 100.0,
            }

    def calculate_fractional_kelly(
        self,
        win_rate: float,
        profit_payoff_ratio: float,
        calibration_factor: Optional[float] = None,
        min_risk: Optional[float] = None,
        max_risk: Optional[float] = None,
    ) -> float:
        """
        Calculate calibrated fractional Kelly equity risk fraction.

        Formula:
            K = (p * b - q) / b
            f* = Clamp(c * K, min_risk, max_risk)

        Args:
            win_rate: Historical win rate p (0.0 to 1.0).
            profit_payoff_ratio: Win/loss payoff ratio b = avg_win / avg_loss.
            calibration_factor: Multiplier c (defaults to self.scaling_factor).
            min_risk: Minimum risk fraction (default 0.0025 = 0.25%).
            max_risk: Maximum risk fraction (default 0.0050 = 0.50%).

        Returns:
            f*: Equity risk fraction clamped to [min_risk, max_risk], or 0.0 on negative edge.
        """
        p = float(win_rate)
        b = float(profit_payoff_ratio)
        c = float(calibration_factor if calibration_factor is not None else self.scaling_factor)
        r_min = float(min_risk if min_risk is not None else self.min_risk_per_trade)
        r_max = float(max_risk if max_risk is not None else self.max_risk_per_trade)

        # Edge checks
        if b <= 0.0 or p <= 0.0:
            return 0.0

        q = 1.0 - p
        raw_kelly = (p * b - q) / b

        # If raw Kelly is non-positive, edge is negative -> zero risk (abort trade)
        if raw_kelly <= 0.0:
            return 0.0

        calibrated = raw_kelly * c
        clamped = max(r_min, min(r_max, calibrated))
        return round(clamped, 6)

    def calculate_lot_size(
        self,
        equity: float,
        risk_fraction: float,
        entry_price: float,
        stop_loss: float,
        symbol: Optional[str] = None,
        contract_size: Optional[float] = None,
        tick_size: Optional[float] = None,
        tick_value: Optional[float] = None,
        lot_step: Optional[float] = None,
        min_lot: Optional[float] = None,
        max_lot: Optional[float] = None,
    ) -> float:
        """
        Calculate execution lot size from cash risk and stop-loss distance.

        Formula:
            Cash Risk = Equity * risk_fraction
            Distance = |entry_price - stop_loss|
            Points = Distance / tick_size
            Cost Per Lot = Points * tick_value
            Raw Lots = Cash Risk / Cost Per Lot
            Stepped Lots = floor(Raw Lots / lot_step) * lot_step
            Clamped Lots = max(min_lot, min(max_lot, Stepped Lots))

        Returns:
            Lot size bounded to [min_lot, max_lot], or 0.0 if zero distance / zero risk.
        """
        if equity <= 0.0 or risk_fraction <= 0.0:
            return 0.0

        distance = abs(float(entry_price) - float(stop_loss))
        if distance < 1e-7:
            return 0.0

        # Retrieve symbol specs if not explicitly provided
        spec = self.get_asset_spec(symbol) if symbol else {}
        c_size = float(contract_size if contract_size is not None else spec.get("contract_size", 100.0))
        t_size = float(tick_size if tick_size is not None else spec.get("tick_size", 0.01))
        t_value = float(tick_value if tick_value is not None else spec.get("tick_value", 1.0))
        l_step = float(lot_step if lot_step is not None else spec.get("lot_step", 0.01))
        l_min = float(min_lot if min_lot is not None else spec.get("min_lot", 0.01))
        l_max = float(max_lot if max_lot is not None else spec.get("max_lot", 50.0))

        if t_size <= 0.0 or t_value <= 0.0 or l_step <= 0.0:
            return 0.0

        cash_risk = float(equity) * float(risk_fraction)
        points = distance / t_size
        cost_per_lot = points * t_value

        if cost_per_lot <= 0.0:
            return 0.0

        raw_lots = cash_risk / cost_per_lot
        # Step quantization using floor with epsilon to avoid floating point inaccuracies
        stepped_lots = math.floor((raw_lots / l_step) + 1e-9) * l_step
        # Strict institutional clamping to broker limits
        clamped_lots = max(l_min, min(l_max, stepped_lots))

        # Precision formatting based on step
        decimals = max(0, -int(math.floor(math.log10(l_step) + 1e-9))) if l_step < 1.0 else 0
        return round(clamped_lots, decimals)

    def calculate_required_margin(
        self,
        symbol: str,
        lots: float,
        price: float,
        leverage: Optional[float] = None,
        contract_size: Optional[float] = None,
    ) -> float:
        """
        Calculate margin requirement for a position.

        Formula:
            Required Margin = (lots * contract_size * price) / leverage
        """
        if lots <= 0.0 or price <= 0.0:
            return 0.0

        spec = self.get_asset_spec(symbol)
        c_size = float(contract_size if contract_size is not None else spec.get("contract_size", 100.0))
        lev = float(leverage if leverage is not None else spec.get("leverage", 100.0))
        if lev <= 0.0:
            lev = 100.0

        return (float(lots) * c_size * float(price)) / lev

    def check_margin_headroom(
        self,
        required_margin: float,
        free_margin: float,
        max_margin_pct: Optional[float] = None,
    ) -> bool:
        """
        Verify that required margin does not exceed acceptable threshold of free margin.

        Standard Rule: Required Margin <= 10% * Free Margin.
        """
        if free_margin <= 0.0 or required_margin < 0.0:
            return False

        threshold = float(max_margin_pct if max_margin_pct is not None else self.max_margin_per_trade_pct)
        return float(required_margin) <= (threshold * float(free_margin))

    def evaluate_position_sizing(
        self,
        symbol: str,
        equity: float,
        free_margin: float,
        entry_price: float,
        stop_loss: float,
        win_rate: float = 0.60,
        payoff_ratio: float = 1.50,
        risk_multiplier: float = 1.0,
        calibration_factor: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Comprehensive position sizing evaluation combining Kelly sizing, lot clamping, and margin check.

        Returns:
            Dict containing:
                approved: bool
                lots: float
                risk_fraction: float
                cash_risk: float
                required_margin: float
                reason: str
        """
        if equity <= 0.0:
            return {
                "approved": False,
                "lots": 0.0,
                "risk_fraction": 0.0,
                "cash_risk": 0.0,
                "required_margin": 0.0,
                "reason": "EQUITY_NON_POSITIVE",
            }

        # Step 1: Base Fractional Kelly
        base_f_star = self.calculate_fractional_kelly(
            win_rate=win_rate,
            profit_payoff_ratio=payoff_ratio,
            calibration_factor=calibration_factor,
        )
        if base_f_star <= 0.0:
            return {
                "approved": False,
                "lots": 0.0,
                "risk_fraction": 0.0,
                "cash_risk": 0.0,
                "required_margin": 0.0,
                "reason": "NEGATIVE_OR_ZERO_EDGE",
            }

        # Step 2: Scale by Risk Governor Multiplier (e.g., 0.5 under Tier 2 Soft Throttle)
        effective_f_star = base_f_star * max(0.0, min(1.0, float(risk_multiplier)))
        if effective_f_star <= 0.0:
            return {
                "approved": False,
                "lots": 0.0,
                "risk_fraction": 0.0,
                "cash_risk": 0.0,
                "required_margin": 0.0,
                "reason": "RISK_MULTIPLIER_ZERO",
            }

        # Step 3: Compute lot size
        lots = self.calculate_lot_size(
            equity=equity,
            risk_fraction=effective_f_star,
            entry_price=entry_price,
            stop_loss=stop_loss,
            symbol=symbol,
        )
        if lots <= 0.0:
            return {
                "approved": False,
                "lots": 0.0,
                "risk_fraction": effective_f_star,
                "cash_risk": 0.0,
                "required_margin": 0.0,
                "reason": "INVALID_LOT_SIZE",
            }

        # Step 4: Check margin headroom
        req_margin = self.calculate_required_margin(symbol=symbol, lots=lots, price=entry_price)
        margin_ok = self.check_margin_headroom(req_margin, free_margin)
        if not margin_ok:
            return {
                "approved": False,
                "lots": lots,
                "risk_fraction": effective_f_star,
                "cash_risk": equity * effective_f_star,
                "required_margin": req_margin,
                "reason": "MARGIN_HEADROOM_EXCEEDED",
            }

        return {
            "approved": True,
            "lots": lots,
            "risk_fraction": effective_f_star,
            "cash_risk": equity * effective_f_star,
            "required_margin": req_margin,
            "reason": "APPROVED",
        }
