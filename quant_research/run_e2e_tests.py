#!/usr/bin/env python3
"""
================================================================================
SPARTAN QUANTITATIVE TRADING RESEARCH & EXECUTION ENGINE
OPAQUE-BOX END-TO-END (E2E) TEST RUNNER
================================================================================
Institutional Multi-Tier Verification Suite covering all 29 features:
- Tier 1: Feature Coverage (Features 1 through 29)
- Tier 2: Boundary & Corner Cases (Features 1 through 29)
- Tier 3: Cross-Feature Combinations (Pairwise Matrix)
- Tier 4: Real-World Institutional Application Scenarios

Exit Codes:
  0 = All tests passed with zero failures and zero errors
  1 = One or more tests failed or encountered an error
================================================================================
"""

import sys
import os
import time
import argparse
import unittest
from typing import Dict, Any, List, Optional, Tuple

# Reconfigure stdout/stderr to UTF-8 on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Ensure project root is in sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# ANSI Color Codes for Institutional Terminal Display
class Colors:
    GOLD = "\033[38;2;212;175;55m"
    BRIGHT_GOLD = "\033[38;2;245;215;127m"
    DEEP_OBSIDIAN = "\033[38;2;120;120;120m"
    GREEN = "\033[38;2;46;204;113m"
    RED = "\033[38;2;231;76;60m"
    CYAN = "\033[38;2;52;152;219m"
    WHITE = "\033[38;2;240;240;240m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    RESET = "\033[0m"


def print_banner():
    banner = f"""
{Colors.GOLD}+==============================================================================+
|  {Colors.BRIGHT_GOLD}{Colors.BOLD}SPARTAN QUANT RESEARCH & EXECUTION ENGINE: E2E TEST RUNNER{Colors.RESET}{Colors.GOLD}                  |
|  {Colors.WHITE}Institutional Opaque-Box Validation Suite (Tiers 1 - 4){Colors.GOLD}                     |
|  {Colors.DEEP_OBSIDIAN}Chairman Governance: @tddv2017 | Zero-Tolerance Tail Risk Standard{Colors.GOLD}         |
+==============================================================================+{Colors.RESET}
"""
    print(banner)


class TierResult:
    def __init__(self, name: str):
        self.name = name
        self.total = 0
        self.passed = 0
        self.failed = 0
        self.errored = 0
        self.duration = 0.0
        self.failures_list: List[Tuple[Any, str]] = []
        self.errors_list: List[Tuple[Any, str]] = []


def run_tier_suite(suite: unittest.TestSuite, tier_name: str, verbose: bool = False) -> TierResult:
    res = TierResult(tier_name)
    start_time = time.perf_counter()

    runner = unittest.TextTestRunner(verbosity=2 if verbose else 0, stream=sys.stdout if verbose else open(os.devnull, 'w'))
    test_result = runner.run(suite)

    res.duration = time.perf_counter() - start_time
    res.total = test_result.testsRun
    res.failed = len(test_result.failures)
    res.errored = len(test_result.errors)
    res.passed = res.total - (res.failed + res.errored)
    res.failures_list = test_result.failures
    res.errors_list = test_result.errors

    return res


def load_tier_1_suite() -> unittest.TestSuite:
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    from quant_research.e2e_tests.tier1_features import (
        test_features_01_05_scaffolding_data_regime,
        test_features_06_10_alpha_models_microstructure,
        test_features_11_15_risk_engine_governance,
        test_features_16_22_validation_framework,
        test_features_23_29_execution_and_e2e,
    )
    for mod in [
        test_features_01_05_scaffolding_data_regime,
        test_features_06_10_alpha_models_microstructure,
        test_features_11_15_risk_engine_governance,
        test_features_16_22_validation_framework,
        test_features_23_29_execution_and_e2e,
    ]:
        suite.addTests(loader.loadTestsFromModule(mod))
    return suite


def load_tier_2_suite() -> unittest.TestSuite:
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    from quant_research.e2e_tests.tier2_boundaries import (
        test_boundaries_01_05,
        test_boundaries_06_10,
        test_boundaries_11_15,
        test_boundaries_16_22,
        test_boundaries_23_29,
    )
    for mod in [
        test_boundaries_01_05,
        test_boundaries_06_10,
        test_boundaries_11_15,
        test_boundaries_16_22,
        test_boundaries_23_29,
    ]:
        suite.addTests(loader.loadTestsFromModule(mod))
    return suite


def load_tier_3_suite() -> unittest.TestSuite:
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    from quant_research.e2e_tests.tier3_combinations import test_pairwise_combinations
    suite.addTests(loader.loadTestsFromModule(test_pairwise_combinations))
    return suite


def load_tier_4_suite() -> unittest.TestSuite:
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    from quant_research.e2e_tests.tier4_scenarios import (
        test_scenario_1_gold_cpi_breakout,
        test_scenario_2_eth_btc_statarb_kalman,
        test_scenario_3_crypto_flash_crash_killswitch,
        test_scenario_4_multi_ghost_eur_gbp_webhook,
        test_scenario_5_stopout_ltv_85_liquidation,
    )
    for mod in [
        test_scenario_1_gold_cpi_breakout,
        test_scenario_2_eth_btc_statarb_kalman,
        test_scenario_3_crypto_flash_crash_killswitch,
        test_scenario_4_multi_ghost_eur_gbp_webhook,
        test_scenario_5_stopout_ltv_85_liquidation,
    ]:
        suite.addTests(loader.loadTestsFromModule(mod))
    return suite


def load_tier_5_suite() -> unittest.TestSuite:
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    from quant_research.e2e_tests import test_tier5_adversarial_hardening
    suite.addTests(loader.loadTestsFromModule(test_tier5_adversarial_hardening))
    return suite


def print_summary_table(tier_results: List[TierResult]):
    print(f"\n{Colors.GOLD}+--------------------------------------------------------------------------------------------+{Colors.RESET}")
    print(f"{Colors.GOLD}| {Colors.WHITE}{'TIER / SUITE NAME':<38} | {'TESTS':<6} | {'PASS':<6} | {'FAIL':<5} | {'ERR':<4} | {'PASS %':<7} | {'TIME':<7}{Colors.GOLD} |{Colors.RESET}")
    print(f"{Colors.GOLD}+--------------------------------------------------------------------------------------------+{Colors.RESET}")

    grand_total = 0
    grand_passed = 0
    grand_failed = 0
    grand_errored = 0
    grand_duration = 0.0

    for tr in tier_results:
        grand_total += tr.total
        grand_passed += tr.passed
        grand_failed += tr.failed
        grand_errored += tr.errored
        grand_duration += tr.duration

        pct = (tr.passed / tr.total * 100.0) if tr.total > 0 else 0.0
        status_color = Colors.GREEN if (tr.failed == 0 and tr.errored == 0) else Colors.RED
        print(f"{Colors.GOLD}|{Colors.RESET} {status_color}{tr.name:<38}{Colors.RESET} | {tr.total:<6} | {tr.passed:<6} | {tr.failed:<5} | {tr.errored:<4} | {pct:>6.1f}% | {tr.duration:>6.2f}s {Colors.GOLD}|{Colors.RESET}")

    print(f"{Colors.GOLD}+--------------------------------------------------------------------------------------------+{Colors.RESET}")
    total_pct = (grand_passed / grand_total * 100.0) if grand_total > 0 else 0.0
    overall_color = Colors.GREEN if (grand_failed == 0 and grand_errored == 0) else Colors.RED
    print(f"{Colors.GOLD}| {Colors.BOLD}{'TOTAL E2E VERIFICATION':<38}{Colors.RESET} | {grand_total:<6} | {grand_passed:<6} | {grand_failed:<5} | {grand_errored:<4} | {total_pct:>6.1f}% | {grand_duration:>6.2f}s {Colors.GOLD}|{Colors.RESET}")
    print(f"{Colors.GOLD}+--------------------------------------------------------------------------------------------+{Colors.RESET}\n")

    if grand_failed > 0 or grand_errored > 0:
        print(f"{Colors.RED}{Colors.BOLD}DETAILED FAILURE AUDIT LOG:{Colors.RESET}")
        for tr in tier_results:
            for test, err in tr.failures_list:
                print(f"{Colors.RED}[FAIL] {tr.name} -> {test}:{Colors.RESET}\n{err}")
            for test, err in tr.errors_list:
                print(f"{Colors.RED}[ERROR] {tr.name} -> {test}:{Colors.RESET}\n{err}")
        print(f"\n{Colors.RED}{Colors.BOLD}FAILED: Institutional standards violated. Investigate failures immediately.{Colors.RESET}\n")
    else:
        print(f"{Colors.GREEN}{Colors.BOLD}[OK] 100% INSTITUTIONAL COMPLIANCE VERIFIED: All {grand_total} tests passed cleanly.{Colors.RESET}\n")


def main():
    parser = argparse.ArgumentParser(description="Spartan Quantitative Engine E2E Test Runner")
    parser.add_argument("--tier", type=int, choices=[1, 2, 3, 4, 5], help="Execute only a specific tier (1, 2, 3, 4, or 5)")
    parser.add_argument("--all", action="store_true", help="Execute all tiers including Tier 5 Adversarial Hardening")
    parser.add_argument("--verbose", "-v", action="store_true", help="Print detailed per-test execution traces")
    args = parser.parse_args()

    print_banner()

    tier_results = []
    if args.tier:
        tiers_to_run = [args.tier]
    elif args.all:
        tiers_to_run = [1, 2, 3, 4, 5]
    else:
        tiers_to_run = [1, 2, 3, 4]

    tier_map = {
        1: ("Tier 1: Feature Coverage (Features 1-29)", load_tier_1_suite),
        2: ("Tier 2: Boundary & Corner Cases (Features 1-29)", load_tier_2_suite),
        3: ("Tier 3: Cross-Feature Combinations", load_tier_3_suite),
        4: ("Tier 4: Real-World Application Scenarios", load_tier_4_suite),
        5: ("Tier 5: Adversarial Coverage Hardening", load_tier_5_suite),
    }

    for t_num in tiers_to_run:
        name, loader_fn = tier_map[t_num]
        print(f"{Colors.CYAN}==> Executing {name}...{Colors.RESET}")
        suite = loader_fn()
        res = run_tier_suite(suite, name, verbose=args.verbose)
        tier_results.append(res)
        status_text = f"{Colors.GREEN}PASSED ({res.passed}/{res.total}){Colors.RESET}" if (res.failed == 0 and res.errored == 0) else f"{Colors.RED}FAILED ({res.failed} fails, {res.errored} errors){Colors.RESET}"
        print(f"    Completed in {res.duration:.2f}s: {status_text}")

    print_summary_table(tier_results)

    total_failures = sum(tr.failed + tr.errored for tr in tier_results)
    sys.exit(0 if total_failures == 0 else 1)


if __name__ == "__main__":
    main()
