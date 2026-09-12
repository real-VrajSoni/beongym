import Link from "next/link";
import { ArrowLeft, Printer, QrCode } from "lucide-react";
import { requirePaidStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { renderCheckInQr } from "@/lib/data/checkin-qr";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { PrintButton, ResetCodeButton } from "@/components/attendance/qr-actions";

export const metadata = { title: "Check-in code" };

/**
 * The poster.
 *
 * A page rather than a pop-up: it can be printed, bookmarked on the tablet by
 * the door, and left open all day. Everything on it is server-rendered, so the
 * code is on screen whether or not any JavaScript ran — which matters for a
 * screen whose whole job is to be looked at.
 */
export default async function CheckInQrPage() {
  const session = await requirePaidStaff();
  const [qr, gym] = await Promise.all([
    renderCheckInQr(session.gymId),
    db.gym.findUniqueOrThrow({
      where: { id: session.gymId },
      select: { name: true, city: true },
    }),
  ]);

  const isOwner = session.role === "GYM_OWNER";

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title="Check-in code"
          description="One code, yours for good. Print it, stick it by the door, and members scan it on the way in and out."
          actions={
            <>
              <Link
                href="/gym/attendance"
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[var(--border-strong)] px-3.5 text-[13.5px] font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-4" /> Attendance
              </Link>
              <PrintButton />
            </>
          }
        />
      </div>

      {/* The poster itself. `print:` rules strip the chrome so a plain sheet of
          paper comes out with the gym's name and the code on it. */}
      <div className="mx-auto max-w-xl">
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-8 text-center shadow-[var(--shadow-card)] print:border-0 print:shadow-none">
          <p className="text-[13px] font-semibold tracking-[0.16em] text-neutral-500 uppercase">
            {gym.name}
            {gym.city ? ` · ${gym.city}` : ""}
          </p>
          <h2 className="mt-2 text-[28px] leading-tight font-semibold tracking-[-0.02em] text-neutral-900">
            Scan to check in
          </h2>

          <div
            className="mx-auto mt-6 w-[300px] max-w-full [&>svg]:h-auto [&>svg]:w-full"
            // Generated on our own server, from our own URL.
            dangerouslySetInnerHTML={{ __html: qr.svg }}
          />

          <p className="mx-auto mt-6 max-w-sm text-[13.5px] leading-relaxed text-neutral-600">
            Open the BeOnGym app, point your camera at this, and you&rsquo;re in. Scan it again on
            your way out to close the visit.
          </p>
          <p className="mt-4 font-mono text-[12px] text-neutral-400">{qr.gymCode}</p>
        </div>
      </div>

      <div className="mx-auto mt-5 max-w-xl print:hidden">
        <Section title="How this works" bodyClassName="px-5 py-4">
          <ul className="space-y-2.5 text-[13px] leading-relaxed text-muted-foreground">
            <li className="flex items-start gap-2.5">
              <QrCode className="mt-0.5 size-3.5 shrink-0 text-[var(--brand)]" />
              This is <span className="text-foreground">your gym&rsquo;s only code</span>, and it
              does not expire. Print it once.
            </li>
            <li className="flex items-start gap-2.5">
              <Printer className="mt-0.5 size-3.5 shrink-0 text-[var(--brand)]" />
              Scanning it signs a member in, or out if they are already inside. Their visit lands
              on your attendance board straight away.
            </li>
            <li className="flex items-start gap-2.5">
              <QrCode className="mt-0.5 size-3.5 shrink-0 text-[var(--brand)]" />
              Only your own members can use it — somebody from another gym scanning it is told so
              and nothing is recorded.
            </li>
          </ul>

          {isOwner ? (
            <div className="mt-4 border-t border-[var(--border)] pt-4">
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                If a poster goes missing or the link gets shared around, issue a new code. Every
                printed copy of the old one stops working immediately.
              </p>
              <ResetCodeButton />
            </div>
          ) : null}
        </Section>
      </div>
    </>
  );
}
