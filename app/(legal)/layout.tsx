import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { BRAND, SELLER } from "@/lib/brand";

/**
 * The wrapper for the policy pages.
 *
 * Deliberately plain. These exist to be read by two audiences — a gym owner
 * deciding whether to trust us with their members' details, and a payment
 * provider checking that what the site says matches what was filed — and both
 * are served by prose that is easy to scan, not by design.
 *
 * A route group, so the URLs stay at the root: /terms, not /legal/terms. They
 * get quoted in emails and typed by hand.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--mk-bg)] text-[var(--mk-fg)]">
      <header className="border-b border-[var(--mk-border)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark className="size-6" />
            <span className="text-[15px] font-semibold tracking-[-0.01em]">{BRAND.name}</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] text-[var(--mk-fg-subtle)] hover:text-[var(--mk-fg)]"
          >
            <ArrowLeft className="size-3.5" /> Back to site
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 pb-20">{children}</main>

      <footer className="border-t border-[var(--mk-border)]">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-[12.5px] text-[var(--mk-fg-subtle)]">
          <p>
            {BRAND.name} is operated by {SELLER.entity}, {SELLER.describedAs}, in {SELLER.country}.
          </p>
          <div className="flex flex-wrap gap-5">
            <Link href="/terms" className="hover:text-[var(--mk-fg-muted)]">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-[var(--mk-fg-muted)]">
              Privacy
            </Link>
            <Link href="/refunds" className="hover:text-[var(--mk-fg-muted)]">
              Refunds
            </Link>
            <Link href="/contact" className="hover:text-[var(--mk-fg-muted)]">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
