# Environment inventory and operating policy

Never paste values into tickets, logs or reports. Copy `.env.example` locally and generate a unique signing key. Configuration is validated before the Node server accepts requests and whenever server infrastructure initializes.

| Variable | Scope | Requirement / use |
|---|---|---|
| DATABASE_URL | server secret, PostgreSQL | Required everywhere; valid postgres/postgresql URL and database. Managed production credentials require least privilege and backups. |
| AUTH_SECRET | server secret | Required, at least 32 characters; production/preview reject recognizable placeholders. Generate 32 random bytes. Rotation invalidates all cookies. Never put in NEXT_PUBLIC. |
| APP_URL | server configuration, public origin | Required canonical origin. Hosted production/preview require HTTPS, no local hostname, credentials, path, query or fragment. Used for checkout and QR. |
| DODO_PAYMENTS_API_KEY | third-party server secret | Required when checkout is enabled and in deployed environments. Validate account/mode with Dodo; local syntax checks cannot authenticate credentials. |
| DODO_PAYMENTS_WEBHOOK_KEY | third-party server secret | Required with gateway; distinct from API key. Endpoint-specific signing secret. |
| DODO_PAYMENTS_ENVIRONMENT | third-party server configuration | live_mode in production; test_mode in hosted previews. Never infer valid account mode solely from a key prefix. |
| DODO_PRODUCT_ID_MONTHLY / ANNUAL | third-party server configuration | Required with gateway; different IDs. Operator must verify price, currency, interval and trial settings in Dodo. |
| DODO_ADAPTIVE_CURRENCY | optional server configuration | Existing default enabled. Historical transaction currency must remain authoritative; no invented conversion. |
| NODE_ENV | framework configuration | Next sets runtime mode. Do not override to development on a deployed server. |
| VERCEL_ENV | hosting configuration | Provider-set development/preview/production. Preview has the same security boundary but requires sandbox payments. |
| NEXT_RUNTIME | framework configuration | Instrumentation initializes validation in nodejs runtime. |
| GEOCODING_SEARCH_URL | optional third-party server configuration | HTTPS Nominatim-compatible search endpoint; disabled when absent. Explicit submissions only, shared maximum one request per 1.1 seconds. Operator must verify terms, attribution and quota; autocomplete is offline. |
| CHECK_BASE_URL | development/test | Optional local test URL. Fixture HTTP scripts refuse remote targets. |
| DISPOSABLE_DATABASE | development/test only | Explicit true required by fixture writers/reset. Also requires local DB named beongym_test or beongym_test_<suffix>. Forbidden in production/preview. |
| ALLOW_SIMULATED_PAYMENTS | rejected in deployed runtime | Not a production escape hatch. Existing implicit local simulation is removed in phase 2. |
| NEXT_PUBLIC_* | browser public | No application secret belongs here. Recognizable secret variable names are rejected. No current feature requires a public credential. |

Prisma uses `prisma.config.ts`, the discoverable CLI filename. Generate before clean typechecking. Apply production migrations with `npx prisma migrate deploy`; do not use reset/seed on a customer database. `npm run db:reset` now checks the disposable database policy.

For local verification, `npx tsx scripts/test-env.ts prepare` creates/migrates and seeds only `beongym_test_readiness`. It reuses local PostgreSQL authentication without copying customer records. Subsequent commands use `npx tsx scripts/test-env.ts npm run check:tenant` (or dev/check:isolation/check:webhook/check:routes/check:globe). The harness uses synthetic provider values; it does not prove hosted checkout or call real payment APIs successfully. Do not point it at an existing customer server.

Live account validation, deployed domain/TLS, connection pool limits, secret manager rotation and alert destinations require an actual deployment rehearsal. No secret values were included in this inventory.
