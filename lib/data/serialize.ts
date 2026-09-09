import "server-only";
import { toNumber, type DecimalLike } from "@/lib/format";

/** Prisma Decimal -> number at the server/client boundary. */
export const num = (v: DecimalLike): number | null => toNumber(v);
export const numOr = (v: DecimalLike, fallback: number): number => toNumber(v) ?? fallback;
