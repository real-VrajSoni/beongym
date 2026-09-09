"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type FaqItem = { q: string; a: React.ReactNode };

/**
 * Accordion where opening one answer closes the last. Controlled rather than
 * native <details>, so the exclusive behaviour is guaranteed everywhere and
 * the panel can animate its height.
 */
export function Faq({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mt-8 divide-y divide-[var(--mk-border)] border-y border-[var(--mk-border)]">
      {items.map((item, i) => {
        const open = openIndex === i;
        return (
          <div key={item.q}>
            <h3>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`faq-panel-${i}`}
                id={`faq-trigger-${i}`}
                onClick={() => setOpenIndex(open ? null : i)}
                className="flex w-full cursor-pointer items-center justify-between gap-4 py-5 text-left text-[15.5px] font-bold transition-colors hover:text-[var(--brand)]"
              >
                {item.q}
                <Plus
                  aria-hidden
                  className={cn(
                    "size-4 shrink-0 text-[var(--mk-fg-subtle)] transition-transform duration-200",
                    open && "rotate-45",
                  )}
                />
              </button>
            </h3>
            <div
              id={`faq-panel-${i}`}
              role="region"
              aria-labelledby={`faq-trigger-${i}`}
              hidden={!open}
              className="pb-5"
            >
              <div className="max-w-2xl space-y-3 text-[14px] leading-relaxed text-[var(--mk-fg-muted)]">
                {item.a}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
