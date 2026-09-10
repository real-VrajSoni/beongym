import Link from "next/link";
import { BRAND, SELLER, SUBPROCESSORS } from "@/lib/brand";
import { Clause, LegalTitle } from "@/components/legal/legal-title";

export const metadata = {
  title: "Privacy Policy",
  description: `What ${BRAND.name} collects, why, and who else sees it.`,
};

export default function PrivacyPage() {
  return (
    <>
      <LegalTitle
        title="Privacy Policy"
        intro="What we collect, why we collect it, and who else sees it. A gym owner handing us their members' details is entitled to a straight answer to all three."
      />

      <Clause n={1} title="Who is responsible for what">
        <p>
          There are two kinds of data here and they are not governed the same way, so it is worth
          separating them at the top.
        </p>
        <p>
          <strong>Your account.</strong> Your name, email, phone and gym details, and what you do in
          the app. We decide what is collected and why — we are the controller, and this policy
          covers it.
        </p>
        <p>
          <strong>Your members&rsquo; records.</strong> Their names, contact details, memberships,
          payments and attendance. <em>You</em> decide what to collect and why; we hold it on your
          instructions and do nothing else with it. You are the controller, we are the processor.
          Your own privacy notice is what governs it, not this one.
        </p>
      </Clause>

      <Clause n={2} title="What we collect">
        <p>
          <strong>From gym owners and staff:</strong> name, email address, phone number, a hashed
          password, the gym&rsquo;s name, city, contact details and branding, and the plan you
          bought. We record when you last signed in.
        </p>
        <p>
          <strong>From members, entered by their gym:</strong> name, member code, and optionally
          email, phone, date of birth and gender. Attendance is recorded when they scan the
          gym&rsquo;s code or the desk checks them in. Memberships, prices and payments the gym
          records are stored against them.
        </p>
        <p>
          <strong>Automatically:</strong> the ordinary technical data any web service sees — request
          logs and error reports produced by our host. We do not run advertising trackers, we do not
          use third-party analytics, and we do not build profiles for marketing.
        </p>
        <p>
          <strong>We never see card details.</strong> Payment is handled by our provider as merchant
          of record; card numbers go to them and never touch our servers or our database.
        </p>
      </Clause>

      <Clause n={3} title="Why we hold it">
        <p>
          To run the product you are paying for: to sign you in, to show a gym its own members, to
          record attendance and money, to work out who is due to renew, and to put a listed gym on
          the public directory. To take payment and keep a record of it, which we are also required
          to do for tax. To reply when you contact support. To keep the service secure and to
          investigate misuse.
        </p>
        <p>
          Our basis is the contract between us for your account, our legitimate interest in keeping
          the service working and secure, and legal obligation for financial records. For member
          records, your gym&rsquo;s basis applies, not ours.
        </p>
      </Clause>

      <Clause n={4} title="What is public, and what is not">
        <p>
          A listed gym&rsquo;s profile is deliberately public: its name, city, coordinates, opening
          hours, the links it chose to publish and — only where the gym has switched it on — its
          prices. That is the point of the directory.
        </p>
        <p>
          <strong>No member is ever public.</strong> No member name, contact detail, attendance
          record or payment appears on the directory, on a gym&rsquo;s public page, or anywhere
          reachable without signing in.
        </p>
      </Clause>

      <Clause n={5} title="Who else sees it">
        <p>
          Only the providers we need to run the service. Each is named here rather than hidden
          behind &ldquo;service providers&rdquo;, because a list you cannot read is not disclosure.
        </p>
        <ul className="mt-1 space-y-3">
          {SUBPROCESSORS.map((s) => (
            <li key={s.name} className="rounded-xl border border-[var(--mk-border)] p-4">
              <p className="text-[14px] font-medium text-[var(--mk-fg)]">{s.name}</p>
              <p className="mt-1 text-[13.5px] leading-relaxed">{s.purpose}</p>
              <p className="mt-1.5 text-[12.5px] text-[var(--mk-fg-subtle)]">{s.where}</p>
            </li>
          ))}
        </ul>
        <p>
          We do not sell personal data, and we do not share it for anyone else&rsquo;s marketing. We
          would disclose data if the law required it, and would tell you unless forbidden from doing
          so.
        </p>
        <p>
          These providers are outside {SELLER.country}, so running the service involves transferring
          data internationally. We rely on each provider&rsquo;s own safeguards for that.
        </p>
      </Clause>

      <Clause n={6} title="How long we keep it">
        <p>
          Account and gym data lasts as long as the account does. Close it and we delete or
          anonymise within 90 days, except records of payments, which tax rules require us to keep
          for longer.
        </p>
        <p>
          Member records last as long as the gym keeps them. A gym owner can delete a member at any
          time, and deleting a gym removes its members with it.
        </p>
      </Clause>

      <Clause n={7} title="How it is protected">
        <p>
          Passwords are stored hashed with bcrypt and are never recoverable in plain text — not by
          us either. Sessions ride in a signed, http-only cookie. Every query for gym data is scoped
          to the gym that owns it on the server, and that boundary is covered by an automated test
          suite that runs before anything ships. Traffic is encrypted in transit.
        </p>
        <p>
          No system is perfectly safe. If a breach affects your data we will tell you and the
          relevant authority within the time the law requires, and we will tell you what actually
          happened rather than the least alarming version of it.
        </p>
      </Clause>

      <Clause n={8} title="Your rights">
        <p>
          You can ask for a copy of the personal data we hold about you, ask us to correct it, ask
          us to delete it, or object to a particular use. Write to{" "}
          <a className="underline" href={`mailto:${SELLER.email}`}>
            {SELLER.email}
          </a>{" "}
          and we will respond within 30 days.
        </p>
        <p>
          <strong>If you are a gym member, ask your gym first.</strong> They hold your record and
          they control it; we cannot hand over or delete it without their instruction. Tell us and
          we will point you to them and help them act.
        </p>
      </Clause>

      <Clause n={9} title="Children">
        <p>
          {BRAND.name} is sold to gyms, not to individuals, and we do not knowingly collect data
          directly from children. A gym may have members under 18, and it is the gym&rsquo;s
          responsibility to have the consent that requires where they operate.
        </p>
      </Clause>

      <Clause n={10} title="Changes, and reaching us">
        <p>
          If this policy changes in substance we will update the date at the top and, where the
          change matters, tell you in the app or by email. Questions go to{" "}
          <a className="underline" href={`mailto:${SELLER.email}`}>
            {SELLER.email}
          </a>
          , or see the{" "}
          <Link className="underline" href="/contact">
            contact page
          </Link>
          .
        </p>
      </Clause>
    </>
  );
}
