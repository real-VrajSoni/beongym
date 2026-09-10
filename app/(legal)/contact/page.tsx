import Link from "next/link";
import { Mail } from "lucide-react";
import { BRAND, SELLER } from "@/lib/brand";
import { Clause, LegalTitle } from "@/components/legal/legal-title";

export const metadata = {
  title: "Contact",
  description: `How to reach ${BRAND.name}.`,
};

export default function ContactPage() {
  return (
    <>
      <LegalTitle
        title="Contact"
        intro="One address, read by a person. There is no ticket queue and no bot in front of it."
      />

      <a
        href={`mailto:${SELLER.email}`}
        className="mt-8 flex items-center gap-3 rounded-2xl border border-[var(--mk-border-strong)] bg-[var(--mk-panel)] px-5 py-4 hover:border-[var(--brand)]/50"
      >
        <Mail className="size-5 text-[var(--brand)]" />
        <div>
          <p className="text-[15px] font-medium text-[var(--mk-fg)]">{SELLER.email}</p>
          <p className="mt-0.5 text-[12.5px] text-[var(--mk-fg-subtle)]">
            Support, billing, privacy requests and legal notices
          </p>
        </div>
      </a>

      <Clause n={1} title="What to expect">
        <p>
          We reply within <strong>3 business days</strong>, usually sooner. Refund requests get an
          answer in the same window — see the{" "}
          <Link className="underline" href="/refunds">
            Refund and Cancellation Policy
          </Link>
          . Requests about personal data are answered within 30 days, per the{" "}
          <Link className="underline" href="/privacy">
            Privacy Policy
          </Link>
          .
        </p>
      </Clause>

      <Clause n={2} title="What to include">
        <p>
          The email address on the account and your gym code — the short code in the sidebar, like{" "}
          <code className="rounded bg-[var(--mk-panel-strong)] px-1.5 py-0.5 text-[13px]">
            IRON-4821
          </code>
          . With those two we can find the account immediately instead of asking you for them and
          losing a day.
        </p>
        <p>
          For anything that looks like a bug: what you did, what you expected, and what happened
          instead. A screenshot beats a description.
        </p>
      </Clause>

      <Clause n={3} title="If you are a gym member">
        <p>
          <strong>Ask your gym, not us.</strong> Your membership, your dues and your record belong
          to the gym you train at — we hold them on their behalf and cannot change or release them
          without their say-so. For a password, ask at the desk: staff can set you a new one.
        </p>
      </Clause>

      <Clause n={4} title="Who you are writing to">
        <p>
          {BRAND.name} is operated by <strong>{SELLER.entity}</strong>, {SELLER.describedAs}, based
          in {SELLER.country}. Our{" "}
          <Link className="underline" href="/terms">
            Terms of Service
          </Link>{" "}
          are governed by the laws of {SELLER.jurisdiction}.
        </p>
        <p>A postal address for formal notices is available on request to the address above.</p>
      </Clause>
    </>
  );
}
