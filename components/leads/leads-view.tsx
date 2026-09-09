"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  Filter,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Plus,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import {
  deleteLeadAction,
  logLeadActivityAction,
  saveLeadAction,
  setLeadStatusAction,
} from "@/app/actions/leads";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select, Textarea } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { PhoneField } from "@/components/ui/phone-field";
import { Modal, ModalBody, ModalContent, ModalFooter } from "@/components/ui/modal";
import { FormError, FormField, FormGrid } from "@/components/ui/form-field";
import { StatCard } from "@/components/ui/stat-card";
import { useAction } from "@/components/ui/use-action";
import { formatDate, formatDateShort, daysUntil } from "@/lib/format";
import { cn } from "@/lib/utils";

export type LeadRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string;
  status: string;
  interest: string | null;
  notes: string | null;
  nextFollowUpAt: string | null;
  joinedAt: string | null;
  lostReason: string | null;
  createdAt: string;
  activity: { id: string; note: string; createdAt: string }[];
};

const STATUSES = ["NEW", "CONTACTED", "TRIAL_BOOKED", "JOINED", "LOST"] as const;

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  TRIAL_BOOKED: "Trial booked",
  JOINED: "Joined",
  LOST: "Lost",
};

const STATUS_TONE: Record<string, BadgeTone> = {
  NEW: "info",
  CONTACTED: "brand",
  TRIAL_BOOKED: "warning",
  JOINED: "success",
  LOST: "neutral",
};

const SOURCE_LABELS: Record<string, string> = {
  WALK_IN: "Walk-in",
  CALL: "Phone call",
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  REFERRAL: "Referral",
  WEBSITE: "Website",
  MAP: "BeOnGym map",
  OTHER: "Other",
};

/**
 * The enquiry list.
 *
 * Sorted by who needs ringing rather than by when they arrived, because the
 * only question this screen answers is "who am I calling today". Everything
 * else — the pipeline counts, the conversion rate — is there to tell an owner
 * whether the calling is working.
 */
export function LeadsView({ leads }: { leads: LeadRow[] }) {
  const router = useRouter();
  const { pending, run } = useAction();
  const [filter, setFilter] = useState<string>("OPEN");
  const [editing, setEditing] = useState<LeadRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [logging, setLogging] = useState<LeadRow | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const counts = useMemo(() => {
    const out: Record<string, number> = { OPEN: 0 };
    for (const s of STATUSES) out[s] = 0;
    for (const l of leads) {
      out[l.status] = (out[l.status] ?? 0) + 1;
      if (l.status !== "JOINED" && l.status !== "LOST") out.OPEN += 1;
    }
    return out;
  }, [leads]);

  const decided = counts.JOINED + counts.LOST;
  const conversion = decided > 0 ? Math.round((counts.JOINED / decided) * 100) : null;
  const dueToday = leads.filter(
    (l) => l.nextFollowUpAt !== null && daysUntil(l.nextFollowUpAt) <= 0,
  ).length;

  const shown = useMemo(() => {
    const rows = leads.filter((l) =>
      filter === "OPEN" ? l.status !== "JOINED" && l.status !== "LOST" : l.status === filter,
    );
    return rows.sort((a, b) => {
      // Overdue first, then soonest follow-up, then newest.
      const aDue = a.nextFollowUpAt ? new Date(a.nextFollowUpAt).getTime() : Infinity;
      const bDue = b.nextFollowUpAt ? new Date(b.nextFollowUpAt).getTime() : Infinity;
      if (aDue !== bDue) return aDue - bDue;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [leads, filter]);

  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Open enquiries" value={counts.OPEN} icon={Filter} accent />
        <StatCard label="To call today" value={dueToday} icon={Phone} hint="due or overdue" />
        <StatCard label="Joined" value={counts.JOINED} icon={Check} />
        <StatCard
          label="Conversion"
          value={conversion === null ? "—" : `${conversion}%`}
          icon={UserPlus}
          hint={decided > 0 ? `${counts.JOINED} of ${decided} decided` : "nothing decided yet"}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {(["OPEN", ...STATUSES] as const).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                filter === key
                  ? "bg-[var(--brand-soft)] text-[var(--brand-soft-foreground)]"
                  : "text-muted-foreground hover:bg-[var(--surface-muted)] hover:text-foreground",
              )}
            >
              {key === "OPEN" ? "Open" : STATUS_LABELS[key]}
              <span className="tabular ml-1.5 text-[11.5px] opacity-60">{counts[key] ?? 0}</span>
            </button>
          ))}
        </div>

        <Button onClick={() => setCreating(true)}>
          <Plus /> Add an enquiry
        </Button>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]">
          <EmptyState
            icon={Filter}
            title={filter === "OPEN" ? "No open enquiries" : `Nothing ${STATUS_LABELS[filter]?.toLowerCase()}`}
            description="Every walk-in, phone call and Instagram message worth chasing goes here — with a date to ring them back, so nobody is forgotten by Thursday."
            action={
              filter === "OPEN" ? (
                <Button onClick={() => setCreating(true)}>Add the first one</Button>
              ) : null
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((lead) => {
            const due = lead.nextFollowUpAt ? daysUntil(lead.nextFollowUpAt) : null;
            const overdue = due !== null && due < 0;

            return (
              <div
                key={lead.id}
                className={cn(
                  "rounded-xl border bg-[var(--surface)] p-4",
                  overdue ? "border-[var(--warning)]/40" : "border-[var(--border)]",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14.5px] font-medium">{lead.name}</p>
                      <Badge tone={STATUS_TONE[lead.status] ?? "neutral"}>
                        {STATUS_LABELS[lead.status] ?? lead.status}
                      </Badge>
                      <Badge tone="outline">{SOURCE_LABELS[lead.source] ?? lead.source}</Badge>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground">
                      {lead.phone ? (
                        <a
                          href={`tel:${lead.phone.replace(/\s/g, "")}`}
                          className="inline-flex items-center gap-1.5 hover:text-foreground"
                        >
                          <Phone className="size-3.5" /> {lead.phone}
                        </a>
                      ) : null}
                      {lead.interest ? <span>Wants: {lead.interest}</span> : null}
                      <span>Added {formatDateShort(lead.createdAt)}</span>
                    </div>

                    {lead.nextFollowUpAt ? (
                      <p
                        className={cn(
                          "mt-2 text-[12.5px] font-medium",
                          overdue ? "text-[var(--warning)]" : "text-muted-foreground",
                        )}
                      >
                        {overdue
                          ? `Follow-up overdue since ${formatDate(lead.nextFollowUpAt)}`
                          : `Call back ${formatDate(lead.nextFollowUpAt)}`}
                      </p>
                    ) : null}

                    {lead.notes ? (
                      <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
                        {lead.notes}
                      </p>
                    ) : null}

                    {lead.activity.length > 0 ? (
                      <ul className="mt-2.5 space-y-1 border-l-2 border-[var(--border)] pl-3">
                        {lead.activity.slice(0, 3).map((a) => (
                          <li key={a.id} className="text-[12px] text-muted-foreground">
                            <span className="text-[var(--subtle-foreground)]">
                              {formatDateShort(a.createdAt)}
                            </span>{" "}
                            {a.note}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {lead.lostReason ? (
                      <p className="mt-2 text-[12.5px] text-muted-foreground">
                        <span className="text-[var(--subtle-foreground)]">Lost because:</span>{" "}
                        {lead.lostReason}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {lead.phone ? (
                      <Button asChild size="sm" variant="secondary">
                        <a
                          href={`https://wa.me/${lead.phone.replace(/[^\d]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MessageCircle /> WhatsApp
                        </a>
                      </Button>
                    ) : null}
                    <Button size="sm" onClick={() => setLogging(lead)}>
                      Log a call
                    </Button>
                    <Dropdown>
                      <DropdownTrigger asChild>
                        <Button variant="ghost" size="iconSm" aria-label="Enquiry actions">
                          <MoreHorizontal />
                        </Button>
                      </DropdownTrigger>
                      <DropdownContent>
                        <DropdownItem onSelect={() => setEditing(lead)}>Edit details</DropdownItem>
                        <DropdownSeparator />
                        {STATUSES.filter((s) => s !== lead.status).map((s) => (
                          <DropdownItem
                            key={s}
                            onSelect={() =>
                              run(() => setLeadStatusAction(lead.id, s), {
                                onSuccess: () => router.refresh(),
                              })
                            }
                          >
                            {s === "JOINED" ? <Check /> : s === "LOST" ? <X /> : null}
                            Mark {STATUS_LABELS[s].toLowerCase()}
                          </DropdownItem>
                        ))}
                        <DropdownSeparator />
                        <DropdownItem asChild>
                          <Link
                            href={`/gym/clients?new=1&name=${encodeURIComponent(lead.name)}&phone=${encodeURIComponent(lead.phone ?? "")}&email=${encodeURIComponent(lead.email ?? "")}`}
                          >
                            <UserPlus /> Add as member
                          </Link>
                        </DropdownItem>
                        <DropdownItem destructive onSelect={() => setDeleting(lead.id)}>
                          <Trash2 /> Delete
                        </DropdownItem>
                      </DropdownContent>
                    </Dropdown>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <LeadDialog
        key={editing?.id ?? (creating ? "new" : "closed")}
        open={creating || editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
        lead={editing}
      />

      <LogCallDialog
        key={logging?.id ?? "log"}
        open={logging !== null}
        onOpenChange={(open) => !open && setLogging(null)}
        lead={logging}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this enquiry?"
        description="It goes for good, along with the follow-ups logged against it. Mark it lost instead if you want to keep the record."
        confirmLabel="Delete enquiry"
        destructive
        loading={pending}
        onConfirm={() => {
          const id = deleting;
          if (!id) return;
          run(() => deleteLeadAction(id), {
            onSuccess: () => {
              setDeleting(null);
              router.refresh();
            },
          });
        }}
      />
    </>
  );
}

function LeadDialog({
  open,
  onOpenChange,
  lead,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: LeadRow | null;
}) {
  const router = useRouter();
  const { pending, error, fieldErrors, run, reset } = useAction();

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <ModalContent
        title={lead ? "Edit enquiry" : "Add an enquiry"}
        description="Take the name and number now; the rest can wait until you have rung them."
      >
        <form
          action={(fd) =>
            run(() => saveLeadAction(fd), {
              onSuccess: () => {
                onOpenChange(false);
                router.refresh();
              },
            })
          }
        >
          <ModalBody className="space-y-4">
            <FormError message={error} />
            {lead ? <input type="hidden" name="leadId" value={lead.id} /> : null}

            <FormGrid>
              <FormField label="Name" htmlFor="name" required error={fieldErrors.name}>
                <Input id="name" name="name" defaultValue={lead?.name} required />
              </FormField>
              <FormField label="Phone" htmlFor="phone" error={fieldErrors.phone}>
                <PhoneField id="phone" name="phone" defaultValue={lead?.phone ?? ""} />
              </FormField>
              <FormField label="Email" htmlFor="email" error={fieldErrors.email}>
                <Input id="email" name="email" type="email" defaultValue={lead?.email ?? ""} />
              </FormField>
              <FormField label="Where from" htmlFor="source" required>
                <Select id="source" name="source" defaultValue={lead?.source ?? "WALK_IN"}>
                  {Object.entries(SOURCE_LABELS).map(([value, text]) => (
                    <option key={value} value={value}>
                      {text}
                    </option>
                  ))}
                </Select>
              </FormField>
            </FormGrid>

            <FormField label="What they want" htmlFor="interest">
              <Input
                id="interest"
                name="interest"
                defaultValue={lead?.interest ?? ""}
                placeholder="Weight loss · the 6am batch · personal training"
              />
            </FormField>

            <FormField label="Call back on" htmlFor="nextFollowUpAt" hint="Leave blank if there is nothing to chase.">
              <DateField
                id="nextFollowUpAt"
                name="nextFollowUpAt"
                defaultValue={lead?.nextFollowUpAt?.slice(0, 10) ?? ""}
              />
            </FormField>

            <FormField label="Notes" htmlFor="notes">
              <Textarea id="notes" name="notes" rows={3} defaultValue={lead?.notes ?? ""} />
            </FormField>
          </ModalBody>

          <ModalFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {lead ? "Save enquiry" : "Add enquiry"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

function LogCallDialog({
  open,
  onOpenChange,
  lead,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: LeadRow | null;
}) {
  const router = useRouter();
  const { pending, error, run, reset } = useAction();
  const [note, setNote] = useState("");
  const [next, setNext] = useState("");

  if (!lead) return null;

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <ModalContent
        title={`Follow-up with ${lead.name}`}
        description="One line about how it went, and when to try again."
      >
        <ModalBody className="space-y-4">
          <FormError message={error} />
          <FormField label="What happened" htmlFor="note" required>
            <Textarea
              id="note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Rang — coming in Saturday morning to look around."
            />
          </FormField>
          <FormField label="Try again on" htmlFor="next" hint="Blank if there is nothing more to do.">
            <DateField id="next" value={next} onChange={setNext} />
          </FormField>
        </ModalBody>

        <ModalFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            loading={pending}
            disabled={note.trim().length < 2}
            onClick={() =>
              run(() => logLeadActivityAction(lead.id, note, next || undefined), {
                onSuccess: () => {
                  setNote("");
                  setNext("");
                  onOpenChange(false);
                  router.refresh();
                },
              })
            }
          >
            Log it
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
