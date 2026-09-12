"use server";

import { publicGymWhere } from "@/lib/data/directory";
import { consumeRateLimit } from "@/lib/rate-limit";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { guard, invalid, type ActionResult } from "@/lib/action-result";

const KINDS = [
  "WEBSITE",
  "INSTAGRAM",
  "FACEBOOK",
  "YOUTUBE",
  "WHATSAPP",
  "MAPS",
  "PHONE",
  "EMAIL",
  "OTHER",
] as const;

const linkSchema = z.object({
  kind: z.enum(KINDS),
  label: z.string().trim().max(40).optional(),
  url: z.string().trim().min(3, "Add a link").max(400),
});

const linksSchema = z.object({
  links: z.string(),
});

/**
 * Normalises what people actually type.
 *
 * Owners paste "instagram.com/ironboxgym", "@ironbox" or a phone number. All
 * three have to end up as something a browser will follow, because a link that
 * does nothing is the listing failing at its only job.
 */
function toHref(kind: (typeof KINDS)[number], raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  if (kind === "PHONE") return `tel:${value.replace(/[^\d+]/g, "")}`;
  if (kind === "EMAIL") return value.includes("@") ? `mailto:${value}` : null;
  if (kind === "WHATSAPP") {
    const digits = value.replace(/[^\d]/g, "");
    if (digits.length >= 8) return `https://wa.me/${digits}`;
    return /^https?:\/\//i.test(value) ? value : null;
  }
  if (kind === "INSTAGRAM" && value.startsWith("@")) {
    return `https://instagram.com/${value.slice(1)}`;
  }
  if (/^https?:\/\//i.test(value)) return value;
  // A bare domain or handle path — assume https rather than rejecting it.
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(value)) return `https://${value}`;
  return null;
}

/**
 * Replaces the gym's whole link list.
 *
 * Sent as one JSON field rather than a dozen indexed inputs: the editor is a
 * list the owner reorders and deletes rows from, and diffing that server-side
 * from flat form fields would be worse for everyone.
 */
export async function saveGymLinksAction(formData: FormData): Promise<ActionResult> {
  return guard(async () => {
    const session = await requireOwner();
    const parsed = linksSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return invalid(parsed.error);

    let rows: unknown;
    try {
      rows = JSON.parse(parsed.data.links);
    } catch {
      return { ok: false as const, error: "Those links couldn't be read." };
    }

    const list = z.array(linkSchema).max(8).safeParse(rows);
    if (!list.success) return { ok: false as const, error: "Check the links and try again." };

    const cleaned = list.data
      .map((row, i) => ({ ...row, href: toHref(row.kind, row.url), sortOrder: i }))
      .filter((row): row is typeof row & { href: string } => row.href !== null);

    if (cleaned.length !== list.data.length) {
      return { ok: false as const, error: "One of those links doesn't look like a link." };
    }

    const existing = await db.gymLink.findMany({
      where: { gymId: session.gymId },
      select: { id: true, url: true, clickCount: true },
    });

    await db.$transaction(async (tx) => {
      await tx.gymLink.deleteMany({ where: { gymId: session.gymId } });
      for (const row of cleaned) {
        await tx.gymLink.create({
          data: {
            gymId: session.gymId,
            kind: row.kind,
            label: row.label || null,
            url: row.href,
            sortOrder: row.sortOrder,
            // Editing a label must not reset the number the owner is watching,
            // so a link that survives the save keeps its clicks.
            clickCount: existing.find((e) => e.url === row.href)?.clickCount ?? 0,
          },
        });
      }
    });

    revalidatePath("/gym/settings");
    revalidatePath("/gyms");
    return { ok: true as const, message: "Links saved." };
  });
}

/**
 * One click, counted. Deliberately unauthenticated and fire-and-forget: this
 * runs as a visitor leaves for the gym's own site, and a failed counter must
 * never get between them and the gym.
 */
export async function recordLinkClickAction(linkId: string): Promise<void> {
  if (typeof linkId !== "string" || linkId.length > 200) return;
  try {
    if (!(await consumeRateLimit("public-link-click", "all", 300, 60000))) return;
    if (!(await consumeRateLimit("public-link", linkId, 30, 60000))) return;
    await db.gymLink.updateMany({ where: { id: linkId, gym: publicGymWhere() }, data: { clickCount: { increment: 1 } } });
  } catch { /* Best-effort analytics must not block a public link. */ }
}
