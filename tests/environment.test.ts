import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEnvironment } from "../lib/environment-policy";
import { assertDisposableDatabase } from "../scripts/disposable-database";

const dev = {
  NODE_ENV: "development", DATABASE_URL: "postgresql://u:p@localhost:5432/beongym_test",
  AUTH_SECRET: "a9bc72de4056fg81h3ij94kl27mn05op", APP_URL: "http://localhost:3400/",
};
const deployed = {
  ...dev, NODE_ENV: "production", APP_URL: "https://app.beongym.test/",
  DODO_PAYMENTS_API_KEY: "fixture-api-987654321", DODO_PAYMENTS_WEBHOOK_KEY: "fixture-hook-987654321",
  DODO_PAYMENTS_ENVIRONMENT: "live_mode", DODO_PRODUCT_ID_MONTHLY: "pdt_monthly", DODO_PRODUCT_ID_ANNUAL: "pdt_annual",
};
test("development accepts absent or blank optional provider values and normalizes origin", () => {
  assert.equal(parseEnvironment({ ...dev, DODO_PAYMENTS_API_KEY: "  " }).dodoApiKey, undefined);
  assert.equal(parseEnvironment(dev).appUrl, "http://localhost:3400");
});
test("production requires complete gateway configuration", () => {
  assert.throws(() => parseEnvironment({ ...dev, NODE_ENV: "production" }), /DODO_PAYMENTS_API_KEY/);
  assert.equal(parseEnvironment(deployed).dodoEnvironment, "live_mode");
});
test("previews cannot simulate or charge live payments", () => {
  assert.throws(() => parseEnvironment({ ...dev, VERCEL_ENV: "preview" }), /DODO_PAYMENTS_API_KEY/);
  assert.throws(() => parseEnvironment({ ...deployed, VERCEL_ENV: "preview" }), /preview requires test_mode/);
  assert.equal(parseEnvironment({ ...deployed, VERCEL_ENV: "preview", DODO_PAYMENTS_ENVIRONMENT: "test_mode" }).dodoEnvironment, "test_mode");
});
for (const url of ["http://beongym.test", "https://localhost", "https://127.0.0.1", "https://[::1]", "https://2130706433", "https://localhost.", "https://u:p@beongym.test", "https://beongym.test/path", "https://beongym.test/?x=1"]) {
  test(`deployed origin rejects ${url}`, () => assert.throws(() => parseEnvironment({ ...deployed, APP_URL: url }), /APP_URL/));
}
test("rejects invalid database, placeholder secret, test mode, shared keys and exposed secrets", () => {
  for (const change of [
    { DATABASE_URL: "https://db.test/database" }, { AUTH_SECRET: "change-me-to-a-random-string-of-at-least-32-characters" },
    { AUTH_SECRET: ` ${dev.AUTH_SECRET}` }, { DODO_PAYMENTS_ENVIRONMENT: "test_mode" },
    { DODO_PAYMENTS_WEBHOOK_KEY: deployed.DODO_PAYMENTS_API_KEY }, { NEXT_PUBLIC_AUTH_SECRET: dev.AUTH_SECRET },
    { DODO_PRODUCT_ID_ANNUAL: deployed.DODO_PRODUCT_ID_MONTHLY }, { ALLOW_SIMULATED_PAYMENTS: "true" },
  ]) assert.throws(() => parseEnvironment({ ...deployed, ...change }));
});
test("errors never contain secret values", () => {
  try { parseEnvironment({ ...deployed, DATABASE_URL: "private-invalid-database-url", AUTH_SECRET: "private-short-key" }); }
  catch (error) {
    assert.doesNotMatch(String(error), /private-invalid-database-url|private-short-key/);
    return;
  }
  assert.fail("invalid configuration accepted");
});
test("fixture guard rejects customer databases, remote targets and deployed execution", () => {
  const safe = { ...dev, DISPOSABLE_DATABASE: "true" };
  assert.doesNotThrow(() => assertDisposableDatabase(safe));
  for (const change of [
    { DISPOSABLE_DATABASE: "false" }, { DATABASE_URL: "postgresql://localhost/apex_coach" },
    { DATABASE_URL: "postgresql://remote.test/beongym_test" }, { NODE_ENV: "production" },
    { VERCEL_ENV: "preview" }, { CHECK_BASE_URL: "https://beongym.com" },
  ]) assert.throws(() => assertDisposableDatabase({ ...safe, ...change }));
});
