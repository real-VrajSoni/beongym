/**
 * Authorization smoke test — run against a running dev server:
 *   npm run check:isolation
 *
 * Asserts the boundaries the platform depends on:
 *   • anonymous visitors reach nothing
 *   • each role is confined to its own portal
 *   • one gym can never see another gym's people or data
 *   • staff notes never reach a member
 *   • suspending a gym locks its users out immediately
 */
import "dotenv/config";
import { SignJWT } from "jose";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const BASE = process.env.CHECK_BASE_URL ?? "http://localhost:3400";

type Check = { name: string; pass: boolean; detail: string };

async function main() {
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });
  const key = new TextEncoder().encode(process.env.AUTH_SECRET!);

  const sign = (payload: Record<string, unknown>) =>
    new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(key);

  const get = async (path: string, token?: string) => {
    const res = await fetch(BASE + path, {
      redirect: "manual",
      headers: token ? { cookie: `apex_session=${token}` } : {},
    });
    return { status: res.status, location: res.headers.get("location"), body: await res.text() };
  };

  const checks: Check[] = [];
  const add = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  // ── fixtures: two different gyms, plus the platform admin ────
  const gymA = await db.gym.findUniqueOrThrow({ where: { code: "IRON-4821" } });
  const gymB = await db.gym.findUniqueOrThrow({ where: { code: "TITAN-2093" } });

  const admin = await db.user.findFirstOrThrow({ where: { role: "SUPER_ADMIN" } });
  const ownerA = await db.user.findFirstOrThrow({
    where: { gymId: gymA.id, role: "GYM_OWNER" },
    include: { trainerProfile: true },
  });
  const ownerB = await db.user.findFirstOrThrow({
    where: { gymId: gymB.id, role: "GYM_OWNER" },
    include: { trainerProfile: true },
  });
  const plainStaffA = await db.user.findFirstOrThrow({
    where: { gymId: gymA.id, role: "GYM_STAFF" },
    include: { trainerProfile: true },
  });
  const memberA = await db.clientProfile.findFirstOrThrow({
    where: { gymId: gymA.id },
    include: { user: true },
  });
  const memberB = await db.clientProfile.findFirstOrThrow({
    where: { gymId: gymB.id },
    include: { user: true },
  });

  const adminToken = await sign({
    userId: admin.id,
    email: admin.email,
    name: admin.name,
    role: "SUPER_ADMIN",
    profileId: null,
    gymId: null,
    gymName: null,
    gymCode: null,
    gymTier: null,
  });
  const staffAToken = await sign({
    userId: ownerA.id,
    email: ownerA.email,
    name: ownerA.name,
    role: "GYM_OWNER",
    profileId: ownerA.trainerProfile!.id,
    gymId: gymA.id,
    gymName: gymA.name,
    gymCode: gymA.code,
    gymTier: gymA.tier,
    gymAccessExpiresAt: gymA.accessExpiresAt?.toISOString() ?? null,
  });
  const staffBToken = await sign({
    userId: ownerB.id,
    email: ownerB.email,
    name: ownerB.name,
    role: "GYM_OWNER",
    profileId: ownerB.trainerProfile!.id,
    gymId: gymB.id,
    gymName: gymB.name,
    gymCode: gymB.code,
    gymTier: gymB.tier,
    gymAccessExpiresAt: gymB.accessExpiresAt?.toISOString() ?? null,
  });
  const staffOnlyAToken = await sign({
    userId: plainStaffA.id,
    email: plainStaffA.email,
    name: plainStaffA.name,
    role: "GYM_STAFF",
    profileId: plainStaffA.trainerProfile!.id,
    gymId: gymA.id,
    gymName: gymA.name,
    gymCode: gymA.code,
    gymTier: gymA.tier,
    gymAccessExpiresAt: gymA.accessExpiresAt?.toISOString() ?? null,
  });
  const memberAToken = await sign({
    userId: memberA.user.id,
    email: memberA.user.email,
    name: memberA.user.name,
    role: "MEMBER",
    profileId: memberA.id,
    gymId: gymA.id,
    gymName: gymA.name,
    gymCode: gymA.code,
    gymTier: gymA.tier,
    gymAccessExpiresAt: gymA.accessExpiresAt?.toISOString() ?? null,
  });

  try {
    // 1. Anonymous visitors reach nothing.
    for (const path of ["/admin/overview", "/gym/dashboard", "/gym/clients"]) {
      const r = await get(path);
      add(
        `anonymous -> ${path}`,
        r.status === 307 && (r.location ?? "").includes("/login"),
        `${r.status} -> ${r.location}`,
      );
    }

    // 2. Every role is confined to its own portal. A member reaches /me and
    //    nothing else — never the workspace of the gym they belong to.
    const confinement: [string, string, string, string][] = [
      ["member", memberAToken, "/gym/dashboard", "/me"],
      ["member", memberAToken, "/admin/overview", "/me"],
      ["gym staff", staffAToken, "/admin/overview", "/gym"],
      ["admin", adminToken, "/gym/dashboard", "/admin"],
    ];
    for (const [who, token, path, expect] of confinement) {
      const r = await get(path, token);
      add(
        `${who} -> ${path}`,
        r.status === 307 && (r.location ?? "").includes(expect),
        `${r.status} -> ${r.location}`,
      );
    }

    // 3. Cross-tenant: gym B's owner must not reach gym A's member.
    const crossMember = await get(`/gym/clients/${memberA.id}`, staffBToken);
    add(
      "gym B owner -> gym A member page",
      !crossMember.body.includes(memberA.user.name) && crossMember.body.includes("Page not found"),
      `status ${crossMember.status}, leaksName=${crossMember.body.includes(memberA.user.name)}`,
    );

    // 4. …and gym A's own owner still can.
    const ownMember = await get(`/gym/clients/${memberA.id}`, staffAToken);
    add(
      "gym A owner -> own member page",
      ownMember.status === 200 && ownMember.body.includes(memberA.user.name),
      String(ownMember.status),
    );

    // 5. Roster listings never bleed across tenants.
    const rosterB = await get("/gym/clients", staffBToken);
    add(
      "gym B roster excludes gym A members",
      rosterB.status === 200 &&
        !rosterB.body.includes(memberA.user.name) &&
        rosterB.body.includes(memberB.user.name),
      `status ${rosterB.status}`,
    );

    // 6. Payments and attendance are scoped too.
    const paymentsB = await get("/gym/payments", staffBToken);
    add(
      "gym B payments exclude gym A members",
      paymentsB.status === 200 && !paymentsB.body.includes(memberA.user.name),
      `status ${paymentsB.status}`,
    );

    // 7. Staff notes are the gym's own working record and must never leave it:
    //    not to the public listing, not to another gym, not to anyone signed out.
    const notes = await db.trainerNote.findMany({
      where: { clientId: memberA.id },
      select: { note: true },
    });
    const fragments = notes.map((n) => n.note.slice(0, 30)).filter((f) => f.length > 12);
    let leaked: string | null = null;
    const noteProbes: [string, string][] = [
      [`/gyms/${gymA.code}`, ""],
      ["/gyms", ""],
      [`/gym/clients/${memberA.id}`, staffBToken],
    ];
    for (const [path, token] of noteProbes) {
      const r = await get(path, token);
      const hit = fragments.find((f) => r.body.includes(f));
      if (hit) {
        leaked = `${path} leaked: ${hit}`;
        break;
      }
    }
    add(
      `staff notes stay private (${fragments.length} notes checked)`,
      leaked === null && fragments.length > 0,
      leaked ?? `no leak across ${noteProbes.length} routes`,
    );

    // 7b. The member app opens for its own member, and shows them their own
    //     record — their code, their membership — and nobody else's.
    const otherMember = await db.clientProfile.findFirstOrThrow({
      where: { gymId: gymA.id, id: { not: memberA.id } },
      include: { user: true },
    });
    for (const path of ["/me", "/me/attendance", "/me/training", "/me/payments"]) {
      const r = await get(path, memberAToken);
      add(`member -> ${path}`, r.status === 200, String(r.status));
    }
    const memberHome = await get("/me", memberAToken);
    add(
      "member app shows only this member",
      memberHome.body.includes(memberA.memberCode) &&
        !memberHome.body.includes(otherMember.user.name) &&
        !memberHome.body.includes(otherMember.memberCode),
      `own=${memberHome.body.includes(memberA.memberCode)} other=${memberHome.body.includes(otherMember.user.name)}`,
    );

    // 7c. Coaching notes are written for the gym's staff. The member app must
    //     never carry one, on any of its pages.
    let noteInApp: string | null = null;
    for (const path of ["/me", "/me/attendance", "/me/training", "/me/payments"]) {
      const r = await get(path, memberAToken);
      for (const fragment of fragments) {
        if (r.body.includes(fragment)) noteInApp = `${path} leaked "${fragment.slice(0, 24)}…"`;
      }
    }
    add("staff notes never reach the member app", noteInApp === null, noteInApp ?? "clean");

    // 7d. A member of gym A cannot read gym B's member out of the app either —
    //     there is no route that takes an id, which is the point.
    const idProbe = await get(`/me/${otherMember.id}`, memberAToken);
    add(
      "member app takes no member id in its URL",
      idProbe.status === 404 || idProbe.status === 307,
      String(idProbe.status),
    );

    // 7e. The new surfaces are tenant-scoped like everything else: gym B's
    //     owner must not see gym A's enquiries, classes or queued messages.
    const leadA = await db.lead.findFirst({
      where: { gymId: gymA.id },
      select: { id: true, name: true },
    });
    const classA = await db.gymClass.findFirst({
      where: { gymId: gymA.id },
      select: { name: true, id: true },
    });
    if (leadA) {
      const crossLeads = await get("/gym/leads", staffBToken);
      // Probed by id as well as name: names could legitimately repeat across
      // gyms, and an id in the payload can only have come from the other gym.
      const leaked = crossLeads.body.includes(leadA.id) || crossLeads.body.includes(leadA.name);
      add(
        "gym B enquiries exclude gym A's",
        crossLeads.status === 200 && !leaked,
        `leaks=${leaked}`,
      );
    }
    if (classA) {
      const crossClasses = await get("/gym/classes", staffBToken);
      // Both gyms seed the same timetable names, so the id is the honest probe.
      add(
        "gym B timetable excludes gym A's classes",
        crossClasses.status === 200 && !crossClasses.body.includes(classA.id),
        `leaks=${crossClasses.body.includes(classA.id)}`,
      );
    }
    const messageA = await db.messageLog.findFirst({
      where: { gymId: gymA.id },
      select: { body: true },
    });
    if (messageA) {
      const crossMessages = await get("/gym/messages", staffBToken);
      add(
        "gym B reminders exclude gym A's",
        crossMessages.status === 200 && !crossMessages.body.includes(messageA.body.slice(0, 40)),
        `leaks=${crossMessages.body.includes(messageA.body.slice(0, 40))}`,
      );
    }

    // 7f. A member books their own classes and nothing else: the member app's
    //     class page must not carry another member's booking.
    const classesPage = await get("/me/classes", memberAToken);
    add(
      "member class list names no other member",
      classesPage.status === 200 && !classesPage.body.includes(otherMember.user.name),
      `leaks=${classesPage.body.includes(otherMember.user.name)}`,
    );

    // 8. Password hashes must never be serialised into a page payload.
    const dash = await get(`/gym/clients/${memberA.id}`, staffAToken);
    add(
      "no password hash in payload",
      !dash.body.includes("$2a$") && !dash.body.includes("$2b$"),
      "checked bcrypt prefixes",
    );

    // 9. Suspending a gym locks out everyone bound to it, immediately.
    await db.gym.update({ where: { id: gymB.id }, data: { status: "SUSPENDED" } });
    const suspended = await get("/gym/dashboard", staffBToken);
    add(
      "suspended gym locks out its staff",
      suspended.status === 307 && (suspended.location ?? "").includes("/login"),
      `${suspended.status} -> ${suspended.location}`,
    );
    await db.gym.update({ where: { id: gymB.id }, data: { status: "ACTIVE" } });

    // 10. A prospect is confined to /start and cannot reach any real portal.
    const prospect = await db.user.findFirstOrThrow({ where: { role: "PROSPECT" } });
    const prospectToken = await sign({
      userId: prospect.id,
      email: prospect.email,
      name: prospect.name,
      role: "PROSPECT",
      profileId: null,
      gymId: null,
      gymName: null,
      gymCode: null,
      gymTier: null,
    });
    for (const path of ["/gym/dashboard", "/gym/clients", "/admin/overview"]) {
      const r = await get(path, prospectToken);
      add(
        `prospect -> ${path}`,
        r.status === 307 && (r.location ?? "").includes("/start"),
        `${r.status} -> ${r.location}`,
      );
    }
    const startPage = await get("/start/plans", prospectToken);
    add(
      "prospect -> /start/plans",
      startPage.status === 200 && startPage.body.includes("Pick a plan"),
      String(startPage.status),
    );
    // …and a gym owner has no business in the checkout funnel.
    const ownerAtStart = await get("/start/plans", staffAToken);
    add(
      "gym owner -> /start/plans",
      ownerAtStart.status === 307 && (ownerAtStart.location ?? "").includes("/gym"),
      `${ownerAtStart.status} -> ${ownerAtStart.location}`,
    );

    // 11. The public directory is open to everyone and leaks nothing operational.
    const directory = await get("/gyms");
    add(
      "directory is public",
      directory.status === 200 && directory.body.includes(gymA.name),
      String(directory.status),
    );
    const profile = await get(`/gyms/${gymA.code}`);
    add(
      "gym profile is public and shows contact",
      profile.status === 200 && profile.body.includes("Get in touch"),
      String(profile.status),
    );
    add(
      "directory exposes no member names",
      !profile.body.includes(memberA.user.name),
      `leaksMember=${profile.body.includes(memberA.user.name)}`,
    );

    // 12. A gym whose window has run out keeps its data and loses the doors.
    // Nothing is deleted: the workspace redirects to the renewal screen, and
    // the gym comes off the public map until it pays again.
    const lapsedGym = await db.gym.findFirstOrThrow({
      where: {
        claimed: true,
        tier: "PRO",
        accessExpiresAt: { lt: new Date() },
        users: { some: { role: "GYM_OWNER" } },
      },
    });
    const lapsedOwner = await db.user.findFirstOrThrow({
      where: { gymId: lapsedGym.id, role: "GYM_OWNER" },
      include: { trainerProfile: true },
    });
    const lapsedToken = await sign({
      userId: lapsedOwner.id,
      email: lapsedOwner.email,
      name: lapsedOwner.name,
      role: "GYM_OWNER",
      profileId: lapsedOwner.trainerProfile!.id,
      gymId: lapsedGym.id,
      gymName: lapsedGym.name,
      gymCode: lapsedGym.code,
      gymTier: lapsedGym.tier,
      gymAccessExpiresAt: lapsedGym.accessExpiresAt?.toISOString() ?? null,
    });
    // Every prefix behind the paywall, not a sample of four: a screen that is
    // missing from this list is a screen nobody notices staying open.
    for (const path of [
      "/gym/dashboard",
      "/gym/clients",
      "/gym/payments",
      "/gym/classes",
      "/gym/subscriptions",
      "/gym/attendance",
      "/gym/leads",
      "/gym/messages",
      "/gym/plans",
      "/gym/staff",
      "/gym/listing",
    ]) {
      const r = await get(path, lapsedToken);
      add(
        `lapsed gym -> ${path}`,
        r.status === 307 && (r.location ?? "").includes("/gym/renew"),
        `${r.status} -> ${r.location}`,
      );
    }
    // /gym/settings stays open with billing and renew — it is where the owner
    // fixes the card. That open door is exactly why the paywall cannot live in
    // the proxy alone: a server action is a POST to whatever route the browser
    // is on, and an action id is the same wherever it is called from, so any
    // workspace action posted at this page would clear the proxy. `requirePaid*`
    // in the actions is what closes that, and check:tenant asserts it is there.
    const lapsedSettings = await get("/gym/settings", lapsedToken);
    add(
      "lapsed gym can still reach settings",
      lapsedSettings.status === 200,
      String(lapsedSettings.status),
    );

    const renew = await get("/gym/renew", lapsedToken);
    add(
      "lapsed gym -> /gym/renew",
      renew.status === 200 && renew.body.includes("Your access has run out"),
      String(renew.status),
    );
    // Paying is the one thing a lapsed gym must still be able to do.
    const lapsedBilling = await get("/gym/billing", lapsedToken);
    add(
      "lapsed gym can still reach billing",
      lapsedBilling.status === 200,
      String(lapsedBilling.status),
    );

    // 11c. A lapsed gym's members get the paused screen, not a broken app.
    const lapsedMember = await db.clientProfile.findFirst({ where: { gymId: lapsedGym.id } });
    if (lapsedMember) {
      const lapsedMemberToken = await sign({
        userId: lapsedMember.userId,
        email: null,
        name: "Member",
        role: "MEMBER",
        profileId: lapsedMember.id,
        gymId: lapsedGym.id,
        gymName: lapsedGym.name,
        gymCode: lapsedGym.code,
        gymTier: lapsedGym.tier,
        gymAccessExpiresAt: lapsedGym.accessExpiresAt?.toISOString() ?? null,
      });
      for (const path of ["/me", "/me/classes", "/me/payments", "/me/training", "/me/attendance"]) {
        const paused = await get(path, lapsedMemberToken);
        add(
          `lapsed gym's member -> ${path}`,
          paused.status === 307 && (paused.location ?? "").includes("/me/paused"),
          `${paused.status} -> ${paused.location}`,
        );
      }
    }

    // 12a. The paywall's other half: no money, no pin. A lapsed gym's public
    // page is gone from the directory and 404s on its own URL.
    const lapsedPublic = await get(`/gyms/${lapsedGym.code}`);
    const map = await get("/gyms");
    add(
      "lapsed gym is off the map",
      lapsedPublic.status === 404 && !map.body.includes(lapsedGym.code),
      `page=${lapsedPublic.status} listed=${map.body.includes(lapsedGym.code)}`,
    );

    // 12b. An unclaimed listing is a public page and nothing else: no accounts
    // exist against it, so there is no way to sign in to one.
    const unclaimed = await db.gym.findMany({
      where: { claimed: false },
      select: { code: true, name: true, _count: { select: { users: true, members: true } } },
    });
    add(
      "unclaimed listings are not pinned on the map",
      unclaimed.length > 0 && unclaimed.every((g) => !map.body.includes(g.code)),
      unclaimed
        .filter((g) => map.body.includes(g.code))
        .map((g) => g.code)
        .join(" ") || "none",
    );
    add(
      "unclaimed listings have no accounts",
      unclaimed.length > 0 &&
        unclaimed.every((g) => g._count.users === 0 && g._count.members === 0),
      unclaimed.map((g) => `${g.code}:${g._count.users}/${g._count.members}`).join(" "),
    );
    if (unclaimed[0]) {
      const claimPage = await get(`/gyms/${unclaimed[0].code}/claim`);
      add(
        // The code, not the name: names get HTML-escaped ("Shakti Wellness &
        // Gym" ships as "&amp;"), and the code identifies the gym anyway.
        "claim page is public",
        claimPage.status === 200 && claimPage.body.includes(unclaimed[0].code),
        String(claimPage.status),
      );
      // Claiming is a paid, verified transfer — an anonymous POST must not do it.
      const stolen = await fetch(`${BASE}/gyms/${unclaimed[0].code}/claim`, {
        method: "POST",
        redirect: "manual",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: `code=${unclaimed[0].code}&role=Owner&phone=%2B910000000000`,
      });
      const stillUnclaimed = await db.gym.findFirstOrThrow({
        where: { code: unclaimed[0].code },
        select: { claimed: true },
      });
      add(
        "anonymous POST cannot claim a gym",
        !stillUnclaimed.claimed,
        `status ${stolen.status}, claimed=${stillUnclaimed.claimed}`,
      );
    }

    // 12c. Listing a gym without an account is a real, public door — and the
    // listings it creates must not hand anyone a way into somebody's tenant.
    const listPage = await get("/list");
    add(
      "list-a-gym page is public",
      listPage.status === 200 && listPage.body.includes("Put your gym on the map"),
      String(listPage.status),
    );
    const accountless = await db.platformOrder.findMany({
      where: { userId: null },
      select: { gymId: true, email: true },
    });
    const orphanGyms = accountless.length
      ? await db.gym.findMany({
          where: { id: { in: accountless.map((o) => o.gymId!).filter(Boolean) } },
          select: { code: true, _count: { select: { users: true, members: true } } },
        })
      : [];
    add(
      "listings paid for without an account have no accounts",
      orphanGyms.every((g) => g._count.users === 0 && g._count.members === 0),
      orphanGyms.map((g) => `${g.code}:${g._count.users}/${g._count.members}`).join(" ") || "none",
    );

    // 13. Owner-only screens are closed to ordinary staff.
    for (const path of ["/gym/staff", "/gym/billing"]) {
      const r = await get(path, staffOnlyAToken);
      add(
        `non-owner staff -> ${path}`,
        r.status === 307 && (r.location ?? "").includes("/gym/dashboard"),
        `${r.status} -> ${r.location}`,
      );
    }

    // 11. …and open to the owner.
    const ownerTeam = await get("/gym/staff", staffAToken);
    add(
      "owner -> /gym/staff",
      ownerTeam.status === 200 && ownerTeam.body.includes("Your team"),
      String(ownerTeam.status),
    );

    // 12. The team list never reaches across tenants.
    add(
      "team list excludes other gyms' staff",
      !ownerTeam.body.includes(ownerB.name),
      `leaksOwnerB=${ownerTeam.body.includes(ownerB.name)}`,
    );

    // 13. A deactivated account loses access on its next request.
    await db.user.update({ where: { id: plainStaffA.id }, data: { isActive: false } });
    const deactivated = await get("/gym/dashboard", staffOnlyAToken);
    add(
      "deactivated staff are locked out",
      deactivated.status === 307 && (deactivated.location ?? "").includes("/login"),
      `${deactivated.status} -> ${deactivated.location}`,
    );
    await db.user.update({ where: { id: plainStaffA.id }, data: { isActive: true } });

    // 14. The platform admin can see across tenants — that is the whole point.
    const adminGyms = await get("/admin/gyms", adminToken);
    add(
      "admin sees every gym",
      adminGyms.status === 200 &&
        adminGyms.body.includes(gymA.name) &&
        adminGyms.body.includes(gymB.name),
      String(adminGyms.status),
    );

    // 16. Staff are not owners, and the boundary is the route not the menu.
    for (const path of ["/gym/staff", "/gym/billing"]) {
      const r = await get(path, staffOnlyAToken);
      add(
        `plain staff -> ${path}`,
        r.status === 307 && (r.location ?? "").includes("owner-only"),
        `${r.status} -> ${r.location}`,
      );
    }

    // 17. Gym B's owner cannot open gym A's plan, class or lead by id either.
    const planA = await db.plan.findFirst({ where: { gymId: gymA.id } });
    if (planA) {
      const r = await get(`/gym/plans/${planA.id}`, staffBToken);
      add(
        "gym B owner -> gym A plan page",
        !r.body.includes(planA.name) && r.body.includes("Page not found"),
        `status ${r.status}, leaksName=${r.body.includes(planA.name)}`,
      );
    }
  } finally {
    await db.gym.update({ where: { id: gymB.id }, data: { status: "ACTIVE" } });
    await db.user.update({ where: { id: plainStaffA.id }, data: { isActive: true } });
    await db.$disconnect();
  }

  console.table(checks);
  const failed = checks.filter((c) => !c.pass);
  console.log(failed.length === 0 ? `ALL ${checks.length} CHECKS PASS` : `${failed.length} FAILED`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
