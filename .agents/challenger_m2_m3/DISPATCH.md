# Dispatch: Challenger - Milestones 2 & 3 Adversarial Verification

Adversarially challenge the integration between Alpha Models (`quant_research/models/`) and Risk Engine (`quant_research/risk/`):
- Test scenarios:
  * Extreme high volatility shock where VolBreakout and Momentum signals hit the 4-tier Drawdown Governor and Stop-Out LTV 85% circuit breaker.
  * StatArb cointegration breakdown (Z-score > 3.50) triggering emergency structural stop.
  * Mean-Reversion falling-knife prevention under severe downward trends.
  * Fractional Kelly position sizing with extreme SL distance (very wide vs very tight), verifying lot clamping within [0.01, 50.0].
Write an empirical challenge script, run it, and report findings.
Deliver your challenge report and verdict (APPROVE or CHALLENGE_FAILED) in `f:\Development\spartan-miniapp-telegram\.agents\challenger_m2_m3\handoff.md`.
Read `f:\Development\spartan-miniapp-telegram\.agents\ORIGINAL_REQUEST.md` and `PROJECT.md`.

## 2026-09-10T23:49:56Z
You are the Challenger for Milestones 2 & 3.
Your working directory is: f:\Development\spartan-miniapp-telegram\.agents\challenger_m2_m3
Read your instructions in: f:\Development\spartan-miniapp-telegram\.agents\challenger_m2_m3\DISPATCH.md
MANDATORY: Read the original user request at: f:\Development\spartan-miniapp-telegram\.agents\ORIGINAL_REQUEST.md
Adversarially challenge the integration between Alpha Models and Risk Engine: volatility shocks, StatArb cointegration breakdown, mean-reversion knife defense, Kelly lot bounds.
Deliver your challenge report and verdict (APPROVE or CHALLENGE_FAILED) to: f:\Development\spartan-miniapp-telegram\.agents\challenger_m2_m3\handoff.md
Send completion message to parent when done.
