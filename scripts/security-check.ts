import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { db } from "../lib/db";
import { consumeRateLimit } from "../lib/rate-limit";
import { signSession } from "../lib/session";
import { assertDisposableDatabase } from "./disposable-database";
import { readFileSync } from "node:fs";

async function main() {
  assertDisposableDatabase();
  const scope = `security-test-${randomUUID()}`;
  const key = createHmac("sha256", process.env.AUTH_SECRET!).update(`${scope}:fixture`).digest("hex");
  const user = await db.user.create({ data: { name: "Security Fixture", passwordHash: "not-a-login", role: "PROSPECT" } });
  try {
    const decisions = await Promise.all(Array.from({ length: 25 }, () => consumeRateLimit(scope, "fixture", 5, 60000)));
    assert.equal(decisions.filter(Boolean).length, 5);
    console.log("PASS: 25 concurrent requests admit exactly 5 across shared database counters");
    await db.$executeRaw`UPDATE rate_limit_buckets SET expires_at = clock_timestamp() - interval '1 second' WHERE key = ${key}`;
    assert.equal(await consumeRateLimit(scope, "fixture", 5, 60000), true);
    console.log("PASS: expired rate-limit window resets safely");
    const token = await signSession({ userId: user.id, name: user.name, email: null, role: "PROSPECT", profileId: null, gymId: null, gymName: null, gymCode: null, gymTier: null, gymAccessExpiresAt: null, sessionVersion: 0 });
    const headers = { cookie: `apex_session=${token}` };
    const base = process.env.CHECK_BASE_URL!;
    // Dev compiles action references lazily when their route is first rendered.
    await fetch(`${base}/list`, { headers });
    const status = async () => (await fetch(`${base}/api/session`, { headers })).json();
    assert.equal((await status()).signedIn, true);
    await db.user.update({ where: { id: user.id }, data: { sessionVersion: { increment: 1 } } });
    assert.equal((await status()).signedIn, false);
    console.log("PASS: server rejects a still-signed JWT after session revocation");
    assert.equal((await fetch(`${base}/logout`, { method: "POST", headers: { ...headers, origin: "https://evil.test" }, redirect: "manual" })).status, 403);
    assert.equal((await fetch(`${base}/logout`, { headers: { ...headers, "sec-fetch-site": "cross-site" }, redirect: "manual" })).status, 403);
    console.log("PASS: cross-origin logout requests rejected");
    const before = await db.user.count();
    const manifest = JSON.parse(readFileSync(".next/dev/server/server-reference-manifest.json", "utf8")) as {
      node: Record<string, { filename: string; exportedName: string }>;
    };
    const action = Object.entries(manifest.node).find(([, item]) => item.filename === "app/actions/list-gym.ts" && item.exportedName === "attachOwnerAction");
    assert.ok(action, "Compile /list before running the action regression");
    const attempt = await fetch(`${base}/list`, { method: "POST", headers: {
      origin: base, "content-type": "text/plain;charset=UTF-8", "next-action": action[0],
    }, body: "[null]" });
    assert.match(await attempt.text(), /Existing listings require independent ownership verification/);
    assert.equal(await db.user.count(), before);
    console.log("PASS: legacy public attachment cannot create an owner");
  } finally {
    await db.user.delete({ where: { id: user.id } });
    await db.$executeRaw`DELETE FROM rate_limit_buckets WHERE key = ${key}`;
    await db.$disconnect();
  }
}
main().catch((error) => { console.error(error instanceof assert.AssertionError ? error.message : "Security regression failed; inspect the local server"); process.exit(1); });
