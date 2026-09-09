"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, getSession, requireOwner, requirePaidStaff } from "@/lib/auth";
import { guard, invalid, type ActionResult } from "@/lib/action-result";
import { canonicalCity } from "@/lib/geo/places";
import { locateAnywhere } from "@/lib/geo/remote";
import { currencyForCountry } from "@/lib/geo/currency";
import { PURCHASABLE_PLAN_KEYS, extendAccess, orderValue, planByKey } from "@/lib/platform-plans";

const gymProfileSchema = z.object({
  name: z.string().trim().min(2, "Give your gym a name").max(60),
  tagline: z.string().trim().max(120).optional(),
  city: z.string().trim().max(60).optional(),
  address: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(20).optional(),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]).optional(),
  logoText: z.string().trim().max(2).optional(),
  // A downscaled data URL from the uploader, or empty to clear it.
  imageUrl: z
    .string()
    .trim()
    .max(400_000, "That image is too large — try a smaller one.")
    .refine((v) => v === "" || v.startsWith("data:image/"), "That image isn't valid.")
    .optional(),
  accentColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Pick a colour"),
  /** Dropped by hand on the map picker. Blank means "use the city". */
  latitude: z.coerce
    .number()
    .min(-90)
    .max(90)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  longitude: z.coerce
    .number()
    .min(-180)
    .max(180)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

/** Owner-editable gym identity: name, contact details and branding. */
export async function updateGymProfileAction(formData: FormData): Promise<ActionResult> {
  return guard(async () => {
    const session = await requireOwner();
    const parsed = gymProfileSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return invalid(parsed.error);
    const d = parsed.data;

    // A gym with no pin is invisible on the map, so the city is geocoded on
    // every save; an explicit pin from the picker always wins.
    const place = await locateAnywhere(d.city);
    const pin =
      typeof d.latitude === "number" && typeof d.longitude === "number"
        ? { latitude: d.latitude, longitude: d.longitude }
        : place
          ? { latitude: place.lat, longitude: place.lng }
          : {};

    const gym = await db.gym.update({
      where: { id: session.gymId },
      data: {
        name: d.name,
        tagline: d.tagline || null,
        city: canonicalCity(d.city) ?? d.city ?? null,
        country: place?.country ?? undefined,
        // Moving a gym across a border changes what it charges in. Only set
        // when the city actually resolves — an unrecognised one must not
        // quietly reset a currency the owner is trading in.
        currency: place ? currencyForCountry(place.country) : undefined,
        address: d.address || null,
        phone: d.phone || null,
        email: d.email || null,
        logoText: d.logoText ? d.logoText.toUpperCase() : null,
        imageUrl: d.imageUrl ? d.imageUrl : null,
        accentColor: d.accentColor,
        ...pin,
      },
    });

    // The gym name lives in the session cookie for the sidebar.
    const current = await getSession();
    if (current) await createSession({ ...current, gymName: gym.name });

    revalidatePath("/gym/settings");
    revalidatePath("/gym/dashboard");
    revalidatePath("/gyms");
    return { ok: true, message: "Gym updated." };
  });
}

// Renewals buy a plan that is on sale. A gym holding a retired plan renews
// onto a current one; what it already paid for is untouched.
const planEnum = z.enum(PURCHASABLE_PLAN_KEYS);
/**
 * Buy or renew.
 *
 * One action for both, because they are the same transaction from the owner's
 * side: money in, days on the clock. Pro adds thirty days *to the end of what
 * is already paid for*, so renewing early never costs somebody the time they
 * bought — which is exactly the behaviour that makes early renewal safe to
 * encourage. Elite sets the window to null, which is what lifetime means here.
 *
 * There is no payment gateway in this release, so this records the intent and
 * grants the access immediately — the billing page says so.
 */
export async function purchaseAccessAction(planKey: string): Promise<ActionResult> {
  return guard(async () => {
    const session = await requireOwner();
    const parsed = planEnum.safeParse(planKey);
    if (!parsed.success) return { ok: false, error: "Unknown plan." };
    const plan = planByKey(parsed.data);
    const buying = plan.tier;

    const before = await db.gym.findUniqueOrThrow({
      where: { id: session.gymId },
      select: { tier: true, accessExpiresAt: true, name: true, city: true },
    });

    // Elite is permanent, so there is nothing left to sell an Elite gym.
    if (before.tier === "ELITE") {
      return { ok: false, error: "You already have lifetime access — there is nothing to renew." };
    }

    const lifetime = buying === "ELITE";
    const accessExpiresAt = extendAccess(before.accessExpiresAt, plan.key);

    const gym = await db.gym.update({
      where: { id: session.gymId },
      data: { tier: buying, accessExpiresAt, status: "ACTIVE", trialEndsAt: null },
    });

    const amount = orderValue(plan.key);
    await db.platformOrder.upsert({
      where: { gymId: gym.id },
      update: {
        tier: buying,
        billingCycle: plan.key,
        amount,
        currency: "USD",
        status: "PAID",
        paidAt: new Date(),
      },
      create: {
        gymId: gym.id,
        userId: session.userId,
        tier: buying,
        billingCycle: plan.key,
        amount,
        currency: "USD",
        status: "PAID",
        provider: "manual",
        gymName: gym.name,
        city: gym.city,
        paidAt: new Date(),
      },
    });

    // Tier and expiry both gate the workspace from inside the token, so the
    // session is reissued or the owner would be locked out by their own payment.
    const current = await getSession();
    if (current) {
      await createSession({
        ...current,
        gymTier: gym.tier,
        gymAccessExpiresAt: gym.accessExpiresAt?.toISOString() ?? null,
      });
    }

    revalidatePath("/gym/billing");
    revalidatePath("/gym/dashboard");
    revalidatePath("/gym/settings");
    revalidatePath("/gyms");
    return {
      ok: true,
      message: lifetime
        ? "Lifetime access is yours. No renewal, ever."
        : `${plan.days} days added — you're paid up to ${gym.accessExpiresAt!.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.`,
    };
  });
}

/** Regenerates nothing destructive — just proves the code to the owner. */
export async function refreshGymStatsAction(): Promise<ActionResult> {
  return guard(async () => {
    await requirePaidStaff();
    revalidatePath("/gym/dashboard");
    return { ok: true };
  });
}
