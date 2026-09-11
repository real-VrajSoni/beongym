import { CreditCard, Timer, Users } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import {
	ENTRY_PRICE,
	accessState,
	daysLeft,
	planByKey,
	planForTier,
} from "@/lib/platform-plans";
import { formatDate, formatUsd } from "@/lib/format";
import { BRAND } from "@/lib/brand";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Section } from "@/components/ui/section";
import { TierPicker } from "@/components/settings/tier-picker";
import { BillingPortal } from "@/components/settings/billing-portal";
import { GymStatusBadge } from "@/components/admin/gym-badges";
import { cn } from "@/lib/utils";

export const metadata = { title: "Plan & billing" };

export default async function BillingPage() {
	const session = await requireOwner();

	const gym = await db.gym.findUniqueOrThrow({
		where: { id: session.gymId },
		select: {
			name: true,
			code: true,
			tier: true,
			status: true,
			trialEndsAt: true,
			accessExpiresAt: true,
			createdAt: true,
			dodoSubscriptionId: true,
			_count: { select: { members: true, staff: true } },
			orders: {
				orderBy: { createdAt: "desc" },
				take: 1,
				select: { billingCycle: true, amount: true, paidAt: true },
			},
		},
	});

	const plan = planForTier(gym.tier);
	const state = accessState(gym.tier, gym.accessExpiresAt);
	const lifetime = state === "lifetime";
	const remaining = daysLeft(gym.accessExpiresAt);

	return (
		<>
			<PageHeader
				title="Plan & billing"
				description={`What your gym pays ${BRAND.name}, and what that unlocks.`}
				actions={<GymStatusBadge status={gym.status} />}
			/>

			{/* Where they stand, said plainly — this is the only number on the page
          that decides whether the gym works tomorrow morning. */}
			{lifetime ? null : (
				<div
					className={cn(
						"mb-5 flex flex-col gap-3 rounded-[var(--radius-card)] border px-5 py-4 sm:flex-row sm:items-center sm:justify-between",
						state === "active" && remaining > 7
							? "border-[var(--brand)]/25 bg-[var(--brand-soft)]"
							: "border-[var(--warning)]/30 bg-[var(--warning-soft)]",
					)}
				>
					<div className="flex items-start gap-3">
						<Timer
							className={cn(
								"mt-0.5 size-4 shrink-0",
								state === "active" && remaining > 7
									? "text-[var(--brand-soft-foreground)]"
									: "text-[var(--warning)]",
							)}
						/>
						<div>
							<p className="text-[13.5px] font-medium">
								{state === "active"
									? `${remaining} day${remaining === 1 ? "" : "s"} left`
									: "Your access has run out"}
							</p>
							<p className="mt-0.5 text-[12.5px] text-muted-foreground">
								{state === "active" ? (
									<>
										Paid up to{" "}
										{formatDate(gym.accessExpiresAt!)}.
										Your subscription and payment confirmations determine the next paid period.
									</>
								) : (
									<>
										Your gym is off the map and the
										workspace is locked until you renew.
										Nothing has been deleted — members,
										payments and history are all waiting.
									</>
								)}
							</p>
						</div>
					</div>
				</div>
			)}

			<div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
				<StatCard
					label="Current plan"
					value={plan.name}
					icon={CreditCard}
					accent
					hint={
						lifetime
							? "paid once, yours for good"
							: `from ${formatUsd(ENTRY_PRICE)} per 30 days`
					}
				/>
				<StatCard
					label={lifetime ? "Expires" : "Access until"}
					value={
						lifetime
							? "Never"
							: formatDate(gym.accessExpiresAt ?? new Date())
					}
					icon={Timer}
					hint={
						lifetime
							? "lifetime member"
							: `${remaining} days remaining`
					}
				/>
				<StatCard
					label="Members"
					value={gym._count.members}
					icon={Users}
					hint="unlimited on your plan"
				/>
				<StatCard
					label="With BeOnGym since"
					value={formatDate(gym.createdAt)}
				/>
			</div>

			<div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
				<h2 className="text-[15px] font-semibold">
					{lifetime ? "Your plan" : "Renew or upgrade"}
				</h2>
				<p className="text-[12.5px] text-muted-foreground">
					Launch pricing — the struck-through figure is what these
					return to.
				</p>
			</div>
			{gym.dodoSubscriptionId ? <BillingPortal /> : <TierPicker canEdit daysRemaining={remaining} lifetime={lifetime} />}

			<div className="mt-5">
				<Section title="Billing" bodyClassName="px-5 py-4">
					<p className="text-[13px] leading-relaxed text-muted-foreground">
						One price worldwide, quoted in US dollars — $
						{planByKey("MONTHLY").price} for 30 days or $
						{planByKey("ANNUAL").price} for a year. Local tax (GST,
						VAT, sales tax) is calculated from your billing country
						at the secure Dodo Payments checkout and added there.
						Subscriptions renew according to the billing schedule shown at checkout.
						Manage an existing subscription above. Access changes after verified provider confirmation.
					</p>
				</Section>
			</div>
		</>
	);
}
