"use client";

import {
  AtSign,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Play,
  ThumbsUp,
} from "lucide-react";
import { recordLinkClickAction } from "@/app/actions/links";
import { cn } from "@/lib/utils";

export type PublicLink = {
  id: string;
  kind: string;
  label: string | null;
  url: string;
};

const META: Record<string, { name: string; icon: typeof Globe }> = {
  WEBSITE: { name: "Website", icon: Globe },
  INSTAGRAM: { name: "Instagram", icon: AtSign },
  FACEBOOK: { name: "Facebook", icon: ThumbsUp },
  YOUTUBE: { name: "YouTube", icon: Play },
  WHATSAPP: { name: "WhatsApp", icon: MessageCircle },
  MAPS: { name: "Directions", icon: MapPin },
  PHONE: { name: "Call", icon: Phone },
  EMAIL: { name: "Email", icon: Mail },
  OTHER: { name: "Open", icon: ExternalLink },
};

/**
 * The links on a free gym's pin.
 *
 * The click is recorded on the way out and never in the visitor's way: the
 * anchor navigates whatever the counter does, because the gym would rather
 * lose a statistic than a walk-in.
 */
export function GymLinks({
  links,
  className,
  size = "md",
}: {
  links: PublicLink[];
  className?: string;
  size?: "sm" | "md";
}) {
  if (links.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {links.map((link, i) => {
        const meta = META[link.kind] ?? META.OTHER;
        const Icon = meta.icon;
        const primary = i === 0;
        return (
          <a
            key={link.id}
            href={link.url}
            target={link.url.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer nofollow"
            onClick={() => {
              void recordLinkClickAction(link.id);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg font-medium transition-colors",
              size === "sm" ? "px-2.5 py-1.5 text-[12px]" : "px-3.5 py-2.5 text-[13.5px]",
              primary
                ? "bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand-hover)]"
                : "border border-[var(--mk-border-strong)] bg-[var(--mk-panel)] text-[var(--mk-fg-muted)] hover:text-[var(--mk-fg)]",
            )}
          >
            <Icon className={size === "sm" ? "size-3" : "size-3.5"} />
            {link.label || meta.name}
          </a>
        );
      })}
    </div>
  );
}
