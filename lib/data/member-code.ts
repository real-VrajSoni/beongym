import "server-only";
import { db } from "@/lib/db";

/**
 * Next sequential member code for a gym, e.g. "M-0043".
 * Codes are unique per gym (not globally), which is what lets members sign in
 * with a short code alongside the gym code.
 */
export async function nextMemberCode(gymId: string): Promise<string> {
  const last = await db.clientProfile.findFirst({
    where: { gymId },
    orderBy: { memberCode: "desc" },
    select: { memberCode: true },
  });

  const lastNumber = last ? Number(last.memberCode.replace(/\D/g, "")) : 0;
  const next = Number.isFinite(lastNumber) ? lastNumber + 1 : 1;
  return `M-${String(next).padStart(4, "0")}`;
}
