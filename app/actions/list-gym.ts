"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, getSession, hashPassword } from "@/lib/auth";
import { guard, invalid, type ActionResult } from "@/lib/action-result";
import { generateGymCode } from "@/lib/data/gym-code";
import { PURCHASABLE_PLAN_KEYS, extendAccess, orderValue, planByKey } from "@/lib/platform-plans";
import { canonicalCity, locate } from "@/lib/geo/places";
import { currencyForCountry } from "@/lib/geo/currency";
import { STARTER_PLANS } from "@/lib/data/starter-plans";

const listingSchema = z.object({
  /** Which plan they bought. Only the ones on sale today are accepted. */
  plan: z.enum(PURCHASABLE_PLAN_KEYS),
  name: z.string().trim().min(2, "Give your gym a name").max(60),
  tagline: z.string().trim().max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  city: z.string().trim().min(2, "Which city are you in?").max(60),
  address: z.string().trim().max(200).optional(),
  phone: z.string().trim().min(6, "Members need a number to call").max(20),
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

    const place = locate(d.city);
    const lat = typeof d.latitude === "number" ? d.latitude : (place?.lat ?? null);
    const lng = typeof d.longitude === "number" ? d.longitude : (place?.lng ?? null);
    if (lat === null || lng === null) {
      return {
        ok: false as const,
        error: "",
        fieldErrors: { city: "We don't know that city — drop your pin on the map instead." },
      };
    }

    const code = await generateGymCode(d.name);
    const amenities = (d.amenities ?? "")
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean)
      .slice(0, 12);

    const plan = planByKey(d.plan);

    const gym = await db.$transaction(async (tx) => {
      const created = await tx.gym.create({
        data: {
          code,
          name: d.name,
          tagline: d.tagline || null,
          description: d.description || null,
          city: canonicalCity(d.city) ?? d.city,
          country: place?.country ?? null,
          currency: currencyForCountry(place?.country),
          latitude: lat,
          longitude: lng,
          address: d.address || null,
          phone: d.phone,
          email: d.email,
          amenities,
          openingHours: d.openingHours || null,
          imageUrl: d.imageUrl || null,
          accentColor: d.accentColor || "#7c6cff",
          logoText:
            d.name
              .replace(/[^A-Za-z]/g, "")
              .slice(0, 2)
              .toUpperCase() || "GY",
          // Listed by its own owner, so there is nothing here to claim.
          claimed: true,
          listed: true,
          status: "ACTIVE",
          tier: plan.tier,
          accessExpiresAt: extendAccess(null, plan.key),
        },
      });

      await tx.platformOrder.create({
        data: {
          gymId: created.id,
          email: d.email,
          tier: plan.tier,
          billingCycle: plan.key,
          amount: orderValue(plan.key),
          currency: "USD",
          status: "PAID",
          provider: "manual",
          providerRef: `map-listing:${plan.key}`,
          gymName: created.name,
          city: created.city,
          paidAt: new Date(),
        },
      });

      return created;
    });

    revalidatePath("/gyms");
    return { ok: true as const, message: `${gym.name} is on the map.`, code: gym.code };
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
      // the moment there is an owner to own them. Prices stay unpublished.
      await tx.plan.createMany({
        data: STARTER_PLANS.map((p) => ({
          ...p,
          gymId: gym.id,
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
