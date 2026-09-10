import { Quote } from "lucide-react";

type Testimonial = {
  quote: string;
  name: string;
  gym: string;
  city: string;
  initials: string;
};

/**
 * Illustrative quotes drawn from the demo workspace — the disclaimer below the
 * row says so. Swap these for real ones as they come in; nothing else changes.
 */
const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Renewals went from a Sunday-night spreadsheet to a reminder that writes itself. Collections are up about 18% and I haven't raised a single price.",
    name: "Rohit Malhotra",
    gym: "Iron Temple Fitness",
    city: "Mumbai",
    initials: "RM",
  },
  {
    quote:
      "Forty enquiries a month used to live on a notepad by the desk. Now every one gets a call-back date — we converted 11 last month instead of the usual four.",
    name: "Sneha Kulkarni",
    gym: "Titan Strength Club",
    city: "Bengaluru",
    initials: "SK",
  },
  {
    quote:
      "The green squares tell me who's drifting before they cancel. I ring them in week two instead of finding out in month three. Churn is down by half.",
    name: "Imran Qureshi",
    gym: "Pulse Fitness Studio",
    city: "Pune",
    initials: "IQ",
  },
  {
    quote:
      "Two registers, a payment notebook and a WhatsApp group — all of it gone. I got about six hours of my week back, and nobody at the desk misses the paperwork.",
    name: "Harpreet Singh",
    gym: "FitForge",
    city: "Ludhiana",
    initials: "HS",
  },
  {
    quote:
      "People find us on the map now. Nineteen walk-ins last month said they came from the pin, which is nineteen more than the old website ever brought.",
    name: "Ayesha Khan",
    gym: "Core Factory",
    city: "Hyderabad",
    initials: "AK",
  },
  {
    quote:
      "Classes fill themselves. Members book their own spot, the waitlist moves on its own, and the 7pm batch stopped being a scrum.",
    name: "Deepa Nair",
    gym: "Studio 9 Pilates",
    city: "Kochi",
    initials: "DN",
  },
  {
    quote:
      "I run three branches. One login, three sets of numbers, and I finally know which one is actually making money.",
    name: "Marta Nowak",
    gym: "Northside Barbell",
    city: "Toronto",
    initials: "MN",
  },
];

/**
 * A colour per quote, chosen from the initials.
 *
 * Deterministic on purpose: a random tint would differ between the server and
 * the client render and flicker on hydration, and would reshuffle every time
 * the marquee looped.
 */
const TINTS = ["#7c6cff", "#3ecf7e", "#2dd4bf", "#e8a33d", "#f0709f", "#5aa2f5"];

function tintFor(seed: string): string {
  let n = 0;
  for (const ch of seed) n = (n + ch.charCodeAt(0)) % 997;
  return TINTS[n % TINTS.length]!;
}

function Card({ t }: { t: Testimonial }) {
  return (
    <figure
      style={{ ["--tint" as string]: tintFor(t.initials + t.gym) }}
      className="mk-card flex w-[21rem] shrink-0 flex-col rounded-2xl p-6 sm:w-[24rem]"
    >
      <Quote className="size-5 text-[var(--brand)]" />
      <blockquote className="mt-4 flex-1 text-[14.5px] leading-relaxed text-[var(--mk-fg-muted)]">
        {t.quote}
      </blockquote>
      <figcaption className="mt-5 flex items-center gap-3 border-t border-[var(--mk-border)] pt-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[12px] font-semibold text-[var(--brand-soft-foreground)]">
          {t.initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13.5px] font-medium">{t.name}</span>
          <span className="block truncate text-[12.5px] text-[var(--mk-fg-subtle)]">
            {t.gym} · {t.city}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}

export function Testimonials() {
  return (
    <section className="border-t border-[var(--mk-border)] bg-[var(--mk-panel)] py-20">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-[11.5px] font-semibold tracking-[0.18em] text-[var(--mk-fg-subtle)] uppercase">
          What owners say
        </p>
        <h2 className="mt-3 max-w-lg text-[32px] leading-tight font-semibold tracking-[-0.02em]">
          Gyms that stopped running on paper.
        </h2>
      </div>

      {/* Full-bleed so cards run off both edges rather than stopping in a box */}
      <div
        className="marquee-viewport relative mt-10 overflow-hidden"
        role="region"
        aria-label="Customer testimonials"
      >
        {/* Fade the edges into the section background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[var(--mk-bg)] to-transparent sm:w-28"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[var(--mk-bg)] to-transparent sm:w-28"
        />

        <div className="marquee-track flex w-max gap-4 px-6">
          {/* Two passes: the animation shifts by 50%, so the seam is invisible */}
          {[0, 1].map((pass) => (
            <div key={pass} className="flex gap-4" aria-hidden={pass === 1}>
              {TESTIMONIALS.map((t) => (
                <Card key={`${pass}-${t.name}`} t={t} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
