"""Abstract Base Class for Spartan Quantitative Alpha Models."""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Union
import pandas as pd

from quant_research.core.constants import OrderAction, RegimeState
from quant_research.core.logger import get_logger
from quant_research.core.types import SignalDict

logger = get_logger("spartan_base_model")


class BaseQuantModel(ABC):
    """
    Abstract Base Class for all Spartan Quantitative Alpha Models.
    
    Enforces standardized interfaces for:
    - Signal generation gated by Market Regime (M1 ↔ M2 contract)
    - Dynamic Trailing Stop management (M2 ↔ M3 contract)
    - Institutional telemetry and parameter audit logging
    """

    def __init__(
        self,
        name: str,
        magic_number: int,
        strategy_code: int,
        permitted_regimes: Optional[List[Union[RegimeState, str]]] = None,
        **kwargs: Any,
    ) -> None:
        self.name: str = name
        self.magic_number: int = magic_number
        self.strategy_code: int = strategy_code
        
        # Normalize permitted regimes to list of RegimeState
        norm_regimes: List[RegimeState] = []
        if permitted_regimes is not None:
            for r in permitted_regimes:
                if isinstance(r, RegimeState):
                    norm_regimes.append(r)
                elif isinstance(r, str):
                    try:
                        norm_regimes.append(RegimeState(r))
                    except ValueError:
                        logger.warning(f"Unknown regime string: {r}")
        self.permitted_regimes: List[RegimeState] = norm_regimes
        self.params: Dict[str, Any] = kwargs

    def is_regime_permitted(self, current_regime: Union[RegimeState, str]) -> bool:
        """Check if signal generation is permitted under current regime."""
        if not self.permitted_regimes:
            return True  # If not restricted, all regimes permitted
        if isinstance(current_regime, str):
            try:
                current_regime = RegimeState(current_regime)
            except ValueError:
                return False
        return current_regime in self.permitted_regimes

    def validate_data(
        self,
        data: pd.DataFrame,
        min_bars: int = 30,
        required_cols: Optional[List[str]] = None,
    ) -> bool:
        """Verify dataframe integrity, column availability, and minimum bar requirements."""
        if data is None or not isinstance(data, pd.DataFrame):
            return False
        if len(data) < min_bars:
            return False
        
        req = required_cols or ["open", "high", "low", "close", "volume"]
        cols = set(data.columns.str.lower())
        return all(c.lower() in cols for c in req)

    def build_signal(
        self,
        action: Union[OrderAction, str],
        symbol: str,
        entry_price: float,
        stop_loss: float,
        take_profit: float,
        regime: Union[RegimeState, str],
        comment: str = "",
        magic_number: Optional[int] = None,
    ) -> SignalDict:
        """Construct a standardized and strictly validated SignalDict contract."""
        action_str = action.value if isinstance(action, OrderAction) else str(action).upper()
        regime_str = regime.value if isinstance(regime, RegimeState) else str(regime)
        
        return SignalDict(
            action=action_str,  # type: ignore[typeddict-item]
            symbol=str(symbol).upper(),
            entry_price=round(float(entry_price), 6),
            stop_loss=round(float(stop_loss), 6),
            take_profit=round(float(take_profit), 6),
            magic_number=int(magic_number or self.magic_number),
            regime=regime_str,
            comment=str(comment)[:100],
        )

    @abstractmethod
    def generate_signal(
        self,
        data: pd.DataFrame,
        current_regime: Union[RegimeState, str],
        **kwargs: Any,
    ) -> Optional[SignalDict]:
        """
        Evaluate market data and return an approved Alpha Signal or None.
        
        Parameters:
        -----------
        data : pd.DataFrame
            OHLCV bar data with columns: open, high, low, close, volume (and optional spread).
        current_regime : Union[RegimeState, str]
            Current regime evaluated by MRDE FSM.
        **kwargs : Any
            Additional context (e.g. secondary symbol data, account status, etc.).
            
        Returns:
        --------
        Optional[SignalDict]
            Actionable trade signal or None if no valid setup / regime blocked.
        """
        pass

    @abstractmethod
    def update_trailing_stop(
        self,
        position: Dict[str, Any],
        current_bar: Union[pd.Series, Dict[str, Any]],
        **kwargs: Any,
    ) -> Optional[float]:
        """
        Calculate updated trailing stop price for an active position.
        
        Parameters:
        -----------
        position : Dict[str, Any]
            Active position dictionary with:
            - side / type: 'BUY' or 'SELL'
            - entry_price: float
            - current_stop: float
            - take_profit: float
            - highest_price: float (optional)
            - lowest_price: float (optional)
        current_bar : Union[pd.Series, Dict[str, Any]]
            Latest closed or forming bar.
            
        Returns:
        --------
        Optional[float]
            New ratcheted stop price, or None if stop remains unchanged.
        """
        pass
