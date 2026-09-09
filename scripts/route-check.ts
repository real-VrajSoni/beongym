/**
 * Renders every route as both roles and fails on error markers.
 *   npm run check:routes     (needs the dev server running)
 */
import "dotenv/config";
import { SignJWT } from "jose";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const BASE = process.env.CHECK_BASE_URL ?? "http://localhost:3400";

/**
 * Each route asserts a positive signal unique to its own rendered content.
 * Checking for error strings would false-positive: Next embeds the root
 * not-found component in the RSC payload of every page.
 */
const ADMIN_ROUTES: [string, string][] = [
  ["/admin/overview", "Platform overview"],
  ["/admin/gyms", "Every tenant on the platform"],
  ["/admin/signups", "whether they went on to buy"],
  ["/admin/orders", "who made it, and the gym it created"],
  ["/admin/users", "Every account on the platform"],
  ["/admin/revenue", "Platform MRR"],
  ["/admin/activity", "Platform feed"],
  ["/admin/support", "Accounts that need attention"],
];

const GYM_ROUTES: [string, string][] = [
  ["/gym/dashboard", "happening at your gym today"],
  ["/gym/attendance", "On the floor now"],
  ["/gym/clients", "people on your roster"],
  ["/gym/plans", "12 Week Transformation"],
  ["/gym/subscriptions", "Live memberships"],
  ["/gym/payments", "Total revenue"],
  ["/gym/staff", "Your team"],
  ["/gym/attendance/qr", "Scan to check in"],
  ["/gym/classes", "The weekly timetable"],
  ["/gym/leads", "Open enquiries"],
  ["/gym/messages", "Nothing sends itself yet"],
  ["/gym/listing", "Your listing"],
  ["/gym/settings", "Gym profile"],
  ["/gym/billing", "what that unlocks"],
  ["/gym/renew", "no free plan"],
];

/** The member app — a different role, a different portal, its own token. */
const MEMBER_ROUTES: [string, string][] = [
  ["/me", "Your membership, your attendance"],
  ["/me/classes", "Book your own spot"],
  ["/me/attendance", "Your attendance"],
  ["/me/training", "Training"],
  ["/me/payments", "Payments"],
];

/** Unauthenticated pages — the shop window, open to anyone. */
const PUBLIC_ROUTES: [string, string][] = [
  ["/gyms", "Every gym on Earth"],
  ["/gyms/IRON-4821", "Iron Temple Fitness"],
  ["/claim", "Claim your gym"],
  ["/list", "Put your gym on the map"],
  ["/gyms/COAST-5521/claim", "Coastline CrossFit"],
];


async function main() {
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });
  const key = new TextEncoder().encode(process.env.AUTH_SECRET!);

  const gym = await db.gym.findUniqueOrThrow({ where: { code: "IRON-4821" } });
  const admin = await db.user.findFirstOrThrow({ where: { role: "SUPER_ADMIN" } });
  const staff = await db.user.findFirstOrThrow({
    where: { gymId: gym.id, role: "GYM_OWNER" },
    include: { trainerProfile: true },
  });
  const member = await db.clientProfile.findFirstOrThrow({
    where: { gymId: gym.id, user: { email: "rahul.sharma@example.com" } },
    include: { user: true },
  });
  const firstPlan = await db.plan.findFirstOrThrow({ where: { gymId: gym.id }, select: { id: true } });

  const sign = (p: Record<string, unknown>) =>
    new SignJWT(p).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(key);

  const adminToken = await sign({
    userId: admin.id, email: admin.email, name: admin.name,
    role: "SUPER_ADMIN", profileId: null, gymId: null, gymName: null, gymCode: null, gymTier: null,
  });
  const staffToken = await sign({
    userId: staff.id, email: staff.email, name: staff.name, role: "GYM_OWNER",
    profileId: staff.trainerProfile!.id, gymId: gym.id, gymName: gym.name, gymCode: gym.code,
    gymTier: gym.tier,
    // Without this the proxy reads the session as lapsed and bounces every
    // paid route to /gym/renew — the check would be testing the paywall, not
    // the pages.
    gymAccessExpiresAt: gym.accessExpiresAt?.toISOString() ?? null,
  });
  const memberToken = await sign({
    userId: member.user.id, email: member.user.email, name: member.user.name, role: "MEMBER",
    profileId: member.id, gymId: gym.id, gymName: gym.name, gymCode: gym.code,
    gymTier: gym.tier, gymAccessExpiresAt: gym.accessExpiresAt?.toISOString() ?? null,
  });
  const routes: [string, string, string][] = [
    ...ADMIN_ROUTES.map(([r, expect]) => [r, adminToken, expect] as [string, string, string]),
    [`/admin/gyms/${gym.id}`, adminToken, "Gym visits"],
    ...GYM_ROUTES.map(([r, expect]) => [r, staffToken, expect] as [string, string, string]),
    [`/gym/clients/${member.id}`, staffToken, "Member app"],
    [`/gym/plans/${firstPlan.id}`, staffToken, "Revenue collected"],
    ...MEMBER_ROUTES.map(([r, expect]) => [r, memberToken, expect] as [string, string, string]),
    ...PUBLIC_ROUTES.map(([r, expect]) => [r, "", expect] as [string, string, string]),
  ];

  const rows: { route: string; status: number; ok: boolean; note: string }[] = [];
  for (const [route, token, expected] of routes) {
    const res = await fetch(BASE + route, {
      redirect: "manual",
      // An empty token means "visit as nobody" — that is the assertion for the
      // public pages, which must render without a session.
      headers: token ? { cookie: `apex_session=${token}` } : {},
    });
    const body = await res.text();
    const rendered = body.includes(expected);
    rows.push({
      route,
      status: res.status,
      ok: res.status === 200 && rendered,
      note:
        res.status !== 200
          ? `status ${res.status}`
          : rendered
            ? ""
            : `missing content: "${expected}"`,
    });
  }

  await db.$disconnect();
  console.table(rows);
  const failed = rows.filter((r) => !r.ok);
  console.log(failed.length === 0 ? `ALL ${rows.length} ROUTES OK` : `${failed.length} FAILED`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
