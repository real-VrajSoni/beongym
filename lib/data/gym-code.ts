import "server-only";
import { db } from "@/lib/db";

/**
 * Public gym code, e.g. "IRON-4821". Derived from the gym's name so it is
 * memorable, with a random suffix for uniqueness. Members type this at
 * sign-in, so it avoids characters that are easy to misread aloud.
 */
export async function generateGymCode(name: string): Promise<string> {
  const stem =
    name
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, "")
      .split(/\s+/)
      .filter(Boolean)[0]
      ?.slice(0, 6) || "GYM";

  for (let attempt = 0; attempt < 25; attempt++) {
    const suffix = String(1000 + Math.floor(Math.random() * 9000));
    const code = `${stem}-${suffix}`;
    const clash = await db.gym.findUnique({ where: { code }, select: { id: true } });
    if (!clash) return code;
  }
  // Astronomically unlikely; fall back to something guaranteed unique.
  return `${stem}-${Date.now().toString().slice(-6)}`;
}
