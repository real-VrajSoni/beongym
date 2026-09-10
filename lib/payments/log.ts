import "server-only";

/**
 * Structured logging for the payment path, with the secrets taken out.
 *
 * One line of JSON per event, so Vercel's log search can filter on `event` or
 * `webhookId` rather than on a substring of English prose.
 *
 * `redact` is not decoration. A webhook payload contains a customer's name,
 * email and billing address, and logs are the easiest place in a system to
 * leak all three by accident — they get copied into tickets, shipped to
 * third-party aggregators and kept far longer than the data itself. So the
 * payload never goes to the log wholesale: only the handful of identifiers
 * below, which are useless to anyone who cannot already read the database.
 */
type Level = "info" | "warn" | "error";

/** Keys whose values must never reach a log line, at any depth. */
const SECRET = /^(.*(key|secret|token|password|signature|card|cvv|authorization).*)$/i;
/** Keys that identify a person rather than a record. */
const PERSONAL = /^(email|name|phone|address|billing|customer_name|street|zipcode)$/i;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return `[${value.length} items]`;

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET.test(k)) out[k] = "[redacted]";
    else if (PERSONAL.test(k)) out[k] = "[personal]";
    else if (typeof v === "object" && v !== null) out[k] = redact(v, depth + 1);
    else out[k] = v;
  }
  return out;
}

export function paymentLog(level: Level, event: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({
    at: new Date().toISOString(),
    scope: "dodo-webhook",
    event,
    ...(redact(fields) as Record<string, unknown>),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
