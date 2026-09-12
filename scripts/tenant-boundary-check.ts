import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { db } from "../lib/db";
import { signSession, type SessionUser } from "../lib/session";
import { resolveLiveSession } from "../lib/session-live";
import { getPublicGym, listGyms } from "../lib/data/directory";
import { assertDisposableDatabase } from "./disposable-database";

async function main() {
  assertDisposableDatabase();
  const base = process.env.CHECK_BASE_URL!;
  const prefix = `TEN-${randomUUID().slice(0, 8)}`.toUpperCase();
  const gym = await db.gym.create({ data: { code: prefix, name: "Isolated boundary fixture", tier: "PRO", status: "ACTIVE", listed: true, accessExpiresAt: new Date(Date.now() + 86400000) } });
  let passed = 0;
  let messageId: string | null = null;
  const check = (name: string, condition: unknown) => { assert.ok(condition, name); passed++; console.log(`PASS ${name}`); };
  const request = async (path: string, session: SessionUser) => fetch(base + path, { headers: { cookie: `apex_session=${await signSession(session)}` }, redirect: "manual" });
  try {
    const owner = await db.user.create({ data: { gymId: gym.id, name: "Boundary owner", role: "GYM_OWNER", passwordHash: "not-a-login", trainerProfile: { create: { gymId: gym.id } } }, include: { trainerProfile: true } });
    const member = await db.user.create({ data: { gymId: gym.id, name: "Private fixture member", role: "MEMBER", passwordHash: "not-a-login", clientProfile: { create: { gymId: gym.id, memberCode: "M-0001" } } }, include: { clientProfile: true } });
    const other = await db.user.create({ data: { gymId: gym.id, name: "Private second member", role: "MEMBER", passwordHash: "not-a-login", clientProfile: { create: { gymId: gym.id, memberCode: "M-0002" } } }, include: { clientProfile: true } });
    const foreign = await db.gym.findUniqueOrThrow({ where: { code: "TITAN-2093" } });
    const foreignOwner = await db.user.findFirstOrThrow({ where: { gymId: foreign.id, role: "GYM_OWNER" }, include: { trainerProfile: true } });
    const session: SessionUser = { userId: owner.id, role: "GYM_OWNER", name: owner.name, email: null, profileId: owner.trainerProfile!.id, gymId: gym.id, gymName: gym.name, gymCode: gym.code, gymTier: gym.tier, gymAccessExpiresAt: gym.accessExpiresAt!.toISOString(), sessionVersion: 0 };
    const memberSession: SessionUser = { ...session, userId: member.id, role: "MEMBER", name: member.name, profileId: member.clientProfile!.id };
    check("valid owner binding", await resolveLiveSession(session));
    check("valid member binding", await resolveLiveSession(memberSession));
    for (const [name, forged] of [
      ["foreign gym claim", { ...session, gymId: foreign.id }],
      ["foreign staff profile", { ...session, profileId: foreignOwner.trainerProfile!.id }],
      ["same-gym other member profile", { ...memberSession, profileId: other.clientProfile!.id }],
      ["role escalation", { ...memberSession, role: "SUPER_ADMIN", profileId: null, gymId: null }],
    ] as [string, SessionUser][]) {
      check(`live resolver rejects ${name}`, (await resolveLiveSession(forged)) === null);
      check(`HTTP rejects ${name}`, (await (await request("/api/session", forged)).json()).signedIn === false);
    }
    await db.user.update({ where: { id: member.id }, data: { isActive: false } });
    check("deactivated member rejected", (await resolveLiveSession(memberSession)) === null);
    await db.user.update({ where: { id: member.id }, data: { isActive: true } });
    await db.gym.update({ where: { id: gym.id }, data: { status: "SUSPENDED" } });
    check("suspended gym rejected", (await resolveLiveSession(session)) === null);
    check("suspended profile hidden", (await getPublicGym(gym.code)) === null);
    await db.gym.update({ where: { id: gym.id }, data: { status: "ACTIVE", accessExpiresAt: new Date(Date.now() - 86400000) } });
    const expired = await request("/gym/clients", session);
    const expiredBody = await expired.text();
    check("old paid cookie cannot read lapsed roster", !expiredBody.includes(member.name) && ((expired.headers.get("location") ?? "").includes("/gym/renew") || expiredBody.includes("NEXT_REDIRECT;replace;/gym/renew")));
    await db.gym.update({ where: { id: gym.id }, data: { accessExpiresAt: new Date(Date.now() + 7 * 86400000) } });
    check("renewal preserves valid session", (await (await request("/api/session", session)).json()).signedIn);
    check("renewed member sees own portal", (await request("/me", memberSession)).status === 200);

    const hidden = await db.plan.create({ data: { gymId: gym.id, trainerId: owner.trainerProfile!.id, name: "Private price fixture", planType: "GROUP_COACHING", durationDays: 30, billingInterval: "MONTHLY", price: 987654.32, showPrice: false } });
    const profile = await getPublicGym(gym.code);
    check("public fixture found", profile !== null);
    check("hidden price stripped in public DTO", profile?.plans.find(p => p.id === hidden.id)?.price === null);
    const privateKeys = /"(?:memberCount|staffCount|_count|viewCount|views|clickCount|storeSetupAt|passwordHash|sessionVersion)":/;
    check("public profile excludes operational fields", !privateKeys.test(JSON.stringify(profile)));
    check("map excludes operational fields", !privateKeys.test(JSON.stringify(await listGyms())));
    const publicBody = await (await fetch(`${base}/gyms/${gym.code}`)).text();
    check("public HTML and RSC omit hidden price and member identity", !publicBody.includes("987654.32") && !publicBody.includes(member.name));
    await db.gym.update({ where: { id: gym.id }, data: { listed: false } });
    check("private gym hidden from profile and map", (await getPublicGym(gym.code)) === null && !(await listGyms()).some(g => g.code === gym.code));

    const victimMember = await db.clientProfile.findFirstOrThrow({ where: { gymId: foreign.id } });
    const victimPlan = await db.plan.findFirstOrThrow({ where: { gymId: foreign.id } });
    const victimPayment = await db.payment.findFirstOrThrow({ where: { subscription: { plan: { gymId: foreign.id } } } });
    const victimSubscription = await db.subscription.findFirstOrThrow({ where: { plan: { gymId: foreign.id } } });
    const victimClass = await db.gymClass.findFirstOrThrow({ where: { gymId: foreign.id } });
    const victimLead = await db.lead.findFirstOrThrow({ where: { gymId: foreign.id } });
    const victimMessage = await db.messageLog.create({ data: { gymId: foreign.id, kind: "EXPIRY_REMINDER", phone: "fixture-no-delivery", body: "Synthetic isolation fixture", dueOn: new Date() } });
    messageId = victimMessage.id;
    const before = JSON.stringify([victimPlan, victimPayment, victimSubscription, victimClass, victimLead, victimMessage]);
    for (const path of ["/gym/settings", "/gym/attendance", "/gym/plans", "/gym/payments", "/gym/subscriptions", "/gym/classes", "/gym/leads", "/gym/messages", "/gym/staff", `/gym/clients/${member.clientProfile!.id}`]) await request(path, session);
    const manifest = JSON.parse(readFileSync(".next/dev/server/server-reference-manifest.json", "utf8")) as { node: Record<string, { filename: string; exportedName: string }> };
    const post = async (file: string, name: string, args: unknown[], as = session, origin = base) => {
      const action = Object.entries(manifest.node).find(([, item]) => item.filename === `app/actions/${file}.ts` && item.exportedName === name);
      assert.ok(action, `Action compiled: ${name}`);
      return fetch(`${base}${as.role === "MEMBER" ? "/me/paused" : "/gym/settings"}`, { method: "POST", redirect: "manual", headers: { origin, cookie: `apex_session=${await signSession(as)}`, "content-type": "text/plain;charset=UTF-8", "next-action": action[0] }, body: JSON.stringify(args) });
    };
    for (const [file, name, args] of [
      ["attendance", "checkInMemberAction", [victimMember.id]],
      ["plans", "deletePlanAction", [victimPlan.id]],
      ["payments", "setPaymentStatusAction", [victimPayment.id, "REFUNDED"]],
      ["subscriptions", "setSubscriptionStatusAction", [victimSubscription.id, "CANCELLED"]],
      ["classes", "deleteClassAction", [victimClass.id]],
      ["leads", "deleteLeadAction", [victimLead.id]],
      ["messages", "setMessageStatusAction", [victimMessage.id, "SENT"]],
      ["staff", "setStaffActiveAction", [foreignOwner.id, false]],
      ["clients", "resetMemberPasswordAction", [victimMember.id, "Synthetic-test-password"]],
    ] as [string, string, unknown[]][]) {
      check(`direct action denies cross-tenant ${name}`, (await (await post(file, name, args)).text()).includes('"ok":false'));
    }
    const csrf = await post("plans", "deletePlanAction", [victimPlan.id], session, "https://evil.test");
    check("cross-origin server action rejected", csrf.status >= 400);
    const deniedMember = await post("plans", "deletePlanAction", [hidden.id], memberSession);
    const deniedBody = await deniedMember.text();
    check("member cannot delete their own gym's plan via member route", !deniedBody.includes('"ok":true') && await db.plan.count({ where: { id: hidden.id } }) === 1);
    check("owner can delete their own unused plan", (await (await post("plans", "deletePlanAction", [hidden.id])).text()).includes('"ok":true') && await db.plan.count({ where: { id: hidden.id } }) === 0);
    const after = JSON.stringify(await Promise.all([
      db.plan.findUnique({ where: { id: victimPlan.id } }), db.payment.findUnique({ where: { id: victimPayment.id } }),
      db.subscription.findUnique({ where: { id: victimSubscription.id } }), db.gymClass.findUnique({ where: { id: victimClass.id } }),
      db.lead.findUnique({ where: { id: victimLead.id } }), db.messageLog.findUnique({ where: { id: victimMessage.id } }),
    ]));
    check("cross-tenant rows unchanged", after === before);
    await db.user.delete({ where: { id: other.id } });
    check("deleted user rejected", (await resolveLiveSession({ ...memberSession, userId: other.id, profileId: other.clientProfile!.id })) === null);
    console.log(`${passed} tenant-boundary regressions passed`);
  } finally {
    if (messageId) await db.messageLog.deleteMany({ where: { id: messageId } });
    await db.gym.delete({ where: { id: gym.id } });
    await db.$disconnect();
  }
}
main().catch(error => { console.error(error instanceof assert.AssertionError ? error.message : "Tenant boundary check failed; inspect local test output"); process.exit(1); });
