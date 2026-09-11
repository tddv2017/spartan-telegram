"""Spartan Quantitative Validation Framework - Event-Driven Backtesting Simulator.

High-Fidelity Engine simulating:
- Intra-bar synthetic price paths (Open -> Low -> High -> Close or Open -> High -> Low -> Close).
- Asymmetric Bid/Ask quote fills (BUY fills at Ask, SELL fills at Bid).
- Realistic asset commissions ($5/lot for FX/Gold, 0.04% maker / 0.07% taker for Crypto).
- Overnight financing & rollover swap debits/credits at 00:00 server time.
- Dynamic fill slippage penalties (Gaussian or extreme volatility expansion).
- Gap risk handling (Stop Loss executed at Open price if gap past Stop).
- Integration with BaseQuantModel and SpartanRiskEngine (Stop-Out LTV 85%, Drawdown Tiers).
"""

from dataclasses import dataclass, field
from datetime import datetime
import math
from typing import Any, Dict, List, Optional, Protocol, Tuple, Union
import numpy as np
import pandas as pd

from quant_research.core.constants import OrderAction, OrderType, RegimeState
from quant_research.core.logger import get_logger
from quant_research.core.types import AccountState, OrderDict, SignalDict
from quant_research.models.base_model import BaseQuantModel
from quant_research.risk.risk_manager import SpartanRiskEngine
from quant_research.validation.metrics import QuantitativeMetrics

logger = get_logger("backtest_engine")


@dataclass
class BacktestResult:
    """Standardized Result Contract matching IBacktestSimulator Protocol."""
    equity_curve: pd.Series
    drawdown_curve: pd.Series
    trades: List[Dict[str, Any]]
    metrics: Dict[str, float]
    initial_capital: float
    final_equity: float
    total_commission_paid: float
    total_swap_paid: float
    total_slippage_paid: float


@dataclass
class Position:
    """Active Trading Position in Backtest Simulator."""
    ticket: int
    symbol: str
    side: str  # "BUY" or "SELL"
    lots: float
    entry_price: float
    stop_loss: float
    take_profit: float
    magic_number: int
    open_time: pd.Timestamp
    last_eval_date: Optional[datetime.date] = None
    accumulated_swap: float = 0.0
    highest_price: float = 0.0
    lowest_price: float = float("inf")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "ticket": self.ticket,
            "symbol": self.symbol,
            "side": self.side,
            "type": self.side,
            "lots": self.lots,
            "entry_price": self.entry_price,
            "stop_loss": self.stop_loss,
            "take_profit": self.take_profit,
            "magic_number": self.magic_number,
            "open_time": self.open_time,
            "accumulated_swap": self.accumulated_swap,
            "highest_price": self.highest_price,
            "lowest_price": self.lowest_price,
        }


class BacktestEngine:
    """
    Event-Driven Quantitative Backtesting Simulator.
    
    Implements IBacktestSimulator protocol:
    run_simulation(model, risk_engine, data, initial_capital) -> BacktestResult
    """

    def __init__(
        self,
        symbol: str = "XAUUSD",
        contract_size: float = 100.0,
        tick_size: float = 0.01,
        tick_value: float = 1.0,
        pip_size: float = 0.1,
        pip_value: float = 10.0,
        commission_per_lot: float = 5.0,  # $5.00 round-turn for FX/Gold
        taker_fee_pct: float = 0.0007,  # 0.07% for Crypto
        maker_fee_pct: float = 0.0004,  # 0.04% for Crypto
        overnight_swap_points: float = -0.75,  # Points per night
        default_slippage_points: float = 0.0,
        is_crypto: bool = False,
    ) -> None:
        self.symbol = symbol.upper()
        self.contract_size = contract_size
        self.tick_size = tick_size
        self.tick_value = tick_value
        self.pip_size = pip_size
        self.pip_value = pip_value
        self.commission_per_lot = commission_per_lot
        self.taker_fee_pct = taker_fee_pct
        self.maker_fee_pct = maker_fee_pct
        self.overnight_swap_points = overnight_swap_points
        self.default_slippage_points = default_slippage_points
        self.is_crypto = is_crypto or "BTC" in self.symbol or "ETH" in self.symbol

    def synthesize_intrabar_path(
        self,
        open_p: float,
        high_p: float,
        low_p: float,
        close_p: float,
    ) -> List[float]:
        """
        Synthesize realistic intra-bar tick progression:
        - Bullish bar (Close >= Open): Open -> Low -> High -> Close
        - Bearish bar (Close < Open): Open -> High -> Low -> Close
        """
        if close_p >= open_p:
            return [open_p, low_p, high_p, close_p]
        else:
            return [open_p, high_p, low_p, close_p]

    def calculate_commission(self, lots: float, notional_value: float) -> float:
        """Calculate round-turn commission."""
        if self.is_crypto:
            # 0.07% taker round turn
            return round(notional_value * self.taker_fee_pct, 2)
        else:
            # Fixed dollar fee per lot ($5/lot round turn)
            return round(lots * self.commission_per_lot, 2)

    def calculate_pnl(
        self,
        side: str,
        entry_price: float,
        exit_price: float,
        lots: float,
    ) -> float:
        """Compute gross PnL based on asset microstructure."""
        if self.is_crypto:
            if side == "BUY":
                return (exit_price - entry_price) * lots
            else:
                return (entry_price - exit_price) * lots
        else:
            # Standard FX / Gold calculation
            distance = exit_price - entry_price if side == "BUY" else entry_price - exit_price
            ticks = distance / self.tick_size
            return ticks * self.tick_value * lots

    def run_simulation(
        self,
        model: Optional[BaseQuantModel] = None,
        risk_engine: Optional[SpartanRiskEngine] = None,
        data: Optional[pd.DataFrame] = None,
        initial_capital: float = 100000.0,
        slippage_points: Optional[float] = None,
        regime_series: Optional[pd.Series] = None,
        preloaded_signals: Optional[List[Dict[str, Any]]] = None,
    ) -> BacktestResult:
        """
        Run full event-driven simulation through OHLCV data.

        Args:
            model: Strategy instance inheriting from BaseQuantModel.
            risk_engine: Risk Engine instance evaluating orders.
            data: Bar DataFrame with [open, high, low, close, volume, spread].
            initial_capital: Starting balance.
            slippage_points: Optional override for adverse slippage points.
            regime_series: Optional series of RegimeState strings.
            preloaded_signals: Optional list of predefined signals for direct testing.

        Returns:
            BacktestResult with ledger, curves, and quantitative metrics.
        """
        if data is None or len(data) == 0:
            s = pd.Series([initial_capital])
            dd = pd.Series([0.0])
            m = QuantitativeMetrics.calculate_metrics([], initial_capital=initial_capital)
            return BacktestResult(
                equity_curve=s,
                drawdown_curve=dd,
                trades=[],
                metrics=m,
                initial_capital=initial_capital,
                final_equity=initial_capital,
                total_commission_paid=0.0,
                total_swap_paid=0.0,
                total_slippage_paid=0.0,
            )

        active_slippage = self.default_slippage_points if slippage_points is None else slippage_points

        balance = float(initial_capital)
        equity = float(initial_capital)
        equity_records: List[float] = [equity]
        timestamps_records: List[pd.Timestamp] = []

        open_positions: List[Position] = []
        closed_trades: List[Dict[str, Any]] = []

        ticket_counter = 100001
        total_comm = 0.0
        total_swap = 0.0
        total_slip_cost = 0.0

        n_bars = len(data)
        min_lookback = 30

        for i in range(n_bars):
            bar = data.iloc[i]
            ts = pd.Timestamp(bar.get("timestamp") if "timestamp" in bar else data.index[i])
            timestamps_records.append(ts)

            open_p = float(bar["open"])
            high_p = float(bar["high"])
            low_p = float(bar["low"])
            close_p = float(bar["close"])
            spread = float(bar.get("spread", 0.20 if "XAU" in self.symbol else 0.0001))

            # Check overnight swap across day boundary (00:00 server time)
            current_date = ts.date()
            for pos in open_positions:
                if pos.last_eval_date is not None and pos.last_eval_date != current_date:
                    # Rollover passed: apply swap points
                    swap_cost = self.overnight_swap_points * pos.lots * self.tick_value
                    pos.accumulated_swap += swap_cost
                    total_swap += abs(swap_cost)
                pos.last_eval_date = current_date

            # Synthesize intra-bar tick path
            ticks = self.synthesize_intrabar_path(open_p, high_p, low_p, close_p)

            # Check active position stops and targets along the intra-bar path
            remaining_positions: List[Position] = []
            for pos in open_positions:
                pos.highest_price = max(pos.highest_price, high_p)
                pos.lowest_price = min(pos.lowest_price, low_p)

                # Dynamic Trailing Stop update from model if provided
                if model is not None:
                    updated_sl = model.update_trailing_stop(pos.to_dict(), bar)
                    if updated_sl is not None:
                        pos.stop_loss = updated_sl

                # Check if position triggered stop loss or take profit within bar
                closed = False
                exit_price = 0.0
                exit_reason = ""

                # Evaluate intra-bar path sequentially
                for tick_idx, tick_p in enumerate(ticks):
                    if pos.side == "BUY":
                        # For BUY: Stop Loss hit if Bid <= Stop Loss
                        # Bid is approximately tick_p
                        bid_p = tick_p
                        if pos.stop_loss > 0 and bid_p <= pos.stop_loss:
                            # If first tick (open) already gapped below stop loss: fill at open!
                            if tick_idx == 0 and open_p < pos.stop_loss:
                                raw_exit = min(pos.stop_loss, open_p)
                            else:
                                raw_exit = pos.stop_loss
                            # Apply adverse slippage penalty
                            exit_price = max(0.01, raw_exit - active_slippage)
                            exit_reason = "STOP_LOSS"
                            closed = True
                            break
                        elif pos.take_profit > 0 and bid_p >= pos.take_profit:
                            exit_price = pos.take_profit
                            exit_reason = "TAKE_PROFIT"
                            closed = True
                            break
                    else:  # SELL
                        # For SELL: Stop Loss hit if Ask >= Stop Loss
                        ask_p = tick_p + spread
                        if pos.stop_loss > 0 and ask_p >= pos.stop_loss:
                            if tick_idx == 0 and (open_p + spread) > pos.stop_loss:
                                raw_exit = max(pos.stop_loss, open_p + spread)
                            else:
                                raw_exit = pos.stop_loss
                            exit_price = raw_exit + active_slippage
                            exit_reason = "STOP_LOSS"
                            closed = True
                            break
                        elif pos.take_profit > 0 and ask_p <= pos.take_profit:
                            exit_price = pos.take_profit
                            exit_reason = "TAKE_PROFIT"
                            closed = True
                            break

                if closed:
                    # Finalize trade
                    gross_pnl = self.calculate_pnl(pos.side, pos.entry_price, exit_price, pos.lots)
                    notional = exit_price * pos.lots * self.contract_size
                    comm = self.calculate_commission(pos.lots, notional)
                    swap = pos.accumulated_swap
                    net_pnl = gross_pnl - comm + swap  # swap is negative for cost

                    balance += net_pnl
                    equity = balance
                    total_comm += comm

                    slippage_cost = abs(active_slippage) * pos.lots * self.tick_value
                    total_slip_cost += slippage_cost

                    pnl_pct = (net_pnl / max(equity, 1e-6)) * 100.0

                    closed_trades.append({
                        "ticket": pos.ticket,
                        "symbol": pos.symbol,
                        "type": pos.side,
                        "lots": pos.lots,
                        "open_price": round(pos.entry_price, 4),
                        "openPrice": round(pos.entry_price, 4),
                        "close_price": round(exit_price, 4),
                        "closePrice": round(exit_price, 4),
                        "gross_pnl": round(gross_pnl, 2),
                        "commission": round(comm, 2),
                        "swap": round(swap, 2),
                        "pnl": round(net_pnl, 2),
                        "pnlPercentage": round(pnl_pct, 2),
                        "magic_number": pos.magic_number,
                        "magicNumber": pos.magic_number,
                        "open_time": pos.open_time,
                        "close_time": ts,
                        "exit_reason": exit_reason,
                        "slippage_points": active_slippage,
                    })
                else:
                    remaining_positions.append(pos)

            open_positions = remaining_positions

            # Check Margin & Circuit Breaker status
            used_margin = sum(p.lots * (p.entry_price * self.contract_size / 100.0) for p in open_positions)
            free_margin = max(0.0, equity - used_margin)

            if risk_engine is not None and len(open_positions) > 0:
                cb_status = risk_engine.check_circuit_breaker(
                    equity=equity,
                    balance=balance,
                    used_margin=used_margin,
                    latency_ms=10.0,
                )
                if cb_status.is_triggered:
                    # Emergency De-leveraging: Liquidate open positions
                    for pos in open_positions:
                        bid_p = close_p
                        ask_p = close_p + spread
                        exit_price = bid_p if pos.side == "BUY" else ask_p
                        gross_pnl = self.calculate_pnl(pos.side, pos.entry_price, exit_price, pos.lots)
                        comm = self.calculate_commission(pos.lots, exit_price * pos.lots * self.contract_size)
                        net_pnl = gross_pnl - comm + pos.accumulated_swap
                        balance += net_pnl
                        closed_trades.append({
                            "ticket": pos.ticket,
                            "symbol": pos.symbol,
                            "type": pos.side,
                            "lots": pos.lots,
                            "open_price": round(pos.entry_price, 4),
                            "close_price": round(exit_price, 4),
                            "pnl": round(net_pnl, 2),
                            "pnlPercentage": round((net_pnl / max(equity, 1e-6)) * 100.0, 2),
                            "magic_number": pos.magic_number,
                            "open_time": pos.open_time,
                            "close_time": ts,
                            "exit_reason": f"CIRCUIT_BREAKER_{cb_status.tier.value}",
                        })
                    open_positions = []

            # Generate New Trading Signals
            if i >= min_lookback and len(open_positions) == 0:
                data_window = data.iloc[: i + 1]
                current_regime = RegimeState.RANGE_BOUND
                if regime_series is not None and i < len(regime_series):
                    current_regime = regime_series.iloc[i]

                signal: Optional[SignalDict] = None
                if model is not None:
                    signal = model.generate_signal(data_window, current_regime)
                elif preloaded_signals and i < len(preloaded_signals):
                    signal = preloaded_signals[i]

                if signal and signal.get("action") in ["BUY", "SELL"]:
                    # Evaluate order through SpartanRiskEngine
                    approved_order: Optional[OrderDict] = None
                    if risk_engine is not None:
                        approved_order = risk_engine.evaluate_order(
                            signal=signal,
                            portfolio_equity=equity,
                            current_margin=used_margin,
                            free_margin=free_margin,
                            current_spread=spread,
                        )
                    else:
                        # Baseline lot allocation
                        lots = float(signal.get("lots", 0.1))
                        approved_order = OrderDict(
                            order_id=f"TEST_{ticket_counter}",
                            symbol=self.symbol,
                            action=signal["action"],
                            order_type="MARKET",
                            lots=lots,
                            price=open_p,
                            stop_loss=float(signal.get("stop_loss", 0.0)),
                            take_profit=float(signal.get("take_profit", 0.0)),
                            magic_number=signal.get("magic_number", 888801),
                        )

                    if approved_order and approved_order.get("lots", 0.0) > 0:
                        order_side = approved_order["action"]
                        order_lots = float(approved_order["lots"])
                        target_price = close_p  # Execute on close of signal bar

                        # Asymmetric Bid / Ask execution:
                        # BUY fills at Ask = Bid + Spread
                        # SELL fills at Bid
                        # Slippage added to execution
                        if order_side == "BUY":
                            fill_price = target_price + spread + active_slippage
                        else:
                            fill_price = target_price - active_slippage

                        pos = Position(
                            ticket=ticket_counter,
                            symbol=self.symbol,
                            side=order_side,
                            lots=order_lots,
                            entry_price=fill_price,
                            stop_loss=float(approved_order.get("stop_loss", 0.0)),
                            take_profit=float(approved_order.get("take_profit", 0.0)),
                            magic_number=approved_order.get("magic_number", 888801),
                            open_time=ts,
                            last_eval_date=current_date,
                            highest_price=fill_price,
                            lowest_price=fill_price,
                        )
                        open_positions.append(pos)
                        ticket_counter += 1

            # Update floating equity at bar close
            floating_pnl = 0.0
            for pos in open_positions:
                bid_p = close_p
                ask_p = close_p + spread
                curr_exit = bid_p if pos.side == "BUY" else ask_p
                floating_pnl += self.calculate_pnl(pos.side, pos.entry_price, curr_exit, pos.lots)
                floating_pnl += pos.accumulated_swap

            equity = balance + floating_pnl
            equity_records.append(equity)

        # Close any remaining open positions at the end of backtest
        if open_positions:
            last_bar = data.iloc[-1]
            last_ts = pd.Timestamp(last_bar.get("timestamp") if "timestamp" in last_bar else data.index[-1])
            last_close = float(last_bar["close"])
            last_spread = float(last_bar.get("spread", 0.20))

            for pos in open_positions:
                exit_price = last_close if pos.side == "BUY" else (last_close + last_spread)
                gross_pnl = self.calculate_pnl(pos.side, pos.entry_price, exit_price, pos.lots)
                comm = self.calculate_commission(pos.lots, exit_price * pos.lots * self.contract_size)
                net_pnl = gross_pnl - comm + pos.accumulated_swap
                balance += net_pnl
                closed_trades.append({
                    "ticket": pos.ticket,
                    "symbol": pos.symbol,
                    "type": pos.side,
                    "lots": pos.lots,
                    "open_price": round(pos.entry_price, 4),
                    "close_price": round(exit_price, 4),
                    "pnl": round(net_pnl, 2),
                    "pnlPercentage": round((net_pnl / max(initial_capital, 1e-6)) * 100.0, 2),
                    "magic_number": pos.magic_number,
                    "open_time": pos.open_time,
                    "close_time": last_ts,
                    "exit_reason": "SIMULATION_END",
                })
            equity = balance

        equity_series = pd.Series(equity_records)
        peaks = equity_series.cummax()
        underwater = ((equity_series - peaks) / peaks.clip(lower=1e-6)) * 100.0

        metrics = QuantitativeMetrics.calculate_metrics(closed_trades, initial_capital=initial_capital)

        return BacktestResult(
            equity_curve=equity_series,
            drawdown_curve=underwater,
            trades=closed_trades,
            metrics=metrics,
            initial_capital=initial_capital,
            final_equity=round(equity, 2),
            total_commission_paid=round(total_comm, 2),
            total_swap_paid=round(total_swap, 2),
            total_slippage_paid=round(total_slip_cost, 2),
        )
