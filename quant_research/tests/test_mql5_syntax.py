"""
Unit Test Suite: MQL5 Expert Advisor & Include Modules Static Analysis
Validates:
- Strict compilation directive (#property strict)
- Delimiter balance ({}, (), []) across all .mq5 and .mqh files
- OOP class hierarchies and method contracts
- MQL5 lifecycle handlers (OnInit, OnDeinit, OnTick, OnTimer, OnTradeTransaction)
- Magic Number taxonomy generation and parsing
- Resilient WebRequest queue capacity and disk spool specification
- Error handling contracts (retcode 10009, error 4014)
"""

import os
import re
import unittest
from typing import List, Tuple

EXECUTION_MQL5_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "execution", "mql5")
)
INCLUDE_DIR = os.path.join(EXECUTION_MQL5_DIR, "Include")


def strip_comments_and_strings(content: str) -> str:
    """
    Remove block comments (/* */), string literals ("..."), and line comments (//)
    in the correct grammatical order so URLs inside string literals are preserved
    until stripped, allowing strict delimiter balancing analysis.
    """
    # Remove block comments
    content = re.sub(r"/\*.*?\*/", "", content, flags=re.DOTALL)
    # Remove string literals FIRST so // inside "https://..." is not treated as a comment
    content = re.sub(r'"(?:\\.|[^"\\])*"', '""', content)
    # Now remove line comments
    content = re.sub(r"//.*", "", content)
    return content


def check_delimiter_balance(text: str) -> Tuple[bool, str]:
    """Check if curly braces, parentheses, and brackets are perfectly balanced."""
    cleaned = strip_comments_and_strings(text)
    stack = []
    pairs = {')': '(', '}': '{', ']': '['}

    for idx, char in enumerate(cleaned):
        if char in '({[':
            stack.append((char, idx))
        elif char in ')}]':
            if not stack:
                return False, f"Unexpected closing '{char}' at position {idx}"
            top, _ = stack.pop()
            if pairs[char] != top:
                return False, f"Mismatched delimiter: expected '{pairs[char]}' but got '{char}'"

    if stack:
        unclosed, pos = stack[-1]
        return False, f"Unclosed '{unclosed}' remaining at position {pos}"

    return True, "Balanced"


class TestMQL5SyntaxAndArchitecture(unittest.TestCase):
    """Static analysis test harness for MQL5 code."""

    def setUp(self):
        self.assertTrue(os.path.isdir(EXECUTION_MQL5_DIR), f"Directory not found: {EXECUTION_MQL5_DIR}")
        self.master_ea_path = os.path.join(EXECUTION_MQL5_DIR, "SpartanMasterEA.mq5")
        self.assertTrue(os.path.isfile(self.master_ea_path), f"Master EA missing: {self.master_ea_path}")

        self.include_files = [
            "SpartanCore.mqh",
            "SpartanGhost.mqh",
            "SpartanRisk.mqh",
            "SpartanTrade.mqh",
            "SpartanWebhook.mqh",
            "SpartanNews.mqh",
        ]
        for f in self.include_files:
            p = os.path.join(INCLUDE_DIR, f)
            self.assertTrue(os.path.isfile(p), f"Include file missing: {p}")

    def test_property_strict_directive_present(self):
        """Verify #property strict exists in Master EA and all Include files."""
        with open(self.master_ea_path, "r", encoding="utf-8") as f:
            content = f.read()
            self.assertIn("#property strict", content, "Master EA must contain #property strict")

        for inc in self.include_files:
            path = os.path.join(INCLUDE_DIR, inc)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
                self.assertIn("#property strict", content, f"{inc} must contain #property strict")

    def test_delimiter_balancing_master_ea(self):
        """Verify perfect balance of braces, parentheses, and brackets in SpartanMasterEA.mq5."""
        with open(self.master_ea_path, "r", encoding="utf-8") as f:
            content = f.read()
        balanced, msg = check_delimiter_balance(content)
        self.assertTrue(balanced, f"Delimiter syntax error in SpartanMasterEA.mq5: {msg}")

    def test_delimiter_balancing_all_includes(self):
        """Verify perfect balance of braces, parentheses, and brackets in all Include files."""
        for inc in self.include_files:
            path = os.path.join(INCLUDE_DIR, inc)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            balanced, msg = check_delimiter_balance(content)
            self.assertTrue(balanced, f"Delimiter syntax error in {inc}: {msg}")

    def test_lifecycle_event_handlers_in_master_ea(self):
        """Verify presence of all standard MQL5 lifecycle handlers."""
        with open(self.master_ea_path, "r", encoding="utf-8") as f:
            content = f.read()

        handlers = ["OnInit", "OnDeinit", "OnTick", "OnTimer", "OnTradeTransaction"]
        for h in handlers:
            pattern = rf"\b{h}\s*\("
            self.assertTrue(bool(re.search(pattern, content)), f"Lifecycle handler {h} missing from SpartanMasterEA.mq5")

    def test_core_oop_classes_declared(self):
        """Verify OOP classes are declared cleanly."""
        classes = {
            "SpartanCore.mqh": ["CSpartanCore"],
            "SpartanGhost.mqh": ["CGhostStrategy", "CSpartanGhostManager"],
            "SpartanRisk.mqh": ["CSpartanRiskEngine"],
            "SpartanTrade.mqh": ["CSpartanTrade"],
            "SpartanWebhook.mqh": ["CSpartanWebhookBridge"],
            "SpartanNews.mqh": ["CSpartanNewsFilter"],
        }
        for filename, expected_classes in classes.items():
            path = os.path.join(INCLUDE_DIR, filename)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            for cls_name in expected_classes:
                pattern = rf"\bclass\s+{cls_name}\b"
                self.assertTrue(bool(re.search(pattern, content)), f"Class {cls_name} not found in {filename}")

    def test_ghost_magic_taxonomy_logic(self):
        """Verify Multi-Ghost Magic Taxonomy constants and formulas in SpartanGhost.mqh."""
        path = os.path.join(INCLUDE_DIR, "SpartanGhost.mqh")
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn("MAGIC_BASE_PREFIX             880000", content)
        self.assertIn("MAGIC_MASTER_STAT_ARB         888801", content)
        self.assertIn("MAGIC_MASTER_MOMENTUM         888802", content)
        self.assertIn("MAGIC_MASTER_VOL_BREAKOUT     888803", content)
        self.assertIn("MAGIC_MASTER_MEAN_REV         888804", content)
        self.assertIn("MakeGhostMagic", content)
        self.assertIn("ParseGhostMagic", content)

    def test_resilient_webhook_queue_and_spool_spec(self):
        """Verify 500-item queue capacity and spartan_webhook_spool.dat file spool."""
        path = os.path.join(INCLUDE_DIR, "SpartanWebhook.mqh")
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn("SPARTAN_QUEUE_CAPACITY        500", content)
        self.assertIn("spartan_webhook_spool.dat", content)
        self.assertIn("4014", content, "MQL5 Error 4014 whitelist handling must be present")
        self.assertIn("x-ea-key", content, "x-ea-key header must be formatted")

    def test_trade_result_retcode_10009_done(self):
        """Verify TRADE_RETCODE_DONE (10009) handling in trade module."""
        path = os.path.join(INCLUDE_DIR, "SpartanTrade.mqh")
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn("10009", content)
        self.assertIn("TRADE_RETCODE_DONE", content)
        self.assertIn("TRADE_ACTION_DEAL", content)

    def test_risk_governor_thresholds(self):
        """Verify 4-tier drawdown governor & stop-out LTV 85% in SpartanRisk.mqh."""
        path = os.path.join(INCLUDE_DIR, "SpartanRisk.mqh")
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn("TIER_1_NORMAL", content)
        self.assertIn("TIER_2_SOFT_THROTTLE", content)
        self.assertIn("TIER_3_HARD_FREEZE", content)
        self.assertIn("TIER_4_CIRCUIT_BREAKER", content)
        self.assertIn("0.85", content, "Stop-Out LTV 85% threshold must be present")


if __name__ == "__main__":
    unittest.main()
