"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  MessageCircle,
  RefreshCw,
  Send,
  SkipForward,
  Sparkles,
} from "lucide-react";
import {
  refreshQueueAction,
  saveMessageRuleAction,
  setMessageStatusAction,
} from "@/app/actions/messages";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/ui/section";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAction } from "@/components/ui/use-action";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type RuleRow = {
  kind: string;
  enabled: boolean;
  daysBefore: number | null;
  template: string;
  configured: boolean;
};

export type QueueRow = {
  id: string;
  kind: string;
  phone: string;
  body: string;
  dueOn: string;
  link: string;
  memberName: string;
  memberCode: string;
  clientId: string | null;
};

export type HistoryRow = {
  id: string;
  kind: string;
  status: string;
  body: string;
  dueOn: string;
  sentAt: string | null;
  memberName: string;
  memberCode: string;
};

const PLACEHOLDERS = ["{{name}}", "{{gym}}", "{{plan}}", "{{date}}", "{{amount}}", "{{code}}"];

/**
 * The reminder desk.
 *
 * Three tabs, in the order the work happens: what is waiting to go out, the
 * rules that put it there, and what has already gone. The send button is a
 * WhatsApp deep link — the message is written for you, WhatsApp does the
 * sending, and you say here whether it went. No screen in this product claims
 * a message was delivered when nobody sent it.
 */
export function MessagesView({
  rules,
  queue,
  history,
  kindLabels,
  kindBlurbs,
}: {
  rules: RuleRow[];
  queue: QueueRow[];
  history: HistoryRow[];
  kindLabels: Record<string, string>;
  kindBlurbs: Record<string, string>;
}) {
  const router = useRouter();
  const { pending, run } = useAction();
  const [tab, setTab] = useState("queue");

  const on = rules.filter((r) => r.enabled).length;

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="queue">
            To send
            {queue.length > 0 ? (
              <span className="tabular ml-1.5 text-[11.5px] opacity-70">{queue.length}</span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="rules">
            Reminders
            <span className="tabular ml-1.5 text-[11.5px] opacity-70">
              {on}/{rules.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="history">Sent</TabsTrigger>
        </TabsList>

        <Button
          variant="secondary"
          loading={pending}
          onClick={() => run(() => refreshQueueAction(), { onSuccess: () => router.refresh() })}
        >
          <RefreshCw /> Check who&rsquo;s due
        </Button>
      </div>

      <TabsContent value="queue">
        {queue.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]">
            <EmptyState
              icon={MessageCircle}
              title="Nobody is due right now"
              description={
                on === 0
                  ? "Switch a reminder on and this list fills itself — expiring memberships, outstanding dues, birthdays and new joiners."
                  : "Everybody due today has been dealt with. Check again tomorrow, or after you add members."
              }
              action={
                on === 0 ? (
                  <Button size="sm" onClick={() => setTab("rules")}>
                    Set up reminders
                  </Button>
                ) : null
              }
            />
          </div>
        ) : (
          <div className="space-y-3">
            {queue.map((m) => (
              <div
                key={m.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {m.clientId ? (
                        <Link
                          href={`/gym/clients/${m.clientId}`}
                          className="text-[14px] font-medium hover:underline"
                        >
                          {m.memberName}
                        </Link>
                      ) : (
                        <span className="text-[14px] font-medium">{m.memberName}</span>
                      )}
                      <Badge tone="outline">{kindLabels[m.kind] ?? m.kind}</Badge>
                    </div>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      <span className="font-mono">{m.memberCode}</span> · {m.phone} · due{" "}
                      {formatDate(m.dueOn)}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button asChild size="sm">
                      <a href={m.link} target="_blank" rel="noopener noreferrer">
                        <Send /> Open in WhatsApp
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={pending}
                      onClick={() =>
                        run(() => setMessageStatusAction(m.id, "SENT"), {
                          onSuccess: () => router.refresh(),
                        })
                      }
                    >
                      <Check /> Sent
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={pending}
                      onClick={() =>
                        run(() => setMessageStatusAction(m.id, "SKIPPED"), {
                          onSuccess: () => router.refresh(),
                        })
                      }
                    >
                      <SkipForward /> Skip
                    </Button>
                  </div>
                </div>

                <p className="mt-3 rounded-lg bg-[var(--surface-muted)] px-3.5 py-2.5 text-[12.5px] leading-relaxed whitespace-pre-line">
                  {m.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="rules">
        <div className="space-y-4">
          {rules.map((rule) => (
            <RuleCard
              key={rule.kind}
              rule={rule}
              label={kindLabels[rule.kind] ?? rule.kind}
              blurb={kindBlurbs[rule.kind] ?? ""}
            />
          ))}

          <p className="text-[12px] leading-relaxed text-muted-foreground">
            Placeholders you can use: {PLACEHOLDERS.join(" · ")}. They are filled in when the
            message is written, so the text you see in the list is exactly what goes out.
          </p>
        </div>
      </TabsContent>

      <TabsContent value="history">
        {history.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]">
            <EmptyState
              icon={Sparkles}
              title="Nothing sent yet"
              description="Messages you send or skip are recorded here with their exact text, so you always know what a member was told."
            />
          </div>
        ) : (
          <Section title="Last 60 messages" bodyClassName="px-0 py-0">
            <ul className="divide-y divide-[var(--border)]">
              {history.map((h) => (
                <li key={h.id} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[13.5px] font-medium">
                      {h.memberName}{" "}
                      <span className="font-mono text-[11.5px] text-muted-foreground">
                        {h.memberCode}
                      </span>
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge tone="outline">{kindLabels[h.kind] ?? h.kind}</Badge>
                      <Badge tone={h.status === "SENT" ? "success" : "neutral"}>
                        {h.status === "SENT" ? "Sent" : "Skipped"}
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[12.5px] text-muted-foreground">
                    {h.body}
                  </p>
                  <p className="mt-1 text-[11.5px] text-[var(--subtle-foreground)]">
                    {h.sentAt ? formatDateTime(h.sentAt) : `due ${formatDate(h.dueOn)}`}
                  </p>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </TabsContent>
    </Tabs>
  );
}

function RuleCard({ rule, label, blurb }: { rule: RuleRow; label: string; blurb: string }) {
  const router = useRouter();
  const { pending, run } = useAction();
  const [enabled, setEnabled] = useState(rule.enabled);
  const [days, setDays] = useState(rule.daysBefore ?? 0);
  const [template, setTemplate] = useState(rule.template);
  const [open, setOpen] = useState(false);

  const dirty =
    enabled !== rule.enabled || days !== (rule.daysBefore ?? 0) || template !== rule.template;

  function save(nextEnabled = enabled) {
    run(
      () =>
        saveMessageRuleAction({
          kind: rule.kind,
          enabled: nextEnabled,
          daysBefore: rule.kind === "EXPIRY_REMINDER" ? days : null,
          template,
        }),
      { onSuccess: () => router.refresh() },
    );
  }

  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border bg-[var(--surface)] p-5",
        enabled ? "border-[var(--brand)]/35" : "border-[var(--border)]",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[14.5px] font-semibold">{label}</p>
            {enabled ? <Badge tone="brand" dot>On</Badge> : <Badge tone="outline">Off</Badge>}
          </div>
          <p className="mt-1 max-w-lg text-[12.5px] leading-relaxed text-muted-foreground">
            {blurb}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            variant={enabled ? "secondary" : "primary"}
            loading={pending}
            onClick={() => {
              const next = !enabled;
              setEnabled(next);
              save(next);
            }}
          >
            {enabled ? "Switch off" : "Switch on"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)}>
            {open ? "Close" : "Edit message"}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
          {rule.kind === "EXPIRY_REMINDER" ? (
            <div className="flex items-center gap-3">
              <label htmlFor={`days-${rule.kind}`} className="text-[13px] text-muted-foreground">
                Days of notice
              </label>
              <Input
                id={`days-${rule.kind}`}
                type="number"
                min={0}
                max={60}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="h-9 w-24"
              />
            </div>
          ) : null}

          <Textarea
            rows={3}
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            aria-label={`${label} message`}
          />

          <div className="flex items-center gap-2">
            <Button size="sm" loading={pending} disabled={!dirty} onClick={() => save()}>
              Save message
            </Button>
            {!rule.configured ? (
              <span className="text-[12px] text-muted-foreground">
                This is our suggested wording — make it sound like you.
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
