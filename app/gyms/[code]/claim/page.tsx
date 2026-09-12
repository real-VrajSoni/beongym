import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Check, MapPin } from "lucide-react";
import { getPublicGym } from "@/lib/data/directory";
import { getValidSession } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { CLAIM_PRICE_USD } from "@/lib/platform-plans";
import { Logo } from "@/components/brand/logo";
import { ThemeSwitch } from "@/components/brand/theme-switch";
import { ClaimForm } from "@/components/directory/claim-form";

const INCLUDED = [
  "Your gym store on the map — logo, photos, programmes, hours",
  "Your phone, email and links on it, so members reach you direct",
  "Members, attendance, plans and payments in your own workspace",
  "About three minutes to set up once it's yours",
];

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return { title: `Claim ${code.toUpperCase()} — ${BRAND.name}` };
}

export default async function ClaimGymPage({ params }: { params: Promise<{ code: string }> }) {
  const [{ code }, session] = await Promise.all([params, getValidSession()]);

  const gym = await getPublicGym(code);
  if (!gym) notFound();

  return (
    <div className="min-h-dvh bg-[var(--mk-bg)] text-[var(--mk-fg)]">
      <header className="border-b border-[var(--mk-border)]">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeSwitch />
            <Link
              href={`/gyms/${gym.code}`}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13.5px] font-medium text-[var(--mk-fg-muted)] hover:bg-[var(--mk-panel-strong)] hover:text-[var(--mk-fg)]"
            >
              <ArrowLeft className="size-3.5" /> Back to the listing
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-8 px-6 py-14 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="flex items-start gap-4">
            {gym.imageUrl ? (
              // Data URL already sized to 320px — next/image would add nothing.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={gym.imageUrl} alt="" className="size-16 rounded-2xl object-cover" />
            ) : (
              <span
                className="flex size-16 shrink-0 items-center justify-center rounded-2xl text-[20px] font-bold text-white"
                style={{ background: gym.accentColor }}
              >
                {gym.logoText ?? gym.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 pt-1">
              <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.02em]">
                {gym.name}
              </h1>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--mk-fg-subtle)]">
                {gym.city ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" /> {gym.city}
                  </span>
                ) : null}
                <span className="font-mono">{gym.code}</span>
              </p>
            </div>
          </div>

          <p className="mt-6 max-w-xl text-[14.5px] leading-relaxed text-[var(--mk-fg-muted)]">
            This listing was compiled from public information so members could find the gym today.
            Nobody has taken it over yet. Claiming it hands you the listing and opens your gym
            store on Pro — ${CLAIM_PRICE_USD} a month, cancel whenever you like.
          </p>

          <ul className="mt-7 space-y-2.5">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[13.5px]">
                <Check className="mt-0.5 size-4 shrink-0 text-[var(--brand)]" />
                <span className="text-[var(--mk-fg-muted)]">{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-2xl border border-[var(--mk-border)] bg-[var(--mk-panel)] p-5">
            <p className="text-[13px] leading-relaxed text-[var(--mk-fg-muted)]">
              <span className="font-medium text-[var(--mk-fg)]">We verify every claim.</span> A
              listing is somebody&rsquo;s business, so we call the number you give us before the
              profile changes hands. If we can&rsquo;t reach you, we refund it.
            </p>
          </div>
        </div>

        <aside>
          <div className="rounded-2xl border border-[var(--mk-border-strong)] bg-[var(--mk-panel)] p-6">
            {gym.claimed ? (
              <>
                <Building2 className="size-5 text-[var(--mk-fg-subtle)]" />
                <p className="mt-3 text-[15px] font-semibold">Already claimed</p>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--mk-fg-muted)]">
                  Somebody has taken over this listing. If that gym is yours and you think this is
                  wrong, email {BRAND.supportEmail}.
                </p>
                <Link
                  href={`/gyms/${gym.code}`}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-[var(--mk-border-strong)] px-4 py-2.5 text-[13.5px] font-medium hover:bg-[var(--mk-panel-strong)]"
                >
                  View the listing
                </Link>
              </>
            ) : session?.role === "PROSPECT" ? (
              <>
                <p className="text-[15px] font-semibold">Claim this gym</p>
                <p className="mt-1.5 mb-5 text-[13px] text-[var(--mk-fg-muted)]">
                  Two details and it&rsquo;s yours.
                </p>
                <ClaimForm code={gym.code} gymName={gym.name} />
              </>
            ) : session ? (
              <>
                <p className="text-[15px] font-semibold">You already run a gym</p>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--mk-fg-muted)]">
                  This account is already attached to a workspace. Claiming a second listing needs a
                  separate account — email {BRAND.supportEmail} and we&rsquo;ll sort it out.
                </p>
              </>
            ) : (
              <>
                <p className="text-[15px] font-semibold">
                  ${CLAIM_PRICE_USD}{" "}
                  <span className="text-[13px] font-normal text-[var(--mk-fg-subtle)]">
                    a month
                  </span>
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--mk-fg-muted)]">
                  Create an account to claim {gym.name}. It takes a minute, and your gym store
                  opens as soon as it clears.
                </p>
                <Link
                  href={`/signup?claim=${gym.code}`}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-[var(--brand)] px-4 py-2.5 text-[13.5px] font-medium text-[var(--brand-foreground)] hover:bg-[var(--brand-hover)]"
                >
                  Continue
                </Link>
                <Link
                  href={`/login?next=/gyms/${gym.code}/claim`}
                  className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-[var(--mk-border-strong)] px-4 py-2.5 text-[13.5px] font-medium hover:bg-[var(--mk-panel-strong)]"
                >
                  I already have an account
                </Link>
              </>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
