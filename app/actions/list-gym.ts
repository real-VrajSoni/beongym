"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, getSession, hashPassword } from "@/lib/auth";
import { guard, invalid, type ActionResult } from "@/lib/action-result";
import { PURCHASABLE_PLAN_KEYS } from "@/lib/platform-plans";
import { canonicalCity } from "@/lib/geo/places";
import { locateAnywhere } from "@/lib/geo/remote";
import { isKnownCurrency, suggestCurrency } from "@/lib/geo/currency";
import { STARTER_PLANS } from "@/lib/data/starter-plans";
import { startPurchase } from "@/lib/payments/checkout";

const listingSchema = z.object({
  /** Which plan they bought. Only the ones on sale today are accepted. */
  plan: z.enum(PURCHASABLE_PLAN_KEYS),
  name: z.string().trim().min(2, "Give your gym a name").max(60),
  tagline: z.string().trim().max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  city: z.string().trim().min(2, "Which city are you in?").max(60),
  address: z.string().trim().max(200).optional(),
  phone: z.string().trim().min(6, "Members need a number to call").max(20),
  /** Checked against the list, never trusted — see checkout.ts. */
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .refine(isKnownCurrency, "Pick a currency from the list")
    .optional(),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  amenities: z.string().trim().max(400).optional(),
  openingHours: z.string().trim().max(120).optional(),
  imageUrl: z
    .string()
    .trim()
    .max(400_000, "That image is too large — try a smaller one.")
    .refine((v) => v === "" || v.startsWith("data:image/"), "That image isn't valid.")
    .optional(),
  accentColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
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

export type ListingResult = ActionResult & { code?: string };

/**
 * Puts a gym on the map, on any of the four plans, without an account.
 *
 * A gym owner who has never heard of us should not have to pick a password
 * before they can find out whether this is worth anything, so the listing comes
 * first and the account is offered afterwards (`attachOwnerAction`). The order
 * carries the buyer's email so a listing can still be traced to a person before
 * any account exists.
 *
 * Paying is the listing — there is no unpaid way onto the map, and no separate
 * upgrade step afterwards. Every order is written here so the platform console
 * sees the listing and the money that made it in one place.
 *
 * NO PAYMENT GATEWAY IS CONNECTED YET — like every other purchase here, the
 * order is written `provider: "manual"` and marked paid, and the form says so.
 * When the gateway goes in, write the order PENDING, hand off, and create the
 * gym from the webhook.
 */
export async function listGymAction(formData: FormData): Promise<ListingResult> {
  return guard(async () => {
    const parsed = listingSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return invalid(parsed.error);
    const d = parsed.data;

    // The table first, then OpenStreetMap — so a gym in a town of four
    // thousand people still gets a pin rather than a form error.
    const place = await locateAnywhere(d.city);
    const lat = typeof d.latitude === "number" ? d.latitude : (place?.lat ?? null);
    const lng = typeof d.longitude === "number" ? d.longitude : (place?.lng ?? null);
    if (lat === null || lng === null) {
      return {
        ok: false as const,
        error: "",
        fieldErrors: { city: "We don't know that city — drop your pin on the map instead." },
      };
    }

    const amenities = (d.amenities ?? "")
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean)
      .slice(0, 12);

    // Nothing is created until the money is verified. The listing's details ride
    // on the order so `fulfilOrder` can build the gym from them; writing the gym
    // here and marking the order PAID, as this used to, put a free listing on
    // the public map for anyone who found the form.
    const result = await startPurchase({
      userId: null,
      email: d.email,
      name: d.name,
      planKey: d.plan === "ANNUAL" ? "ANNUAL" : "MONTHLY",
      kind: "LISTING",
      gymName: d.name,
      city: canonicalCity(d.city) ?? d.city,
      returnPath: "/start/checkout/return",
      billingCurrency: d.currency ?? suggestCurrency(d.city, place?.country),
      meta: {
        city: canonicalCity(d.city) ?? d.city,
        country: place?.country ?? null,
        currency: d.currency ?? suggestCurrency(d.city, place?.country),
        latitude: lat,
        longitude: lng,
        tagline: d.tagline || null,
        description: d.description || null,
        address: d.address || null,
        phone: d.phone,
        email: d.email,
        amenities,
        openingHours: d.openingHours || null,
        imageUrl: d.imageUrl || null,
        accentColor: d.accentColor || "#7c6cff",
      },
    });

    if (!result.ok) return { ok: false as const, error: result.error };
    if (result.mode === "gateway") {
      return {
        ok: true as const,
        message: "Redirecting to payment…",
        checkoutUrl: result.checkoutUrl,
      };
    }

    const created = await db.platformOrder.findUnique({
      where: { id: result.orderId },
      select: { gym: { select: { code: true, name: true } } },
    });
    return {
      ok: true as const,
      message: `${created?.gym?.name ?? d.name} is on the map.`,
      code: created?.gym?.code,
    };
  });
}

const attachSchema = z.object({
  code: z.string().trim().min(3).max(24),
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(2, "Enter your name").max(60),
  password: z.string().min(8, "Use at least 8 characters").max(72),
});

/**
 * Optional second half of the listing flow: turn the paid listing into an
 * account the owner can sign in to. Only works while the gym still has no
 * users, so it cannot be used to take over someone else's gym.
 */
export async function attachOwnerAction(formData: FormData): Promise<ActionResult> {
  return guard(async () => {
    const parsed = attachSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return invalid(parsed.error);
    const d = parsed.data;

    const gym = await db.gym.findFirst({
      where: { code: d.code.toUpperCase() },
      select: {
        id: true,
        name: true,
        code: true,
        tier: true,
        currency: true,
        accessExpiresAt: true,
        _count: { select: { users: true } },
      },
    });
    if (!gym) return { ok: false as const, error: "That listing no longer exists." };
    if (gym._count.users > 0) {
      return { ok: false as const, error: "This listing already has an owner. Sign in instead." };
    }

    const taken = await db.user.findUnique({ where: { email: d.email }, select: { id: true } });
    if (taken) {
      return {
        ok: false as const,
        error: "",
        fieldErrors: { email: "That email already has an account. Sign in instead." },
      };
    }

    const owner = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          gymId: gym.id,
          name: d.name,
          email: d.email,
          passwordHash: await hashPassword(d.password),
          role: "GYM_OWNER",
          lastLoginAt: new Date(),
          trainerProfile: { create: { gymId: gym.id, title: "Owner" } },
        },
        include: { trainerProfile: true },
      });

      const order = await tx.platformOrder.findFirst({
        where: { gymId: gym.id, userId: null },
        select: { id: true },
      });
      if (order) {
        await tx.platformOrder.update({ where: { id: order.id }, data: { userId: user.id } });
      }

      // Programmes need a trainer to hang off, so the starting set is created
      // the moment there is an owner to own them — unpriced, in the gym's own
      // currency, and off the public store until the owner prices each one.
      await tx.plan.createMany({
        data: STARTER_PLANS.map((p) => ({
          ...p,
          gymId: gym.id,
          currency: gym.currency,
          trainerId: user.trainerProfile!.id,
        })),
      });

      return user;
    });

    const existing = await getSession();
    if (!existing) {
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
    }

    return { ok: true as const, message: "You're signed in." };
  });
}
