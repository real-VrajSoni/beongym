"use server";

import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { guard, type ActionResult } from "@/lib/action-result";
import { dodo, gatewayConfigured } from "@/lib/payments/dodo";
import { serverEnv } from "@/lib/env";

/** Customer portal credentials are obtained only for the authenticated gym. */
export async function manageBillingAction(): Promise<ActionResult> {
  return guard(async () => {
    const session = await requireOwner();
    const gym = await db.gym.findUniqueOrThrow({ where: { id: session.gymId }, select: { dodoCustomerId: true, dodoSubscriptionId: true } });
    if (!gatewayConfigured() || !gym.dodoCustomerId || !gym.dodoSubscriptionId) return { ok: false, error: "Billing management is unavailable. Contact support." };
    const portal = await dodo().customers.customerPortal.create(gym.dodoCustomerId, {
      send_email: false, return_url: `${serverEnv().appUrl}/gym/billing`,
    }, { timeout: 10000, maxRetries: 0 });
    const url = new URL(portal.link);
    if (url.protocol !== "https:" || url.username || url.password) return { ok: false, error: "The billing portal could not be opened." };
    return { ok: true, checkoutUrl: portal.link };
  });
}
