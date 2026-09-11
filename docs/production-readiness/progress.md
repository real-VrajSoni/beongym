# Phase evidence

## Phase 0 — audit recorded

See `audit.md`: architecture, code-based findings, severity/impact/fix/complexity/dependencies and revised execution plan. Baseline remains NOT READY. Static review does not prove every browser flow.

## Phase 1 — configuration verification passed

Changed: server-only normalized environment access and pure validation policy; instrumentation preview restrictions; QR canonical URL; discoverable Prisma config; guarded seed/reset/mutating test scripts; disposable DB harness; CI generation/unit checks; example and environment inventory.

Passed: lint; typecheck; Prisma validate; all 24 existing migrations applied to a new isolated database; 15 configuration/fixture safety tests; 184 tenant checks; 62 HTTP isolation checks; 28 existing signed webhook checks; 41 route checks; globe layout check. Desktop homepage screenshot `/tmp/beongym-phase1.png`, nonempty interactive snapshot, no Next error overlay or recorded browser errors.

Fixed during verification: TypeScript widened NODE_ENV in the test harness; added explicit ProcessEnv type and reran successfully. No outstanding test failures. Existing seed emits a pg concurrent-query deprecation warning; this is fixture code, not evidence of a production failure. Coverage percentage unavailable; static checks and route reads are not complete E2E coverage.

Risks/external work: production credentials and infrastructure are unverified. Local original DB unchanged. Phase 2 must remove implicit local payment simulation and add hostile/out-of-order payment coverage; the existing 28 webhook checks do not establish correctness of those cases. No application schema change in this phase. Existing untracked `.vscode/` is preserved.

## Phase 2 — in progress

Official Dodo webhook lifecycle and installed SDK types are being checked before provider-specific changes. Do not deploy while audit P0/P1 remain open.

### Phase 2 local verification

Changed: checkout actions and gateway mode; provider ledger schema/migration; event validation/handler/fulfilment; private checkout return and legacy redirect; owner billing portal entry point; claim copy; payment regression suite; seed dependency order; private cache headers.

Passed: 19 unit tests; 46 signed HTTP webhook checks; unavailable-gateway no-order check; 185 tenant assertions; 62 HTTP isolation checks; 41 route checks; lint; typecheck; diff whitespace check. Additive migration applied only to disposable test DB. The old anonymous checkout-return route test failed because authentication is now required; replaced its obsolete public-content expectation with a required login redirect and added own-buyer/other-buyer checks. Subsequent route suite passed.

Remaining launch gates: actual hosted Dodo checkout/portal verification; provider product/account settings; verified ledger import for any existing fulfilled Dodo subscriptions; independent claim approval workflow; production monitoring/restore and recurring-billing legal review. See `payments.md`. These are not claimed complete. No paid access is fabricated to bypass them. Next: phase 3 shared rate limiting and session security.

## Phase 3 — local security verification passed

Changed: shared database rate limiter and additive migration; session versions and JWT validation; password byte limits and revocation; authenticated session status; safe redirects and logout origin checks; budgets on login/signup/mutations/payments/public search; optional remote geocoder policy; blocked legacy public owner attachment; regression scripts, CI and environment documentation. Exact budgets and hosting dependencies are in `security.md`.

Passed: lint, typecheck, 22 unit tests, 5 security integration scenarios (including 25 concurrent requests admitting exactly 5), 185 tenant assertions, 62 HTTP isolation checks, 46 signed webhook checks, 41 route checks, globe layout check and diff whitespace check. Migration applied only to the disposable database. Restarted server with regenerated Prisma client; desktop homepage renders with no browser errors or Next error overlay (`/tmp/beongym-phase3.png`). Test listings are synthetic disposable fixtures, not evidence of real public businesses.

Failures fixed during verification: stale dev-server Prisma singleton caused session-status 500s until regeneration/restart; security action test now compiles its lazy route before reading action references; static tenant audit now recognizes `getValidSession`, the stronger replacement for `getSession`. All reruns passed. No outstanding failing check in this gate. Full E2E coverage and coverage percentage remain unavailable.

Risks: hosting-level abuse controls and rate budgets need deployment/load verification. Existing image-quality configuration warning remains in the UX/performance audit. No production/customer data changed. Phase 4 must enforce live account/profile/gym binding and remove private fields from public directory DTOs. Application remains NOT READY.
