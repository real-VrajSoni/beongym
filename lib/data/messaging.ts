import "server-only";
import { db } from "@/lib/db";
import { num } from "./serialize";
import { toDateOnly, fromDateOnly, formatCurrency, formatDate } from "@/lib/format";

/**
 * The reminders a gym sends its members.
 *
 * **Nothing here sends anything on its own.** No WhatsApp Business account is
 * connected in this release, so the queue is written, rendered and handed to
 * the front desk as a one-tap `wa.me` link with the message already typed. That
 * is genuinely useful on day one, and it is honest: the product never claims a
 * message went out that nobody sent.
 *
 * When an API account is connected, the sender replaces one function
 * (`markSent` becomes a webhook callback) and nothing above it moves.
 */

export const MESSAGE_KINDS = [
  "EXPIRY_REMINDER",
  "DUES_CHASE",
  "BIRTHDAY",
  "WELCOME",
] as const;

export type MessageKindKey = (typeof MESSAGE_KINDS)[number];

export const KIND_LABELS: Record<MessageKindKey, string> = {
  EXPIRY_REMINDER: "Membership expiring",
  DUES_CHASE: "Payment outstanding",
  BIRTHDAY: "Birthday wish",
  WELCOME: "Welcome message",
};

export const KIND_BLURBS: Record<MessageKindKey, string> = {
  EXPIRY_REMINDER: "Goes out before a membership runs out, so a renewal is a conversation and not a surprise.",
  DUES_CHASE: "For a member with money outstanding on a live membership. Written to be asked once, politely.",
  BIRTHDAY: "One line on the day. The cheapest goodwill a gym can buy.",
  WELCOME: "Sent the day somebody joins, with the codes they need for the member app.",
};

/** What a gym starts with. Editable, and written the way an owner would say it. */
export const DEFAULT_TEMPLATES: Record<MessageKindKey, { daysBefore: number | null; template: string }> = {
  EXPIRY_REMINDER: {
    daysBefore: 5,
    template:
      "Hi {{name}}, your {{plan}} at {{gym}} runs out on {{date}}. Pop in any time before then and we'll sort the renewal in a minute. — {{gym}}",
  },
  DUES_CHASE: {
    daysBefore: null,
    template:
      "Hi {{name}}, there's {{amount}} outstanding on your {{plan}} at {{gym}}. You can settle it at the desk on your next visit. Thanks!",
  },
  BIRTHDAY: {
    daysBefore: 0,
    template: "Happy birthday, {{name}}! Have a great one — and we'll see you on the floor. — {{gym}}",
  },
  WELCOME: {
    daysBefore: 0,
    template:
      "Welcome to {{gym}}, {{name}}! Your member code is {{code}}. You can see your plan, dues and progress in our app — ask at the desk for your password.",
  },
};

type Vars = {
  name: string;
  gym: string;
  plan: string;
  date: string;
  amount: string;
  code: string;
};

/** Fills `{{placeholders}}`. Unknown ones are left alone rather than blanked. */
export function render(template: string, vars: Partial<Vars>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (whole, key: string) => {
    const value = vars[key as keyof Vars];
    return value === undefined || value === null ? whole : String(value);
  });
}

/** Digits only — what `wa.me` wants, and what a stored number rarely is. */
export function waNumber(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

/** The one-tap link the desk actually clicks. */
export function waLink(phone: string, body: string): string {
  return `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(body)}`;
}

/** Every rule for a gym, with the defaults filled in for kinds never set up. */
export async function getMessageRules(gymId: string) {
  const rows = await db.messageRule.findMany({ where: { gymId } });
  const byKind = new Map(rows.map((r) => [r.kind as MessageKindKey, r]));

  return MESSAGE_KINDS.map((kind) => {
    const row = byKind.get(kind);
    const fallback = DEFAULT_TEMPLATES[kind];
    return {
      kind,
      id: row?.id ?? null,
      // A rule that has never been saved is off: no gym should discover its
      // members were messaged by a default it never chose.
      enabled: row?.enabled ?? false,
      daysBefore: row?.daysBefore ?? fallback.daysBefore,
      template: row?.template ?? fallback.template,
      configured: Boolean(row),
    };
  });
}

export type MessageRuleRow = Awaited<ReturnType<typeof getMessageRules>>[number];

/**
 * Works out who is due a message today and writes the queue.
 *
 * Idempotent by design: `(client, kind, dueOn)` is unique, so running it twice
 * in a day adds nothing the second time, and a message the desk already sent or
 * skipped is never re-queued.
 */
export async function buildQueue(gymId: string): Promise<number> {
  const gym = await db.gym.findUniqueOrThrow({
    where: { id: gymId },
    select: { name: true },
  });
  const rules = (await db.messageRule.findMany({ where: { gymId, enabled: true } })).map((r) => ({
    ...r,
    kind: r.kind as MessageKindKey,
  }));
  if (rules.length === 0) return 0;

  const today = toDateOnly();
  const members = await db.clientProfile.findMany({
    where: { gymId, user: { isActive: true, phone: { not: null } } },
    select: {
      id: true,
      memberCode: true,
      dateOfBirth: true,
      createdAt: true,
      user: { select: { name: true, phone: true } },
      subscriptions: {
        where: { status: { in: ["ACTIVE", "TRIAL"] } },
        orderBy: { startDate: "desc" },
        take: 1,
        select: {
          endDate: true,
          plan: { select: { name: true, price: true, currency: true } },
          payments: { select: { amount: true, status: true } },
        },
      },
    },
  });

  const rows: {
    gymId: string;
    clientId: string;
    ruleId: string;
    kind: MessageKindKey;
    phone: string;
    body: string;
    dueOn: Date;
  }[] = [];

  for (const rule of rules) {
    for (const m of members) {
      const phone = m.user.phone;
      if (!phone) continue;
      const sub = m.subscriptions[0] ?? null;

      const vars: Partial<Vars> = {
        name: m.user.name.split(" ")[0],
        gym: gym.name,
        code: m.memberCode,
        plan: sub?.plan.name ?? "membership",
      };

      if (rule.kind === "EXPIRY_REMINDER") {
        if (!sub) continue;
        const end = fromDateOnly(sub.endDate);
        const daysOut = Math.round((end.getTime() - today.getTime()) / 86_400_000);
        if (daysOut !== (rule.daysBefore ?? 5)) continue;
        vars.date = formatDate(end);
        rows.push({
          gymId,
          clientId: m.id,
          ruleId: rule.id,
          kind: rule.kind,
          phone,
          body: render(rule.template, vars),
          dueOn: today,
        });
        continue;
      }

      if (rule.kind === "DUES_CHASE") {
        if (!sub) continue;
        const price = num(sub.plan.price) ?? 0;
        const paid = sub.payments
          .filter((p) => p.status === "SUCCESSFUL")
          .reduce((sum, p) => sum + (num(p.amount) ?? 0), 0);
        const owed = Math.max(0, price - paid);
        if (owed <= 0) continue;
        vars.amount = formatCurrency(owed, sub.plan.currency);
        vars.date = formatDate(fromDateOnly(sub.endDate));
        rows.push({
          gymId,
          clientId: m.id,
          ruleId: rule.id,
          kind: rule.kind,
          phone,
          body: render(rule.template, vars),
          dueOn: today,
        });
        continue;
      }

      if (rule.kind === "BIRTHDAY") {
        if (!m.dateOfBirth) continue;
        const dob = fromDateOnly(m.dateOfBirth);
        if (dob.getDate() !== today.getUTCDate() || dob.getMonth() !== today.getUTCMonth()) continue;
        rows.push({
          gymId,
          clientId: m.id,
          ruleId: rule.id,
          kind: rule.kind,
          phone,
          body: render(rule.template, vars),
          dueOn: today,
        });
        continue;
      }

      if (rule.kind === "WELCOME") {
        const joined = m.createdAt;
        const sameDay =
          joined.getFullYear() === new Date().getFullYear() &&
          joined.getMonth() === new Date().getMonth() &&
          joined.getDate() === new Date().getDate();
        if (!sameDay) continue;
        rows.push({
          gymId,
          clientId: m.id,
          ruleId: rule.id,
          kind: rule.kind,
          phone,
          body: render(rule.template, vars),
          dueOn: today,
        });
      }
    }
  }

  if (rows.length === 0) return 0;
  const result = await db.messageLog.createMany({ data: rows, skipDuplicates: true });
  return result.count;
}

/** What the desk has to send, oldest first. */
export async function getQueue(gymId: string) {
  const rows = await db.messageLog.findMany({
    where: { gymId, status: "QUEUED" },
    orderBy: [{ dueOn: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      kind: true,
      phone: true,
      body: true,
      dueOn: true,
      client: {
        select: { id: true, memberCode: true, user: { select: { name: true } } },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    kind: r.kind as MessageKindKey,
    phone: r.phone,
    body: r.body,
    dueOn: r.dueOn,
    link: waLink(r.phone, r.body),
    memberName: r.client?.user.name ?? "Former member",
    memberCode: r.client?.memberCode ?? "—",
    clientId: r.client?.id ?? null,
  }));
}

export type QueuedMessage = Awaited<ReturnType<typeof getQueue>>[number];

/** The last 60 messages that are no longer waiting, for the record. */
export async function getMessageHistory(gymId: string) {
  const rows = await db.messageLog.findMany({
    where: { gymId, status: { not: "QUEUED" } },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      id: true,
      kind: true,
      status: true,
      body: true,
      dueOn: true,
      sentAt: true,
      client: { select: { memberCode: true, user: { select: { name: true } } } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    kind: r.kind as MessageKindKey,
    status: r.status as string,
    body: r.body,
    dueOn: r.dueOn,
    sentAt: r.sentAt,
    memberName: r.client?.user.name ?? "Former member",
    memberCode: r.client?.memberCode ?? "—",
  }));
}
