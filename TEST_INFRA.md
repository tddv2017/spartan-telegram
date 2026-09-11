# Spartan Quantitative Trading Research & Execution Engine: Test Infrastructure Specification

**Document Version:** 1.0.0  
**Target Project:** `f:/Development/spartan-miniapp-telegram/quant_research`  
**Test Suite Path:** `f:/Development/spartan-miniapp-telegram/quant_research/e2e_tests/`  
**Executable Test Runner:** `f:/Development/spartan-miniapp-telegram/quant_research/run_e2e_tests.py`  
**Target Milestone:** E2E Testing Track (Milestone E2E / M6 Verification)  
**Authoritative Standards:** `PROJECT.md`, `ORIGINAL_REQUEST.md`, `src/app/api/ea/webhook/route.ts`  
**Integrity Level:** Institutional Opaque-Box Verification (Anti-Cheating & Deterministic Oracles)

---

## 1. Executive Overview & Testing Philosophy

The Spartan Quantitative Trading Research & Execution Engine is an institutional multi-asset algorithmic trading ecosystem deployed across MetaTrader 5 (MQL5) and Crypto Perpetuals (CCXT/Python), integrated via a resilient WebRequest gateway into the Spartan Mini-App backend (`/api/ea/webhook`).

### 1.1 Opaque-Box Methodology
Testing in this framework operates on strict **opaque-box principles**:
- Test cases verify specifications, mathematical invariants, interface contracts, and observable behaviors.
- Tests do not rely on fragile internal implementation hacks or facade assertions.
- Expected outputs are derived exclusively from authoritative sources:
  1. Formal mathematical proofs and theoretical algorithms (Ornstein-Uhlenbeck, Kalman Filtering, Rescaled Range Hurst, Fractional Kelly).
  2. Protocol schemas and authentication constraints defined in `src/app/api/ea/webhook/route.ts`.
  3. Acceptance criteria defined in `ORIGINAL_REQUEST.md` (Profit Factor $\ge 2.0$, Max Drawdown $\le 5.0\%$, Win Rate $\ge 60\%$, Risk:Reward $\ge 1:1.5$, Monte Carlo $P(\text{DD} > 10\%) < 1.0\%$).
  4. 29 Feature specifications enumerated in `PROJECT.md § Feature Inventory`.

### 1.2 Multi-Tier Quality Architecture
The testing framework is structured across four rigorous tiers plus an adversarial hardening tier:
- **Tier 1 — Feature Coverage (>=5 tests per feature, Features 1–29)**: Isolated functional verification of each feature under nominal operating conditions.
- **Tier 2 — Boundary & Corner Cases (>=5 tests per feature, Features 1–29)**: Extreme parameters, market shocks (10x spread, 30-pip slippage), lot limits ($[0.01, 50.0]$), Stop-Out LTV 85%, PnL anomaly caps ($>\$50,000$), malformed payloads, and edge conditions.
- **Tier 3 — Cross-Feature Combinations (Pairwise Coverage)**: Inter-module interactions between Alpha Models, Regime states, Asset Microstructures, Kelly Sizing, Drawdown Governors, and Webhook bridges.
- **Tier 4 — Real-World Application Scenarios (5 Scenarios)**: Multi-step, end-to-end institutional scenarios simulating macro shocks, statistical arbitrage hedging, flash crash circuit breakers, multi-ghost routing, and account liquidation.
- **Tier 5 — Adversarial Coverage Hardening**: Resiliency testing under data corruption, NaN/Inf injection, network timeouts, and extreme non-linearities.

---

## 2. Test Infrastructure & Directory Layout

The E2E testing framework is fully contained within `quant_research/` with zero pollution of production or parent directories.

```
quant_research/
├── run_e2e_tests.py                       # Standalone CLI Test Runner (Zero external dependency requirement)
└── e2e_tests/
    ├── __init__.py                        # Package marker and test runner discovery hook
    ├── base.py                            # Base test case, deterministic assertions, synthetic series
    ├── oracles.py                         # Authoritative mathematical and protocol reference oracles
    ├── tier1_features/                    # TIER 1: Feature Coverage (Features 1 to 29)
    │   ├── __init__.py
    │   ├── test_features_01_05_scaffolding_data_regime.py
    │   ├── test_features_06_10_alpha_models_microstructure.py
    │   ├── test_features_11_15_risk_engine_governance.py
    │   ├── test_features_16_22_validation_framework.py
    │   └── test_features_23_29_execution_and_e2e.py
    ├── tier2_boundaries/                  # TIER 2: Boundary & Corner Cases (Features 1 to 29)
    │   ├── __init__.py
    │   ├── test_boundaries_01_05.py
    │   ├── test_boundaries_06_10.py
    │   ├── test_boundaries_11_15.py
    │   ├── test_boundaries_16_22.py
    │   └── test_boundaries_23_29.py
    ├── tier3_combinations/                # TIER 3: Cross-Feature Combinations
    │   ├── __init__.py
    │   └── test_pairwise_combinations.py
    └── tier4_scenarios/                   # TIER 4: Real-World Institutional Workloads
        ├── __init__.py
        ├── test_scenario_1_gold_cpi_breakout.py
        ├── test_scenario_2_eth_btc_statarb_kalman.py
        ├── test_scenario_3_crypto_flash_crash_killswitch.py
        ├── test_scenario_4_multi_ghost_eur_gbp_webhook.py
        └── test_scenario_5_stopout_ltv_85_liquidation.py
```

---

## 3. 29 Feature Coverage Matrix

Every feature cataloged in `PROJECT.md § Feature Inventory` is mapped to concrete test suites:

| # | Feature Name | Tier 1 Test Suite | Tier 2 Boundary Suite | Oracles & Constraints |
|---|--------------|-------------------|-----------------------|-----------------------|
| 1 | Core Directory & Config Scaffolding | `test_features_01_05...py` | `test_boundaries_01_05.py` | Schema validity, YAML spec, asset definitions |
| 2 | Historical Data & Synthetic Pipeline | `test_features_01_05...py` | `test_boundaries_01_05.py` | High/Low bounds, zero vol, 36m timestamp density |
| 3 | Market Regime Detection Engine (MRDE) | `test_features_01_05...py` | `test_boundaries_01_05.py` | 5-state FSM transitions, state purity |
| 4 | Hurst Exponent & Volatility Metrics | `test_features_01_05...py` | `test_boundaries_01_05.py` | R/S regression, $ATR_{norm}$, $HV_{rank}$ |
| 5 | Regime Shock Circuit Breaker | `test_features_01_05...py` | `test_boundaries_01_05.py` | $3.5\times ATR$ range, $3.0\times$ spread spike |
| 6 | Model 1: Statistical Arbitrage | `test_features_06_10...py` | `test_boundaries_06_10.py` | ADF cointegration, Kalman $\beta_t$, OU half-life |
| 7 | Model 2: Momentum Trend-Following | `test_features_06_10...py` | `test_boundaries_06_10.py` | Multi-TF H4/H1/M15, Supertrend ratchet, ADX |
| 8 | Model 3: Volatility Breakout | `test_features_06_10...py` | `test_boundaries_06_10.py` | BB/KC Squeeze, OBV surge, Bandwidth ratio |
| 9 | Model 4: Regime Mean-Reversion | `test_features_06_10...py` | `test_boundaries_06_10.py` | ADX < 20 & H < 0.45 gate, Dynamic RSI quantiles |
| 10 | Asset-Specific Microstructures | `test_features_06_10...py` | `test_boundaries_06_10.py` | XAU 100oz, Crypto funding, Forex pip values |
| 11 | Calibrated Fractional Kelly Sizing | `test_features_11_15...py` | `test_boundaries_11_15.py` | $0.25\% - 0.50\%$ equity risk, lot clamping |
| 12 | 4-Tier Drawdown Governor | `test_features_11_15...py` | `test_boundaries_11_15.py` | 3.0% Soft, 4.5% Hard, 5.0% Kill, 1.5% hysteresis |
| 13 | Stop-Out LTV 85% Circuit Breaker | `test_features_11_15...py` | `test_boundaries_11_15.py` | Margin utilization $\ge 85\%$, selective unwind |
| 14 | Latency & Spread Anomaly Tripwires | `test_features_11_15...py` | `test_boundaries_11_15.py` | Ping $> 1,500\text{ms}$, spread $> 3.5\times$ EMA |
| 15 | Remote Admin Kill-Switch Bridge | `test_features_11_15...py` | `test_boundaries_11_15.py` | `system_config.globalBotActive` sync |
| 16 | Event-Driven Backtesting Engine | `test_features_16_22...py` | `test_boundaries_16_22.py` | Tick simulation, bid/ask spreads, swaps, commissions |
| 17 | Purged & Embargoed OOS Splitter | `test_features_16_22...py` | `test_boundaries_16_22.py` | 60/20/20 partitioning, 50-bar embargo, zero leak |
| 18 | Walk-Forward Optimization (WFO) | `test_features_16_22...py` | `test_boundaries_16_22.py` | Rolling 6m/2m, $WFE \ge 60\%$, parameter surface |
| 19 | Monte Carlo Simulation Framework | `test_features_16_22...py` | `test_boundaries_16_22.py` | 1,000+ bootstrapping runs, $P(\text{DD} > 10\%) < 1\%$ |
| 20 | Macro Event Stress Testing | `test_features_16_22...py` | `test_boundaries_16_22.py` | CPI/NFP/FOMC news, 10x spread, 30-pip slip |
| 21 | Luxury Dark-Gold HTML Reports | `test_features_16_22...py` | `test_boundaries_16_22.py` | `#04060a`, `#d4af37`, SVG curves, executive markdown |
| 22 | Quantitative Metrics Engine | `test_features_16_22...py` | `test_boundaries_16_22.py` | Sharpe $\ge 2.5$, Sortino $\ge 3.5$, Calmar $\ge 3.0$, PF $\ge 2.0$ |
| 23 | Modular MQL5 EA Structure | `test_features_23_29...py` | `test_boundaries_23_29.py` | `#property strict` syntax, lifecycle hooks |
| 24 | Multi-Ghost Architecture in MQL5 | `test_features_23_29...py` | `test_boundaries_23_29.py` | Taxonomy $88[Asset][Strategy][Variant]$, state isolation |
| 25 | Resilient MQL5 WebRequest Bridge | `test_features_23_29...py` | `test_boundaries_23_29.py` | 500-item queue, `spartan_webhook_spool.dat` |
| 26 | Python CCXT Crypto Execution Bot | `test_features_23_29...py` | `test_boundaries_23_29.py` | Limit Post-Only, Market IOC, Client Order IDs |
| 27 | Webhook Latency & Payload Verification | `test_features_23_29...py` | `test_boundaries_23_29.py` | SHA-256 `matchesSecret`, schema check, latency < 500ms |
| 28 | Opaque-Box E2E Test Suite (Tiers 1-4) | `test_features_23_29...py` | `test_boundaries_23_29.py` | Full tier harness, exit codes, tier isolation |
| 29 | Adversarial Coverage Hardening | `test_features_23_29...py` | `test_boundaries_23_29.py` | Malformed inputs, NaN/Inf injection, recovery |

---

## 4. Test Execution & CLI Commands

### 4.1 Running the Full E2E Test Suite
Execute the standalone test runner:
```powershell
python quant_research/run_e2e_tests.py
```

### 4.2 Filtering by Tier
Run only specific tiers of interest:
```powershell
# Tier 1 only (Feature Coverage)
python quant_research/run_e2e_tests.py --tier 1

# Tier 2 only (Boundary & Corner Cases)
python quant_research/run_e2e_tests.py --tier 2

# Tier 3 only (Pairwise Combinations)
python quant_research/run_e2e_tests.py --tier 3

# Tier 4 only (Real-World Workload Scenarios)
python quant_research/run_e2e_tests.py --tier 4
```

### 4.3 Running with Verbose Output
```powershell
python quant_research/run_e2e_tests.py --verbose
```

### 4.4 Exit Codes & CI/CD Integration
- Exit Code `0`: All executed test cases passed with zero failures and zero errors.
- Exit Code `1`: One or more test cases failed or errored.

---

## 5. Authoritative Expected Output Oracles

All tests evaluate outputs against deterministic mathematical models and documented constraints:

1. **Fractional Kelly Formula Oracle**:
   $$K = \frac{p \cdot b - (1 - p)}{b}, \quad f^* = \min(0.0050, \max(0.0025, c \cdot K))$$
   For $p = 0.60, b = 1.5, c = 0.04$, theoretical $K = 0.3333$, calibrated $f^* = \min(0.0050, \max(0.0025, 0.0133)) = 0.0050$ (0.50%).

2. **Hurst Exponent ($H$) R/S Oracle**:
   $$E[(R/S)_n] \sim C \cdot n^H$$
   Verified against synthetic fractional Brownian motion or autoregressive series:
   - Mean-reverting ($AR(1), \phi = 0.2$): $H < 0.45$.
   - Geometric Brownian Motion ($\phi = 1.0$): $0.48 \le H \le 0.52$.
   - Momentum Trend: $H > 0.55$.

3. **Ornstein-Uhlenbeck Mean-Reversion Half-Life Oracle**:
   $$\Delta S_t = a + b S_{t-1} + \epsilon_t, \quad \theta = -\frac{\ln(1 + b)}{\Delta t}, \quad \tau_{1/2} = \frac{\ln(2)}{\theta}$$

4. **Next.js Webhook Payload Verification Oracle**:
   Strict compliance with `src/app/api/ea/webhook/route.ts`:
   - Authentication: SHA-256 constant-time match on `x-ea-key`.
   - Lots: Clamped to $[0.01, 50.0]$.
   - PnL: Clamped to $[-50000, 50000]$ with anomaly trigger when $|PnL| > 50000$.
   - Explicit `openPrice` and `pnlPercentage` mandatory for non-XAU assets.

5. **Institutional Performance Oracle**:
   $$\text{Profit Factor} = \frac{\sum \text{Gross Profit}}{\sum |\text{Gross Loss}|} \ge 2.0$$
   $$\text{Maximal Drawdown} = \max_{t} \left( \frac{\text{HWM}(t) - \text{Equity}(t)}{\text{HWM}(t)} \right) \le 5.0\%$$
   $$\text{Monte Carlo Risk: } P(\text{Max DD} > 10.0\%) < 1.0\%$$

---

## 6. Anti-Cheating & Audit Invariants

1. **No Trivial Assertions**: Tests with `assert True`, `assert 1 == 1`, or empty test bodies are strictly prohibited and flagged as violations.
2. **Deterministic Seed Control**: Synthetic data generators utilize fixed random seeds (`seed=42`, `seed=1337`) to guarantee full reproducibility across independent auditor runs.
3. **Multi-Step State Transition Verification**: All stateful components (MRDE FSM, Drawdown Governor, Multi-Ghost State Machine) are verified through sequences of consecutive state transitions, ensuring that history and memory are correctly maintained.
4. **Independent Math Implementations**: Test oracles implement mathematical equations from first principles rather than echoing system constants, guaranteeing true specification validation.
