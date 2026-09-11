import { test } from "node:test";
import assert from "node:assert/strict";
import { SignJWT } from "jose";
import { safeRedirectPath, validNewPassword } from "../lib/security";
import { verifySession, signSession, type SessionUser } from "../lib/session";

test("redirects are local paths, never browser-normalized external URLs", () => {
  for (const input of ["https://evil.test", "//evil.test", "/\\evil.test", "/%5cevil.test", "/%2fevil.test", "/\nevil.test", "/%00evil", "/%broken", { path: "/gym" }]) assert.equal(safeRedirectPath(input), null);
  for (const input of ["/gym/dashboard", "/me/classes?date=2026-09-11", "/checkin/IRON-4821?k=public-code"]) assert.equal(safeRedirectPath(input), input);
});
test("password limits use bcrypt UTF-8 bytes without truncating Unicode", () => {
  assert.equal(validNewPassword("a".repeat(72)), true);
  assert.equal(validNewPassword("a".repeat(73)), false);
  assert.equal(validNewPassword("😀".repeat(18)), true);
  assert.equal(validNewPassword("😀".repeat(19)), false);
  assert.equal(validNewPassword("short"), false);
  assert.equal(validNewPassword(null), false);
});
test("JWT verifier validates algorithm, lifetime, role and version claims", async () => {
  process.env.AUTH_SECRET = "security-fixture-signing-secret-0123456789";
  const user: SessionUser = { userId: "fixture", name: "Fixture", role: "PROSPECT", email: null, gymId: null, profileId: null, gymName: null, gymCode: null, gymTier: null, gymAccessExpiresAt: null, sessionVersion: 2 };
  assert.equal((await verifySession(await signSession(user)))?.sessionVersion, 2);
  const key = new TextEncoder().encode(process.env.AUTH_SECRET);
  for (const extra of [{ role: "ADMIN" }, { userId: {} }, { sessionVersion: -1 }, { gymId: {} }]) {
    const token = await new SignJWT({ ...user, ...extra }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(key);
    assert.equal(await verifySession(token), null);
  }
  const wrongAlg = await new SignJWT(user).setProtectedHeader({ alg: "HS384" }).setIssuedAt().setExpirationTime("1h").sign(key);
  assert.equal(await verifySession(wrongAlg), null);
  const tooLong = await new SignJWT(user).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("8d").sign(key);
  assert.equal(await verifySession(tooLong), null);
  const expired = await new SignJWT(user).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("-1s").sign(key);
  assert.equal(await verifySession(expired), null);
});
