import "server-only";
import type { Prisma } from "@/lib/generated/prisma/client";
import { extendAccess, planByKey, tierFor } from "@/lib/platform-plans";
import { generateGymCode } from "@/lib/data/gym-code";
import { STARTER_PLANS } from "@/lib/data/starter-plans";
import { paymentLog } from "./log";
import type { Tx } from "./events";

/**
 * Turning a paid order into a provisioned gym.
 *
 * Everything a purchase creates — the gym, the owner, the starting programmes,
 * the access window — happens here and nowhere else, and this runs only from a
 * verified webhook or from simulated mode.
 *
 * It used to happen inside the actions themselves. That was defensible while
 * there was no gateway to wait for, and became a hole the moment there was
 * one: reaching /start/checkout and clicking a plan created a working gym with
 * a month of access and no money involved. The order was even written
 * `status: "PAID"`, so the platform's own books agreed it had been paid for.
 *
 * The details a gym needs in order to exist are carried on the order's `meta`,
 * because at the point of payment the gym does not exist yet — that is the
 * whole point. The order is the promise; this is the delivery.
 */

type Meta = Record<string, unknown>;

const str = (m: Meta, k: string): string | null => {
  const v = m[k];
  return typeof v === "string" && v.trim() ? v : null;
};
const num = (m: Meta, k: string): number | null => {
  const v = m[k];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
};

/** The access window this order buys, added to whatever is already there. */
function windowFor(current: Date | null, planKey: string, fromGateway: string | undefined) {
  if (fromGateway) {
    const d = new Date(fromGateway);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return extendAccess(current, planKey);
}

export type FulfilResult = { ok: boolean; gymId: string | null; note: string };

/**
 * Complete one order.
 *
 * Idempotent by construction: an order already PAID returns without doing
 * anything a second time, so a redelivered webhook cannot create two gyms.
 */
export async function fulfilOrder(
  tx: Tx,
  orderId: string,
  gateway: {
    subscriptionId?: string;
    customerId?: string;
    paymentId?: string;
    nextBillingDate?: string;
  } = {},
): Promise<FulfilResult> {
  const order = await tx.platformOrder.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, gymId: null, note: "order not found" };

  if (order.status === "PAID") {
    return { ok: true, gymId: order.gymId, note: "already fulfilled" };
  }

  const meta = (order.meta ?? {}) as Meta;
  const planKey = order.billingCycle;
  const plan = planByKey(planKey);

  let gymId = order.gymId;

  /* ── the gym may not exist yet ─────────────────────────────────── */
  if (!gymId && (order.kind === "CHECKOUT" || order.kind === "LISTING")) {
    const code = await generateGymCode(order.gymName);
    const listing = order.kind === "LISTING";

    const gym = await tx.gym.create({
      data: {
        code,
        name: order.gymName,
        city: str(meta, "city") ?? order.city,
        country: str(meta, "country"),
        currency: str(meta, "currency") ?? "USD",
        latitude: num(meta, "latitude"),
        longitude: num(meta, "longitude"),
        tagline: str(meta, "tagline"),
        description: str(meta, "description"),
        address: str(meta, "address"),
        phone: str(meta, "phone"),
        email: str(meta, "email") ?? order.email,
        amenities: Array.isArray(meta.amenities) ? (meta.amenities as string[]) : [],
        openingHours: str(meta, "openingHours"),
        imageUrl: str(meta, "imageUrl"),
        accentColor: str(meta, "accentColor") ?? "#7c6cff",
        logoText:
          order.gymName
            .replace(/[^A-Za-z]/g, "")
            .slice(0, 2)
            .toUpperCase() || "GY",
        claimed: true,
        listed: listing,
        status: "ACTIVE",
        tier: tierFor(planKey),
        accessExpiresAt: windowFor(null, planKey, gateway.nextBillingDate),
        trialEndsAt: null,
      },
    });
    gymId = gym.id;
  }

  if (!gymId) return { ok: false, gymId: null, note: `no gym for a ${order.kind} order` };

  /* ── the buyer becomes the owner ───────────────────────────────── */
  if (order.userId) {
    const user = await tx.user.findUnique({
      where: { id: order.userId },
      select: { id: true, role: true, gymId: true, trainerProfile: { select: { id: true } } },
    });
    if (user && user.role === "PROSPECT") {
      const owner = await tx.user.update({
        where: { id: user.id },
        data: {
          gymId,
          role: "GYM_OWNER",
          phone: str(meta, "phone") ?? undefined,
          trainerProfile: user.trainerProfile ? undefined : { create: { gymId, title: "Owner" } },
        },
        include: { trainerProfile: true },
      });

      // The starting six, unpriced. Only for a gym that has none — a renewal
      // must not add a second set.
      const existing = await tx.plan.count({ where: { gymId } });
      if (existing === 0 && owner.trainerProfile) {
        const gym = await tx.gym.findUniqueOrThrow({
          where: { id: gymId },
          select: { currency: true },
        });
        await tx.plan.createMany({
          data: STARTER_PLANS.map((p) => ({
            ...p,
            gymId,
            currency: gym.currency,
            trainerId: owner.trainerProfile!.id,
          })),
        });
      }
    }
  }

  /* ── the access window, and the gateway's handles ──────────────── */
  const gym = await tx.gym.findUniqueOrThrow({
    where: { id: gymId },
    select: { accessExpiresAt: true },
  });

  await tx.gym.update({
    where: { id: gymId },
    data: {
      tier: tierFor(planKey),
      accessExpiresAt: windowFor(gym.accessExpiresAt, planKey, gateway.nextBillingDate),
      status: "ACTIVE",
      claimed: true,
      trialEndsAt: null,
      dodoCustomerId: gateway.customerId ?? undefined,
      dodoSubscriptionId: gateway.subscriptionId ?? undefined,
      billingStatus: "ACTIVE",
      billingUpdatedAt: new Date(),
    },
  });

  await tx.platformOrder.update({
    where: { id: order.id },
    data: {
      gymId,
      status: "PAID",
      paidAt: new Date(),
      providerRef: gateway.paymentId ?? gateway.subscriptionId ?? order.providerRef,
      meta: { ...meta, fulfilledAt: new Date().toISOString() } as Prisma.InputJsonValue,
    },
  });

  paymentLog("info", "order.fulfilled", { orderId: order.id, gymId, kind: order.kind, planKey });
  return { ok: true, gymId, note: `${plan.name} provisioned` };
}
