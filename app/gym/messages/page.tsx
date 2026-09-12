import { MessageCircle } from "lucide-react";
import { requirePaidStaff } from "@/lib/auth";
import {
  KIND_BLURBS,
  KIND_LABELS,
  getMessageHistory,
  getMessageRules,
  getQueue,
} from "@/lib/data/messaging";
import { PageHeader } from "@/components/ui/page-header";
import { MessagesView } from "@/components/messages/messages-view";

export const metadata = { title: "Reminders" };

export default async function MessagesPage() {
  const session = await requirePaidStaff();
  const [rules, queue, history] = await Promise.all([
    getMessageRules(session.gymId),
    getQueue(session.gymId),
    getMessageHistory(session.gymId),
  ]);

  return (
    <>
      <PageHeader
        title="Reminders"
        description="Expiry, dues, birthdays and welcomes — written for you, sent from your own WhatsApp."
      />

      {/* Said once, at the top, rather than implied by a switch that does
          nothing: no message leaves this product on its own yet. */}
      <div className="mb-5 flex items-start gap-3 rounded-[var(--radius-card)] border border-[var(--warning)]/25 bg-[var(--warning-soft)] px-5 py-4">
        <MessageCircle className="mt-0.5 size-4 shrink-0 text-[var(--warning)]" />
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          <span className="font-medium text-[var(--warning)]">Nothing sends itself yet.</span>{" "}
          BeOnGym works out who is due and writes the message; you tap through to WhatsApp and
          send it from your own number, which is the number your members already know. Automatic
          sending arrives with the WhatsApp Business API, and until it does no screen here will
          pretend a message went out.
        </p>
      </div>

      <MessagesView
        rules={rules}
        queue={queue.map((q) => ({ ...q, dueOn: q.dueOn.toISOString() }))}
        history={history.map((h) => ({
          ...h,
          dueOn: h.dueOn.toISOString(),
          sentAt: h.sentAt?.toISOString() ?? null,
        }))}
        kindLabels={KIND_LABELS}
        kindBlurbs={KIND_BLURBS}
      />
    </>
  );
}
