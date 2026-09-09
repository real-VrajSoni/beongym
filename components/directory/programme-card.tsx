"use client";

import { useState } from "react";
import { ArrowRight, CalendarDays, Clock3, Info, Tag } from "lucide-react";
import { PlanMotif, themeFor } from "@/components/plans/plan-art";
import { Modal, ModalBody, ModalContent } from "@/components/ui/modal";
import { BILLING_LABELS, PLAN_TYPE_LABELS, label } from "@/lib/labels";
import { formatCurrency } from "@/lib/format";

export type PublicProgramme = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  showPrice: boolean;
  durationDays: number;
  billingInterval: string;
  planType: string;
};

/**
 * A programme on the public store.
 *
 * The card is a summary and the dialog is the whole of it — descriptions get
 * clamped to three lines on the card so the grid stays even, and a visitor who
 * wants the rest should not have to leave the page to read it.
 *
 * The price is the gym's to publish, so a card without one is not a card with
 * something missing — it is a card whose job is to get the visitor talking to
 * the gym. Either way it ends in the same place: a button that reaches a human.
 */
export function ProgrammeCard({
  programme,
  index,
  contactHref,
  gymName,
}: {
  programme: PublicProgramme;
  index: number;
  contactHref: string | null;
  gymName: string;
}) {
  const theme = themeFor(index);
  const [open, setOpen] = useState(false);

  const billing = label(BILLING_LABELS, programme.billingInterval);
  const type = label(PLAN_TYPE_LABELS, programme.planType);
  const cta = programme.showPrice ? "Enquire about this" : "Contact for latest price";

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-[var(--mk-border-strong)] bg-[var(--mk-panel)] text-left transition-all duration-200 outline-none hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mk-bg)]"
        style={{ boxShadow: `0 1px 0 0 ${theme.accent}22 inset` }}
      >
        <div className="relative px-5 pt-5 pb-4" style={{ background: theme.surface }}>
          <PlanMotif
            index={index}
            className="pointer-events-none absolute -top-2 -right-4 h-24 w-40 opacity-70"
          />
          <span
            className="relative inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] font-semibold tracking-[0.1em] uppercase"
            style={{ background: `${theme.accent}22`, color: theme.accent }}
          >
            {type}
          </span>
          <h3 className="relative mt-2.5 text-[17px] leading-tight font-semibold">
            {programme.name}
          </h3>
        </div>

        <div className="flex flex-1 flex-col p-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-[var(--mk-fg-subtle)]">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              {billing}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-3.5" />
              {programme.durationDays} days
            </span>
          </div>

          {programme.description ? (
            <p className="mt-3 line-clamp-3 text-[13px] leading-relaxed text-[var(--mk-fg-muted)]">
              {programme.description}
            </p>
          ) : null}

          <span
            className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium"
            style={{ color: theme.accent }}
          >
            See full details
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </span>

          <div className="mt-auto pt-5">
            {programme.showPrice ? (
              <p className="tabular mb-3 text-[22px] leading-none font-semibold">
                {formatCurrency(programme.price)}
                <span className="ml-1 text-[12px] font-normal text-[var(--mk-fg-subtle)]">
                  / {billing.toLowerCase()}
                </span>
              </p>
            ) : null}

            {contactHref ? (
              <a
                href={contactHref}
                // The card opens the details; this button is the direct action,
                // so it must not do both.
                onClick={(e) => e.stopPropagation()}
                className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium text-white transition-transform group-hover:scale-[1.01]"
                style={{ background: theme.accent }}
              >
                {cta}
                <ArrowRight className="size-3.5" />
              </a>
            ) : (
              <p className="rounded-lg border border-dashed border-[var(--mk-border-strong)] px-3 py-2.5 text-center text-[12px] text-[var(--mk-fg-subtle)]">
                No contact details yet
              </p>
            )}
          </div>
        </div>
      </article>

      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent title={programme.name} description={`${type} at ${gymName}`} size="lg">
          <div className="relative px-5 py-6" style={{ background: theme.surface }}>
            <PlanMotif
              index={index}
              className="pointer-events-none absolute -top-3 -right-2 h-28 w-48 opacity-70"
            />
            <div className="relative flex flex-wrap items-center gap-2">
              <Fact icon={CalendarDays} value={billing} accent={theme.accent} />
              <Fact icon={Clock3} value={`${programme.durationDays} days`} accent={theme.accent} />
              <Fact
                icon={Tag}
                value={programme.showPrice ? formatCurrency(programme.price) : "Price on request"}
                accent={theme.accent}
              />
            </div>
          </div>

          <ModalBody>
            {programme.description ? (
              <p className="text-[14px] leading-relaxed whitespace-pre-line text-muted-foreground">
                {programme.description}
              </p>
            ) : (
              <p className="text-[14px] text-muted-foreground">
                {gymName} hasn&rsquo;t written a description for this one yet — ask them what it
                covers.
              </p>
            )}

            <p className="mt-5 flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3.5 py-3 text-[12.5px] leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              {programme.showPrice
                ? `${formatCurrency(programme.price)} for ${programme.durationDays} days, billed ${billing.toLowerCase()}. Joining is arranged directly with the gym.`
                : "This gym quotes its prices directly — they change with intake and season. Get in touch and they'll tell you what this costs today."}
            </p>

            {contactHref ? (
              <a
                href={contactHref}
                className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg text-[14px] font-medium text-white transition-transform hover:scale-[1.01]"
                style={{ background: theme.accent }}
              >
                {cta}
                <ArrowRight className="size-4" />
              </a>
            ) : null}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}

function Fact({
  icon: Icon,
  value,
  accent,
}: {
  icon: typeof Clock3;
  value: string;
  accent: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium"
      style={{ background: `${accent}22`, color: accent }}
    >
      <Icon className="size-3.5" />
      {value}
    </span>
  );
}
