import "dotenv/config";
import { spawnSync } from "node:child_process";
import { Client } from "pg";
import { localHostname } from "../lib/environment-policy";
import { assertDisposableDatabase } from "./disposable-database";

async function main() {
  const source = new URL(process.env.DATABASE_URL ?? "");
  if (!localHostname(source.hostname)) throw new Error("Test harness requires local PostgreSQL. Configure a local DATABASE_URL.");
  source.pathname = "/beongym_test_readiness";
  const env: NodeJS.ProcessEnv = {
    ...process.env, DATABASE_URL: source.toString(), NODE_ENV: "development", VERCEL_ENV: "development",
    DISPOSABLE_DATABASE: "true", APP_URL: "http://localhost:3400", CHECK_BASE_URL: "http://localhost:3400",
    AUTH_SECRET: "local-fixture-signing-key-0123456789abcdef",
    DODO_PAYMENTS_API_KEY: "fixture-no-network-api", DODO_PAYMENTS_ENVIRONMENT: "test_mode",
    DODO_PAYMENTS_WEBHOOK_KEY: "whsec_" + Buffer.from("beongym-webhook-test-secret").toString("base64"),
    DODO_PRODUCT_ID_MONTHLY: "pdt_test_monthly", DODO_PRODUCT_ID_ANNUAL: "pdt_test_annual",
  };
  assertDisposableDatabase(env);
  const args = process.argv.slice(2);
  if (args[0] === "prepare") {
    const admin = new URL(source); admin.pathname = "/postgres";
    const client = new Client({ connectionString: admin.toString() });
    await client.connect();
    try {
      const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", ["beongym_test_readiness"]);
      if (!exists.rowCount) await client.query('CREATE DATABASE "beongym_test_readiness"');
    } finally { await client.end(); }
    for (const command of [["prisma", "migrate", "deploy"], ["tsx", "prisma/seed.ts"]]) {
      const result = spawnSync("npx", command, { env, stdio: "inherit" });
      if (result.status !== 0) process.exit(result.status ?? 1);
    }
  } else {
    if (!args.length) throw new Error("Supply prepare, or a command to run against disposable fixtures.");
    const result = spawnSync(args[0], args.slice(1), { env, stdio: "inherit" });
    process.exit(result.status ?? 1);
  }
}
main().catch(() => { console.error("Test harness failed. Check local PostgreSQL availability and command output; credentials omitted."); process.exit(1); });
