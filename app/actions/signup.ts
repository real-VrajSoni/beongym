"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { guard, invalid, type ActionResult } from "@/lib/action-result";
import { PURCHASABLE_PLAN_KEYS } from "@/lib/platform-plans";

const createAccountSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  // Required, and with its country code: a gym owner we cannot ring is a gym
  // owner we cannot help, and every reminder this product sends is a phone
  // number away from being useless.
  phone: z
    .string()
    .trim()
    .min(8, "Enter your phone number")
    .max(24)
    .regex(/^\+\d[\d\s-]{6,}$/, "Include your country code — pick it from the list"),
  password: z.string().min(8, "Use at least 8 characters").max(72),
  /** Carried through from the pricing table so checkout opens on that plan. */
  plan: z.enum(PURCHASABLE_PLAN_KEYS).optional(),
  /** Gym code carried through from "claim this gym", so signing up returns
      the visitor to the listing they were trying to take over. */
  claim: z.string().trim().max(24).optional(),
});

/**
 * Registers a prospective gym owner.
 *
 * No gym is created here — the account exists first, the plan is chosen next,
 * and the tenant is provisioned when the order is paid. That ordering is what
 * lets the platform see who signed up but never bought.
 */
export async function createAccountAction(formData: FormData): Promise<ActionResult> {
  let destination = "/start/plans";

  const result = await guard(async () => {
    const parsed = createAccountSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return invalid(parsed.error);
    const d = parsed.data;

    const existing = await db.user.findUnique({
      where: { email: d.email },
      select: { id: true },
    });
    if (existing) {
      return {
        ok: false as const,
        error: "",
        fieldErrors: { email: "That email already has an account. Sign in instead." },
      };
    }

    const user = await db.user.create({
      data: {
        name: d.name,
        email: d.email,
        phone: d.phone,
        passwordHash: await hashPassword(d.password),
        role: "PROSPECT",
        lastLoginAt: new Date(),
      },
    });

    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: "PROSPECT",
      profileId: null,
      gymId: null,
      gymName: null,
      gymCode: null,
      gymTier: null,
      gymAccessExpiresAt: null,
    });

    if (d.claim) destination = `/gyms/${encodeURIComponent(d.claim.toUpperCase())}/claim`;
    else if (d.plan) destination = `/start/checkout?plan=${d.plan}`;
    return { ok: true as const, message: "Account created." };
  });

  if (result.ok) redirect(destination);
  return result;
}
