"""
================================================================================
SPARTAN QUANTITATIVE RESEARCH & EXECUTION ENGINE: PYTEST TIER 5 SUITE
WHITE-BOX ADVERSARIAL COVERAGE HARDENING (Feature 29)
================================================================================
Exhaustive stress-testing across 6 critical operational vectors:
1. Extreme Numerical Stability (zero variance, NaN inputs, division by zero guards)
2. Severe Market Regime Transitions (instant flash-crash, hyper-volatility shock cooling)
3. Kelly Position Sizing Edge Cases (extreme tight vs wide SL, lot bounds [0.01, 50.0], margin exhaustion)
4. Stop-Out LTV 85% De-leveraging & Broker Stop-Out Cushion Breach Instant Liquidation
5. Macro News Stress Testing (10x spread expansion, 30-pip adverse slippage)
6. MQL5 EA Syntax & Offline WebRequest Spooling Queue Resilience
================================================================================
"""

import pytest
from quant_research.e2e_tests.test_tier5_adversarial_hardening import (
    TestTier5ExtremeNumericalStability,
    TestTier5SevereMarketRegimeTransitions,
    TestTier5KellyPositionSizingEdgeCases,
    TestTier5StopOutLTV85AndBrokerCushionBreach,
    TestTier5MacroNewsStressTesting,
    TestTier5MQL5SyntaxAndSpoolResilience,
)

__all__ = [
    "TestTier5ExtremeNumericalStability",
    "TestTier5SevereMarketRegimeTransitions",
    "TestTier5KellyPositionSizingEdgeCases",
    "TestTier5StopOutLTV85AndBrokerCushionBreach",
    "TestTier5MacroNewsStressTesting",
    "TestTier5MQL5SyntaxAndSpoolResilience",
]
