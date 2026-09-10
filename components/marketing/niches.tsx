import {
  Activity,
  Building2,
  Dumbbell,
  Flower2,
  HeartPulse,
  Music4,
  Salad,
  Swords,
  Trophy,
  UserRound,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MarketingPhoto } from "./photo";

/**
 * Who this is for.
 *
 * Three headline cards, then the long tail underneath — because the first
 * question a pilates studio or a dietician asks is "is this for gyms only?",
 * and the honest answer is a list they can find themselves in.
 *
 * Each card carries a photograph over painted artwork. The gradient underneath
 * is not decoration for its own sake: it is what shows if the image is missing,
 * so the section never degrades into three broken-image icons.
 */

type Niche = {
  icon: LucideIcon;
  title: string;
  body: string;
  /** Photograph, dropped into `public/marketing/`. */
  image: string;
  /** Painted underneath, so a missing photograph still reads as artwork. */
  art: string;
  tint: string;
};

const HEADLINE: Niche[] = [
  {
    icon: Dumbbell,
    title: "Independent gyms",
    body: "One floor, one owner, and a register that never balances. Memberships, dues and daily attendance handled without a back office.",
    tint: "#7c6cff",
    image: "/marketing/gym-floor.jpg",
    art: "radial-gradient(120% 90% at 15% 15%, rgba(124,108,255,0.55), transparent 60%), radial-gradient(100% 80% at 85% 10%, rgba(45,212,191,0.35), transparent 55%), linear-gradient(160deg, #171726, #0d0d15)",
  },
  {
    icon: Flower2,
    title: "Studios of every kind",
    body: "Yoga, pilates, dance, MMA, CrossFit boxes. Batch sizes, class-length memberships and coaches who teach rather than administrate.",
    tint: "#2dd4bf",
    image: "/marketing/studios.jpg",
    art: "radial-gradient(120% 90% at 80% 20%, rgba(45,212,191,0.5), transparent 60%), radial-gradient(90% 70% at 10% 80%, rgba(240,112,159,0.35), transparent 55%), linear-gradient(200deg, #10202a, #0d0d15)",
  },
  {
    icon: Building2,
    title: "Multi-branch chains",
    body: "Every branch its own workspace, every owner one login. Revenue, retention and staff rolled up without a spreadsheet in sight.",
    tint: "#e8a33d",
    image: "/marketing/chain.jpg",
    art: "radial-gradient(110% 85% at 50% 0%, rgba(232,163,61,0.45), transparent 60%), radial-gradient(80% 80% at 90% 90%, rgba(124,108,255,0.4), transparent 55%), linear-gradient(180deg, #1d1a18, #0d0d15)",
  },
];

/** The whole list, in the words a buyer would use for themselves. */
const EVERYONE: { icon: LucideIcon; label: string }[] = [
  { icon: Dumbbell, label: "Gyms" },
  { icon: Building2, label: "Multi-branch gym chains" },
  { icon: Flower2, label: "Pilates studios" },
  { icon: Sparkles, label: "Yoga studios" },
  { icon: Music4, label: "Dance studios" },
  { icon: Swords, label: "MMA & boxing gyms" },
  { icon: Trophy, label: "Clubs & gymkhanas" },
  { icon: Activity, label: "CrossFit boxes" },
  { icon: UserRound, label: "Personal trainers" },
  { icon: Salad, label: "Dieticians" },
  { icon: HeartPulse, label: "Wellness coaches" },
];

export function Niches() {
  return (
    <section id="who" className="scroll-mt-20 border-t border-[var(--mk-border)]">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-2xl">
          <p className="text-[11.5px] font-semibold tracking-[0.18em] text-[var(--mk-fg-subtle)] uppercase">
            Who it is built for
          </p>
          <h2 className="mt-3 text-[32px] leading-tight font-semibold tracking-[-0.02em]">
            Built for the floor you actually run.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--mk-fg-muted)]">
            A 400-member strength gym and a 12-mat pilates studio do not run the same way. The
            workspace bends to yours — your own programmes, your own membership lengths, your own
            names for everything.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {HEADLINE.map(({ icon: Icon, title, body, image, art, tint }) => (
            <article
              key={title}
              className="group overflow-hidden rounded-3xl border border-[var(--mk-border-strong)] bg-[var(--mk-panel)] transition-transform duration-300 hover:-translate-y-1"
            >
              {/* The photograph sits over painted artwork: a file that has not
                  been dropped in yet leaves the gradient behind it rather than
                  a broken-image icon. */}
              <div className="relative h-48 overflow-hidden" style={{ background: art }}>
                <MarketingPhoto
                  src={image}
                  alt={title}
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent"
                />
                <div
                  aria-hidden
                  className="absolute -right-10 -bottom-14 size-52 rounded-full blur-2xl"
                  style={{ background: tint, opacity: 0.28 }}
                />
                <span
                  className="absolute bottom-4 left-5 flex size-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white backdrop-blur-md"
                  style={{ boxShadow: `0 8px 30px -12px ${tint}` }}
                >
                  <Icon className="size-5" />
                </span>
              </div>

              <div className="p-6">
                <h3 className="text-[17px] font-semibold tracking-[-0.01em]">{title}</h3>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-[var(--mk-fg-muted)]">
                  {body}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-3xl border border-[var(--mk-border-strong)] bg-[var(--mk-panel)] p-6 sm:p-8">
          <p className="text-[14px] font-semibold">
            And everyone else who charges people to train.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {EVERYONE.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--mk-border-strong)] bg-[var(--mk-bg)] px-3.5 py-2 text-[12.5px] text-[var(--mk-fg-muted)]"
              >
                <Icon className="size-3.5 text-[var(--brand)]" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
