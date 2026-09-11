# Security controls and deployment requirements

Phase 3 adds atomic PostgreSQL rate-limit counters shared across application instances. Keys are HMACs of scope and identity; no raw email, token or IP is stored. Counters expire using database time; each request removes at most 50 buckets expired for more than an hour. Database failures never allow a protected mutation or login to proceed.

| Surface | Application limit |
|---|---|
| Login | 120/minute globally and 10/15 minutes per normalized account identity |
| Guarded mutations (including attendance, QR, leads, messages, claims) | 1,000/minute globally; 60/minute per signed actor or 30/minute for anonymous requests |
| Signup | 30/hour globally and 3/hour per normalized email, in addition to mutation limits |
| Password change / administrative reset | 5/hour / 10/hour per actor |
| Checkout | 60/hour globally and 5/hour per buyer |
| Currency preview | 10/minute per authenticated live account |
| Session status / public stats / public map | 1,000 / 1,000 / 600 per minute globally |
| Offline location suggestions | 300/minute globally |
| Optional remote geocoding | One request per 1.1 seconds globally; explicit submissions only |
| Public link analytics | 300/minute globally and 30/minute per link |

These are initial protective budgets, not measured capacity promises. Add hosting-layer bot/IP and request-size controls before public launch; the application deliberately does not trust arbitrary forwarded IP headers. Application counters do not stop volumetric attacks from reaching PostgreSQL. Global budgets can be exhausted by one caller; monitor denials and tune using observed traffic. Signed Dodo deliveries use signature verification, bounded bodies and transaction idempotency, rather than the interactive-user budget, so legitimate provider retries are not blocked by UI traffic. No OTP or public email recovery endpoint exists yet.

Session cookies retain HTTP-only, SameSite=Lax, seven-day expiration and Secure in production. JWT verification pins HS256, validates roles/claims and limits lifetime. Live access compares the account's session version; password resets, password changes, deactivation/reactivation and sign-out invalidate prior cookies. Existing cookies are version zero for migration compatibility. Sign-out explicitly signs out all devices. Deploy the additive session-version migration before deploying the application and regenerate Prisma/restart every instance.

Redirects reject external destinations, backslashes and control characters. Next's same-origin Server Action protections remain enabled without wildcard exemptions. The logout route verifies Origin on POST and browser fetch provenance on GET. The old public owner-attachment endpoint cannot create or attach an owner; independent claim approval remains a later dependency.

New passwords reject bcrypt's silent truncation beyond 72 UTF-8 bytes; existing passwords can still authenticate. The optional geocoder is disabled unless configured. Remote autocomplete was removed to respect the public Nominatim usage restriction; see [official policy](https://operations.osmfoundation.org/policies/nominatim/). Verify the selected provider's terms and attribution before enabling it.

Regression evidence is in `progress.md`. These controls do not establish full tenant isolation; phase 4 must tighten account/profile/gym binding and public DTOs. Password recovery, invitation delivery, audit event persistence and incident monitoring remain later phases.
