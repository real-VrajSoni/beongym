"use client";

import { useState } from "react";
import {
  AtSign,
  ExternalLink,
  Globe,
  GripVertical,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Play,
  Plus,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { saveGymLinksAction } from "@/app/actions/links";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError } from "@/components/ui/form-field";
import { Section } from "@/components/ui/section";
import { useAction } from "@/components/ui/use-action";

export type LinkKind =
  | "WEBSITE"
  | "INSTAGRAM"
  | "FACEBOOK"
  | "YOUTUBE"
  | "WHATSAPP"
  | "MAPS"
  | "PHONE"
  | "EMAIL"
  | "OTHER";

export type GymLinkRow = {
  id: string;
  kind: LinkKind;
  label: string | null;
  url: string;
  clickCount: number;
};

const KINDS: { key: LinkKind; name: string; icon: typeof Globe; hint: string }[] = [
  { key: "WEBSITE", name: "Website", icon: Globe, hint: "yourgym.com" },
  { key: "INSTAGRAM", name: "Instagram", icon: AtSign, hint: "@yourgym" },
  { key: "WHATSAPP", name: "WhatsApp", icon: MessageCircle, hint: "+91 98200 10001" },
  { key: "PHONE", name: "Phone", icon: Phone, hint: "+91 22 4890 1200" },
  { key: "EMAIL", name: "Email", icon: Mail, hint: "hello@yourgym.com" },
  { key: "MAPS", name: "Directions", icon: MapPin, hint: "Google Maps link" },
  { key: "FACEBOOK", name: "Facebook", icon: ThumbsUp, hint: "facebook.com/yourgym" },
  { key: "YOUTUBE", name: "YouTube", icon: Play, hint: "youtube.com/@yourgym" },
  { key: "OTHER", name: "Other", icon: ExternalLink, hint: "Any link" },
];

function iconFor(kind: LinkKind) {
  return KINDS.find((k) => k.key === kind)?.icon ?? ExternalLink;
}

type Draft = { kind: LinkKind; label: string; url: string; clicks: number };

/**
 * Where a pin sends people.
 *
 * A gym on the free tier has no store to send anyone to, so these links are
 * where its pin points instead — and the click count beside each one is the
 * only number that tells the owner whether the map is worth anything to them.
 */
export function GymLinksForm({
  links,
  canEdit,
  totalClicks,
  pinViews,
}: {
  links: GymLinkRow[];
  canEdit: boolean;
  totalClicks: number;
  pinViews: number;
}) {
  const { pending, error, run } = useAction();
  const [rows, setRows] = useState<Draft[]>(
    links.map((l) => ({ kind: l.kind, label: l.label ?? "", url: l.url, clicks: l.clickCount })),
  );

  const update = (i: number, patch: Partial<Draft>) =>
    setRows((prev) => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  return (
    <Section
      title="Your links"
      description="Where your pin sends people. Up to eight."
      action={
        <div className="flex items-center gap-4 text-[12px] text-muted-foreground">
          <span>
            <span className="tabular font-semibold text-foreground">
              {pinViews.toLocaleString()}
            </span>{" "}
            pin views
          </span>
          <span>
            <span className="tabular font-semibold text-foreground">
              {totalClicks.toLocaleString()}
            </span>{" "}
            clicks out
          </span>
        </div>
      }
    >
      <form
        action={(fd) => {
          fd.set(
            "links",
            JSON.stringify(
              rows
                .filter((r) => r.url.trim())
                .map((r) => ({ kind: r.kind, label: r.label || undefined, url: r.url })),
            ),
          );
          run(() => saveGymLinksAction(fd));
        }}
      >
        <fieldset disabled={!canEdit} className="space-y-3 px-5 py-5 disabled:opacity-70">
          <FormError message={error} />

          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--border-strong)] px-4 py-6 text-center text-[13px] text-muted-foreground">
              No links yet. Add your website or Instagram so the map can send people to you.
            </p>
          ) : null}

          {rows.map((row, i) => {
            const Icon = iconFor(row.kind);
            const hint = KINDS.find((k) => k.key === row.kind)?.hint;
            return (
              <div
                key={i}
                className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 sm:flex-row sm:items-center"
              >
                <GripVertical className="hidden size-4 shrink-0 text-[var(--subtle-foreground)] sm:block" />

                <div className="relative">
                  <Icon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <select
                    value={row.kind}
                    onChange={(e) => update(i, { kind: e.target.value as LinkKind })}
                    aria-label="Link type"
                    className="h-9 w-full appearance-none rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] pr-3 pl-8 text-[13px] sm:w-[136px]"
                  >
                    {KINDS.map((k) => (
                      <option key={k.key} value={k.key}>
                        {k.name}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  value={row.url}
                  onChange={(e) => update(i, { url: e.target.value })}
                  placeholder={hint}
                  aria-label="Link"
                  className="h-9 flex-1"
                />
                <Input
                  value={row.label}
                  onChange={(e) => update(i, { label: e.target.value })}
                  placeholder="Button text (optional)"
                  aria-label="Button text"
                  className="h-9 sm:w-[170px]"
                />

                <span className="tabular w-16 shrink-0 text-right text-[12px] text-muted-foreground">
                  {row.clicks.toLocaleString()} {row.clicks === 1 ? "click" : "clicks"}
                </span>

                <Button
                  type="button"
                  variant="ghost"
                  size="iconSm"
                  aria-label="Remove link"
                  onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <Trash2 />
                </Button>
              </div>
            );
          })}

          {rows.length < 8 ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setRows((prev) => [...prev, { kind: "WEBSITE", label: "", url: "", clicks: 0 }])
              }
            >
              <Plus /> Add a link
            </Button>
          ) : null}
        </fieldset>

        {canEdit ? (
          <div className="flex justify-end border-t border-[var(--border)] px-5 py-3.5">
            <Button type="submit" loading={pending}>
              Save links
            </Button>
          </div>
        ) : null}
      </form>
    </Section>
  );
}
