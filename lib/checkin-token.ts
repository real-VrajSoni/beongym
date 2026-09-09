import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";

/**
 * The gym's check-in code.
 *
 * One code per gym, and the same one for good: the QR gets printed and stuck
 * to the door, so anything that expires would leave a wall of dead posters.
 * The code is random and unguessable rather than derived from the gym id, which
 * means a leaked poster can be revoked by issuing a new one — see
 * `resetCheckInCodeAction`.
 */

/** A fresh code. 32 hex characters: short enough for a QR, long enough to be unguessable. */
export function newCheckInCode(): string {
  return randomBytes(16).toString("hex");
}

/** Constant-time compare, so the code can't be guessed a character at a time. */
export function checkInCodeMatches(expected: string, given: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}
