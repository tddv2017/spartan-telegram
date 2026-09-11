"""Empirical Adversarial Challenge Suite: Milestones 2 & 3 Integration.

Focus Areas:
1. Volatility Shocks & 4-Tier Drawdown Governor / Stop-Out LTV 85% Circuit Breaker Interaction
2. StatArb Cointegration Breakdown (Z-score > 3.50) Triggering Emergency Structural Stop
3. Mean-Reversion Falling-Knife Defense Under Severe Downward Trends
4. Fractional Kelly Position Sizing with Extreme SL Distance & Lot Clamping [0.01, 50.0]
"""

import math
import numpy as np
import pandas as pd
import pytest

from quant_research.core.constants import (
    DrawdownTier,
    OrderAction,
    RegimeState,
    MAGIC_STAT_ARB,
    MAGIC_MOMENTUM_TREND,
    MAGIC_VOL_BREAKOUT,
    MAGIC_MEAN_REVERSION,
)
from quant_research.core.types import CircuitBreakerStatus, OrderDict, SignalDict
from quant_research.risk.kelly_calculator import KellyCalculator
from quant_research.risk.drawdown_governor import DrawdownGovernor, DrawdownState
from quant_research.risk.circuit_breaker import (
    StopOutCircuitBreaker,
    LatencyTripwire,
    SpreadTripwire,
    RemoteKillSwitchBridge,
    CircuitBreakerSuite,
)
from quant_research.risk.risk_manager import SpartanRiskEngine
from quant_research.models.stat_arb import StatArbModel
from quant_research.models.momentum_trend import MomentumTrendModel
from quant_research.models.vol_breakout import VolBreakoutModel
from quant_research.models.mean_reversion import MeanReversionModel
from quant_research.models.asset_microstructures import get_microstructure


# ============================================================================
# HELPER FIXTURES & DATA GENERATORS
# ============================================================================
def create_synthetic_bars(
    n_bars: int = 150,
    start_price: float = 2500.0,
    trend_drift: float = 0.0,
    vol: float = 2.0,
    seed: int = 42,
) -> pd.DataFrame:
    """Generate synthetic OHLCV bars with customizable drift and volatility."""
    np.random.seed(seed)
    idx = pd.date_range("2026-01-01 00:00:00", periods=n_bars, freq="15min")
    noise = np.random.normal(trend_drift, vol, n_bars)
    closes = np.zeros(n_bars)
    closes[0] = start_price
    for i in range(1, n_bars):
        closes[i] = max(1.0, closes[i - 1] + noise[i])

    opens = np.roll(closes, 1)
    opens[0] = start_price
    highs = np.maximum(opens, closes) + np.abs(np.random.normal(0, vol * 0.5, n_bars))
    lows = np.minimum(opens, closes) - np.abs(np.random.normal(0, vol * 0.5, n_bars))
    volumes = np.random.uniform(500, 2000, n_bars)

    return pd.DataFrame(
        {
            "open": opens,
            "high": highs,
            "low": lows,
            "close": closes,
            "volume": volumes,
            "spread": np.full(n_bars, 0.20),
        },
        index=idx,
    )


# ============================================================================
# CHALLENGE SCENARIO 1: EXTREME VOLATILITY SHOCK & RISK ENGINE GOVERNANCE
# ============================================================================
class TestChallengeScenario1VolatilityShockAndRiskGovernance:
    """
    Challenge the interaction between Alpha Models and Risk Engine under severe market shocks:
    - Drawdown escalations across Tiers 1 through 4
    - Stop-Out LTV 85% Graceful Emergency De-leveraging
    - Broker stop-out cushion breach triggering instant emergency flatten
    - Spread and Latency tripwires blocking order flow
    """

    def test_alpha_signals_blocked_under_tier_3_hard_freeze(self):
        """
        Adversarial Test: When equity suffers a 4.7% drawdown (Tier 3 Hard Freeze),
        even strongest VolBreakout or Momentum signals MUST be strictly rejected by Risk Engine.
        """
        risk_engine = SpartanRiskEngine(initial_equity=100000.0)
        hwm = 100000.0
        crashed_equity = 95300.0  # 4.7% DD -> Tier 3 Hard Freeze [4.5%, 5.0%)

        # Signal from VolBreakout (Magic 888803)
        vol_signal: SignalDict = {
            "action": "BUY",
            "symbol": "XAUUSD",
            "entry_price": 2600.0,
            "stop_loss": 2580.0,
            "take_profit": 2640.0,
            "magic_number": MAGIC_VOL_BREAKOUT,
            "regime": "BULL_TREND",
            "comment": "Extreme Bull Breakout",
        }

        # Evaluate order
        order = risk_engine.evaluate_order(
            signal=vol_signal,
            portfolio_equity=crashed_equity,
            current_margin=2000.0,
        )

        assert order is None, "Risk Engine must reject BUY signal under Tier 3 Hard Freeze!"
        assert risk_engine.drawdown_governor.current_tier == DrawdownTier.TIER_3_HARD_FREEZE
        assert risk_engine.drawdown_governor.allow_new_entries is False

    def test_alpha_signals_blocked_and_emergency_flatten_under_tier_4(self):
        """
        Adversarial Test: When equity drops by 5.2% (Tier 4 Circuit Breaker),
        Risk Engine MUST block new entries AND signal CIRCUIT_BREAKER_KILL_SWITCH.
        """
        risk_engine = SpartanRiskEngine(initial_equity=100000.0)
        crashed_equity = 94800.0  # 5.2% DD -> >= 5.0%

        momentum_signal: SignalDict = {
            "action": "BUY",
            "symbol": "BTCUSDT",
            "entry_price": 65000.0,
            "stop_loss": 64000.0,
            "take_profit": 67000.0,
            "magic_number": MAGIC_MOMENTUM_TREND,
            "regime": "BULL_TREND",
            "comment": "Momentum Signal in Crash",
        }

        order = risk_engine.evaluate_order(
            signal=momentum_signal,
            portfolio_equity=crashed_equity,
            current_margin=5000.0,
        )
        assert order is None, "Risk Engine must reject entries in Tier 4!"

        # Check circuit breaker evaluation
        status = risk_engine.check_circuit_breaker(
            equity=crashed_equity,
            balance=100000.0,
            used_margin=5000.0,
        )
        assert status.is_triggered is True
        assert status.tier == DrawdownTier.TIER_4_CIRCUIT_BREAKER
        assert status.action == "CIRCUIT_BREAKER_KILL_SWITCH"

    def test_tier_2_soft_throttle_halves_risk_budget(self):
        """
        Adversarial Test: When equity is in Tier 2 Soft Throttle (DD = 3.5%),
        risk multiplier must be exactly 0.5, halving the approved lots compared to Tier 1.
        """
        risk_engine = SpartanRiskEngine(initial_equity=100000.0)

        signal: SignalDict = {
            "action": "BUY",
            "symbol": "XAUUSD",
            "entry_price": 2500.0,
            "stop_loss": 2490.0,  # $10 distance = 1000 points
            "take_profit": 2520.0,
            "magic_number": MAGIC_VOL_BREAKOUT,
            "regime": "BULL_TREND",
            "comment": "Tier comparison test",
        }

        # 1. Tier 1 Normal ($100k equity)
        order_tier1 = risk_engine.evaluate_order(
            signal=signal,
            portfolio_equity=100000.0,
            current_margin=0.0,
        )
        assert order_tier1 is not None
        lots_tier1 = order_tier1["lots"]

        # 2. Reset engine to Tier 2 ($96.5k equity = 3.5% DD)
        risk_engine_t2 = SpartanRiskEngine(initial_equity=100000.0)
        order_tier2 = risk_engine_t2.evaluate_order(
            signal=signal,
            portfolio_equity=96500.0,
            current_margin=0.0,
        )
        assert order_tier2 is not None
        lots_tier2 = order_tier2["lots"]

        # At Tier 2, effective f* is halved (0.5x), so lots should be roughly half
        assert lots_tier2 < lots_tier1
        ratio = lots_tier2 / lots_tier1
        assert 0.45 <= ratio <= 0.55, f"Expected ~0.5 ratio between Tier 2 and Tier 1, got {ratio}"

    def test_hysteresis_prevents_premature_deescalation(self):
        """
        Adversarial Test: Account drops to 3.8% DD (Tier 2), then recovers to 2.2% DD.
        Because recovery requires DD < 1.5%, the system MUST STAY in Tier 2 (no thrashing).
        """
        gov = DrawdownGovernor(initial_equity=100000.0)

        # Drop to 3.8% DD -> enters Tier 2
        state1 = gov.update_equity(96200.0)
        assert state1.tier == DrawdownTier.TIER_2_SOFT_THROTTLE

        # Recover to 2.2% DD (< 3.0% but >= 1.5%)
        state2 = gov.update_equity(97800.0)
        assert state2.tier == DrawdownTier.TIER_2_SOFT_THROTTLE, "Hysteresis buffer must maintain Tier 2!"

        # Recover to 1.4% DD (< 1.5%)
        state3 = gov.update_equity(98600.0)
        assert state3.tier == DrawdownTier.TIER_1_NORMAL, "Must restore Tier 1 when DD < 1.5%!"

    def test_stop_out_ltv_85_graceful_deleveraging(self):
        """
        Adversarial Test: When used margin hits 88% of equity (LTV 88% >= 85%),
        Graceful Emergency De-leveraging must close positions in descending order of margin
        until resulting LTV is strictly below 50.0%.
        """
        breaker = StopOutCircuitBreaker(max_margin_utilization=0.85, target_recovery_utilization=0.50)
        equity = 100000.0
        used_margin = 88000.0  # 88% LTV

        # 4 open positions with various margin burdens
        positions = [
            {"ticket": 101, "margin": 15000.0, "symbol": "EURUSD"},
            {"ticket": 102, "margin": 45000.0, "symbol": "XAUUSD"},  # Highest burden
            {"ticket": 103, "margin": 20000.0, "symbol": "BTCUSDT"},  # Second highest
            {"ticket": 104, "margin": 8000.0, "symbol": "GBPUSD"},
        ]

        res = breaker.evaluate_deleveraging(equity, used_margin, positions)
        assert res["triggered"] is True
        assert res["action"] == "EMERGENCY_DELEVERAGE"
        # Closing 102 ($45k) leaves $43k (43% LTV < 50%), so only ticket 102 should be closed
        assert res["tickets_to_close"] == [102]
        assert res["new_ltv"] < 50.0

    def test_broker_cushion_breach_forces_instant_market_flatten(self):
        """
        Adversarial Test: Margin level drops to 34% (below 36% broker stopout cushion).
        Must trigger instant EMERGENCY_FLATTEN across ALL open positions.
        """
        breaker = StopOutCircuitBreaker(broker_stopout_level=30.0, cushion_pct=0.20)
        # 30% * 1.20 = 36.0% cushion
        # Margin level = Equity / Used Margin * 100%
        # If Equity = $34,000 and Used Margin = $100,000 -> ML = 34% <= 36%
        positions = [
            {"ticket": 201, "margin": 60000.0},
            {"ticket": 202, "margin": 40000.0},
        ]

        res = breaker.evaluate_deleveraging(equity=34000.0, used_margin=100000.0, positions=positions)
        assert res["triggered"] is True
        assert res["action"] == "EMERGENCY_FLATTEN"
        assert set(res["tickets_to_close"]) == {201, 202}
        assert res["force_market"] is True

    def test_spread_spike_blocks_new_orders_and_cools_off(self):
        """
        Adversarial Test: Macro news volatility causes spread to spike to 4x baseline EMA.
        New orders must be blocked until 3 consecutive normalized bars occur.
        """
        spread_guard = SpreadTripwire(max_spread_multiplier=3.5, cooling_bars_required=3)

        # Baseline initialization with 100 bars of 0.20 spread
        for _ in range(100):
            spread_guard.update_spread("XAUUSD", 0.20)

        ema = spread_guard.get_ema_spread("XAUUSD")
        assert 0.19 <= ema <= 0.21

        # Spread spike to 1.00 (> 3.5x 0.20 = 0.70)
        is_tripped = spread_guard.update_spread("XAUUSD", 1.00)
        assert is_tripped is True
        assert spread_guard.is_spread_tripped("XAUUSD") is True

        # Cooling bar 1 (spread 0.30 <= 2.0x EMA): still tripped
        spread_guard.update_spread("XAUUSD", 0.30)
        assert spread_guard.is_spread_tripped("XAUUSD") is True

        # Cooling bar 2: still tripped
        spread_guard.update_spread("XAUUSD", 0.30)
        assert spread_guard.is_spread_tripped("XAUUSD") is True

        # Cooling bar 3: normalized!
        spread_guard.update_spread("XAUUSD", 0.30)
        assert spread_guard.is_spread_tripped("XAUUSD") is False


# ============================================================================
# CHALLENGE SCENARIO 2: STATARB COINTEGRATION BREAKDOWN & EMERGENCY STRUCTURAL STOP
# ============================================================================
class TestChallengeScenario2StatArbCointegrationBreakdown:
    """
    Challenge StatArb model under extreme divergence:
    - |Z| >= 3.50 triggering emergency structural stop (CLOSE signal)
    - Verification that Risk Engine approves CLOSE orders defensively
    - Trailing stop forced liquidation on cointegration breakdown
    - Diverging OU process (positive slope) suppressing entries
    """

    def test_z_score_greater_than_3_50_generates_emergency_close(self):
        """
        Adversarial Test: Spread between ETH and BTC reaches Z >= 3.50.
        StatArbModel MUST generate an emergency action="CLOSE" order.
        """
        model = StatArbModel(z_stop=3.50)

        np.random.seed(42)
        n = 500
        btc = np.cumsum(np.random.normal(0, 5, n)) + 30000.0
        spread = np.zeros(n)
        for i in range(1, n):
            spread[i] = 0.92 * spread[i - 1] + np.random.normal(0, 1.0)
        
        tail_std = np.std(spread[-20:])
        # Drive spread to Z >= 3.50
        spread[-1] = np.mean(spread[-20:]) + 7.0 * tail_std
        eth = 0.06 * btc + spread

        df_eth = pd.DataFrame({"close": eth})
        df_btc = pd.DataFrame({"close": btc})

        sig = model.generate_signal(
            data=df_eth,
            current_regime=RegimeState.RANGE_BOUND,
            secondary_data=df_btc,
        )

        assert sig is not None, "StatArb must generate a signal on breakdown!"
        assert sig["action"] == OrderAction.CLOSE.value or sig["action"] == "CLOSE"
        assert "Structural Stop" in sig["comment"]

    def test_extreme_divergence_breaking_adf_suppresses_entry(self):
        """
        Adversarial Test: If a sudden massive outlier breaks ADF stationarity (p >= 0.05),
        generate_signal() correctly refuses to open new positions (returns None),
        while update_trailing_stop provides immediate liquidation defense.
        """
        model = StatArbModel(z_stop=3.50)
        n = 100
        np.random.seed(42)
        btc = np.linspace(60000, 62000, n)
        eth = 0.05 * btc + np.random.normal(0, 5.0, n)
        eth[-1] += 500.0  # Massive single-bar divergence destroys ADF stationarity

        df_eth = pd.DataFrame({"close": eth})
        df_btc = pd.DataFrame({"close": btc})

        sig = model.generate_signal(
            data=df_eth,
            current_regime=RegimeState.RANGE_BOUND,
            secondary_data=df_btc,
        )
        # Entry is safely suppressed when stationarity is compromised
        assert sig is None

        # However, trailing stop directly receives z_score and executes liquidation
        position = {"ticket": 881, "entry_price": eth[-2], "current_stop": eth[-2] - 50.0}
        stop_price = model.update_trailing_stop(position, pd.Series({"close": eth[-1]}), z_score=4.5)
        assert stop_price == eth[-1], "update_trailing_stop must liquidate position on breakdown!"

    def test_risk_engine_approves_emergency_close_with_highest_priority(self):
        """
        Adversarial Test: Even if Risk Engine is in Tier 3 Hard Freeze,
        an emergency CLOSE signal from StatArb MUST BE APPROVED to prevent ruin.
        """
        risk_engine = SpartanRiskEngine(initial_equity=100000.0)
        crashed_equity = 95200.0  # 4.8% DD (Tier 3 Hard Freeze)

        close_signal: SignalDict = {
            "action": "CLOSE",
            "symbol": "ETHUSDT",
            "entry_price": 3200.0,
            "stop_loss": 3200.0,
            "take_profit": 3200.0,
            "magic_number": MAGIC_STAT_ARB,
            "regime": "RANGE_BOUND",
            "comment": "StatArb Structural Stop (|Z|=3.85)",
            "lots": 5.0,
        }

        order = risk_engine.evaluate_order(
            signal=close_signal,
            portfolio_equity=crashed_equity,
            current_margin=10000.0,
        )

        assert order is not None, "CLOSE orders must bypass entry freezes and be approved!"
        assert order["action"] == "CLOSE"
        assert order["magic_number"] == MAGIC_STAT_ARB

    def test_trailing_stop_forces_liquidation_on_z_breakdown(self):
        """
        Adversarial Test: When update_trailing_stop is called with z_score >= 3.50,
        it must return current close to force instant market liquidation.
        """
        model = StatArbModel(z_stop=3.50)
        position = {"ticket": 999, "entry_price": 3000.0, "current_stop": 2900.0}
        current_bar = pd.Series({"close": 3250.0})

        # Z = 3.75 >= 3.50
        stop = model.update_trailing_stop(position, current_bar, z_score=3.75)
        assert stop == 3250.0, "Must return current close to force liquidation!"

    def test_divergent_ou_process_rejects_entry(self):
        """
        Adversarial Test: If spread exhibits explosive/divergent behavior (b >= 0 in AR(1)),
        half-life calculation must return 999.0 and model must reject entries.
        """
        model = StatArbModel()
        # Divergent exponential spread
        divergent_spread = np.exp(np.linspace(1.0, 5.0, 50))
        hl, theta = model.calculate_ou_half_life(divergent_spread)

        assert hl == 999.0
        assert theta == 0.0


# ============================================================================
# CHALLENGE SCENARIO 3: MEAN-REVERSION FALLING-KNIFE PREVENTION
# ============================================================================
class TestChallengeScenario3MeanReversionFallingKnifeDefense:
    """
    Challenge Mean-Reversion falling-knife prevention under severe downward trends:
    - Downward sloping macro EMA200 invalidating Long entries
    - ADX >= 20.0 and Hurst >= 0.45 suppressing mean reversion
    - Time-stop liquidation after 16 bars
    """

    def test_falling_knife_blocked_by_macro_ema_slope(self):
        """
        Adversarial Test: Severe downward trend where price plunges below D1 EMA200
        and EMA200 slope is negative (-0.0015 < -0.0005).
        Even if RSI is extremely oversold (12.0) and lower wick is 0.75,
        MeanReversionModel MUST STRICTLY BLOCK Long entry.
        """
        model = MeanReversionModel(min_wick_ratio=0.60)
        bars = create_synthetic_bars(n_bars=150, start_price=1.1000, trend_drift=-0.002, vol=0.001)

        # Force last bar to look like an oversold bullish pin bar
        last_idx = bars.index[-1]
        bars.loc[last_idx, "open"] = 1.0520
        bars.loc[last_idx, "close"] = 1.0530
        bars.loc[last_idx, "low"] = 1.0480  # long lower wick: 1.0520 - 1.0480 = 0.0040 / 0.0055 = ~0.72
        bars.loc[last_idx, "high"] = 1.0535

        # Macro trend: severe downward slope
        sig = model.generate_signal(
            data=bars,
            current_regime=RegimeState.RANGE_BOUND,
            adx=15.0,  # Below ADX threshold
            hurst=0.35,  # Below Hurst threshold
            macro_ema200=1.0800,  # Price is far below macro EMA
            macro_ema_slope=-0.0020,  # Falling knife! (< -0.0005)
        )

        assert sig is None, "Macro knife-catching defense MUST block Long entry during severe downtrend!"

    def test_rising_knife_short_blocked_by_macro_ema_slope(self):
        """
        Adversarial Test: Parabolic bull surge where price surges above D1 EMA200
        with positive slope (+0.0020 > +0.0005).
        Even if RSI is overbought (85.0) and upper wick is 0.70,
        MeanReversionModel MUST STRICTLY BLOCK Short entry.
        """
        model = MeanReversionModel(min_wick_ratio=0.60)
        bars = create_synthetic_bars(n_bars=150, start_price=1.0500, trend_drift=0.002, vol=0.001)

        last_idx = bars.index[-1]
        bars.loc[last_idx, "open"] = 1.0920
        bars.loc[last_idx, "close"] = 1.0910
        bars.loc[last_idx, "high"] = 1.0960  # long upper wick
        bars.loc[last_idx, "low"] = 1.0905

        sig = model.generate_signal(
            data=bars,
            current_regime=RegimeState.RANGE_BOUND,
            adx=15.0,
            hurst=0.35,
            macro_ema200=1.0700,
            macro_ema_slope=0.0020,  # Rising knife! (> 0.0005)
        )

        assert sig is None, "Macro knife defense MUST block Short entry during parabolic uptrend!"

    def test_trending_adx_and_hurst_suppresses_mean_reversion(self):
        """
        Adversarial Test: Even if regime claims to be RANGE_BOUND,
        if ADX >= 20.0 or Hurst >= 0.45, the engine detects trend persistence and blocks signals.
        """
        model = MeanReversionModel()
        bars = create_synthetic_bars(n_bars=150)

        # Test ADX gate breach (ADX = 28.0 >= 20.0)
        sig_adx = model.generate_signal(
            data=bars,
            current_regime=RegimeState.RANGE_BOUND,
            adx=28.0,
            hurst=0.35,
        )
        assert sig_adx is None, "ADX >= 20 must suppress MeanReversion signals!"

        # Test Hurst gate breach (Hurst = 0.58 >= 0.45)
        sig_hurst = model.generate_signal(
            data=bars,
            current_regime=RegimeState.RANGE_BOUND,
            adx=14.0,
            hurst=0.58,
        )
        assert sig_hurst is None, "Hurst >= 0.45 must suppress MeanReversion signals!"

    def test_time_stop_liquidation_forces_exit_at_16_bars(self):
        """
        Adversarial Test: If a mean-reverting trade has not hit TP within 16 bars,
        update_trailing_stop MUST force liquidation at the current close to release capital.
        """
        model = MeanReversionModel(max_bars_in_trade=16)
        position = {"bars_held": 16, "entry_price": 100.0, "current_stop": 95.0}
        current_bar = pd.Series({"close": 98.50})

        forced_stop = model.update_trailing_stop(position, current_bar)
        assert forced_stop == 98.50, "Must return current close to liquidate after 16 bars!"


# ============================================================================
# CHALLENGE SCENARIO 4: FRACTIONAL KELLY SIZING WITH EXTREME SL DISTANCES
# ============================================================================
class TestChallengeScenario4KellySizingAndLotClamping:
    """
    Challenge Fractional Kelly position sizing under extreme boundary conditions:
    - Extremely tight SL distance (microscopic points) -> lot clamped to Max Lot AND margin headroom check
    - Extremely wide SL distance (huge points) -> lot clamped to Min Lot
    - Zero or negative distance -> rejected with 0.0 lots
    - Negative edge (win rate / payoff non-positive) -> rejected with 0.0 lots
    - Precision step quantization
    """

    def test_extreme_tight_stop_loss_clamped_and_margin_headroom_guarded(self):
        """
        Adversarial Test: SL distance is tiny ($0.01 on XAUUSD, or 1 tick).
        Raw lot sizing would theoretically calculate $500 / $1.00 = 500 lots.
        1. calculate_lot_size must clamp lots to max_lot (50.0 lots).
        2. evaluate_position_sizing must compute required margin for 50 lots ($125,000 at $2500, 1:100 leverage)
           and REJECT the trade because $125,000 exceeds 10% of free margin ($10,000)!
        """
        calc = KellyCalculator()
        equity = 100000.0
        free_margin = 100000.0
        entry = 2500.0
        micro_sl = 2499.99  # 1 tick ($0.01)

        # 1. Lot clamping
        lots = calc.calculate_lot_size(
            equity=equity,
            risk_fraction=0.0050,  # 0.50% = $500 risk
            entry_price=entry,
            stop_loss=micro_sl,
            symbol="XAUUSD",
        )
        assert lots == 50.0, f"Expected 50.0 max lot clamping, got {lots}"

        # 2. Comprehensive evaluation with margin check
        res = calc.evaluate_position_sizing(
            symbol="XAUUSD",
            equity=equity,
            free_margin=free_margin,
            entry_price=entry,
            stop_loss=micro_sl,
            win_rate=0.60,
            payoff_ratio=1.50,
        )

        assert res["approved"] is False, "Must reject trade when required margin exceeds 10% free margin!"
        assert res["reason"] == "MARGIN_HEADROOM_EXCEEDED"
        assert res["lots"] == 50.0
        # Required margin for 50 lots of Gold at $2500 with 1:100 leverage:
        # (50 * 100 * 2500) / 100 = $125,000. 10% of $100k free margin is $10,000.
        assert res["required_margin"] == 125000.0

    def test_extreme_wide_stop_loss_clamped_to_min_lot(self):
        """
        Adversarial Test: SL distance is huge ($1,000 on Gold, e.g. entry $2500, SL $1500).
        Raw lot sizing is 0.005 lots.
        calculate_lot_size must clamp up to min_lot (0.01 lots).
        """
        calc = KellyCalculator()
        equity = 100000.0
        entry = 2500.0
        wide_sl = 1500.0  # $1,000 distance = 100,000 points ($100,000 per lot)

        lots = calc.calculate_lot_size(
            equity=equity,
            risk_fraction=0.0050,  # $500 cash risk
            entry_price=entry,
            stop_loss=wide_sl,
            symbol="XAUUSD",
        )
        # Raw lots = 500 / 100,000 = 0.005 -> stepped = 0.0 -> clamped to min_lot 0.01
        assert lots == 0.01, f"Expected min_lot clamping to 0.01, got {lots}"

    def test_zero_or_micro_distance_returns_zero_lots(self):
        """
        Adversarial Test: If entry == stop_loss, distance is 0.0.
        Must return 0.0 lots to avoid division by zero or invalid orders.
        """
        calc = KellyCalculator()
        lots = calc.calculate_lot_size(
            equity=100000.0,
            risk_fraction=0.0050,
            entry_price=2500.0,
            stop_loss=2500.0,
            symbol="XAUUSD",
        )
        assert lots == 0.0

    def test_negative_or_zero_edge_rejects_trade(self):
        """
        Adversarial Test: Model with win rate 30% and payoff ratio 1.0 (negative edge).
        Kelly calculator must return f* = 0.0 and reject position sizing.
        """
        calc = KellyCalculator()
        f_star = calc.calculate_fractional_kelly(win_rate=0.30, profit_payoff_ratio=1.0)
        assert f_star == 0.0

        res = calc.evaluate_position_sizing(
            symbol="XAUUSD",
            equity=100000.0,
            free_margin=100000.0,
            entry_price=2500.0,
            stop_loss=2480.0,
            win_rate=0.30,
            payoff_ratio=1.0,
        )
        assert res["approved"] is False
        assert res["reason"] == "NEGATIVE_OR_ZERO_EDGE"

    def test_crypto_btc_fractional_lot_step_precision(self):
        """
        Adversarial Test: BTCUSDT requires min_lot=0.001, lot_step=0.001, max_lot=20.0.
        Verify sizing adheres to 3 decimal places without IEEE 754 floating-point artifacts.
        """
        calc = KellyCalculator()
        lots = calc.calculate_lot_size(
            equity=100000.0,
            risk_fraction=0.0050,  # $500 risk
            entry_price=65000.0,
            stop_loss=64500.0,  # $500 distance -> raw = 1.0 BTC
            symbol="BTCUSDT",
        )
        assert lots == 1.0
        # Check string representation does not leak floating point error
        assert str(lots) in ("1.0", "1.000")
