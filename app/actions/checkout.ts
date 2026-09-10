"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, requireProspect } from "@/lib/auth";
import { guard, invalid, type ActionResult } from "@/lib/action-result";
import { generateGymCode } from "@/lib/data/gym-code";
import { extendAccess, orderValue, planByKey, PURCHASABLE_PLAN_KEYS } from "@/lib/platform-plans";
import { canonicalCity } from "@/lib/geo/places";
import { locateAnywhere } from "@/lib/geo/remote";
import { isKnownCurrency, suggestCurrency } from "@/lib/geo/currency";
import { STARTER_PLANS } from "@/lib/data/starter-plans";

const checkoutSchema = z.object({
  // Only plans on sale today. A retired key posted by hand is rejected here,
  // not merely hidden in the UI.
  plan: z.enum(PURCHASABLE_PLAN_KEYS),
  gymName: z.string().trim().min(2, "Give your gym a name").max(60),
  city: z
    .string()
    .trim()
    .max(60)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  /**
   * What the gym charges its members in.
   *
   * Posted by the browser, so it is checked against the list rather than
   * trusted — an unknown code would put a currency into the database that
   * nothing can format, and every price in that workspace would break at once.
   */
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .refine(isKnownCurrency, "Pick a currency from the list")
    .optional(),
});

/**
 * Records the order and provisions the gym.
 *
 * NO PAYMENT GATEWAY IS CONNECTED YET. The order is written with
 * `provider: "manual"` and marked paid immediately so the flow is complete end
 * to end. When Razorpay or Dodo goes in, this splits in two: create the order
 * PENDING and hand off to the gateway, then run `provisionGym` from the
 * webhook once the payment is captured. Nothing else in the app needs to move.
 *
 * `amount` is the pre-tax price. Dodo works out GST/VAT from the buyer's
 * country at the checkout it hosts, so the figure banked here and the figure
 * charged can differ by the tax line.
 */
export async function purchasePlanAction(formData: FormData): Promise<ActionResult> {
  const result = await guard(async () => {
    const session = await requireProspect();
    const parsed = checkoutSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return invalid(parsed.error);
    const d = parsed.data;

    // Every gym pays. The plan decides how many days that buys; lifetime
    // buys all of them.
    const plan = planByKey(d.plan);
    const amount = orderValue(plan.key);
    const accessExpiresAt = extendAccess(null, plan.key);
    const code = await generateGymCode(d.gymName);

    // Resolved before the transaction opens: this can reach OpenStreetMap, and
    // holding a database transaction open across a network call to somebody
    // else's server is how you get lock timeouts under load.
    //
    // Geocoding here is what puts a brand-new gym on the globe straight away
    // rather than after somebody thinks to edit their settings.
    const place = await locateAnywhere(d.city);

    await db.$transaction(async (tx) => {
      const order = await tx.platformOrder.create({
        data: {
          userId: session.userId,
          kind: "CHECKOUT",
          tier: plan.tier,
          billingCycle: plan.key,
          amount,
          currency: "USD",
          status: "PAID",
          provider: "manual",
          gymName: d.gymName,
          city: d.city ?? null,
          paidAt: new Date(),
        },
      });

      const gym = await tx.gym.create({
        data: {
          code,
          name: d.gymName,
          city: canonicalCity(d.city) ?? d.city ?? null,
          country: place?.country ?? null,
          latitude: place?.lat ?? null,
          longitude: place?.lng ?? null,
          // What the owner chose. The city's suggestion is the fallback for a
          // form posted without one, and the platform default behind that.
          currency: d.currency ?? suggestCurrency(d.city, place?.country),
          logoText:
            d.gymName
              .replace(/[^A-Za-z]/g, "")
              .slice(0, 2)
              .toUpperCase() || "GY",
          accentColor: "#7c6cff",
          status: "ACTIVE",
          tier: plan.tier,
          accessExpiresAt,
          trialEndsAt: null,
        },
      });

      const owner = await tx.user.update({
        where: { id: session.userId },
        data: {
          gymId: gym.id,
          role: "GYM_OWNER",
          trainerProfile: { create: { gymId: gym.id, title: "Owner" } },
        },
        include: { trainerProfile: true },
      });

      // Unpriced on purpose — the owner sets what each costs, in their money.
      await tx.plan.createMany({
        data: STARTER_PLANS.map((p) => ({
          ...p,
          gymId: gym.id,
          currency: gym.currency,
          trainerId: owner.trainerProfile!.id,
        })),
      });

      await tx.platformOrder.update({
        where: { id: order.id },
        data: { gymId: gym.id },
      });

      // The session carries the role and tenant, so it has to be reissued.
      await createSession({
        userId: owner.id,
        email: owner.email,
        name: owner.name,
        role: "GYM_OWNER",
        profileId: owner.trainerProfile!.id,
        gymId: gym.id,
        gymName: gym.name,
        gymCode: gym.code,
        gymTier: gym.tier,
        gymAccessExpiresAt: gym.accessExpiresAt?.toISOString() ?? null,
      });
    });

    return { ok: true as const, message: `${d.gymName} is live.` };
  });

  if (result.ok) redirect("/gym/dashboard?welcome=1");
  return result;
}
