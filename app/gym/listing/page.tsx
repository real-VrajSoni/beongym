import Link from "next/link";
import { ArrowRight, ExternalLink, Eye, Globe2, MousePointerClick, Store } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { accessState, daysLeft } from "@/lib/platform-plans";
import { formatDate } from "@/lib/format";
import { BRAND } from "@/lib/brand";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Your listing" };

/**
 * The public-facing half of the gym, from the owner's side.
 *
 * Their pin, their store, and the two numbers that say whether the map is
 * earning its keep: how many people opened the pin, and how many clicked
 * through. It is also the fastest route to seeing what a stranger sees.
 */
export default async function ListingPage() {
  const session = await requireStaff();
  const gym = await db.gym.findUniqueOrThrow({
    where: { id: session.gymId },
    select: {
      name: true,
      code: true,
      city: true,
      country: true,
      listed: true,
      latitude: true,
      longitude: true,
      viewCount: true,
      storeSetupAt: true,
      tier: true,
      accessExpiresAt: true,
      links: { select: { id: true, clickCount: true } },
    },
  });

  const clicks = gym.links.reduce((sum, l) => sum + l.clickCount, 0);
  const onMap = gym.latitude !== null && gym.longitude !== null;
  const state = accessState(gym.tier, gym.accessExpiresAt);

  return (
    <>
      <PageHeader
        title="Your listing"
        description={`What people find when they come across ${gym.name} on ${BRAND.name}.`}
        actions={
          <div className="flex flex-wrap gap-2">
            {onMap ? (
              <Button asChild size="sm">
                <Link href={`/gyms?focus=${gym.code}`}>
                  <Globe2 /> View on globe
                </Link>
              </Button>
            ) : null}
            <Button asChild size="sm" variant="secondary">
              <Link href={`/gyms/${gym.code}`} target="_blank">
                View store <ExternalLink />
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Pin views" value={gym.viewCount.toLocaleString()} icon={Eye} accent />
        <StatCard
          label="Clicks to your links"
          value={clicks.toLocaleString()}
          icon={MousePointerClick}
          hint={gym.links.length === 0 ? "no links added yet" : `${gym.links.length} links`}
        />
        <StatCard
          label="Store"
          value={gym.storeSetupAt ? "Set up" : "Unfinished"}
          icon={Store}
          hint={gym.storeSetupAt ? formatDate(gym.storeSetupAt) : "finish it in settings"}
        />
        <StatCard
          label="On the map"
          value={gym.listed && state !== "expired" ? "Live" : "Hidden"}
          icon={Globe2}
          hint={[gym.city, gym.country].filter(Boolean).join(", ") || "no location set"}
        />
      </div>

      <Section title="Getting more out of it" bodyClassName="px-5 py-4">
        <ul className="space-y-2.5 text-[13px] leading-relaxed text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Add your links.</span> Website, Instagram,
            WhatsApp and phone all sit on your pin, and every click is counted — that is how you
            tell whether the map is bringing people in.{" "}
            <Link href="/gym/settings" className="font-medium text-[var(--brand)]">
              Edit links
            </Link>
          </li>
          <li>
            <span className="font-medium text-foreground">Finish the store.</span> A logo, a line
            about the gym, your hours and a couple of programmes. Roughly three minutes, and it is
            the difference between a pin and a shopfront.
          </li>
          <li>
            <span className="font-medium text-foreground">Publish your prices.</span> Programmes
            show without a price until you set one. Some gyms prefer it that way; if you would
            rather quote openly, tick the box on the programme.{" "}
            <Link href="/gym/plans" className="font-medium text-[var(--brand)]">
              Programmes
            </Link>
          </li>
        </ul>
      </Section>

      {state === "active" && daysLeft(gym.accessExpiresAt) <= 7 ? (
        <div className="mt-5 flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-[var(--warning)]">
            Your listing comes off the map in {daysLeft(gym.accessExpiresAt)} days unless you renew.
          </p>
          <Button asChild size="sm" className="shrink-0">
            <Link href="/gym/billing">
              Renew now <ArrowRight />
            </Link>
          </Button>
        </div>
      ) : null}
    </>
  );
}
