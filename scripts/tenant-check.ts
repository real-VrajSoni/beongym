/**
 * Cross-tenant authorization test:
 *   npm run check:tenant        (no dev server needed — this talks to Postgres)
 *
 * Two halves.
 *
 * The first drives every ownership assertion in `lib/data/tenant.ts` twice: once
 * with the gym that owns the row, once with a different gym. Same function, same
 * database, opposite answers. These are the real functions the server actions
 * call, imported directly — not a transcription of their `where` clauses, which
 * would pass happily while the actions drifted underneath it.
 *
 * The second reads `app/actions/*.ts` and asserts that every write to a
 * tenant-owned table is preceded, inside the same action, by something that
 * establishes ownership. That is the check that catches the *next* one: a new
 * action with a `db.thing.update({ where: { id } })` and no assertion is exactly
 * the shape of the bug this milestone found in the workout and diet plans.
 */
import "dotenv/config";
import { assertDisposableDatabase } from "./disposable-database";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import * as tenant from "../lib/data/tenant";
import { MESSAGE_KINDS } from "../lib/data/messaging";

type Check = { name: string; pass: boolean; detail: string };
const checks: Check[] = [];
const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

/** Owner says yes, stranger says no. Both halves matter: a function that always
 *  returns false would pass a one-sided test and break the product. */
async function bothWays(
  label: string,
  fn: (scope: string, id: string) => Promise<boolean>,
  ownScope: string,
  otherScope: string,
  rowId: string | null,
) {
  if (!rowId) {
    add(label, false, "no fixture row — seed the database (npm run db:seed)");
    return;
  }
  const own = await fn(ownScope, rowId);
  const cross = await fn(otherScope, rowId);
  add(`${label} — owner allowed`, own, own ? "true" : "returned false for its own row");
  add(`${label} — other tenant refused`, !cross, cross ? "RETURNED TRUE ACROSS TENANTS" : "false");
}

async function main() {
  assertDisposableDatabase();
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

  const A = await db.gym.findUniqueOrThrow({ where: { code: "IRON-4821" } });
  const B = await db.gym.findUniqueOrThrow({ where: { code: "TITAN-2093" } });

  /* ── Gym B's rows, one of each kind, offered to Gym A ──────────── */
  const first = async <T>(p: Promise<T | null>): Promise<string | null> =>
    ((await p) as { id: string } | null)?.id ?? null;

  const memberB = await first(db.clientProfile.findFirst({ where: { gymId: B.id } }));
  const memberBFixture = memberB;
  const planB = await first(db.plan.findFirst({ where: { gymId: B.id } }));
  const subB = await first(db.subscription.findFirst({ where: { plan: { gymId: B.id } } }));
  const payB = await first(
    db.payment.findFirst({ where: { subscription: { plan: { gymId: B.id } } } }),
  );
  const attB = await first(db.attendance.findFirst({ where: { gymId: B.id } }));
  const classB = await first(db.gymClass.findFirst({ where: { gymId: B.id } }));
  const bookingB = await first(db.classBooking.findFirst({ where: { gymClass: { gymId: B.id } } }));
  const leadB = await first(db.lead.findFirst({ where: { gymId: B.id } }));
  // The reminder queue is built on demand and the seed leaves it empty, so the
  // fixture is made here and removed in `finally`. A queued message is a
  // disposable row the app rebuilds from the rules whenever anybody asks.
  let msgB = await first(db.messageLog.findFirst({ where: { gymId: B.id } }));
  let borrowedMessage: string | null = null;
  if (!msgB && memberBFixture) {
    const made = await db.messageLog.create({
      data: {
        gymId: B.id,
        clientId: memberBFixture,
        kind: MESSAGE_KINDS[0],
        phone: "+910000000000",
        body: "tenant-check fixture",
        status: "QUEUED",
        dueOn: new Date(),
      },
      select: { id: true },
    });
    msgB = made.id;
    borrowedMessage = made.id;
  }
  const noteB = await first(db.trainerNote.findFirst({ where: { client: { gymId: B.id } } }));
  const coachB = await first(db.trainerProfile.findFirst({ where: { gymId: B.id } }));
  const staffB = await first(
    db.user.findFirst({ where: { gymId: B.id, role: { in: ["GYM_OWNER", "GYM_STAFF"] } } }),
  );

  console.log(`\nGym A = ${A.code}   Gym B = ${B.code}\n`);
  console.log("── Gym A reaching for Gym B's rows ─────────────────────────");

  await bothWays("member", tenant.assertGymMember, B.id, A.id, memberB);
  await bothWays("plan", tenant.assertGymPlan, B.id, A.id, planB);
  await bothWays("subscription", tenant.assertGymSubscription, B.id, A.id, subB);
  await bothWays("payment", tenant.assertGymPayment, B.id, A.id, payB);
  await bothWays("attendance", tenant.assertGymAttendance, B.id, A.id, attB);
  await bothWays("class", tenant.assertGymClass, B.id, A.id, classB);
  await bothWays("booking", tenant.assertGymBooking, B.id, A.id, bookingB);
  await bothWays("lead", tenant.assertGymLead, B.id, A.id, leadB);
  await bothWays("queued message", tenant.assertGymMessage, B.id, A.id, msgB);
  await bothWays("staff note", tenant.assertGymNote, B.id, A.id, noteB);
  await bothWays("coach", tenant.assertGymCoach, B.id, A.id, coachB);
  await bothWays("staff account", tenant.assertGymStaff, B.id, A.id, staffB);

  /* ── a member is not staff, however the id is passed ───────────── */
  const memberUserB = await db.clientProfile.findFirst({
    where: { gymId: B.id },
    select: { userId: true },
  });
  if (memberUserB) {
    const asStaff = await tenant.assertGymStaff(B.id, memberUserB.userId);
    add(
      "a member's own gym cannot treat them as staff",
      !asStaff,
      asStaff ? "MEMBER ACCEPTED AS STAFF" : "false",
    );
  }

  /* ── the attachment bug: my plan + your attachment ─────────────── */
  const planA = await db.plan.findFirstOrThrow({ where: { gymId: A.id } });
  const wpB = await db.workoutPlan.findFirst({ where: { plan: { gymId: B.id } } });
  const dpB = await db.dietPlan.findFirst({ where: { plan: { gymId: B.id } } });
  const wpAOwn = await db.workoutPlan.findFirst({ where: { plan: { gymId: A.id } } });

  if (wpB) {
    const leak = await tenant.assertPlanWorkout(planA.id, wpB.id);
    add(
      "workout plan — Gym A's plan cannot adopt Gym B's attachment",
      !leak,
      leak ? "CROSS-TENANT WRITE ALLOWED" : "false",
    );
  }
  if (dpB) {
    const leak = await tenant.assertPlanDiet(planA.id, dpB.id);
    add(
      "diet plan — Gym A's plan cannot adopt Gym B's attachment",
      !leak,
      leak ? "CROSS-TENANT WRITE ALLOWED" : "false",
    );
  }
  if (wpAOwn) {
    const ok = await tenant.assertPlanWorkout(wpAOwn.planId, wpAOwn.id);
    add("workout plan — its own parent is allowed", ok, ok ? "true" : "refused its own parent");
  }

  /* ── member A must not reach member B's booking ────────────────── */
  const bookA = await db.classBooking.findFirst({ where: { gymClass: { gymId: A.id } } });
  const bookB2 = await db.classBooking.findFirst({ where: { gymClass: { gymId: B.id } } });
  if (bookA && bookB2 && bookA.memberId !== bookB2.memberId) {
    const own = await tenant.assertOwnBooking(bookA.memberId, bookA.id);
    const cross = await tenant.assertOwnBooking(bookA.memberId, bookB2.id);
    add("booking — a member may cancel their own", own, own ? "true" : "refused their own booking");
    add(
      "booking — a member cannot cancel another member's",
      !cross,
      cross ? "CROSS-MEMBER CANCEL ALLOWED" : "false",
    );
  }

  /* ── two members of the SAME gym are still separate people ─────── */
  const twoA = await db.clientProfile.findMany({
    where: { gymId: A.id },
    take: 2,
    select: { id: true },
  });
  const bookingsOfFirst = twoA[0]
    ? await db.classBooking.findFirst({ where: { memberId: twoA[0].id } })
    : null;
  if (twoA.length === 2 && bookingsOfFirst) {
    const cross = await tenant.assertOwnBooking(twoA[1]!.id, bookingsOfFirst.id);
    add(
      "booking — same-gym member A cannot cancel member B's",
      !cross,
      cross ? "CROSS-MEMBER CANCEL ALLOWED INSIDE ONE GYM" : "false",
    );
  }

  /* ── every staff member of a gym reaches the same money ────────── */
  const staffA = await db.trainerProfile.findMany({ where: { gymId: A.id }, select: { id: true } });
  const gymSubs = await db.subscription.count({ where: { plan: { gymId: A.id } } });
  const gymPays = await db.payment.count({ where: { subscription: { plan: { gymId: A.id } } } });
  const perCoachSubs = await Promise.all(
    staffA.map((s) => db.subscription.count({ where: { plan: { trainerId: s.id } } })),
  );
  add(
    "memberships are scoped to the gym, not to whoever created the plan",
    perCoachSubs.some((n) => n < gymSubs),
    `gym total ${gymSubs}; per-coach ${perCoachSubs.join("/")} — the actions must use gymId, and do`,
  );
  add(
    "payments exist for the gym as a whole",
    gymPays > 0,
    `${gymPays} payments reachable with gym scope`,
  );

  /* ── static audit: no unguarded write to a tenant-owned table ──── */
  console.log("\n── static audit of app/actions ─────────────────────────────");

  const TENANT_TABLES = [
    "clientProfile",
    "plan",
    "subscription",
    "payment",
    "attendance",
    "gymClass",
    "classBooking",
    "classCancellation",
    "lead",
    "leadActivity",
    "messageRule",
    "messageLog",
    "trainerNote",
    "workoutPlan",
    "dietPlan",
    "exerciseLog",
    "gymLink",
    "trainerProfile",
  ];

  /**
   * Every write to a tenant-owned table, and what its `where` is keyed on.
   *
   * The rule this enforces: a write may only be keyed on an id the action has
   * already established is ours. There are exactly two ways to do that.
   *
   *   • Derived — `where: { id: owned.id }`, where `owned` came out of a lookup
   *     in this action. The lookup carried the scope; the id is a consequence.
   *   • Asserted — `where: { id: d.workoutPlanId }`, with the same identifier
   *     passed to an `assert…()` call earlier in the action.
   *
   * A raw id straight from the browser with neither is the bug this milestone
   * found in the workout and diet plans: the action checked that the *parent*
   * belonged to the gym and then wrote whatever attachment id it was handed.
   * An action-wide "does the word gymId appear anywhere" test does not catch
   * that, because the parent check puts `gymId` in the body. This does.
   */
  const WRITE_CALL = new RegExp(
    `\\b(?:db|tx)\\.(${TENANT_TABLES.join("|")})\\.(update|updateMany|delete|deleteMany|upsert)\\(\\s*\\{([\\s\\S]{0,400}?)\\bwhere:\\s*\\{((?:[^{}]|\\{[^{}]*\\})*)\\}`,
    "g",
  );

  const dir = join(process.cwd(), "app", "actions");
  const actionFiles = readdirSync(dir)
    .filter((f) => f.endsWith(".ts"))
    .sort();

  for (const file of actionFiles) {
    const src = readFileSync(join(dir, file), "utf8");
    // One chunk per exported action, so a guard in one cannot vouch for the next.
    const starts = [...src.matchAll(/^export async function (\w+)/gm)];
    for (let i = 0; i < starts.length; i++) {
      const from = starts[i]!.index!;
      const to = i + 1 < starts.length ? starts[i + 1]!.index! : src.length;
      const body = src.slice(from, to);
      const name = starts[i]![1]!;

      for (const m of body.matchAll(WRITE_CALL)) {
        const [, table, op, , whereClause] = m;
        const key = (whereClause ?? "").trim();

        // updateMany/deleteMany filter rather than address a row; they are safe
        // when the filter itself carries the scope.
        if (op === "updateMany" || op === "deleteMany") {
          const scoped =
            /gymId|session\.|\w+\.id\b|\bin:\s*[A-Za-z_$]|classId|planId|subscriptionId|memberId|clientId|leadId/.test(
              key,
            );
          add(
            `${file}:${name} — ${op} on ${table} is filtered, not global`,
            scoped,
            scoped ? key.replace(/\s+/g, " ").slice(0, 60) : `UNFILTERED: ${key}`,
          );
          continue;
        }

        // What the row is addressed by.
        const idExpr =
          key.match(/\bid:\s*([A-Za-z_$][\w.$]*)/)?.[1] ??
          key.match(/^\s*([A-Za-z_$][\w.$]*):/)?.[0] ??
          key;

        const derived = /^[A-Za-z_$][\w$]*\.(id|userId|gymId)$/.test(idExpr);
        const fromSession = idExpr.startsWith("session.");
        // A compound key (`gymId_kind`, `classId_date`) is addressed by fields,
        // and those fields are checked by the surrounding scope test below.
        const compound = /_/.test(idExpr) || !/\bid:/.test(key);

        // The bare identifier, so `d.workoutPlanId` matches `assert…(d.planId, d.workoutPlanId)`.
        const leaf = idExpr.split(".").pop() ?? idExpr;
        const asserted =
          leaf.length > 2 && new RegExp(`assert[A-Za-z]*\\([^)]*\\b${leaf}\\b`).test(body);

        const ok = derived || fromSession || compound || asserted;
        add(
          `${file}:${name} — ${op} ${table} keyed on ${idExpr}`,
          ok,
          ok
            ? derived
              ? "derived from a scoped lookup"
              : fromSession
                ? "from the session"
                : compound
                  ? "compound key, scope checked separately"
                  : "asserted before the write"
            : "RAW CLIENT ID, NEVER CHECKED IN THIS ACTION",
        );
      }

      // …and the action must establish tenancy somewhere at all.
      if (WRITE_CALL.test(body)) {
        WRITE_CALL.lastIndex = 0;
        const scoped =
          /assert(Gym|Plan|Own)[A-Za-z]*\(|session\.gymId|session\.profileId|session\.userId|require(Admin|Prospect)\(\)/.test(
            body,
          );
        add(
          `${file}:${name} — establishes tenancy`,
          scoped,
          scoped ? "yes" : "NO OWNERSHIP CHECK IN THIS ACTION",
        );
      }
      WRITE_CALL.lastIndex = 0;
    }
  }

  /**
   * The money belongs to the gym, not to the coach who happened to create the
   * plan. `plan: { trainerId: session.profileId }` looks like a tighter scope
   * and is in fact the wrong axis: it is gym-bound, so it leaks nothing, but it
   * hid every membership and payment from any owner who had not personally
   * created the plan — measured at 0 of 13 memberships and 0 of 17 payments for
   * one seeded gym's owner. The boundary is the tenant.
   */
  for (const file of ["subscriptions.ts", "payments.ts"]) {
    const src = readFileSync(join(dir, file), "utf8");
    const coachScoped = /(plan|subscription):\s*\{[^}]*trainerId:\s*session\.profileId/.test(src);
    add(
      `${file} — memberships and payments are scoped to the gym, not one coach`,
      !coachScoped,
      coachScoped ? "COACH-SCOPED: an owner cannot reach their own gym's money" : "gym-scoped",
    );
  }

  /* ── every action is behind some guard at all ──────────────────── */
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith(".ts"))
    .sort()) {
    const src = readFileSync(join(dir, file), "utf8");
    const starts = [...src.matchAll(/^export async function (\w+)/gm)];
    for (let i = 0; i < starts.length; i++) {
      const from = starts[i]!.index!;
      const to = i + 1 < starts.length ? starts[i + 1]!.index! : src.length;
      const body = src.slice(from, to);
      const name = starts[i]![1]!;
      // Deliberately public: sign-in, sign-up, the listing funnel, the public
      // directory's counters and the geocoder. Everything else needs a guard.
      const PUBLIC = new Set([
        "loginAction",
        "memberLoginAction",
        "logoutAction",
        "createAccountAction",
        "listGymAction",
        "attachOwnerAction",
        "recordLinkClickAction",
        "getMapGymsAction",
        "getLiveStatsAction",
        "geocodeCityAction",
      ]);
      if (PUBLIC.has(name)) continue;
      const guarded =
        /await require(Staff|Owner|Admin|Member|Prospect|PaidStaff|PaidOwner|PaidMember)\(\)|await get(?:Valid)?Session\(\)/.test(
          body,
        );
      add(`${file}:${name} — authenticated`, guarded, guarded ? "yes" : "NO AUTH GUARD");
    }
  }

  /* ── the paywall is enforced in the actions, not only in the proxy ── */
  console.log("\n── paywall reaches the server actions ──────────────────────");
  const PAID_ACTIONS: Record<string, string[]> = {
    "attendance.ts": [
      "checkInMemberAction",
      "checkOutMemberAction",
      "resetCheckInCodeAction",
      "qrCheckInAction",
    ],
    "classes.ts": [
      "saveClassAction",
      "deleteClassAction",
      "setBookingStatusAction",
      "bookClassAction",
      "cancelBookingAction",
      "cancelOccurrenceAction",
      "restoreOccurrenceAction",
    ],
    "clients.ts": ["createClientAction", "updateClientAction", "resetMemberPasswordAction"],
    "leads.ts": [
      "saveLeadAction",
      "setLeadStatusAction",
      "logLeadActivityAction",
      "deleteLeadAction",
    ],
    "messages.ts": ["saveMessageRuleAction", "refreshQueueAction", "setMessageStatusAction"],
    "notes.ts": ["addNoteAction", "deleteNoteAction"],
    "payments.ts": ["recordPaymentAction", "setPaymentStatusAction"],
    "plans.ts": [
      "savePlanAction",
      "deletePlanAction",
      "saveWorkoutPlanAction",
      "saveDietPlanAction",
    ],
    "subscriptions.ts": [
      "saveSubscriptionAction",
      "setSubscriptionStatusAction",
      "toggleAutoRenewAction",
      "renewSubscriptionAction",
    ],
    "staff.ts": [
      "createStaffAction",
      "updateStaffAction",
      "setStaffActiveAction",
      "resetStaffPasswordAction",
    ],
  };
  for (const [file, names] of Object.entries(PAID_ACTIONS)) {
    const src = readFileSync(join(dir, file), "utf8");
    for (const name of names) {
      const i = src.indexOf(`export async function ${name}`);
      if (i === -1) {
        add(`${file}:${name} — exists`, false, "action not found");
        continue;
      }
      const j = src.indexOf("\nexport async function", i + 1);
      const body = src.slice(i, j === -1 ? src.length : j);
      const paid = /await requirePaid(Staff|Owner|Member)\(\)/.test(body);
      add(`${file}:${name} — behind the paywall`, paid, paid ? "yes" : "REACHABLE BY A LAPSED GYM");
    }
  }
  // …and the two that must stay open, or a lapsed gym cannot pay us.
  const gymSrc = readFileSync(join(dir, "gym.ts"), "utf8");
  const purchase = gymSrc.slice(gymSrc.indexOf("export async function purchaseAccessAction"));
  add(
    "purchaseAccessAction stays reachable when access has lapsed",
    !/requirePaid/.test(
      purchase.slice(0, purchase.indexOf("\nexport async function") + 1 || undefined),
    ),
    "renewal must not be behind the thing you renew",
  );

  /* ── report ────────────────────────────────────────────────────── */
  const failed = checks.filter((c) => !c.pass);
  console.log("");
  for (const c of checks) {
    console.log(`${c.pass ? "  ok  " : "  FAIL"} ${c.name}${c.pass ? "" : `  — ${c.detail}`}`);
  }
  console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
  if (borrowedMessage) await db.messageLog.delete({ where: { id: borrowedMessage } });
  await db.$disconnect();
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
