import Link from "next/link";
import { BRAND, SELLER } from "@/lib/brand";
import { Clause, LegalTitle } from "@/components/legal/legal-title";

export const metadata = {
  title: "Refund and Cancellation Policy",
  description: `How to cancel ${BRAND.name}, and how refunds are handled.`,
};

export default function RefundsPage() {
  return (
    <>
      <LegalTitle
        title="Refund and Cancellation Policy"
        intro="How to cancel, what happens when you do, and how we handle a refund request. Written to be acted on rather than to be defended."
      />

      <Clause n={1} title="What you are buying">
        <p>
          A prepaid period of access to {BRAND.name} — a month or a year, at the price shown on the{" "}
          <Link className="underline" href="/#pricing">
            pricing page
          </Link>{" "}
          when you buy it. There is no free tier and no trial that converts into a charge.
        </p>
      </Clause>

      <Clause n={2} title="Cancelling">
        <p>
          <strong>There is nothing to cancel to avoid a charge.</strong> Access does not renew
          automatically: when the period you paid for ends, the workspace locks and nothing further
          is taken. You extend it by choosing to buy again.
        </p>
        <p>
          If you simply want to stop, stop. You keep full access until the period you paid for runs
          out. If you would rather we closed the account outright, email{" "}
          <a className="underline" href={`mailto:${SELLER.email}`}>
            {SELLER.email}
          </a>
          .
        </p>
        <p>
          Your data is not deleted when a period ends. A locked workspace keeps everything, and
          buying again reopens it exactly as it was.
        </p>
      </Clause>

      <Clause n={3} title="Refunds">
        <p>
          We consider refund requests <strong>case by case</strong>. We would rather look at what
          actually happened than apply a rule that is wrong half the time.
        </p>
        <p>
          Email{" "}
          <a className="underline" href={`mailto:${SELLER.email}`}>
            {SELLER.email}
          </a>{" "}
          with the email on the account, your gym code, and what went wrong.{" "}
          <strong>We will reply within 3 business days</strong> and either refund you or explain why
          not. Where we agree to refund, we ask our payment provider to return it to the original
          payment method; how quickly it appears is then your bank&rsquo;s business, and is usually
          5&ndash;10 business days.
        </p>
        <p>Refunds we expect to agree to:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>You were charged twice for the same period, or charged after asking us to stop.</li>
          <li>
            The service was unusable for a meaningful stretch of what you paid for and we could not
            fix it.
          </li>
          <li>You bought the wrong plan and tell us promptly, before real use.</li>
          <li>We closed your account for a reason that was not your fault.</li>
        </ul>
        <p>Refunds we are unlikely to agree to:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>A period that has been used and has nearly or fully run out.</li>
          <li>
            A change of mind well into a term, where the service worked as described the whole time.
          </li>
          <li>An account closed for breaking the terms.</li>
        </ul>
        <p>
          Neither list is exhaustive and neither binds us against you: tell us what happened, and if
          your situation is not on either list we will still look at it properly.
        </p>
      </Clause>

      <Clause n={4} title="If you disagree with us">
        <p>
          Say so, and a person will look at it again. We would much rather settle it directly than
          have you raise a chargeback with your bank — a chargeback is slower for you, costs us a
          fee whatever the outcome, and usually gets decided by someone with less of the story than
          either of us.
        </p>
        <p>
          Your statutory rights under the law of {SELLER.jurisdiction} are unaffected by anything on
          this page.
        </p>
      </Clause>

      <Clause n={5} title="Payments your gym takes from its members">
        <p>
          This policy covers what you pay <em>us</em>. It has nothing to do with money your gym
          collects from its own members: {BRAND.name} records those payments, it does not process
          them. Refunding a member is between you and them, on whatever terms you have set.
        </p>
      </Clause>
    </>
  );
}
