"""
Authoritative mathematical, algorithmic, and interface protocol oracles for Spartan E2E tests.
Derived from:
- ORIGINAL_REQUEST.md
- PROJECT.md
- src/app/api/ea/webhook/route.ts
- Institutional quantitative literature (Engle-Granger, Kalman, Hurst, Kelly)
"""

import math
import hashlib
import hmac
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple, Optional, List


class MathOracles:
    """Mathematical reference oracles implemented from foundational principles."""

    @staticmethod
    def calculate_hurst_exponent(series: pd.Series, max_lags: int = 100) -> float:
        """
        Rescaled Range (R/S) Hurst Exponent algorithm.
        H < 0.45: Mean-Reverting
        0.45 <= H <= 0.55: Brownian Motion / Random Walk
        H > 0.55: Trending / Persistent
        """
        vals = np.asarray(series, dtype=float)
        n = len(vals)
        if n < 50:
            raise ValueError(f"Series length {n} too short for reliable Hurst estimation (min 50)")

        # Compute log returns
        returns = np.diff(np.log(vals))
        N = len(returns)

        lags = [int(x) for x in np.logspace(np.log10(10), np.log10(min(max_lags, N // 2)), num=8)]
        lags = sorted(list(set(lags)))

        rs_values = []
        valid_lags = []

        for lag in lags:
            if lag < 4:
                continue
            # Chunk returns into segments of length lag
            n_chunks = N // lag
            if n_chunks < 1:
                continue

            rs_chunk_list = []
            for i in range(n_chunks):
                chunk = returns[i * lag : (i + 1) * lag]
                mean = np.mean(chunk)
                std = np.std(chunk, ddof=1)
                if std < 1e-12:
                    continue
                # Cumulative deviations
                cum_dev = np.cumsum(chunk - mean)
                r = np.max(cum_dev) - np.min(cum_dev)
                rs_chunk_list.append(r / std)

            if len(rs_chunk_list) > 0:
                rs_values.append(np.mean(rs_chunk_list))
                valid_lags.append(lag)

        if len(valid_lags) < 3:
            return 0.50  # Fallback to random walk

        # Regression log(R/S) on log(lag)
        log_lags = np.log(valid_lags)
        log_rs = np.log(rs_values)
        poly = np.polyfit(log_lags, log_rs, 1)
        h = float(poly[0])
        return round(max(0.01, min(0.99, h)), 4)

    @staticmethod
    def calculate_atr(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
        """Standard Wilder True Range and Exponential ATR."""
        prev_close = close.shift(1)
        tr1 = high - low
        tr2 = (high - prev_close).abs()
        tr3 = (low - prev_close).abs()
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = tr.ewm(alpha=1.0 / period, adjust=False).mean()
        return atr

    @staticmethod
    def calculate_normalized_atr_ratio(atr_series: pd.Series, baseline_period: int = 50) -> pd.Series:
        """ATR_norm = ATR_14 / SMA_50(ATR_14)."""
        sma_atr = atr_series.rolling(window=baseline_period).mean()
        norm_atr = atr_series / (sma_atr + 1e-9)
        return norm_atr

    @staticmethod
    def solve_kalman_dynamic_beta(y_series: pd.Series, x_series: pd.Series, delta: float = 1e-4) -> Tuple[np.ndarray, np.ndarray]:
        """
        Dynamic 1D State-Space Kalman Filter:
        Measurement: y_t = beta_t * x_t + alpha_t + v_t
        State: [alpha_t, beta_t]^T = [alpha_{t-1}, beta_{t-1}]^T + w_t
        Returns (betas, alphas).
        """
        y = np.asarray(y_series, dtype=float)
        x = np.asarray(x_series, dtype=float)
        n = len(y)

        # State transition: 2 states (alpha, beta)
        theta = np.zeros(2)  # [alpha, beta]
        R = 1.0  # Measurement variance
        Q = delta / (1 - delta) * np.eye(2)  # Process noise
        P = np.eye(2)

        betas = np.zeros(n)
        alphas = np.zeros(n)

        for t in range(n):
            # Prediction
            P = P + Q
            # Measurement matrix H = [1, x_t]
            H = np.array([1.0, x[t]])
            
            # Innovation
            y_hat = np.dot(H, theta)
            error = y[t] - y_hat
            
            # Innovation covariance
            S = np.dot(H, np.dot(P, H.T)) + R
            # Kalman gain
            K = np.dot(P, H.T) / S
            
            # Update state and covariance
            theta = theta + K * error
            P = P - np.outer(K, np.dot(H, P))

            alphas[t] = theta[0]
            betas[t] = theta[1]

        return betas, alphas

    @staticmethod
    def calculate_ou_half_life(spread: pd.Series) -> Tuple[float, float]:
        """
        Fit Ornstein-Uhlenbeck process via AR(1) regression:
        delta_S = a + b * S_{t-1} + error
        b = exp(-theta * dt) - 1 => theta = -ln(1 + b) / dt
        Half-life = ln(2) / theta
        Returns (half_life_bars, theta).
        """
        s = np.asarray(spread, dtype=float)
        s_lag = s[:-1]
        delta_s = np.diff(s)
        
        # Fit OLS: delta_s ~ b * s_lag + a
        poly = np.polyfit(s_lag, delta_s, 1)
        b = poly[0]
        a = poly[1]

        if b >= 0:
            # Not mean reverting
            return 999.0, 0.0

        theta = -b  # Approximating for small dt
        half_life = math.log(2.0) / max(theta, 1e-6)
        return float(half_life), float(theta)

    @staticmethod
    def calculate_calibrated_fractional_kelly(
        win_rate: float,
        profit_payoff_ratio: float,
        calibration_multiplier: float = 0.04,
        min_risk: float = 0.0025,
        max_risk: float = 0.0050
    ) -> float:
        """
        Calibrated Institutional Fractional Kelly Sizing:
        Theoretical K = (p * b - (1 - p)) / b
        Calibrated f* = Clamp(c * K, min_risk=0.25%, max_risk=0.50%)
        """
        p = win_rate
        b = profit_payoff_ratio
        q = 1.0 - p
        if b <= 0:
            return min_risk
        
        raw_kelly = (p * b - q) / b
        if raw_kelly <= 0:
            return 0.0  # Zero risk if edge is negative
        
        calibrated = raw_kelly * calibration_multiplier
        clamped = max(min_risk, min(max_risk, calibrated))
        return round(clamped, 6)

    @staticmethod
    def calculate_lot_size(
        equity: float,
        risk_fraction: float,
        entry_price: float,
        stop_loss: float,
        contract_size: float = 100.0,
        tick_size: float = 0.01,
        tick_value: float = 1.0,
        lot_step: float = 0.01,
        min_lot: float = 0.01,
        max_lot: float = 50.0
    ) -> float:
        """
        Precise lot sizing with institutional risk bounding:
        CashRisk = Equity * risk_fraction
        PointDistance = |Entry - SL|
        RawLots = CashRisk / (PointDistance / tick_size * tick_value)
        """
        cash_risk = equity * risk_fraction
        distance = abs(entry_price - stop_loss)
        if distance < 1e-6:
            return 0.0
        
        points = distance / tick_size
        cost_per_lot = points * tick_value
        if cost_per_lot <= 0:
            return 0.0
        
        raw_lots = cash_risk / cost_per_lot
        stepped_lots = math.floor(raw_lots / lot_step) * lot_step
        clamped_lots = max(min_lot, min(max_lot, stepped_lots))
        return round(clamped_lots, 2)


class ProtocolOracles:
    """Oracles matching the Spartan Next.js Webhook contract in src/app/api/ea/webhook/route.ts."""

    @staticmethod
    def matches_secret(provided_key: str, expected_key: str) -> bool:
        """
        Constant-time secret comparison via SHA-256 digests matching route.ts:
        const a = crypto.createHash('sha256').update(provided).digest();
        const b = crypto.createHash('sha256').update(expected).digest();
        return crypto.timingSafeEqual(a, b);
        """
        if not provided_key or not expected_key:
            return False
        digest_a = hashlib.sha256(provided_key.encode("utf-8")).digest()
        digest_b = hashlib.sha256(expected_key.encode("utf-8")).digest()
        return hmac.compare_digest(digest_a, digest_b)

    @staticmethod
    def normalize_trade_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Emulate route.ts trade normalization:
        - lots clamped to [0.01, 50.0]
        - pnl capped to [-50000, 50000] and flags isAnomalous
        - comment sliced to 100 chars
        - default magicNumber 888899
        - explicit openPrice and pnlPercentage requirement
        """
        lots = float(payload.get("lots", 0.1))
        clean_lots = max(0.01, min(50.0, lots))

        raw_pnl = float(payload.get("pnl", 0.0))
        is_anomalous = abs(raw_pnl) > 50000.0
        clean_pnl = max(-50000.0, min(50000.0, raw_pnl))

        magic = int(payload.get("magicNumber", 888899))
        comment = str(payload.get("comment", ""))[:100]
        trade_type = "SELL" if "SELL" in str(payload.get("type", "")).upper() else "BUY"
        symbol = str(payload.get("symbol", "XAUUSD")).upper()

        return {
            "ticket": str(payload.get("ticket", "")),
            "symbol": symbol,
            "type": trade_type,
            "lots": round(clean_lots, 2),
            "openPrice": float(payload.get("openPrice", 0.0)),
            "closePrice": float(payload.get("closePrice", 0.0)),
            "pnl": round(clean_pnl, 2),
            "pnlPercentage": round(float(payload.get("pnlPercentage", 0.0)), 2),
            "comment": comment,
            "magicNumber": magic,
            "isAnomalous": is_anomalous
        }

    @staticmethod
    def parse_magic_number(magic: int) -> Dict[str, Any]:
        """
        Deconstruct Magic Number taxonomy:
        - Master Model IDs: 888801 (StatArb), 888802 (Momentum), 888803 (Breakout), 888804 (MeanRev)
        - Multi-Ghost Taxonomy: 880000 + (Asset * 1000) + (Strategy * 10) + Variant
          Asset: 1=XAU, 2=EUR, 3=GBP, 8=BTC, 9=ETH
          Strategy: 01=Momentum, 02=Breakout, 03=StatArb/MeanRev
          Variant: 1=M5, 2=M15, 3=H1
        """
        if magic < 880000:
            return {"valid": False, "reason": "Prefix not 88"}
        
        # Check Master Model IDs
        master_models = {
            888801: {"asset_code": 8, "asset_name": "BTCUSDT", "strategy_code": 1, "strategy_name": "StatArb", "variant_code": 1, "timeframe": "M5"},
            888802: {"asset_code": 1, "asset_name": "XAUUSD", "strategy_code": 2, "strategy_name": "Momentum", "variant_code": 2, "timeframe": "M15"},
            888803: {"asset_code": 1, "asset_name": "XAUUSD", "strategy_code": 3, "strategy_name": "VolBreakout", "variant_code": 2, "timeframe": "M15"},
            888804: {"asset_code": 2, "asset_name": "EURUSD", "strategy_code": 4, "strategy_name": "MeanRev", "variant_code": 2, "timeframe": "M15"},
        }
        if magic in master_models:
            res = dict(master_models[magic])
            res["valid"] = True
            return res

        remainder = magic - 880000
        asset_code = remainder // 1000
        remainder2 = remainder % 1000
        strat_code = remainder2 // 10
        variant_code = remainder2 % 10

        asset_map = {1: "XAUUSD", 2: "EURUSD", 3: "GBPUSD", 8: "BTCUSDT", 9: "ETHUSDT"}
        strat_map = {1: "Momentum", 2: "VolBreakout", 3: "StatArb/MeanRev"}
        tf_map = {1: "M5", 2: "M15", 3: "H1"}

        return {
            "valid": True,
            "asset_code": asset_code,
            "asset_name": asset_map.get(asset_code, "UNKNOWN"),
            "strategy_code": strat_code,
            "strategy_name": strat_map.get(strat_code, "UNKNOWN"),
            "variant_code": variant_code,
            "timeframe": tf_map.get(variant_code, "UNKNOWN")
        }


class MetricsOracles:
    """Authoritative financial metrics formulas."""

    @staticmethod
    def calculate_performance_metrics(trades: List[Dict[str, Any]], initial_balance: float = 100000.0) -> Dict[str, float]:
        """Calculate Sharpe, Sortino, Calmar, Profit Factor, Win Rate, Risk:Reward, Max Drawdown."""
        if not trades:
            return {
                "profit_factor": 0.0,
                "win_rate": 0.0,
                "risk_reward": 0.0,
                "max_drawdown_pct": 0.0,
                "sharpe_ratio": 0.0,
                "sortino_ratio": 0.0,
                "calmar_ratio": 0.0,
                "recovery_factor": 0.0
            }

        pnls = [float(t["pnl"]) for t in trades]
        wins = [p for p in pnls if p > 0]
        losses = [abs(p) for p in pnls if p < 0]

        gross_profit = sum(wins)
        gross_loss = sum(losses)
        profit_factor = gross_profit / max(gross_loss, 1e-6)

        n_trades = len(pnls)
        win_rate = len(wins) / max(n_trades, 1)

        avg_win = np.mean(wins) if wins else 0.0
        avg_loss = np.mean(losses) if losses else 1e-6
        risk_reward = avg_win / avg_loss

        # Equity curve & drawdown
        equity = initial_balance
        peak = equity
        max_dd_dollars = 0.0
        max_dd_pct = 0.0

        daily_returns = []
        for p in pnls:
            daily_returns.append(p / equity)
            equity += p
            if equity > peak:
                peak = equity
            dd_dollars = peak - equity
            dd_pct = dd_dollars / peak
            if dd_pct > max_dd_pct:
                max_dd_pct = dd_pct
            if dd_dollars > max_dd_dollars:
                max_dd_dollars = dd_dollars

        # Annualized Sharpe & Sortino (assuming ~252 trading days or equivalent scaling)
        returns = np.array(daily_returns)
        mean_ret = np.mean(returns) if len(returns) > 0 else 0.0
        std_ret = np.std(returns, ddof=1) if len(returns) > 1 else 1e-6
        downside_returns = returns[returns < 0]
        downside_std = np.std(downside_returns, ddof=1) if len(downside_returns) > 1 else 1e-6

        annual_factor = math.sqrt(252)
        sharpe = (mean_ret / max(std_ret, 1e-6)) * annual_factor
        sortino = (mean_ret / max(downside_std, 1e-6)) * annual_factor

        total_net_profit = sum(pnls)
        cagr = (equity / initial_balance) - 1.0
        calmar = cagr / max(max_dd_pct, 1e-6)
        recovery_factor = total_net_profit / max(max_dd_dollars, 1e-6)

        return {
            "profit_factor": round(float(profit_factor), 2),
            "win_rate": round(float(win_rate * 100.0), 2),
            "risk_reward": round(float(risk_reward), 2),
            "max_drawdown_pct": round(float(max_dd_pct * 100.0), 2),
            "sharpe_ratio": round(float(sharpe), 2),
            "sortino_ratio": round(float(sortino), 2),
            "calmar_ratio": round(float(calmar), 2),
            "recovery_factor": round(float(recovery_factor), 2),
            "net_profit": round(float(total_net_profit), 2),
            "ending_equity": round(float(equity), 2)
        }
