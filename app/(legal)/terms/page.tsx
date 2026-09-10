import Link from "next/link";
import { BRAND, SELLER } from "@/lib/brand";
import { Clause, LegalTitle } from "@/components/legal/legal-title";

export const metadata = {
  title: "Terms of Service",
  description: `The agreement between you and ${SELLER.entity} for the use of ${BRAND.name}.`,
};

export default function TermsPage() {
  return (
    <>
      <LegalTitle
        title="Terms of Service"
        intro={`These terms are the agreement between you and ${SELLER.entity} for your use of ${BRAND.name}. Using the service means you accept them.`}
      />

      <Clause n={1} title="Who you are contracting with">
        <p>
          {BRAND.name} is operated by <strong>{SELLER.entity}</strong>, {SELLER.describedAs}, based
          in {SELLER.country}. There is no separate company: the contract is with that person. We
          say so plainly because you are entitled to know who is on the other side of it.
        </p>
        <p>
          Everything below calls that party &ldquo;we&rdquo; or &ldquo;us&rdquo;, and the gym or
          person holding the account &ldquo;you&rdquo;.
        </p>
      </Clause>

      <Clause n={2} title="What the service is">
        <p>
          {BRAND.name} is software for running a gym: members, membership plans, payments your gym
          records, attendance, enquiries, classes and renewal reminders, plus a public listing on
          our directory and a member-facing app.
        </p>
        <p>
          It is a record-keeping tool. It does not collect money from your members on your behalf,
          it does not send messages on your behalf, and it is not a substitute for your own
          accounting or legal obligations.
        </p>
      </Clause>

      <Clause n={3} title="Your account">
        <p>
          You must give accurate details and keep your sign-in credentials to yourself. You are
          responsible for everything done under your account, including by staff you invite. Tell us
          promptly at{" "}
          <a className="underline" href={`mailto:${SELLER.email}`}>
            {SELLER.email}
          </a>{" "}
          if you believe an account has been used without permission.
        </p>
        <p>
          You must be old enough to enter a contract where you live, and you must have the authority
          to accept these terms for the gym you are signing up.
        </p>
      </Clause>

      <Clause n={4} title="Plans, payment and access">
        <p>
          Access is sold as a prepaid period — a month or a year — at the prices shown on our{" "}
          <Link className="underline" href="/#pricing">
            pricing page
          </Link>
          . Prices are in US dollars and are exclusive of any tax, which is calculated and collected
          by our payment provider based on where you are.
        </p>
        <p>
          <strong>Your access does not renew automatically.</strong> When a period ends, the
          workspace locks until you buy another one; your data is not deleted and nothing is charged
          without you buying again. Renewing early adds to the time you already have rather than
          replacing it.
        </p>
        <p>
          Payments are handled by our payment provider as merchant of record. Your card details go
          to them, never to us. Cancellation and refunds are covered in our{" "}
          <Link className="underline" href="/refunds">
            Refund and Cancellation Policy
          </Link>
          .
        </p>
      </Clause>

      <Clause n={5} title="Your data, and your members' data">
        <p>
          The gym records you put into {BRAND.name} are yours. We do not sell them, we do not use
          them to advertise to you or your members, and we do not share them with anyone except the
          providers listed in our{" "}
          <Link className="underline" href="/privacy">
            Privacy Policy
          </Link>
          .
        </p>
        <p>
          Where you enter details about your members, <strong>you decide</strong> what is collected
          and why, and we process it on your instructions. That makes you responsible for having a
          lawful basis to hold it, for telling your members what you hold, and for honouring their
          requests about it. We will help you meet such a request; we will not answer it for you.
        </p>
      </Clause>

      <Clause n={6} title="What you must not do">
        <p>
          Do not use {BRAND.name} to store data you have no right to hold, to contact people who
          have asked you not to, to break the law where you or your members are, or to attack,
          overload or probe the service. Do not attempt to reach another gym&rsquo;s data — every
          route is scoped to the gym that owns it, and attempts are logged.
        </p>
        <p>
          Do not resell or white-label the service without our written agreement, and do not
          represent yourself as us.
        </p>
      </Clause>

      <Clause n={7} title="Availability">
        <p>
          We work to keep the service up and we do not promise it always will be. There is no uptime
          guarantee attached to these plans. We may take it down for maintenance, and will avoid
          peak hours where we reasonably can.
        </p>
        <p>
          Features change. We may add, alter or withdraw parts of the product. If we withdraw
          something you depend on, we will say so before it happens rather than after.
        </p>
      </Clause>

      <Clause n={8} title="Suspension and ending the agreement">
        <p>
          You can stop using {BRAND.name} whenever you like. You keep access for the remainder of
          any period you have paid for.
        </p>
        <p>
          We may suspend or close an account that breaks these terms, that is being used to harm
          other people, or where we are required to by law. Except where the law forces our hand or
          the breach is serious, we will tell you first and give you a chance to put it right.
        </p>
        <p>
          If we close your account for a reason that is not your fault, we will refund the unused
          part of what you paid. You may export or request your data for 30 days afterwards.
        </p>
      </Clause>

      <Clause n={9} title="Liability">
        <p>
          {BRAND.name} is provided as it is. To the extent the law allows, we are not liable for
          lost profits, lost business, or loss or corruption of data beyond our control, and our
          total liability to you for any claim is limited to what you paid us in the twelve months
          before it arose.
        </p>
        <p>
          Nothing here limits liability for fraud, for death or personal injury caused by
          negligence, or for anything else that cannot lawfully be limited.
        </p>
      </Clause>

      <Clause n={10} title="Changes to these terms">
        <p>
          We may update these terms. If a change materially affects you, we will give notice in the
          app or by email before it takes effect, and the date at the top of this page will change.
          Continuing to use the service after that means you accept the new version.
        </p>
      </Clause>

      <Clause n={11} title="Governing law">
        <p>
          These terms are governed by the laws of {SELLER.jurisdiction}, and the courts of{" "}
          {SELLER.jurisdiction} have exclusive jurisdiction over any dispute arising from them.
        </p>
      </Clause>

      <Clause n={12} title="Reaching us">
        <p>
          Everything — questions, complaints, legal notices — goes to{" "}
          <a className="underline" href={`mailto:${SELLER.email}`}>
            {SELLER.email}
          </a>
          . See our{" "}
          <Link className="underline" href="/contact">
            contact page
          </Link>
          .
        </p>
      </Clause>
    </>
  );
}
