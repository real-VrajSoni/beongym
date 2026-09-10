"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, getSession, requireOwner, requirePaidStaff } from "@/lib/auth";
import { guard, invalid, type ActionResult } from "@/lib/action-result";
import { canonicalCity } from "@/lib/geo/places";
import { locateAnywhere } from "@/lib/geo/remote";
import { isKnownCurrency } from "@/lib/geo/currency";
import { startCheckout } from "@/lib/payments/checkout";
import { PURCHASABLE_PLAN_KEYS } from "@/lib/platform-plans";

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
  /**
   * The gym's currency, as chosen. Checked against the list, not trusted.
   *
   * An explicit choice outranks the country: a gym that has deliberately set
   * one must not have it silently rewritten because somebody corrected a
   * typo in the city on the same save.
   */
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .refine(isKnownCurrency, "Pick a currency from the list")
    .optional(),
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
        // The owner's choice, full stop. The city no longer overrides it: a
        // gym near a border may well price in the other side's money, and
        // having that silently rewritten on an unrelated save is worse than
        // asking once and remembering the answer.
        currency: d.currency ?? undefined,
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
    const before = await db.gym.findUniqueOrThrow({
      where: { id: session.gymId },
      select: { tier: true },
    });

    // Elite is permanent, so there is nothing left to sell an Elite gym.
    if (before.tier === "ELITE") {
      return { ok: false, error: "You already have lifetime access — there is nothing to renew." };
    }

    // Nothing is granted here any more. This writes a PENDING order and hands
    // the owner to the gateway; `subscription.active` on a verified webhook is
    // what moves accessExpiresAt. The old version marked the order PAID and
    // extended access on the spot, which was honest while there was no gateway
    // and is a hole the moment there is one — anyone who could click the button
    // could grant themselves a year.
    const result = await startCheckout({
      gymId: session.gymId,
      userId: session.userId,
      planKey: parsed.data === "ANNUAL" ? "ANNUAL" : "MONTHLY",
      email: session.email,
      name: session.name,
      kind: "RENEWAL",
      returnPath: "/gym/billing?checkout=returned",
    });

    if (!result.ok) return { ok: false, error: result.error };

    if (result.mode === "simulated") {
      // Access really did change, so the token that gates it has gone stale.
      const current = await getSession();
      if (current) {
        const gym = await db.gym.findUniqueOrThrow({
          where: { id: session.gymId },
          select: { tier: true, accessExpiresAt: true },
        });
        await createSession({
          ...current,
          gymTier: gym.tier,
          gymAccessExpiresAt: gym.accessExpiresAt?.toISOString() ?? null,
        });
      }
      revalidatePath("/gym/billing");
      revalidatePath("/gym/dashboard");
      return { ok: true, message: result.message };
    }

    // The browser goes to the gateway. Access is still exactly what it was.
    return { ok: true, message: "Redirecting to payment…", id: result.checkoutUrl };
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
