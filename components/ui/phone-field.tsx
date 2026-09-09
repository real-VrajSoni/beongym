"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import {
  DEFAULT_DIAL,
  DIAL_CODES,
  flagFor,
  searchDialCodes,
  splitPhone,
} from "@/lib/geo/dial-codes";
import { cn } from "@/lib/utils";

/**
 * A phone number with the country in front of it.
 *
 * Typing a raw number into a box is fine until the gym is in Dubai and the
 * WhatsApp reminder never arrives because nobody wrote +971. So the code is a
 * separate, searchable control — type "india" and take +91 — and what gets
 * posted is one field, the two joined, exactly as it should be dialled.
 *
 * The list opens inline rather than in a portal so it behaves inside a dialog,
 * and it is searchable because nobody scrolls to Türkiye.
 */
export function PhoneField({
  name,
  id,
  defaultValue = "",
  required = false,
  placeholder = "98200 10001",
  className,
}: {
  name: string;
  id?: string;
  /** A stored number, with or without its country code. */
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const initial = splitPhone(defaultValue);
  const [dial, setDial] = useState(initial.dial || DEFAULT_DIAL);
  const [number, setNumber] = useState(initial.number);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const country = DIAL_CODES.find((c) => c.dial === dial) ?? DIAL_CODES[0];
  const results = searchDialCodes(query);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  // One field goes to the server: the number as it should be dialled.
  const combined = number.trim() ? `${dial} ${number.trim().replace(/^0+/, "")}` : "";

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <input type="hidden" name={name} value={combined} />

      <div className="flex">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={`Country code, currently ${country.name} ${dial}`}
          className="inline-flex h-9.5 shrink-0 items-center gap-1.5 rounded-l-lg border border-r-0 border-[var(--border-strong)] bg-[var(--surface-muted)] px-2.5 text-sm hover:bg-[var(--surface-hover)]"
        >
          <span aria-hidden className="text-[15px] leading-none">
            {flagFor(country.iso)}
          </span>
          <span className="tabular text-[13px] font-medium">{dial}</span>
          <ChevronDown className="size-3.5 text-[var(--subtle-foreground)]" />
        </button>

        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={placeholder}
          required={required}
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          className="h-9.5 w-full rounded-r-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-foreground shadow-[var(--shadow-card)] transition-colors placeholder:text-[var(--subtle-foreground)] focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-ring)] focus:outline-none"
        />
      </div>

      {open ? (
        <div className="absolute z-50 mt-1.5 w-[280px] overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-[var(--shadow-popover,0_16px_40px_-12px_rgba(0,0,0,0.35))]">
          <div className="relative border-b border-[var(--border)]">
            <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[var(--subtle-foreground)]" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search — try india"
              aria-label="Search countries"
              className="w-full bg-transparent py-2.5 pr-3 pl-9 text-[13px] outline-none placeholder:text-[var(--subtle-foreground)]"
            />
          </div>

          <ul className="max-h-64 overflow-y-auto py-1">
            {results.length === 0 ? (
              <li className="px-3 py-3 text-[12.5px] text-muted-foreground">
                No country matches “{query}”.
              </li>
            ) : (
              results.map((c) => (
                <li key={c.iso}>
                  <button
                    type="button"
                    onClick={() => {
                      setDial(c.dial);
                      setQuery("");
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] hover:bg-[var(--surface-muted)]",
                      c.dial === dial && "bg-[var(--brand-soft)]",
                    )}
                  >
                    <span aria-hidden className="text-[15px] leading-none">
                      {flagFor(c.iso)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    <span className="tabular shrink-0 text-[12.5px] text-muted-foreground">
                      {c.dial}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
