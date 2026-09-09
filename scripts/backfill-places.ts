/**
 * Repairs gyms that never resolved to a place, and is safe to re-run.
 *
 * A gym whose city the gazetteer did not recognise was written with a null
 * country, which meant its currency fell to the INR default, and null
 * coordinates, which kept it off the globe entirely. One unrecognised word —
 * "norway" typed into a box labelled city — cost a paying gym both.
 *
 * `locateAnywhere` now answers for countries and falls through to OpenStreetMap,
 * so this re-runs the resolution for anything still missing a pin, and re-derives
 * the currency of any gym whose country is known. Prices are left alone: a
 * number an owner typed is theirs, whatever it is denominated in.
 *
 *   npm run backfill:places
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { locateAnywhere } from "../lib/geo/remote";
import { currencyForCountry } from "../lib/geo/currency";

async function main() {
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

  const broken = await db.gym.findMany({
    where: { OR: [{ latitude: null }, { longitude: null }, { country: null }] },
    select: { id: true, code: true, name: true, city: true, country: true, currency: true },
  });
  console.log(`gyms with no pin or no country: ${broken.length}`);

  let fixed = 0;
  for (const gym of broken) {
    const place = await locateAnywhere(gym.city);
    if (!place) {
      console.log(
        `  ${gym.code.padEnd(14)} ${JSON.stringify(gym.city)} — still unresolved, owner must drop a pin`,
      );
      continue;
    }
    const currency = currencyForCountry(place.country);
    await db.gym.update({
      where: { id: gym.id },
      data: {
        country: place.country ?? undefined,
        latitude: place.lat,
        longitude: place.lng,
        currency,
      },
    });
    // The plans and memberships underneath it were stamped with the old default.
    await db.plan.updateMany({ where: { gymId: gym.id }, data: { currency } });
    const subs = await db.subscription.findMany({
      where: { plan: { gymId: gym.id } },
      select: { id: true },
    });
    if (subs.length) {
      await db.subscription.updateMany({
        where: { id: { in: subs.map((s) => s.id) } },
        data: { currency },
      });
      await db.payment.updateMany({
        where: { subscriptionId: { in: subs.map((s) => s.id) } },
        data: { currency },
      });
    }
    fixed++;
    console.log(
      `  ${gym.code.padEnd(14)} ${JSON.stringify(gym.city).padEnd(12)} -> ${place.country} (${place.lat.toFixed(3)}, ${place.lng.toFixed(3)})  ${gym.currency} -> ${currency}  ${place.offline ? "" : "[OpenStreetMap]"}`,
    );
  }

  console.log(`\nrepaired: ${fixed}`);
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
