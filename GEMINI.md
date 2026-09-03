# SPARTAN SAAS ENGINEERING RULES

These rules are ALWAYS active for this repository. Every agent must adhere strictly to these constraints.

## 1. CODE QUALITY & TYPESCRIPT INTEGRITY
- Strict TypeScript: Never use `any` unless absolutely forced by untyped third-party libraries. Always define strict interfaces.
- Component Modularity: Keep components focused, clean, and under 500 lines where practical. Break out modals and sub-cards into dedicated files.

## 2. PRE-FLIGHT VERIFICATION REQUIREMENT (MANDATORY)
- Before concluding any modification or reporting completion to the user, you MUST run:
  1. `./node_modules/.bin/tsc --noEmit` -> Must exit with code 0 (zero errors).
  2. `./node_modules/.bin/next build` -> Must compile successfully for production.
- If errors are found, fix them immediately before presenting your final answer.

## 3. LUXURY INSTITUTIONAL DESIGN SYSTEM
- Background: Deep Obsidian `#04060a` and `#080b12`.
- Borders: Subtle hairline metallic `#221c10` or `#2a2215`.
- Accents: 24K Royal Gold `#d4af37` and `#f5d77f`.
- Numerics: All currency amounts, percentages, and TxIDs MUST use `font-mono` (JetBrains Mono).

## 4. LINUX GIT RUNTIME ENVIRONMENT
- Whenever executing git commands in this environment, always prepend the required Flatpak runtime paths and SSH key:
  `export PATH="/var/lib/flatpak/runtime/org.freedesktop.Sdk/x86_64/25.08/b90ed309cc1d505dea48b6a2121c5dcfac22868120eee643b0596d31f96b9bb8/files/bin:/bin:/usr/bin" && export GIT_EXEC_PATH="/var/lib/flatpak/runtime/org.freedesktop.Sdk/x86_64/25.08/b90ed309cc1d505dea48b6a2121c5dcfac22868120eee643b0596d31f96b9bb8/files/libexec/git-core" && export GIT_SSH_COMMAND="/usr/bin/ssh -i /home/quoc/.ssh/id_ed25519 -o StrictHostKeyChecking=no"`
