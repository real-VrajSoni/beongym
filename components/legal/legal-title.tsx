import { SELLER } from "@/lib/brand";

/**
 * The heading block every policy page opens with.
 *
 * Its own component rather than an export from the layout, because a Next
 * layout file may only export the layout and its metadata — and because four
 * pages inventing four heading sizes is how a set of policies stops looking
 * like one document.
 */
export function LegalTitle({ title, intro }: { title: string; intro: string }) {
  return (
    <>
      <h1 className="text-[34px] leading-[1.1] font-semibold tracking-[-0.02em]">{title}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[var(--mk-fg-muted)]">{intro}</p>
      <p className="mt-4 text-[12.5px] text-[var(--mk-fg-subtle)]">
        In effect from {SELLER.effective}.
      </p>
    </>
  );
}

/** A numbered section. */
export function Clause({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-9">
      <h2 className="text-[17px] font-semibold tracking-[-0.01em]">
        <span className="mr-2 text-[var(--mk-fg-subtle)]">{n}.</span>
        {title}
      </h2>
      <div className="mt-2.5 space-y-3 text-[14.5px] leading-relaxed text-[var(--mk-fg-muted)]">
        {children}
      </div>
    </section>
  );
}
