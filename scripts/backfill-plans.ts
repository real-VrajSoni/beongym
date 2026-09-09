/**
 * Repairs two things this codebase got wrong before, and is safe to re-run:
 *
 *   1. `Plan.currency` that does not match its gym's. `savePlanAction` never
 *      wrote the column, so every plan created through the UI fell to the
 *      schema default of INR — which the plan grid hid (it reads the gym) and
 *      the plan detail page showed (it read the row). Rewriting the row from
 *      the gym is always correct: a gym sells in one currency.
 *
 *   2. Gyms with an owner and no programmes. The starting six only ever landed
 *      through the sign-up paths, so any gym that arrived another way had an
 *      empty Membership plans page and a first task nobody asked for.
 *
 * Additive and idempotent. It creates only programmes whose name is missing,
 * never touches a price an owner has set, and never deletes.
 *
 *   npm run backfill:plans              (the DATABASE_URL in .env)
 *   DATABASE_URL=… npm run backfill:plans
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { STARTER_PLANS } from "../lib/data/starter-plans";

async function main() {
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

  /* 1. currency, from the gym that owns the plan */
  // Prisma cannot compare a column to one on a related table, so the filter
  // happens here. There are hundreds of plans, not millions.
  const all = await db.plan.findMany({
    select: {
      id: true,
      name: true,
      currency: true,
      gym: { select: { code: true, currency: true } },
    },
  });
  const mismatched = all.filter((p) => p.currency !== p.gym.currency);
  console.log(`currency mismatches: ${mismatched.length}`);
  for (const p of mismatched) {
    await db.plan.update({ where: { id: p.id }, data: { currency: p.gym.currency } });
    console.log(
      `  ${p.gym.code.padEnd(14)} ${p.name.slice(0, 30).padEnd(32)} ${p.currency} -> ${p.gym.currency}`,
    );
  }

  /* 2. the starting six, for any gym with an owner that is missing them */
  const gyms = await db.gym.findMany({
    where: { users: { some: { role: "GYM_OWNER", isActive: true } } },
    select: {
      id: true,
      code: true,
      currency: true,
      plans: { select: { name: true } },
      staff: { select: { id: true, user: { select: { role: true } } } },
    },
  });

  let created = 0;
  for (const gym of gyms) {
    const owner = gym.staff.find((s) => s.user.role === "GYM_OWNER") ?? gym.staff[0];
    if (!owner) continue;

    const have = new Set(gym.plans.map((p) => p.name));
    const missing = STARTER_PLANS.filter((p) => !have.has(p.name));
    if (missing.length === 0) continue;

    await db.plan.createMany({
      data: missing.map((p) => ({
        ...p,
        gymId: gym.id,
        currency: gym.currency,
        trainerId: owner.id,
      })),
    });
    created += missing.length;
    console.log(
      `  ${gym.code.padEnd(14)} + ${missing.length} unpriced programme(s) in ${gym.currency}`,
    );
  }
  console.log(`\nprogrammes created: ${created}`);

  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
