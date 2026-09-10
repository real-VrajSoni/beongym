import { PartyPopper } from "lucide-react";
import { requireStaff } from "@/lib/auth";

import { BRAND } from "@/lib/brand";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { PasswordForm, TrainerProfileForm } from "@/components/settings/settings-forms";
import { GymProfileForm } from "@/components/settings/gym-profile-form";
import { GymLinksForm } from "@/components/settings/links-form";
import { StoreSetup } from "@/components/settings/store-setup";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ claimed?: string }>;
}) {
  const [session, { claimed }] = await Promise.all([requireStaff(), searchParams]);

  const [gym, user, counts] = await Promise.all([
    db.gym.findUniqueOrThrow({
      where: { id: session.gymId },
      select: {
        name: true,
        code: true,
        tagline: true,
        city: true,
        address: true,
        phone: true,
        email: true,
        logoText: true,
        imageUrl: true,
        accentColor: true,
        currency: true,
        latitude: true,
        longitude: true,
        description: true,
        openingHours: true,
        viewCount: true,
        tier: true,
        links: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, kind: true, label: true, url: true, clickCount: true },
        },
      },
    }),
    db.user.findUniqueOrThrow({
      where: { id: session.userId },
      select: {
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        trainerProfile: { select: { bio: true, specialization: true, experienceYears: true } },
      },
    }),
    Promise.all([
      db.plan.count({ where: { gymId: session.gymId } }),
      db.plan.count({ where: { gymId: session.gymId, showPrice: true } }),
      db.subscription.count({ where: { plan: { gymId: session.gymId } } }),
      db.gymClass.count({ where: { gymId: session.gymId } }),
    ]),
  ]);

  const [planCount, pricedCount, subscriptionCount, classCount] = counts;

  const isOwner = session.role === "GYM_OWNER";
  // Everyone who reaches settings has paid, so the store checklist always shows.
  const hasStore = true;
  const totalClicks = gym.links.reduce((sum: number, l: { clickCount: number }) => sum + l.clickCount, 0);

  // What "set up" means, in the order an owner would do it.
  const setupSteps = [
    { label: "Add your logo", done: Boolean(gym.imageUrl) },
    { label: "Write a line about the gym", done: Boolean(gym.tagline && gym.description) },
    { label: "Add opening hours and address", done: Boolean(gym.openingHours && gym.address) },
    { label: "Publish a programme", done: planCount > 0, href: "/gym/plans" },
    // Programmes arrive with a placeholder price that nobody can see. Setting
    // your own is the step that turns the store into a shop.
    { label: "Set your own prices", done: pricedCount > 0, href: "/gym/plans" },
  ];

  return (
    <>
      <PageHeader
        title="Gym settings"
        description="Your gym's identity and your own account."
      />

      {hasStore ? <StoreSetup steps={setupSteps} gymCode={gym.code} /> : null}

      {claimed ? (
        <div className="mb-5 flex items-start gap-3 rounded-[var(--radius-card)] border border-[var(--success)]/25 bg-[var(--success-soft)] px-5 py-4">
          <PartyPopper className="mt-0.5 size-4 shrink-0 text-[var(--success)]" />
          <div>
            <p className="text-[13.5px] font-medium text-[var(--success)]">
              {gym.name} is yours.
            </p>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              Check every detail below — the name, address, timings and contact number are what
              members see on your listing. We&rsquo;ll call to confirm the claim shortly.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <GymProfileForm
            gymCode={gym.code}
            canEdit={session.role === "GYM_OWNER"}
            values={{
              imageUrl: gym.imageUrl ?? "",
              latitude: gym.latitude,
              longitude: gym.longitude,
              name: gym.name,
              tagline: gym.tagline ?? "",
              city: gym.city ?? "",
              address: gym.address ?? "",
              phone: gym.phone ?? "",
              email: gym.email ?? "",
              logoText: gym.logoText ?? "",
              currency: gym.currency,
              accentColor: gym.accentColor,
            }}
          />
          <GymLinksForm
            links={gym.links}
            canEdit={isOwner}
            totalClicks={totalClicks}
            pinViews={gym.viewCount}
          />
          <TrainerProfileForm
            values={{
              name: user.name,
              email: user.email ?? "",
              phone: user.phone ?? "",
              bio: user.trainerProfile?.bio ?? "",
              specialization: user.trainerProfile?.specialization ?? "",
              experienceYears:
                user.trainerProfile?.experienceYears !== null &&
                user.trainerProfile?.experienceYears !== undefined
                  ? String(user.trainerProfile.experienceYears)
                  : "",
            }}
          />
          <PasswordForm />
        </div>

        <div className="space-y-5">
          <Section title="Workspace">
            <dl className="divide-y divide-[var(--border)]">
              {(
                [
                  ["Gym code", gym.code],
                  ["Plan", gym.tier[0] + gym.tier.slice(1).toLowerCase()],
                  ["With BeOnGym since", formatDate(user.createdAt)],
                  ["Membership plans", String(planCount)],
                  ["Memberships sold", String(subscriptionCount)],
                  ["Classes on the timetable", String(classCount)],
                ] as const
              ).map(([term, value]) => (
                <div key={term} className="flex items-center justify-between px-5 py-3.5">
                  <dt className="text-[13px] text-muted-foreground">{term}</dt>
                  <dd className="tabular text-[13px] font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section title="Your gym code">
            <div className="px-5 py-4 text-[13px] leading-relaxed text-muted-foreground">
              <p>
                <span className="font-mono text-foreground">{gym.code}</span> identifies your gym
                across {BRAND.name} — on your listing, in support, and on every member code you
                issue.
              </p>
              <p className="mt-3">
                Members don&rsquo;t sign in anywhere: their records live here, and you and your
                team are the only people who can see them. Staff notes stay inside your team.
              </p>
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}
